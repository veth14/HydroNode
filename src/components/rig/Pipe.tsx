"use client";
// src/components/rig/Pipe.tsx
// Layered SVG PVC pipe with cylindrical highlight, fittings, and animated water flow.

import { SERPENTINE_PIPE_PATH, ELBOW_FITTINGS } from "@/config/rig";

interface PipeProps {
  waterColor?: string;
  flowSpeedSeconds?: number;
  hasActiveLeak?: boolean;
}

export function Pipe({
  waterColor = "#0284c7",
  flowSpeedSeconds = 1.8,
  hasActiveLeak = false,
}: PipeProps) {
  // When an active leak is present, downstream velocity drops and pressure falls
  const effectiveSpeed = hasActiveLeak ? 3.6 : flowSpeedSeconds;
  const effectiveColor = hasActiveLeak ? "#0369a1" : waterColor;

  return (
    <g id="pipe-assembly">
      {/* Soft Drop Shadow for Pipe */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#0f172a"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        transform="translate(0, 5)"
      />

      {/* Outer PVC Wall (Dark Slate Border) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#334155"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* PVC Body (Light Gray Pipe) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cylindrical Highlight along pipe crown */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#f8fafc"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
        transform="translate(0, -2)"
      />

      {/* Inner Water Channel (Color deepens with pressure) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke={effectiveColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Animated Flow Texture (Stroke-dasharray) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="14 18"
        className="animate-flow"
        style={{ animationDuration: `${effectiveSpeed}s` }}
      />

      {/* PVC Elbow Fittings (Reinforcement collars at each 90-degree bend) */}
      {ELBOW_FITTINGS.map(([x, y], idx) => (
        <g key={`elbow-${idx}`}>
          <circle
            cx={x}
            cy={y}
            r="16"
            fill="none"
            stroke="#475569"
            strokeWidth="4"
          />
          <circle
            cx={x}
            cy={y}
            r="13"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />
        </g>
      ))}

      {/* Pipe Clamps to Workbench (Anchoring pipe at top and bottom of each vertical run) */}
      {[
        [120, 220], [120, 505],
        [260, 220], [260, 505],
        [440, 220], [440, 505],
        [620, 220], [620, 505],
        [800, 220], [800, 505],
        [980, 220], [980, 505],
      ].map(([cx, cy], i) => (
        <rect
          key={`clamp-${i}`}
          x={cx - 16}
          y={cy - 2}
          width="32"
          height="4"
          rx="1"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="0.8"
          opacity="0.7"
        />
      ))}
    </g>
  );
}
