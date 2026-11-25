"use client";
// src/components/rig/Pipeline3DCanvas.tsx
// 3D GLB pipeline viewer using React Three Fiber + Drei.
// Renders /public/pipeline.glb on a physical testboard with floating telemetry overlays.
// Architecture: 4 zones, 4 junctions × 2 sensors (flow + pressure) = 8 sensors total.
// Live-only mode — no simulation injection.

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Environment,
  Lightformer,
  Html,
  ContactShadows,
  Line,
} from "@react-three/drei";
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
  type OrbitControls as OrbitControlsImpl,
} from "three-stdlib";
import * as THREE from "three";
import type { StationId, ZoneId } from "@/config/rig";
import { STATION_IDS, SENSOR_3D_NODES, ZONES } from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";
import {
  Droplets,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  RotateCcw,
  Compass,
} from "lucide-react";

// ─── WebGL Error Boundary ────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#2D5A7A",
            fontSize: 13,
          }}
        >
          <AlertTriangle style={{ width: 24, height: 24, color: "#d97706" }} />
          <span>Unable to initialize 3D WebGL viewport for pipeline.glb.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── GLB Model (clones scene once so remounts never double-scale) ────────────
function PipelineModel() {
  const { scene } = useGLTF("/pipeline.glb");

  const { clonedScene, scale, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 11 / maxDim;

    return {
      clonedScene: clone,
      scale: s,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene]);

  // Rotate +90 deg around Y so the 4 serpentine legs run left -> right (S1 -> S4)
  return (
    <group rotation={[0, Math.PI / 2, 0]} scale={scale}>
      <primitive object={clonedScene} position={offset} />
    </group>
  );
}

// ─── Physical Test Rig Baseboard (matches plywood + black mat rig table) ─────
function RigBaseboard() {
  return (
    <group position={[0, -0.045, 0]}>
      {/* Black rubber/sheet surface */}
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[11.6, 0.04, 6.9]} />
        <meshStandardMaterial color="#182230" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Natural plywood outer frame */}
      <mesh receiveShadow position={[0, -0.02, 0]}>
        <boxGeometry args={[12.0, 0.05, 7.3]} />
        <meshStandardMaterial color="#d4b483" roughness={0.75} metalness={0.02} />
      </mesh>
    </group>
  );
}

// ─── Hologram Telemetry Theme & Geometry Constants ───────────────────────────
const noRaycast = () => { };

type NodeStatus = "normal" | "alert" | "warning";

const HOLOGRAM_THEMES: Record<
  NodeStatus,
  {
    outerBorder: string;
    innerBorder: string;
    outerBg: string;
    innerBg: string;
    scanline: string;
    glow: string;
    dot: string;
    ringInner: string;
    ringMid: string;
    ringOuter: string;
    ray: string;
    cone: string;
  }
> = {
  normal: {
    outerBorder: "#a5f3fc",
    innerBorder: "#22d3ee",
    outerBg: "rgba(8, 52, 74, 0.36)",
    innerBg: "rgba(3, 28, 46, 0.9)",
    scanline: "rgba(56, 189, 248, 0.09)",
    glow: "rgba(34, 211, 238, 0.55)",
    dot: "#99f6e4",
    ringInner: "#a5f3fc",
    ringMid: "#22d3ee",
    ringOuter: "#0891b2",
    ray: "#67e8f9",
    cone: "#38bdf8",
  },
  warning: {
    outerBorder: "#fde68a",
    innerBorder: "#f59e0b",
    outerBg: "rgba(68, 44, 6, 0.36)",
    innerBg: "rgba(42, 26, 4, 0.9)",
    scanline: "rgba(251, 191, 36, 0.09)",
    glow: "rgba(245, 158, 11, 0.55)",
    dot: "#fef08a",
    ringInner: "#fde68a",
    ringMid: "#fbbf24",
    ringOuter: "#d97706",
    ray: "#fcd34d",
    cone: "#f59e0b",
  },
  alert: {
    outerBorder: "#fecaca",
    innerBorder: "#f87171",
    outerBg: "rgba(74, 10, 14, 0.42)",
    innerBg: "rgba(48, 7, 12, 0.92)",
    scanline: "rgba(248, 113, 113, 0.11)",
    glow: "rgba(239, 68, 68, 0.65)",
    dot: "#fca5a5",
    ringInner: "#fecaca",
    ringMid: "#f87171",
    ringOuter: "#dc2626",
    ray: "#fca5a5",
    cone: "#ef4444",
  },
};

const HOLO_RAY_COUNT = 13;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

interface HoloSyncMetrics {
  fontPx: number;
  cardW: number;
  cardH: number;
}

