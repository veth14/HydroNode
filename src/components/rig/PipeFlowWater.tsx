"use client";
// src/components/rig/PipeFlowWater.tsx
// Renders realistic animated water INSIDE public/pipeline.glb pipes.
// Visual encoding per zone leg (S1 -> S2 -> S3 -> S4):
//   - Flow rate (L/min): controls internal streamline/bubble velocity AND stream fill thickness
//   - Pressure (bar) + Leak state: controls stream fullness, pressure luminosity, and cavitation amber/red tint
//   - Pump OFF + 0 flow + 0 pressure: dry/drained pipe (zero water shown)

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOW_NOMINAL_LPM } from "@/lib/friendTelemetry";
import {
  buildFilletedPipeCurve,
  computeLegHydraulicTargets,
  INNER_WATER_RADIUS,
  LEG_WAYPOINTS,
  PIPE_CENTER_Y,
} from "@/lib/pipeWaterMath";

const PARTICLES_PER_LEG = 36;

const WATER_VERTEX_SHADER = /* glsl */ `
  uniform float uFill;
  uniform float uPhase;
  uniform float uFlowNorm;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Shrink inward toward pipe centerline when water volume / flow is starved
    float ripple = sin(uv.x * 40.0 - uPhase * 4.5) * 0.0022 * clamp(uFlowNorm, 0.0, 1.0);
    float radialShift = -(1.0 - clamp(uFill, 0.05, 1.0)) * ${INNER_WATER_RADIUS.toFixed(4)} + ripple;
    vec3 displaced = position + normal * radialShift;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uPhase;
  uniform float uWaveScale;
  uniform float uFlowNorm;
  uniform float uPressureNorm;
  uniform float uLeakFactor;
  uniform float uActive;
  varying vec2 vUv;

  void main() {
    if (uActive < 0.01) discard;

    // Uniform world-unit wave spacing regardless of pipe leg length
    float streamPos = vUv.x * uWaveScale - uPhase;
    float pulseWave = 0.5 + 0.5 * sin(streamPos * 6.28318);
    float chevron = 0.5 + 0.5 * sin((streamPos + abs(vUv.y - 0.5) * 1.15) * 6.28318);
    float microStreak = smoothstep(0.55, 0.98, chevron) * clamp(uFlowNorm, 0.0, 1.2);

    // Rich pressurized cyan-blue vs low-pressure slack pale vs leak cavitation amber/coral
    vec3 healthyDeep = vec3(0.01, 0.58, 0.88);
    vec3 healthyCrest = vec3(0.45, 0.92, 1.00);
    vec3 lowPressTint = vec3(0.18, 0.52, 0.72);
    vec3 leakTint = vec3(0.96, 0.42, 0.22);

    vec3 baseWater = mix(lowPressTint, healthyDeep, clamp(uPressureNorm, 0.0, 1.0));
    baseWater = mix(baseWater, leakTint, clamp(uLeakFactor, 0.0, 1.0));

    vec3 crestColor = mix(healthyCrest, vec3(1.0, 0.84, 0.52), clamp(uLeakFactor, 0.0, 1.0));
    vec3 col = mix(baseWater, crestColor, microStreak * 0.65 + pulseWave * 0.14);

    // Richer opacity when pressurized and moving; semi-translucent when starved or idle
    float alpha = (0.48 + 0.36 * clamp(uPressureNorm, 0.0, 1.0) + 0.14 * microStreak) * uActive;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
  }
`;

function createWaterShaderMaterial(waveScale: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPhase: { value: 0 },
      uWaveScale: { value: waveScale },
      uFill: { value: 0 },
      uFlowNorm: { value: 0 },
      uPressureNorm: { value: 0 },
      uLeakFactor: { value: 0 },
      uActive: { value: 0 },
    },
  });
}

export interface PipeFlowWaterProps {
  /** Flow rate L/min per station [S1, S2, S3, S4] */
  flow: [number, number, number, number];
  /** Pressure bar per station [S1, S2, S3, S4] */
  pressure: [number, number, number, number];
  /** True when pump relay is running or priming */
  pumpOn: boolean;
  /** True on a leg that currently has an active leak/fault alert */
  legAlerts: [boolean, boolean, boolean, boolean];
  /** Optional pressure baseline p0 (bar) per station for pressure adequacy normalization */
  pressureBaselines?: [number, number, number, number];
}

