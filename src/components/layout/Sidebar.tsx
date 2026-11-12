"use client";
// src/components/layout/Sidebar.tsx
// Ultra-Premium Sidebar matching FlowAI reference image.
// - Categorized nav with subtle uppercase headers
// - Active state with sleek light rounded pill
// - Notification count badges
// - Hardware telemetry meter & user profile footer

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
  Sparkles,
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
    <aside className="flex flex-col w-64 shrink-0 min-h-screen bg-white text-slate-700 border-r border-slate-200/80 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-slate-900">HydroNode</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AI</span>
          </div>
        </Link>
        <span className="w-3.5 h-3.5 rounded border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]" />
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-medium tracking-wider text-slate-400 uppercase">
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
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-100/80 text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                    <span className="truncate">{label}</span>
                  </div>

                  {badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        badgeTone === "critical"
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

      {/* Hardware Telemetry Card (Matching FlowAI quota card) */}
      <div className="p-3 mx-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
            ESP32-S3 Master
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            ONLINE
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          18 Sensors (6× F·P·S) · 2AWG Multi-conductor
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div className="bg-sky-600 h-full w-[94%]" />
        </div>
      </div>

      {/* Operator Profile Footer (Matching FlowAI user footer) */}
      <div className="flex items-center justify-between p-3 mx-3 mb-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
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
