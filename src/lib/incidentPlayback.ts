// src/lib/incidentPlayback.ts
// Live DB Time Machine playback engine for HydroNode SCADA.
// Strictly replays real recorded rows from Neon `sensor_data` (no synthetic preset scenarios).

import type { FriendSensorRow } from "@/db/friendClient";
import { ZONES, type StationId, type ZoneId } from "@/config/rig";
import {
  classifyStatusKind,
  evaluateFriendRowAnomaly,
  formatPhtTime,
  isNoFlowCondition,
  normalizeConfidence01,
  normalizePumpRaw,
  rowFlows,
  rowPressuresBar,
} from "@/lib/friendTelemetry";
import type { LiveAlert } from "@/types";

export type ReplayIssueKind = "none" | "leak" | "no_flow" | "sensor_fault";

export interface TimelineEvent {
  tSeconds: number;
  label: string;
  phase: string;
  description: string;
}

export interface PlaybackFrame {
  /** Recorded DB row ID (or interpolated target row ID) */
  rowId: number;
  /** Manila PHT clock label */
  label: string;
  /** L/min for [S1, S2, S3, S4] */
  flow: [number, number, number, number];
  /** bar for [S1, S2, S3, S4] */
  pressure: [number, number, number, number];
  /** Whether the pump is active in DB row */
  pumpOn: boolean;
  /** DB row status string */
  status: string;
  /** Separates genuine leaks from no-flow / sensor-fault states */
  issueKind: ReplayIssueKind;
  /** Real active leak alerts (empty on No Flow or SensorFailure) */
  alerts: LiveAlert[];
  /** Flow difference (L/min) across stations */
  flowDelta: number;
  /** Pressure head difference (bar) across stations */
  pressureDrop: number;
  /** Nearest preceding timeline milestone */
  currentEvent: TimelineEvent;
  /** Detailed DB row readout string */
  note: string;
}

export interface PlaybackKeyframe {
  t: number;
  rowId: number;
  label: string;
  flow: [number, number, number, number];
  pressure: [number, number, number, number];
  pumpOn: boolean;
  status: string;
  localization: string | null;
  confidence: number;
  note: string;
}

export interface IncidentScenario {
  id: string;
  label: string;
  description: string;
  rowCount: number;
  durationSec: number;
  keyframes: PlaybackKeyframe[];
  events: TimelineEvent[];
}

const EMPTY_EVENT: TimelineEvent = {
  tSeconds: 0,
  label: "No Rows",
  phase: "Awaiting Data",
  description: "No recorded telemetry rows in sensor_data yet.",
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpTuple4(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

function buildFrameFromState(
  state: {
    rowId: number;
    label: string;
    flow: [number, number, number, number];
    pressure: [number, number, number, number];
    pumpOn: boolean;
    status: string;
    localization: string | null;
    confidence: number;
    note: string;
  },
  events: TimelineEvent[],
  elapsedSec: number
): PlaybackFrame {
  const flowDelta = state.pumpOn
    ? Math.max(0, Math.max(...state.flow) - Math.min(...state.flow))
    : 0;
  const pressureDrop = state.pumpOn
    ? Math.max(0, Math.max(...state.pressure) - Math.min(...state.pressure))
    : 0;

  const statusKind = classifyStatusKind(state.status);
  const noFlow = isNoFlowCondition(state.flow, state.pumpOn ? "ON" : "OFF");
  const alerts: LiveAlert[] = [];
  let issueKind: ReplayIssueKind = "none";

  // Only trigger a leak alert when status actually indicates a leak AND water is flowing
  if (statusKind === "leak" && !noFlow) {
    const toVirtualAdc = (bar: number) => 225 + (bar / 12.0) * (4095 - 225);
    const virtualRow: FriendSensorRow = {
      id: state.rowId,
      created_at: new Date().toISOString(),
      status: state.status,
      flow1: state.flow[0],
      flow2: state.flow[1],
      flow3: state.flow[2],
      flow4: state.flow[3],
      pressure1: toVirtualAdc(state.pressure[0]),
      pressure2: toVirtualAdc(state.pressure[1]),
      pressure3: toVirtualAdc(state.pressure[2]),
      pressure4: toVirtualAdc(state.pressure[3]),
      localization: state.localization,
      confidence: state.confidence,
      pump_status: state.pumpOn ? "ON" : "OFF",
    };

    const evalRes = evaluateFriendRowAnomaly(virtualRow);
    if (evalRes.kind === "leak") {
      issueKind = "leak";
      const zoneId: ZoneId = evalRes.zoneId ?? 1;
      const zoneMeta = ZONES.find((z) => z.id === zoneId);
      const targetStation: StationId =
        zoneMeta && zoneMeta.stationA !== zoneMeta.stationB
          ? zoneMeta.stationB
          : evalRes.stationId;

      alerts.push({
        id: state.rowId || 9000 + zoneId,
        stationId: targetStation,
        zoneId,
        ts: new Date().toISOString(),
        features: {
          pressureDropRate: evalRes.pressureDropBar,
          flowDifference: evalRes.flowDiff,
          vibrationRms: 0,
        },
        confidence: normalizeConfidence01(state.confidence),
        severity: evalRes.severity,
        si: evalRes.si,
        leakRate: evalRes.flowDiff,
        recommendedAction: evalRes.recommendedActionText,
        status: "active",
        repeatCount: 1,
      });
    } else {
      issueKind = noFlow ? "no_flow" : "sensor_fault";
    }
  } else if (noFlow) {
    issueKind = "no_flow";
  } else if (statusKind === "sensor_failure") {
    issueKind = "sensor_fault";
  }

  let currentEvent = events[0] ?? EMPTY_EVENT;
  for (const evt of events) {
    if (evt.tSeconds <= elapsedSec) currentEvent = evt;
  }

  return {
    rowId: state.rowId,
    label: state.label,
    flow: state.flow,
    pressure: state.pressure,
    pumpOn: state.pumpOn,
    status: state.status,
    issueKind,
    alerts,
    flowDelta: Number(flowDelta.toFixed(2)),
    pressureDrop: Number(pressureDrop.toFixed(2)),
    currentEvent,
    note: state.note,
  };
}

/**
 * Interpolate a PlaybackFrame at `elapsedSec` from real chronological DB keyframes.
 * Returns `null` when DB history is empty so UI never shows fabricated readings.
 */
export function calculatePlaybackFrame(
  scenario: IncidentScenario,
  elapsedSec: number
): PlaybackFrame | null {
  const { keyframes, events, durationSec } = scenario;
  if (keyframes.length === 0) return null;

  const clamped = Math.max(0, Math.min(elapsedSec, durationSec));
  let lo = keyframes[0];
  let hi = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].t <= clamped && keyframes[i + 1].t >= clamped) {
      lo = keyframes[i];
      hi = keyframes[i + 1];
      break;
    }
  }

  if (lo === hi || hi.t === lo.t) {
    return buildFrameFromState(lo, events, clamped);
  }

  const alpha = (clamped - lo.t) / (hi.t - lo.t);
  const ref = alpha >= 0.5 ? hi : lo;

  return buildFrameFromState(
    {
      rowId: ref.rowId,
      label: ref.label,
      flow: lerpTuple4(lo.flow, hi.flow, alpha),
      pressure: lerpTuple4(lo.pressure, hi.pressure, alpha),
      pumpOn: lo.pumpOn && hi.pumpOn ? true : ref.pumpOn,
      status: ref.status,
      localization: ref.localization,
      confidence: lerp(lo.confidence, hi.confidence, alpha),
      note: ref.note,
    },
    events,
    clamped
  );
}

