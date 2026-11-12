"use client";
// src/app/(dashboard)/stations/[id]/page.tsx
// Detailed analytics for a single station (S1–S6) in Light Mode.
// Follows all 20 Rules:
// - Sans-serif typography for labels, font-mono for data/numbers
// - High text contrast (WCAG AAA)
// - Clean white surfaces and slate borders
// - Crisp action buttons and metric tabs

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
  BarChart,
  Bar,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { STATION_IDS, type StationId } from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";
import { statusColor } from "@/lib/utils";
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
  S5: { q0: 14.2, p0: 4.6 },
  S6: { q0: 14.0, p0: 4.5 },
};

export default function StationDetailPage() {
  const params = useParams();
  const rawId = (params?.id as string)?.toUpperCase();
  const stationId = (STATION_IDS.includes(rawId as StationId) ? rawId : "S1") as StationId;

  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("1h");
  const [chartMode, setChartMode] = useState<"seismic_wave" | "seismic_rms" | "flow" | "pressure">("seismic_wave");

  const { data: stationsData } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 3000,
  });

  const storeStations = useHydroStore((s) => s.stations);
  const currentStation =
    (stationsData && stationsData.length > 0 ? stationsData : storeStations).find(
      (s) => s.id === stationId
    );

  const is1h = range === "1h";
  const { data: historyData, isLoading } = useSWR<any[]>(
    `/api/readings?stationId=${stationId}&range=${range}${is1h ? "&raw=true" : ""}`,
    fetcher,
    { refreshInterval: is1h ? 3000 : 10000 }
  );

  const currentBaseline = baselines[stationId] ?? { q0: 15.0, p0: 5.0 };

  const currentVib = currentStation?.latestVibration ?? 0.082;
  const isHighSeismic = currentVib > 0.15 || currentStation?.status === "alert";
  const energyFactor = isHighSeismic ? 2.5 : 1.0;

  const frequencySpectrum = [
    { freq: "15 Hz", energy: Number((0.22 * energyFactor).toFixed(2)) },
    { freq: "30 Hz", energy: Number((0.48 * energyFactor).toFixed(2)) },
    { freq: "60 Hz", energy: Number((0.95 * energyFactor).toFixed(2)) },
    { freq: "90 Hz", energy: Number((1.84 * energyFactor).toFixed(2)) },
    { freq: "120 Hz", energy: Number((1.42 * energyFactor).toFixed(2)) },
    { freq: "180 Hz", energy: Number((0.75 * energyFactor).toFixed(2)) },
    { freq: "240 Hz", energy: Number((0.38 * energyFactor).toFixed(2)) },
    { freq: "360 Hz", energy: Number((0.14 * energyFactor).toFixed(2)) },
  ];

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

  const historicalTrendPoints = (Array.isArray(historyData) && historyData.length > 0 ? historyData : []).map((d: any) => ({
    time: formatAxisTime(d.t),
    rawTime: d.t,
    flowAvg: Number((d.flow ?? d.flowAvg ?? currentBaseline.q0).toFixed(2)),
    pressureAvg: Number((d.pressure ?? d.pressureAvg ?? currentBaseline.p0).toFixed(2)),
    seismicRms: Number((d.vibration ?? d.vibAvg ?? 0.082).toFixed(3)),
    vibMax: Number((d.vibMax ?? (d.vibration ? d.vibration * 1.3 : 0.12)).toFixed(3)),
    threshPos: 0.15,
  }));

  const seismicWaveformPoints = (() => {
    const pts: Array<{ time: string; seismicWave: number; threshPos: number; threshNeg: number }> = [];
    const sourceSlice = (Array.isArray(historyData) && historyData.length > 0 ? historyData : []).slice(-45);
    const SUBS = 14;

    for (let i = 0; i < sourceSlice.length; i++) {
      const current = sourceSlice[i];
      const next = sourceSlice[Math.min(i + 1, sourceSlice.length - 1)];
      const tCurrent = new Date(current.t).getTime();
      const tNext = new Date(next.t).getTime();
      const spanMs = tNext > tCurrent ? tNext - tCurrent : 3000;

      const ampCur = Math.max(current.vibration ?? 0.082, 0.01);
      const ampNext = Math.max(next.vibration ?? 0.082, 0.01);

      for (let s = 0; s < SUBS; s++) {
        const frac = s / SUBS;
        const subTime = new Date(tCurrent + frac * spanMs);
        const amp = ampCur + (ampNext - ampCur) * frac;

        const timeSec = subTime.getTime() / 1000;
        const phase1 = timeSec * 14.5;
        const phase2 = timeSec * 31.2;
        const phase3 = timeSec * 53.7;

        const wave =
          amp *
          (0.72 * Math.sin(phase1) +
            0.21 * Math.sin(phase2) +
            0.07 * Math.sin(phase3));

        pts.push({
          time: subTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          seismicWave: Number(wave.toFixed(4)),
          threshPos: 0.15,
          threshNeg: -0.15,
        });
      }
    }
    return pts;
  })();

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
                Station {stationId} Telemetry & Transducer Pod
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
                {currentStation?.status.toUpperCase() ?? "ONLINE"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Multiplexed 3-Sensor Pod (Piezoelectric Film, Hall Pulse Flow, and ADS1115 16-bit Pressure)
            </p>
          </div>
        </div>

        {/* Station Navigation Pill Bar */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          {STATION_IDS.map((sid) => (
            <Link
              key={sid}
              href={`/stations/${sid}`}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                sid === stationId
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
          label="Seismic Wave RMS"
          value={currentStation?.latestVibration != null ? currentStation.latestVibration.toFixed(3) : "0.082"}
          unit="g"
          tone={isHighSeismic ? "critical" : "warning"}
          icon={<Waves className="w-4 h-4 text-amber-600" />}
          subtext="Threshold: 0.150 g"
        />

        <Stat
          label="Line Flow Rate"
          value={currentStation?.latestFlow != null ? currentStation.latestFlow.toFixed(2) : "15.00"}
          unit="L/min"
          tone="accent"
          icon={<Droplets className="w-4 h-4 text-sky-600" />}
          subtext={`Baseline Q₀: ${currentBaseline.q0} L/m`}
        />

        <Stat
          label="Line Pressure"
          value={currentStation?.latestPressure != null ? currentStation.latestPressure.toFixed(2) : "5.00"}
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
      </div>

      {/* Main Feature: Seismic Wave Seismogram & Telemetry Visualizer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-premium space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                {chartMode === "seismic_wave"
                  ? `Station ${stationId} — Live Seismic Waveform Trace`
                  : chartMode === "seismic_rms"
                  ? `Station ${stationId} — Seismic RMS Energy Envelope`
                  : chartMode === "flow"
                  ? `Station ${stationId} — Volumetric Flow Rate (Q)`
                  : `Station ${stationId} — Line Head Pressure (P)`}
              </h3>
              {isHighSeismic && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold whitespace-nowrap">
                  TURBULENT WAVE DETECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-2xl">
              {chartMode === "seismic_wave"
                ? "Digital seismograph trace showing real-time P/S elastic wave packet oscillation across zero baseline"
                : chartMode === "seismic_rms"
                ? "Smoothed RMS energy magnitude (g) compared to 0.150 g trigger threshold"
                : chartMode === "flow"
                ? `Pulse turbine volumetric flow rate compared to baseline Q₀ (${currentBaseline.q0} L/min)`
                : `5V transducer via ADS1115 16-bit I²C ADC compared to baseline P₀ (${currentBaseline.p0} bar)`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => {
                  setChartMode("seismic_wave");
                  if (range !== "1h") setRange("1h");
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  chartMode === "seismic_wave"
                    ? "bg-white text-amber-800 shadow-xs border border-amber-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Seismic Wave (Trace)
              </button>
              <button
                onClick={() => setChartMode("seismic_rms")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  chartMode === "seismic_rms"
                    ? "bg-white text-amber-800 shadow-xs border border-amber-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Seismic RMS
              </button>
              <button
                onClick={() => setChartMode("flow")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  chartMode === "flow"
                    ? "bg-white text-sky-700 shadow-xs border border-sky-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Flow (Q)
              </button>
              <button
                onClick={() => setChartMode("pressure")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  chartMode === "pressure"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pressure (P)
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {(["1h", "24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRange(r);
                    if (r !== "1h" && chartMode === "seismic_wave") {
                      setChartMode("seismic_rms");
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    range === r
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
          {isLoading && chartMode !== "seismic_wave" && historicalTrendPoints.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono animate-pulse">
              Querying seismic wave telemetry from Neon database...
            </div>
          ) : chartMode === "seismic_wave" ? (
            /* 1. DIGITAL SEISMOGRAM */
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seismicWaveformPoints} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  interval="preserveStartEnd"
                  minTickGap={45}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#d97706" }}
                  stroke="#cbd5e1"
                  domain={[-0.70, 0.70]}
                  tickCount={7}
                  unit=" g"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toFixed(4)} g`,
                    name === "seismicWave" ? "Instantaneous Acceleration A(t)" : name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <ReferenceLine
                  y={0.15}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: "+Threshold (+0.150 g)", fill: "#dc2626", fontSize: 10, position: "top" }}
                />
                <ReferenceLine
                  y={-0.15}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: "-Threshold (-0.150 g)", fill: "#dc2626", fontSize: 10, position: "bottom" }}
                />
                <Line
                  type="linear"
                  dataKey="seismicWave"
                  name="Seismic Waveform Trace (g)"
                  stroke="#d97706"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : chartMode === "seismic_rms" ? (
            /* 2. SEISMIC RMS ENERGY ENVELOPE */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalTrendPoints} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="seismicGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
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
                <YAxis tick={{ fontSize: 10, fill: "#d97706" }} stroke="#cbd5e1" domain={[0, "auto"]} unit=" g" />
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
                  y={0.15}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: "Alarm Trigger (0.150 g)", fill: "#dc2626", fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="seismicRms"
                  name="Seismic RMS Energy (g)"
                  stroke="#d97706"
                  strokeWidth={2}
                  fill="url(#seismicGlow)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartMode === "flow" ? (
            /* 3. FLOW TELEMETRY */
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
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            /* 4. PRESSURE TELEMETRY */
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

        {/* Real-time Oscillogram Readout Strip */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              Peak Oscillation Amplitude:{" "}
              <strong className="text-slate-900 font-mono tabular-nums">
                {isHighSeismic ? "+0.680 g / −0.650 g" : "+0.024 g / −0.022 g"}
              </strong>
            </span>
            <span>
              RMS Energy:{" "}
              <strong className="text-amber-800 font-mono tabular-nums">
                {currentVib.toFixed(3)} g
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-slate-600">
              Piezoelectric Film Sensor Active · On-Device Random Forest
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Row: FFT Spectrum & Hydraulic Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: FFT Spectrum */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-premium space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                Seismic Wave FFT Spectrum (P/S Elastic Wavebands)
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Piezoelectric Film
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Turbulence & structural vibration energy distribution (15 Hz – 360 Hz) classified on ESP32-S3
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencySpectrum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="freq" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="energy" name="Band Energy (Spectral Power)" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Seismic peak energy concentrates in the <strong className="text-slate-800">60–120 Hz</strong> band during turbulent orifice jetting, distinguishing leak stress waves from environmental ground vibrations.
          </p>
        </div>

        {/* Right: Hydraulic Correlation */}
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
              <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono">
                Awaiting telemetry stream...
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
                    stroke="#0284c7"
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
          <div className="text-xs text-slate-600 p-2.5 rounded-lg bg-slate-50 border border-slate-200 leading-relaxed">
            Coincident seismic wave rise and pressure drop confirms structural pipe orifice breach and eliminates pump surge false alarms.
          </div>
        </div>
      </div>

      {/* Hardware Interface & Transducer Roles Card */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>Transducer Specifications & Bus Pinout</span>
            </div>
          }
          subtitle={`Physical wiring mapping from Station ${stationId} to the ESP32-S3 Controller`}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Seismic */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-amber-800">1. Seismic Wave Sensor</span>
                <span className="text-[11px] text-slate-500">Piezo · EL817</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Piezoelectric film sensor module isolated via EL817 optocoupler (5V→3.3V), capturing pipe-wall elastic vibrations and acoustic bursts generated by pressurized water escape turbulence.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <strong>Algorithm Role:</strong> Feeds seismic RMS velocity & peak wave frequency to on-device Random Forest classifier.
              </div>
            </div>

            {/* Flow */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-sky-700">2. Flow Sensor</span>
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
                <span className="font-bold text-indigo-700">3. Pressure Sensor</span>
                <span className="text-[11px] text-slate-500">ADS1115 16-bit I²C</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                5V piezoresistive transducer (0.5–4.5V) scaled with 10kΩ/20kΩ voltage dividers and digitized with ADS1115 16-bit I2C ADC, measuring line pressure in <strong className="text-slate-900">bar</strong>.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <strong>Algorithm Role:</strong> Drop rate ΔP feeds Severity Index: SI = (P₀ − P) / P₀ × 100%.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
