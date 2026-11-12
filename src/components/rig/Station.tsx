"use client";
// src/components/rig/Station.tsx
// Sensor clamp station module (S1–S6) on the straight PVC pipe.
// Clean, professional SCADA / P&ID instrument presentation:
// Displays the 3 physical sensors per station in a compact, high-contrast enclosure:
// 1. Flow Sensor (Hall-Effect Pulse via EL817): Q L/min
// 2. Pressure Sensor (5V Transducer via ADS1115 16-bit I2C ADC): P bar
// 3. Seismic Sensor (Piezoelectric Film Module via EL817): S g RMS

import type { StationId, StationPos } from "@/config/rig";
import type { LiveStation } from "@/types";

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
  const status = data?.status ?? "online";
  const samplingMode = data?.samplingMode ?? "normal";

  const isAlert = status === "alert";
  const isElevated = status === "elevated" || samplingMode === "elevated";

  const ledColor = isAlert
    ? "#ef4444"
    : isElevated
    ? "#f59e0b"
    : status === "online"
    ? "#10b981"
    : "#4a5a6e";

  const flowVal = data?.latestFlow != null ? data.latestFlow.toFixed(1) : "15.0";
  const pressVal = data?.latestPressure != null ? data.latestPressure.toFixed(2) : "5.00";
  const vibVal = data?.latestVibration != null ? data.latestVibration.toFixed(3) : "0.082";

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className="cursor-pointer group select-none font-mono"
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
      {/* Selection Highlight */}
      {isSelected && (
        <rect
          x="-32"
          y="-36"
          width="64"
          height="72"
          rx="10"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          className="animate-pulse"
        />
      )}

      {/* Subtle Upper Flange (In-Line Flow Meter Coupling) */}
      <rect x="-14" y="-40" width="28" height="4" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
      {/* Subtle Lower Clamp (Piezoelectric Film Clamp Bracket) */}
      <rect x="-14" y="36" width="28" height="4" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

      {/* Industrial Collar Enclosure */}
      <rect
        x="-28"
        y="-32"
        width="56"
        height="64"
        rx="8"
        fill="#0a0d12"
        stroke={isSelected ? "#00b4d8" : isAlert ? "#ef4444" : "#1e2733"}
        strokeWidth={isSelected || isAlert ? "1.8" : "1.2"}
        className="transition-colors group-hover:stroke-[#00b4d8]"
      />

      {/* Top Header Bar with Station Name & Status LED */}
      <rect x="-28" y="-32" width="56" height="18" rx="7" fill="#121822" />
      <text
        x="-14"
        y="-19"
        fill="#e8edf2"
        fontSize="10.5"
        fontWeight="800"
        letterSpacing="0.5"
      >
        {id}
      </text>

      {/* Status LED */}
      {isAlert && (
        <circle
          cx="16"
          cy="-23"
          r="5"
          fill="#ef4444"
          className="animate-ping"
          opacity="0.8"
        />
      )}
      <circle cx="16" cy="-23" r="3" fill={ledColor} />

      {/* 3 Transducer Rows Inside Enclosure */}
      {/* 1. Flow Sensor (Pulse) -> Cyan */}
      <g transform="translate(-20, -7)">
        <rect x="0" y="0" width="40" height="9.5" rx="2" fill="#00b4d812" stroke="#00b4d835" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.7" r="1.8" fill="#00b4d8" />
        <text x="9" y="7.5" fill="#7dd3fc" fontSize="6.5" fontWeight="bold">
          Q {flowVal}
        </text>
      </g>

      {/* 2. Pressure Sensor (ADS1115 16-bit I2C) -> Indigo */}
      <g transform="translate(-20, 5)">
        <rect x="0" y="0" width="40" height="9.5" rx="2" fill="#818cf812" stroke="#818cf835" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.7" r="1.8" fill="#818cf8" />
        <text x="9" y="7.5" fill="#a5b4fc" fontSize="6.5" fontWeight="bold">
          P {pressVal}
        </text>
      </g>

      {/* 3. Seismic Sensor (Piezoelectric Film via EL817) -> Amber */}
      <g transform="translate(-20, 17)">
        <rect x="0" y="0" width="40" height="9.5" rx="2" fill="#f59e0b12" stroke="#f59e0b35" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.7" r="1.8" fill="#f59e0b" />
        <text x="9" y="7.5" fill="#fcd34d" fontSize="6.5" fontWeight="bold">
          S {vibVal}
        </text>
      </g>

      {/* Corner Fastener Screws */}
      <circle cx="-22" cy="-28" r="1" fill="#4a5a6e" />
      <circle cx="22" cy="-28" r="1" fill="#4a5a6e" />
      <circle cx="-22" cy="26" r="1" fill="#4a5a6e" />
      <circle cx="22" cy="26" r="1" fill="#4a5a6e" />
    </g>
  );
}