interface HologramProjectionProps {
  stationId: StationId;
  zoneId: ZoneId;
  anchorPos: [number, number, number];
  flow: number | null;
  pressure: number | null;
  status: NodeStatus;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Syncs card 3D lift position + crisp CSS font-size BEFORE <Html> runs its useFrame,
 * ensuring zero 1-frame lag and pixel-accurate typography at every zoom/resize.
 */
function HoloCardPlacement({
  anchorPos,
  cardGroupRef,
  cardRootRef,
  metricsRef,
  pulseRingRef,
}: {
  anchorPos: [number, number, number];
  cardGroupRef: React.RefObject<THREE.Group | null>;
  cardRootRef: React.RefObject<HTMLDivElement | null>;
  metricsRef: React.RefObject<HoloSyncMetrics>;
  pulseRingRef: React.RefObject<THREE.Mesh | null>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const scratchRef = useRef({
    anchorVec: new THREE.Vector3(),
    camUp: new THREE.Vector3(),
    liftDir: new THREE.Vector3(),
  });

  const updatePlacement = useCallback(
    (cam: THREE.Camera, vp: { width: number; height: number }, elapsed: number) => {
      const s = scratchRef.current;
      const [ax, ay, az] = anchorPos;
      s.anchorVec.set(ax, ay, az);
      const dist = Math.max(2.0, cam.position.distanceTo(s.anchorVec));
      const fovDeg = cam instanceof THREE.PerspectiveCamera ? cam.fov : 40;
      const vFOV = (fovDeg * Math.PI) / 180;
      const pxPerWorld = Math.max(
        1,
        vp.height / (2 * Math.tan(vFOV / 2) * dist)
      );

      // Proportional screen width (~2.95 world units at mid-zoom), clamped crisp for min/max zoom & resize
      const maxCardW = Math.min(310, Math.max(168, vp.width * 0.42));
      const targetCardW = THREE.MathUtils.clamp(
        2.95 * pxPerWorld,
        152,
        maxCardW
      );
      const fontPx = targetCardW / 12.5;
      metricsRef.current.fontPx = fontPx;

      const rootEl = cardRootRef.current;
      if (rootEl) {
        const appliedPrev = Number.parseFloat(rootEl.style.fontSize) || 0;
        if (Math.abs(appliedPrev - fontPx) > 0.04) {
          rootEl.style.fontSize = `${fontPx.toFixed(2)}px`;
        }
      }

      const cardW =
        rootEl && rootEl.offsetWidth > 0 ? rootEl.offsetWidth : targetCardW;
      const cardH =
        rootEl && rootEl.offsetHeight > 0
          ? rootEl.offsetHeight
          : targetCardW * 0.57;
      metricsRef.current.cardW = cardW;
      metricsRef.current.cardH = cardH;

      // Keep the visible fan gap proportional to the card width on screen
      const fanGapPx = cardW * 0.25;
      const centerOffsetPx = cardH * 0.5 + fanGapPx;

      s.camUp.set(0, 1, 0).applyQuaternion(cam.quaternion).normalize();
      s.liftDir
        .copy(WORLD_UP)
        .multiplyScalar(0.68)
        .addScaledVector(s.camUp, 0.32)
        .normalize();

      const screenUpProj = Math.max(0.35, s.liftDir.dot(s.camUp));
      const liftDist = centerOffsetPx / (pxPerWorld * screenUpProj);
      const bobWorld = (Math.sin(elapsed * 2.2) * 3.0) / pxPerWorld;

      if (cardGroupRef.current) {
        cardGroupRef.current.position
          .copy(s.liftDir)
          .multiplyScalar(liftDist)
          .addScaledVector(s.camUp, bobWorld);
      }

      if (pulseRingRef.current) {
        const pulse = 1 + Math.sin(elapsed * 3.0) * 0.06;
        pulseRingRef.current.scale.set(pulse, pulse, 1);
      }
    },
    [anchorPos, cardGroupRef, cardRootRef, metricsRef, pulseRingRef]
  );

  useLayoutEffect(() => {
    updatePlacement(camera, size, 0);
  }, [updatePlacement, camera, size]);

  useFrame(({ camera: activeCamera, size: activeSize, clock }) => {
    updatePlacement(activeCamera, activeSize, clock.elapsedTime);
  });

  return null;
}

/**
 * Unprojects the card's exact rendered bottom bezel back into 3D space AFTER <Html>
 * has updated, locking all 13 rays and the translucent beam cone onto the card width/edge.
 */
function HoloBeamAndRays({
  anchorPos,
  cardGroupRef,
  cardRootRef,
  metricsRef,
  rayColor,
  coneColor,
}: {
  anchorPos: [number, number, number];
  cardGroupRef: React.RefObject<THREE.Group | null>;
  cardRootRef: React.RefObject<HTMLDivElement | null>;
  metricsRef: React.RefObject<HoloSyncMetrics>;
  rayColor: string;
  coneColor: string;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const coneRef = useRef<THREE.Mesh | null>(null);

  const rayPositionsRef = useRef<Float32Array>(
    new Float32Array(HOLO_RAY_COUNT * 6)
  );

  const [rayObject] = useState(() => {
    const geom = new LineSegmentsGeometry();
    geom.setPositions(new Float32Array(HOLO_RAY_COUNT * 6));
    const mat = new LineMaterial({
      color: 0x67e8f9,
      linewidth: 1.65,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const mesh = new LineSegments2(geom, mat);
    mesh.frustumCulled = false;
    mesh.raycast = noRaycast;
    return { geom, mat, mesh };
  });

  useEffect(() => {
    rayObject.mat.color.set(rayColor);
  }, [rayColor, rayObject]);

  useEffect(() => {
    return () => {
      rayObject.geom.dispose();
      rayObject.mat.dispose();
    };
  }, [rayObject]);

  const scratchRef = useRef({
    anchorVec: new THREE.Vector3(),
    cardWorldCenter: new THREE.Vector3(),
    ndcCenter: new THREE.Vector3(),
    targetLocal: new THREE.Vector3(),
    emitterLocal: new THREE.Vector3(0, 0.015, 0),
    coneTopLocal: new THREE.Vector3(),
    coneDir: new THREE.Vector3(),
    coneMid: new THREE.Vector3(),
    upVec: new THREE.Vector3(0, 1, 0),
  });

  const syncGeometry = useCallback(
    (cam: THREE.Camera, vp: { width: number; height: number }) => {
      const cardGroup = cardGroupRef.current;
      if (!cardGroup || vp.width <= 0 || vp.height <= 0) return;

      const s = scratchRef.current;
      const positions = rayPositionsRef.current;
      rayObject.mat.resolution.set(vp.width, vp.height);

      const [ax, ay, az] = anchorPos;
      s.anchorVec.set(ax, ay, az);

      cardGroup.updateWorldMatrix(true, false);
      s.cardWorldCenter.setFromMatrixPosition(cardGroup.matrixWorld);
      s.ndcCenter.copy(s.cardWorldCenter).project(cam);

      const cx = (s.ndcCenter.x * 0.5 + 0.5) * vp.width;
      const cy = (-s.ndcCenter.y * 0.5 + 0.5) * vp.height;

      const rootEl = cardRootRef.current;
      const fontPx = metricsRef.current.fontPx;
      const cardW =
        rootEl && rootEl.offsetWidth > 0
          ? rootEl.offsetWidth
          : metricsRef.current.cardW;
      const cardH =
        rootEl && rootEl.offsetHeight > 0
          ? rootEl.offsetHeight
          : metricsRef.current.cardH;

      const halfW = cardW * 0.5;
      const halfH = cardH * 0.5;
      // Rays span strictly inside the outer rounded corners along the flat bottom outer bezel
      const cornerInsetPx = fontPx * 0.85;
      const halfSpanPx = Math.max(8, halfW - cornerInsetPx);
      const bezelTuckPx = Math.max(1.0, fontPx * 0.08);
      const targetScreenY = cy + halfH - bezelTuckPx;

      for (let i = 0; i < HOLO_RAY_COUNT; i++) {
        const u = (i / (HOLO_RAY_COUNT - 1)) * 2 - 1;
        const sx = cx + u * halfSpanPx;
        const ndcX = (sx / vp.width) * 2 - 1;
        const ndcY = -(targetScreenY / vp.height) * 2 + 1;

        s.targetLocal
          .set(ndcX, ndcY, s.ndcCenter.z)
          .unproject(cam)
          .sub(s.anchorVec);

        const baseIdx = i * 6;
        positions[baseIdx] = s.emitterLocal.x;
        positions[baseIdx + 1] = s.emitterLocal.y;
        positions[baseIdx + 2] = s.emitterLocal.z;
        positions[baseIdx + 3] = s.targetLocal.x;
        positions[baseIdx + 4] = s.targetLocal.y;
        positions[baseIdx + 5] = s.targetLocal.z;
      }

      rayObject.geom.setPositions(positions);

      if (coneRef.current) {
        const ndcCx = (cx / vp.width) * 2 - 1;
        const ndcCy = -(targetScreenY / vp.height) * 2 + 1;
        s.coneTopLocal
          .set(ndcCx, ndcCy, s.ndcCenter.z)
          .unproject(cam)
          .sub(s.anchorVec);

        s.coneDir.subVectors(s.coneTopLocal, s.emitterLocal);
        const coneLen = Math.max(0.05, s.coneDir.length());
        s.coneMid
          .addVectors(s.emitterLocal, s.coneTopLocal)
          .multiplyScalar(0.5);

        const dist = Math.max(2.0, cam.position.distanceTo(s.anchorVec));
        const fovDeg = cam instanceof THREE.PerspectiveCamera ? cam.fov : 40;
        const pxPerWorld = Math.max(
          1,
          vp.height / (2 * Math.tan((fovDeg * Math.PI) / 360) * dist)
        );
        const cardWorldW = cardW / pxPerWorld;
        const coneRadiusScale = THREE.MathUtils.clamp(
          cardWorldW * 0.42,
          0.78,
          1.35
        );

        coneRef.current.position.copy(s.coneMid);
        coneRef.current.quaternion.setFromUnitVectors(
          s.upVec,
          s.coneDir.normalize()
        );
        coneRef.current.scale.set(coneRadiusScale, coneLen, coneRadiusScale);
      }
    },
    [anchorPos, cardGroupRef, cardRootRef, metricsRef, rayObject]
  );

  useLayoutEffect(() => {
    syncGeometry(camera, size);
  }, [syncGeometry, camera, size]);

  useFrame(({ camera: activeCamera, size: activeSize }) => {
    syncGeometry(activeCamera, activeSize);
  });

  return (
    <>
      <primitive object={rayObject.mesh} />
      <mesh ref={coneRef} frustumCulled={false} raycast={noRaycast}>
        <cylinderGeometry args={[0.135, 0.052, 1, 28, 1, true]} />
        <meshBasicMaterial
          color={coneColor}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function HologramProjection({
  stationId,
  zoneId,
  anchorPos,
  flow,
  pressure,
  status,
  isSelected,
  onClick,
}: HologramProjectionProps) {
  const cardGroupRef = useRef<THREE.Group | null>(null);
  const cardRootRef = useRef<HTMLDivElement | null>(null);
  const pulseRingRef = useRef<THREE.Mesh | null>(null);
  const metricsRef = useRef<HoloSyncMetrics>({
    fontPx: 14.8,
    cardW: 185,
    cardH: 105,
  });
  const theme = HOLOGRAM_THEMES[status];

  const handleCardMount = useCallback((el: HTMLDivElement | null) => {
    cardRootRef.current = el;
    if (el) {
      el.style.fontSize = `${metricsRef.current.fontPx.toFixed(2)}px`;
    }
  }, []);

  return (
    <group position={anchorPos}>
      {/* Concentric glowing holographic emitter rings seated flush on pipe crown */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[0.048, 32]} />
        <meshBasicMaterial
          color={theme.ringInner}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} raycast={noRaycast}>
        <ringGeometry args={[0.082, 0.098, 48]} />
        <meshBasicMaterial
          color={theme.ringInner}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} raycast={noRaycast}>
        <ringGeometry args={[0.132, 0.148, 48]} />
        <meshBasicMaterial
          color={theme.ringMid}
          transparent
          opacity={0.76}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={pulseRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.004, 0]}
        raycast={noRaycast}
      >
        <ringGeometry args={[0.182, 0.198, 56]} />
        <meshBasicMaterial
          color={theme.ringOuter}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        raycast={noRaycast}
      >
        <ringGeometry args={[0.04, 0.056, 32]} />
        <meshBasicMaterial
          color={theme.ringInner}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sibling 1: Updates card 3D lift + native CSS fontSize before <Html> computes projection */}
      <HoloCardPlacement
        anchorPos={anchorPos}
        cardGroupRef={cardGroupRef}
        cardRootRef={cardRootRef}
        metricsRef={metricsRef}
        pulseRingRef={pulseRingRef}
      />

      {/* Sibling 2: Native crisp vector HTML card (never CSS3D-skewed or upscaled) */}
      <group ref={cardGroupRef}>
        <Html
          center
          position={[0, 0, 0]}
          pointerEvents={isSelected ? "auto" : "none"}
          zIndexRange={[100, 0]}
        >
          <div
            ref={handleCardMount}
            onClick={isSelected ? onClick : undefined}
            style={{
              width: "12.5em",
              boxSizing: "border-box",
              padding: "0.25em",
              borderRadius: "1em",
              border: `0.16em solid ${theme.outerBorder}`,
              background: theme.outerBg,
              boxShadow: isSelected
                ? `0 0 1.4em ${theme.glow}, inset 0 0 0.7em ${theme.glow}`
                : `0 0 1em ${theme.glow}, inset 0 0 0.5em ${theme.glow}`,
              cursor: isSelected ? "pointer" : "default",
              userSelect: "none",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "optimizeLegibility",
              lineHeight: 1.25,
            }}
          >
            <div
              style={{
                borderRadius: "0.72em",
                padding: "0.56em 0.76em",
                border: `0.1em solid ${theme.innerBorder}`,
                backgroundColor: theme.innerBg,
                backgroundImage: `repeating-linear-gradient(0deg, ${theme.scanline} 0px, ${theme.scanline} 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, ${theme.scanline} 0px, ${theme.scanline} 1px, transparent 1px, transparent 9px)`,
                boxShadow: `inset 0 0 1.1em ${theme.glow}40`,
                overflow: "hidden",
              }}
            >
              {/* Station header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.4em",
                  marginBottom: "0.52em",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.45em" }}>
                  <span
                    style={{
                      width: "0.56em",
                      height: "0.56em",
                      borderRadius: "50%",
                      background: theme.dot,
                      boxShadow: `0 0 0.5em ${theme.glow}`,
                      display: "inline-block",
                      animation: status !== "normal" ? "pulse 1.2s infinite" : undefined,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.88em",
                      fontWeight: 700,
                      color: "#e6f9ff",
                      letterSpacing: "0.02em",
                      textShadow: `0 0 6px ${theme.glow}`,
                    }}
                  >
                    {stationId} · Z{zoneId}
                  </span>
                </div>
                {status === "alert" ? (
                  <AlertTriangle
                    style={{
                      width: "0.95em",
                      height: "0.95em",
                      color: "#f87171",
                      filter: "drop-shadow(0 0 3px rgba(248,113,113,0.7))",
                    }}
                  />
                ) : (
                  <CheckCircle2
                    style={{
                      width: "0.95em",
                      height: "0.95em",
                      color: "#6ee7b7",
                      filter: "drop-shadow(0 0 3px rgba(110,231,183,0.6))",
                    }}
                  />
                )}
              </div>

              {/* Flow reading */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.4em",
                  marginBottom: "0.34em",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35em",
                    fontSize: "0.75em",
                    fontWeight: 600,
                    color: "#bae6fd",
                  }}
                >
                  <Droplets style={{ width: "0.9em", height: "0.9em", color: "#67e8f9" }} />
                  Flow
                </span>
                <span
                  style={{
                    fontSize: "0.82em",
                    fontWeight: 700,
                    color: "#7dd3fc",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 0 6px rgba(125,211,252,0.4)",
                  }}
                >
                  {flow != null ? `${flow.toFixed(1)} L/m` : "--"}
                </span>
              </div>

              {/* Pressure reading */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.4em",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35em",
                    fontSize: "0.75em",
                    fontWeight: 600,
                    color: "#bae6fd",
                  }}
                >
                  <Gauge style={{ width: "0.9em", height: "0.9em", color: "#d8b4fe" }} />
                  Press
                </span>
                <span
                  style={{
                    fontSize: "0.82em",
                    fontWeight: 700,
                    color: "#d8b4fe",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 0 6px rgba(216,180,254,0.4)",
                  }}
                >
                  {pressure != null ? `${pressure.toFixed(2)} bar` : "--"}
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* Sibling 3: Locks 13 rays & translucent cone onto the card's exact screen bottom edge */}
      <HoloBeamAndRays
        anchorPos={anchorPos}
        cardGroupRef={cardGroupRef}
        cardRootRef={cardRootRef}
        metricsRef={metricsRef}
        rayColor={theme.ray}
        coneColor={theme.cone}
      />
    </group>
  );
}

// ─── Sensor 3D Beacon + Hologram Projection Trigger ──────────────────────────
interface SensorOverlayProps {
  stationId: StationId;
  flow: number | null;
  pressure: number | null;
  status: NodeStatus;
  isHovered: boolean;
  isSelected: boolean;
  onHoverChange: (hovered: boolean) => void;
  onClick: () => void;
}

function SensorNodeOverlay({
  stationId,
  flow,
  pressure,
  status,
  isHovered,
  isSelected,
  onHoverChange,
  onClick,
}: SensorOverlayProps) {
  const node = SENSOR_3D_NODES[stationId];
  const [lx, , lz] = node.labelPos;
  const [fx, fy, fz] = node.flowPos;
  const [px, py, pz] = node.pressurePos;
  const showHologram = isHovered || isSelected;

  const { flowTracePts, pressureTracePts } = useMemo(() => {
    const approachZ = fz + Math.sign(lz - fz) * 0.14;
    return {
      flowTracePts: [
        [lx, 0.273, lz] as [number, number, number],
        [node.pipeX, 0.273, approachZ] as [number, number, number],
        [fx, fy, fz] as [number, number, number],
      ],
      pressureTracePts: [
        [lx, 0.273, lz] as [number, number, number],
        [node.pipeX, 0.273, pz] as [number, number, number],
        [px, py, pz] as [number, number, number],
      ],
    };
  }, [lx, lz, node.pipeX, fx, fy, fz, px, py, pz]);

  return (
    <group>
      {/* Hit volume spanning this station's pipe leg + flow sensor + T-branch pressure sensor */}
      <mesh
        position={[node.pipeX + 0.36, 0.25, lz]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 5) return;
          onClick();
        }}
      >
        <boxGeometry args={[1.65, 0.85, 2.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Flow sensor physical location marker centered on white turbine cap (cyan) */}
      <mesh position={node.flowPos} scale={showHologram ? 1.25 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.056, 16, 16]} />
        <meshStandardMaterial
          color="#019FD7"
          emissive="#019FD7"
          emissiveIntensity={showHologram ? 1.4 : 0.7}
        />
      </mesh>

