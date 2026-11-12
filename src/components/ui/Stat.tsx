"use client";
// src/components/ui/Stat.tsx
// Visually rich Stat Card with colored accent bar, gradient tint, and depth.

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    accentBar:  "bg-slate-300",
    iconBg:     "bg-slate-900",
    iconText:   "text-white",
    valueTint:  "text-slate-900",
    footerText: "text-slate-500",
    trendUp:    "text-emerald-600 bg-emerald-50 border-emerald-200",
    trendDown:  "text-red-600 bg-red-50 border-red-200",
    trendFlat:  "text-slate-500 bg-slate-100 border-slate-200",
    cardBg:     "bg-white",
    glow:       "",
  },
  success: {
    accentBar:  "bg-emerald-500",
    iconBg:     "bg-emerald-500",
    iconText:   "text-white",
    valueTint:  "text-slate-900",
    footerText: "text-emerald-700",
    trendUp:    "text-emerald-600 bg-emerald-50 border-emerald-200",
    trendDown:  "text-red-600 bg-red-50 border-red-200",
    trendFlat:  "text-emerald-600 bg-emerald-50 border-emerald-200",
    cardBg:     "bg-white",
    glow:       "",
  },
  critical: {
    accentBar:  "bg-red-500",
    iconBg:     "bg-red-500",
    iconText:   "text-white",
    valueTint:  "text-red-700",
    footerText: "text-red-600",
    trendUp:    "text-red-600 bg-red-50 border-red-200",
    trendDown:  "text-emerald-600 bg-emerald-50 border-emerald-200",
    trendFlat:  "text-red-600 bg-red-50 border-red-200",
    cardBg:     "bg-white",
    glow:       "shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_24px_rgba(239,68,68,0.08)]",
  },
  warning: {
    accentBar:  "bg-amber-400",
    iconBg:     "bg-amber-500",
    iconText:   "text-white",
    valueTint:  "text-slate-900",
    footerText: "text-amber-700",
    trendUp:    "text-amber-700 bg-amber-50 border-amber-200",
    trendDown:  "text-emerald-600 bg-emerald-50 border-emerald-200",
    trendFlat:  "text-amber-700 bg-amber-50 border-amber-200",
    cardBg:     "bg-white",
    glow:       "",
  },
  accent: {
    accentBar:  "bg-sky-500",
    iconBg:     "bg-sky-600",
    iconText:   "text-white",
    valueTint:  "text-sky-700",
    footerText: "text-sky-700",
    trendUp:    "text-sky-700 bg-sky-50 border-sky-200",
    trendDown:  "text-red-600 bg-red-50 border-red-200",
    trendFlat:  "text-sky-600 bg-sky-50 border-sky-200",
    cardBg:     "bg-white",
    glow:       "",
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

  const trendStyle =
    trend?.direction === "up"
      ? t.trendUp
      : trend?.direction === "down"
      ? t.trendDown
      : t.trendFlat;

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <div
      className={`relative ${t.cardBg} border border-slate-200/80 rounded-2xl overflow-hidden select-none
        transition-all duration-200 hover:-translate-y-0.5 group
        shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)]
        ${t.glow}`}
    >
      {/* Top colored accent bar */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${t.accentBar}`} />

      <div className="p-5 pt-6 flex flex-col gap-3">
        {/* Header: Icon badge + Label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl ${t.iconBg} ${t.iconText} flex items-center justify-center shrink-0
                shadow-[0_2px_8px_rgba(0,0,0,0.15)]`}
            >
              {icon
                ? React.cloneElement(
                    icon as React.ReactElement<{ className?: string }>,
                    { className: "w-4 h-4" }
                  )
                : <span className="w-2 h-2 rounded-full bg-white/70" />}
            </div>
            <span className="text-xs font-semibold text-slate-500 tracking-tight truncate leading-tight">
              {label}
            </span>
          </div>
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {badge}
            </span>
          )}
        </div>

        {/* Main Metric */}
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tracking-tight ${t.valueTint} font-sans tabular-nums leading-none`}>
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-slate-400 leading-none mb-0.5">
              {unit}
            </span>
          )}
        </div>

        {/* Footer trend pill or subtext */}
        {(trend || subtext) && (
          <div className="flex items-center gap-2 pt-0.5 border-t border-slate-100">
            {trend ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${trendStyle}`}
              >
                <TrendIcon className="w-3 h-3" />
                {trend.label}
              </span>
            ) : (
              <span className={`text-[11px] font-medium ${t.footerText}`}>
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
