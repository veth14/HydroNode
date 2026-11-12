"use client";
// src/components/rig/Pipe.tsx
// Industrial Schedule-40 PVC Pipe Assembly in Light Mode.
// High-visibility, crisp engineering presentation with animated water flow.

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
  const effectiveSpeed = hasActiveLeak ? 3.2 : flowSpeedSeconds;
  const effectiveColor = hasActiveLeak ? "#0369a1" : waterColor;

  return (
    <g id="pipe-assembly">
      {/* Soft Light Shadow for Pipe */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.2"
        transform="translate(0, 4)"
      />

      {/* Outer PVC Pipe Wall (Clean Slate Border) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* PVC Body (Clean White/Off-white Schedule-40 PVC) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Pressurized Water Channel */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke={effectiveColor}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Animated Flow Texture (Stroke-dasharray) */}
      <path
        d={SERPENTINE_PIPE_PATH}
        fill="none"
        stroke="#bae6fd"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="12 16"
        className="animate-flow"
        style={{ animationDuration: `${effectiveSpeed}s` }}
      />

      {/* PVC Elbow Fittings (Reinforcement collars at each 90-degree bend) */}
      {ELBOW_FITTINGS.map(([x, y], idx) => (
        <g key={`elbow-${idx}`}>
          <circle
            cx={x}
            cy={y}
            r="15"
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="2.5"
          />
          <circle
            cx={x}
            cy={y}
            r="8"
            fill={effectiveColor}
            opacity="0.8"
          />
        </g>
      ))}
    </g>
  );
}
