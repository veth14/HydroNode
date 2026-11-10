// src/lib/__tests__/leakLogic.test.ts
// Unit tests for core leak-detection logic (pure functions only).
// Run via: npx tsx --test src/lib/__tests__/leakLogic.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  leakRate,
  severityIndex,
  classifySeverity,
  recommendedAction,
  localizeZone,
  isDemandSpike,
  evaluateAlert,
} from "../leakLogic";

const THRESHOLDS = { low: 5, medium: 10 };

// ── leakRate ─────────────────────────────────────────────────────────────────
test("leakRate: normal drop", () => {
  assert.equal(leakRate(15, 10), 5);
});

test("leakRate: no leak (q ≥ q0) → 0", () => {
  assert.equal(leakRate(15, 16), 0);
});

test("leakRate: exact zero", () => {
  assert.equal(leakRate(10, 10), 0);
});

// ── severityIndex ─────────────────────────────────────────────────────────────
test("severityIndex: 20% drop", () => {
  assert.equal(severityIndex(5, 4), 20);
});

test("severityIndex: no drop → 0%", () => {
  assert.equal(severityIndex(5, 5), 0);
});

test("severityIndex: p0 == 0 → 0", () => {
  assert.equal(severityIndex(0, 0), 0);
});

// ── classifySeverity ──────────────────────────────────────────────────────────
test("classifySeverity: SI < 5 → low", () => {
  assert.equal(classifySeverity(3, THRESHOLDS), "low");
});

test("classifySeverity: SI == 5 → medium", () => {
  assert.equal(classifySeverity(5, THRESHOLDS), "medium");
});

test("classifySeverity: SI > 10 → high", () => {
  assert.equal(classifySeverity(11, THRESHOLDS), "high");
});

// ── recommendedAction ─────────────────────────────────────────────────────────
test("recommendedAction: low → monitor", () => {
  assert.match(recommendedAction("low"), /Monitor/i);
});

test("recommendedAction: high → respond immediately", () => {
  assert.match(recommendedAction("high"), /immediately/i);
});

// ── localizeZone ──────────────────────────────────────────────────────────────
test("localizeZone: largest drop between S2→S3 → zone 2", () => {
  const flows = [15, 14.9, 10, 9.9, 9.8, 9.7]; // big drop at index 1→2
  assert.equal(localizeZone(flows), 2);
});

test("localizeZone: largest drop between S4→S5 → zone 4", () => {
  const flows = [15, 14.8, 14.6, 14.4, 8, 7.8];
  assert.equal(localizeZone(flows), 4);
});

// ── isDemandSpike ─────────────────────────────────────────────────────────────
test("isDemandSpike: no pressure drop + large flow diff → true", () => {
  const features = { pressureDropRate: 0.02, flowDifference: 3, vibrationRms: 0.1 };
  assert.equal(isDemandSpike(features, THRESHOLDS), true);
});

test("isDemandSpike: pressure drop present → false", () => {
  const features = { pressureDropRate: 0.5, flowDifference: 8, vibrationRms: 0.3 };
  assert.equal(isDemandSpike(features, THRESHOLDS), false);
});

// ── evaluateAlert ─────────────────────────────────────────────────────────────
test("evaluateAlert: demand spike → null", () => {
  const features = { pressureDropRate: 0.02, flowDifference: 3, vibrationRms: 0.1 };
  const baseline = { q0: 15, p0: 5 };
  const flows = [15, 14.5, 12, 11.5, 11, 10.5];
  assert.equal(evaluateAlert(features, baseline, flows, THRESHOLDS), null);
});

test("evaluateAlert: real leak → returns alert with correct zone", () => {
  const features = { pressureDropRate: 0.6, flowDifference: 8, vibrationRms: 0.3 };
  const baseline = { q0: 15, p0: 5 };
  const flows = [15, 14.5, 7, 6.5, 6, 5.5]; // biggest drop at index 1→2 → zone 2
  const result = evaluateAlert(features, baseline, flows, THRESHOLDS);
  assert.ok(result !== null);
  assert.equal(result?.zoneId, 2);
  assert.ok(result?.si > 0);
});

