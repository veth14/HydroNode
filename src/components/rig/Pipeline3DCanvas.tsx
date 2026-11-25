"use client";
// src/components/rig/Pipeline3DCanvas.tsx
// 3D GLB pipeline viewer using React Three Fiber + Drei.
// Renders /public/pipeline.glb on a physical testboard with floating telemetry overlays.
// Architecture: 4 zones, 4 junctions × 2 sensors (flow + pressure) = 8 sensors total.
// Live-only mode — no simulation injection.

import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
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

// ─── Sensor 3D Beacon + Leader Line + Floating HTML Card ─────────────────────
const noRaycast = () => {};

interface SensorOverlayProps {
  stationId: StationId;
  flow: number | null;
  pressure: number | null;
  status: "normal" | "alert" | "warning";
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
  const [lx, ly, lz] = node.labelPos;
  const pipeAnchor: [number, number, number] = [lx, 0.24, lz];
  const showCard = isHovered || isSelected;

  const color =
    status === "alert"
      ? "#dc2626"
      : status === "warning"
        ? "#d97706"
        : "#0076A0";
  const bgColor =
    status === "alert"
      ? "#fef2f2"
      : status === "warning"
        ? "#fffbeb"
        : "#ffffff";
  const borderColor =
    status === "alert"
      ? "#fecaca"
      : status === "warning"
        ? "#fde68a"
        : "#C8E5F2";

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
      <mesh position={node.flowPos} scale={showCard ? 1.3 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#019FD7"
          emissive="#019FD7"
          emissiveIntensity={showCard ? 1.2 : 0.6}
        />
      </mesh>

      {/* Pressure transducer physical location marker (violet) */}
      <mesh position={node.pressurePos} scale={showCard ? 1.3 : 1} raycast={noRaycast}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={showCard ? 1.2 : 0.6}
        />
      </mesh>

      {/* Alert ring around leg if leaking */}
      {status === "alert" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.03, lz]} raycast={noRaycast}>
          <ringGeometry args={[0.45, 0.65, 32]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.65} />
        </mesh>
      )}

      {/* Leader line & floating card appear only when hovered or clicked */}
      {showCard && (
        <>
          <Line
            points={[pipeAnchor, [lx, ly - 0.1, lz]]}
            color={isSelected ? color : "#019FD7"}
            lineWidth={1.5}
            transparent
            opacity={0.8}
          />

          <Html
            position={node.labelPos}
            center
            distanceFactor={10}
            style={{ pointerEvents: isSelected ? "auto" : "none" }}
            zIndexRange={[100, 0]}
          >
            <div
              onClick={isSelected ? onClick : undefined}
              style={{
                background: bgColor,
                border: `2px solid ${isSelected ? color : borderColor}`,
                borderRadius: "12px",
                padding: "7px 10px",
                minWidth: "124px",
                cursor: isSelected ? "pointer" : "default",
                boxShadow: isSelected
                  ? `0 0 0 3px ${color}35, 0 6px 18px rgba(0,0,0,0.18)`
                  : "0 4px 16px rgba(12,35,64,0.18)",
                transform: "translateY(-8px)",
                userSelect: "none",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
              }}
            >
              {/* Station header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                      animation: status !== "normal" ? "pulse 1.2s infinite" : undefined,
                    }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#0C2340" }}>
                    {stationId} · Z{node.zoneId}
                  </span>
                </div>
                {status === "alert" ? (
                  <AlertTriangle style={{ width: 11, height: 11, color: "#dc2626" }} />
                ) : (
                  <CheckCircle2 style={{ width: 11, height: 11, color: "#16a34a" }} />
                )}
              </div>

              {/* Flow reading */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  marginBottom: "2px",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#2D5A7A" }}>
                  <Droplets style={{ width: 10, height: 10, color: "#019FD7" }} />
                  Flow
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#0076A0",
                    fontVariantNumeric: "tabular-nums",
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
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#2D5A7A" }}>
                  <Gauge style={{ width: 10, height: 10, color: "#7c3aed" }} />
                  Press
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#7c3aed",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {pressure != null ? `${pressure.toFixed(2)} bar` : "--"}
                </span>
              </div>
            </div>
          </Html>
        </>
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
