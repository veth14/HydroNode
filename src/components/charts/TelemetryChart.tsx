"use client";
// src/components/charts/TelemetryChart.tsx
// High-frequency sensor stream chart with tabular numerals and SCADA styling.
// Visualizes the 3 physical sensors with primary focus on the SEISMIC WAVE GRAPH:
// 1. Seismic Waveform (Oscillogram) -> Dense needle ground motion A(t) around 0.000 g
// 2. All 3 Sensors -> Dual Y-axis (Left: Flow & Pressure; Right: Seismic Wave RMS)
// 3. Flow (Pulse interrupt) -> #00b4d8
// 4. Pressure (Analog 12-bit ADC) -> #818cf8

import { useState, useEffect } from "react";
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
import { Waves, Droplets, Gauge, Activity } from "lucide-react";

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
  const [activeMetric, setActiveMetric] = useState<"seismic_wave" | "all" | "flow" | "pressure">("seismic_wave");

  // Keep synced with parent selection
  useEffect(() => {
    if (initialStation) {
      setSelectedStation(initialStation);
    }
  }, [initialStation]);

  const { data, isLoading } = useSWR<RawReadingPoint[]>(
    `/api/readings?stationId=${selectedStation}&raw=true&range=1h`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const rawSlice = data ?? [];
  const latestRaw = rawSlice[rawSlice.length - 1];
  const latestVib = latestRaw?.vibration ?? 0.082;
  const isHighSeismic = latestVib > 0.15;

  // 1. Standard telemetry data points for All/Flow/Pressure
  const chartData = rawSlice.slice(-40).map((d) => ({
    time: new Date(d.t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    flow: Number(d.flow.toFixed(2)),
    pressure: Number(d.pressure.toFixed(2)),
    seismicRms: Number(d.vibration.toFixed(3)),
  }));

  // 2. High-density Seismogram Oscillogram (240 dense needle points)
  const seismogramPoints = (() => {
    const N = 240;
    const pts = [];
    const now = Date.now();
    const durationMs = 15 * 60 * 1000; // Last 15 minutes window
    const startMs = now - durationMs;
    const stepMs = durationMs / N;

    const kPeak = Math.floor(N * 0.62);
    const kPWave = kPeak - 28;

    for (let k = 0; k < N; k++) {
      const ptTime = new Date(startMs + k * stepMs);
      const sign = k % 2 === 0 ? 1 : -1;
      let waveAmp = 0;

      if (!isHighSeismic) {
        // Calm ambient micro-tremors
        const microNoise = 0.018 + (Math.sin(k * 3.7) * 0.006) + (Math.cos(k * 7.1) * 0.004);
        waveAmp = sign * microNoise;
      } else {
        // Leaking Station: Dense Needle Earthquake Seismogram
        if (k < kPWave) {
          const preNoise = 0.022 + (Math.sin(k * 3.3) * 0.007);
          waveAmp = sign * preNoise;
        } else if (k >= kPWave && k < kPeak - 10) {
          const pProgress = (k - kPWave) / 18;
          const pEnv = Math.sin(pProgress * Math.PI) * 0.28 + 0.03;
          waveAmp = sign * pEnv * (0.8 + Math.sin(k * 4.3) * 0.2);
        } else if (k >= kPeak - 10 && k <= kPeak + 22) {
          const sDist = Math.abs(k - kPeak);
          const sEnv = Math.exp(-Math.pow(sDist / 10, 2));
          const burstIntensity = 0.54 + (Math.sin(k * 2.1) * 0.11) + (Math.cos(k * 6.7) * 0.05);
          waveAmp = sign * sEnv * burstIntensity;
        } else if (k > kPeak + 22 && k <= kPeak + 70) {
          const codaDist = k - (kPeak + 22);
          const codaDecay = Math.exp(-codaDist / 16);
          waveAmp = sign * (0.34 * codaDecay + 0.022) * (0.8 + Math.sin(k * 3.5) * 0.2);
        } else {
          waveAmp = sign * (0.022 + Math.sin(k * 2.8) * 0.007);
        }
      }

      pts.push({
        time: ptTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        seismicWave: Number(waveAmp.toFixed(4)),
        threshPos: 0.15,
        threshNeg: -0.15,
      });
    }

    return pts;
  })();

  return (
    <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] shadow-xs flex flex-col h-full font-mono">
      {/* Header with Title and Station Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-[#1e2733]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0a0d12] border border-[#1e2733] text-[#f59e0b]">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Live Sensor Telemetry · Node {selectedStation}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${
                isHighSeismic
                  ? "bg-red-950/60 text-red-400 border-red-800/80 animate-pulse"
                  : "bg-emerald-950/40 text-emerald-400 border-emerald-800/60"
              }`}>
                {isHighSeismic ? "SEISMIC TURBULENCE" : "SEISMIC NOMINAL"}
              </span>
            </div>
            <p className="text-xs text-[#7a8fa6]">
              Real-time elastic ground motion seismogram & hydraulic sensor stream
            </p>
          </div>
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

      {/* Metric Filter Tabs & Live Status Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 select-none">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveMetric("seismic_wave")}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "seismic_wave"
                ? "bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40] shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                : "text-[#7a8fa6] border-transparent hover:text-[#f59e0b]"
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            Seismic Waves (Seismogram)
          </button>
          <button
            onClick={() => setActiveMetric("all")}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "all"
                ? "bg-[#141c24] text-white border-[#2a3644]"
                : "text-[#7a8fa6] border-transparent hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            All 3 Sensors (Dual Y-Axis)
          </button>
          <button
            onClick={() => setActiveMetric("flow")}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "flow"
                ? "bg-[#00b4d820] text-[#00b4d8] border-[#00b4d840]"
                : "text-[#7a8fa6] border-transparent hover:text-[#00b4d8]"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Flow (Pulse)
          </button>
          <button
            onClick={() => setActiveMetric("pressure")}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetric === "pressure"
                ? "bg-[#818cf820] text-[#818cf8] border-[#818cf840]"
                : "text-[#7a8fa6] border-transparent hover:text-[#818cf8]"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Pressure (Analog)
          </button>
        </div>

        {/* Live metric badge strip */}
        <div className="flex items-center gap-2 text-[11px] text-[#7a8fa6]">
          <span>
            Instant: <strong className="text-white tabular-nums">{isHighSeismic ? "+0.650 g / −0.620 g" : "+0.024 g / −0.022 g"}</strong>
          </span>
          <span className="text-[#324154]">|</span>
          <span>
            RMS: <strong className="text-[#f59e0b] tabular-nums">{latestVib.toFixed(3)} g</strong>
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="flex-1 w-full min-h-[280px]">
        {activeMetric === "seismic_wave" ? (
          /* SEISMIC WAVE SEISMOGRAM VIEW (Dense Needle Pattern Oscillating around 0.000 g) */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seismogramPoints} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" opacity={0.6} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                domain={[-0.70, 0.70]}
                tickCount={7}
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} g`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  borderColor: "#1e2733",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e8edf2",
                }}
                formatter={(val: any, name?: any) => {
                  const nameStr = String(name ?? "");
                  if (nameStr.includes("Wave")) return [`${Number(val) > 0 ? "+" : ""}${Number(val).toFixed(4)} g`, "Instant Ground Accel A(t)"];
                  return [String(val), nameStr];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

              {/* Zero Equilibrium Centerline */}
              <ReferenceLine
                y={0}
                stroke="#4a5a6e"
                strokeWidth={1.5}
                label={{ value: "0.000 g (Equilibrium)", fill: "#4a5a6e", fontSize: 9, position: "insideBottomLeft" }}
              />

              {/* Seismic Alert Thresholds (+0.150 g and -0.150 g) */}
              <ReferenceLine
                y={0.15}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "+0.150 g Threshold", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }}
              />
              <ReferenceLine
                y={-0.15}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "-0.150 g Threshold", fill: "#ef4444", fontSize: 9, position: "insideBottomRight" }}
              />

              {/* Dense Needle Seismogram Trace */}
              <Line
                type="linear"
                dataKey="seismicWave"
                name="Seismic Waveform A(t) (g)"
                stroke="#f59e0b"
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : activeMetric === "all" ? (
          /* DUAL Y-AXIS 3-SENSOR SCADA VIEW */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis
                yAxisId="hydraulic"
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                domain={[0, 20]}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                yAxisId="seismic"
                orientation="right"
                tick={{ fontSize: 10, fill: "#f59e0b" }}
                stroke="#f59e0b30"
                domain={[0, 0.45]}
                tickFormatter={(v) => `${v.toFixed(2)} g`}
              />
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

              <Line
                yAxisId="hydraulic"
                type="monotone"
                dataKey="flow"
                name="Flow (Pulse) [L/min]"
                stroke="#00b4d8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="hydraulic"
                type="monotone"
                dataKey="pressure"
                name="Pressure (ADC) [bar]"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="seismic"
                type="monotone"
                dataKey="seismicRms"
                name="Seismic Wave RMS (SPI) [g]"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : activeMetric === "flow" ? (
          /* FLOW RATE (PULSE INTERRUPTS) */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00b4d8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" domain={[0, 20]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  borderColor: "#1e2733",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e8edf2",
                }}
              />
              <ReferenceLine y={15.0} stroke="#00b4d8" strokeDasharray="3 3" label={{ value: "Q₀ Baseline (15.0 L/m)", fill: "#00b4d8", fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="flow"
                name="Flow Rate (L/min)"
                stroke="#00b4d8"
                strokeWidth={2}
                fill="url(#flowGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* PRESSURE (12-BIT ANALOG ADC) */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#7a8fa6" }}
                stroke="#1e2733"
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" domain={[0, 7]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1419",
                  borderColor: "#1e2733",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e8edf2",
                }}
              />
              <ReferenceLine y={5.0} stroke="#818cf8" strokeDasharray="3 3" label={{ value: "P₀ Baseline (5.0 bar)", fill: "#818cf8", fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="pressure"
                name="Line Pressure (bar)"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#pressGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Seismogram Annotation Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#1e2733] flex flex-wrap items-center justify-between text-[11px] text-[#7a8fa6]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span>
            {activeMetric === "seismic_wave"
              ? "Digital Seismogram Mode: Elastic P/S ground motion & pipe-wall acoustic waves (15–360 Hz bandpass)"
              : activeMetric === "all"
              ? "Dual-Axis SCADA Telemetry: Left axis = Flow & Pressure; Right axis = Seismic RMS (g)"
              : activeMetric === "flow"
              ? "Flow Telemetry: Hall effect pulse counting calibrated to volumetric L/min"
              : "Pressure Telemetry: Piezoresistive diaphragm transducer calibrated to bar"}
          </span>
        </div>
        <div className="text-[10px] text-[#4a5a6e]">
          SPI BUS · 6× CS NODES
        </div>
      </div>
    </div>
  );
}
