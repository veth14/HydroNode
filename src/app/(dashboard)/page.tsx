"use client";
// src/app/(dashboard)/page.tsx
// HydroNode SCADA Dashboard — Metro Pacific Water
// Live-only mode: 4 zones, 4 junctions × 2 sensors (flow + pressure) = 8 sensors.
// Time Machine: replay calibrated preset scenarios or live DB history on the 3D canvas.

import { useState, useCallback } from "react";
import Link from "next/link";
import { RigCanvas } from "@/components/rig/RigCanvas";
import { RigTimeMachine } from "@/components/rig/RigTimeMachine";
import { TelemetryChart } from "@/components/charts/TelemetryChart";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useHydroStore } from "@/store/hydroStore";
import { useSettings } from "@/hooks/useSettings";
import { useNow } from "@/hooks/useNow";
import { SourcePanel } from "@/components/source/SourcePanel";
import { formatPhtTime, formatRelativeAge } from "@/lib/friendTelemetry";
import type { StationId, ZoneId } from "@/config/rig";
import type { PumpStatus } from "@/types";
import type { PlaybackFrame } from "@/lib/incidentPlayback";
import { ZONES, STATION_IDS } from "@/config/rig";
import {
  AlertTriangle,
  ShieldCheck,
  Radio,
  Droplets,
  Gauge,
  Activity,
  Cpu,
  ArrowRight,
  Calendar,
  X,
  Waves,
  ChevronRight,
  ChevronLeft,
  Clock,
  WifiOff,
} from "lucide-react";

const PUMP_STATUS_META: Record<
  PumpStatus,
  {
    headerLabel: string;
    cardLabel: string;
    subtitle: string;
    pillClass: string;
    dotClass: string;
    cardGrad: string;
    cardBorder: string;
    iconClass: string;
  }
> = {
  off: {
    headerLabel: "PUMP OFF",
    cardLabel: "Off",
    subtitle: "Synced from sensor_data.pump_status",
    pillClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    cardGrad: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
    cardBorder: "1px solid #e2e8f0",
    iconClass: "text-slate-500",
  },
  starting: {
    headerLabel: "PUMP STARTING",
    cardLabel: "Starting…",
    subtitle: "Priming pipeline & ramping pressure",
    pillClass: "bg-amber-50 text-amber-700 border-amber-300",
    dotClass: "bg-amber-500 animate-ping",
    cardGrad: "linear-gradient(135deg, #fffbeb, #fef3c7)",
    cardBorder: "1px solid #fde68a",
    iconClass: "text-amber-600",
  },
  running: {
    headerLabel: "PUMP ON",
    cardLabel: "ON",
    subtitle: "Synced from sensor_data.pump_status",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500 animate-pulse",
    cardGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    cardBorder: "1px solid #bbf7d0",
    iconClass: "text-emerald-600",
  },
};

