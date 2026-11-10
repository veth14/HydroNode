"use client";
// src/components/rig/LeakEffect.tsx
// Visual leak indicators: water spray, puddle ripples, callout tag, vibration arcs, and flow imbalance.
// Dynamically anchored along the active zone pipe segments so tags never collide or overlap!

import type { LiveAlert } from "@/types";
import { STATIONS, ZONES, type ZoneId } from "@/config/rig";

interface LeakEffectProps {
  alert: LiveAlert;
  vibrationRms?: number;
}

// Actual physical pipe traversal coordinate per zone
// Odd zones (1, 3, 5) run horizontally along the top pipe at y=190
// Even zones (2, 4) run horizontally along the bottom pipe at y=550
const ZONE_LEAK_ANCHORS: Record<ZoneId, { x: number; y: number; isTop: boolean }> = {
  1: { x: 190, y: 190, isTop: true },
  2: { x: 350, y: 550, isTop: false },
  3: { x: 530, y: 190, isTop: true },
  4: { x: 710, y: 550, isTop: false },
  5: { x: 890, y: 190, isTop: true },
};

export function LeakEffect({ alert }: LeakEffectProps) {
  if (!alert.zoneId) return null;

  const zone = ZONES.find((z) => z.id === alert.zoneId);
  if (!zone) return null;

  const anchor = ZONE_LEAK_ANCHORS[alert.zoneId] ?? { x: 500, y: 360, isTop: true };
  const stA = STATIONS[zone.stationA];

  const isHigh = alert.severity === "high";
  const badgeColor = isHigh ? "#ef4444" : "#f59e0b";
  const glowColor = isHigh ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)";

  // Callout offset: if top pipe, place badge slightly below; if bottom pipe, place badge slightly above
  const badgeYOffset = anchor.isTop ? 28 : -80;

  return (
    <g id={`leak-effect-${alert.id}`}>
      {/* Seismic Wave Propagation: Concentric ground/structure wave fronts radiating from leak orifice & station */}
      <g transform={`translate(${stA.x}, ${stA.y})`}>
        <circle
          cx="0"
          cy="0"
          r="36"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.8"
          className="animate-ping"
        />
        <circle
          cx="0"
          cy="0"
          r="54"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="5 5"
          opacity="0.4"
        />
        {/* P/S Wave Front text indicator */}
        <text
          x="0"
          y="-42"
          fill="#f59e0b"
          fontSize="7"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
          opacity="0.8"
        >
          SEISMIC WAVE
        </text>
      </g>

      {/* Physical Leak Point at (anchor.x, anchor.y) on the pipe */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Ground puddle with ripples */}
        <ellipse
          cx="0"
          cy={anchor.isTop ? 20 : 16}
          rx="24"
          ry="7"
          fill="#00b4d8"
          opacity="0.4"
          className="animate-pulse"
        />
        <ellipse
          cx="0"
          cy={anchor.isTop ? 20 : 16}
          rx="36"
          ry="10"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.5"
        />

        {/* Pulsing Alert Origin Ring */}
        <circle
          cx="0"
          cy="0"
          r="16"
          fill="none"
          stroke={badgeColor}
          strokeWidth="2.5"
          className="animate-ping"
        />
        <circle cx="0" cy="0" r="5" fill={badgeColor} />

        {/* Water Spray Particles */}
        <g className="animate-pulse">
          <circle cx="-5" cy={anchor.isTop ? 14 : -14} r="2.5" fill="#7dd3fc" />
          <circle cx="6" cy={anchor.isTop ? 18 : -18} r="2.2" fill="#38bdf8" />
          <circle cx="1" cy={anchor.isTop ? 24 : -22} r="1.8" fill="#bae6fd" />
          <line
            x1="0"
            y1="0"
            x2="-4"
            y2={anchor.isTop ? 16 : -16}
            stroke="#7dd3fc"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="6"
            y2={anchor.isTop ? 18 : -18}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Compact, High-Tech SCADA Callout Badge */}
        {/* Sized to 160px width centered over the anchor so it NEVER collides with neighbor zones */}
        <g transform={`translate(-80, ${badgeYOffset})`}>
          <rect
            x="0"
            y="0"
            width="160"
            height="50"
            rx="8"
            fill="#0f1419"
            stroke={badgeColor}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />

          {/* Header Row */}
          <circle cx="12" cy="14" r="3" fill={badgeColor} className="animate-pulse" />
          <text
            x="20"
            y="17"
            fill="#e8edf2"
            fontSize="9.5"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {`ZONE ${alert.zoneId} · ${alert.severity.toUpperCase()}`}
          </text>
          <text
            x="148"
            y="17"
            fill={badgeColor}
            fontSize="8.5"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="monospace"
          >
            {`${(alert.confidence * 100).toFixed(0)}%`}
          </text>

          {/* Dividing line */}
          <line x1="8" y1="23" x2="152" y2="23" stroke="#1e2733" strokeWidth="1" />

          {/* Telemetry metrics: SI + Leak Rate + Delta Q */}
          <text
            x="10"
            y="34"
            fill="#7a8fa6"
            fontSize="8"
            fontFamily="monospace"
          >
            SI:{" "}
            <tspan fill="#f59e0b" fontWeight="bold">
              {alert.si?.toFixed(1) ?? "--"}%
            </tspan>
            {"  "}Rate:{" "}
            <tspan fill="#ef4444" fontWeight="bold">
              {alert.leakRate?.toFixed(1) ?? "--"}L/m
            </tspan>
          </text>

          <text
            x="10"
            y="44"
            fill="#00b4d8"
            fontSize="7.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {`ΔQ: -${alert.features?.flowDifference?.toFixed(1) ?? "4.0"} L/min (pulse diff)`}
          </text>
        </g>
      </g>
    </g>
  );
}
