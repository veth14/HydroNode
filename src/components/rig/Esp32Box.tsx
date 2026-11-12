"use client";
// src/components/rig/Esp32Box.tsx
// ESP32-S3 above-ground IP65 controller enclosure with shielded multi-conductor cable runs.
// Actual hardware:
// - ESP32-S3-DevKitC-1U-N8R8 on screw-terminal expansion board
// - Flow: Hall-effect pulse → EL817 Optocoupler → GPIO interrupt
// - Pressure: 5V transducer → 10kΩ/20kΩ divider → ADS1115 16-bit I2C ADC (×2)
// - Seismic: Piezoelectric film sensor → EL817 Optocoupler → GPIO
// - Shielded 2 AWG multi-conductor cable from stations to ESP32 enclosure

import { ESP32_POS, STATIONS, STATION_IDS, type StationId } from "@/config/rig";

interface Esp32BoxProps {
  showCables?: boolean;
  activeStationId?: StationId | null;
}

export function Esp32Box({ showCables = true, activeStationId }: Esp32BoxProps) {
  const { x, y, width, height } = ESP32_POS;

  return (
    <g id="esp32-controller">
      {/* 2AWG Shielded Signal Cabling Runs */}
      {showCables && (
        <g id="signal-cables">
          {STATION_IDS.map((sid) => {
            const pos = STATIONS[sid];
            const isPolled = activeStationId === sid;

            // Curved cable path from ESP32 RJ45 ports to Station enclosure
            const startX = x + 35 + STATION_IDS.indexOf(sid) * 26;
            const startY = y + height;
            const targetX = pos.x;
            const targetY = pos.y - 32;
            const midY = (startY + targetY) / 2;

            return (
              <g key={`cable-${sid}`}>
                <path
                  d={`M ${startX},${startY} C ${startX},${midY} ${targetX},${midY} ${targetX},${targetY}`}
                  fill="none"
                  stroke={isPolled ? "#00b4d8" : "#1e2733"}
                  strokeWidth={isPolled ? "2.2" : "1.2"}
                  strokeDasharray={isPolled ? "4 3" : "none"}
                  className={isPolled ? "animate-pulse" : ""}
                />
                {/* Port termination dot on station */}
                <circle
                  cx={targetX}
                  cy={targetY}
                  r="2.5"
                  fill={isPolled ? "#00b4d8" : "#4a5a6e"}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Main Enclosure Box */}
      <g transform={`translate(${x}, ${y})`}>
        {/* Chassis Outer Frame */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="10"
          fill="#0f1419"
          stroke="#1e2733"
          strokeWidth="1.5"
        />

        {/* Top Header Bar */}
        <path
          d={`M 0,10 Q 0,0 10,0 L ${width - 10},0 Q ${width},0 ${width},10 L ${width},26 L 0,26 Z`}
          fill="#141c24"
        />

        {/* Status Indicators */}
        <circle cx="16" cy="13" r="3.5" fill="#10b981" />
        <circle cx="28" cy="13" r="3.5" fill="#00b4d8" className="animate-ping" opacity="0.6" />
        <circle cx="28" cy="13" r="2.5" fill="#00b4d8" />

        <text
          x="38"
          y="17"
          fill="#e8edf2"
          fontSize="10"
          fontWeight="bold"
          letterSpacing="0.6"
          fontFamily="monospace"
        >
          ESP32-S3 EDGE CONTROLLER
        </text>

        {/* Hardware & Sensor Bus Specs */}
        <g transform="translate(14, 40)" fontSize="8" fontFamily="monospace">
          <text x="0" y="0" fill="#7a8fa6">
            MCU: <tspan fill="#e8edf2">ESP32-S3 (Random Forest Edge-AI)</tspan>
          </text>
          <text x="0" y="13" fill="#7a8fa6">
            Flow: <tspan fill="#00b4d8">Hall/EL817</tspan> · Press: <tspan fill="#818cf8">ADS1115 I²C</tspan> · Seismic: <tspan fill="#f59e0b">Piezo/EL817</tspan>
          </text>
          <text x="0" y="26" fill="#7a8fa6">
            Wiring: <tspan fill="#38bdf8">2AWG Shielded</tspan> · Pump: <tspan fill="#10b981">LR7843 PWM</tspan>
          </text>
          <text x="0" y="39" fill="#7a8fa6">
            Sampling: <tspan fill="#10b981">Adaptive (10Hz ➔ 100Hz)</tspan>
          </text>
        </g>

        {/* Uplink Telemetry Badge */}
        <g transform={`translate(${width - 44}, 34)`}>
          <rect
            x="-4"
            y="-4"
            width="38"
            height="50"
            rx="6"
            fill="#141c24"
            stroke="#1e2733"
            strokeWidth="1"
          />
          {/* Signal Bars */}
          <rect x="2" y="32" width="4" height="6" fill="#10b981" rx="1" />
          <rect x="8" y="27" width="4" height="11" fill="#10b981" rx="1" />
          <rect x="14" y="22" width="4" height="16" fill="#10b981" rx="1" />
          <rect x="20" y="17" width="4" height="21" fill="#10b981" rx="1" />
          <text
            x="13"
            y="43"
            fill="#10b981"
            fontSize="6"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            ONLINE
          </text>
        </g>
      </g>
    </g>
  );
}
