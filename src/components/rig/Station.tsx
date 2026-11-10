"use client";
// src/components/rig/Station.tsx
// Sensor clamp station module (S1–S6) on the PVC pipe.
// Houses 3 distinct physical sensors:
// 1. Flow Sensor: Pulse signal pin -> Q (L/min)
// 2. Pressure Sensor: Analog ADC signal -> P (bar)
// 3. Seismic Wave Sensor: MEMS / Geophone via SPI bus + CS pin -> S (g RMS)

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

  const flowVal = data?.latestFlow != null ? data.latestFlow.toFixed(1) : "--";
  const pressVal = data?.latestPressure != null ? data.latestPressure.toFixed(2) : "--";
  const vibVal = data?.latestVibration != null ? data.latestVibration.toFixed(3) : "--";

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className="cursor-pointer group select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Station ${id}: Flow ${flowVal} L/min (Pulse), Pressure ${pressVal} bar (Analog), Seismic Wave ${vibVal} g RMS (SPI)`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Selection Glow Halo */}
      {isSelected && (
        <rect
          x="-34"
          y="-38"
          width="68"
          height="76"
          rx="14"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="2"
          strokeDasharray="4 3"
          className="animate-pulse"
        />
      )}

      {/* Heavy-duty Aluminum Pipe Collar / Clamp */}
      <rect
        x="-30"
        y="-34"
        width="60"
        height="68"
        rx="10"
        fill="#0f1419"
        stroke={isSelected ? "#00b4d8" : isAlert ? "#ef4444" : "#1e2733"}
        strokeWidth={isSelected || isAlert ? "2" : "1.5"}
        className="transition-colors group-hover:stroke-[#00b4d8]"
      />

      {/* Inner Enclosure Cavity */}
      <rect
        x="-26"
        y="-30"
        width="52"
        height="60"
        rx="7"
        fill="#0a0d12"
        stroke="#1a2230"
        strokeWidth="1"
      />

      {/* Top Header Bar with Station Name & Status LED */}
      <rect x="-26" y="-30" width="52" height="18" rx="6" fill="#141c24" />
      <text
        x="-14"
        y="-17"
        fill="#e8edf2"
        fontSize="11"
        fontWeight="800"
        fontFamily="monospace"
        letterSpacing="0.5"
      >
        {id}
      </text>

      {/* Status LED */}
      {isAlert && (
        <circle
          cx="16"
          cy="-21"
          r="6"
          fill="#ef4444"
          className="animate-ping"
          opacity="0.75"
        />
      )}
      <circle cx="16" cy="-21" r="3.5" fill={ledColor} />

      {/* 3 Distinct Physical Sensor Indicator Micro-Bands */}
      {/* 1. FLOW SENSOR (Pulse Signal) -> Sky Blue */}
      <g transform="translate(-20, -5)">
        <rect x="0" y="0" width="40" height="9" rx="2" fill="#00b4d818" stroke="#00b4d850" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.5" r="2" fill="#00b4d8" />
        <text x="9" y="7" fill="#7dd3fc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
          Q {flowVal}
        </text>
      </g>

      {/* 2. PRESSURE SENSOR (Analog ADC) -> Indigo / Violet */}
      <g transform="translate(-20, 6)">
        <rect x="0" y="0" width="40" height="9" rx="2" fill="#818cf818" stroke="#818cf850" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.5" r="2" fill="#818cf8" />
        <text x="9" y="7" fill="#a5b4fc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
          P {pressVal}
        </text>
      </g>

      {/* 3. SEISMIC WAVE SENSOR (SPI MEMS / Geophone) -> Amber */}
      <g transform="translate(-20, 17)">
        <rect x="0" y="0" width="40" height="9" rx="2" fill="#f59e0b18" stroke="#f59e0b50" strokeWidth="0.8" />
        <circle cx="4.5" cy="4.5" r="2" fill="#f59e0b" />
        <text x="9" y="7" fill="#fcd34d" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
          S {vibVal}
        </text>
      </g>

      {/* Industrial Clamp Bolts */}
      <circle cx="-23" cy="-30" r="1.5" fill="#4a5a6e" />
      <circle cx="23" cy="-30" r="1.5" fill="#4a5a6e" />
      <circle cx="-23" cy="27" r="1.5" fill="#4a5a6e" />
      <circle cx="23" cy="27" r="1.5" fill="#4a5a6e" />
    </g>
  );
}
