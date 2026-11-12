"use client";
// src/components/layout/TopBar.tsx
// Header bar with live batch ticker, link status, and alert count in Light Mode.
// Follows 20 Rules:
// - High contrast light theme
// - No dark neon glows
// - Tabular numbers on timer

import { useState, useEffect } from "react";
import Link from "next/link";
import { useHydroStore } from "@/store/hydroStore";
import { formatDistanceToNow } from "@/lib/utils";
import { Bell, Activity, Database, Check } from "lucide-react";

export function TopBar() {
  const [mounted, setMounted] = useState(false);
  const lastBatchTs = useHydroStore((s) => s.lastBatchTs);
  const alerts = useHydroStore((s) => s.alerts);
  const activeAlerts = alerts.filter((a) => a.status === "active").length;

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastUpdated = !mounted
    ? "Connecting..."
    : lastBatchTs
    ? formatDistanceToNow(lastBatchTs)
    : "No data yet";

  const isLive = mounted && lastBatchTs && Date.now() - lastBatchTs < 60_000;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 select-none text-xs">
      {/* Live Ingest Heartbeat */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
            aria-hidden="true"
          />
          <span className="font-semibold text-slate-900">
            {isLive ? "Telemetry Stream Active" : "Waiting for Batch"}
          </span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums font-mono text-slate-500">{lastUpdated}</span>
        </div>

        {/* Polling Interval */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Activity className="w-3.5 h-3.5 text-sky-600" />
          <span>3s Polling · Ingest ~30s</span>
        </div>
      </div>

      {/* Right Action / System Status */}
      <div className="flex items-center gap-3">
        {/* Neon Database Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span>Neon Serverless</span>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        </div>

        {/* Alerts Bell Link */}
        <Link
          href="/alerts"
          aria-label={`${activeAlerts} active alerts`}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-colors ${
            activeAlerts > 0
              ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="tabular-nums font-mono font-semibold">
            {activeAlerts > 0 ? `${activeAlerts} Active` : "0 Alerts"}
          </span>
        </Link>
      </div>
    </header>
  );
}
