"use client";
// src/components/source/SourcePanel.tsx
// Live telemetry panel reading from the friend's ESP32 database via /api/source.
// Auto-refreshes every 5 s. Shows:
//  • Pump status badge (ON / OFF) with last-toggle time
//  • Latest flow + pressure per station (S1–S4)
//  • Recent pump transition log
//  • Status / localization from the firmware's leak classifier

import useSWR from "swr";
import { Activity, Zap, ZapOff, Droplets, Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SourceData {
  ok: boolean;
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
  };
  pumpTransitions: { id: number; created_at: string; pump_status: "ON" | "OFF" }[];
  rowCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATIONS = ["S1", "S2", "S3", "S4"];

function statusMeta(s: string) {
  if (s === "Normal") return { label: "Normal", color: "text-emerald-400", Icon: CheckCircle2 };
  if (s === "LeakDetected") return { label: "Leak Detected", color: "text-red-400", Icon: AlertTriangle };
  if (s === "SensorFailure") return { label: "Sensor Failure", color: "text-amber-400", Icon: AlertTriangle };
  return { label: s, color: "text-slate-400", Icon: Activity };
}

function fmt(d: string) {
  return new Date(d).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Manila", // PHT = UTC+8
  });
}

export function SourcePanel() {
  const { data, isLoading, error } = useSWR<SourceData>("/api/source", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
        ⚠ Could not reach the source database. Check FRIEND_DATABASE_URL.
      </div>
    );
  }

  const { latest, pumpTransitions } = data;
  const statusInfo = statusMeta(latest.status);
  const StatusIcon = statusInfo.Icon;
  const pumpOn = latest.pumpStatus === "ON";

  return (
    <div className="space-y-4">
      {/* Header row: pump badge + system status */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border ${
            pumpOn
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-slate-500/15 border-slate-500/40 text-slate-400"
          }`}
        >
          {pumpOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          Pump {latest.pumpStatus}
        </div>

        <div className={`flex items-center gap-1.5 text-sm ${statusInfo.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusInfo.label}
          {latest.status !== "Normal" && latest.localization !== "None" && (
            <span className="text-xs opacity-70 ml-1">@ {latest.localization}</span>
          )}
        </div>

        <span className="ml-auto text-xs text-slate-500">
          #{latest.id} · {new Date(latest.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" })} PHT
        </span>
      </div>

      {/* Station grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATIONS.map((sid, i) => (
          <div
            key={sid}
            className="rounded-lg border border-white/8 bg-white/5 p-3 space-y-2"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{sid}</div>
            <div className="flex items-center gap-1.5 text-sm">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-300 font-mono">
                {latest.flow[i].toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">L/min</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Gauge className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-violet-300 font-mono">
                {latest.pressure[i].toFixed(3)}
              </span>
              <span className="text-xs text-slate-500">bar</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
              ADC {latest.pressureRaw[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence */}
      {latest.status !== "Normal" && (
        <div className="text-xs text-slate-400">
          Leak confidence:{" "}
          <span className="font-semibold text-amber-300">{latest.confidence}%</span>
          {latest.localization !== "None" && (
            <> · Zone <span className="font-semibold">{latest.localization}</span></>
          )}
        </div>
      )}

      {/* Pump transition log */}
      {pumpTransitions.length > 0 && (
        <div className="rounded-lg border border-white/8 bg-white/5 p-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Pump ON/OFF events (last {data.rowCount} readings)
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {[...pumpTransitions].reverse().map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`font-semibold w-8 ${
                    t.pump_status === "ON" ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {t.pump_status}
                </span>
                <span className="text-slate-500 font-mono">{fmt(t.created_at)} PHT</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
