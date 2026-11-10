"use client";
// src/components/rig/TestPoint.tsx
// Ball-valve test point port on vertical legs.
// In demo mode, users can click to simulate or inject a leak.

import type { TestPoint as TestPointType } from "@/config/rig";

interface TestPointProps {
  testPoint: TestPointType;
  onClick?: () => void;
  isLeaking?: boolean;
}

export function TestPoint({ testPoint, onClick, isLeaking }: TestPointProps) {
  return (
    <g
      transform={`translate(${testPoint.x}, ${testPoint.y})`}
      className="cursor-pointer group select-none"
      onClick={onClick}
      aria-label={`Test Point ${testPoint.id} on Zone ${testPoint.zoneId}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Tee fitting collar */}
      <rect
        x="-9"
        y="-7"
        width="18"
        height="14"
        rx="2"
        fill="#334155"
        stroke="#64748b"
        strokeWidth="1.5"
      />

      {/* Valve body */}
      <circle
        cx="0"
        cy="0"
        r="6"
        fill={isLeaking ? "#ef4444" : "#475569"}
        stroke="#cbd5e1"
        strokeWidth="1.2"
      />

      {/* Valve handle (quarter-turn lever) */}
      <line
        x1="0"
        y1="0"
        x2="15"
        y2="-4"
        stroke={isLeaking ? "#ef4444" : "#f59e0b"}
        strokeWidth="3"
        strokeLinecap="round"
        className="group-hover:stroke-red-400 transition-colors"
      />
      <circle
        cx="15"
        cy="-4"
        r="3.5"
        fill={isLeaking ? "#ef4444" : "#f59e0b"}
        className="group-hover:scale-125 transition-transform"
      />

      {/* Port orifice dot */}
      <circle cx="0" cy="0" r="2" fill="#0f172a" />
    </g>
  );
}

