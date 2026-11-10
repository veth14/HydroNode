"use client";
// src/components/charts/TelemetryChart.tsx
// High-frequency sensor stream chart with tabular numerals and SCADA styling.
// Clearly charts the 3 sensors:
// 1. Flow (Pulse) -> #00b4d8
// 2. Pressure (Analog) -> #818cf8
// 3. Vibration (SPI/MEMS) -> #f59e0b

import { useState } from "react";
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
} from "recharts";
import type { StationId } from "@/types";
import { STATION_IDS } from "@/config/rig";

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
  const [selectedStation, setSelectedStation] = useState<StationId>(initialStation);
  const [activeMetric, setActiveMetric] = useState<"all" | "flow" | "pressure" | "vibration">("all");

  const { data, isLoading } = useSWR<RawReadingPoint[]>(
    `/api/readings?stationId=${selectedStation}&raw=true&range=1h`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const chartData = (data ?? []).slice(-35).map((d) => ({
    time: new Date(d.t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    flow: Number(d.flow.toFixed(2)),
    pressure: Number(d.pressure.toFixed(2)),
    vibration: Number(d.vibration.toFixed(3)),
  }));

  return (
    <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] shadow-xs flex flex-col h-full font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-[#1e2733]">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Live Telemetry Stream
          </h3>
          <p className="text-xs text-[#7a8fa6]">
            3-second polling interval from Node {selectedStation}
          </p>
        </div>

        {/* Station Selector */}
        <div className="flex items-center gap-1 bg-[#0a0d12] p-1 rounded-lg border border-[#1e2733]">
          {STATION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedStation(id)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                selectedStation === id
                  ? "bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.5)]"
                  : "text-[#7a8fa6] hover:text-white"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Filter Tabs */}
      <div className="flex gap-1.5 mb-3 select-none">
        <button
          onClick={() => setActiveMetric("all")}
          className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer ${
            activeMetric === "all"
              ? "bg-[#141c24] text-white border-[#2a3644]"
              : "text-[#7a8fa6] border-transparent hover:text-white"
          }`}
        >
          All 3 Sensors
        </button>
        <button
          onClick={() => setActiveMetric("flow")}
          className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer ${
            activeMetric === "flow"
              ? "bg-[#00b4d820] text-[#00b4d8] border-[#00b4d840]"
              : "text-[#7a8fa6] border-transparent hover:text-[#00b4d8]"
          }`}
        >
          Flow (Pulse)
        </button>
        <button
          onClick={() => setActiveMetric("pressure")}
          className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer ${
            activeMetric === "pressure"
              ? "bg-[#818cf820] text-[#818cf8] border-[#818cf840]"
              : "text-[#7a8fa6] border-transparent hover:text-[#818cf8]"
          }`}
        >
          Pressure (Analog)
        </button>
        <button
          onClick={() => setActiveMetric("vibration")}
          className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer ${
            activeMetric === "vibration"
              ? "bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]"
              : "text-[#7a8fa6] border-transparent hover:text-[#f59e0b]"
          }`}
        >
          Vib (SPI/MEMS)
        </button>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        {isLoading && (!chartData || chartData.length === 0) ? (
          <div className="flex items-center justify-center h-full text-xs text-[#7a8fa6] animate-pulse">
            Loading telemetry points...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#7a8fa6]">
            No readings recorded yet for {selectedStation}. Trigger simulation to populate.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" />
              <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  borderColor: "#1e2733",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e8edf2",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

              {(activeMetric === "all" || activeMetric === "flow") && (
                <Line
                  type="monotone"
                  dataKey="flow"
                  name="Flow (L/min)"
                  stroke="#00b4d8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMetric === "all" || activeMetric === "pressure") && (
                <Line
                  type="monotone"
                  dataKey="pressure"
                  name="Pressure (bar)"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMetric === "all" || activeMetric === "vibration") && (
                <Line
                  type="monotone"
                  dataKey="vibration"
                  name="Vibration (g)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
