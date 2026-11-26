// src/lib/friendTelemetry.ts
// Pure helper functions shared across server routes, React components, and unit tests.
// Handles ADC-to-bar pressure conversion, Manila PHT formatting, localization parsing,
// confidence normalization, and pump state transition derivation.

import type { FriendSensorRow, PumpTransitionRow } from "@/db/friendClient";
import type { PumpStatus, Severity, StationId, ZoneId } from "@/types";
import { STATION_IDS, ZONES } from "@/config/rig";
import {
  classifySeverity,
  localizeZone,
  recommendedAction,
} from "@/lib/leakLogic";

// Direct-wired 5V/3.3V pressure transducer calibration (no voltage divider)
// Rest ADC ~200–250 at 0 bar; full scale 4095 -> 12.0 bar (0–1.2 MPa sensor)
export const ADC_ZERO = 225;
export const ADC_MAX = 4095;
export const BAR_MAX = 12.0;

// Calibrated physical rig flow profile (L/min): S1–S3 steady ~3.18–3.25 L/min; downstream breach drops to ~0.50 L/min
export const FLOW_NOMINAL_LPM = 3.2;
export const FLOW_CALIBRATION_SNAPSHOT: Record<StationId, number> = {
  S1: 3.25,
  S2: 3.18,
  S3: 3.2,
  S4: 0.5,
};

export const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes without new DB rows
export const PUMP_STARTING_WINDOW_MS = 12 * 1000; // 12s OFF->ON priming window
export const MANILA_TZ = "Asia/Manila";

/** Convert raw 12-bit ESP32 ADC value (0–4095) into bar (clamped >= 0). */
export function adcToBar(adc: number | null | undefined): number {
  const n = Number(adc ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, ((n - ADC_ZERO) / (ADC_MAX - ADC_ZERO)) * BAR_MAX);
}

/** Normalize raw confidence (either 0–1 or 0–100 scale) to 0..1. */
export function normalizeConfidence01(raw: number | null | undefined): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1 ? Math.min(1, n / 100) : Math.min(1, n);
}

/** Extract ZoneId (1..4) from firmware localization strings like "Zone1", "Zone 2", "Sensor 3", "S3". */
export function parseLocalizationZone(loc: string | null | undefined): ZoneId | null {
  if (!loc) return null;
  const match = loc.match(/(?:zone|z|sensor|pipe|s)\s*([1-4])/i);
  if (!match) return null;
  const num = Number(match[1]);
  return num >= 1 && num <= 4 ? (num as ZoneId) : null;
}

/** Normalize pump_status varchar ("ON" | "OFF") safely. */
export function normalizePumpRaw(val: string | null | undefined): "ON" | "OFF" {
  return String(val ?? "").trim().toUpperCase() === "ON" ? "ON" : "OFF";
}

/**
 * Returns true when there is effectively zero water flowing across the entire loop
 * (pump OFF with stagnant fluid, or all stations <= 0.15 L/min).
 * Prevents dry pipes, closed valves, or stopped pumps from ever being misclassified as leaks.
 */
export function isNoFlowCondition(
  flows: readonly number[],
  pumpRaw: "ON" | "OFF" = "ON"
): boolean {
  const maxFlow = flows.length > 0 ? Math.max(...flows.map((f) => Math.max(0, f))) : 0;
  if (maxFlow < 0.15) return true;
  if (pumpRaw === "OFF" && maxFlow < 0.25) return true;
  return false;
}

/** Classify firmware status string. */
export function classifyStatusKind(
  status: string | null | undefined
): "normal" | "leak" | "sensor_failure" | "other" {
  const s = String(status ?? "").trim().toLowerCase();
  if (
    !s ||
    s === "normal" ||
    s === "monitoring" ||
    s === "ok" ||
    s === "healthy" ||
    s.includes("no leak") ||
    s.includes("no_leak")
  ) {
    return "normal";
  }
  if (s.includes("leak")) return "leak";
  if (s.includes("failure") || s.includes("error")) return "sensor_failure";
  return "other";
}

export function rowFlows(row: FriendSensorRow): [number, number, number, number] {
  return [
    Number(row.flow1 ?? 0),
    Number(row.flow2 ?? 0),
    Number(row.flow3 ?? 0),
    Number(row.flow4 ?? 0),
  ];
}

export function rowPressuresRaw(row: FriendSensorRow): [number, number, number, number] {
  return [
    Number(row.pressure1 ?? 0),
    Number(row.pressure2 ?? 0),
    Number(row.pressure3 ?? 0),
    Number(row.pressure4 ?? 0),
  ];
}

export function rowPressuresBar(row: FriendSensorRow): [number, number, number, number] {
  const raw = rowPressuresRaw(row);
  return [adcToBar(raw[0]), adcToBar(raw[1]), adcToBar(raw[2]), adcToBar(raw[3])];
}

/** Map raw DB pump_status + latest OFF->ON transition into dashboard PumpStatus. */
export function derivePumpState(
  latestRow: FriendSensorRow | null,
  latestTransition: PumpTransitionRow | null,
  nowMs = Date.now()
): {
  pumpStatus: PumpStatus;
  pumpStatusRaw: "ON" | "OFF";
  pumpUpdatedAt: string | null;
  lastPumpChangedAt: string | null;
  isStale: boolean;
} {
  if (!latestRow) {
    return {
      pumpStatus: "off",
      pumpStatusRaw: "OFF",
      pumpUpdatedAt: null,
      lastPumpChangedAt: null,
      isStale: false,
    };
  }

  const raw = normalizePumpRaw(latestRow.pump_status);
  const latestMs = new Date(latestRow.created_at).getTime();
  const isStale = !Number.isFinite(latestMs) || nowMs - latestMs > STALE_THRESHOLD_MS;

  let pumpStatus: PumpStatus = "off";
  if (raw === "ON") {
    const justSwitchedOn =
      latestTransition?.pump_status === "ON" &&
      latestTransition.prev_pump_status === "OFF" &&
      Number.isFinite(latestMs) &&
      latestMs - new Date(latestTransition.created_at).getTime() <= PUMP_STARTING_WINDOW_MS &&
      !isStale;

    pumpStatus = justSwitchedOn ? "starting" : "running";
  }

  return {
    pumpStatus,
    pumpStatusRaw: raw,
    pumpUpdatedAt: latestRow.created_at,
    lastPumpChangedAt: latestTransition?.created_at ?? null,
    isStale,
  };
}

