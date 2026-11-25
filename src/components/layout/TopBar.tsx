"use client";
// src/components/layout/TopBar.tsx
// Metro Pacific Water × HydroNode SCADA — Premium Top Navigation
// Brand: #0076A0 (deep ocean blue), #019FD7 (sky blue), #A6CE38 (lime green)

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydroStore } from "@/store/hydroStore";
import {
  Search,
  Calculator,
  Bell,
  LayoutDashboard,
  Volume2,
  VolumeX,
} from "lucide-react";
import { isAlertSoundMuted, toggleAlertSoundMuted } from "@/lib/sound";

export function TopBar() {
  const pathname = usePathname();
  const [isMuted, setIsMuted] = useState(() =>
    typeof window !== "undefined" ? isAlertSoundMuted() : false
  );
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active").length;

  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setIsMuted(custom.detail);
    };
    window.addEventListener("hydronode_audio_muted_change", handleMuteChange);
    return () => window.removeEventListener("hydronode_audio_muted_change", handleMuteChange);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/alerts")) return "Alerts & Triage";
    if (pathname.startsWith("/stations")) return "Station Telemetry";
    if (pathname.startsWith("/analysis")) return "Leak Analysis";
    if (pathname.startsWith("/site-map")) return "Geographic Map";
    if (pathname.startsWith("/evaluation")) return "Rig Evaluation";
    if (pathname.startsWith("/settings")) return "System Settings";
    return "Dashboard";
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 select-none"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid #DFF5FF",
        boxShadow: "0 1px 0 rgba(0,118,160,0.06), 0 4px 16px rgba(0,118,160,0.04)",
      }}
    >
      {/* Left: Current Page Breadcrumb */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-4 h-4" style={{ color: "#019FD7" }} />
        <span className="font-semibold text-sm tracking-tight" style={{ color: "#0C2340" }}>
          {getPageTitle()}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#819FD7" }}
          />
          <input
            type="text"
            placeholder="Search telemetry, stations, alerts..."
            className="w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl transition-all focus:outline-none focus:ring-2"
            style={{
              background: "#F4FAFD",
              border: "1px solid #C8E5F2",
              color: "#0C2340",
              "--tw-ring-color": "#019FD7",
            } as React.CSSProperties}
            onFocus={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#019FD7";
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "#F4FAFD";
              e.currentTarget.style.borderColor = "#C8E5F2";
            }}
          />
        </div>

        {/* Quick Link to Leak Analysis Calculator */}
        <Link
          href="/analysis"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all"
          style={{
            background: "#ffffff",
            border: "1px solid #C8E5F2",
            color: "#0076A0",
            boxShadow: "0 1px 2px rgba(0,118,160,0.08)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#F4FAFD";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#ffffff";
          }}
        >
          <Calculator className="w-3.5 h-3.5" style={{ color: "#A6CE38" }} />
          <span>Leak Analysis</span>
        </Link>

        {/* Live Stream Status Indicator */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl"
          style={{
            background: "#F3FFD1",
            color: "#4a7a00",
            border: "1px solid #A6CE38",
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#A6CE38" }} />
          <span>Stream Live</span>
        </div>

        {/* Audible Siren Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = toggleAlertSoundMuted();
            setIsMuted(next);
          }}
          title={isMuted ? "Audible Alarm Muted (Click to enable)" : "Audible Alarm Active (/alert.mp3)"}
          className="relative p-2 rounded-xl transition-all cursor-pointer"
          style={
            activeAlerts > 0 && !isMuted
              ? {
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
              }
              : {
                background: "#ffffff",
                border: "1px solid #C8E5F2",
                color: isMuted ? "#818F99" : "#019FD7",
                boxShadow: "0 1px 2px rgba(0,118,160,0.08)",
              }
          }
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <Link
          href="/alerts"
          aria-label={`${activeAlerts} active alerts`}
          className="relative p-2 rounded-xl transition-all cursor-pointer"
          style={{
            background: "#ffffff",
            border: "1px solid #C8E5F2",
            color: "#0076A0",
            boxShadow: "0 1px 2px rgba(0,118,160,0.08)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#F4FAFD";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#ffffff";
          }}
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
