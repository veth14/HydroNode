"use client";
// src/components/ui/Stat.tsx
// High-contrast industrial metric card with tabular numerals and trend/subtext.
// Rule 14: Inner radius = outer - padding (outer: rounded-xl [12px], padding: p-4 [16px])
// Rule 18: Tabular nums for all values

import React from "react";

interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: "default" | "critical" | "warning" | "success" | "accent";
  trend?: { direction: "up" | "down" | "flat"; label: string };
  badge?: string;
}

const toneMap = {
  default: {
    val: "text-slate-100",
    border: "border-[#1e2733]",
    glow: "",
    iconColor: "text-slate-400",
  },
  critical: {
    val: "text-red-400",
    border: "border-red-900/60 bg-red-950/15",
    glow: "shadow-[0_0_24px_-6px_rgba(239,68,68,0.25)]",
    iconColor: "text-red-400",
  },
  warning: {
    val: "text-amber-400",
    border: "border-amber-900/60 bg-amber-950/15",
    glow: "",
    iconColor: "text-amber-400",
  },
  success: {
    val: "text-emerald-400",
    border: "border-emerald-900/60 bg-emerald-950/10",
    glow: "",
    iconColor: "text-emerald-400",
  },
  accent: {
    val: "text-cyan-400",
    border: "border-cyan-900/60 bg-cyan-950/15",
    glow: "shadow-[0_0_24px_-6px_rgba(0,180,216,0.25)]",
    iconColor: "text-cyan-400",
  },
};

export function Stat({
  label,
  value,
  unit,
  subtext,
  icon,
  tone = "default",
  trend,
  badge,
}: StatProps) {
  const t = toneMap[tone];

  return (
    <div
      className={`relative bg-[#0f1419] border ${t.border} ${t.glow} rounded-xl p-4 flex flex-col justify-between transition-all select-none hover:border-[#2a3644]`}
    >
      {/* Header: Label + Icon */}
      <div className="flex items-center justify-between text-xs font-medium text-[#7a8fa6] gap-2">
        <span className="truncate">{label}</span>
        {icon && <span className={`shrink-0 ${t.iconColor}`}>{icon}</span>}
      </div>

      {/* Main Metric */}
      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${t.val}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium text-[#7a8fa6]">
            {unit}
          </span>
        )}
        {badge && (
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1a2230] text-[#7a8fa6] border border-[#263140]">
            {badge}
          </span>
        )}
      </div>

      {/* Footer: Trend / Subtext */}
      {(subtext || trend) && (
        <div className="mt-2 pt-2 border-t border-[#1a2230] flex items-center justify-between text-[11px] text-[#4a5a6e]">
          {subtext && <span className="truncate">{subtext}</span>}
          {trend && (
            <span
              className={`ml-auto font-medium ${
                trend.direction === "up"
                  ? "text-red-400"
                  : trend.direction === "down"
                  ? "text-emerald-400"
                  : "text-[#7a8fa6]"
              }`}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"}{" "}
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
