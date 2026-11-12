"use client";
// src/components/layout/TopBar.tsx
// Ultra-Premium Top Navigation Header matching FlowAI reference image.
// - Breadcrumb indicator on the left
// - Integrated search pill input
// - "Ask AI" triage shortcut
// - Notification bell button with active alert indicator

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydroStore } from "@/store/hydroStore";
import {
  Search,
  Sparkles,
  Bell,
  LayoutDashboard,
  Radio,
  FlaskConical,
  Activity,
} from "lucide-react";

export function TopBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active").length;

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/alerts")) return "Alerts & Triage";
    if (pathname.startsWith("/stations")) return "Station Telemetry";
    if (pathname.startsWith("/simulation")) return "Simulation Panel";
    if (pathname.startsWith("/analysis")) return "Leak Analysis";
    if (pathname.startsWith("/site-map")) return "Geographic Map";
    if (pathname.startsWith("/evaluation")) return "Rig Evaluation";
    if (pathname.startsWith("/settings")) return "System Settings";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 select-none">
      {/* Left: Current Page Breadcrumb */}
      <div className="flex items-center gap-2 text-slate-700">
        <LayoutDashboard className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-sm text-slate-900 tracking-tight">
          {getPageTitle()}
        </span>
      </div>

      {/* Right Actions: Search + Ask AI + Notifications */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search telemetry, stations, alerts..."
            className="w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
          />
        </div>

        {/* Ask AI Triage Button */}
        <Link
          href="/analysis"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700 transition-all shadow-2xs hover:shadow-subtle"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Ask AI</span>
        </Link>

        {/* Live Stream Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Stream Live</span>
        </div>

        {/* Notification Bell */}
        <Link
          href="/alerts"
          aria-label={`${activeAlerts} active alerts`}
          className="relative p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-slate-600 transition-all shadow-2xs hover:shadow-subtle cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {activeAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
              {activeAlerts}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
