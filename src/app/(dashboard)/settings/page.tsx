"use client";
// src/app/(dashboard)/settings/page.tsx
// Read-only view of everything the backend does:
// transducer calibration constants, pump ON/OFF detection, ML anomaly mapping,
// active API endpoints, and live Neon sensor_data storage metrics.

import useSWR from "swr";
import { formatBytes } from "@/lib/utils";
import { STATION_IDS, ZONES } from "@/config/rig";
import {
  ADC_MAX,
  ADC_ZERO,
  BAR_MAX,
  MANILA_TZ,
  PUMP_STARTING_WINDOW_MS,
  STALE_THRESHOLD_MS,
  formatPhtDateTime,
  formatRelativeAge,
} from "@/lib/friendTelemetry";
import type { DbUsage, LiveStation } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  Lock,
  Radio,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface SourceOverview {
  ok: boolean;
  empty?: boolean;
  totalRows?: number;
  latest: {
    id: number;
    createdAt: string;
    pumpStatus: "ON" | "OFF";
    status: string;
    localization: string;
    confidence: number;
  } | null;
  pumpState?: {
    pumpStatus: "off" | "starting" | "running";
    pumpStatusRaw: "ON" | "OFF";
    lastPumpChangedAt: string | null;
    isStale: boolean;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BACKEND_ENDPOINTS = [
  { method: "GET", path: "/api/source", role: "Latest sensor_data snapshot, series (60 rows), & pump transitions" },
  { method: "GET", path: "/api/kpi", role: "Active leaks, zone integrity, stations online, & pump state" },
  { method: "GET", path: "/api/stations", role: "Per-station (S1–S4) flow (L/min) & converted pressure (bar)" },
  { method: "GET", path: "/api/readings", role: "Raw (1h) & minute-aggregated (24h/7d/30d) time-series feed" },
  { method: "GET", path: "/api/alerts", role: "Non-Normal status rows mapped to leak / sensor failure alerts" },
  { method: "GET", path: "/api/evaluation", role: "Aggregate statistics, severity breakdown, & incident log" },
  { method: "GET", path: "/api/db-usage", role: "Neon database disk usage, row count, & minute bucket coverage" },
] as const;

export default function SettingsPage() {
  const { data: dbUsage } = useSWR<DbUsage>("/api/db-usage", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const { data: stations } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const { data: source } = useSWR<SourceOverview>("/api/source", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const age = source?.latest?.createdAt
    ? formatRelativeAge(source.latest.createdAt)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System Settings &amp; Backend Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Read-only overview of backend calibration, ML inference, pump state detection, and Neon PostgreSQL sync
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
          <Lock className="w-3.5 h-3.5 text-sky-600" />
          <span>Backend-Managed · Read-Only View</span>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Backend Calibration, Station Mapping & Detection Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Backend Transducer Calibration & Signal Conversion */}
          <Card>
            <CardHeader
              title="Backend Calibration & Signal Conversion"
              subtitle="All sensor scaling and UTC-to-Manila (PHT) normalization runs automatically on the server"
              action={<Gauge className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-slate-500 block">Pressure Zero Offset</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {ADC_ZERO} ADC
                  </span>
                  <span className="text-[11px] text-slate-400 block">Clamped ≥ 0.000 bar</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-slate-500 block">Full-Scale ADC Ceiling</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {ADC_MAX} → {BAR_MAX.toFixed(1)} bar
                  </span>
                  <span className="text-[11px] text-slate-400 block">12-bit direct transducer</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-slate-500 block">Stale Stream Window</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {Math.round(STALE_THRESHOLD_MS / 60_000)} min
                  </span>
                  <span className="text-[11px] text-slate-400 block">5s dashboard poll rate</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-slate-500 block">Pump Priming Window</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {Math.round(PUMP_STARTING_WINDOW_MS / 1000)} s
                  </span>
                  <span className="text-[11px] text-slate-400 block">TZ: {MANILA_TZ} (UTC+8)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F4FAFD] border border-[#DFF5FF] text-xs text-[#2D5A7A] flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong className="text-[#0C2340]">ADC Conversion Formula:</strong>{" "}
                  <code className="font-mono">
                    P (bar) = max(0, ((ADC − {ADC_ZERO}) / ({ADC_MAX} − {ADC_ZERO})) × {BAR_MAX.toFixed(1)})
                  </code>
                </span>
                <span className="text-[11px] font-mono text-[#0076A0]">
                  UTC → to_char(..., &apos;Z&apos;) → PHT
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Per-Station DB Mapping & Live Channel Snapshot */}
          <Card>
            <CardHeader
              title="Station Channel Mapping (S1–S4)"
              subtitle="Live per-node mapping from Neon sensor_data columns (flow1–4, pressure1–4)"
              action={<Radio className="w-4 h-4 text-sky-600" />}
            />
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {STATION_IDS.map((sid, idx) => {
                  const st = stations?.find((s) => s.id === sid);
                  const zone = ZONES[idx];
                  const colNum = idx + 1;
                  return (
                    <div
                      key={sid}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Station {sid}</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            st?.status === "alert"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : st?.status === "elevated"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : st?.status === "online"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {(st?.status ?? "offline").toUpperCase()}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500">
                        flow{colNum} · pressure{colNum}
                      </div>

                      <div className="pt-1 border-t border-slate-200 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Flow:</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {st?.latestFlow != null ? `${st.latestFlow.toFixed(2)} L/m` : "--"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pressure:</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {st?.latestPressure != null ? `${st.latestPressure.toFixed(3)} bar` : "--"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Boundary:</span>
                          <span className="font-mono text-sky-700">Zone {zone?.id ?? colNum}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Anomaly Classification, Pump Detection & Severity Rules */}
          <Card>
            <CardHeader
              title="Backend Inference & Alert Logic"
              subtitle="How raw sensor_data fields are evaluated into KPIs, pump transitions, and triage severity"
              action={<ShieldCheck className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Normal / Monitoring</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    All 4 zones marked nominal; active alerts stay 0; live status displays online telemetry.
                  </p>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <div className="flex items-center gap-1.5 font-semibold text-red-700">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Leak Classification</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Severity Index <code className="font-mono">SI = (ΔP / P_up) × 100%</code> (Low &lt;5%, Med 5–10%, High ≥10%) + Zone localization.
                  </p>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Pump State &amp; Faults</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    SQL <code className="font-mono">LAG()</code> tracks ON/OFF transitions; sensor failures log as medium/acknowledged without siren.
                  </p>
                </div>
              </div>

              {/* Active Backend Endpoints Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-sky-600" />
                    Active Backend API Routes
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Next.js App Router · dynamic</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {BACKEND_ENDPOINTS.map((ep) => (
                    <div
                      key={ep.path}
                      className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-50 text-sky-700 border border-sky-200">
                          {ep.method}
                        </span>
                        <span className="font-semibold text-slate-900">{ep.path}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{ep.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Neon Storage Monitor + Backend Source Status */}
        <div className="space-y-6">
          {/* Neon Storage Card */}
          <Card>
            <CardHeader
              title="Database Storage Monitor"
              subtitle="Live Neon sensor_data footprint (read-only mirror)"
              action={<Database className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Storage Used:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900">
                    {dbUsage ? formatBytes(dbUsage.dbSizeBytes) : "Querying..."}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">sensor_data (raw telemetry rows):</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.rawRows.toLocaleString() ?? "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">minute buckets covered:</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.minuteRows.toLocaleString() ?? "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">anomaly &amp; leak events:</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.alertRows.toLocaleString() ?? "0"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                This dashboard connects strictly in <strong className="text-slate-800">read-only mode</strong> to the external Neon database. Retention and pruning are controlled on the source database backend.
              </div>
            </CardContent>
          </Card>

          {/* Backend Data Pipeline Card */}
          <Card>
            <CardHeader
              title="Backend Ingestion Pipeline"
              subtitle="Live source connection & latest ingest telemetry"
              action={<Cpu className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] space-y-1 border border-slate-800 shadow-xs">
                <div className="text-emerald-400">ESP32 Sensors + Python ML Inference</div>
                <div className="text-slate-400">  ↓ writes UTC rows</div>
                <div className="text-sky-400">Neon PostgreSQL :: sensor_data</div>
                <div className="text-slate-400">  ↓ read-only SQL (5s poll)</div>
                <div className="text-white">HydroNode SCADA UI (Manila PHT)</div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">Source Connection:</span>
                  <span
                    className={`font-semibold ${
                      source?.ok
                        ? "text-emerald-700"
                        : source
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {source ? (source.ok ? "Connected (sensor_data)" : "Unavailable") : "Checking..."}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">Pump State:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {source?.pumpState?.pumpStatus?.toUpperCase() ?? "OFF"} (
                    {source?.pumpState?.pumpStatusRaw ?? "OFF"})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">Latest Row ID:</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {source?.latest ? `#${source.latest.id}` : "Awaiting data (0 rows)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">Last Telemetry (PHT):</span>
                  <span className="font-mono tabular-nums text-slate-700 text-[11px]">
                    {source?.latest
                      ? `${formatPhtDateTime(source.latest.createdAt)} (${age?.label ?? ""})`
                      : "--"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
