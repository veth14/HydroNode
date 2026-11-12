"use client";
// src/components/rig/LeakEffect.tsx
// Animated industrial leak effect — water spray particles, drip droplets,
// pressure ripple rings, spreading puddle, and pulsing zone band.
// All animation is CSS @keyframes (GPU-accelerated, zero JS timers / no React re-renders).

import type { LiveAlert } from "@/types";
import { ZONES, type ZoneId } from "@/config/rig";

interface LeakEffectProps {
  alert: LiveAlert;
  vibrationRms?: number;
}

/* ── Anchor: the precise orifice point on each zone ─────────────────────── */
const ZONE_LEAK_ANCHORS: Record<ZoneId, { x: number; y: number; isTop: boolean }> = {
  1: { x: 190, y: 190, isTop: true  },
  2: { x: 350, y: 550, isTop: false },
  3: { x: 530, y: 190, isTop: true  },
  4: { x: 710, y: 550, isTop: false },
  5: { x: 890, y: 190, isTop: true  },
};

/* ── Zone pipe outlines (kept for the pulsing band) ─────────────────────── */
const ZONE_PIPE_PATHS: Record<ZoneId, string> = {
  1: "M 120,360 L 120,190 L 260,190 L 260,360",
  2: "M 260,360 L 260,550 L 440,550 L 440,360",
  3: "M 440,360 L 440,190 L 620,190 L 620,360",
  4: "M 620,360 L 620,550 L 800,550 L 800,360",
  5: "M 800,360 L 800,190 L 980,190 L 980,360",
};

/* ── Spray vectors: [dx, dy] for 8 directions ────────────────────────────── */
const SPRAY_DIRS = [
  [-18, -22],   // NW
  [  0, -26],   // N
  [ 18, -22],   // NE
  [ 26, -10],   // E-N
  [ 26,  10],   // E-S
  [ 18,  22],   // SE
  [-18,  22],   // SW
  [-26,  10],   // W-S
] as const;

/* ── Mist cloud offsets ──────────────────────────────────────────────────── */
const MIST_OFFSETS = [
  { mx: "-6px", my: "-18px", delay: "0s",    dur: "1.1s" },
  { mx:  "8px", my: "-20px", delay: "0.4s",  dur: "1.4s" },
  { mx: "-2px", my: "-14px", delay: "0.8s",  dur: "1.0s" },
  { mx: "12px", my: "-12px", delay: "0.2s",  dur: "1.3s" },
  { mx: "-14px",my: "-10px", delay: "0.6s",  dur: "1.2s" },
];

/* ── Drip vertical offsets (staggered timing) ────────────────────────────── */
const DRIPS = [
  { ox: -6,  delay: "0.0s", dur: "0.95s" },
  { ox:  2,  delay: "0.3s", dur: "1.10s" },
  { ox: -2,  delay: "0.6s", dur: "0.85s" },
  { ox:  7,  delay: "0.9s", dur: "1.00s" },
];

