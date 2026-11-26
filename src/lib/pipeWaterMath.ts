// src/lib/pipeWaterMath.ts
// Pure Three.js pipe centerline geometry & hydraulic parameter calculations
// matching the physical Blue_PVC_Pipes_Mesh geometry in public/pipeline.glb.

import * as THREE from "three";
import { FLOW_NOMINAL_LPM } from "@/lib/friendTelemetry";

/** World Y centerline of Blue_PVC_Pipes_Mesh (bounds y=[0.063, 0.268]) */
export const PIPE_CENTER_Y = 0.1657;
/** Outer pipe radius in world units: (0.268 - 0.063) / 2 = 0.1025 */
export const PIPE_OUTER_RADIUS = 0.1025;
/** Inner volumetric water stream bore radius (leaves ~0.0345 PVC wall thickness) */
export const INNER_WATER_RADIUS = 0.068;
export const ELBOW_FILLET_R = 0.24;

/**
 * Exact serpentine centerline paths for Legs 0..3 corresponding to stations S1..S4.
 * Traced from rotated (+90Y), scaled (scale=7.891) public/pipeline.glb vertices.
 */
export const LEG_WAYPOINTS: Array<Array<[number, number, number]>> = [
  // Leg 0 (Inlet + Station S1): flow[0], pressure[0]
  [
    [-5.311, PIPE_CENTER_Y, -2.55],
    [-5.311, PIPE_CENTER_Y, 2.723],
    [-3.393, PIPE_CENTER_Y, 2.723],
    [-3.393, PIPE_CENTER_Y, -2.612],
  ],
  // Leg 1 (S1 -> S2 leg): flow[1], pressure[1]
  [
    [-3.393, PIPE_CENTER_Y, -2.612],
    [-1.46, PIPE_CENTER_Y, -2.612],
    [-1.46, PIPE_CENTER_Y, 2.723],
  ],
  // Leg 2 (S2 -> S3 leg): flow[2], pressure[2]
  [
    [-1.46, PIPE_CENTER_Y, 2.723],
    [0.473, PIPE_CENTER_Y, 2.723],
    [0.473, PIPE_CENTER_Y, -2.612],
  ],
  // Leg 3 (S3 -> S4 leg + Outlet): flow[3], pressure[3]
  [
    [0.473, PIPE_CENTER_Y, -2.612],
    [2.407, PIPE_CENTER_Y, -2.612],
    [2.407, PIPE_CENTER_Y, 2.723],
    [5.311, PIPE_CENTER_Y, 2.723],
    [5.311, PIPE_CENTER_Y, -2.55],
  ],
];

/**
 * Build a smooth CurvePath with tight rounded 90-degree elbows so the internal
 * water stream never overshoots outside PVC corners.
 */
export function buildFilletedPipeCurve(
  waypoints: Array<[number, number, number]>
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const pts = waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));

  let cursor = pts[0].clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const corner = pts[i];
    const next = pts[i + 1];

    const dirIn = new THREE.Vector3().subVectors(corner, cursor);
    const lenIn = dirIn.length();
    dirIn.normalize();

    const dirOut = new THREE.Vector3().subVectors(next, corner);
    const lenOut = dirOut.length();
    dirOut.normalize();

    const r = Math.min(ELBOW_FILLET_R, lenIn * 0.4, lenOut * 0.4);
    const pEnter = corner.clone().addScaledVector(dirIn, -r);
    const pExit = corner.clone().addScaledVector(dirOut, r);

    if (cursor.distanceTo(pEnter) > 1e-4) {
      path.add(new THREE.LineCurve3(cursor.clone(), pEnter));
    }
    path.add(new THREE.QuadraticBezierCurve3(pEnter, corner.clone(), pExit));
    cursor = pExit;
  }

  const last = pts[pts.length - 1];
  if (cursor.distanceTo(last) > 1e-4) {
    path.add(new THREE.LineCurve3(cursor, last));
  }
  return path;
}

export interface LegHydraulicTargets {
  waterDetected: boolean;
  flowNorm: number;
  pressNorm: number;
  targetFill: number;
  worldSpeed: number;
}

/**
 * Compute per-leg animation targets from live/replay flow (L/min), pressure (bar), and pump state.
 */
export function computeLegHydraulicTargets(params: {
  flowLpm: number;
  pressureBar: number;
  pumpOn: boolean;
  maxUpstreamPressure: number;
  pressureBaseline?: number;
}): LegHydraulicTargets {
  const f = Math.max(0, params.flowLpm);
  const p = Math.max(0, params.pressureBar);
  const waterDetected = f > 0.05 || (params.pumpOn && p > 0.12);
  const flowNorm = f / FLOW_NOMINAL_LPM;

  const pBase = params.pressureBaseline;
  const nominalPRef =
    pBase && pBase > 0.2 && params.maxUpstreamPressure > pBase * 0.55 ? pBase : 0.95;
  const pressureRatioRaw = p > 0 ? Math.min(1.0, p / nominalPRef) : params.pumpOn ? 0.5 : 0;
  const upstreamDrop = params.maxUpstreamPressure > 0.3 ? p / params.maxUpstreamPressure : 1.0;
  const pressNorm = Math.min(pressureRatioRaw, Math.max(0.15, upstreamDrop));

  const targetFill = waterDetected
    ? THREE.MathUtils.clamp(
        0.32 + Math.min(flowNorm, 1.0) * 0.48 + pressNorm * 0.2,
        0.25,
        1.0
      )
    : 0.05;

  const worldSpeed = f > 0.04 ? Math.min(flowNorm, 1.6) * 2.6 : 0;

  return { waterDetected, flowNorm, pressNorm, targetFill, worldSpeed };
}
