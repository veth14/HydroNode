"use client";
// src/components/rig/Station.tsx
// Sensor clamp station module (S1–S6) in Light Mode.
// Clean, professional SCADA instrument presentation:
// 1. Flow Sensor (Hall-Effect Pulse via EL817): Q L/min
// 2. Pressure Sensor (5V Transducer via ADS1115 16-bit I2C ADC): P bar
// 3. Seismic Sensor (Piezoelectric Film Module via EL817): S g RMS

import type { StationId, StationPos } from "@/config/rig";
import type { LiveStation } from "@/types";
import { useHydroStore } from "@/store/hydroStore";

interface StationProps {
  id: StationId;
  pos: StationPos;
  data?: LiveStation;
  isSelected?: boolean;
  onClick?: () => void;
}

export function Station({
  id,
  pos,
  data,
  isSelected,
  onClick,
}: StationProps) {
  const architectureMode = useHydroStore((s) => s.architectureMode);
  const isDormant = architectureMode === "4x3" && (id === "S5" || id === "S6");

  const status = data?.status ?? "online";
  const samplingMode = data?.samplingMode ?? "normal";

  const isAlert = !isDormant && status === "alert";
  const isElevated = !isDormant && (status === "elevated" || samplingMode === "elevated");

  const ledColor = isDormant
    ? "#cbd5e1"
    : isAlert
    ? "#dc2626"
    : isElevated
    ? "#d97706"
    : status === "online"
    ? "#16a34a"
    : "#94a3b8";

  const flowVal = data?.latestFlow != null ? data.latestFlow.toFixed(1) : "15.0";
  const pressVal = data?.latestPressure != null ? data.latestPressure.toFixed(2) : "5.00";
  const vibVal = data?.latestVibration != null ? data.latestVibration.toFixed(3) : "0.082";

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className={`cursor-pointer group select-none transition-opacity ${isDormant ? "opacity-35" : "opacity-100"}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Station ${id}: Flow ${flowVal} L/min, Pressure ${pressVal} bar, Seismic ${vibVal} g`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Selection Ring */}
      {isSelected && (
        <rect
          x="-32"
          y="-36"
          width="64"
          height="72"
          rx="10"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      )}

      {/* Flange Clamps */}
      <rect x="-14" y="-38" width="28" height="4" rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <rect x="-14" y="34" width="28" height="4" rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

      {/* Main Station Enclosure */}
      <rect
        x="-28"
        y="-32"
        width="56"
        height="64"
        rx="8"
        fill="#ffffff"
        stroke={isSelected ? "#0284c7" : isAlert ? "#dc2626" : "#cbd5e1"}
        strokeWidth={isSelected || isAlert ? "2" : "1.2"}
        className="transition-colors group-hover:stroke-sky-600"
      />

      {/* Top Header with Station ID & Status Indicator */}
      <rect x="-28" y="-32" width="56" height="18" rx="7" fill="#f8fafc" />
      <line x1="-28" y1="-14" x2="28" y2="-14" stroke="#e2e8f0" strokeWidth="1" />

      <text
        x="-14"
        y="-19"
        fill="#0f172a"
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {id}
      </text>
      <circle cx="16" cy="-23" r="3" fill={ledColor} />

      {/* Sensor 1: Flow Rate (Hall Pulse via EL817) */}
      <g transform="translate(-22, -3)">
        <text
          x="0"
          y="0"
          fill="#0284c7"
          fontSize="9"
          fontWeight="600"
          fontFamily="monospace"
          className="tabular-nums"
        >
          {`Q ${flowVal}`}
        </text>
      </g>

      {/* Sensor 2: Line Pressure (ADS1115 16-bit I2C ADC) */}
      <g transform="translate(-22, 11)">
        <text
          x="0"
          y="0"
          fill="#4f46e5"
          fontSize="9"
          fontWeight="600"
          fontFamily="monospace"
          className="tabular-nums"
        >
          {`P ${pressVal}`}
        </text>
      </g>

      {/* Sensor 3: Seismic RMS (Piezoelectric Film via EL817) */}
      <g transform="translate(-22, 25)">
        <text
          x="0"
          y="0"
          fill="#d97706"
          fontSize="9"
          fontWeight="600"
          fontFamily="monospace"
          className="tabular-nums"
        >
          {`S ${vibVal}`}
        </text>
      </g>
    </g>
  );
}
