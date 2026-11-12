"use client";
// src/components/layout/Sidebar.tsx
// Premium sidebar with richer depth, left-border active indicator, and status colors.

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
  ChevronDown,
  Cpu,
} from "lucide-react";
import { useHydroStore } from "@/store/hydroStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: "default" | "critical" | "success" | "accent";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlertsCount = alerts.filter((a) => a.status === "active").length;

  const NAV_SECTIONS: NavSection[] = [
    {
      title: "Workspaces",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        {
          href: "/alerts",
          label: "Alerts & Triage",
          icon: Bell,
          badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined,
          badgeTone: activeAlertsCount > 0 ? "critical" : "default",
        },
        {
          href: "/stations/S1",
          label: "Station Telemetry",
          icon: Radio,
          badge: "6 Nodes",
          badgeTone: "accent",
        },
      ],
    },
    {
      title: "Simulation & AI",
      items: [
        { href: "/simulation", label: "Simulation Panel", icon: FlaskConical },
        { href: "/analysis", label: "Leak Analysis", icon: Calculator },
        { href: "/site-map", label: "Geographic Map", icon: MapPin },
      ],
    },
    {
      title: "System & Rig",
      items: [
        { href: "/evaluation", label: "Rig Evaluation", icon: BarChart3 },
        { href: "/settings", label: "System Settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="flex flex-col w-64 shrink-0 h-screen bg-white text-slate-700 select-none
      border-r border-slate-200/80
      shadow-[1px_0_0_rgba(0,0,0,0.03),2px_0_8px_rgba(0,0,0,0.03)]">

      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900">HydroNode</span>
              <span className="text-[9px] font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded tracking-wider">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
              IoT Acoustic & Pressure Rig
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
              {section.title}
            </div>
            {section.items.map(({ href, label, icon: Icon, badge, badgeTone }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-[0_2px_8px_rgba(15,23,42,0.2)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{label}</span>
                  </div>

                  {badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : badgeTone === "critical"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : badgeTone === "accent"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hardware Telemetry Card */}
      <div className="mx-3 mb-3 rounded-2xl border border-slate-200/80 overflow-hidden
        shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]">
        {/* Colored top bar */}
        <div className="h-0.5 bg-gradient-to-r from-sky-500 to-emerald-500" />
        <div className="p-3 space-y-2.5 text-xs bg-slate-50/60">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
              ESP32-S3 Master
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            18 Sensors (6× F·P·S) · 2AWG Multi-conductor
          </div>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Telemetry Throughput</span>
              <span className="font-mono tabular-nums font-semibold text-slate-600">94%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400"
                style={{ width: "94%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operator Profile Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0
            shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            OP
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">SCADA Operator</div>
            <div className="text-[10px] text-slate-400 truncate">admin@hydronode.io</div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>
    </aside>
  );
}
