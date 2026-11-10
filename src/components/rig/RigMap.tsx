"use client";
// src/components/rig/RigMap.tsx
// Hero physical test rig component.
// Composed of modular subcomponents: Pipe, Station, ZoneBand, TestPoint, LeakEffect, Esp32Box, Legend.

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
  const [showCat6, setShowCat6] = useState(true);
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
      <div className="w-full h-[520px] bg-[#0a0d12] rounded-xl flex items-center justify-center text-[#7a8fa6] text-xs font-mono animate-pulse border border-[#1e2733]">
        Initializing Rig Hardware Model (S1–S6 Tri-Sensor Bus)...
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#080b10] rounded-xl overflow-hidden shadow-2xl border border-[#1e2733] select-none flex flex-col">
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
          {/* Subtle SCADA workbench grid */}
          <pattern
            id="workbench-grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 35 0 L 0 0 0 35"
              fill="none"
              stroke="#131b24"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Soft Drop Shadow Filter */}
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Transform Group for Pan & Zoom */}
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transformOrigin: "center" }}
        >
          {/* Workbench table background with faint grid */}
          <rect width="1200" height="720" fill="#080b10" />
          <rect width="1200" height="720" fill="url(#workbench-grid)" opacity="0.6" />

          {/* RESERVOIR TANK (Far Left) */}
          <g transform="translate(15, 480)">
            <rect
              x="0"
              y="0"
              width="65"
              height="110"
              rx="8"
              fill="#0f1419"
              stroke="#1e2733"
              strokeWidth="2"
              filter="url(#soft-shadow)"
            />
            {/* Water level indicator */}
            <rect
              x="4"
              y="28"
              width="57"
              height="78"
              rx="4"
              fill="#00b4d8"
              opacity="0.3"
            />
            <line x1="4" y1="28" x2="61" y2="28" stroke="#38bdf8" strokeWidth="2" />
            <text
              x="32"
              y="60"
              fill="#e8edf2"
              fontSize="8.5"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              SUPPLY
            </text>
            <text
              x="32"
              y="72"
              fill="#7a8fa6"
              fontSize="7.5"
              textAnchor="middle"
              fontFamily="monospace"
            >
              RESERVOIR
            </text>
            {/* Top inlet valve */}
            <rect x="26" y="-8" width="13" height="8" fill="#1e2733" stroke="#4a5a6e" strokeWidth="1" />
            <circle cx="32" cy="-12" r="5" fill="#f59e0b" />
          </g>

          {/* PUMP & INLET (Between Tank and S1) */}
          <g transform="translate(65, 550)">
            <circle
              cx="14"
              cy="0"
              r="14"
              fill="#0f1419"
              stroke="#00b4d8"
              strokeWidth="2"
            />
            <polygon points="10,-6 20,0 10,6" fill="#00b4d8" />
            <text
              x="14"
              y="-18"
              fill="#00b4d8"
              fontSize="7.5"
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="monospace"
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
              fill="#0f1419"
              stroke="#1e2733"
              strokeWidth="2"
              filter="url(#soft-shadow)"
            />
            <rect
              x="4"
              y="38"
              width="57"
              height="58"
              rx="4"
              fill="#00b4d8"
              opacity="0.25"
            />
            <text
              x="32"
              y="62"
              fill="#e8edf2"
              fontSize="8.5"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              DRAIN
            </text>
            <text
              x="32"
              y="74"
              fill="#7a8fa6"
              fontSize="7.5"
              textAnchor="middle"
              fontFamily="monospace"
            >
              RECOVERY
            </text>
            {/* Outlet valve */}
            <circle cx="-6" cy="60" r="5" fill="#10b981" />
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

          {/* 5. ESP32 CONTROLLER ENCLOSURE & CAT6 CABLING */}
          <Esp32Box
            showCat6={showCat6}
            activeStationId={selectedStationId}
          />

          {/* 6. ACTIVE LEAK VISUALS & EFFECTS */}
          {activeAlerts.map((alert) => (
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
        showCat6={showCat6}
        setShowCat6={setShowCat6}
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
