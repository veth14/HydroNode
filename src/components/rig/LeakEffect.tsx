"use client";
// src/components/rig/LeakEffect.tsx
// Professional industrial SCADA leak alarm indicator (ISA-101 High Performance HMI standard).
// Highlights the compromised pipe segment and provides a clean, restrained telemetry callout.

import type { LiveAlert } from "@/types";
import { ZONES, type ZoneId } from "@/config/rig";

interface LeakEffectProps {
  alert: LiveAlert;
  vibrationRms?: number;
}

// Physical leak detection coordinate per zone along the pipe
const ZONE_LEAK_ANCHORS: Record<ZoneId, { x: number; y: number; isTop: boolean }> = {
  1: { x: 190, y: 190, isTop: true },
  2: { x: 350, y: 550, isTop: false },
  3: { x: 530, y: 190, isTop: true },
  4: { x: 710, y: 550, isTop: false },
  5: { x: 890, y: 190, isTop: true },
};

// Exact pipe run for each zone between bounding stations
const ZONE_PIPE_PATHS: Record<ZoneId, string> = {
  1: "M 120,360 L 120,190 L 260,190 L 260,360",
  2: "M 260,360 L 260,550 L 440,550 L 440,360",
  3: "M 440,360 L 440,190 L 620,190 L 620,360",
  4: "M 620,360 L 620,550 L 800,550 L 800,360",
  5: "M 800,360 L 800,190 L 980,190 L 980,360",
};

export function LeakEffect({ alert }: LeakEffectProps) {
  if (!alert.zoneId) return null;

  const zone = ZONES.find((z) => z.id === alert.zoneId);
  if (!zone) return null;

  const anchor = ZONE_LEAK_ANCHORS[alert.zoneId] ?? { x: 500, y: 360, isTop: true };
  const pipePath = ZONE_PIPE_PATHS[alert.zoneId];

  const isHigh = alert.severity === "high";
  const alertColor = isHigh ? "#ef4444" : "#f59e0b";

  // Banner positioned cleanly adjacent to the pipe run
  const bannerY = anchor.isTop ? anchor.y + 26 : anchor.y - 56;

  return (
    <g id={`leak-alarm-${alert.id}`} className="select-none font-mono">
      {/* ─── 1. COMPROMISED PIPE SEGMENT ALARM OVERLAY ─── */}
      {pipePath && (
        <g id={`pipe-alarm-zone-${alert.zoneId}`}>
          {/* Subtle warning glow along the pipe */}
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            className="animate-pulse"
          />
          {/* Inner alarm flow line */}
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
            opacity="0.85"
            className="animate-flow"
          />
        </g>
      )}

      {/* ─── 2. ORIFICE BREACH LOCATION TARGET (CLEAN SCADA CROSSHAIR) ─── */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Subtle pulsing indicator ring */}
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="none"
          stroke={alertColor}
          strokeWidth="1.2"
          className="animate-ping"
          opacity="0.6"
        />
        {/* Orifice marker */}
        <circle cx="0" cy="0" r="4.5" fill={alertColor} stroke="#0f1419" strokeWidth="1.5" />
        {/* Precision crosshair ticks */}
        <line x1="-8" y1="0" x2="-5" y2="0" stroke={alertColor} strokeWidth="1.2" />
        <line x1="5" y1="0" x2="8" y2="0" stroke={alertColor} strokeWidth="1.2" />
        <line x1="0" y1="-8" x2="0" y2="-5" stroke={alertColor} strokeWidth="1.2" />
        <line x1="0" y1="5" x2="0" y2="8" stroke={alertColor} strokeWidth="1.2" />
      </g>

      {/* ─── 3. CLEAN SCADA TELEMETRY CALLOUT TAG ─── */}
      <g transform={`translate(${anchor.x - 85}, ${bannerY})`}>
        {/* Minimalist industrial card */}
        <rect
          x="0"
          y="0"
          width="170"
          height="42"
          rx="5"
          fill="#0c1219"
          stroke={alertColor}
          strokeWidth="1.2"
        />

        {/* Status dot */}
        <circle cx="10" cy="13" r="3" fill={alertColor} className="animate-pulse" />

        {/* Header: Zone & Severity */}
        <text
          x="18"
          y="16"
          fill="#e8edf2"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="0.5"
        >
          {`ZONE ${alert.zoneId} LEAK DETECTED`}
        </text>

        {/* Confidence pill */}
        <text
          x="160"
          y="16"
          fill={alertColor}
          fontSize="8.5"
          fontWeight="bold"
          textAnchor="end"
        >
          {`${(alert.confidence * 100).toFixed(0)}%`}
        </text>

        {/* Divider */}
        <line x1="8" y1="23" x2="162" y2="23" stroke="#1e2733" strokeWidth="0.8" />

        {/* Telemetry data: Loss rate and flow delta */}
        <text
          x="10"
          y="34"
          fill="#7a8fa6"
          fontSize="8"
        >
          Rate:{" "}
          <tspan fill="#ef4444" fontWeight="bold">
            {alert.leakRate != null ? alert.leakRate.toFixed(1) : "4.8"} L/m
          </tspan>
          {" · "}ΔQ:{" "}
          <tspan fill="#00b4d8" fontWeight="bold">
            {`-${alert.features?.flowDifference != null ? alert.features.flowDifference.toFixed(1) : "4.0"} L/m`}
          </tspan>
        </text>
      </g>
    </g>
  );
}