      {/* Pressure transducer physical location marker centered on black body (violet) */}
      <mesh position={node.pressurePos} scale={showHologram ? 1.25 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.056, 16, 16]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#7c3aed"
          emissiveIntensity={showHologram ? 1.4 : 0.7}
        />
      </mesh>

      {/* Direct pipe-crown pointer traces & sensor reticles linking hologram hub to exact sensors */}
      {showHologram && (
        <>
          <Line
            points={flowTracePts}
            color="#38bdf8"
            lineWidth={2}
            transparent
            opacity={0.85}
            raycast={noRaycast}
          />
          <Line
            points={pressureTracePts}
            color="#c084fc"
            lineWidth={2}
            transparent
            opacity={0.85}
            raycast={noRaycast}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[fx, 0.392, fz]} raycast={noRaycast}>
            <ringGeometry args={[0.08, 0.105, 32]} />
            <meshBasicMaterial
              color="#67e8f9"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.264, pz]} raycast={noRaycast}>
            <ringGeometry args={[0.08, 0.105, 32]} />
            <meshBasicMaterial
              color="#d8b4fe"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* Alert ring flush on testboard mat around leaking pipe leg */}
      {status === "alert" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.048, lz]} raycast={noRaycast}>
          <ringGeometry args={[0.42, 0.56, 32]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.65} />
        </mesh>
      )}

      {/* 3D Hologram projector emitter flush on pipe crown + synced rays/beam + HUD card */}
      {showHologram && (
        <HologramProjection
          stationId={stationId}
          zoneId={node.zoneId}
          anchorPos={[lx, 0.27, lz]}
          flow={flow}
          pressure={pressure}
          status={status}
          isSelected={isSelected}
          onClick={onClick}
        />
      )}
    </group>
  );
}

