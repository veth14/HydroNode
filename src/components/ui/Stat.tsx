"use client";
// src/components/ui/Stat.tsx
// High-contrast industrial metric card in Light Mode.
// Follows 20 Rules:
// - Rule 4: Mono only for numbers, sans-serif for labels
// - Rule 14: Inner radius = outer - padding
// - Rule 15: High WCAG AAA contrast
// - Rule 18: Tabular numbers for non-jittering updates

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
    val: "text-slate-900",
    border: "border-slate-200 bg-white",
    iconColor: "text-slate-500",
  },
  critical: {
    val: "text-red-700",
    border: "border-red-200 bg-red-50/40",
    iconColor: "text-red-600",
  },
  warning: {
    val: "text-amber-800",
    border: "border-amber-200 bg-amber-50/40",
    iconColor: "text-amber-600",
  },
  success: {
    val: "text-emerald-700",
    border: "border-emerald-200 bg-emerald-50/40",
    iconColor: "text-emerald-600",
  },
  accent: {
    val: "text-sky-700",
    border: "border-sky-200 bg-sky-50/40",
    iconColor: "text-sky-600",
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
      className={`relative border ${t.border} rounded-xl p-4 flex flex-col justify-between transition-all select-none shadow-xs hover:shadow-sm hover:border-slate-300`}
    >
      {/* Header: Label + Icon */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 gap-2">
        <span className="truncate">{label}</span>
        {icon && <span className={`shrink-0 ${t.iconColor}`}>{icon}</span>}
      </div>

      {/* Main Metric */}
      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${t.val}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-500">
            {unit}
          </span>
        )}
        {badge && (
          <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      {/* Footer: Trend / Subtext */}
      {(subtext || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {subtext && <span className="truncate">{subtext}</span>}
          {trend && (
            <span
              className={`ml-auto font-medium ${
                trend.direction === "up"
                  ? "text-red-600"
                  : trend.direction === "down"
                  ? "text-emerald-600"
                  : "text-slate-600"
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
