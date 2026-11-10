// src/lib/leakLogic.ts
// Pure, side-effect-free functions for leak detection and severity calculation.
// Unit-tested in src/lib/__tests__/leakLogic.test.ts
// ASK before changing any formula here.

export type Severity = "low" | "medium" | "high";

export interface SeverityThresholds {
  low: number;    // SI < low  → "low"
  medium: number; // SI < medium → "medium", else "high"
}

export interface LeakFeatures {
  pressureDropRate: number;  // bar/s
  flowDifference: number;    // L/min  (upstream − downstream)
  vibrationRms: number;
  dominantFreq?: number;     // Hz
  bandEnergy?: number;
}

export interface BaselineValues {
  q0: number; // baseline flow L/min
  p0: number; // baseline pressure bar
}

/** Leak rate L/min  =  Q0 − Q (clamp to 0) */
export function leakRate(q0: number, q: number): number {
  return Math.max(0, q0 - q);
}

/**
 * Severity Index (%)  =  (ΔP / P0) × 100
 * where ΔP = P0 − P  (positive when pressure drops).
 */
export function severityIndex(p0: number, p: number): number {
  if (p0 === 0) return 0;
  return ((p0 - p) / p0) * 100;
}

/** Classify severity from SI using editable thresholds. */
export function classifySeverity(
  si: number,
  thresholds: SeverityThresholds
): Severity {
  if (si < thresholds.low) return "low";
  if (si < thresholds.medium) return "medium";
  return "high";
}

/** Human-readable recommended action per severity level. */
export function recommendedAction(severity: Severity): string {
  switch (severity) {
    case "low":
      return "Monitor — check again in 10 minutes.";
    case "medium":
      return "Schedule inspection within 24 hours.";
    case "high":
      return "Respond immediately — dispatch maintenance team.";
  }
}

/**
 * Zone localization: given per-station flow readings, return the zone index
 * (1-based) with the largest upstream-minus-downstream imbalance.
 * stations array must be ordered S1 → S6 (index 0 = S1).
 */
export function localizeZone(flows: number[]): number {
  let maxDiff = -Infinity;
  let zoneId = 1;
  for (let i = 0; i < flows.length - 1; i++) {
    const diff = flows[i] - flows[i + 1];
    if (diff > maxDiff) {
      maxDiff = diff;
      zoneId = i + 1;
    }
  }
  return zoneId;
}

/**
 * Demand-spike / pump-transient guard.
 * Returns true if the pressure did NOT drop (rule: if upstream pressure is
 * also rising or stable, it's a demand event, not a leak).
 * This is a heuristic placeholder until rig calibration.
 */
export function isDemandSpike(
  features: LeakFeatures,
  thresholds: SeverityThresholds
): boolean {
  // If flow difference is large but pressure drop rate is negligible,
  // treat as demand spike (no alert).
  return features.pressureDropRate < 0.05 && features.flowDifference > 2;
}

/**
 * Full alert evaluation.  Returns null if no actionable alert should be raised,
 * or a scored alert object if it should.
 */
export interface EvaluatedAlert {
  severity: Severity;
  si: number;
  leakRateValue: number;
  recommendedActionText: string;
  zoneId: number;
}

export function evaluateAlert(
  features: LeakFeatures,
  baseline: BaselineValues,
  flows: number[], // all 6 stations
  thresholds: SeverityThresholds
): EvaluatedAlert | null {
  // Suppress demand spikes and pump transients
  if (isDemandSpike(features, thresholds)) return null;

  const q = baseline.q0 - features.flowDifference;
  const p = baseline.p0 - features.pressureDropRate;
  const lr = leakRate(baseline.q0, q);
  const si = severityIndex(baseline.p0, p);
  const sev = classifySeverity(si, thresholds);
  const zone = localizeZone(flows);

  return {
    severity: sev,
    si,
    leakRateValue: lr,
    recommendedActionText: recommendedAction(sev),
    zoneId: zone,
  };
}

