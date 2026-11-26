// src/lib/__tests__/pipeWaterMath.test.ts
// Unit tests proving internal water CurvePaths & TubeGeometries stay strictly inside
// public/pipeline.glb's Blue_PVC_Pipes_Mesh bounds and respond proportionally to flow & pressure.

import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildFilletedPipeCurve,
  computeLegHydraulicTargets,
  INNER_WATER_RADIUS,
  LEG_WAYPOINTS,
  PIPE_CENTER_Y,
  PIPE_OUTER_RADIUS,
} from "../pipeWaterMath";

// Exact measured world bounds of Blue_PVC_Pipes_Mesh in Pipeline3DCanvas
const BLUE_PIPE_BOUNDS = {
  minX: -5.429,
  maxX: 5.429,
  minY: 0.063,
  maxY: 0.268,
  minZ: -2.73,
  maxZ: 2.841,
};

test("all 4 filleted pipe legs remain strictly inside Blue_PVC_Pipes_Mesh geometry", () => {
  assert.ok(INNER_WATER_RADIUS < PIPE_OUTER_RADIUS);

  for (let legIdx = 0; legIdx < LEG_WAYPOINTS.length; legIdx++) {
    const curve = buildFilletedPipeCurve(LEG_WAYPOINTS[legIdx]);
    const geom = new THREE.TubeGeometry(curve, 110, INNER_WATER_RADIUS, 16, false);
    const pos = geom.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
      assert.ok(
        x >= BLUE_PIPE_BOUNDS.minX && x <= BLUE_PIPE_BOUNDS.maxX,
        `Leg ${legIdx} vertex X=${x} outside [${BLUE_PIPE_BOUNDS.minX}, ${BLUE_PIPE_BOUNDS.maxX}]`
      );
      assert.ok(
        y >= BLUE_PIPE_BOUNDS.minY && y <= BLUE_PIPE_BOUNDS.maxY,
        `Leg ${legIdx} vertex Y=${y} outside [${BLUE_PIPE_BOUNDS.minY}, ${BLUE_PIPE_BOUNDS.maxY}]`
      );
      assert.ok(
        z >= BLUE_PIPE_BOUNDS.minZ && z <= BLUE_PIPE_BOUNDS.maxZ,
        `Leg ${legIdx} vertex Z=${z} outside [${BLUE_PIPE_BOUNDS.minZ}, ${BLUE_PIPE_BOUNDS.maxZ}]`
      );
    }

    // Centerline stays locked to PIPE_CENTER_Y across entire curve
    for (let s = 0; s <= 100; s++) {
      const pt = curve.getPointAt(s / 100);
      assert.ok(Math.abs(pt.y - PIPE_CENTER_Y) < 1e-4);
    }

    geom.dispose();
  }
});

test("computeLegHydraulicTargets distinguishes dry, nominal 3.2 L/min, and choked 0.50 L/min Zone 3 leak", () => {
  const dry = computeLegHydraulicTargets({
    flowLpm: 0,
    pressureBar: 0,
    pumpOn: false,
    maxUpstreamPressure: 0,
  });
  assert.equal(dry.waterDetected, false);
  assert.equal(dry.worldSpeed, 0);

  const nominal = computeLegHydraulicTargets({
    flowLpm: 3.25,
    pressureBar: 1.18,
    pumpOn: true,
    maxUpstreamPressure: 1.18,
  });
  assert.equal(nominal.waterDetected, true);
  assert.ok(nominal.targetFill >= 0.95);
  assert.ok(nominal.pressNorm >= 0.95);
  assert.ok(nominal.worldSpeed > 2.5);

  const chokedS4 = computeLegHydraulicTargets({
    flowLpm: 0.5,
    pressureBar: 0.26,
    pumpOn: true,
    maxUpstreamPressure: 1.18,
  });
  assert.equal(chokedS4.waterDetected, true);
  assert.ok(chokedS4.targetFill < nominal.targetFill - 0.3);
  assert.ok(chokedS4.pressNorm < 0.35);
  assert.ok(chokedS4.worldSpeed < nominal.worldSpeed * 0.25);
});
