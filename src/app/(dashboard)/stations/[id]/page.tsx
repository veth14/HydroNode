"use client";
// src/app/(dashboard)/stations/[id]/page.tsx
// Detailed analytics for a single station (S1–S4) in Light Mode.
// Live-only 2-sensor rig per junction: Flow (EL817 Pulse) + Pressure (ADS1115).
// Vibration / seismic sensor not yet installed.

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { STATION_IDS, type StationId } from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { LiveStation } from "@/types";
import { Droplets, Gauge, Activity, Cpu, ArrowLeft, Waves } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const baselines: Record<StationId, { q0: number; p0: number }> = {
  S1: { q0: 15.0, p0: 5.0 },
  S2: { q0: 14.8, p0: 4.9 },
  S3: { q0: 14.6, p0: 4.8 },
  S4: { q0: 14.4, p0: 4.7 },
};

export default function StationDetailPage() {
  const params = useParams();
  const rawId = (params?.id as string)?.toUpperCase();
  const stationId = (STATION_IDS.includes(rawId as StationId) ? rawId : "S1") as StationId;

  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("1h");
  const [chartMode, setChartMode] = useState<"flow" | "pressure">("flow");

  const { data: stationsData } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const storeStations = useHydroStore((s) => s.stations);
  const currentStation =
    (stationsData && stationsData.length > 0 ? stationsData : storeStations).find(
      (s) => s.id === stationId
    );

  const is1h = range === "1h";
  interface ReadingPoint {
    t: string;
    flow?: number;
    flowAvg?: number;
    pressure?: number;
    pressureAvg?: number;
  }
  const { data: historyData, isLoading } = useSWR<ReadingPoint[]>(
    `/api/readings?stationId=${stationId}&range=${range}${is1h ? "&raw=true" : ""}`,
    fetcher,
    {
      refreshInterval: is1h ? 15000 : 30000,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  );

  const currentBaseline = baselines[stationId] ?? { q0: 15.0, p0: 5.0 };

  const formatAxisTime = (isoStr: string) => {
    const d = new Date(isoStr);
    if (range === "30d") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (range === "7d") {
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    if (range === "24h") {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const historicalTrendPoints = (Array.isArray(historyData) && historyData.length > 0 ? historyData : []).map((d: ReadingPoint) => ({
    time: formatAxisTime(d.t),
    rawTime: d.t,
    flowAvg: Number((d.flow ?? d.flowAvg ?? 0).toFixed(2)),
    pressureAvg: Number((d.pressure ?? d.pressureAvg ?? 0).toFixed(2)),
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            aria-label="Back to Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Station {stationId} Telemetry &amp; Transducer Pod
              </h1>
              <Badge
                variant={
                  currentStation?.status === "online"
                    ? "success"
                    : currentStation?.status === "elevated"
                      ? "warning"
                      : currentStation?.status === "alert"
                        ? "critical"
                        : "neutral"
                }
                dot
              >
                {currentStation?.status?.toUpperCase() ?? "OFFLINE"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bi-Modal 2-Sensor Pod (Hall Pulse Flow + ADS1115 16-bit Pressure) · Vibration Not Installed
            </p>
          </div>
        </div>

        {/* Station Navigation Pill Bar */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          {STATION_IDS.map((sid) => (
            <Link
              key={sid}
              href={`/stations/${sid}`}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${sid === stationId
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {sid}
            </Link>
          ))}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Stat
          label="Line Flow Rate"
          value={currentStation?.latestFlow != null ? currentStation.latestFlow.toFixed(2) : "--"}
          unit="L/min"
          tone="accent"
          icon={<Droplets className="w-4 h-4 text-sky-600" />}
          subtext={`Baseline Q₀: ${currentBaseline.q0} L/m`}
        />

        <Stat
          label="Line Pressure"
          value={currentStation?.latestPressure != null ? currentStation.latestPressure.toFixed(2) : "--"}
          unit="bar"
          tone="default"
          icon={<Gauge className="w-4 h-4 text-indigo-600" />}
          subtext={`Baseline P₀: ${currentBaseline.p0} bar`}
        />

        <Stat
          label="Sampling Mode"
          value={currentStation?.samplingMode === "elevated" ? "100 Hz" : "10 Hz"}
          tone={currentStation?.samplingMode === "elevated" ? "warning" : "default"}
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          subtext={currentStation?.samplingMode === "elevated" ? "Dynamic Surge Polling" : "Nominal Edge Polling"}
        />

        <Stat
          label="Vibration Sensor"
          value="Soon"
          tone="warning"
          icon={<Waves className="w-4 h-4 text-amber-500" />}
          subtext="Not yet installed on rig"
        />
      </div>

      {/* Main Feature: Live Flow & Pressure Telemetry Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-premium space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              {chartMode === "flow"
                ? `Station ${stationId} — Volumetric Flow Rate (Q)`
                : `Station ${stationId} — Line Head Pressure (P)`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-2xl">
              {chartMode === "flow"
                ? `Pulse turbine volumetric flow rate compared to baseline Q₀ (${currentBaseline.q0} L/min)`
                : `5V transducer via ADS1115 16-bit I²C ADC compared to baseline P₀ (${currentBaseline.p0} bar)`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setChartMode("flow")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${chartMode === "flow"
                  ? "bg-white text-sky-700 shadow-xs border border-sky-200"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Flow (Q)
              </button>
              <button
                onClick={() => setChartMode("pressure")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${chartMode === "pressure"
                  ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Pressure (P)
              </button>
              <span
                className="px-2 py-1 text-[11px] font-medium text-slate-400 cursor-not-allowed"
                title="Vibration sensor not yet installed"
              >
                Vibration (Coming Soon)
              </span>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {(["1h", "24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${range === r
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-80 w-full">
          {isLoading && historicalTrendPoints.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono animate-pulse">
              Querying live station telemetry from Neon database...
            </div>
          ) : historicalTrendPoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 text-xs text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <span className="font-semibold text-slate-700">
                No telemetry records in selected {range} window for Station {stationId}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Awaiting live ESP32 hardware upload via POST /api/ingest
              </span>
            </div>
          ) : chartMode === "flow" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrendPoints} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  interval="preserveStartEnd"
                  minTickGap={45}
                />
                <YAxis tick={{ fontSize: 10, fill: "#0284c7" }} stroke="#cbd5e1" domain={["auto", "auto"]} unit=" L/m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={currentBaseline.q0}
                  label={{ value: `Baseline Q₀ (${currentBaseline.q0} L/m)`, fill: "#dc2626", fontSize: 10 }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="flowAvg"
                  name="Flow Rate (L/min)"
                  stroke="#019FD7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrendPoints} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  interval="preserveStartEnd"
                  minTickGap={45}
                />
                <YAxis tick={{ fontSize: 10, fill: "#4f46e5" }} stroke="#cbd5e1" domain={["auto", "auto"]} unit=" bar" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={currentBaseline.p0}
                  label={{ value: `Baseline P₀ (${currentBaseline.p0} bar)`, fill: "#dc2626", fontSize: 10 }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="pressureAvg"
                  name="Pressure (bar)"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hydraulic Correlation */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-premium space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Gauge className="w-4 h-4 text-sky-600" />
              Hydraulic Correlation: Flow (Q) vs Pressure (P)
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
              Dual Transducers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Simultaneous mass balance and pressure drop verification across {range}
          </p>
        </div>

        <div className="h-60 w-full">
          {historicalTrendPoints.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              Awaiting live telemetry stream...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  interval="preserveStartEnd"
                  minTickGap={45}
                />
                <YAxis yAxisId="flow" tick={{ fontSize: 10, fill: "#0284c7" }} stroke="#cbd5e1" domain={["auto", "auto"]} unit=" L/m" />
                <YAxis yAxisId="press" orientation="right" tick={{ fontSize: 10, fill: "#4f46e5" }} stroke="#cbd5e1" domain={["auto", "auto"]} unit=" bar" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="flowAvg"
                  name="Flow (L/min)"
                  stroke="#019FD7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="press"
                  type="monotone"
                  dataKey="pressureAvg"
                  name="Pressure (bar)"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hardware Interface & Transducer Roles Card */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>Transducer Specifications &amp; Bus Pinout</span>
            </div>
          }
          subtitle={`Physical wiring mapping from Station ${stationId} to the ESP32-S3 Controller (2 active sensors + 1 planned)`}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Flow */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-sky-700">1. Flow Sensor (Active)</span>
                <span className="text-[11px] text-slate-500">Hall / EL817</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Hall-effect water flow turbine measuring volumetric flow in <strong className="text-slate-900">L/min</strong>. Isolated via EL817 optocoupler to ESP32-S3 GPIO pulse interrupts.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <strong>Algorithm Role:</strong> Inter-station flow difference ΔQ = Q_up − Q_down flags leaking pipe segment.
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-indigo-700">2. Pressure Sensor (Active)</span>
                <span className="text-[11px] text-slate-500">ADS1115 16-bit I²C</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                5V piezoresistive transducer (0.5–4.5V) scaled with 10kΩ/20kΩ voltage dividers and digitized with ADS1115 16-bit I2C ADC, measuring line pressure in <strong className="text-slate-900">bar</strong>.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <strong>Algorithm Role:</strong> Drop rate ΔP feeds Severity Index: SI = (P₀ − P) / P₀ × 100%.
              </div>
            </div>

            {/* Seismic — Coming Soon */}
            <div className="p-3.5 rounded-lg bg-amber-50/40 border border-dashed border-amber-200 space-y-2 opacity-75">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                <span className="font-bold text-amber-800">3. Vibration / Seismic</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Coming Soon</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Planned piezoelectric film module via EL817 optocoupler for pipe-wall acoustic and structural vibration capture. Not yet physically attached to the rig.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-amber-200/70">
                <strong>Status:</strong> Future hardware expansion; live pipeline currently operates bi-modally (Flow + Pressure).
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
