"use client";
// src/components/charts/TelemetryChart.tsx
// Live high-frequency Flow & Pressure sensor stream chart in Light Mode.
// 8 sensors active (4 junctions × 2 sensors: Hall Flow + ADS1115 Pressure). Vibration coming soon.

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { StationId } from "@/types";
import { STATION_IDS } from "@/config/rig";
import { useSettings } from "@/hooks/useSettings";
import { Droplets, Gauge, Activity } from "lucide-react";

interface RawReadingPoint {
  t: string;
  flow: number;
  pressure: number;
  vibration: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TelemetryChart({
  initialStation = "S1",
}: {
  initialStation?: StationId;
}) {
  const [localOverride, setLocalOverride] = useState<{
    forInitial: StationId;
    value: StationId;
  } | null>(null);
  const selectedStation =
    localOverride?.forInitial === initialStation ? localOverride.value : initialStation;
  const setSelectedStation = (value: StationId) =>
    setLocalOverride({ forInitial: initialStation, value });

  const [activeMetric, setActiveMetric] = useState<"all" | "flow" | "pressure">("all");

  const { getBaseline } = useSettings();
  const baseline = getBaseline(selectedStation);

  const { data, isLoading } = useSWR<RawReadingPoint[]>(
    `/api/readings?stationId=${selectedStation}&raw=true&range=1h`,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  );

  const rawList = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasReadings = rawList.length > 0;

  const chartData = useMemo(() => {
    return rawList.slice(-45).map((d) => ({
      time: new Date(d.t).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Manila",
      }),
      flow: Number(d.flow.toFixed(2)),
      pressure: Number(d.pressure.toFixed(2)),
    }));
  }, [rawList]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-premium select-none">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Station {selectedStation} Telemetry Stream</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${hasReadings
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
              >
                {hasReadings ? "Live ESP32 Stream" : "Awaiting ESP32 Data"}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Live flow &amp; pressure telemetry from EL817 Hall pulse &amp; ADS1115 ADC
            </p>
          </div>
        </div>

        {/* Station Select & Metric Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value as StationId)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            {STATION_IDS.map((sid) => (
              <option key={sid} value={sid}>
                Station {sid}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveMetric("all")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${activeMetric === "all"
                ? "bg-white text-sky-700 shadow-xs border border-sky-200"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Flow &amp; Pressure
            </button>
            <button
              onClick={() => setActiveMetric("flow")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${activeMetric === "flow"
                ? "bg-white text-sky-700 shadow-xs border border-sky-200"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              Flow (Q)
            </button>
            <button
              onClick={() => setActiveMetric("pressure")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${activeMetric === "pressure"
                ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Pressure (P)
            </button>
            <span
              className="px-2 py-1 text-[10px] font-medium text-slate-400 cursor-not-allowed"
              title="Piezo vibration sensors are not yet installed on the rig"
            >
              Vibration (Soon)
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[300px] mt-4">
        {isLoading && chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
            Connecting to Live Telemetry Stream...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <span className="font-semibold text-slate-700">
              No live readings recorded in the last hour for {selectedStation}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Waiting for incoming ESP32 rows in sensor_data
            </span>
          </div>
        ) : activeMetric === "all" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis
                yAxisId="flow"
                tick={{ fontSize: 10, fill: "#0284c7" }}
                stroke="#cbd5e1"
                domain={[0, "auto"]}
                unit=" L/m"
              />
              <YAxis
                yAxisId="pressure"
                orientation="right"
                tick={{ fontSize: 10, fill: "#4f46e5" }}
                stroke="#4f46e540"
                domain={[0, "auto"]}
                unit=" bar"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#cbd5e1",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="flow"
                name="Flow (Pulse) [L/min]"
                stroke="#019FD7"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="pressure"
                type="monotone"
                dataKey="pressure"
                name="Pressure (ADS1115) [bar]"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : activeMetric === "flow" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#019FD7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#019FD7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#cbd5e1",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              />
              {baseline != null && (
                <ReferenceLine
                  y={baseline.q0}
                  stroke="#0284c7"
                  strokeDasharray="3 3"
                  label={{ value: `Q₀ Baseline (${baseline.q0} L/m)`, fill: "#0284c7", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="flow"
                name="Flow Rate (L/min)"
                stroke="#019FD7"
                strokeWidth={2}
                fill="url(#flowGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#cbd5e1",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              />
              {baseline != null && (
                <ReferenceLine
                  y={baseline.p0}
                  stroke="#4f46e5"
                  strokeDasharray="3 3"
                  label={{ value: `P₀ Baseline (${baseline.p0} bar)`, fill: "#4f46e5", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="pressure"
                name="Line Pressure (bar)"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#pressGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Annotation */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>
            {activeMetric === "all"
              ? "Dual-Axis Telemetry: Left axis = Flow Rate (L/min); Right axis = Line Pressure (bar)"
              : activeMetric === "flow"
                ? "Flow Telemetry: Hall effect pulse counting via EL817 optocoupler calibrated to L/min"
                : "Pressure Telemetry: 5V piezoresistive transducer via ADS1115 16-bit I2C ADC calibrated to bar"}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          4×2 SENSORS · ADS1115 + EL817 · LIVE ONLY
        </div>
      </div>
    </div>
  );
}
