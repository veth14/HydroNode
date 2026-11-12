"use client";
// src/components/layout/Sidebar.tsx
// High-contrast industrial SCADA sidebar in Light Mode.
// Follows 20 Rules:
// - Rule 1: No filler badges
// - Rule 4: Sans-serif typography for navigation and branding
// - Rule 5: Cohesive design system tokens
// - Rule 11: Sky-600 accent color
// - Rule 14: Radius math: rounded-lg on 12px items

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bell,
  Radio,
  Calculator,
  FlaskConical,
  MapPin,
  BarChart3,
  Settings,
  Droplets,
  Cpu,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Network Overview", icon: LayoutDashboard },
  { href: "/alerts", label: "Alerts & Triage", icon: Bell },
  { href: "/stations/S1", label: "Station Telemetry", icon: Radio },
  { href: "/analysis", label: "Leak Analysis", icon: Calculator },
  { href: "/simulation", label: "Simulation Panel", icon: FlaskConical },
  { href: "/site-map", label: "Geographic Map", icon: MapPin },
  { href: "/evaluation", label: "Rig Evaluation", icon: BarChart3 },
  { href: "/settings", label: "System Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 shrink-0 min-h-screen bg-white text-slate-800 border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
          <Droplets className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm tracking-tight text-slate-900">
            HydroNode
          </div>
          <div className="text-xs text-slate-500 truncate">
            Edge-AI Leak SCADA
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-sky-50 text-sky-700 font-semibold border border-sky-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-600" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Hardware Controller Status Footer */}
      <div className="px-3 py-3 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="flex items-center justify-between text-slate-900 font-medium">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
            ESP32-S3 Master
          </span>
          <span className="text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            ONLINE
          </span>
        </div>
        <div className="text-[11px] text-slate-500 pt-0.5">
          2 AWG Shielded · 18 Sensors (6× F·P·S)
        </div>
      </div>
    </aside>
  );
}
