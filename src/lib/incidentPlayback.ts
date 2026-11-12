// src/lib/incidentPlayback.ts
// Historic Incident Playback & Simulation Physics Engine for HydroNode SCADA.
// Simulates high-fidelity physical propagation of hydraulic ruptures and acoustic emissions
// across the ESP32-S3 test rig (S1–S6 tri-sensor bus).

import type { StationId, ZoneId, LiveStation, LiveAlert } from "@/types";
import { STATION_IDS, ZONES } from "@/config/rig";

export interface TimelineEvent {
  tSeconds: number;
  label: string;
  phase: string;
  description: string;
}

export interface IncidentScenario {
  id: string;
  name: string;
  zoneId: ZoneId;
  severity: "high" | "medium" | "low";
  leakRateTarget: number; // L/min
  pressureDropTarget: number; // bar
  vibrationPeakTarget: number; // g RMS
  durationSeconds: number;
  events: TimelineEvent[];
}

export const PRESET_INCIDENTS: IncidentScenario[] = [
  {
    id: "zone-2-burst",
    name: "Zone 2 High-Pressure Pipe Rupture (4.2 L/min)",
    zoneId: 2,
    severity: "high",
    leakRateTarget: 4.2,
    pressureDropTarget: 0.65,
    vibrationPeakTarget: 0.485,
    durationSeconds: 60,
    events: [
      {
        tSeconds: 0,
        label: "Nominal Steady State",
        phase: "Baseline Hold",
        description: "All 5 pipeline zones nominal at 5.00 bar head, 15.0 L/min circulation, and 0.082 g RMS noise floor.",
      },
      {
        tSeconds: 12,
        label: "Stress Inception",
        phase: "Acoustic Precursor",
        description: "Piezoelectric film sensors at S2 and S3 capture micro-fracture acoustic emissions (60–240 Hz band).",
      },
      {
        tSeconds: 22,
        label: "Hydraulic Rupture",
        phase: "Wavefront Propagation",
        description: "Rapid hydraulic orifice cavitation. Head pressure drops abruptly; flow delta expands to 4.2 L/min.",
      },
      {
        tSeconds: 34,
        label: "Adaptive Polling Surge",
        phase: "ESP32-S3 Edge Trigger",
        description: "On-device threshold (0.150 g) exceeded. ESP32-S3 dynamically escalates sampling from 10 Hz to 100 Hz.",
      },
      {
        tSeconds: 46,
        label: "Random Forest Flagged",
        phase: "SCADA Alarm Logged",
        description: "Edge Random Forest classifier outputs 94% leak confidence. Severity Index (SI) calculated at 8.2%.",
      },
      {
        tSeconds: 58,
        label: "Steady-State Imbalance",
        phase: "Quenched Deficit",
        description: "Downstream hydraulic loss stabilized. Isolation protocol recommended for Zone 2 PVC segment.",
      },
    ],
  },
  {
    id: "zone-3-surge",
    name: "Zone 3 Acoustic Wave & Micro-Leak (2.4 L/min)",
    zoneId: 3,
    severity: "medium",
    leakRateTarget: 2.4,
    pressureDropTarget: 0.38,
    vibrationPeakTarget: 0.315,
    durationSeconds: 50,
    events: [
      {
        tSeconds: 0,
        label: "Nominal Circulation",
        phase: "Baseline Hold",
        description: "Normal JT-800D pump circulation. Baseline acoustic RMS across all stations below 0.090 g.",
      },
      {
        tSeconds: 10,
        label: "Acoustic Flange Vibration",
        phase: "Precursor Wave",
        description: "Elbow coupling turbulence generates anomalous P/S wave packet detected by Station S3.",
      },
      {
        tSeconds: 20,
        label: "Pressure Drop Wave",
        phase: "Transient Wavefront",
        description: "ADS1115 16-bit ADC captures −0.38 bar differential across Stations S3 and S4.",
      },
      {
        tSeconds: 32,
        label: "Sampling Rate Shift",
        phase: "Edge Escalation",
        description: "ESP32-S3 switches Station S3 and S4 into 100 Hz high-frequency surge mode.",
      },
      {
        tSeconds: 42,
        label: "Medium Alert Confirmed",
        phase: "Event Classified",
        description: "Random Forest confirms medium leak in Zone 3 segment (confidence 87%).",
      },
    ],
  },
  {
    id: "zone-1-burst",
    name: "Zone 1 Inlet Pipe Rupture (5.6 L/min)",
    zoneId: 1,
    severity: "high",
    leakRateTarget: 5.6,
    pressureDropTarget: 0.85,
    vibrationPeakTarget: 0.620,
    durationSeconds: 60,
    events: [
      {
        tSeconds: 0,
        label: "Pump Prime Feed",
        phase: "Baseline Hold",
        description: "JT-800D pump operating at 75% PWM duty. Discharge pressure at S1 reaches nominal 5.00 bar.",
      },
      {
        tSeconds: 8,
        label: "Primary Leg Shear",
        phase: "Instant Cavitation",
        description: "Catastrophic rupture directly downstream of supply tank. Intense acoustic burst recorded at S1.",
      },
      {
        tSeconds: 18,
        label: "Massive Head Loss",
        phase: "System Depressurization",
        description: "Line pressure plummets by 0.85 bar. Severe flow differential ΔQ = 5.6 L/min recorded at S1/S2.",
      },
      {
        tSeconds: 30,
        label: "Emergency Edge Alarm",
        phase: "Critical Alert",
        description: "High-severity alarm triggered on ESP32-S3. Isolation protocol initiated for Zone 1.",
      },
    ],
  },
  {
    id: "zone-4-valve",
    name: "Zone 4 Downstream Valve Orifice Leak (1.8 L/min)",
    zoneId: 4,
    severity: "low",
    leakRateTarget: 1.8,
    pressureDropTarget: 0.22,
    vibrationPeakTarget: 0.195,
    durationSeconds: 45,
    events: [
      {
        tSeconds: 0,
        label: "Nominal Flow",
        phase: "Baseline Hold",
        description: "Standard 15.0 L/min flow across test rig.",
      },
      {
        tSeconds: 12,
        label: "Minor Flange Seep",
        phase: "Slow Infiltration",
        description: "Slow orifice drip initiated at Zone 4 test point port.",
      },
      {
        tSeconds: 24,
        label: "Gradual Imbalance",
        phase: "Cumulative Delta",
        description: "Flow loss delta reaches 1.8 L/min between Station S4 and Station S5.",
      },
      {
        tSeconds: 36,
        label: "Low-Severity Triage",
        phase: "Monitored Incident",
        description: "Logged as low-severity anomaly. Continuous monitoring recommended.",
      },
    ],
  },
];

