"use client";
// src/components/layout/TopBar.tsx
// Header bar with live batch ticker, sensor link status, and alert count.

import { useState, useEffect } from "react";
import Link from "next/link";
import { useHydroStore } from "@/store/hydroStore";
import { formatDistanceToNow } from "@/lib/utils";
import { Bell, Activity, Database, CheckCircle2 } from "lucide-react";

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
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#0a0d12]/90 backdrop-blur-md border-b border-[#1e2733] select-none text-xs">
      {/* Live Ingest Heartbeat */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0f1419] border border-[#1e2733] text-[#7a8fa6] font-mono">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isLive
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                : "bg-slate-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-[#e8edf2] font-semibold">
            {isLive ? "Telemetry Stream Active" : "Waiting for Batch"}
          </span>
          <span className="text-[#4a5a6e]">·</span>
          <span className="tabular-nums text-[#7a8fa6]">{lastUpdated}</span>
        </div>

        {/* Polling Interval Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#4a5a6e] font-mono">
          <Activity className="w-3 h-3 text-[#00b4d8]" />
          <span>Polling 3s · ESP32 Ingest ~30s</span>
        </div>
      </div>

      {/* Right Action / System Status */}
      <div className="flex items-center gap-3 font-mono">
        {/* Neon Postgres Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0f1419] border border-[#1e2733] text-[11px] text-[#7a8fa6]">
          <Database className="w-3 h-3 text-[#00b4d8]" />
          <span>Neon Serverless</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        </div>

        {/* Alerts Bell Link */}
        <Link
          href="/alerts"
          aria-label={`${activeAlerts} active alerts`}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
            activeAlerts > 0
              ? "bg-red-950/60 border-red-900/60 text-red-300 shadow-[0_0_12px_-2px_rgba(239,68,68,0.4)]"
              : "bg-[#0f1419] border-[#1e2733] text-[#7a8fa6] hover:text-[#e8edf2] hover:border-[#2a3644]"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="font-semibold tabular-nums">
            {activeAlerts > 0 ? `${activeAlerts} Active` : "0 Alerts"}
          </span>
        </Link>
      </div>
    </header>
  );
}
