"use client";
// src/components/rig/LeakEffect.tsx
// Professional industrial SCADA leak alarm indicator in Light Mode.
// High-visibility, crisp ISA-101 compliant visualization.

import type { LiveAlert } from "@/types";
import { ZONES, type ZoneId } from "@/config/rig";

interface LeakEffectProps {
  alert: LiveAlert;
  vibrationRms?: number;
}

const ZONE_LEAK_ANCHORS: Record<ZoneId, { x: number; y: number; isTop: boolean }> = {
  1: { x: 190, y: 190, isTop: true },
  2: { x: 350, y: 550, isTop: false },
  3: { x: 530, y: 190, isTop: true },
  4: { x: 710, y: 550, isTop: false },
  5: { x: 890, y: 190, isTop: true },
};

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
  const alertColor = isHigh ? "#dc2626" : "#d97706";

  const bannerY = anchor.isTop ? anchor.y + 26 : anchor.y - 56;

  return (
    <g id={`leak-alarm-${alert.id}`} className="select-none">
      {/* 1. Compromised Pipe Segment Alarm Outline */}
      {pipePath && (
        <g id={`pipe-alarm-zone-${alert.zoneId}`}>
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
            opacity="0.9"
            className="animate-flow"
          />
        </g>
      )}

      {/* 2. Orifice Breach Crosshair Target */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="none"
          stroke={alertColor}
          strokeWidth="1.2"
          className="animate-ping"
          opacity="0.5"
        />
        <circle cx="0" cy="0" r="4.5" fill={alertColor} stroke="#ffffff" strokeWidth="1.5" />
        <line x1="-8" y1="0" x2="-5" y2="0" stroke={alertColor} strokeWidth="1.5" />
        <line x1="5" y1="0" x2="8" y2="0" stroke={alertColor} strokeWidth="1.5" />
        <line x1="0" y1="-8" x2="0" y2="-5" stroke={alertColor} strokeWidth="1.5" />
        <line x1="0" y1="5" x2="0" y2="8" stroke={alertColor} strokeWidth="1.5" />
      </g>

      {/* 3. Telemetry Callout Card */}
      <g transform={`translate(${anchor.x - 85}, ${bannerY})`}>
        <rect
          x="0"
          y="0"
          width="170"
          height="42"
          rx="6"
          fill="#ffffff"
          stroke={alertColor}
          strokeWidth="1.5"
        />

        {/* Header: Zone & Severity */}
        <circle cx="10" cy="13" r="3" fill={alertColor} />
        <text
          x="18"
          y="16"
          fill="#0f172a"
          fontSize="9.5"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {`ZONE ${alert.zoneId} LEAK DETECTED`}
        </text>

        <text
          x="160"
          y="16"
          fill={alertColor}
          fontSize="8.5"
          fontWeight="bold"
          textAnchor="end"
          fontFamily="sans-serif"
        >
          {`${(alert.confidence * 100).toFixed(0)}%`}
        </text>

        <line x1="8" y1="23" x2="162" y2="23" stroke="#f1f5f9" strokeWidth="1" />

        <text
          x="10"
          y="34"
          fill="#475569"
          fontSize="8.5"
          fontFamily="monospace"
        >
          Rate:{" "}
          <tspan fill="#dc2626" fontWeight="bold">
            {alert.leakRate != null ? alert.leakRate.toFixed(1) : "4.8"} L/m
          </tspan>
          {" · "}ΔQ:{" "}
          <tspan fill="#0284c7" fontWeight="bold">
            {`-${alert.features?.flowDifference != null ? alert.features.flowDifference.toFixed(1) : "4.0"} L/m`}
          </tspan>
        </text>
      </g>
    </g>
  );
}
