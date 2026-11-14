"use client";
// src/app/(dashboard)/page.tsx
// Ultra-Premium HydroNode SCADA Dashboard.
// Faithfully matches the modern SaaS luxury design language (FlowAI reference):
// - Soft warm-neutral canvas (#f1f3f6) with pure white floating cards (#ffffff)
// - High-contrast dark charcoal CTA button
// - Date badge pill (e.g. "12 Nov, 2026")
// - 4 floating Stat metric cards with dotted ring trend indicators
// - Hero Pipeline Rig Canvas in a luxury card with fluted vertical pinstripe accent
// - "Active Pipeline Zones" table with pastel rounded-square icons, tabular nums, and fluted footer
// - "Sensor Transducer Pods & Actuators" 4-card carousel with miniature graphics and hardware tags

import { useState } from "react";
import Link from "next/link";
import { RigCanvas } from "@/components/rig/RigCanvas";
import { TelemetryChart } from "@/components/charts/TelemetryChart";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useHydroStore } from "@/store/hydroStore";
import { statusColor } from "@/lib/utils";
import { setAlarmActive } from "@/lib/sound";
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
  ChevronLeft,
  X,
  Gauge,
  Activity,
  Cpu,
  ArrowRight,
  Calendar,
  Plus,
  Waves,
  MoreHorizontal,
  ExternalLink,
  History,
} from "lucide-react";

