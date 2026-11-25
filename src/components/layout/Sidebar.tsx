"use client";
// src/components/layout/Sidebar.tsx
// Metro Pacific Water × HydroNode SCADA — Premium Sidebar
// Brand: #0076A0 (deep ocean blue), #019FD7 (sky blue), #A6CE38 (lime green)

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
    <aside
      className="flex flex-col w-64 shrink-0 h-screen bg-white select-none"
      style={{
        borderRight: "1px solid #C8E5F2",
        boxShadow: "1px 0 0 rgba(0,118,160,0.08), 2px 0 8px rgba(0,118,160,0.06)",
      }}
    >
      {/* Brand Header — Metro Pacific Water */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #DFF5FF" }}>
        <Link href="/" className="flex items-center gap-2.5">
          {/* MPW brand mark — gradient ocean blue */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0076A0 0%, #019FD7 100%)",
              boxShadow: "0 2px 8px rgba(0,118,160,0.35)",
            }}
          >
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight" style={{ color: "#0C2340" }}>
                HydroNode
              </span>
              <span
                className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded tracking-wider"
                style={{ background: "#0076A0" }}
              >
                AI
              </span>
            </div>
            <div className="text-[10px] font-medium leading-none mt-0.5" style={{ color: "#819FD7" }}>
              Metro Pacific Water
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div
              className="px-3 pb-2 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: "#819FD7" }}
            >
              {section.title}
            </div>
            {section.items.map(({ href, label, icon: Icon, badge, badgeTone }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, #0076A0 0%, #019FD7 100%)",
                          color: "#ffffff",
                          boxShadow: "0 2px 8px rgba(0,118,160,0.3)",
                        }
                      : { color: "#2D5A7A" }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "#EEF6FA";
                      (e.currentTarget as HTMLElement).style.color = "#0076A0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = "#2D5A7A";
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span style={{ color: isActive ? "#ffffff" : "#019FD7" }}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="truncate">{label}</span>
                  </div>

                  {badge && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={
                        isActive
                          ? { background: "rgba(255,255,255,0.2)", color: "#ffffff" }
                          : badgeTone === "critical"
                          ? { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }
                          : badgeTone === "accent"
                          ? { background: "#DFF5FF", color: "#0076A0", border: "1px solid #ABE0F9" }
                          : { background: "#f1f5f9", color: "#475569" }
                      }
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
      <div
        className="mx-3 mb-3 rounded-2xl overflow-hidden"
        style={{
          border: "1px solid #C8E5F2",
          boxShadow: "0 1px 3px rgba(0,118,160,0.08), 0 4px 12px rgba(0,118,160,0.06)",
        }}
      >
        {/* MPW brand gradient bar */}
        <div
          className="h-0.5"
          style={{ background: "linear-gradient(90deg, #0076A0, #019FD7, #A6CE38)" }}
        />
        <div className="p-3 space-y-2.5 text-xs" style={{ background: "#F4FAFD" }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5" style={{ color: "#0C2340" }}>
              <Cpu className="w-3.5 h-3.5" style={{ color: "#019FD7" }} />
              ESP32-S3 Master
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="text-[11px] leading-tight" style={{ color: "#2D5A7A" }}>
            18 Sensors (6× F·P·S) · 2AWG Multi-conductor
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]" style={{ color: "#818F99" }}>
              <span>Telemetry Throughput</span>
              <span className="font-mono tabular-nums font-semibold" style={{ color: "#2D5A7A" }}>
                94%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#DFF5FF" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: "94%",
                  background: "linear-gradient(90deg, #0076A0, #019FD7)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operator Profile Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 text-xs"
        style={{ borderTop: "1px solid #DFF5FF" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs shrink-0"
            style={{
              background: "linear-gradient(135deg, #0076A0, #019FD7)",
              boxShadow: "0 2px 8px rgba(0,118,160,0.3)",
            }}
          >
            OP
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ color: "#0C2340" }}>
              SCADA Operator
            </div>
            <div className="text-[10px] truncate" style={{ color: "#818F99" }}>
              admin@metropacificwater.com
            </div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#818F99" }} />
      </div>
    </aside>
  );
}