/** Derive zone, station, flow loss, and severity for one sensor_data row. */
export function evaluateFriendRowAnomaly(row: FriendSensorRow): {
  kind: "normal" | "leak" | "sensor_failure" | "other";
  isNoFlow: boolean;
  zoneId: ZoneId | null;
  stationId: StationId;
  flowDiff: number;
  pressureDropBar: number;
  severity: Severity;
  si: number;
  recommendedActionText: string;
} {
  const rawKind = classifyStatusKind(row.status);
  const flows = rowFlows(row);
  const pressures = rowPressuresBar(row);
  const pumpRaw = normalizePumpRaw(row.pump_status);
  const noFlow = isNoFlowCondition(flows, pumpRaw);

  // Never mistake no-flow (all sensors 0 / pump OFF with stagnant water) for an active leak
  const kind: "normal" | "leak" | "sensor_failure" | "other" =
    rawKind === "leak" && noFlow ? "sensor_failure" : rawKind;

  // Sensor failures and no-flow states should not report leak flow delta, SI%, or leak zone
  if (kind !== "leak") {
    const statusLabel = row.status ?? "Anomaly";
    const recommendedActionText = noFlow
      ? `No water flow detected (pump ${pumpRaw}, 0 L/min) — verify pump/valve operation (not a leak).`
      : kind === "sensor_failure"
        ? `Check wiring / turbine sensor health (firmware reported: ${statusLabel}).`
        : `Review telemetry event (${statusLabel}).`;

    return {
      kind,
      isNoFlow: noFlow,
      zoneId: null,
      stationId: "S1",
      flowDiff: 0,
      pressureDropBar: 0,
      severity: kind === "sensor_failure" ? "medium" : "low",
      si: 0,
      recommendedActionText,
    };
  }

  let zoneId = parseLocalizationZone(row.localization);
  if (zoneId === null) {
    const inferred = localizeZone(flows);
    zoneId = (inferred >= 1 && inferred <= 4 ? inferred : 1) as ZoneId;
  }

  const zoneMeta = zoneId != null ? ZONES.find((z) => z.id === zoneId) : undefined;
  const stationIdx = zoneMeta ? STATION_IDS.indexOf(zoneMeta.stationA) : 0;
  const nextIdx = zoneMeta ? STATION_IDS.indexOf(zoneMeta.stationB) : 1;

  const flowDiff =
    stationIdx !== nextIdx
      ? Math.max(0, flows[stationIdx] - flows[nextIdx])
      : Math.max(0, Math.max(...flows) - Math.min(...flows));

  const flowUp = flows[stationIdx] ?? 0;
  const flowLossPct = flowUp > 0 ? (flowDiff / flowUp) * 100 : 0;
  // Scale flow severity proportionally so leaks on a ~3.2 L/min rig (e.g. 3.20 -> 0.50 L/min) escalate properly
  const flowSeverityScore =
    flowDiff >= 1.5 || flowLossPct >= 25
      ? 12
      : flowDiff >= 0.5 || flowLossPct >= 10
      ? 7
      : 4;

  const pUp = pressures[stationIdx] ?? 0;
  const pDown = pressures[nextIdx] ?? pUp;
  const pressureDropBar = Math.max(0, pUp - pDown);

  const si = pUp > 0 ? Math.min(100, (pressureDropBar / pUp) * 100) : 15;
  const severity: Severity = classifySeverity(Math.max(si, flowSeverityScore), {
    low: 5,
    medium: 10,
  });

  const statusLabel = row.status ?? "Leak";
  const recommendedActionText = `${recommendedAction(severity)} (${statusLabel}${zoneId ? ` in Zone ${zoneId}` : ""})`;

  return {
    kind,
    isNoFlow: noFlow,
    zoneId,
    stationId: (zoneMeta?.stationA ?? "S1") as StationId,
    flowDiff: Number(flowDiff.toFixed(2)),
    pressureDropBar: Number(pressureDropBar.toFixed(3)),
    severity,
    si: Number(si.toFixed(1)),
    recommendedActionText,
  };
}

/** Format UTC ISO string strictly in Manila PHT (UTC+8). */
export function formatPhtTime(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: MANILA_TZ,
  });
}

/** Format UTC ISO string with date + time in Manila PHT (UTC+8). */
export function formatPhtDateTime(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: MANILA_TZ,
  });
}

/** Compute human-readable relative age and staleness flag (> 3 min). */
export function formatRelativeAge(
  isoUtc: string,
  nowMs = Date.now(),
  staleThresholdMs = STALE_THRESHOLD_MS
): { label: string; stale: boolean } {
  const tsMs = new Date(isoUtc).getTime();
  if (!Number.isFinite(tsMs)) return { label: "unknown", stale: true };
  const ms = Math.max(0, nowMs - tsMs);
  const stale = ms > staleThresholdMs;
  if (ms < 60_000) return { label: `${Math.round(ms / 1000)}s ago`, stale };
  if (ms < 3_600_000) return { label: `${Math.round(ms / 60_000)}m ago`, stale };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return { label: `${h}h ${m}m ago`, stale };
}
