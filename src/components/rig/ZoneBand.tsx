"use client";
// src/components/rig/ZoneBand.tsx
// Translucent colored zone band behind the pipe with alternating labels.
// High-contrast industrial SCADA styling.

import type { ZoneMeta } from "@/config/rig";
import type { Severity } from "@/types";

interface ZoneBandProps {
  zone: ZoneMeta;
  severity: Severity | null;
  isSelected?: boolean;
  showLabels?: boolean;
  onClick?: () => void;
}

export function ZoneBand({
  zone,
  severity,
  isSelected,
  showLabels = true,
  onClick,
}: ZoneBandProps) {
  const { bandRect, labelPos, id } = zone;

  const isAlert = severity === "high" || severity === "medium";

  const fillColor =
    severity === "high"
      ? "#ef4444"
      : severity === "medium"
      ? "#f59e0b"
      : isSelected
      ? "#00b4d8"
      : "#1e293b";

  const strokeColor =
    severity === "high"
      ? "#ef4444"
      : severity === "medium"
      ? "#f59e0b"
      : isSelected
      ? "#00b4d8"
      : "#1e2733";

  const fillOpacity = severity === "high" ? 0.28 : severity === "medium" ? 0.22 : isSelected ? 0.15 : 0.05;

  return (
    <g
      id={`zone-band-${id}`}
      className="cursor-pointer select-none group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Zone ${id} pipe segment. Status: ${severity ?? "nominal"}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Translucent background highlight band */}
      <rect
        x={bandRect.x}
        y={bandRect.y}
        width={bandRect.width}
        height={bandRect.height}
        rx="12"
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={isAlert ? "2.5" : isSelected ? "1.8" : "1"}
        strokeDasharray={isAlert ? "6 4" : "none"}
        className={isAlert ? "animate-pulse" : ""}
      />

      {/* Zone Label ("ZONE n") */}
      {showLabels && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <rect
            x="-44"
            y="-13"
            width="88"
            height="24"
            rx="6"
            fill="#0f1419"
            stroke={isAlert ? strokeColor : isSelected ? "#00b4d8" : "#1e2733"}
            strokeWidth={isAlert || isSelected ? "1.5" : "1"}
            className="transition-colors group-hover:border-[#00b4d8]"
          />
          <text
            x="0"
            y="3"
            fill={isAlert ? strokeColor : isSelected ? "#00b4d8" : "#7a8fa6"}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="0.8"
            fontFamily="monospace"
          >
            {`ZONE ${id}`}
          </text>
        </g>
      )}
    </g>
  );
}
