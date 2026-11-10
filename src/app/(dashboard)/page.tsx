"use client";
// src/app/(dashboard)/page.tsx
// Network Overview (home page) — Mission Control SCADA Design System.
// Follows "20 Ways to Unslop AI Designs":
// - No filler badges or random emojis
// - Explicit labels & consistent Lucide icons
// - Tabular numerals on all metrics
// - Inner radius = outer - padding
// - Deep representation of the 3 physical sensors per station:
//   1. Flow (Pulse) -> Q (L/min), inter-station imbalance
//   2. Pressure (Analog) -> P (bar), Severity Index SI
//   3. Vibration (SPI/MEMS MPU6050) -> acoustic turbulence noise

import { useState } from "react";
import Link from "next/link";
import { RigMap } from "@/components/rig/RigMap";
import { TelemetryChart } from "@/components/charts/TelemetryChart";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useHydroStore } from "@/store/hydroStore";
import { statusColor } from "@/lib/utils";
import type { StationId, ZoneId, TestPoint as TestPointType } from "@/config/rig";
import { ZONES, STATION_IDS } from "@/config/rig";
import {
  AlertTriangle,
  ShieldCheck,
  Radio,
  Droplets,
  Zap,
  FlaskConical,
  ChevronRight,
  X,
  Gauge,
  Activity,
  Waves,
  Cpu,
  ArrowRight,
} from "lucide-react";