export function PipeFlowWater({
  flow,
  pressure,
  pumpOn,
  legAlerts,
  pressureBaselines,
}: PipeFlowWaterProps) {
  const [legs] = useState(() => {
    return LEG_WAYPOINTS.map((wps) => {
      const curve = buildFilletedPipeCurve(wps);
      const length = curve.getLength();
      const geom = new THREE.TubeGeometry(curve, 110, INNER_WATER_RADIUS, 16, false);
      const mat = createWaterShaderMaterial(length * 2.1);
      return { curve, length, geom, mat };
    });
  });

  useEffect(() => {
    return () => {
      for (const leg of legs) {
        leg.geom.dispose();
        leg.mat.dispose();
      }
    };
  }, [legs]);

  const totalParticles = PARTICLES_PER_LEG * LEG_WAYPOINTS.length;
  const [initialPositions] = useState<Float32Array>(() => new Float32Array(totalParticles * 3));
  const particleGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const meshRefs = useRef<Array<THREE.Mesh | null>>([null, null, null, null]);

  const phasesRef = useRef<[number, number, number, number]>([0, 0, 0, 0]);
  const particleURef = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(totalParticles);
      for (let leg = 0; leg < LEG_WAYPOINTS.length; leg++) {
        for (let i = 0; i < PARTICLES_PER_LEG; i++) {
          arr[leg * PARTICLES_PER_LEG + i] = i / PARTICLES_PER_LEG;
        }
      }
      return arr;
    })()
  );

  const smoothRef = useRef(
    LEG_WAYPOINTS.map(() => ({ active: 0, fill: 0, flowNorm: 0, pressNorm: 0, leak: 0 }))
  );

  const scratchPt = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const smoothLerp = 1 - Math.exp(-8 * dt);

    const maxUpstreamP = Math.max(...pressure, 0);
    let anyActive = false;
    let slot = 0;
    const posAttr = particleGeoRef.current?.attributes.position as
      | THREE.BufferAttribute
      | undefined;
    const posBuf = posAttr ? (posAttr.array as Float32Array) : null;

    for (let legIdx = 0; legIdx < legs.length; legIdx++) {
      const leg = legs[legIdx];
      const f = Math.max(0, flow[legIdx] ?? 0);
      const p = Math.max(0, pressure[legIdx] ?? 0);
      const hasAlert = legAlerts[legIdx];

      const targets = computeLegHydraulicTargets({
        flowLpm: f,
        pressureBar: p,
        pumpOn,
        maxUpstreamPressure: maxUpstreamP,
        pressureBaseline: pressureBaselines?.[legIdx],
      });

      const sm = smoothRef.current[legIdx];
      sm.active = THREE.MathUtils.lerp(sm.active, targets.waterDetected ? 1 : 0, smoothLerp);
      sm.fill = THREE.MathUtils.lerp(sm.fill, targets.targetFill, smoothLerp);
      sm.flowNorm = THREE.MathUtils.lerp(sm.flowNorm, targets.flowNorm, smoothLerp);
      sm.pressNorm = THREE.MathUtils.lerp(sm.pressNorm, targets.pressNorm, smoothLerp);
      sm.leak = THREE.MathUtils.lerp(sm.leak, hasAlert ? 0.85 : 0, smoothLerp);

      phasesRef.current[legIdx] =
        (phasesRef.current[legIdx] + targets.worldSpeed * dt * 2.1) % 1000;

      const mesh = meshRefs.current[legIdx];
      const shaderMat = mesh?.material as THREE.ShaderMaterial | undefined;
      if (shaderMat?.uniforms) {
        shaderMat.uniforms.uPhase.value = phasesRef.current[legIdx];
        shaderMat.uniforms.uFill.value = sm.fill;
        shaderMat.uniforms.uFlowNorm.value = sm.flowNorm;
        shaderMat.uniforms.uPressureNorm.value = sm.pressNorm;
        shaderMat.uniforms.uLeakFactor.value = sm.leak;
        shaderMat.uniforms.uActive.value = sm.active;
      }

      const activeCount =
        f > 0.04
          ? Math.max(3, Math.round(Math.min(f / FLOW_NOMINAL_LPM, 1.25) * PARTICLES_PER_LEG))
          : 0;
      const uSpeed = leg.length > 0 ? targets.worldSpeed / leg.length : 0;

      if (sm.active > 0.02) anyActive = true;

      for (let i = 0; i < PARTICLES_PER_LEG; i++) {
        const base = slot * 3;
        if (i < activeCount) {
          const nextU = (particleURef.current[slot] + uSpeed * dt) % 1;
          particleURef.current[slot] = nextU;
          if (posBuf) {
            leg.curve.getPointAt(nextU, scratchPt.current);
            const spiralAngle = nextU * 38.0 + i * 1.7;
            const wobbleR = 0.018 * Math.min(sm.fill, 1);
            posBuf[base] = scratchPt.current.x + Math.cos(spiralAngle) * wobbleR;
            posBuf[base + 1] = PIPE_CENTER_Y + Math.sin(spiralAngle) * wobbleR;
            posBuf[base + 2] = scratchPt.current.z;
          }
        } else if (posBuf) {
          posBuf[base] = 0;
          posBuf[base + 1] = -99;
          posBuf[base + 2] = 0;
        }
        slot++;
      }
    }

    if (posAttr) {
      posAttr.needsUpdate = true;
    }

    if (particleMatRef.current) {
      particleMatRef.current.opacity = THREE.MathUtils.lerp(
        particleMatRef.current.opacity,
        anyActive ? 0.92 : 0,
        smoothLerp
      );
    }
  });

  return (
    <group renderOrder={1}>
      {legs.map((leg, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            meshRefs.current[idx] = el;
          }}
          geometry={leg.geom}
          material={leg.mat}
          renderOrder={1}
        />
      ))}

      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry ref={particleGeoRef}>
          <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={particleMatRef}
          size={0.042}
          color="#bae6fd"
          transparent
          opacity={0}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