// ─── Zone alert banner ───────────────────────────────────────────────────────
interface ZoneAlertBannerProps {
  zoneId: ZoneId;
  leakRate: number;
  si: number;
}

function ZoneAlertBanner({ zoneId, leakRate, si }: ZoneAlertBannerProps) {
  const zone = ZONES.find((z) => z.id === zoneId);
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1.5px solid #fecaca",
        borderRadius: "10px",
        padding: "7px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 2px 8px rgba(220,38,38,0.15)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#dc2626",
          display: "inline-block",
          animation: "pulse 1s infinite",
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c" }}>
        ZONE {zoneId} LEAK DETECTED
      </span>
      <span style={{ fontSize: 10, color: "#7f1d1d", fontVariantNumeric: "tabular-nums" }}>
        Rate: {leakRate.toFixed(1)} L/min · SI: {si.toFixed(1)}%
      </span>
      {zone && (
        <span style={{ fontSize: 10, color: "#ef4444" }}>
          {zone.stationA} → {zone.stationB}
        </span>
      )}
    </div>
  );
}

// ─── Smooth Camera Focus & Preset Controller ─────────────────────────────────
type CameraPresetMode = "overview" | "top";

const OVERVIEW_CAM_POS: [number, number, number] = [0, 6.6, 8.0];
const OVERVIEW_TARGET: [number, number, number] = [0, 0.25, 0];
const TOP_CAM_POS: [number, number, number] = [0, 10.6, 0.8];
const TOP_TARGET: [number, number, number] = [0, 0.2, 0];

