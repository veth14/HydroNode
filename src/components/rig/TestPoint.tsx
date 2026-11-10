"use client";
// src/components/rig/TestPoint.tsx
// Manual leak simulation valve on zone pipe segments.

import type { TestPoint as TestPointType } from "@/config/rig";

interface TestPointProps {
  testPoint: TestPointType;
  onClick?: () => void;
  isLeaking?: boolean;
}

export function TestPoint({ testPoint, onClick, isLeaking }: TestPointProps) {
  const isBottom = testPoint.y > 360;
  const handleDir = isBottom ? 1 : -1;

  return (
    <g
      transform={`translate(${testPoint.x}, ${testPoint.y})`}
      className="cursor-pointer group select-none"
      onClick={onClick}
      aria-label={`Leak Simulation Valve for Zone ${testPoint.zoneId} — Click to toggle leak`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <title>{`Zone ${testPoint.zoneId} Leak Valve (Click to toggle)`}</title>
      {/* Active leak subtle pulse indicator */}
      {isLeaking && (
        <circle
          cx="0"
          cy="0"
          r="12"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.2"
          className="animate-ping"
          opacity="0.75"
        />
      )}

      {/* Pipe Tee-Fitting Collar */}
      <rect
        x="-8"
        y="-6"
        width="16"
        height="12"
        rx="2"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1"
      />

      {/* Valve Body */}
      <circle
        cx="0"
        cy="0"
        r="5.5"
        fill={isLeaking ? "#ef4444" : "#475569"}
        stroke={isLeaking ? "#fca5a5" : "#94a3b8"}
        strokeWidth="1"
        className="transition-colors"
      />

      {/* Valve Handle */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={handleDir * 14}
        stroke={isLeaking ? "#ef4444" : "#f59e0b"}
        strokeWidth="2.5"
        strokeLinecap="round"
        className="group-hover:stroke-red-400 transition-colors"
      />
      <circle
        cx="0"
        cy={handleDir * 14}
        r="3"
        fill={isLeaking ? "#ef4444" : "#f59e0b"}
      />
    </g>
  );
}
