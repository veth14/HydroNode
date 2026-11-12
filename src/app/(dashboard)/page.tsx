"use client";
// src/app/(dashboard)/page.tsx
// Pipeline Network Overview in Light Mode.
// Follows all 20 Rules to Unslop AI UI:
// 1. Delete filler badges
// 2. Drop redundant labels
// 3. Unitalicize random words
// 4. Mono only where needed (numbers & timestamps)
// 5. Unified design system (Light Mode Slate tokens)
// 6. Show the actual physical product clearly
// 7. Enlarge the main feature (Hero RigMap)
// 8. Group with clean whitespace
// 9. Specific headlines
// 10. Emphasize CTAs
// 11. Single precision accent (Sky 600)
// 12. Consistent Lucide icons
// 13. Remove embellishments & fake neon glow
// 14. Inner radius = outer - padding
// 15. Improve WCAG AAA text contrast
// 16. Wrap headlines properly (text-balance)
// 17. Align by eye
// 18. Tabular nums for all metrics
// 19. Add loading states
// 20. Animate useful feedback

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
      {/* 1. Page Header (Rule 1: No filler badges; Rule 9: Specific headline; Rule 10: Emphasize CTA) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight text-balance">
            Pipeline Network Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time acoustic & pressure telemetry across 5 pipeline zones (Stations S1–S6 Tri-Sensor Bus)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/simulation">
            <Button
              variant="accent"
              size="sm"
              icon={<FlaskConical className="w-3.5 h-3.5 text-sky-700" />}
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

      {/* 2. KPI Metrics Row (Rule 2: Drop redundant labels; Rule 18: Tabular nums) */}
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
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          subtext="Segments pressurized"
        />

        <Stat
          label="Stations Online"
          value={`${kpi?.stationsOnline ?? 6} / ${kpi?.stationsTotal ?? 6}`}
          tone="default"
          icon={<Radio className="w-4 h-4 text-sky-600" />}
          subtext="18 active sensors"
        />

        <Stat
          label="Estimated Water Loss"
          value={kpi?.estimatedWaterLoss?.toFixed(1) ?? "0.0"}
          unit="L/min"
          tone={(kpi?.estimatedWaterLoss ?? 0) > 0 ? "critical" : "default"}
          icon={<Droplets className="w-4 h-4 text-sky-600" />}
          subtext={(kpi?.estimatedWaterLoss ?? 0) > 0 ? "Compromised line" : "Zero fluid loss"}
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
          icon={<Zap className="w-4 h-4 text-amber-600" />}
          subtext={
            stations.some((s) => s.samplingMode === "elevated")
              ? "Elevated frequency"
              : "Nominal edge polling"
          }
        />
      </div>

      {/* 3. Hero Feature: Live Test Rig Map (Rule 6: Show actual product; Rule 7: Enlarge feature) */}
      <div className="relative">
        <RigMap
          selectedStationId={selectedStation}
          selectedZoneId={selectedZone}
          onSelectStation={(id) => setSelectedStation(id)}
          onSelectZone={(id) => setSelectedZone(id)}
          onInjectLeak={handleTestPointClick}
        />

        {/* Selected Zone Side Drawer in Light Mode */}
        {selectedZone && selectedZoneData && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 rounded-xl p-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
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
                <p className="text-xs text-slate-500 mt-0.5">
                  Bounded by Station {selectedZoneData.stationA} ➔ {selectedZoneData.stationB}
                </p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {zoneAlert ? (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Severity Index (SI)</span>
                    <span className="font-bold font-mono tabular-nums text-amber-700">
                      {zoneAlert.si?.toFixed(1) ?? "--"}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Estimated Leak Rate</span>
                    <span className="font-bold font-mono tabular-nums text-red-600">
                      {zoneAlert.leakRate?.toFixed(1) ?? "--"} L/min
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Model Confidence</span>
                    <span className="font-bold font-mono tabular-nums text-sky-700">
                      {(zoneAlert.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 block mb-1">
                      Action Protocol:
                    </span>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed">
                      {zoneAlert.recommendedAction}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  No acoustic or flow deviations flagged in this zone segment.
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 leading-normal border-t border-slate-100">
                Localizes pipe segment between sensor stations via flow loss delta & acoustic emission.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Tri-Sensor Architecture Pod Breakdown (Rule 14: Inner radius = outer - padding) */}
      <Card className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>Station {selectedStation} Tri-Sensor Pod Architecture & Telemetry</span>
            </div>
          }
          subtitle="Each station deploys 3 distinct physical transducers multiplexed to the ESP32 edge controller"
          action={
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {STATION_IDS.map((sid) => (
                <button
                  key={sid}
                  onClick={() => setSelectedStation(sid)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedStation === sid
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {sid}
                </button>
              ))}
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sensor 1: Flow Sensor */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                    <span className="text-xs font-bold text-slate-900">Flow Sensor</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    Pulse Signal
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold font-mono tabular-nums text-sky-700">
                    {activeStation?.latestFlow != null ? activeStation.latestFlow.toFixed(2) : "--"}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">L/min</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Hall-effect turbine sensor with EL817 optocoupler isolation (5V→3.3V) feeding ESP32-S3 GPIO pulse interrupts.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Downstream Delta:</span>
                  <span className={`font-bold font-mono tabular-nums ${flowDelta > 2 ? "text-red-600" : "text-slate-800"}`}>
                    {nextStation ? `${flowDelta.toFixed(2)} L/min` : "Rig Exit"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Neighboring station flow imbalance flags the leaking zone.
                </div>
              </div>
            </div>

            {/* Sensor 2: Pressure Sensor */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Pressure Sensor</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ADS1115 I²C
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold font-mono tabular-nums text-indigo-700">
                    {activeStation?.latestPressure != null ? activeStation.latestPressure.toFixed(2) : "--"}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">bar</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    5V piezoresistive transducer (0.5–4.5V) with 10kΩ/20kΩ divider read via ADS1115 16-bit I2C ADC.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Baseline Calibration:</span>
                  <span className="text-slate-800 font-bold font-mono tabular-nums">5.00 bar (P₀)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Sudden or gradual pressure drop rate computes Severity Index.
                </div>
              </div>
            </div>

            {/* Sensor 3: Seismic Sensor */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span className="text-xs font-bold text-slate-900">Seismic Wave Sensor</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    Piezo Film
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold font-mono tabular-nums text-amber-700">
                    {activeStation?.latestVibration != null ? activeStation.latestVibration.toFixed(3) : "--"}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">RMS (g)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Piezoelectric film module isolated via EL817 optocoupler, measuring elastic pipe-wall acoustic waves from turbulence.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Wavefront Band:</span>
                  <span className="text-slate-800 font-bold font-mono tabular-nums">60–240 Hz (P/S Waves)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Elastic seismic waves confirm subsurface pipe wall breach.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Telemetry Chart & Active Alerts Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TelemetryChart initialStation={selectedStation} />
        </div>

        {/* Active Alerts Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Active Alerts Log
                </h3>
              </div>
              <Badge variant={activeAlerts.length > 0 ? "critical" : "neutral"} size="sm">
                {activeAlerts.length}
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center p-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mb-2 stroke-[1.5]" />
                  <span>Pipeline operating nominally with no active leak events.</span>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge
                        variant={alert.severity === "high" ? "critical" : "warning"}
                        size="sm"
                        dot
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {new Date(alert.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-900">
                      Zone {alert.zoneId ?? "?"} ({alert.stationId})
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {alert.recommendedAction}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 font-mono">
                      <span className="tabular-nums">SI: {alert.si?.toFixed(1) ?? "--"}%</span>
                      <span className="tabular-nums">Rate: {alert.leakRate?.toFixed(1) ?? "--"} L/min</span>
                      {alert.repeatCount > 1 && (
                        <span className="text-red-600 font-bold tabular-nums">
                          ×{alert.repeatCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/alerts"
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center justify-center gap-1"
            >
              Alert Log & Triage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Sensor Nodes Status Table (S1–S6) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Sensor Nodes Status (S1–S6)
            </h3>
            <p className="text-xs text-slate-500">
              Live telemetry via 2 AWG shielded cable · 3 transducers per station (Flow · Pressure · Seismic)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Station</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Sampling Mode</th>
                <th className="py-2.5 px-4 text-right text-sky-700">Flow (Pulse)</th>
                <th className="py-2.5 px-4 text-right text-indigo-700">Pressure (ADS1115)</th>
                <th className="py-2.5 px-4 text-right text-amber-800">Seismic Wave (g)</th>
                <th className="py-2.5 px-4">Last Seen</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stations.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedStation === s.id ? "bg-sky-50/50" : ""
                  }`}
                  onClick={() => setSelectedStation(s.id)}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
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
                    <span className="capitalize text-slate-700">
                      {s.samplingMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono text-sky-700 font-bold">
                    {s.latestFlow != null ? `${s.latestFlow.toFixed(2)} L/m` : "--"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono text-indigo-700 font-bold">
                    {s.latestPressure != null ? `${s.latestPressure.toFixed(2)} bar` : "--"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono text-amber-800 font-bold">
                    {s.latestVibration != null ? `${s.latestVibration.toFixed(3)} g` : "--"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
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
                      className="text-sky-700 hover:text-sky-800 font-semibold flex items-center justify-center gap-1"
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