function CameraRigController({
  controlsRef,
  glideActiveRef,
  focusStation,
  presetMode,
  presetNonce,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  glideActiveRef: React.RefObject<boolean>;
  focusStation: StationId | null;
  presetMode: CameraPresetMode;
  presetNonce: number;
}) {
  const animStateRef = useRef({
    hasInitialized: false,
    goalPos: new THREE.Vector3(...OVERVIEW_CAM_POS),
    goalTarget: new THREE.Vector3(...OVERVIEW_TARGET),
  });

  useEffect(() => {
    const state = animStateRef.current;
    if (!state.hasInitialized) {
      state.hasInitialized = true;
      if (!focusStation && presetNonce === 0) return;
    }

    if (focusStation) {
      const node = SENSOR_3D_NODES[focusStation];
      const [, , lz] = node.labelPos;
      const lookX = node.pipeX + 0.28;
      state.goalTarget.set(lookX, 0.55, lz);
      state.goalPos.set(lookX + 0.75, 2.35, lz + 3.15);
    } else if (presetMode === "top") {
      state.goalTarget.set(...TOP_TARGET);
      state.goalPos.set(...TOP_CAM_POS);
    } else {
      state.goalTarget.set(...OVERVIEW_TARGET);
      state.goalPos.set(...OVERVIEW_CAM_POS);
    }
    glideActiveRef.current = true;
  }, [focusStation, presetMode, presetNonce, glideActiveRef]);

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!glideActiveRef.current || !ctrl) return;

    const { goalPos, goalTarget } = animStateRef.current;
    const alpha = 1 - Math.exp(-5.8 * Math.min(delta, 0.05));
    ctrl.object.position.lerp(goalPos, alpha);
    ctrl.target.lerp(goalTarget, alpha);
    ctrl.update();

    if (
      ctrl.object.position.distanceTo(goalPos) < 0.025 &&
      ctrl.target.distanceTo(goalTarget) < 0.025
    ) {
      ctrl.object.position.copy(goalPos);
      ctrl.target.copy(goalTarget);
      ctrl.update();
      glideActiveRef.current = false;
    }
  });

  return null;
}

