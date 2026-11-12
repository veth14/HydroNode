"use client";
// src/components/rig/RigMap.tsx
// Hero physical test rig component in Light Mode.
// Follows 20 Rules:
// - Shows the actual physical product cleanly without dark mud or fake glow
// - Clean engineering blueprint grid on slate-50
// - White Schedule-40 PVC pipe with clear flow direction

import { useState, useRef, useEffect } from "react";
import {
  STATIONS,
  ZONES,
  TEST_POINTS,
  type StationId,
  type ZoneId,
  type TestPoint as TestPointType,
} from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";
import { Pipe } from "./Pipe";
import { Station } from "./Station";
import { ZoneBand } from "./ZoneBand";
import { TestPoint } from "./TestPoint";
import { LeakEffect } from "./LeakEffect";
import { Esp32Box } from "./Esp32Box";
import { Legend } from "./Legend";

interface RigMapProps {
  onSelectStation?: (id: StationId) => void;
  onSelectZone?: (id: ZoneId) => void;
  onInjectLeak?: (tp: TestPointType) => void;
  selectedStationId?: StationId | null;
  selectedZoneId?: ZoneId | null;
}

export function RigMap({
  onSelectStation,
  onSelectZone,
  onInjectLeak,
  selectedStationId,
  selectedZoneId,
}: RigMapProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Layer toggles
  const [showZones, setShowZones] = useState(true);
  const [showCables, setShowCables] = useState(true);
  const [showVibration, setShowVibration] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Store data
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectedLeaks = useHydroStore((s) => s.injectedLeaks);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === "active");

  // Merge DB alerts with any live injected leaks from simulation panel/valves
  const displayedAlerts = [...activeAlerts];
  injectedLeaks.forEach((zId) => {
    if (!displayedAlerts.some((a) => a.zoneId === zId)) {
      displayedAlerts.push({
        id: 99000 + zId,
        ts: new Date().toISOString(),
        zoneId: zId,
        stationId: ZONES.find((z) => z.id === zId)?.stationA ?? "S1",
        severity: "high",
        status: "active",
        leakRate: 5.2,
        si: 7.8,
        confidence: 0.94,
        recommendedAction: "Dispatch repair crew; isolate zone segment",
        repeatCount: 1,
        features: {
          pressureDropRate: 0.35,
          flowDifference: 4.8,
          vibrationRms: 0.285,
          dominantFreq: 88,
          bandEnergy: 4.2,
        },
      });
    }
  });

  const getZoneSeverity = (zoneId: ZoneId) => {
    const alert = activeAlerts.find((a) => a.zoneId === zoneId);
    if (alert) return alert.severity;
    if (injectedLeaks.includes(zoneId)) return "high";
    return null;
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Avoid hydration mismatch by waiting for mount
  if (!mounted) {
    return (
      <div className="w-full h-[520px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse border border-slate-200">
        Loading Rig Hardware Model (S1–S6 Tri-Sensor Bus)...
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white rounded-xl overflow-hidden shadow-xs border border-slate-200 select-none flex flex-col">
      {/* SVG Rig Canvas */}
      <svg
        viewBox="0 0 1200 720"
        className={`w-full h-auto cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: "none" }}
      >
        <defs>
          {/* Subtle SCADA workbench engineering grid */}
          <pattern
            id="workbench-grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 35 0 L 0 0 0 35"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* Transform Group for Pan & Zoom */}
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transformOrigin: "center" }}
        >
          {/* Workbench canvas background with subtle grid */}
          <rect width="1200" height="720" fill="#f8fafc" />
          <rect width="1200" height="720" fill="url(#workbench-grid)" />

          {/* RESERVOIR TANK (Far Left) */}
          <g transform="translate(15, 480)">
            <rect
              x="0"
              y="0"
              width="65"
              height="110"
              rx="8"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {/* Water level indicator */}
            <rect
              x="4"
              y="28"
              width="57"
              height="78"
              rx="4"
              fill="#0284c7"
              opacity="0.2"
            />
            <line x1="4" y1="28" x2="61" y2="28" stroke="#0284c7" strokeWidth="2" />
            <text
              x="32"
              y="60"
              fill="#0f172a"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              SUPPLY
            </text>
            <text
              x="32"
              y="72"
              fill="#64748b"
              fontSize="7.5"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              RESERVOIR
            </text>
            {/* Top inlet valve */}
            <rect x="26" y="-8" width="13" height="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="32" cy="-12" r="5" fill="#d97706" />
          </g>

          {/* PUMP & INLET (Between Tank and S1) */}
          <g transform="translate(65, 550)">
            <circle
              cx="14"
              cy="0"
              r="14"
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth="2"
            />
            <polygon points="10,-6 20,0 10,6" fill="#0284c7" />
            <text
              x="14"
              y="-18"
              fill="#0284c7"
              fontSize="8"
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              PUMP
            </text>
          </g>

          {/* COLLECTION DRAIN TANK (Bottom Right) */}
          <g transform="translate(1030, 490)">
            <rect
              x="0"
              y="0"
              width="65"
              height="100"
              rx="8"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <rect
              x="4"
              y="38"
              width="57"
              height="58"
              rx="4"
              fill="#0284c7"
              opacity="0.15"
            />
            <text
              x="32"
              y="62"
              fill="#0f172a"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              DRAIN
            </text>
            <text
              x="32"
              y="74"
              fill="#64748b"
              fontSize="7.5"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              RECOVERY
            </text>
            {/* Outlet valve */}
            <circle cx="-6" cy="60" r="5" fill="#16a34a" />
          </g>

          {/* 1. ZONE BANDS (Behind the pipe) */}
          {showZones && (
            <g id="zone-bands-layer">
              {ZONES.map((zone) => (
                <ZoneBand
                  key={`zone-${zone.id}`}
                  zone={zone}
                  severity={getZoneSeverity(zone.id)}
                  isSelected={selectedZoneId === zone.id}
                  showLabels={showLabels}
                  onClick={() => onSelectZone?.(zone.id)}
                />
              ))}
            </g>
          )}

          {/* 2. SERPENTINE PVC PIPE */}
          <Pipe hasActiveLeak={activeAlerts.length > 0 || injectedLeaks.length > 0} />

          {/* 3. LEAK TEST POINT PORTS (on vertical legs) */}
          <g id="test-points-layer">
            {TEST_POINTS.map((tp) => (
              <TestPoint
                key={tp.id}
                testPoint={tp}
                isLeaking={injectedLeaks.includes(tp.zoneId)}
                onClick={() => onInjectLeak?.(tp)}
              />
            ))}
          </g>

          {/* 4. SENSOR STATIONS (S1–S6 at zone boundaries) */}
          <g id="stations-layer">
            {(Object.entries(STATIONS) as [StationId, (typeof STATIONS)[StationId]][]).map(
              ([id, pos]) => (
                <Station
                  key={id}
                  id={id}
                  pos={pos}
                  data={stations.find((s) => s.id === id)}
                  isSelected={selectedStationId === id}
                  onClick={() => onSelectStation?.(id)}
                />
              )
            )}
          </g>

          {/* 5. ESP32-S3 CONTROLLER ENCLOSURE & SIGNAL CABLING */}
          <Esp32Box
            showCables={showCables}
            activeStationId={selectedStationId}
          />

          {/* 6. ACTIVE LEAK VISUALS & EFFECTS */}
          {displayedAlerts.map((alert) => (
            <LeakEffect
              key={`alert-fx-${alert.id}`}
              alert={alert}
              vibrationRms={alert.features?.vibrationRms ?? 0.25}
            />
          ))}
        </g>
      </svg>

      {/* Interactive Legend & Layer Controls */}
      <Legend
        showZones={showZones}
        setShowZones={setShowZones}
        showCables={showCables}
        setShowCables={setShowCables}
        showVibration={showVibration}
        setShowVibration={setShowVibration}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        zoom={zoom}
        setZoom={setZoom}
        onResetView={handleResetView}
      />
    </div>
  );
}