export default function NetworkOverviewPage() {
  const kpi = useHydroStore((s) => s.kpi);
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectLeak = useHydroStore((s) => s.injectLeak);

  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationId>("S1");

  const activeAlerts = alerts.filter((a) => a.status === "active");

  const handleTestPointClick = async (tp: TestPointType) => {
    injectLeak(tp.zoneId);
    try {
      await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaks: [{ zoneId: tp.zoneId, magnitude: "medium" }],
        }),
      });
    } catch (e) {
      console.error("Simulation trigger failed:", e);
    }
  };

  const selectedZoneData = selectedZone
    ? ZONES.find((z) => z.id === selectedZone)
    : null;
  const zoneAlert = selectedZone
    ? activeAlerts.find((a) => a.zoneId === selectedZone)
    : null;

  // Selected station live telemetry
  const activeStation = stations.find((s) => s.id === selectedStation) ?? stations[0];
  const stationIdx = STATION_IDS.indexOf(selectedStation);
  const nextStation = stationIdx < STATION_IDS.length - 1 ? stations.find((s) => s.id === STATION_IDS[stationIdx + 1]) : null;
  const flowDelta = activeStation && nextStation && activeStation.latestFlow != null && nextStation.latestFlow != null
    ? activeStation.latestFlow - nextStation.latestFlow
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1e2733]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight font-mono">
              Pipeline Network Overview
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              Rig Active
            </span>
          </div>
          <p className="text-xs text-[#7a8fa6] mt-0.5">
            Real-time acoustic & pressure telemetry across 5 pipeline zones (S1–S6 Tri-Sensor Bus)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/simulation">
            <Button
              variant="secondary"
              size="sm"
              icon={<FlaskConical className="w-3.5 h-3.5 text-[#00b4d8]" />}
            >
              Simulation Panel
            </Button>
          </Link>
          <Link href="/alerts">
            <Button
              variant={activeAlerts.length > 0 ? "destructive" : "secondary"}
              size="sm"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Alerts ({activeAlerts.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Row (Industrial tab numbers, high contrast, clean icons) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Stat
          label="Active Alerts"
          value={kpi?.activeAlerts ?? 0}
          tone={(kpi?.activeAlerts ?? 0) > 0 ? "critical" : "success"}
          icon={<AlertTriangle className="w-4 h-4" />}
          subtext={(kpi?.activeAlerts ?? 0) > 0 ? "Leak triage required" : "All zones nominal"}
        />

        <Stat
          label="Zones Monitored"
          value={`${kpi?.zonesHealthy ?? 5} / ${kpi?.zonesTotal ?? 5}`}
          tone="default"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          subtext="5 physical segments"
        />

        <Stat
          label="Stations Online"
          value={`${kpi?.stationsOnline ?? 6} / ${kpi?.stationsTotal ?? 6}`}
          tone="default"
          icon={<Radio className="w-4 h-4 text-[#00b4d8]" />}
          subtext="CAT6 multiplexed bus"
        />

        <Stat
          label="Estimated Water Loss"
          value={kpi?.estimatedWaterLoss?.toFixed(1) ?? "0.0"}
          unit="L/min"
          tone={(kpi?.estimatedWaterLoss ?? 0) > 0 ? "critical" : "default"}
          icon={<Droplets className="w-4 h-4 text-[#00b4d8]" />}
          subtext="Flow imbalance (Q₀ − Q)"
        />

        <Stat
          label="Adaptive Sampling"
          value={
            stations.some((s) => s.samplingMode === "elevated")
              ? "100 Hz"
              : "10 Hz"
          }
          tone={
            stations.some((s) => s.samplingMode === "elevated")
              ? "warning"
              : "default"
          }
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          subtext={
            stations.some((s) => s.samplingMode === "elevated")
              ? "Elevated (deviation detected)"
              : "Nominal edge polling"
          }
        />
      </div>

      {/* Hero Component: Live Rig Map */}
      <div className="relative">
        <RigMap
          selectedStationId={selectedStation}
          selectedZoneId={selectedZone}
          onSelectStation={(id) => setSelectedStation(id)}
          onSelectZone={(id) => setSelectedZone(id)}
          onInjectLeak={handleTestPointClick}
        />

        {/* Selected Zone Side Drawer */}
        {selectedZone && selectedZoneData && (
          <div className="absolute top-4 right-4 z-20 w-84 bg-[#0f1419]/95 backdrop-blur-md border border-[#1e2733] text-[#e8edf2] rounded-xl p-4 shadow-2xl animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2733]">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Zone {selectedZoneData.id} Segment</span>
                  <Badge
                    variant={
                      zoneAlert?.severity === "high"
                        ? "critical"
                        : zoneAlert?.severity === "medium"
                        ? "warning"
                        : "success"
                    }
                    size="sm"
                    dot
                  >
                    {zoneAlert ? zoneAlert.severity.toUpperCase() : "NOMINAL"}
                  </Badge>
                </h3>
                <p className="text-[11px] text-[#7a8fa6] mt-0.5">
                  Bounded by Station {selectedZoneData.stationA} ➔ {selectedZoneData.stationB}
                </p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-[#7a8fa6] hover:text-white p-1 rounded-md transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              {zoneAlert ? (
                <>
                  <div className="flex justify-between py-1 border-b border-[#1a2230]">
                    <span className="text-[#7a8fa6]">Severity Index (SI)</span>
                    <span className="font-bold tabular-nums text-amber-400">
                      {zoneAlert.si?.toFixed(1) ?? "--"}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1a2230]">
                    <span className="text-[#7a8fa6]">Estimated Leak Rate</span>
                    <span className="font-bold tabular-nums text-red-400">
                      {zoneAlert.leakRate?.toFixed(1) ?? "--"} L/min
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1a2230]">
                    <span className="text-[#7a8fa6]">Model Confidence</span>
                    <span className="font-bold tabular-nums text-[#00b4d8]">
                      {(zoneAlert.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-[#7a8fa6] block mb-1">
                      Action Protocol:
                    </span>
                    <div className="p-2.5 bg-[#141c24] rounded-lg border border-[#1e2733] text-slate-200 text-xs leading-relaxed">
                      {zoneAlert.recommendedAction}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-xs text-[#7a8fa6]">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  No acoustic or flow deviations flagged in this zone segment.
                </div>
              )}

              <div className="pt-2 text-[10px] text-[#4a5a6e] leading-normal border-t border-[#1a2230]">
                Note: Localizes pipe segment between sensor stations, not exact coordinate.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tri-Sensor Station Architecture Breakdown (Focusing on the 3 sensors per station) */}
      <Card glow={true} className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00b4d8]" />
              <span>Station {selectedStation} Tri-Sensor Pod Architecture & Telemetry</span>
            </div>
          }
          subtitle="Each station deploys 3 distinct physical transducers multiplexed to the ESP32 edge controller"
          action={
            <div className="flex items-center gap-1.5 bg-[#0a0d12] p-1 rounded-lg border border-[#1e2733]">
              {STATION_IDS.map((sid) => (
                <button
                  key={sid}
                  onClick={() => setSelectedStation(sid)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                    selectedStation === sid
                      ? "bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.6)]"
                      : "text-[#7a8fa6] hover:text-white"
                  }`}
                >
                  {sid}
                </button>
              ))}
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {/* Sensor 1: Flow Sensor */}
            <div className="p-4 rounded-xl bg-[#0a0d12] border border-[#1e2733] hover:border-[#00b4d840] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1e2733]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00b4d8] shadow-[0_0_6px_#00b4d8]" />
                    <span className="text-xs font-bold text-white">Flow Sensor</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00b4d815] text-[#00b4d8] border border-[#00b4d830]">
                    Pulse Signal
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold tabular-nums text-[#00b4d8]">
                    {activeStation?.latestFlow != null ? activeStation.latestFlow.toFixed(2) : "--"}
                    <span className="text-xs font-normal text-[#7a8fa6] ml-1.5">L/min</span>
                  </div>
                  <p className="text-[11px] text-[#7a8fa6] mt-1.5 leading-relaxed">
                    Outputs high-speed pulse interrupts connected directly to an ESP32 pulse counter pin.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2733] text-[11px] text-[#4a5a6e] space-y-1">
                <div className="flex justify-between">
                  <span>Downstream Delta:</span>
                  <span className={`font-bold tabular-nums ${flowDelta > 2 ? "text-red-400" : "text-slate-300"}`}>
                    {nextStation ? `${flowDelta.toFixed(2)} L/min` : "Rig Exit"}
                  </span>
                </div>
                <div className="text-[10px] text-[#7a8fa6]">
                  Role: Neighboring station flow imbalance flags the leaking zone.
                </div>
              </div>
            </div>

            {/* Sensor 2: Pressure Sensor */}
            <div className="p-4 rounded-xl bg-[#0a0d12] border border-[#1e2733] hover:border-[#818cf840] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1e2733]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8] shadow-[0_0_6px_#818cf8]" />
                    <span className="text-xs font-bold text-white">Pressure Sensor</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#818cf815] text-[#818cf8] border border-[#818cf830]">
                    Analog ADC
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold tabular-nums text-[#818cf8]">
                    {activeStation?.latestPressure != null ? activeStation.latestPressure.toFixed(2) : "--"}
                    <span className="text-xs font-normal text-[#7a8fa6] ml-1.5">bar</span>
                  </div>
                  <p className="text-[11px] text-[#7a8fa6] mt-1.5 leading-relaxed">
                    Analog piezoresistive transducer measuring hydraulic line pressure on 12-bit ADC.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2733] text-[11px] text-[#4a5a6e] space-y-1">
                <div className="flex justify-between">
                  <span>Baseline Calibration:</span>
                  <span className="text-slate-300 font-bold tabular-nums">5.00 bar (P₀)</span>
                </div>
                <div className="text-[10px] text-[#7a8fa6]">
                  Role: Sudden or gradual pressure drops compute the Severity Index (SI).
                </div>
              </div>
            </div>

            {/* Sensor 3: Seismic Wave Sensor */}
            <div className="p-4 rounded-xl bg-[#0a0d12] border border-[#1e2733] hover:border-[#f59e0b40] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1e2733]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]" />
                    <span className="text-xs font-bold text-white">Seismic Wave Sensor</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30]">
                    SPI · Seismic
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold tabular-nums text-[#f59e0b]">
                    {activeStation?.latestVibration != null ? activeStation.latestVibration.toFixed(3) : "--"}
                    <span className="text-xs font-normal text-[#7a8fa6] ml-1.5">RMS (g)</span>
                  </div>
                  <p className="text-[11px] text-[#7a8fa6] mt-1.5 leading-relaxed">
                    Measures ground motion & elastic pipe-wall seismic waves induced by pressurized fluid escape turbulence.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2733] text-[11px] text-[#4a5a6e] space-y-1">
                <div className="flex justify-between">
                  <span>Wavefront Band:</span>
                  <span className="text-slate-300 font-bold tabular-nums">60–240 Hz (P/S Waves)</span>
                </div>
                <div className="text-[10px] text-[#7a8fa6]">
                  Role: Captures elastic seismic wave propagation through pipe casing and bedding to confirm subsurface breach.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telemetry Chart & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TelemetryChart initialStation={selectedStation} />
        </div>

        {/* Active Alerts Card */}
        <div className="bg-[#0f1419] rounded-xl p-5 border border-[#1e2733] flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e2733]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Active Alerts Log
                </h3>
              </div>
              <Badge variant={activeAlerts.length > 0 ? "critical" : "neutral"} size="sm">
                {activeAlerts.length}
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#7a8fa6] text-xs text-center p-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2 stroke-[1.5]" />
                  <span>Pipeline operating nominally with no active leak events.</span>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-[#1e2733] bg-[#0a0d12] hover:border-[#2a3644] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge
                        variant={alert.severity === "high" ? "critical" : "warning"}
                        size="sm"
                        dot
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-[#7a8fa6] tabular-nums">
                        {new Date(alert.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-white">
                      Zone {alert.zoneId ?? "?"} ({alert.stationId})
                    </div>
                    <p className="text-[11px] text-[#7a8fa6] mt-1 line-clamp-2">
                      {alert.recommendedAction}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#4a5a6e] pt-2 border-t border-[#1a2230]">
                      <span className="tabular-nums">SI: {alert.si?.toFixed(1) ?? "--"}%</span>
                      <span className="tabular-nums">Rate: {alert.leakRate?.toFixed(1) ?? "--"} L/min</span>
                      {alert.repeatCount > 1 && (
                        <span className="text-red-400 font-bold tabular-nums">
                          ×{alert.repeatCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2733] mt-3">
            <Link
              href="/alerts"
              className="text-xs font-semibold text-[#00b4d8] hover:underline flex items-center justify-center gap-1"
            >
              Alert Log & Triage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sensor Nodes Status Table (S1–S6) */}
      <div className="bg-[#0f1419] rounded-xl border border-[#1e2733] overflow-hidden font-mono">
        <div className="px-5 py-4 border-b border-[#1e2733] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Sensor Nodes Status (S1–S6)
            </h3>
            <p className="text-xs text-[#7a8fa6]">
              Live telemetry via CAT6 multiplex bus · 3 transducers per station (Flow · Pressure · Seismic Wave)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0a0d12] text-[#7a8fa6] font-semibold border-b border-[#1e2733]">
                <th className="py-2.5 px-4">Station</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Sampling Mode</th>
                <th className="py-2.5 px-4 text-right text-[#00b4d8]">Flow (Pulse)</th>
                <th className="py-2.5 px-4 text-right text-[#818cf8]">Pressure (ADC)</th>
                <th className="py-2.5 px-4 text-right text-[#f59e0b]">Seismic Wave (g)</th>
                <th className="py-2.5 px-4">Last Seen</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {stations.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-[#141c24] transition-colors cursor-pointer ${
                    selectedStation === s.id ? "bg-[#00b4d80a]" : ""
                  }`}
                  onClick={() => setSelectedStation(s.id)}
                >
                  <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColor(s.status)}`} />
                    {s.name}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        s.status === "online"
                          ? "success"
                          : s.status === "elevated"
                          ? "warning"
                          : s.status === "alert"
                          ? "critical"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize text-slate-300">
                      {s.samplingMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#00b4d8] font-bold">
                    {s.latestFlow != null ? `${s.latestFlow.toFixed(2)} L/m` : "--"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#818cf8] font-bold">
                    {s.latestPressure != null ? `${s.latestPressure.toFixed(2)} bar` : "--"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#f59e0b] font-bold">
                    {s.latestVibration != null ? `${s.latestVibration.toFixed(3)} g` : "--"}
                  </td>
                  <td className="py-3 px-4 text-[#7a8fa6] tabular-nums">
                    {s.lastSeen
                      ? new Date(s.lastSeen).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/stations/${s.id}`}
                      className="text-[#00b4d8] hover:underline font-semibold flex items-center justify-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Inspect <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
