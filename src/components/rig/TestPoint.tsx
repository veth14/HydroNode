"use client";
// src/components/rig/TestPoint.tsx
// Manual leak injection valve on zone pipe segments.
// Users can click this valve to simulate an intentional orifice breach in that zone.

import type { TestPoint as TestPointType } from "@/config/rig";

interface TestPointProps {
  testPoint: TestPointType;
  onClick?: () => void;
  isLeaking?: boolean;
}

export function TestPoint({ testPoint, onClick, isLeaking }: TestPointProps) {
  // If at bottom pipe (y=550), handle points down; if top pipe (y=190), handle points up
  const isBottom = testPoint.y > 360;
  const handleDir = isBottom ? 1 : -1;

  return (
    <g
      transform={`translate(${testPoint.x}, ${testPoint.y})`}
      className="cursor-pointer group select-none"
      onClick={onClick}
      aria-label={`Leak Simulation Valve for Zone ${testPoint.zoneId} — Click to inject leak`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Active Leak Spray Ring */}
      {isLeaking && (
        <circle
          cx="0"
          cy="0"
          r="16"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          className="animate-ping"
          opacity="0.75"
        />
      )}

      {/* Pipe Tee-Fitting Collar */}
      <rect
        x="-10"
        y="-8"
        width="20"
        height="16"
        rx="2"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* Brass Ball Valve Body */}
      <circle
        cx="0"
        cy="0"
        r="7"
        fill={isLeaking ? "#ef4444" : "#b45309"}
        stroke={isLeaking ? "#fca5a5" : "#f59e0b"}
        strokeWidth="1.2"
        className="transition-colors"
      />

      {/* Orifice center aperture */}
      <circle cx="0" cy="0" r="2.5" fill="#0a0d12" />

      {/* Quarter-Turn Industrial Valve Lever */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={handleDir * 18}
        stroke={isLeaking ? "#ef4444" : "#f59e0b"}
        strokeWidth="3.5"
        strokeLinecap="round"
        className="group-hover:stroke-red-400 transition-colors"
      />
      <circle
        cx="0"
        cy={handleDir * 18}
        r="4"
        fill={isLeaking ? "#ef4444" : "#f59e0b"}
        stroke="#0a0d12"
        strokeWidth="1"
        className="group-hover:scale-125 transition-transform"
      />

      {/* Floating Tooltip / Micro Label on Hover */}
      <g
        transform={`translate(0, ${handleDir * 30})`}
        className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      >
        <rect
          x="-38"
          y="-9"
          width="76"
          height="18"
          rx="4"
          fill="#0f1419"
          stroke="#ef4444"
          strokeWidth="1"
        />
        <text
          x="0"
          y="3.5"
          fill="#fca5a5"
          fontSize="7"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {isLeaking ? "LEAK ACTIVE" : "SIMULATE LEAK"}
        </text>
      </g>
    </g>
  );
}
