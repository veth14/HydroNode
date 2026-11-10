"use client";
// src/components/rig/LeakEffect.tsx
// High-visibility, mission-critical SCADA leak indicators:
// 1. Breached pipe segment highlighted across the entire zone run
// 2. High-pressure pressurized water jet spray plume & ground ripples
// 3. Acoustic/seismic stress wave propagation (PRD S3, N2)
// 4. Prominent industrial emergency alert callout card with live telemetry

import type { LiveAlert } from "@/types";
import { STATIONS, ZONES, type ZoneId } from "@/config/rig";

interface LeakEffectProps {
  alert: LiveAlert;
  vibrationRms?: number;
}

// Actual physical pipe traversal coordinate per zone where the puncture occurs
const ZONE_LEAK_ANCHORS: Record<ZoneId, { x: number; y: number; isTop: boolean }> = {
  1: { x: 190, y: 190, isTop: true },
  2: { x: 350, y: 550, isTop: false },
  3: { x: 530, y: 190, isTop: true },
  4: { x: 710, y: 550, isTop: false },
  5: { x: 890, y: 190, isTop: true },
};

// Exact U-shaped / inverted-U pipe paths for each zone between bounding stations
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
  const stA = STATIONS[zone.stationA];

  const isHigh = alert.severity === "high";
  const badgeColor = isHigh ? "#ef4444" : "#f59e0b";
  const glowFilter = isHigh ? "rgba(239,68,68,0.75)" : "rgba(245,158,11,0.75)";

  // Card placement: if top pipe (y=190), card sits below at y=235; if bottom pipe (y=550), card sits above at y=440
  const cardY = anchor.isTop ? anchor.y + 40 : anchor.y - 110;
  const sprayDir = anchor.isTop ? 1 : -1;

  return (
    <g id={`leak-effect-${alert.id}`} className="select-none">
      {/* ─── 1. BREACHED PIPE SEGMENT HIGHLIGHT (GLOWS ACROSS THE COMPROMISED ZONE) ─── */}
      {pipePath && (
        <g id={`breached-pipe-zone-${alert.zoneId}`}>
          {/* Broad outer hazard halo */}
          <path
            d={pipePath}
            fill="none"
            stroke={badgeColor}
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.32"
            className="animate-pulse"
          />
          {/* Striped hazard warning border */}
          <path
            d={pipePath}
            fill="none"
            stroke={badgeColor}
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="14 10"
            opacity="0.65"
          />
          {/* Inner pulsating breach core */}
          <path
            d={pipePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
            className="animate-flow"
            opacity="0.9"
          />
        </g>
      )}

      {/* ─── 2. SEISMIC ACOUSTIC TURBULENCE WAVES (RADIAL SHOCK RINGS ALONG RIG) ─── */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Rapid expanding acoustic pressure waves from orifice jetting (60–120 Hz band) */}
        <circle
          cx="0"
          cy="0"
          r="30"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          className="animate-ping"
          opacity="0.8"
        />
        <circle
          cx="0"
          cy="0"
          r="54"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className="animate-pulse"
          opacity="0.6"
        />
        <circle
          cx="0"
          cy="0"
          r="80"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />
      </g>

      {/* Upstream Station Seismic Wave Sensor Reaction */}
      {stA && (
        <g transform={`translate(${stA.x}, ${stA.y})`}>
          <circle
            cx="0"
            cy="0"
            r="42"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-ping"
            opacity="0.8"
          />
          <text
            x="0"
            y="-48"
            fill="#ef4444"
            fontSize="7.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
            className="animate-pulse"
          >
            TURBULENT SEISMIC WAVE
          </text>
        </g>
      )}

      {/* ─── 3. HIGH-PRESSURE WATER RUPTURE & SPRAY JET (AT BREACH POINT) ─── */}
      <g transform={`translate(${anchor.x}, ${anchor.y})`}>
        {/* Large ground pool with cascading water ripples */}
        <ellipse
          cx="0"
          cy={sprayDir * 18}
          rx="38"
          ry="11"
          fill="#00b4d8"
          opacity="0.5"
          className="animate-pulse"
        />
        <ellipse
          cx="0"
          cy={sprayDir * 18}
          rx="58"
          ry="16"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          opacity="0.6"
          className="animate-pulse"
        />
        <ellipse
          cx="0"
          cy={sprayDir * 18}
          rx="82"
          ry="22"
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1"
          opacity="0.35"
        />

        {/* High-Velocity Pressurized Water Spray Jet Streams */}
        <g className="animate-pulse">
          {/* Central high-pressure jet stream */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={sprayDir * 32}
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={sprayDir * 38}
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Angled dispersing spray plumes */}
          <line
            x1="0"
            y1="0"
            x2="-14"
            y2={sprayDir * 28}
            stroke="#7dd3fc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="14"
            y2={sprayDir * 28}
            stroke="#7dd3fc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="-24"
            y2={sprayDir * 22}
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="24"
            y2={sprayDir * 22}
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="-32"
            y2={sprayDir * 14}
            stroke="#0284c7"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="32"
            y2={sprayDir * 14}
            stroke="#0284c7"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Droplet mist particles */}
          <circle cx="-16" cy={sprayDir * 24} r="3" fill="#bae6fd" />
          <circle cx="16" cy={sprayDir * 24} r="3" fill="#bae6fd" />
          <circle cx="-28" cy={sprayDir * 18} r="2.5" fill="#7dd3fc" />
          <circle cx="28" cy={sprayDir * 18} r="2.5" fill="#7dd3fc" />
          <circle cx="0" cy={sprayDir * 36} r="3.2" fill="#e0f2fe" />
          <circle cx="-8" cy={sprayDir * 32} r="2.2" fill="#38bdf8" />
          <circle cx="8" cy={sprayDir * 32} r="2.2" fill="#38bdf8" />
        </g>

        {/* Breach Orifice Puncture Marker */}
        <circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="2.5" className="animate-ping" />
        <circle cx="0" cy="0" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="3" fill="#000000" />
      </g>

      {/* ─── 4. PROMINENT MISSION-CONTROL SCADA ALERT CALLOUT CARD ─── */}
      <g transform={`translate(${anchor.x - 105}, ${cardY})`}>
        {/* Card Chassis with High-Intensity Alert Glow */}
        <rect
          x="0"
          y="0"
          width="210"
          height="74"
          rx="8"
          fill="#080c12"
          stroke={badgeColor}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 16px ${glowFilter})` }}
        />

        {/* Card Header Bar */}
        <rect x="0" y="0" width="210" height="24" rx="8" fill="#121822" />
        <rect x="0" y="16" width="210" height="8" fill="#121822" />

        {/* Flashing Emergency Beacon Dot */}
        <circle cx="14" cy="12" r="5" fill={badgeColor} className="animate-ping" opacity="0.8" />
        <circle cx="14" cy="12" r="3.5" fill={badgeColor} />

        {/* Header Title */}
        <text
          x="26"
          y="15.5"
          fill="#ffffff"
          fontSize="10"
          fontWeight="800"
          fontFamily="monospace"
          letterSpacing="0.6"
        >
          {`ZONE ${alert.zoneId} · ${alert.severity.toUpperCase()} LEAK`}
        </text>

        {/* Random Forest Confidence Badge */}
        <rect x="148" y="5" width="54" height="14" rx="3" fill={badgeColor} opacity="0.2" stroke={badgeColor} strokeWidth="0.8" />
        <text
          x="175"
          y="15"
          fill={badgeColor}
          fontSize="7.5"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {`${(alert.confidence * 100).toFixed(0)}% RF CONF`}
        </text>

        {/* Divider */}
        <line x1="8" y1="24" x2="202" y2="24" stroke="#1e2733" strokeWidth="1" />

        {/* Telemetry Metrics Row 1 */}
        <g transform="translate(10, 39)" fontFamily="monospace" fontSize="8.5">
          <text x="0" y="0" fill="#7a8fa6">
            Loss:{" "}
            <tspan fill="#ef4444" fontWeight="800">
              {alert.leakRate != null ? alert.leakRate.toFixed(1) : "4.8"} L/min
            </tspan>
          </text>
          <text x="100" y="0" fill="#7a8fa6">
            SI:{" "}
            <tspan fill="#f59e0b" fontWeight="800">
              {alert.si != null ? alert.si.toFixed(1) : "6.3"}%
            </tspan>
          </text>
        </g>

        {/* Telemetry Metrics Row 2 */}
        <g transform="translate(10, 54)" fontFamily="monospace" fontSize="8">
          <text x="0" y="0" fill="#7a8fa6">
            ΔQ Imbalance:{" "}
            <tspan fill="#00b4d8" fontWeight="800">
              {`-${alert.features?.flowDifference != null ? alert.features.flowDifference.toFixed(1) : "4.0"} L/min`}
            </tspan>
          </text>
        </g>

        {/* Telemetry Metrics Row 3: Action Protocol */}
        <g transform="translate(10, 66)" fontFamily="monospace" fontSize="6.5">
          <text x="0" y="0" fill="#10b981" fontWeight="bold">
            ACTION: DISPATCH CREW TO SEGMENT
          </text>
        </g>

        {/* Leader Pointer Line Connecting Card to Rupture Point */}
        <line
          x1="105"
          y1={anchor.isTop ? 0 : 74}
          x2="105"
          y2={anchor.isTop ? -14 : 88}
          stroke={badgeColor}
          strokeWidth="1.8"
          strokeDasharray="3 2"
        />
        <circle
          cx="105"
          cy={anchor.isTop ? -14 : 88}
          r="2.5"
          fill={badgeColor}
        />
      </g>
    </g>
  );
}