export interface PlaybackFrame {
  tSeconds: number;
  scenario: IncidentScenario;
  stations: LiveStation[];
  alerts: LiveAlert[];
  injectedLeaks: ZoneId[];
  flowImbalance: number; // L/min
  pressureDrop: number; // bar
  vibrationRmsPeak: number; // g RMS
  currentEvent: TimelineEvent;
  progressPercent: number;
}

// Baseline values for S1–S6
const BASELINES: Record<StationId, { q0: number; p0: number }> = {
  S1: { q0: 15.0, p0: 5.0 },
  S2: { q0: 14.8, p0: 4.9 },
  S3: { q0: 14.6, p0: 4.8 },
  S4: { q0: 14.4, p0: 4.7 },
  S5: { q0: 14.2, p0: 4.6 },
  S6: { q0: 14.0, p0: 4.5 },
};

/**
 * Calculates smooth physical telemetry for a given scenario and time offset.
 */
export function calculatePlaybackFrame(
  scenario: IncidentScenario,
  tSeconds: number
): PlaybackFrame {
  const clampedT = Math.max(0, Math.min(tSeconds, scenario.durationSeconds));
  const progressPercent = (clampedT / scenario.durationSeconds) * 100;

  // Find the active event based on timeline
  let currentEvent = scenario.events[0];
  for (let i = scenario.events.length - 1; i >= 0; i--) {
    if (clampedT >= scenario.events[i].tSeconds) {
      currentEvent = scenario.events[i];
      break;
    }
  }

  // Rupture start is the timestamp of the 2nd event
  const ruptureT = scenario.events[1]?.tSeconds ?? 12;
  const detectionT = scenario.events[scenario.events.length - 2]?.tSeconds ?? 45;

  // Rupture progression fraction [0, 1]
  const ruptureDuration = 15; // takes ~15 seconds to reach full physical leak size
  const ruptureFraction =
    clampedT < ruptureT
      ? 0
      : Math.min(1, (clampedT - ruptureT) / ruptureDuration);

  // Smooth sigmoid-like S-curve for physical realism
  const smoothFactor =
    ruptureFraction <= 0
      ? 0
      : ruptureFraction >= 1
      ? 1
      : 3 * Math.pow(ruptureFraction, 2) - 2 * Math.pow(ruptureFraction, 3);

  // Calculate current instantaneous leak parameters
  const currentLeakRate = scenario.leakRateTarget * smoothFactor;
  const currentPressureDrop = scenario.pressureDropTarget * smoothFactor;

  // Acoustic vibration surges abruptly at rupture, then settles into turbulent equilibrium
  let currentVibSurge = 0;
  if (clampedT >= ruptureT) {
    const elapsedSinceRupture = clampedT - ruptureT;
    if (elapsedSinceRupture < 8) {
      // Violent initial cavitation peak
      currentVibSurge = scenario.vibrationPeakTarget * (elapsedSinceRupture / 8);
    } else {
      // Plateau with oscillation noise
      const decay = Math.max(0.65, 1 - (elapsedSinceRupture - 8) * 0.015);
      const microJitter = Math.sin(clampedT * 6.28) * 0.035;
      currentVibSurge =
        scenario.vibrationPeakTarget * decay + microJitter;
    }
  }

  const zoneData = ZONES.find((z) => z.id === scenario.zoneId) ?? ZONES[1];
  const stationA = zoneData.stationA;
  const stationB = zoneData.stationB;

  // Determine stations that are downstream of the leak zone
  const zoneIndex = ZONES.findIndex((z) => z.id === scenario.zoneId);
  const boundaryStationIdx = STATION_IDS.indexOf(stationB);

  // Build live stations array
  const stations: LiveStation[] = STATION_IDS.map((sid, idx) => {
    const base = BASELINES[sid];
    const isStationA = sid === stationA;
    const isStationB = sid === stationB;
    const isDownstream = idx >= boundaryStationIdx;

    // Flow rate calculation: downstream drops by currentLeakRate
    let flow = base.q0;
    if (isDownstream) {
      flow = Math.max(0, base.q0 - currentLeakRate);
    }

    // Pressure calculation: drops near and downstream of the rupture
    let pressure = base.p0;
    if (isStationA) {
      pressure = Math.max(0.5, base.p0 - currentPressureDrop * 0.85);
    } else if (isDownstream) {
      pressure = Math.max(0.5, base.p0 - currentPressureDrop);
    }

    // Vibration calculation: peaks at stations bounding the leak zone
    let vibration = 0.082;
    if (isStationA || isStationB) {
      vibration = Math.max(0.082, 0.082 + currentVibSurge);
    } else if (Math.abs(idx - boundaryStationIdx) === 1) {
      vibration = Math.max(0.082, 0.082 + currentVibSurge * 0.35);
    }

    // Sampling mode & station alert status
    const isElevated = vibration > 0.150 && clampedT >= 28;
    const isAlert = clampedT >= detectionT && (isStationA || isStationB);

    return {
      id: sid,
      name: `Sensor Station ${sid}`,
      status: isAlert ? "alert" : isElevated ? "elevated" : "online",
      samplingMode: isElevated ? "elevated" : "normal",
      lastSeen: new Date().toISOString(),
      latestFlow: Number(flow.toFixed(2)),
      latestPressure: Number(pressure.toFixed(2)),
      latestVibration: Number(vibration.toFixed(3)),
    };
  });

  // Alerts array: appears after detection threshold is reached
  const alerts: LiveAlert[] = [];
  if (clampedT >= detectionT) {
    alerts.push({
      id: 88800 + scenario.zoneId,
      stationId: stationA,
      zoneId: scenario.zoneId,
      ts: new Date().toISOString(),
      confidence: 0.94,
      severity: scenario.severity,
      si: Number(((currentPressureDrop / 5.0) * 100).toFixed(1)),
      leakRate: Number(currentLeakRate.toFixed(1)),
      recommendedAction: `Isolate Zone ${scenario.zoneId} segment via manual bypass valve; dispatch emergency repair crew.`,
      status: "active",
      repeatCount: 1,
      features: {
        pressureDropRate: Number((currentPressureDrop / 15).toFixed(3)),
        flowDifference: Number(currentLeakRate.toFixed(2)),
        vibrationRms: Number((0.082 + currentVibSurge).toFixed(3)),
        dominantFreq: 118,
        bandEnergy: 4.8,
      },
    });
  }

  // Injected leak visuals on rig pipe
  const injectedLeaks: ZoneId[] = clampedT >= ruptureT ? [scenario.zoneId] : [];

  return {
    tSeconds: Number(clampedT.toFixed(1)),
    scenario,
    stations,
    alerts,
    injectedLeaks,
    flowImbalance: Number(currentLeakRate.toFixed(2)),
    pressureDrop: Number(currentPressureDrop.toFixed(2)),
    vibrationRmsPeak: Number((0.082 + currentVibSurge).toFixed(3)),
    currentEvent,
    progressPercent,
  };
}