// ─── Main exported component ─────────────────────────────────────────────────
interface Pipeline3DCanvasProps {
  selectedStationId?: StationId | null;
  selectedZoneId?: ZoneId | null;
  onSelectStation?: (id: StationId | null) => void;
}

const emptySubscribe = () => () => { };
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function Pipeline3DCanvas({
  selectedStationId,
  selectedZoneId,
  onSelectStation,
}: Pipeline3DCanvasProps) {
  const mounted = useIsClient();
  const [hoveredStation, setHoveredStation] = useState<StationId | null>(null);
  const [localPinnedStation, setLocalPinnedStation] = useState<StationId | null>(null);
  const [presetMode, setPresetMode] = useState<CameraPresetMode>("overview");
  const [presetNonce, setPresetNonce] = useState(0);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const glideActiveRef = useRef(false);
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active");

  const activeStation =
    selectedStationId !== undefined ? selectedStationId : localPinnedStation;
  const focusStation: StationId | null =
    activeStation ??
    (selectedZoneId != null ? (`S${selectedZoneId}` as StationId) : null);

  const selectOrToggleStation = (sid: StationId) => {
    const next = activeStation === sid ? null : sid;
    if (selectedStationId === undefined) {
      setLocalPinnedStation(next);
    }
    if (next === null) {
      setPresetMode("overview");
    }
    onSelectStation?.(next);
  };

  const clearPinnedStation = () => {
    if (selectedStationId === undefined) {
      setLocalPinnedStation(null);
    }
    onSelectStation?.(null);
  };

  const hasLiveReadings = stations.some(
    (s) => s.latestFlow != null || s.latestPressure != null
  );

  const handleResetView = () => {
    clearPinnedStation();
    setPresetMode("overview");
    setPresetNonce((n) => n + 1);
  };

  const handleTopView = () => {
    clearPinnedStation();
    setPresetMode((prev) => (prev === "top" ? "overview" : "top"));
    setPresetNonce((n) => n + 1);
  };

  const stopCameraGlide = useCallback(() => {
    glideActiveRef.current = false;
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: "100%",
          height: 520,
          background: "linear-gradient(135deg, #EEF6FA 0%, #F4FAFD 100%)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #019FD7",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 12, color: "#2D5A7A", fontWeight: 500 }}>
          Loading 3D Pipeline Model…
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 520,
        borderRadius: 16,
        overflow: "hidden",
        cursor: hoveredStation ? "pointer" : "grab",
        background:
          "linear-gradient(160deg, #EEF6FA 0%, #DFF5FF 55%, #F4FAFD 100%)",
      }}
    >
      {/* Top-left quick station focus bar + active alert banners */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid #C8E5F2",
            borderRadius: 20,
            padding: "3px 4px",
            boxShadow: "0 2px 8px rgba(0,118,160,0.08)",
          }}
        >
          <button
            type="button"
            onClick={handleResetView}
            style={{
              background: focusStation === null && presetMode === "overview" ? "#0076A0" : "transparent",
              color: focusStation === null && presetMode === "overview" ? "#ffffff" : "#2D5A7A",
              border: "none",
              borderRadius: 16,
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Overview
          </button>
          {STATION_IDS.map((sid) => {
            const isActiveFocus = focusStation === sid;
            return (
              <button
                key={sid}
                type="button"
                onClick={() => selectOrToggleStation(sid)}
                style={{
                  background: isActiveFocus ? "#0076A0" : "transparent",
                  color: isActiveFocus ? "#ffffff" : "#2D5A7A",
                  border: "none",
                  borderRadius: 16,
                  padding: "3px 9px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title={`Zoom camera smoothly to ${sid}`}
              >
                {sid}
              </button>
            );
          })}
        </div>

        {activeAlerts.slice(0, 2).map((alert) => (
          <ZoneAlertBanner
            key={alert.id}
            zoneId={(alert.zoneId ?? 1) as ZoneId}
            leakRate={alert.leakRate ?? 0}
            si={alert.si ?? 0}
          />
        ))}
      </div>

      {/* Top-right Top View + Reset camera + ESP32 status */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handleTopView}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: presetMode === "top" && !focusStation ? "#0076A0" : "rgba(255,255,255,0.9)",
            border: "1px solid #C8E5F2",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: presetMode === "top" && !focusStation ? "#ffffff" : "#0076A0",
            cursor: "pointer",
          }}
          title="Switch between overhead top-down and 3D perspective"
        >
          <Compass style={{ width: 11, height: 11 }} />
          Top View
        </button>

        <button
          type="button"
          onClick={handleResetView}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #C8E5F2",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "#0076A0",
            cursor: "pointer",
          }}
          title="Reset 3D camera angle"
        >
          <RotateCcw style={{ width: 11, height: 11 }} />
          Reset View
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: hasLiveReadings ? "#F3FFD1" : "#F4FAFD",
            border: `1px solid ${hasLiveReadings ? "#A6CE38" : "#C8E5F2"}`,
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: hasLiveReadings ? "#4a7a00" : "#2D5A7A",
          }}
        >
          <Wifi style={{ width: 10, height: 10 }} />
          <span
            style={{
              width: 6,
              height: 6,
              background: hasLiveReadings ? "#A6CE38" : "#019FD7",
              borderRadius: "50%",
              display: "inline-block",
              animation: "pulse 1.5s infinite",
            }}
          />
          {hasLiveReadings ? "LIVE ESP32" : "ESP32 READY"}
        </div>
      </div>

      <CanvasErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 3]}
          camera={{ position: OVERVIEW_CAM_POS, fov: 40, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onPointerMissed={clearPinnedStation}
        >
          {/* Bright studio lighting */}
          <ambientLight intensity={1.1} color="#f0f8ff" />
          <directionalLight
            position={[6, 12, 6]}
            intensity={2.1}
            castShadow
            shadow-mapSize={[2048, 2048]}
            color="#ffffff"
          />
          <directionalLight position={[-6, 8, -4]} intensity={0.85} color="#e0f2fe" />
          <pointLight position={[0, 6, 0]} intensity={0.9} color="#DFF5FF" />

          {/* Procedural local environment reflections (no external HDR network calls) */}
          <Environment resolution={256} frames={1}>
            <Lightformer
              form="rect"
              intensity={2}
              position={[0, 8, 2]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[14, 8, 1]}
              color="#ffffff"
            />
            <Lightformer
              form="rect"
              intensity={1.2}
              position={[-6, 4, -4]}
              rotation={[0, Math.PI / 3, 0]}
              scale={[8, 4, 1]}
              color="#bae6fd"
            />
          </Environment>

          {/* Soft ground contact shadows */}
          <ContactShadows
            position={[0, -0.075, 0]}
            opacity={0.28}
            scale={22}
            blur={2.2}
            far={4}
            color="#0076A0"
          />

          {/* Outer floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
            <planeGeometry args={[48, 48]} />
            <meshStandardMaterial color="#EEF6FA" roughness={1} />
          </mesh>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan
            enableZoom
            enableRotate
            enableDamping
            dampingFactor={0.08}
            minDistance={2.2}
            maxDistance={22}
            minPolarAngle={0.18}
            maxPolarAngle={Math.PI / 2.15}
            target={OVERVIEW_TARGET}
            onStart={stopCameraGlide}
          />

          <CameraRigController
            controlsRef={controlsRef}
            glideActiveRef={glideActiveRef}
            focusStation={focusStation}
            presetMode={presetMode}
            presetNonce={presetNonce}
          />

          <RigBaseboard />

          {/* GLB Model & Live Sensor Overlays */}
          <Suspense
            fallback={
              <Html center>
                <div
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid #C8E5F2",
                    borderRadius: 12,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "#0076A0",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Loading /pipeline.glb…
                </div>
              </Html>
            }
          >
            <PipelineModel />

            {STATION_IDS.map((sid) => {
              const stationData = stations.find((s) => s.id === sid);
              const stationAlert = activeAlerts.find((a) => a.stationId === sid);
              const nodeZoneId = SENSOR_3D_NODES[sid].zoneId;
              const zone = ZONES.find((z) => z.id === nodeZoneId);
              const zoneAlert = zone
                ? activeAlerts.find((a) => a.zoneId === zone.id)
                : undefined;
              const hasAlert = !!(stationAlert || zoneAlert);
              const isZoneHighlighted =
                selectedZoneId != null && nodeZoneId === selectedZoneId;

              return (
                <SensorNodeOverlay
                  key={sid}
                  stationId={sid}
                  flow={stationData?.latestFlow ?? null}
                  pressure={stationData?.latestPressure ?? null}
                  status={hasAlert ? "alert" : "normal"}
                  isHovered={hoveredStation === sid}
                  isSelected={activeStation === sid || isZoneHighlighted}
                  onHoverChange={(hovered) =>
                    setHoveredStation((prev) =>
                      hovered ? sid : prev === sid ? null : prev
                    )
                  }
                  onClick={() => selectOrToggleStation(sid)}
                />
              );
            })}
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      {/* Camera hint + sensor color key */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "#2D5A7A",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255,255,255,0.88)",
          borderRadius: 20,
          padding: "5px 14px",
          backdropFilter: "blur(8px)",
          border: "1px solid #C8E5F2",
          whiteSpace: "nowrap",
        }}
      >
        <span>Drag to orbit</span>
        <span>· Scroll to zoom</span>
        <span>· Click S1–S4 or any pipe leg to focus</span>
      </div>
    </div>
  );
}

// Client-only preload to prevent SSR relative fetch errors
if (typeof window !== "undefined") {
  useGLTF.preload("/pipeline.glb");
}
