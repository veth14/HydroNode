// src/lib/__tests__/incidentPlayback.test.ts
// Unit tests for Live DB Time Machine replay from Neon `sensor_data` rows.

import test from "node:test";
import assert from "node:assert/strict";
import { buildDbReplayScenario, calculatePlaybackFrame } from "../incidentPlayback";
import type { FriendSensorRow } from "../../db/friendClient";

test("buildDbReplayScenario handles empty DB gracefully with null frame", () => {
  const empty = buildDbReplayScenario([]);
  assert.equal(empty.rowCount, 0);
  assert.equal(empty.durationSec, 0);
  assert.equal(empty.keyframes.length, 0);
  assert.equal(calculatePlaybackFrame(empty, 0), null);
});

test("buildDbReplayScenario handles single-row DB snapshot accurately", () => {
  const rows: FriendSensorRow[] = [
    {
      id: 55,
      created_at: "2026-11-26T10:00:00.000Z", // 06:00:00 PM PHT
      status: "Normal",
      flow1: 3.25,
      flow2: 3.18,
      flow3: 3.2,
      flow4: 3.2,
      pressure1: 600,
      pressure2: 590,
      pressure3: 585,
      pressure4: 580,
      localization: null,
      confidence: 99,
      pump_status: "ON",
    },
  ];
  const sc = buildDbReplayScenario(rows);
  assert.equal(sc.rowCount, 1);
  assert.equal(sc.durationSec, 0);

  const frame = calculatePlaybackFrame(sc, 0);
  assert.ok(frame);
  assert.equal(frame.rowId, 55);
  assert.equal(frame.pumpOn, true);
  assert.equal(frame.alerts.length, 0);
  assert.ok(Math.abs(frame.flow[0] - 3.25) < 0.01);
});

test("buildDbReplayScenario builds chronological PHT replay and evaluates real leak rows", () => {
  const rows: FriendSensorRow[] = [
    {
      id: 101,
      created_at: "2026-11-26T10:00:00.000Z", // 06:00:00 PM PHT
      status: "Normal",
      flow1: 3.25,
      flow2: 3.18,
      flow3: 3.2,
      flow4: 3.2,
      pressure1: 600,
      pressure2: 590,
      pressure3: 585,
      pressure4: 580,
      localization: null,
      confidence: 98,
      pump_status: "ON",
    },
    {
      id: 102,
      created_at: "2026-11-26T10:00:20.000Z", // +20s, 06:00:20 PM PHT
      status: "Leak",
      flow1: 3.25,
      flow2: 3.18,
      flow3: 3.2,
      flow4: 0.5,
      pressure1: 600,
      pressure2: 590,
      pressure3: 585,
      pressure4: 310,
      localization: "Zone 3",
      confidence: 94,
      pump_status: "ON",
    },
    {
      id: 103,
      created_at: "2026-11-26T10:00:35.000Z", // +35s, Pump OFF
      status: "Normal",
      flow1: 0,
      flow2: 0,
      flow3: 0,
      flow4: 0,
      pressure1: 225,
      pressure2: 225,
      pressure3: 225,
      pressure4: 225,
      localization: null,
      confidence: 100,
      pump_status: "OFF",
    },
  ];

  const sc = buildDbReplayScenario(rows);
  assert.equal(sc.rowCount, 3);
  assert.equal(sc.durationSec, 35);
  assert.equal(sc.keyframes.length, 3);
  assert.match(sc.keyframes[0].label, /06:00:00 PM.*PHT/);

  const fStart = calculatePlaybackFrame(sc, 0);
  assert.ok(fStart);
  assert.equal(fStart.alerts.length, 0);
  assert.equal(fStart.pumpOn, true);

  const fLeak = calculatePlaybackFrame(sc, 20);
  assert.ok(fLeak);
  assert.equal(fLeak.alerts.length, 1);
  assert.equal(fLeak.alerts[0].zoneId, 3);
  assert.equal(fLeak.alerts[0].severity, "high");
  assert.ok(Math.abs(fLeak.flow[3] - 0.5) < 0.01);

  const fEnd = calculatePlaybackFrame(sc, 35);
  assert.ok(fEnd);
  assert.equal(fEnd.pumpOn, false);
  assert.deepEqual(fEnd.flow, [0, 0, 0, 0]);
  assert.equal(fEnd.issueKind, "no_flow");
  assert.equal(fEnd.alerts.length, 0);
});

test("SensorFailure & 0-flow DB rows never generate LEAK DETECTED alerts in Time Machine", () => {
  const rows: FriendSensorRow[] = [
    {
      id: 1024,
      created_at: "2026-11-26T20:11:33.974Z",
      status: "SensorFailure",
      flow1: 0,
      flow2: 0,
      flow3: 0,
      flow4: 0,
      pressure1: 458,
      pressure2: 464,
      pressure3: 447,
      pressure4: 469,
      localization: "None",
      confidence: 54,
      pump_status: "OFF",
    },
    {
      id: 1025,
      created_at: "2026-11-26T20:11:39.000Z",
      status: "Leak",
      flow1: 0,
      flow2: 0,
      flow3: 0,
      flow4: 0,
      pressure1: 458,
      pressure2: 464,
      pressure3: 447,
      pressure4: 469,
      localization: "Zone4",
      confidence: 54,
      pump_status: "OFF",
    },
  ];

  const sc = buildDbReplayScenario(rows);
  const f1 = calculatePlaybackFrame(sc, 0);
  assert.ok(f1);
  assert.equal(f1.alerts.length, 0);
  assert.equal(f1.issueKind, "no_flow");

  const f2 = calculatePlaybackFrame(sc, sc.durationSec);
  assert.ok(f2);
  assert.equal(f2.alerts.length, 0);
  assert.equal(f2.issueKind, "no_flow");
});