export default function NetworkOverviewPage() {
  const kpi = useHydroStore((s) => s.kpi);
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectLeak = useHydroStore((s) => s.injectLeak);
  const architectureMode = useHydroStore((s) => s.architectureMode);
  const setArchitectureMode = useHydroStore((s) => s.setArchitectureMode);

  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationId>("S1");

  // Historic Incident Playback (Time Machine)
  const [isPlaybackMode, setIsPlaybackMode] = useState<boolean>(false);
  const [playbackScenarioId, setPlaybackScenarioId] = useState<string>("zone-2-burst");

  const isOptionB = architectureMode === "4x3";
  const activeStationIds = isOptionB
    ? (["S1", "S2", "S3", "S4"] as StationId[])
    : STATION_IDS;
  const activeZones = isOptionB ? ZONES.slice(0, 3) : ZONES;
  const totalZonesCount = isOptionB ? 3 : 5;
  const totalTransducersCount = 12; // 4x3 = 12, or 6x2 = 12

  const activeAlerts = alerts.filter((a) => a.status === "active");

  const handleTestPointClick = async (tp: TestPointType) => {
    setAlarmActive(true);
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

  // Formatted date string matching "27 April, 2026" in reference
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Pastel styling config for Zone table icons
  const zoneIconStyles = [
    { bg: "bg-rose-50 border-rose-100 text-rose-600", icon: <Waves className="w-4 h-4" /> },
    { bg: "bg-amber-50 border-amber-100 text-amber-600", icon: <Droplets className="w-4 h-4" /> },
    { bg: "bg-sky-50 border-sky-100 text-sky-600", icon: <Gauge className="w-4 h-4" /> },
    { bg: "bg-indigo-50 border-indigo-100 text-indigo-600", icon: <Activity className="w-4 h-4" /> },
    { bg: "bg-emerald-50 border-emerald-100 text-emerald-600", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* ─── 1. Header Section ─── */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200/80
        shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.05)] p-6">
        {/* Subtle gradient backdrop inside the header card */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 pointer-events-none" />
        {/* Decorative dot grid top-right */}
        <div className="absolute right-0 top-0 w-48 h-full pattern-dots opacity-30 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SCADA LIVE
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formattedDate}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome Back, Operator!
            </h1>
            <p className="text-sm text-slate-500">
              Autonomous pipeline integrity monitor & acoustic leak localization powered by ESP32-S3.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Architecture Topology Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => {
                  setArchitectureMode("4x3");
                  if (selectedStation === "S5" || selectedStation === "S6") setSelectedStation("S1");
                  if (selectedZone && selectedZone > 3) setSelectedZone(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isOptionB
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Option B: 4 Stations with Flow + Pressure + Vibration (12 Transducers, 3 Zones)"
              >
                Option B (4×3)
              </button>
              <button
                onClick={() => setArchitectureMode("6x2")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isOptionB
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Option A: 6 Stations with Flow + Pressure (12 Transducers, 5 Zones)"
              >
                Option A (6×2)
              </button>
            </div>

            {/* Dark Charcoal Primary CTA */}
            <Link href="/simulation">
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
              >
                Simulate Leak
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. Top Metric Row (4 Floating Stat Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active Alerts"
          value={kpi?.activeAlerts ?? 0}
          tone={(kpi?.activeAlerts ?? 0) > 0 ? "critical" : "success"}
          icon={<AlertTriangle className="w-4 h-4" />}
          trend={{
            direction: (kpi?.activeAlerts ?? 0) > 0 ? "up" : "flat",
            label: (kpi?.activeAlerts ?? 0) > 0 ? "Immediate triage required" : `All ${totalZonesCount} zones nominal`,
          }}
        />

        <Stat
          label="Network Integrity"
          value={`${Math.min(totalZonesCount, kpi?.zonesHealthy ?? totalZonesCount)} / ${totalZonesCount}`}
          tone="success"
          icon={<ShieldCheck className="w-4 h-4" />}
          trend={{
            direction: "up",
            label: "100% nominal pressure hold",
          }}
        />

        <Stat
          label="Active Stations"
          value={`${Math.min(activeStationIds.length, kpi?.stationsOnline ?? activeStationIds.length)} / ${activeStationIds.length}`}
          tone="default"
          icon={<Radio className="w-4 h-4" />}
          trend={{
            direction: "up",
            label: `${totalTransducersCount} physical transducers online (${isOptionB ? "4×3 Tri-Modal" : "6×2 Bi-Modal"})`,
          }}
        />

        <Stat
          label="Fluid Loss Rate"
          value={kpi?.estimatedWaterLoss?.toFixed(1) ?? "0.0"}
          unit="L/min"
          tone={(kpi?.estimatedWaterLoss ?? 0) > 0 ? "critical" : "default"}
          icon={<Droplets className="w-4 h-4" />}
          trend={{
            direction: (kpi?.estimatedWaterLoss ?? 0) > 0 ? "up" : "flat",
            label: (kpi?.estimatedWaterLoss ?? 0) > 0 ? "Leak delta detected" : "Zero fluid loss recorded",
          }}
        />
      </div>

      {/* ─── 3. Hero Feature: Pipeline Rig Canvas ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlaybackMode ? "bg-amber-500 animate-ping" : "bg-sky-500 animate-pulse"
                }`}
              />
              <span>Pipeline Rig Canvas</span>
              {isPlaybackMode ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 ml-1">
                  TIME MACHINE REPLAY
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 ml-1">
                  ESP32-S3 Edge Controller
                </span>
              )}
            </div>
          }
          subtitle={
            isPlaybackMode
              ? `Replaying recorded incident telemetry · Wavefront propagation across ${isOptionB ? "S1–S4 Tri-Sensor Bus" : "S1–S6 Bus"}`
              : `Real-time physical test rig schematic · ${activeStationIds.length} sensor stations across ${totalZonesCount} monitored pipeline zones (${isOptionB ? "Option B: 4×3 Tri-Modal" : "Option A: 6×2 Bi-Modal"})`
          }
          action={
            <div className="flex items-center gap-1.5">
              <Button
                variant={isPlaybackMode ? "primary" : "outline"}
                size="sm"
                onClick={() => setIsPlaybackMode((prev) => !prev)}
                icon={
                  <History
                    className={`w-3.5 h-3.5 ${
                      isPlaybackMode ? "text-amber-400" : "text-amber-600"
                    }`}
                  />
                }
              >
                {isPlaybackMode ? "Exit Replay" : "Time Machine"}
              </Button>
              <div className="hidden sm:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {activeStationIds.map((sid) => (
                  <button
                    key={sid}
                    onClick={() => setSelectedStation(sid)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      selectedStation === sid
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {sid}
                  </button>
                ))}
              </div>
              <Link href="/simulation">
                <Button variant="outline" size="sm" icon={<FlaskConical className="w-3.5 h-3.5 text-sky-600" />}>
                  Simulate
                </Button>
              </Link>
            </div>
          }
        />
        <div className="relative p-2 sm:p-4 bg-slate-50/50">
          <RigCanvas
            selectedStationId={selectedStation}
            selectedZoneId={selectedZone}
            onSelectStation={(id) => setSelectedStation(id)}
            onSelectZone={(id) => setSelectedZone(id)}
            onInjectLeak={handleTestPointClick}
            isPlaybackMode={isPlaybackMode}
            playbackScenarioId={playbackScenarioId}
            onExitPlayback={() => setIsPlaybackMode(false)}
          />

          {/* Selected Zone Side Drawer */}
          {selectedZone && selectedZoneData && (
            <div className="absolute top-6 right-6 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 rounded-2xl p-4 shadow-floating animate-fade-in">
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
                    Station {selectedZoneData.stationA} ➔ Station {selectedZoneData.stationB} (1.2m)
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

                {/* Replay in Time Machine Action */}
                <button
                  onClick={() => {
                    const scenarioMap: Record<number, string> = {
                      1: "zone-1-burst",
                      2: "zone-2-burst",
                      3: "zone-3-surge",
                      4: "zone-4-valve",
                      5: "zone-2-burst",
                    };
                    setPlaybackScenarioId(scenarioMap[selectedZoneData.id] ?? "zone-2-burst");
                    setIsPlaybackMode(true);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  <span>Replay Zone {selectedZoneData.id} in Time Machine</span>
                </button>

                <div className="pt-2 text-[11px] text-slate-400 leading-normal border-t border-slate-100">
                  Localizes pipe segment between sensor stations via flow loss delta & acoustic emission.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── 4. Active Pipeline Zones Table (Matching "Active Workflows" in FlowAI) ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title="Active Pipeline Zones"
          subtitle={`Real-time acoustic & pressure telemetry across ${totalZonesCount} physical pipe segments (${isOptionB ? "Option B: 3 Zones Monitored" : "Option A: 5 Zones Monitored"})`}
          action={
            <Link
              href="/alerts"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-medium border-b border-slate-100">
                <th className="py-3 px-5">Pipeline Zone</th>
                <th className="py-3 px-4">Boundary Stations</th>
                <th className="py-3 px-4 text-right">Flow In / Out</th>
                <th className="py-3 px-4 text-right">Head Pressure</th>
                <th className="py-3 px-4 text-right">Acoustic RMS</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeZones.map((zone, idx) => {
                const alert = activeAlerts.find((a) => a.zoneId === zone.id);
                const stA = stations.find((s) => s.id === zone.stationA);
                const stB = stations.find((s) => s.id === zone.stationB);
                const isSelected = selectedZone === zone.id;
                const iconStyle = zoneIconStyles[idx % zoneIconStyles.length];
                const hasAlert = Boolean(alert);
                const rowBorderClass = isSelected
                  ? "border-l-4 border-l-sky-500 bg-sky-50/50"
                  : hasAlert
                  ? "border-l-4 border-l-red-500 bg-red-50/30"
                  : "border-l-4 border-l-transparent hover:border-l-slate-300 hover:bg-slate-50/80";

                return (
                  <tr
                    key={zone.id}
                    onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                    className={`${rowBorderClass} transition-all cursor-pointer`}
                  >
                    {/* Zone Name with Pastel Square Icon */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconStyle.bg}`}
                        >
                          {iconStyle.icon}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Zone {zone.id} Segment
                          </span>
                          <span className="text-[11px] text-slate-400">
                            1.2m Schedule-40 PVC
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Boundary Stations */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      Station {zone.stationA} ➔ {zone.stationB}
                    </td>

                    {/* Flow In / Out */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-semibold">
                      {stA?.latestFlow != null ? stA.latestFlow.toFixed(1) : "--"} /{" "}
                      {stB?.latestFlow != null ? stB.latestFlow.toFixed(1) : "--"}{" "}
                      <span className="text-[10px] font-normal text-slate-400">L/m</span>
                    </td>

                    {/* Head Pressure */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-semibold">
                      {stA?.latestPressure != null ? stA.latestPressure.toFixed(2) : "--"}{" "}
                      <span className="text-[10px] font-normal text-slate-400">bar</span>
                    </td>

                    {/* Acoustic RMS */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-semibold">
                      {stA?.latestVibration != null ? stA.latestVibration.toFixed(3) : "--"}{" "}
                      <span className="text-[10px] font-normal text-slate-400">g</span>
                    </td>

                    {/* Status Pill Badge */}
                    <td className="py-3 px-4">
                      {alert ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          Leak Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-slate-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const scenarioMap: Record<number, string> = {
                              1: "zone-1-burst",
                              2: "zone-2-burst",
                              3: "zone-3-surge",
                              4: "zone-4-valve",
                              5: "zone-2-burst",
                            };
                            setPlaybackScenarioId(scenarioMap[zone.id] ?? "zone-2-burst");
                            setIsPlaybackMode(true);
                            window.scrollTo({ top: 220, behavior: "smooth" });
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer inline-flex items-center gap-1"
                          title={`Replay Zone ${zone.id} Incident in Time Machine`}
                        >
                          <History className="w-3 h-3 text-amber-700" />
                          <span>Replay</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedZone(isSelected ? null : zone.id);
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                            isSelected
                              ? "bg-sky-600 text-white shadow-2xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isSelected ? "Close" : "View"}
                        </button>
                        <Link
                          href={`/stations/${zone.stationA}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition inline-flex items-center gap-1"
                        >
                          Inspect <ChevronRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── 5. Hardware Transducer Pods & Actuators (Matching "Recent Using Templates" in FlowAI) ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title="Hardware Transducer Pods & Actuators"
          subtitle="Physical transducers & power actuators instrumented on the HydroNode test rig"
          action={
            <div className="flex items-center gap-1.5">
              <button
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pod 1: Flow Sensor */}
            <div className="rounded-2xl border border-slate-200/90 p-4 bg-white hover:border-slate-300 hover:shadow-subtle transition-all flex flex-col justify-between">
              <div>
                {/* Miniature Visual Container */}
                <div className="bg-gradient-to-br from-sky-50 to-sky-100/60 border border-sky-100 rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-white border border-sky-200/80 shadow-2xs flex items-center justify-center text-sky-600">
                    <Droplets className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-3.5">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Flow Sensor Pod
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hall-Effect Pulse · EL817 Isolated
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used across S1–S6 · GPIO interrupts
                  </p>
                </div>
              </div>

              {/* Card Footer: Micro Tech Stack Badges + Rating/Spec */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    ESP
                  </span>
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    OPTO
                  </span>
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    5V
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 border border-white text-[9px] font-bold flex items-center justify-center">
                    +2
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 font-mono tabular-nums">
                  1,200 p/L
                </span>
              </div>
            </div>

            {/* Pod 2: Pressure Sensor */}
            <div className="rounded-2xl border border-slate-200/90 p-4 bg-white hover:border-slate-300 hover:shadow-subtle transition-all flex flex-col justify-between">
              <div>
                {/* Miniature Visual Container */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-100 rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200/80 shadow-2xs flex items-center justify-center text-indigo-600">
                    <Gauge className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-3.5">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Pressure Transducer
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    0–1.2 MPa · ADS1115 16-Bit I²C
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used across S1–S6 · 10k/20k divider
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    ADS
                  </span>
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    I²C
                  </span>
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    16b
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 border border-white text-[9px] font-bold flex items-center justify-center">
                    +1
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 font-mono tabular-nums">
                  0.01 bar
                </span>
              </div>
            </div>

            {/* Pod 3: Seismic Wave Acoustic Sensor */}
            <div className="rounded-2xl border border-slate-200/90 p-4 bg-white hover:border-slate-300 hover:shadow-subtle transition-all flex flex-col justify-between">
              <div>
                {/* Miniature Visual Container */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-100 rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex items-center justify-center text-amber-600">
                    <Activity className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-3.5">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Seismic Wave Sensor
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Piezo Film · 60–240 Hz P/S Band
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used across S1–S6 · Acoustic noise
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    PZT
                  </span>
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    EL817
                  </span>
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    RMS
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 border border-white text-[9px] font-bold flex items-center justify-center">
                    +1
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 font-mono tabular-nums">
                  60–240 Hz
                </span>
              </div>
            </div>

            {/* Pod 4: JT-750 / JT-800D Circulation Pump */}
            <div className="rounded-2xl border border-slate-200/90 p-4 bg-white hover:border-slate-300 hover:shadow-subtle transition-all flex flex-col justify-between">
              <div>
                {/* Miniature Visual Container */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-100 rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-center text-emerald-700">
                    <Cpu className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-3.5">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    12V/24V Brushless Pump
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JT-750 / JT-800D · LR7843 MOSFET
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    400–1000 L/H · 1/2&quot; BSP/NPT
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    12/24V
                  </span>
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    PWM
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 border border-white text-[9px] font-bold flex items-center justify-center">
                    MOS
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 border border-white text-[9px] font-bold flex items-center justify-center">
                    IP68
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 font-mono tabular-nums">
                  0–100% PWM
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 6. Station Tri-Sensor Pod Architecture & Telemetry Waveforms ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TelemetryChart initialStation={selectedStation} />
        </div>

        {/* Selected Station Pod Live Telemetry Card */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-900" />
                <span>Station {selectedStation} Transducer Bus</span>
              </div>
            }
            subtitle="Multiplexed 3-sensor pod telemetry"
            action={
              <Link
                href={`/stations/${selectedStation}`}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                Inspect <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <CardContent className="space-y-3.5">
            {/* Flow Transducer */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50/40 via-white to-white border border-sky-100/90 border-l-4 border-l-sky-500 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-bold text-slate-900">Flow Transducer</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Pulse / EL817
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {activeStation?.latestFlow != null ? activeStation.latestFlow.toFixed(2) : "--"}
                  <span className="text-xs font-normal text-slate-500 ml-1">L/min</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  Δ {flowDelta.toFixed(2)} L/m
                </span>
              </div>
            </div>

            {/* Pressure Transducer */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/40 via-white to-white border border-indigo-100/90 border-l-4 border-l-indigo-500 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-900">Pressure Transducer</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ADS1115 I²C
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {activeStation?.latestPressure != null ? activeStation.latestPressure.toFixed(2) : "--"}
                  <span className="text-xs font-normal text-slate-500 ml-1">bar</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  P₀ = 5.00 bar
                </span>
              </div>
            </div>

            {/* Seismic Sensor */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/40 via-white to-white border border-amber-100/90 border-l-4 border-l-amber-500 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-900">Seismic Wave Sensor</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Piezo Film
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {activeStation?.latestVibration != null ? activeStation.latestVibration.toFixed(3) : "--"}
                  <span className="text-xs font-normal text-slate-500 ml-1">g RMS</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  60–240 Hz
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
