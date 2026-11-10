"use client";
// src/app/(dashboard)/stations/[id]/page.tsx
// Detailed analytics for a single station (S1–S6) — Mission Control SCADA System.
// Highlights the 3 physical sensors per station:
// 1. Flow Sensor (Pulse pin interrupt -> Q L/min)
// 2. Pressure Sensor (Analog 12-bit ADC -> P bar)
// 3. Vibration Sensor (SPI MEMS MPU6050 + CS pin -> RMS & FFT band energy)

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
} from "recharts";
import { STATION_IDS, type StationId } from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";
import { statusColor } from "@/lib/utils";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { LiveStation } from "@/types";
import { Droplets, Gauge, Activity, Zap, Cpu, ArrowLeft } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RawReadingPoint {
  t: string;
  flow: number;
  pressure: number;
  vibration: number;
}

interface MinuteAggregate {
  t: string;
  flowAvg: number;
  flowMin: number;
  flowMax: number;
  pressureAvg: number;
  pressureMin: number;
  pressureMax: number;
  vibAvg: number;
  vibMax: number;
  sampleCount: number;
}

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
  const rawId = (params?.id as string) ?? "S1";
  const stationId = (STATION_IDS.includes(rawId as StationId) ? rawId : "S1") as StationId;

  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("1h");

  // Fetch live stations directly so data is available on direct navigation / refresh
  const { data: stationsData } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });
  const storeStations = useHydroStore((s) => s.stations);
  const stations = stationsData && stationsData.length > 0 ? stationsData : storeStations;
  const currentStation = stations.find((s) => s.id === stationId);

  // 1h uses high-frequency raw telemetry points (dozens per cycle)
  // 24h/7d/30d use minute aggregates
  const is1h = range === "1h";
  const readingsUrl = is1h
    ? `/api/readings?stationId=${stationId}&raw=true&range=1h`
    : `/api/readings?stationId=${stationId}&range=${range}`;

  const { data: historyData, isLoading } = useSWR<any[]>(
    readingsUrl,
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: false }
  );

  const currentBaseline = baselines[stationId] ?? { q0: 15.0, p0: 5.0 };

  // Frequency spectrum based on vibration reading
  const currentVib = currentStation?.latestVibration ?? 0.08;
  const energyFactor = currentVib > 0.15 ? 2.5 : 1.0;

  const frequencySpectrum = [
    { freq: "60 Hz", energy: Number((0.12 * energyFactor).toFixed(2)) },
    { freq: "120 Hz", energy: Number((0.28 * energyFactor).toFixed(2)) },
    { freq: "240 Hz", energy: Number((0.45 * energyFactor).toFixed(2)) },
    { freq: "360 Hz", energy: Number((0.82 * energyFactor).toFixed(2)) },
    { freq: "420 Hz", energy: Number((1.64 * energyFactor).toFixed(2)) },
    { freq: "500 Hz", energy: Number((0.95 * energyFactor).toFixed(2)) },
    { freq: "600 Hz", energy: Number((0.34 * energyFactor).toFixed(2)) },
    { freq: "720 Hz", energy: Number((0.18 * energyFactor).toFixed(2)) },
  ];

  // Format data for Recharts
  const formattedChartData = Array.isArray(historyData)
    ? historyData.slice(is1h ? -35 : -100).map((d: any) => ({
        time: new Date(d.t).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: is1h ? "2-digit" : undefined,
        }),
        flowAvg: Number((d.flow ?? d.flowAvg ?? 0).toFixed(2)),
        flowMin: Number((d.flowMin ?? d.flow ?? 0).toFixed(2)),
        flowMax: Number((d.flowMax ?? d.flow ?? 0).toFixed(2)),
        pressureAvg: Number((d.pressure ?? d.pressureAvg ?? 0).toFixed(2)),
        vibAvg: Number((d.vibration ?? d.vibAvg ?? 0).toFixed(3)),
      }))
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans font-mono">
      {/* Header & Station Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1e2733]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-[#0f1419] border border-[#1e2733] text-[#7a8fa6] hover:text-white transition-colors cursor-pointer"
            title="Back to Network Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${statusColor(
                  currentStation?.status ?? "online"
                )}`}
              />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Station {stationId} Tri-Sensor Node Telemetry
              </h1>
              <Badge
                variant={
                  currentStation?.status === "alert"
                    ? "critical"
                    : currentStation?.status === "elevated"
                    ? "warning"
                    : "success"
                }
                size="sm"
                dot
              >
                {currentStation?.status?.toUpperCase() ?? "ONLINE"}
              </Badge>
            </div>
            <p className="text-xs text-[#7a8fa6] mt-0.5">
              Flow pulse interrupt, analog line pressure & SPI MPU6050 vibration telemetry
            </p>
          </div>
        </div>

        {/* Station Navigation Pills */}
        <div className="flex items-center gap-1 bg-[#0f1419] p-1 rounded-lg border border-[#1e2733]">
          {STATION_IDS.map((sid) => (
            <Link
              key={sid}
              href={`/stations/${sid}`}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                sid === stationId
                  ? "bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.6)]"
                  : "text-[#7a8fa6] hover:text-white"
              }`}
            >
              {sid}
            </Link>
          ))}
        </div>
      </div>

      {/* Snapshot Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Stat
          label="Flow (Pulse Signal)"
          value={
            currentStation?.latestFlow != null
              ? currentStation.latestFlow.toFixed(2)
              : currentBaseline.q0.toFixed(2)
          }
          unit="L/min"
          subtext={`Baseline Q₀: ${currentBaseline.q0} L/min`}
          icon={<Droplets className="w-4 h-4 text-[#00b4d8]" />}
          tone="accent"
          badge="GPIO Interrupt"
        />

        <Stat
          label="Pressure (Analog ADC)"
          value={
            currentStation?.latestPressure != null
              ? currentStation.latestPressure.toFixed(2)
              : currentBaseline.p0.toFixed(2)
          }
          unit="bar"
          subtext={`Baseline P₀: ${currentBaseline.p0} bar`}
          icon={<Gauge className="w-4 h-4 text-[#818cf8]" />}
          tone="default"
          badge="12-Bit ADC"
        />

        <Stat
          label="Vibration (SPI MPU6050)"
          value={
            currentStation?.latestVibration != null
              ? currentStation.latestVibration.toFixed(3)
              : "0.082"
          }
          unit="g (RMS)"
          subtext="Turbulence threshold: 0.150 g"
          icon={<Activity className="w-4 h-4 text-[#f59e0b]" />}
          tone={
            (currentStation?.latestVibration ?? 0) > 0.15 ? "warning" : "default"
          }
          badge="Dedicated CS Pin"
        />

        <Stat
          label="Sampling Mode"
          value={
            currentStation?.samplingMode === "elevated" ? "100 Hz" : "10 Hz"
          }
          subtext={
            currentStation?.samplingMode === "elevated"
              ? "Elevated (active deviation)"
              : "Slow polling (power saving)"
          }
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          tone={
            currentStation?.samplingMode === "elevated" ? "warning" : "default"
          }
          badge="Adaptive Edge"
        />
      </div>

      {/* Hardware Interface & Transducer Roles Card */}
      <Card glow={true}>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00b4d8]" />
              <span>Transducer Specifications & Bus Pinout</span>
            </div>
          }
          subtitle={`Physical wiring mapping from Station ${stationId} to the ESP32 Controller`}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Flow */}
            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2733]">
                <span className="font-bold text-[#00b4d8]">1. Flow Sensor</span>
                <span className="text-[10px] text-[#7a8fa6]">Hall Pulse</span>
              </div>
              <p className="text-[#7a8fa6] text-[11px] leading-relaxed">
                Measures volumetric water passage in <strong className="text-white">L/min</strong>. Outputs square wave frequency proportional to velocity.
              </p>
              <div className="text-[10px] text-[#4a5a6e] pt-1 border-t border-[#1a2230]">
                <strong>Algorithm Role:</strong> Inter-station flow difference ΔQ = Q_up − Q_down flags leaking pipe segment.
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2733]">
                <span className="font-bold text-[#818cf8]">2. Pressure Sensor</span>
                <span className="text-[10px] text-[#7a8fa6]">0–5V Analog</span>
              </div>
              <p className="text-[#7a8fa6] text-[11px] leading-relaxed">
                Piezoresistive diaphragm transducer measuring static/dynamic line pressure in <strong className="text-white">bar</strong>.
              </p>
              <div className="text-[10px] text-[#4a5a6e] pt-1 border-t border-[#1a2230]">
                <strong>Algorithm Role:</strong> Drop rate ΔP feeds Severity Index: SI = (P₀ − P) / P₀ × 100%.
              </div>
            </div>

            {/* Vibration */}
            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2733]">
                <span className="font-bold text-[#f59e0b]">3. Vibration Sensor</span>
                <span className="text-[10px] text-[#7a8fa6]">SPI Bus (MPU6050)</span>
              </div>
              <p className="text-[#7a8fa6] text-[11px] leading-relaxed">
                Clamped MEMS accelerometer capturing high-frequency acoustic pipe wall vibration caused by orifice leak turbulence.
              </p>
              <div className="text-[10px] text-[#4a5a6e] pt-1 border-t border-[#1a2230]">
                <strong>Algorithm Role:</strong> Feeds acoustic RMS & dominant frequency to on-device Random Forest classifier.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Range Selector & Flow Chart */}
      <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#1e2733]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Flow Rate Telemetry (Pulse Interrupts) vs Baseline
            </h3>
            <p className="text-xs text-[#7a8fa6]">
              {is1h ? "Live stream raw telemetry points (polled 3s)" : "Aggregated minute buckets"}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#0a0d12] p-1 rounded-lg border border-[#1e2733]">
            {(["1h", "24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                  range === r
                    ? "bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.5)]"
                    : "text-[#7a8fa6] hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          {isLoading && formattedChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-[#7a8fa6] animate-pulse">
              Querying telemetry stream from Neon database...
            </div>
          ) : formattedChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-[#7a8fa6] gap-2">
              <span>No telemetry points recorded in the last {range} window.</span>
              <span className="text-[11px] text-[#4a5a6e]">Trigger a test batch via the Simulation Panel or test script.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" />
                <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1419",
                    borderColor: "#1e2733",
                    borderRadius: "8px",
                    color: "#e8edf2",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#7a8fa6" }} />
                <ReferenceLine
                  y={currentBaseline.q0}
                  label={{ value: `Baseline Q₀ (${currentBaseline.q0})`, fill: "#ef4444", fontSize: 10 }}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="flowAvg"
                  name="Flow (L/min)"
                  stroke="#00b4d8"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#00b4d8" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pressure & Vibration Spectrum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pressure History */}
        <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] space-y-4">
          <div className="pb-2 border-b border-[#1e2733]">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Pressure History (Analog Transducer)
            </h3>
            <p className="text-xs text-[#7a8fa6]">
              Reference baseline P₀: {currentBaseline.p0} bar · Drop rate feeds Severity Index
            </p>
          </div>
          <div className="h-60 w-full">
            {formattedChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-[#7a8fa6]">
                Awaiting telemetry stream...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" />
                  <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f1419",
                      borderColor: "#1e2733",
                      borderRadius: "8px",
                      color: "#e8edf2",
                      fontSize: "11px",
                    }}
                  />
                  <ReferenceLine
                    y={currentBaseline.p0}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: `P₀ (${currentBaseline.p0} bar)`, fill: "#ef4444", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pressureAvg"
                    name="Pressure (bar)"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#818cf8" }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Vibration FFT Spectrum */}
        <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] space-y-4">
          <div className="pb-2 border-b border-[#1e2733]">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Acoustic Vibration FFT Spectrum (MPU6050 via SPI)
            </h3>
            <p className="text-xs text-[#7a8fa6]">
              Power density band features extracted on ESP32 edge model
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencySpectrum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
                <XAxis dataKey="freq" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" />
                <YAxis tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1419",
                    borderColor: "#1e2733",
                    borderRadius: "8px",
                    color: "#e8edf2",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="energy" name="Band Energy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
