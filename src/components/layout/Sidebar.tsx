"use client";
// src/components/layout/Sidebar.tsx
// High-contrast industrial SCADA sidebar.

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
    <aside className="flex flex-col w-64 shrink-0 min-h-screen bg-[#0a0d12] text-[#e8edf2] border-r border-[#1e2733] select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2733]">
        <div className="w-8 h-8 rounded-lg bg-[#00b4d815] border border-[#00b4d840] text-[#00b4d8] flex items-center justify-center shrink-0 shadow-[0_0_12px_-2px_rgba(0,180,216,0.3)]">
          <Droplets className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 font-mono">
            <span>HydroNode</span>
            <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-[#00b4d820] text-[#00b4d8] border border-[#00b4d840]">
              v1.0
            </span>
          </div>
          <div className="text-[11px] text-[#7a8fa6] truncate">
            IoT Acoustic & Pressure Rig
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#00b4d815] text-[#00b4d8] font-semibold border border-[#00b4d840] shadow-[0_0_12px_-3px_rgba(0,180,216,0.2)]"
                  : "text-[#7a8fa6] hover:text-[#e8edf2] hover:bg-[#141c24] border border-transparent"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00b4d8] shadow-[0_0_6px_#00b4d8]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Hardware Bus Status Footer */}
      <div className="px-4 py-3.5 m-3 rounded-lg bg-[#0f1419] border border-[#1e2733] text-[11px] text-[#7a8fa6] font-mono space-y-1">
        <div className="flex items-center justify-between text-[#c0d0e0]">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#00b4d8]" />
            ESP32 Master
          </span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
        <div className="text-[10px] text-[#4a5a6e]">
          CAT6 Bus · 18 Sensors (6× F·P·V)
        </div>
      </div>
    </aside>
  );
}
