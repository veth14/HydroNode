"use client";
// src/components/rig/Esp32Box.tsx
// Above-ground ESP32 controller module with CAT6 lines and Wi-Fi uplink.
// Represents the actual edge hardware:
// - Flow: Pulse GPIO input interrupts
// - Pressure: 12-bit ADC analog input channels
// - Vibration: SPI Bus + dedicated CS lines (MPU6050 MEMS)
// - CAT6 multi-conductor cable bundling all 6 stations

import { ESP32_POS, STATIONS, STATION_IDS, type StationId } from "@/config/rig";

interface Esp32BoxProps {
  showCat6?: boolean;
  activeStationId?: StationId | null;
}

export function Esp32Box({ showCat6 = true, activeStationId }: Esp32BoxProps) {
  const { x, y, width, height } = ESP32_POS;

  return (
    <g id="esp32-controller">
      {/* CAT6 Industrial Multi-drop Cabling */}
      {showCat6 && (
        <g id="cat6-cables">
          {STATION_IDS.map((sid) => {
            const pos = STATIONS[sid];
            const isPolled = activeStationId === sid;

            // Curved cable path from ESP32 RJ45 ports to Station Node Hub CAT6 terminal
            const startX = x + 35 + STATION_IDS.indexOf(sid) * 26;
            const startY = y + height;
            const targetX = pos.x - 34;
            const targetY = pos.y - 38;
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
                {/* Port termination dot on station hub */}
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
          ESP32 EDGE CONTROLLER
        </text>

        {/* Hardware & Sensor Bus Specs */}
        <g transform="translate(14, 40)" fontSize="8.5" fontFamily="monospace">
          <text x="0" y="0" fill="#7a8fa6">
            Model: <tspan fill="#e8edf2">Random Forest (On-Device)</tspan>
          </text>
          <text x="0" y="13" fill="#7a8fa6">
            Flow: <tspan fill="#00b4d8">Pulse GPIO</tspan> · Press: <tspan fill="#818cf8">ADC</tspan> · Seismic: <tspan fill="#f59e0b">SPI Wave</tspan>
          </text>
          <text x="0" y="26" fill="#7a8fa6">
            Bus: <tspan fill="#38bdf8">CAT6 Multiplex (6× CS pins)</tspan>
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
