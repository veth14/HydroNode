"use client";
// src/components/rig/ZoneBand.tsx
// Translucent colored zone band behind the pipe in Light Mode.
// High-contrast, clean industrial styling.

import type { ZoneMeta } from "@/config/rig";
import type { Severity } from "@/types";
import { useHydroStore } from "@/store/hydroStore";

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
  const architectureMode = useHydroStore((s) => s.architectureMode);
  const isDormant = architectureMode === "4x3" && (zone.id === 4 || zone.id === 5);

  const { bandRect, labelPos, id } = zone;

  const isAlert = !isDormant && (severity === "high" || severity === "medium");

  const fillColor =
    severity === "high"
      ? "#fef2f2"
      : severity === "medium"
      ? "#fffbeb"
      : isSelected
      ? "#f0f9ff"
      : "#ffffff";

  const strokeColor =
    severity === "high"
      ? "#dc2626"
      : severity === "medium"
      ? "#d97706"
      : isSelected
      ? "#0284c7"
      : "#e2e8f0";

  return (
    <g
      id={`zone-band-${id}`}
      className={`cursor-pointer select-none group transition-opacity ${isDormant ? "opacity-30 pointer-events-none" : "opacity-100"}`}
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
        stroke={strokeColor}
        strokeWidth={isAlert ? "2" : isSelected ? "1.5" : "1"}
        strokeDasharray={isAlert ? "6 4" : "none"}
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
            fill="#ffffff"
            stroke={isAlert ? strokeColor : isSelected ? "#0284c7" : "#cbd5e1"}
            strokeWidth={isAlert || isSelected ? "1.5" : "1"}
            className="transition-colors group-hover:stroke-sky-600 shadow-xs"
          />
          <text
            x="0"
            y="3"
            fill={isAlert ? strokeColor : isSelected ? "#0284c7" : "#475569"}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="0.5"
            fontFamily="sans-serif"
          >
            {isDormant ? `ZONE ${id} (EXP)` : `ZONE ${id}`}
          </text>
        </g>
      )}
    </g>
  );
}
