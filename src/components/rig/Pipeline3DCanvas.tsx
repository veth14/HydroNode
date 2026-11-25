"use client";
// src/components/rig/Pipeline3DCanvas.tsx
// 3D GLB pipeline viewer using React Three Fiber + Drei.
// Renders /public/pipeline.glb on a physical testboard with floating telemetry overlays.
// Architecture: 4 zones, 4 junctions × 2 sensors (flow + pressure) = 8 sensors total.
// Live-only mode — no simulation injection.

import {
  Component,
  Suspense,
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
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
const noRaycast = () => {};

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

// 13 rays fanning from emitter base center (0, 0.02, 0) up to hologram bezel bottom (y = 0.50)
const HOLO_RAY_X_STEPS = [-0.82, -0.68, -0.54, -0.4, -0.26, -0.13, 0, 0.13, 0.26, 0.4, 0.54, 0.68, 0.82];
const HOLO_RAY_SEGMENTS: Array<[[number, number, number], [number, number, number]]> =
  HOLO_RAY_X_STEPS.map((tx) => [
    [0, 0.02, 0],
    [tx, 0.5, -0.015],
  ]);

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
  const holoGroupRef = useRef<THREE.Group | null>(null);
  const pulseRingRef = useRef<THREE.Mesh | null>(null);
  const camera = useThree((s) => s.camera);
  const theme = HOLOGRAM_THEMES[status];
  const [ax, , az] = anchorPos;

  useLayoutEffect(() => {
    if (holoGroupRef.current) {
      holoGroupRef.current.rotation.y = Math.atan2(
        camera.position.x - ax,
        camera.position.z - az
      );
    }
  }, [camera, ax, az]);

  useFrame(({ camera: activeCamera, clock }) => {
    const t = clock.elapsedTime;
    if (holoGroupRef.current) {
      holoGroupRef.current.rotation.y = Math.atan2(
        activeCamera.position.x - ax,
        activeCamera.position.z - az
      );
      holoGroupRef.current.position.y = Math.sin(t * 2.2) * 0.025;
    }
    if (pulseRingRef.current) {
      const pulse = 1 + Math.sin(t * 3.0) * 0.06;
      pulseRingRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group position={anchorPos}>
      {/* Concentric glowing holographic emitter rings on pipe crown */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[0.085, 32]} />
        <meshBasicMaterial
          color={theme.ringInner}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} raycast={noRaycast}>
        <ringGeometry args={[0.145, 0.168, 48]} />
        <meshBasicMaterial
          color={theme.ringInner}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} raycast={noRaycast}>
        <ringGeometry args={[0.245, 0.268, 48]} />
        <meshBasicMaterial
          color={theme.ringMid}
          transparent
          opacity={0.72}
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
        <ringGeometry args={[0.355, 0.376, 56]} />
        <meshBasicMaterial
          color={theme.ringOuter}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Camera-azimuth-aligned fan rays, glowing cone column, and double-bezel HUD card */}
      <group ref={holoGroupRef}>
        {HOLO_RAY_SEGMENTS.map((pts, idx) => (
          <Line
            key={idx}
            points={pts}
            color={theme.ray}
            lineWidth={1.6}
            transparent
            opacity={0.62}
          />
        ))}

        {/* Central translucent hologram projection beam cone */}
        <mesh position={[0, 0.28, 0.015]} raycast={noRaycast}>
          <cylinderGeometry args={[0.145, 0.068, 0.54, 28, 1, true]} />
          <meshBasicMaterial
            color={theme.cone}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.545, 0.015]}
          raycast={noRaycast}
        >
          <ringGeometry args={[0.132, 0.15, 32]} />
          <meshBasicMaterial
            color={theme.ringInner}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.012, 0.015]}
          raycast={noRaycast}
        >
          <ringGeometry args={[0.056, 0.075, 32]} />
          <meshBasicMaterial
            color={theme.ringInner}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* 3D perspective CSS3D hologram panel locked onto the fan top edge */}
        <Html
          transform
          center
          distanceFactor={4}
          position={[0, 1.04, 0]}
          pointerEvents={isSelected ? "auto" : "none"}
          zIndexRange={[100, 0]}
        >
          <div
            onClick={isSelected ? onClick : undefined}
            style={{
              width: "188px",
              boxSizing: "border-box",
              padding: "4px",
              borderRadius: "16px",
              border: `2.5px solid ${theme.outerBorder}`,
              background: theme.outerBg,
              boxShadow: isSelected
                ? `0 0 24px ${theme.glow}, inset 0 0 12px ${theme.glow}`
                : `0 0 16px ${theme.glow}, inset 0 0 8px ${theme.glow}`,
              cursor: isSelected ? "pointer" : "default",
              userSelect: "none",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
            }}
          >
            <div
              style={{
                borderRadius: "11px",
                padding: "9px 12px",
                border: `1.5px solid ${theme.innerBorder}`,
                backgroundColor: theme.innerBg,
                backgroundImage: `repeating-linear-gradient(0deg, ${theme.scanline} 0px, ${theme.scanline} 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, ${theme.scanline} 0px, ${theme.scanline} 1px, transparent 1px, transparent 8px)`,
                boxShadow: `inset 0 0 18px ${theme.glow}40`,
                overflow: "hidden",
              }}
            >
              {/* Station header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      background: theme.dot,
                      boxShadow: `0 0 8px ${theme.glow}`,
                      display: "inline-block",
                      animation: status !== "normal" ? "pulse 1.2s infinite" : undefined,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#e0f7ff",
                      letterSpacing: "0.02em",
                      textShadow: `0 0 8px ${theme.glow}`,
                    }}
                  >
                    {stationId} · Z{zoneId}
                  </span>
                </div>
                {status === "alert" ? (
                  <AlertTriangle
                    style={{
                      width: 14,
                      height: 14,
                      color: "#f87171",
                      filter: "drop-shadow(0 0 4px rgba(248,113,113,0.7))",
                    }}
                  />
                ) : (
                  <CheckCircle2
                    style={{
                      width: 14,
                      height: 14,
                      color: "#6ee7b7",
                      filter: "drop-shadow(0 0 4px rgba(110,231,183,0.6))",
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
                  gap: "6px",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#bae6fd",
                  }}
                >
                  <Droplets style={{ width: 12, height: 12, color: "#67e8f9" }} />
                  Flow
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#7dd3fc",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 0 8px rgba(125,211,252,0.45)",
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
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#bae6fd",
                  }}
                >
                  <Gauge style={{ width: 12, height: 12, color: "#d8b4fe" }} />
                  Press
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#d8b4fe",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 0 8px rgba(216,180,254,0.45)",
                  }}
                >
                  {pressure != null ? `${pressure.toFixed(2)} bar` : "--"}
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>
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
  const showHologram = isHovered || isSelected;

  return (
    <group>
      {/* Generous invisible hit volume spanning this station's pipe leg + flow/pressure sensors */}
      <mesh
        position={[lx, 0.25, lz]}
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
          onClick();
        }}
      >
        <boxGeometry args={[1.55, 0.8, 2.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Flow sensor physical location marker (cyan) */}
      <mesh position={node.flowPos} scale={showHologram ? 1.3 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#019FD7"
          emissive="#019FD7"
          emissiveIntensity={showHologram ? 1.2 : 0.6}
        />
      </mesh>

      {/* Pressure transducer physical location marker (violet) */}
      <mesh position={node.pressurePos} scale={showHologram ? 1.3 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={showHologram ? 1.2 : 0.6}
        />
      </mesh>

      {/* Alert ring around leg if leaking */}
      {status === "alert" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.03, lz]} raycast={noRaycast}>
          <ringGeometry args={[0.45, 0.65, 32]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.65} />
        </mesh>
      )}

      {/* 3D Hologram projector emitter, ray fan, beam column, and floating HUD card */}
      {showHologram && (
        <HologramProjection
          stationId={stationId}
          zoneId={node.zoneId}
          anchorPos={[lx, 0.275, lz]}
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active");

  const activeStation =
    selectedStationId !== undefined ? selectedStationId : localPinnedStation;

  const toggleStation = (sid: StationId) => {
    const next = activeStation === sid ? null : sid;
    if (selectedStationId === undefined) {
      setLocalPinnedStation(next);
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
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.object.position.set(0, 7.2, 8.8);
    ctrl.target.set(0, 0.2, 0);
    ctrl.update();
  };

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
      {/* Active alert banners */}
      {activeAlerts.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {activeAlerts.slice(0, 2).map((alert) => (
            <ZoneAlertBanner
              key={alert.id}
              zoneId={(alert.zoneId ?? 1) as ZoneId}
              leakRate={alert.leakRate ?? 0}
              si={alert.si ?? 0}
            />
          ))}
        </div>
      )}

      {/* Top-right status + Reset camera button */}
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
          dpr={[1, 2]}
          camera={{ position: [0, 7.2, 8.8], fov: 40, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
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
                  onClick={() => toggleStation(sid)}
                />
              );
            })}
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={4}
            maxDistance={24}
            maxPolarAngle={Math.PI / 2.15}
            target={[0, 0.2, 0]}
          />
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
        <span>· Right-drag to pan</span>
        <span>· Hover or click node to view S1–S4 (4×2 Flow &amp; Pressure)</span>
      </div>
    </div>
  );
}

// Client-only preload to prevent SSR relative fetch errors
if (typeof window !== "undefined") {
  useGLTF.preload("/pipeline.glb");
}
