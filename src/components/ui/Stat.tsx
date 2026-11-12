"use client";
// src/components/ui/Stat.tsx
// Ultra-Premium Stat Card matching FlowAI / Modern SaaS reference design.
// - Pure white surface with soft diffused shadow
// - Dark emblem icon + crisp title
// - Large bold metric
// - Dotted ring trend indicator at footer

import React from "react";
import { CircleDot } from "lucide-react";

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
    iconBg: "bg-slate-900 text-white",
    footerText: "text-slate-500",
    dotColor: "text-slate-400",
  },
  success: {
    iconBg: "bg-slate-900 text-white",
    footerText: "text-emerald-700",
    dotColor: "text-emerald-500",
  },
  critical: {
    iconBg: "bg-red-600 text-white",
    footerText: "text-red-600",
    dotColor: "text-red-500",
  },
  warning: {
    iconBg: "bg-amber-500 text-white",
    footerText: "text-amber-700",
    dotColor: "text-amber-500",
  },
  accent: {
    iconBg: "bg-sky-600 text-white",
    footerText: "text-sky-700",
    dotColor: "text-sky-500",
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-premium transition-all hover:shadow-floating hover:border-slate-300 select-none flex flex-col justify-between">
      {/* Top Header: Dark emblem + Label */}
      <div className="flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded-md ${t.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
          {icon ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-3 h-3 text-white" }) : (
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </div>
        <span className="text-xs font-medium text-slate-500 tracking-tight truncate">
          {label}
        </span>
        {badge && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric */}
      <div className="mt-3.5 mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-sans tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {/* Footer: Dotted Ring indicator + Trend / Subtext */}
      {(subtext || trend) && (
        <div className="flex items-center justify-between text-xs pt-1">
          <div className={`flex items-center gap-1.5 font-medium ${t.footerText}`}>
            <CircleDot className={`w-3.5 h-3.5 ${t.dotColor}`} />
            <span>{trend ? `${trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}${trend.label}` : subtext}</span>
          </div>
          <CircleDot className="w-3 h-3 text-slate-200" />
        </div>
      )}
    </div>
  );
}
