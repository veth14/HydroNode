// src/lib/__tests__/friendTelemetry.test.ts
// Unit tests for pure friend sensor_data transform, PHT formatting, and pump detection logic.
// Run via: npx tsx --test src/lib/__tests__/friendTelemetry.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import type { FriendSensorRow, PumpTransitionRow } from "@/db/friendClient";
import {
  adcToBar,
  classifyStatusKind,
  derivePumpState,
  evaluateFriendRowAnomaly,
  formatPhtTime,
  normalizeConfidence01,
  parseLocalizationZone,
} from "../friendTelemetry";

const makeRow = (overrides: Partial<FriendSensorRow> = {}): FriendSensorRow => ({
  id: 1,
  created_at: "2026-11-26T10:46:35.512Z", // 6:46:35 PM PHT
  status: "Normal",
  flow1: 12,
  flow2: 12,
  flow3: 12,
  flow4: 12,
  pressure1: 1200,
  pressure2: 1200,
  pressure3: 1200,
  pressure4: 1200,
  localization: "None",
  confidence: 95,
  pump_status: "ON",
  ...overrides,
});

test("adcToBar: rest ADC at/below 225 clamps to 0 bar", () => {
  assert.equal(adcToBar(0), 0);
  assert.equal(adcToBar(225), 0);
});

test("adcToBar: max ADC 4095 scales to 12.0 bar", () => {
  assert.equal(adcToBar(4095), 12);
});

test("formatPhtTime converts UTC 10:46:35Z to 06:46:35 PM Manila PHT (not 10:46 AM)", () => {
  const formatted = formatPhtTime("2026-11-26T10:46:35.512Z");
  assert.match(formatted, /6:46:35\s*PM/i);
});

test("normalizeConfidence01 supports both 0..100 and 0..1 scales", () => {
  assert.equal(normalizeConfidence01(54), 0.54);
  assert.equal(normalizeConfidence01(0.82), 0.82);
  assert.equal(normalizeConfidence01(120), 1);
  assert.equal(normalizeConfidence01(null), 0);
});

test("parseLocalizationZone parses Zone1..Zone4 variants cleanly", () => {
  assert.equal(parseLocalizationZone("Zone1"), 1);
  assert.equal(parseLocalizationZone("Zone 3"), 3);
  assert.equal(parseLocalizationZone("Sensor 2"), 2);
  assert.equal(parseLocalizationZone("S4"), 4);
  assert.equal(parseLocalizationZone("None"), null);
  assert.equal(parseLocalizationZone(null), null);
});

test("classifyStatusKind treats Normal, Monitoring, and No Leak as normal", () => {
  assert.equal(classifyStatusKind("Normal"), "normal");
  assert.equal(classifyStatusKind("Monitoring"), "normal");
  assert.equal(classifyStatusKind("No Leak"), "normal");
  assert.equal(classifyStatusKind("NO LEAK DETECTED"), "normal");
  assert.equal(classifyStatusKind("Leak"), "leak");
  assert.equal(classifyStatusKind("LeakDetected"), "leak");
  assert.equal(classifyStatusKind("SensorFailure"), "sensor_failure");
});

test("derivePumpState detects OFF, STARTING (<12s transition), RUNNING, and stale", () => {
  const baseMs = new Date("2026-11-26T10:46:35.512Z").getTime();
  const rowOn = makeRow({ pump_status: "ON", created_at: "2026-11-26T10:46:35.512Z" });
  const transJustOn: PumpTransitionRow = {
    id: 1,
    created_at: "2026-11-26T10:46:30.000Z", // 5.5s earlier
    pump_status: "ON",
    prev_pump_status: "OFF",
  };
  const startingState = derivePumpState(rowOn, transJustOn, baseMs + 2000);
  assert.equal(startingState.pumpStatus, "starting");
  assert.equal(startingState.pumpStatusRaw, "ON");
  assert.equal(startingState.isStale, false);

  const transLongOn: PumpTransitionRow = {
    id: 1,
    created_at: "2026-11-26T10:40:00.000Z",
    pump_status: "ON",
    prev_pump_status: "OFF",
  };
  const runningState = derivePumpState(rowOn, transLongOn, baseMs + 2000);
  assert.equal(runningState.pumpStatus, "running");

  const staleState = derivePumpState(rowOn, transLongOn, baseMs + 10 * 60_000);
  assert.equal(staleState.pumpStatusRaw, "ON");
  assert.equal(staleState.isStale, true);

  const offState = derivePumpState(makeRow({ pump_status: "OFF" }), null, baseMs + 2000);
  assert.equal(offState.pumpStatus, "off");
  assert.equal(offState.pumpStatusRaw, "OFF");
});

test("evaluateFriendRowAnomaly distinguishes Leak vs SensorFailure", () => {
  const leakRow = makeRow({
    status: "Leak",
    localization: "Zone2",
    flow1: 15,
    flow2: 15,
    flow3: 9,
    flow4: 9,
    pressure2: 2000,
    pressure3: 1100,
  });
  const leakEval = evaluateFriendRowAnomaly(leakRow);
  assert.equal(leakEval.kind, "leak");
  assert.equal(leakEval.zoneId, 2);
  assert.equal(leakEval.stationId, "S2");
  assert.equal(leakEval.flowDiff, 6);

  const sfRow = makeRow({
    status: "SensorFailure",
    localization: "None",
    flow1: 0,
    flow2: 0,
    flow3: 0,
    flow4: 0,
  });
  const sfEval = evaluateFriendRowAnomaly(sfRow);
  assert.equal(sfEval.kind, "sensor_failure");
  assert.equal(sfEval.zoneId, null);

  // Calibrated ~3.2 L/min rig drop (Flow3=3.20 -> Flow4=0.50 in Zone3)
  const calibratedLeakRow = makeRow({
    status: "Leak",
    localization: "Zone3",
    flow1: 3.25,
    flow2: 3.18,
    flow3: 3.2,
    flow4: 0.5,
  });
  const calEval = evaluateFriendRowAnomaly(calibratedLeakRow);
  assert.equal(calEval.kind, "leak");
  assert.equal(calEval.zoneId, 3);
  assert.equal(calEval.stationId, "S3");
  assert.equal(calEval.flowDiff, 2.7);
  assert.equal(calEval.severity, "high");
});
