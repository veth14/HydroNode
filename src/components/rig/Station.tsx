"use client";
// src/components/rig/Station.tsx
// Sensor station assembly (S1–S6) mounted on the straight vertical PVC pipe segment.
// Fulfills PRD Requirements S1, S2, S3 with 3 distinct physical transducers placed along the line:
// 1. Flow Transducer (y = -60): In-line turbine flow meter with threaded pipe couplings -> Q (L/min)
// 2. Pressure Transducer (y = 0): Threaded NPT tap boss with piezoresistive diaphragm sensor -> P (bar)
// 3. Seismic Wave Sensor (y = +60): Exterior clamped geophone / MEMS capturing acoustic stress waves -> S (g RMS)
// Connected via color-coded signal lines to the Station Node Enclosure (S1-S6).

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
      className="cursor-pointer group select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Station ${id} Tri-Sensor Assembly: Flow ${flowVal} L/min, Pressure ${pressVal} bar, Seismic ${vibVal} g`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* ─── SELECTION GLOW ENVELOPE ─── */}
      {isSelected && (
        <rect
          x="-54"
          y="-90"
          width="134"
          height="180"
          rx="12"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="animate-pulse"
        />
      )}

      {/* ─── TRANSDUCER SIGNAL CABLE CONDUITS (ROUTING TO STATION HUB) ─── */}
      {/* Flow Sensor Cable: Cyan */}
      <path
        d="M -12,-60 C -22,-60 -24,-20 -30,-14"
        fill="none"
        stroke="#00b4d8"
        strokeWidth="1.5"
        strokeOpacity="0.85"
      />
      {/* Pressure Sensor Cable: Indigo */}
      <path
        d="M -12,0 C -20,0 -24,-2 -30,0"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.5"
        strokeOpacity="0.85"
      />
      {/* Seismic Wave Sensor Cable: Amber */}
      <path
        d="M -12,60 C -22,60 -24,20 -30,14"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeOpacity="0.85"
      />

      {/* ─── 1. FLOW TRANSDUCER (IN-LINE TURBINE AT Y = -60) ─── */}
      <g id="flow-transducer" transform="translate(0, -60)">
        {/* Top & Bottom Pipe Flange Collars */}
        <rect x="-14" y="-12" width="28" height="4" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="-14" y="8" width="28" height="4" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        {/* In-Line Turbine Chamber */}
        <rect
          x="-11"
          y="-8"
          width="22"
          height="16"
          rx="3"
          fill="#0c1824"
          stroke="#00b4d8"
          strokeWidth="1.5"
        />
        {/* Spinning Turbine Impeller Blades */}
        <circle cx="0" cy="0" r="5" fill="#00b4d8" opacity="0.3" />
        <line x1="-4" y1="-4" x2="4" y2="4" stroke="#00b4d8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-4" y1="4" x2="4" y2="-4" stroke="#00b4d8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.5" fill="#e0f2fe" />

        {/* High-tech SCADA Callout Pill (Right side) */}
        <g transform="translate(18, -10)">
          <rect
            x="0"
            y="0"
            width="58"
            height="20"
            rx="4"
            fill="#0a0d12"
            stroke="#00b4d8"
            strokeWidth="1"
            className="group-hover:stroke-[#38bdf8] transition-colors"
          />
          <circle cx="6" cy="10" r="2.5" fill="#00b4d8" />
          <text x="12" y="10" fill="#7dd3fc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
            FLOW [Q]
          </text>
          <text x="12" y="17" fill="#e0f2fe" fontSize="7" fontWeight="800" fontFamily="monospace">
            {flowVal} L/m
          </text>
        </g>
      </g>

      {/* ─── 2. PRESSURE TRANSDUCER (THREADED NPT BOSS AT Y = 0) ─── */}
      <g id="pressure-transducer" transform="translate(0, 0)">
        {/* Threaded Hex Pipe Boss welded into pipe wall */}
        <rect x="-13" y="-5" width="26" height="10" rx="2" fill="#1e2430" stroke="#818cf8" strokeWidth="1" />
        {/* Transducer Cylinder Body */}
        <rect
          x="-7"
          y="-9"
          width="14"
          height="18"
          rx="2"
          fill="#17182c"
          stroke="#818cf8"
          strokeWidth="1.5"
        />
        {/* Miniature Pressure Gauge Dial */}
        <circle cx="0" cy="0" r="5" fill="#0f1122" stroke="#818cf8" strokeWidth="1" />
        <line x1="0" y1="0" x2="2.5" y2="-2.5" stroke="#a5b4fc" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1" fill="#e0e7ff" />

        {/* High-tech SCADA Callout Pill (Right side) */}
        <g transform="translate(18, -10)">
          <rect
            x="0"
            y="0"
            width="58"
            height="20"
            rx="4"
            fill="#0a0d12"
            stroke="#818cf8"
            strokeWidth="1"
            className="group-hover:stroke-[#a5b4fc] transition-colors"
          />
          <circle cx="6" cy="10" r="2.5" fill="#818cf8" />
          <text x="12" y="10" fill="#a5b4fc" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
            PRESS [P]
          </text>
          <text x="12" y="17" fill="#e0e7ff" fontSize="7" fontWeight="800" fontFamily="monospace">
            {pressVal} bar
          </text>
        </g>
      </g>

      {/* ─── 3. SEISMIC WAVE SENSOR (EXTERIOR PIPE CLAMP AT Y = +60) ─── */}
      <g id="seismic-transducer" transform="translate(0, 60)">
        {/* Exterior Clamp Collar wrapping pipe */}
        <rect x="-15" y="-7" width="30" height="14" rx="4" fill="#1f180d" stroke="#f59e0b" strokeWidth="1.2" />
        {/* Clamp Bolts */}
        <circle cx="-11" cy="0" r="1.5" fill="#fcd34d" />
        <circle cx="11" cy="0" r="1.5" fill="#fcd34d" />
        {/* Geophone / MEMS Transducer Probe Case */}
        <rect
          x="-6"
          y="-6"
          width="12"
          height="12"
          rx="2"
          fill="#2b1a06"
          stroke="#f59e0b"
          strokeWidth="1.5"
        />
        {/* Acoustic Vibration Wave Graphic */}
        <path
          d="M -3,0 L -1.5,-3 L 0,3 L 1.5,-3 L 3,0"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Acoustic Radiating Waves when vibration elevated */}
        {(isElevated || isAlert) && (
          <g className="animate-ping" opacity="0.6">
            <circle cx="0" cy="0" r="12" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
          </g>
        )}

        {/* High-tech SCADA Callout Pill (Right side) */}
        <g transform="translate(18, -10)">
          <rect
            x="0"
            y="0"
            width="58"
            height="20"
            rx="4"
            fill="#0a0d12"
            stroke="#f59e0b"
            strokeWidth="1"
            className="group-hover:stroke-[#fcd34d] transition-colors"
          />
          <circle cx="6" cy="10" r="2.5" fill="#f59e0b" />
          <text x="12" y="10" fill="#fcd34d" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
            SEISMIC [S]
          </text>
          <text x="12" y="17" fill="#fef3c7" fontSize="7" fontWeight="800" fontFamily="monospace">
            {vibVal} g
          </text>
        </g>
      </g>

      {/* ─── 4. STATION LOCAL DATA HUB / JUNCTION ENCLOSURE (MOUNTED ON LEFT) ─── */}
      <g id="station-hub" transform="translate(-48, -36)">
        {/* Outer SCADA Enclosure */}
        <rect
          x="0"
          y="0"
          width="28"
          height="72"
          rx="6"
          fill="#0f1419"
          stroke={isSelected ? "#00b4d8" : isAlert ? "#ef4444" : "#1e2733"}
          strokeWidth={isSelected || isAlert ? "1.8" : "1.2"}
          className="group-hover:stroke-[#00b4d8] transition-colors"
        />

        {/* Enclosure Header */}
        <rect x="0" y="0" width="28" height="20" rx="6" fill="#141c24" />
        <rect x="0" y="14" width="28" height="6" fill="#141c24" />

        {/* Station ID Tag */}
        <text
          x="8"
          y="14"
          fill="#e8edf2"
          fontSize="10"
          fontWeight="800"
          fontFamily="monospace"
        >
          {id}
        </text>

        {/* Status LED */}
        {isAlert && (
          <circle
            cx="21"
            cy="10"
            r="4.5"
            fill="#ef4444"
            className="animate-ping"
            opacity="0.8"
          />
        )}
        <circle cx="21" cy="10" r="2.5" fill={ledColor} />

        {/* Cable Ingress Terminals */}
        <circle cx="28" cy="22" r="1.5" fill="#00b4d8" />
        <circle cx="28" cy="36" r="1.5" fill="#818cf8" />
        <circle cx="28" cy="50" r="1.5" fill="#f59e0b" />

        {/* Micro Bus Indicator text */}
        <text
          x="14"
          y="64"
          fill="#7a8fa6"
          fontSize="6"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          CS BUS
        </text>

        {/* Top CAT6 Connection Terminal (where Esp32 cable lands) */}
        <rect x="8" y="-3" width="12" height="3" fill="#1e2733" stroke="#4a5a6e" strokeWidth="0.8" />
        <circle cx="14" cy="-1.5" r="1.2" fill="#00b4d8" />
      </g>
    </g>
  );
}