export default function NetworkOverviewPage() {
  const kpi = useHydroStore((s) => s.kpi);
  const nowMs = useNow(5000);
  const pumpStatus: PumpStatus = kpi?.pumpStatus ?? "off";
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const { getBaseline } = useSettings();

  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationId>("S1");
  const [canvasStation, setCanvasStation] = useState<StationId | null>(null);

  // ── Time Machine state (Live DB Replay only) ──────────────────────────────
  const [timeMachineActive, setTimeMachineActive] = useState(false);
  const [tmFrame, setTmFrame] = useState<PlaybackFrame | null>(null);

  const handleTmFrame = useCallback((frame: PlaybackFrame | null) => {
    setTmFrame(frame);
  }, []);

  const handleTmExit = useCallback(() => {
    setTimeMachineActive(false);
    setTmFrame(null);
  }, []);

  const isReplayActive = timeMachineActive && tmFrame != null;
  const isStale = !isReplayActive && Boolean(kpi?.isStale);
  const lastCheckAge =
    kpi?.lastUpdated && nowMs > 0
      ? formatRelativeAge(kpi.lastUpdated, nowMs).label
      : null;
  const lastCheckPht = kpi?.lastUpdated
    ? `${formatPhtTime(kpi.lastUpdated)} PHT`
    : null;
  const effectivePumpStatus: PumpStatus = isReplayActive
    ? tmFrame.pumpOn
      ? "running"
      : "off"
    : pumpStatus;
  const pumpMeta = PUMP_STATUS_META[effectivePumpStatus];

  const effectiveStations = isReplayActive
    ? STATION_IDS.map((sid, idx) => ({
        id: sid,
        name: `Station ${sid}`,
        status: (tmFrame.alerts.some((a) => a.stationId === sid) ? "alert" : "online") as "online" | "alert",
        samplingMode: "normal" as const,
        lastSeen: null,
        latestFlow: tmFrame.flow[idx] ?? 0,
        latestPressure: tmFrame.pressure[idx] ?? 0,
        latestVibration: null,
      }))
    : stations;

  const activeAlerts = isReplayActive
    ? tmFrame.alerts
    : alerts.filter((a) => a.status === "active");
  const totalZones = 4;
  const totalSensors = 8; // 4 junctions × 2 (flow + pressure)

  const selectedZoneData = selectedZone ? ZONES.find((z) => z.id === selectedZone) : null;
  const zoneAlert = selectedZone ? activeAlerts.find((a) => a.zoneId === selectedZone) : null;

  const activeStation = effectiveStations.find((s) => s.id === selectedStation) ?? effectiveStations[0];
  const stationIdx = STATION_IDS.indexOf(selectedStation);
  const nextStation = stationIdx < STATION_IDS.length - 1
    ? effectiveStations.find((s) => s.id === STATION_IDS[stationIdx + 1])
    : null;
  const flowDelta = activeStation && nextStation
    && activeStation.latestFlow != null && nextStation.latestFlow != null
    ? activeStation.latestFlow - nextStation.latestFlow
    : 0;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

  const zoneIconStyles = [
    { bg: "bg-rose-50 border-rose-100 text-rose-600", icon: <Waves className="w-4 h-4" /> },
    { bg: "bg-sky-50 border-sky-100 text-sky-600", icon: <Droplets className="w-4 h-4" /> },
    { bg: "bg-indigo-50 border-indigo-100 text-indigo-600", icon: <Gauge className="w-4 h-4" /> },
    { bg: "bg-emerald-50 border-emerald-100 text-emerald-600", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* ─── 1. Header ─── */}
      <div
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #F4FAFD 60%, #EEF6FA 100%)",
          border: "1px solid #DFF5FF",
          boxShadow: "0 1px 3px rgba(0,118,160,0.04), 0 6px 20px rgba(0,118,160,0.06)",
        }}
      >
        {/* Decorative dot grid */}
        <div className="absolute right-0 top-0 w-48 h-full pattern-dots opacity-20 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Live vs Time Machine vs Stale badge */}
              {isReplayActive ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  TIME MACHINE · {tmFrame.label}
                </span>
              ) : isStale ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  NO NEW DATA · STALE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{ background: "#F3FFD1", color: "#4a7a00", borderColor: "#A6CE38" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#A6CE38" }} />
                  SCADA LIVE
                </span>
              )}
              {/* Live pump state badge */}
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${pumpMeta.pillClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pumpMeta.dotClass}`} />
                {pumpMeta.headerLabel}
              </span>
              {isStale && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 font-mono">
                  {lastCheckPht
                    ? `Last check: ${lastCheckPht}${lastCheckAge ? ` (${lastCheckAge})` : ""}`
                    : "DB IDLE"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: "#F4FAFD", color: "#2D5A7A", border: "1px solid #DFF5FF" }}>
                <Calendar className="w-3 h-3" style={{ color: "#819FD7" }} />
                <span>{formattedDate}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0C2340" }}>
              Welcome Back, Operator!
            </h1>
            <p className="text-sm" style={{ color: "#2D5A7A" }}>
              <span>Metro Pacific Water — IoT pipeline integrity monitor powered by ESP32-S3.</span>
              {" "}
              {isReplayActive ? (
                <span style={{ color: "#d97706", fontWeight: 600 }}>
                  Time Machine replay · {tmFrame.label}
                </span>
              ) : isStale ? (
                <span style={{ color: "#d97706", fontWeight: 600 }}>
                  No new data &gt;1m · paused at last recorded check
                </span>
              ) : (
                <span style={{ color: "#019FD7", fontWeight: 600 }}>4 zones · 8 sensors live</span>
              )}
            </p>
          </div>

          {/* Station selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium" style={{ color: "#819FD7" }}>Station:</span>
            <div className="flex items-center p-1 rounded-xl" style={{ background: "#F4FAFD", border: "1px solid #DFF5FF" }}>
              {STATION_IDS.map((sid) => (
                <button
                  key={sid}
                  onClick={() => {
                    setSelectedStation(sid);
                    setCanvasStation((prev) => (prev === sid ? null : sid));
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  style={selectedStation === sid
                    ? { background: "linear-gradient(135deg, #0076A0, #019FD7)", color: "#ffffff", boxShadow: "0 2px 6px rgba(0,118,160,0.3)" }
                    : { color: "#2D5A7A" }}
                >
                  {sid}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active Alerts"
          value={isReplayActive ? activeAlerts.length : (kpi?.activeAlerts ?? 0)}
          tone={(isReplayActive ? activeAlerts.length : (kpi?.activeAlerts ?? 0)) > 0 ? "critical" : "success"}
          icon={<AlertTriangle className="w-4 h-4" />}
          trend={{
            direction: (isReplayActive ? activeAlerts.length : (kpi?.activeAlerts ?? 0)) > 0 ? "up" : "flat",
            label: (isReplayActive ? activeAlerts.length : (kpi?.activeAlerts ?? 0)) > 0 ? "Immediate triage required" : `All ${totalZones} zones nominal`,
          }}
        />
        <Stat
          label="Network Integrity"
          value={`${isReplayActive ? Math.max(0, totalZones - activeAlerts.length) : Math.min(totalZones, kpi?.zonesHealthy ?? totalZones)} / ${totalZones}`}
          tone="success"
          icon={<ShieldCheck className="w-4 h-4" />}
          trend={{
            direction: (isReplayActive ? activeAlerts.length === 0 : (kpi?.zonesHealthy ?? 0) === totalZones) ? "up" : "flat",
            label: (isReplayActive ? activeAlerts.length === 0 : (kpi?.zonesHealthy ?? 0) === totalZones)
              ? "All zones at nominal pressure"
              : `${isReplayActive ? Math.max(0, totalZones - activeAlerts.length) : (kpi?.zonesHealthy ?? 0)}/${totalZones} zones nominal`,
          }}
        />
        <Stat
          label="Active Stations"
          value={`${isReplayActive ? (tmFrame.pumpOn ? totalZones : 0) : Math.min(STATION_IDS.length, kpi?.stationsOnline ?? 0)} / ${STATION_IDS.length}`}
          tone={isStale ? "warning" : "default"}
          icon={<Radio className="w-4 h-4" />}
          trend={{
            direction: isReplayActive || (kpi?.stationsOnline ?? 0) > 0 ? "up" : "flat",
            label: isReplayActive
              ? `Time Machine frame (${tmFrame.label})`
              : isStale
                ? `No new data${lastCheckAge ? ` · last ${lastCheckAge}` : ""}`
                : (kpi?.stationsOnline ?? 0) > 0
                  ? `${totalSensors} sensors online (4×2 Bi-Modal)`
                  : "Awaiting live ESP32 telemetry",
          }}
        />
        <Stat
          label="Fluid Loss Rate"
          value={(isReplayActive ? tmFrame.flowDelta : (kpi?.estimatedWaterLoss ?? 0)).toFixed(1)}
          unit="L/min"
          tone={(isReplayActive ? tmFrame.flowDelta : (kpi?.estimatedWaterLoss ?? 0)) > 0.5 ? "critical" : "default"}
          icon={<Droplets className="w-4 h-4" />}
          trend={{
            direction: (isReplayActive ? tmFrame.flowDelta : (kpi?.estimatedWaterLoss ?? 0)) > 0.5 ? "up" : "flat",
            label: (isReplayActive ? tmFrame.flowDelta : (kpi?.estimatedWaterLoss ?? 0)) > 0.5 ? "Leak delta detected" : "Zero fluid loss recorded",
          }}
        />
      </div>

      {/* ─── 3. ESP32 Source Feed (friend's DB) ─── */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isStale ? "text-amber-500" : "text-emerald-500"}`} />
              ESP32 Live Feed
            </span>
          }
          subtitle={
            isStale && lastCheckPht
              ? `No new data (>1 min timeout) · Last check ${lastCheckPht}${lastCheckAge ? ` (${lastCheckAge})` : ""}`
              : "Direct telemetry from sensor_data · auto-refreshes every 5 s · Manila PHT (UTC+8)"
          }
        />
        <CardContent>
          <SourcePanel />
        </CardContent>
      </Card>

      {/* ─── 4. 3D Pipeline Canvas ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${isStale ? "" : "animate-pulse"}`}
                style={{ background: isStale ? "#f59e0b" : "#019FD7" }}
              />
              <span>Pipeline Rig Canvas</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1"
                style={{ background: "#DFF5FF", color: "#0076A0", border: "1px solid #ABE0F9" }}>
                ESP32-S3 Edge Controller
              </span>
              {isStale && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                  STALE · PAUSED
                </span>
              )}
            </div>
          }
          subtitle={`Real-time 3D physical rig · 4 sensor stations · 4 zones monitored (4×2 Bi-Modal — Flow + Pressure)`}
          action={
            <div className="flex items-center gap-2">
              {/* Time Machine toggle */}
              <button
                type="button"
                onClick={() => {
                  setTimeMachineActive((p) => !p);
                  if (timeMachineActive) setTmFrame(null);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer"
                style={
                  timeMachineActive
                    ? {
                        background: "linear-gradient(135deg,#0d2033,#0a2a40)",
                        color: "#67e8f9",
                        borderColor: "rgba(103,232,249,0.4)",
                        boxShadow: "0 0 10px rgba(103,232,249,0.2)",
                      }
                    : {
                        background: "#F4FAFD",
                        color: "#2D5A7A",
                        borderColor: "#DFF5FF",
                      }
                }
              >
                <Clock className="w-3 h-3" />
                {timeMachineActive ? "⏹ Exit Time Machine" : "⏮ Time Machine"}
              </button>
              {/* Legend pills */}
              <div className="hidden sm:flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#DFF5FF", color: "#0076A0" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: "#019FD7" }} />Flow
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  <span className="w-2 h-2 rounded-full bg-violet-500" />Pressure
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />Alert
                </span>
              </div>
            </div>
          }
        />
        <div className="relative p-3" style={{ background: "#F4FAFD" }}>
          <RigCanvas
            selectedStationId={canvasStation}
            selectedZoneId={selectedZone}
            onSelectStation={(id) => {
              setCanvasStation(id);
              if (id) setSelectedStation(id);
            }}
            overrideFlow={isReplayActive ? tmFrame.flow : null}
            overridePressure={isReplayActive ? tmFrame.pressure : null}
            overridePumpOn={isReplayActive ? tmFrame.pumpOn : null}
            overrideAlerts={isReplayActive ? tmFrame.alerts : null}
            isPlaybackMode={isReplayActive}
            playbackLabel={isReplayActive ? tmFrame.label : null}
          />

          {/* Selected Zone Side Drawer */}
          {selectedZone && selectedZoneData && (
            <div className="absolute top-6 right-6 z-20 w-72 rounded-2xl p-4 animate-fade-in"
              style={{
                background: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(12px)",
                border: "1.5px solid #DFF5FF",
                boxShadow: "0 8px 32px rgba(0,118,160,0.12)",
              }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid #DFF5FF" }}>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0C2340" }}>
                    Zone {selectedZoneData.id} Segment
                    <Badge
                      variant={zoneAlert?.severity === "high" ? "critical" : zoneAlert?.severity === "medium" ? "warning" : "success"}
                      size="sm" dot
                    >
                      {zoneAlert ? zoneAlert.severity.toUpperCase() : "NOMINAL"}
                    </Badge>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#819FD7" }}>
                    Station {selectedZoneData.stationA} ➔ Station {selectedZoneData.stationB}
                  </p>
                </div>
                <button onClick={() => setSelectedZone(null)}
                  className="p-1 rounded-md transition-colors cursor-pointer"
                  style={{ color: "#819FD7" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                {zoneAlert ? (
                  <>
                    <div className="flex justify-between py-1" style={{ borderBottom: "1px solid #DFF5FF" }}>
                      <span style={{ color: "#819FD7" }}>Severity Index (SI)</span>
                      <span className="font-bold font-mono tabular-nums" style={{ color: "#d97706" }}>
                        {zoneAlert.si?.toFixed(1) ?? "--"}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1" style={{ borderBottom: "1px solid #DFF5FF" }}>
                      <span style={{ color: "#819FD7" }}>Estimated Leak Rate</span>
                      <span className="font-bold font-mono tabular-nums text-red-600">
                        {zoneAlert.leakRate?.toFixed(1) ?? "--"} L/min
                      </span>
                    </div>
                    <div className="flex justify-between py-1" style={{ borderBottom: "1px solid #DFF5FF" }}>
                      <span style={{ color: "#819FD7" }}>Model Confidence</span>
                      <span className="font-bold font-mono tabular-nums" style={{ color: "#0076A0" }}>
                        {(zoneAlert.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="py-1">
                      <span className="block mb-1" style={{ color: "#819FD7" }}>Action Protocol:</span>
                      <div className="p-2.5 rounded-lg text-xs leading-relaxed" style={{ background: "#F4FAFD", border: "1px solid #DFF5FF", color: "#0C2340" }}>
                        {zoneAlert.recommendedAction}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-xs" style={{ color: "#819FD7" }}>
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                    No anomalies detected in this zone segment.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Time Machine Panel (Live DB Replay) ─── */}
      {timeMachineActive && (
        <div>
          <RigTimeMachine onFrameUpdate={handleTmFrame} onExit={handleTmExit} />
        </div>
      )}

      {/* ─── 5. Active Pipeline Zones Table ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title="Active Pipeline Zones"
          subtitle={`Real-time flow & pressure telemetry across ${totalZones} physical pipe segments`}
          action={
            <Link href="/alerts" className="text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ color: "#2D5A7A" }}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ background: "#F4FAFD", borderBottom: "1px solid #DFF5FF", color: "#819FD7" }}>
                <th className="py-3 px-5">Pipeline Zone</th>
                <th className="py-3 px-4">Boundary Stations</th>
                <th className="py-3 px-4 text-right">Flow In / Out</th>
                <th className="py-3 px-4 text-right">Head Pressure</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ZONES.map((zone, idx) => {
                const alert = activeAlerts.find((a) => a.zoneId === zone.id);
                const stA = effectiveStations.find((s) => s.id === zone.stationA);
                const stB = effectiveStations.find((s) => s.id === zone.stationB);
                const isSelected = selectedZone === zone.id;
                const iconStyle = zoneIconStyles[idx % zoneIconStyles.length];
                const hasAlert = Boolean(alert);

                return (
                  <tr
                    key={zone.id}
                    onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                    className="cursor-pointer transition-all"
                    style={{
                      borderLeft: isSelected ? `4px solid #0076A0` : hasAlert ? "4px solid #dc2626" : "4px solid transparent",
                      background: isSelected ? "#EEF6FA" : hasAlert ? "#fef2f2" : undefined,
                      borderBottom: "1px solid #DFF5FF",
                    }}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconStyle.bg}`}>
                          {iconStyle.icon}
                        </div>
                        <div>
                          <span className="font-semibold block" style={{ color: "#0C2340" }}>Zone {zone.id}</span>
                          <span className="text-[11px]" style={{ color: "#819FD7" }}>PVC Pipeline Loop</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium" style={{ color: "#2D5A7A" }}>
                      {zone.stationA} ➔ {zone.stationB}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold" style={{ color: "#0C2340" }}>
                      {stA?.latestFlow != null ? stA.latestFlow.toFixed(1) : "--"} /{" "}
                      {stB?.latestFlow != null ? stB.latestFlow.toFixed(1) : "--"}{" "}
                      <span className="text-[10px] font-normal" style={{ color: "#819FD7" }}>L/m</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold" style={{ color: "#0C2340" }}>
                      {stA?.latestPressure != null ? stA.latestPressure.toFixed(2) : "--"}{" "}
                      <span className="text-[10px] font-normal" style={{ color: "#819FD7" }}>bar</span>
                    </td>
                    <td className="py-3 px-4">
                      {alert ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          Leak Alert
                        </span>
                      ) : isStale ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Stale · Offline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Nominal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedZone(isSelected ? null : zone.id); }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                          style={isSelected
                            ? { background: "#0076A0", color: "#ffffff" }
                            : { background: "#F4FAFD", color: "#2D5A7A", border: "1px solid #DFF5FF" }}
                        >
                          {isSelected ? "Close" : "View"}
                        </button>
                        <Link
                          href={`/stations/${zone.stationA}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg transition inline-flex items-center gap-1"
                          style={{ background: "#F4FAFD", color: "#2D5A7A", border: "1px solid #DFF5FF" }}
                        >
                          Inspect <ChevronRight className="w-3 h-3" style={{ color: "#819FD7" }} />
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

      {/* ─── 6. Hardware Pods ─── */}
      <Card hasFlutedFooter>
        <CardHeader
          title="Hardware Transducer Pods"
          subtitle="Physical transducers instrumented on the HydroNode rig (8 sensors: 4× flow + 4× pressure)"
          action={
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
                style={{ borderColor: "#DFF5FF", color: "#819FD7" }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
                style={{ borderColor: "#DFF5FF", color: "#819FD7" }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Flow Sensor */}
            <div className="rounded-2xl p-4 flex flex-col justify-between transition-all"
              style={{ border: "1px solid #DFF5FF", background: "#ffffff" }}>
              <div>
                <div className="rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #EEF6FA, #DFF5FF)", border: "1px solid #ABE0F9" }}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center"
                    style={{ border: "1px solid #ABE0F9" }}>
                    <Droplets className="w-6 h-6" style={{ color: "#019FD7" }} />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    4× Active
                  </span>
                </div>
                <div className="mt-3.5">
                  <h4 className="text-sm font-bold tracking-tight" style={{ color: "#0C2340" }}>Flow Sensor</h4>
                  <p className="text-xs mt-0.5" style={{ color: "#2D5A7A" }}>Hall-Effect Pulse · EL817 Isolated</p>
                  <p className="text-[11px] mt-1" style={{ color: "#819FD7" }}>S1–S4 · GPIO interrupts · 1200 p/L</p>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #DFF5FF" }}>
                <div className="flex items-center -space-x-1">
                  {["ESP", "OPTO", "5V"].map((tag) => (
                    <span key={tag} className="w-6 h-6 rounded-full border-2 border-white text-[8px] font-bold flex items-center justify-center"
                      style={{ background: "#DFF5FF", color: "#0076A0" }}>{tag}</span>
                  ))}
                </div>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "#819FD7" }}>1,200 p/L</span>
              </div>
            </div>

            {/* Pressure Transducer */}
            <div className="rounded-2xl p-4 flex flex-col justify-between transition-all"
              style={{ border: "1px solid #DFF5FF", background: "#ffffff" }}>
              <div>
                <div className="rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", border: "1px solid #ddd6fe" }}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center"
                    style={{ border: "1px solid #ddd6fe" }}>
                    <Gauge className="w-6 h-6 text-violet-600" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    4× Active
                  </span>
                </div>
                <div className="mt-3.5">
                  <h4 className="text-sm font-bold tracking-tight" style={{ color: "#0C2340" }}>Pressure Transducer</h4>
                  <p className="text-xs mt-0.5" style={{ color: "#2D5A7A" }}>0–1.2 MPa · ADS1115 16-Bit I²C</p>
                  <p className="text-[11px] mt-1" style={{ color: "#819FD7" }}>S1–S4 · 10k/20k divider · 0.01 bar</p>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #DFF5FF" }}>
                <div className="flex items-center -space-x-1">
                  {["ADS", "I²C", "16b"].map((tag) => (
                    <span key={tag} className="w-6 h-6 rounded-full border-2 border-white text-[8px] font-bold flex items-center justify-center bg-violet-50 text-violet-700">{tag}</span>
                  ))}
                </div>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "#819FD7" }}>0.01 bar</span>
              </div>
            </div>

            {/* Vibration — Coming Soon */}
            <div className="rounded-2xl p-4 flex flex-col justify-between transition-all opacity-60"
              style={{ border: "1px dashed #DFF5FF", background: "#F4FAFD" }}>
              <div>
                <div className="rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #fefce8, #fef9c3)", border: "1px dashed #fde68a" }}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center"
                    style={{ border: "1px dashed #fde68a" }}>
                    <Activity className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Coming Soon
                  </span>
                </div>
                <div className="mt-3.5">
                  <h4 className="text-sm font-bold tracking-tight" style={{ color: "#0C2340" }}>Vibration / Seismic</h4>
                  <p className="text-xs mt-0.5" style={{ color: "#2D5A7A" }}>Piezo Film · 60–240 Hz P/S Band</p>
                  <p className="text-[11px] mt-1" style={{ color: "#819FD7" }}>Not yet installed on physical rig</p>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px dashed #DFF5FF" }}>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Planned</span>
              </div>
            </div>

            {/* Pump */}
            <div className="rounded-2xl p-4 flex flex-col justify-between transition-all"
              style={{ border: "1px solid #DFF5FF", background: "#ffffff" }}>
              <div>
                <div className="rounded-xl p-4 h-28 relative flex items-center justify-center overflow-hidden"
                  style={{ background: pumpMeta.cardGrad, border: pumpMeta.cardBorder }}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center"
                    style={{ border: pumpMeta.cardBorder }}>
                    <Cpu className={`w-6 h-6 ${pumpMeta.iconClass}`} />
                  </div>
                  <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${pumpMeta.pillClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pumpMeta.dotClass}`} />
                    {pumpMeta.cardLabel}
                  </span>
                </div>
                <div className="mt-3.5">
                  <h4 className="text-sm font-bold tracking-tight" style={{ color: "#0C2340" }}>Submersible Pump</h4>
                  <p className="text-xs mt-0.5" style={{ color: "#2D5A7A" }}>12V/24V Brushless · GPIO 23 Relay</p>
                  <p className="text-[11px] mt-1" style={{ color: isStale ? "#d97706" : "#819FD7" }}>
                    {isStale
                      ? `Last known${lastCheckAge ? ` (${lastCheckAge})` : ""} · stream paused`
                      : pumpMeta.subtitle}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #DFF5FF" }}>
                <div className="flex items-center -space-x-1">
                  {["12V", "PWM", "IP68"].map((tag) => (
                    <span key={tag} className="w-6 h-6 rounded-full border-2 border-white text-[8px] font-bold flex items-center justify-center bg-emerald-50 text-emerald-700">{tag}</span>
                  ))}
                </div>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "#819FD7" }}>0–100% PWM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 7. Live Telemetry Chart + Station Pod ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TelemetryChart initialStation={selectedStation} />
        </div>

        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" style={{ color: isStale ? "#d97706" : "#019FD7" }} />
                <span>
                  Station {selectedStation}{" "}
                  {isReplayActive ? "Replay" : isStale ? "Last Recorded" : "Live"}
                </span>
              </div>
            }
            subtitle="Flow + Pressure sensor readings"
            action={
              <Link href={`/stations/${selectedStation}`}
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: "#0076A0" }}>
                Inspect <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <CardContent className="space-y-3.5">
            {/* Flow */}
            <div className="p-3.5 rounded-xl" style={{ background: "linear-gradient(to right, #EEF6FA, #ffffff)", border: "1px solid #ABE0F9", borderLeft: "4px solid #019FD7" }}>
              <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "1px solid #DFF5FF" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#019FD7" }} />
                  <span className="text-xs font-bold" style={{ color: "#0C2340" }}>Flow Transducer</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#DFF5FF", color: "#0076A0", border: "1px solid #ABE0F9" }}>
                  EL817 Pulse
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: "#0C2340" }}>
                  {activeStation?.latestFlow != null ? activeStation.latestFlow.toFixed(2) : "--"}
                  <span className="text-xs font-normal ml-1" style={{ color: "#819FD7" }}>L/min</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "#2D5A7A" }}>
                  Δ {flowDelta.toFixed(2)} L/m
                </span>
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3.5 rounded-xl" style={{ background: "linear-gradient(to right, #f5f3ff, #ffffff)", border: "1px solid #ddd6fe", borderLeft: "4px solid #7c3aed" }}>
              <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "1px solid #ede9fe" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-xs font-bold" style={{ color: "#0C2340" }}>Pressure Transducer</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                  ADS1115 I²C
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: "#0C2340" }}>
                  {activeStation?.latestPressure != null ? activeStation.latestPressure.toFixed(2) : "--"}
                  <span className="text-xs font-normal ml-1" style={{ color: "#819FD7" }}>bar</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "#2D5A7A" }}>
                  {getBaseline(selectedStation)?.p0 != null
                    ? `P₀ = ${getBaseline(selectedStation)!.p0.toFixed(2)} bar`
                    : "P₀ = --"}
                </span>
              </div>
            </div>

            {/* Vibration — not yet */}
            <div className="p-3 rounded-xl text-center opacity-50" style={{ background: "#F4FAFD", border: "1px dashed #DFF5FF" }}>
              <Activity className="w-5 h-5 mx-auto mb-1 text-amber-400" />
              <p className="text-[11px]" style={{ color: "#819FD7" }}>Vibration sensor — coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
