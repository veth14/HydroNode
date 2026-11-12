"use client";
// src/components/rig/Esp32Box.tsx
// ESP32-S3 above-ground IP65 controller enclosure in Light Mode.
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
      {/* 2 AWG Shielded Signal Cabling Runs */}
      {showCables && (
        <g id="signal-cables">
          {STATION_IDS.map((sid) => {
            const pos = STATIONS[sid];
            const isPolled = activeStationId === sid;

            // Curved cable path from ESP32 ports to Station enclosure
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
                  stroke={isPolled ? "#0284c7" : "#cbd5e1"}
                  strokeWidth={isPolled ? "2" : "1.2"}
                  strokeDasharray={isPolled ? "4 3" : "none"}
                />
                {/* Port termination dot */}
                <circle
                  cx={targetX}
                  cy={targetY}
                  r="2.5"
                  fill={isPolled ? "#0284c7" : "#94a3b8"}
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
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* Top Header Bar */}
        <path
          d={`M 0,10 Q 0,0 10,0 L ${width - 10},0 Q ${width},0 ${width},10 L ${width},26 L 0,26 Z`}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        {/* Status Indicators */}
        <circle cx="16" cy="13" r="3.5" fill="#16a34a" />
        <circle cx="28" cy="13" r="3" fill="#0284c7" />

        <text
          x="38"
          y="17"
          fill="#0f172a"
          fontSize="10"
          fontWeight="bold"
          letterSpacing="0.4"
          fontFamily="sans-serif"
        >
          ESP32-S3 EDGE CONTROLLER
        </text>

        {/* Hardware & Sensor Bus Specs */}
        <g transform="translate(14, 40)" fontSize="8.5" fontFamily="sans-serif">
          <text x="0" y="0" fill="#475569">
            MCU: <tspan fill="#0f172a" fontWeight="bold">ESP32-S3 (Random Forest Edge-AI)</tspan>
          </text>
          <text x="0" y="13" fill="#475569">
            Flow: <tspan fill="#0284c7" fontWeight="bold">Hall/EL817</tspan> · Press: <tspan fill="#4f46e5" fontWeight="bold">ADS1115 I²C</tspan> · Seismic: <tspan fill="#d97706" fontWeight="bold">Piezo/EL817</tspan>
          </text>
          <text x="0" y="26" fill="#475569">
            Wiring: <tspan fill="#0284c7" fontWeight="bold">2AWG Shielded</tspan> · Pump: <tspan fill="#16a34a" fontWeight="bold">LR7843 PWM</tspan>
          </text>
          <text x="0" y="39" fill="#475569">
            Sampling: <tspan fill="#16a34a" fontWeight="bold">Adaptive (10Hz ➔ 100Hz)</tspan>
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
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Signal Bars */}
          <rect x="2" y="32" width="4" height="6" fill="#16a34a" rx="1" />
          <rect x="8" y="27" width="4" height="11" fill="#16a34a" rx="1" />
          <rect x="14" y="22" width="4" height="16" fill="#16a34a" rx="1" />
          <rect x="20" y="17" width="4" height="21" fill="#16a34a" rx="1" />
          <text
            x="13"
            y="43"
            fill="#16a34a"
            fontSize="7"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            ONLINE
          </text>
        </g>
      </g>
    </g>
  );
}