/**
 * Maps real chronological `sensor_data` rows (oldest -> newest) into a replay timeline
 * with Manila PHT timestamps, pump state transitions, and anomaly evaluations.
 */
export function buildDbReplayScenario(rows: FriendSensorRow[]): IncidentScenario {
  if (rows.length === 0) {
    return {
      id: "db-replay-empty",
      label: "No Recorded DB Data",
      description: "sensor_data currently has 0 rows — stream live ESP32 data to enable Time Machine replay.",
      rowCount: 0,
      durationSec: 0,
      keyframes: [],
      events: [EMPTY_EVENT],
    };
  }

  const t0 = new Date(rows[0].created_at).getTime();
  const tLast = new Date(rows[rows.length - 1].created_at).getTime();
  const rawSpanSec = Number.isFinite(tLast - t0) ? (tLast - t0) / 1000 : 0;
  const durationSec = rows.length === 1 ? 0 : Math.max(1, Number(rawSpanSec.toFixed(1)));

  const events: TimelineEvent[] = [];
  const keyframes: PlaybackKeyframe[] = rows.map((row, idx) => {
    const tMs = new Date(row.created_at).getTime();
    const tSec =
      durationSec > 0 && Number.isFinite(tMs - t0)
        ? Number(((tMs - t0) / 1000).toFixed(2))
        : idx === 0
          ? 0
          : durationSec;

    const flows = rowFlows(row);
    const pressures = rowPressuresBar(row);
    const pumpOn = normalizePumpRaw(row.pump_status) === "ON";
    const status = row.status ?? "Normal";
    const pht = formatPhtTime(row.created_at);
    const kind = classifyStatusKind(status);

    const prevPump = idx > 0 ? normalizePumpRaw(rows[idx - 1].pump_status) === "ON" : pumpOn;
    const prevKind = idx > 0 ? classifyStatusKind(rows[idx - 1].status) : "normal";
    if (idx === 0 || kind !== prevKind || pumpOn !== prevPump) {
      events.push({
        tSeconds: tSec,
        label:
          kind === "leak"
            ? "Leak Detected"
            : kind === "sensor_failure"
              ? "Sensor Fault"
              : pumpOn
                ? "Pump ON"
                : "Pump OFF",
        phase: `${pht} PHT`,
        description: `Row #${row.id} (${pht} PHT): ${status} · Flows ${flows.map((v) => v.toFixed(2)).join(" / ")} L/min`,
      });
    }

    return {
      t: tSec,
      rowId: row.id,
      label: `${pht} PHT`,
      flow: flows,
      pressure: pressures,
      pumpOn,
      status,
      localization: row.localization,
      confidence: normalizeConfidence01(row.confidence),
      note: `DB Row #${row.id} · ${pht} PHT · ${status}${row.localization ? ` (${row.localization})` : ""}`,
    };
  });

  const anomalyCount = rows.filter((r) => classifyStatusKind(r.status) !== "normal").length;
  const startPht = formatPhtTime(rows[0].created_at);
  const endPht = formatPhtTime(rows[rows.length - 1].created_at);

  return {
    id: "db-replay-live",
    label: `Live DB Replay (${rows.length} rows)`,
    description: `${rows.length} recorded rows · ${anomalyCount} anomaly event${anomalyCount === 1 ? "" : "s"} · ${startPht} → ${endPht} PHT`,
    rowCount: rows.length,
    durationSec,
    keyframes,
    events: events.length > 0 ? events : [EMPTY_EVENT],
  };
}
