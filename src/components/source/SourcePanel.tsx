"use client";
// src/components/source/SourcePanel.tsx
// Live telemetry panel reading from the friend's ESP32 database (sensor_data) via /api/source.
// Styled in Metro Pacific Water Light Mode; all timestamps shown in Manila PHT (UTC+8).

import useSWR from "swr";
import {
  Activity,
  Zap,
  ZapOff,
  Droplets,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  WifiOff,
  Database,
} from "lucide-react";
import {
  formatPhtDateTime,
  formatPhtTime,
  formatRelativeAge,
} from "@/lib/friendTelemetry";

interface SourceData {
  ok: boolean;
  empty?: boolean;
  error?: string;
  latest: {
    id: number;
    createdAt: string;
    flow: number[];
    pressure: number[];
    pressureRaw: number[];
    pumpStatus: "ON" | "OFF";
    status: string;
    localization: string;
    confidence: number;
  } | null;
  pumpState?: {
    pumpStatus: "off" | "starting" | "running";
    pumpStatusRaw: "ON" | "OFF";
    pumpUpdatedAt: string | null;
    lastPumpChangedAt: string | null;
    isStale: boolean;
  };
  pumpTransitions: {
    id: number;
    created_at: string;
    pump_status: "ON" | "OFF";
    prev_pump_status?: "ON" | "OFF" | null;
  }[];
  rowCount: number;
  totalRows?: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STATIONS = ["S1", "S2", "S3", "S4"] as const;

function statusMeta(s: string) {
  const lower = s.toLowerCase();
  if (lower === "normal" || lower === "monitoring") {
    return {
      label: s,
      pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    };
  }
  if (lower.includes("leak")) {
    return {
      label: s,
      pillClass: "bg-red-50 text-red-700 border-red-200",
      Icon: AlertTriangle,
    };
  }
  if (lower.includes("failure") || lower.includes("error")) {
    return {
      label: s,
      pillClass: "bg-amber-50 text-amber-800 border-amber-200",
      Icon: AlertTriangle,
    };
  }
  return {
    label: s,
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    Icon: Activity,
  };
}

export function SourcePanel() {
  const { data, isLoading, error } = useSWR<SourceData>("/api/source", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-56 bg-slate-100 rounded-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-50 border border-slate-200/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {data?.error ?? "Could not reach the source database. Check FRIEND_DATABASE_URL."}
        </span>
      </div>
    );
  }

  if (data.empty || !data.latest) {
    return (
      <div className="rounded-xl border border-dashed border-sky-200 bg-[#F4FAFD] p-5 text-center space-y-2">
        <Database className="w-6 h-6 mx-auto text-[#019FD7] opacity-75" />
        <div className="text-xs font-semibold text-[#0C2340]">
          Connected to Neon <code>sensor_data</code> — waiting for incoming ESP32 rows
        </div>
        <p className="text-[11px] text-[#2D5A7A]">
          The <code>sensor_data</code> table currently has <strong>0 rows</strong>. As soon as your friend&apos;s ESP32/server pushes telemetry (including pump ON/OFF state), live readings will appear here automatically.
        </p>
      </div>
    );
  }

  const { latest, pumpTransitions, pumpState } = data;
  const statusInfo = statusMeta(latest.status);
  const StatusIcon = statusInfo.Icon;
  const pumpOn = latest.pumpStatus === "ON";
  const pumpStarting = pumpState?.pumpStatus === "starting";
  const age = formatRelativeAge(latest.createdAt);

  return (
    <div className="space-y-4">
      {/* Stale data banner */}
      {age.stale && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong className="font-semibold">No new rows for {age.label}.</strong>{" "}
            Showing last recorded telemetry (#{latest.id} at{" "}
            <span className="font-mono">{formatPhtDateTime(latest.createdAt)} PHT</span>).
          </span>
        </div>
      )}

      {/* Header row: pump badge + system status + timestamp */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold border ${
            pumpStarting
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : pumpOn
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-100 border-slate-200 text-slate-600"
          }`}
        >
          {pumpOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
          {pumpStarting ? "Pump STARTING" : `Pump ${latest.pumpStatus}`}
        </div>

        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${statusInfo.pillClass}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusInfo.label}</span>
          {latest.localization !== "None" && (
            <span className="opacity-80 font-mono">· {latest.localization}</span>
          )}
        </div>

        {latest.status.toLowerCase() !== "normal" && (
          <span className="text-xs text-[#2D5A7A] font-medium">
            Confidence:{" "}
            <strong className="font-mono text-amber-700">{latest.confidence}%</strong>
          </span>
        )}

        <div className="flex items-center gap-3 ml-auto text-xs text-[#2D5A7A]">
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              age.stale ? "text-amber-700" : "text-[#2D5A7A]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {age.label}
          </span>
          <span className="font-mono text-[11px] text-[#819FD7]">
            #{latest.id} · {formatPhtTime(latest.createdAt)} PHT
          </span>
        </div>
      </div>

      {/* Station grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATIONS.map((sid, i) => (
          <div
            key={sid}
            className="rounded-xl p-3.5 space-y-2 transition-colors"
            style={{
              background: age.stale ? "#fffbeb" : "#F4FAFD",
              border: age.stale ? "1px solid #fde68a" : "1px solid #DFF5FF",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0C2340] uppercase tracking-wide">
                {sid}
              </span>
              <span className="text-[10px] font-mono text-[#819FD7]">
                ADC {latest.pressureRaw[i]}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 text-sm">
              <Droplets className="w-3.5 h-3.5 text-[#019FD7] shrink-0 self-center" />
              <span className="text-[#0C2340] font-bold font-mono tabular-nums">
                {latest.flow[i].toFixed(2)}
              </span>
              <span className="text-[11px] text-[#2D5A7A]">L/min</span>
            </div>

            <div className="flex items-baseline gap-1.5 text-sm">
              <Gauge className="w-3.5 h-3.5 text-violet-600 shrink-0 self-center" />
              <span className="text-[#0C2340] font-bold font-mono tabular-nums">
                {latest.pressure[i].toFixed(3)}
              </span>
              <span className="text-[11px] text-[#2D5A7A]">bar</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pump transition log (full table LAG transitions) */}
      <div
        className="rounded-xl p-3.5"
        style={{ background: "#F4FAFD", border: "1px solid #DFF5FF" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D5A7A]">
            Pump ON / OFF History ({data.totalRows ?? data.rowCount} DB rows scanned)
          </span>
          <span className="text-[10px] font-mono text-[#819FD7]">Manila PHT (UTC+8)</span>
        </div>

        {pumpTransitions.length === 0 ? (
          <div className="text-xs text-[#819FD7]">No pump state transitions recorded yet.</div>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {pumpTransitions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-10 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      t.pump_status === "ON"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {t.pump_status}
                  </span>
                  <span className="text-[#2D5A7A]">
                    {t.prev_pump_status
                      ? `Switched ${t.prev_pump_status} → ${t.pump_status}`
                      : `Initial recorded state (${t.pump_status})`}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#2D5A7A] tabular-nums">
                  #{t.id} · {formatPhtDateTime(t.created_at)} PHT
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
