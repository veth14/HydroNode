// src/services/simulator.ts
// Generates realistic batches shaped identically to /api/ingest payloads.
// Used when dataSource === "simulated".

import type {
  IngestPayload,
  StationReading,
  IngestAlert,
  StationId,
  ZoneId,
  Severity,
} from "@/types";

const STATION_IDS: StationId[] = ["S1", "S2", "S3", "S4", "S5", "S6"];

// Baselines
const BASELINES: Record<StationId, { q0: number; p0: number }> = {
  S1: { q0: 15.0, p0: 5.0 },
  S2: { q0: 14.8, p0: 4.9 },
  S3: { q0: 14.6, p0: 4.8 },
  S4: { q0: 14.4, p0: 4.7 },
  S5: { q0: 14.2, p0: 4.6 },
  S6: { q0: 14.0, p0: 4.5 },
};

function randn(mean: number, std: number): number {
  // Box-Muller approximation
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export interface LeakScenario {
  zoneId: ZoneId;         // zone 1–5 (between station zoneId and zoneId+1)
  magnitude: "small" | "medium" | "large";
}

export interface DemandScenario {
  type: "demand_spike" | "pump_transient";
}

/** Generate one simulated batch (≈ 200 readings). */
export function generateBatch(
  leaks: LeakScenario[] = [],
  extras: DemandScenario[] = []
): IngestPayload {
  const now = new Date();
  const readings: StationReading[] = [];
  const alertsOut: IngestAlert[] = [];

  // Per-station effective baselines modified by leak scenarios
  const effectiveFlow: Record<StationId, number> = { ...Object.fromEntries(
    STATION_IDS.map((id) => [id, BASELINES[id].q0])
  ) } as Record<StationId, number>;
  const effectivePressure: Record<StationId, number> = { ...Object.fromEntries(
    STATION_IDS.map((id) => [id, BASELINES[id].p0])
  ) } as Record<StationId, number>;

  // Apply leaks: stations downstream of the leak point get reduced flow/pressure
  for (const leak of leaks) {
    const { zoneId, magnitude } = leak;
    const flowDrop = magnitude === "small" ? 1.5 : magnitude === "medium" ? 4 : 8;
    const pressureDrop = magnitude === "small" ? 0.1 : magnitude === "medium" ? 0.3 : 0.6;
    for (let i = zoneId; i < STATION_IDS.length; i++) {
      effectiveFlow[STATION_IDS[i]] -= flowDrop;
      effectivePressure[STATION_IDS[i]] -= pressureDrop;
    }
  }

  // Apply demand spike: uniform flow increase, NO pressure drop
  for (const e of extras) {
    if (e.type === "demand_spike") {
      for (const id of STATION_IDS) effectiveFlow[id] += 3;
    }
  }

  // Generate ~35 readings per station (≈210 total)
  const SAMPLES = 35;
  for (let i = 0; i < SAMPLES; i++) {
    const t = new Date(now.getTime() - (SAMPLES - i) * 850).toISOString();
    for (const id of STATION_IDS) {
      readings.push({
        stationId: id,
        t,
        flow: clamp(randn(effectiveFlow[id], 0.15), 0, 25),
        pressure: clamp(randn(effectivePressure[id], 0.03), 0, 10),
        vibration: clamp(randn(leaks.length > 0 ? 0.25 : 0.05, 0.02), 0, 2),
      });
    }
  }

  // Generate synthetic alert for each active leak (confidence based on magnitude)
  for (const leak of leaks) {
    const affectedStation = STATION_IDS[leak.zoneId - 1] as StationId;
    const conf =
      leak.magnitude === "small"
        ? 0.65
        : leak.magnitude === "medium"
        ? 0.82
        : 0.95;
    const flowDiff =
      leak.magnitude === "small" ? 1.5 : leak.magnitude === "medium" ? 4 : 8;
    const pDrop =
      leak.magnitude === "small" ? 0.1 : leak.magnitude === "medium" ? 0.3 : 0.6;

    alertsOut.push({
      stationId: affectedStation,
      t: now.toISOString(),
      confidence: conf,
      features: {
        pressureDropRate: pDrop,
        flowDifference: flowDiff,
        vibrationRms: 0.1 + flowDiff * 0.025,
        dominantFreq: 400 + Math.random() * 100,
        bandEnergy: 1 + flowDiff * 0.1,
      },
    });
  }

  const samplingModes: Partial<Record<StationId, "normal" | "elevated">> = {};
  for (const id of STATION_IDS) samplingModes[id] = "normal";
  if (leaks.length > 0) {
    samplingModes[STATION_IDS[leaks[0].zoneId - 1]] = "elevated";
  }

  return {
    deviceId: "esp32-sim",
    sentAt: now.toISOString(),
    readings,
    alerts: alertsOut,
    samplingModes,
  };
}