export function LeakEffect({ alert }: LeakEffectProps) {
  if (!alert.zoneId) return null;

  const zone = ZONES.find((z) => z.id === alert.zoneId);
  if (!zone) return null;

  const anchor   = ZONE_LEAK_ANCHORS[alert.zoneId] ?? { x: 500, y: 360, isTop: true };
  const pipePath = ZONE_PIPE_PATHS[alert.zoneId];

  const isHigh     = alert.severity === "high";
  const alertColor = isHigh ? "#dc2626" : "#d97706";
  const waterColor = "#3b82f6";   // bright water-blue for particles
  const mistColor  = "#93c5fd";   // lighter blue for mist

  /* Callout card: above anchor for top-of-pipe, below for bottom-of-pipe */
  const bannerY = anchor.isTop ? anchor.y + 26 : anchor.y - 56;

  /* Drip direction: downward from bottom anchors, upward spray from top */
  const dripDir = anchor.isTop ? 1 : -1;

  return (
    <g
      id={`leak-alarm-${alert.id}`}
      className="select-none"
      style={{
        /* Entrance: scale up + fade in from the orifice anchor point */
        animation: "leak-enter 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        transformOrigin: `${anchor.x}px ${anchor.y}px`,
      }}
    >

      {/* ── 1. ZONE BAND: pulsing opacity highlight ─────────────────────── */}
      {pipePath && (
        <g id={`pipe-alarm-zone-${alert.zoneId}`}>
          {/* Pulsing fill band */}
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "leak-band-pulse 1.5s ease-in-out infinite" }}
          />
          {/* Dashed flow outline */}
          <path
            d={pipePath}
            fill="none"
            stroke={alertColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
            opacity="0.9"
            className="animate-flow"
          />
        </g>
      )}

      {/* ── 2. PRESSURE RIPPLE RINGS (3 staggered) ──────────────────────── */}
      {[0, 0.5, 1.0].map((delay, i) => (
        <circle
          key={`ripple-${i}`}
          cx={anchor.x}
          cy={anchor.y}
          r="2"
          fill="none"
          stroke={alertColor}
          strokeWidth="1.5"
          style={{
            animation: `leak-ripple 1.5s ease-out ${delay}s infinite`,
            transformOrigin: `${anchor.x}px ${anchor.y}px`,
          }}
        />
      ))}

      {/* ── 3. SPRAY PARTICLES (8 directions) ───────────────────────────── */}
      {SPRAY_DIRS.map(([dx, dy], i) => (
        <circle
          key={`spray-${i}`}
          cx={anchor.x}
          cy={anchor.y}
          r="2.2"
          fill={waterColor}
          style={{
            animation: `leak-spray-${i} ${0.6 + (i % 3) * 0.1}s ease-out ${(i * 0.08).toFixed(2)}s infinite`,
          }}
        />
      ))}

      {/* ── 4. MIST CLOUDS (soft blurred circles) ───────────────────────── */}
      {MIST_OFFSETS.map((m, i) => (
        <circle
          key={`mist-${i}`}
          cx={anchor.x}
          cy={anchor.y}
          r="5"
          fill={mistColor}
          opacity="0"
          style={{
            /* CSS custom properties drive the mist keyframe translation */
            ["--mx" as string]: m.mx,
            ["--my" as string]: m.my,
            filter: "blur(2px)",
            animation: `leak-mist ${m.dur} ease-out ${m.delay} infinite`,
            transformOrigin: `${anchor.x}px ${anchor.y}px`,
          }}
        />
      ))}

      {/* ── 5. DRIP DROPLETS (fall in dripDir) ──────────────────────────── */}
      {DRIPS.map((d, i) => (
        <ellipse
          key={`drip-${i}`}
          cx={anchor.x + d.ox}
          cy={anchor.y}
          rx="1.8"
          ry="2.8"
          fill={waterColor}
          opacity="0"
          style={{
            animation: `leak-drip ${d.dur} ease-in ${d.delay} infinite`,
            transformOrigin: `${anchor.x + d.ox}px ${anchor.y}px`,
            transform: dripDir === -1 ? "scaleY(-1)" : undefined,
          }}
        />
      ))}

      {/* ── 6. SPREADING PUDDLE (at base) ───────────────────────────────── */}
      <ellipse
        cx={anchor.x}
        cy={anchor.y + (anchor.isTop ? 14 : -14)}
        rx="0"
        ry="0"
        fill={waterColor}
        style={{
          animation: "leak-puddle 2.5s ease-out 0.2s infinite",
          transformOrigin: `${anchor.x}px ${anchor.y + (anchor.isTop ? 14 : -14)}px`,
        }}
      />

      {/* ── 7. ORIFICE BREACH CROSSHAIR ─────────────────────────────────── */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Outer ping ring */}
        <circle
          cx="0" cy="0" r="14"
          fill="none"
          stroke={alertColor}
          strokeWidth="1.2"
          className="animate-ping"
          opacity="0.5"
        />
        {/* Core dot */}
        <circle cx="0" cy="0" r="4.5" fill={alertColor} stroke="#ffffff" strokeWidth="1.5" />
        {/* Crosshair ticks */}
        <line x1="-8" y1="0" x2="-5" y2="0" stroke={alertColor} strokeWidth="1.5" />
        <line x1="5"  y1="0" x2="8"  y2="0" stroke={alertColor} strokeWidth="1.5" />
        <line x1="0"  y1="-8" x2="0" y2="-5" stroke={alertColor} strokeWidth="1.5" />
        <line x1="0"  y1="5"  x2="0" y2="8"  stroke={alertColor} strokeWidth="1.5" />
      </g>

      {/* ── 8. TELEMETRY CALLOUT CARD ────────────────────────────────────── */}
      <g
        transform={`translate(${anchor.x - 85}, ${bannerY})`}
        style={{
          animation: "leak-card-in 0.4s ease-out 0.5s both",
        }}
      >
        {/* Card background */}
        <rect
          x="0" y="0" width="170" height="42"
          rx="6"
          fill="#ffffff"
          stroke={alertColor}
          strokeWidth="1.5"
          filter="url(#card-shadow)"
        />

        {/* Blinking status dot */}
        <circle cx="10" cy="13" r="3" fill={alertColor} className="animate-pulse" />

        {/* Zone + severity label */}
        <text
          x="18" y="16"
          fill="#0f172a"
          fontSize="9.5"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {`ZONE ${alert.zoneId} LEAK DETECTED`}
        </text>

        {/* Confidence % */}
        <text
          x="160" y="16"
          fill={alertColor}
          fontSize="8.5"
          fontWeight="bold"
          textAnchor="end"
          fontFamily="sans-serif"
        >
          {`${(alert.confidence * 100).toFixed(0)}%`}
        </text>

        <line x1="8" y1="23" x2="162" y2="23" stroke="#f1f5f9" strokeWidth="1" />

        {/* Rate / ΔQ telemetry row */}
        <text x="10" y="34" fill="#475569" fontSize="8.5" fontFamily="monospace">
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
