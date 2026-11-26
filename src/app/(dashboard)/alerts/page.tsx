"use client";
// src/app/(dashboard)/alerts/page.tsx
// Full Alerts Log & Event Triage driven by friend's Neon DB (`sensor_data`).
// Displays all 14 source columns cleanly: row ID, Manila PHT time, firmware status,
// localization, pump ON/OFF, 4x Flow (L/min), 4x Pressure (bar + raw 12-bit ADC),
// confidence, computed ΔQ/ΔP/SI, and an interactive per-row Dossier Inspector.

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { STATION_IDS, ZONES } from "@/config/rig";
import { formatPhtDateTime, formatPhtTime } from "@/lib/friendTelemetry";
import type { LiveAlert } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  X,
  Filter,
  Activity,
  Droplets,
  Gauge,
  Database,
  Zap,
  ZapOff,
  AlertTriangle,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { setAlarmActive } from "@/lib/sound";

interface SourceOverviewMini {
  ok: boolean;
  empty?: boolean;
  totalRows?: number;
  latest?: {
    id: number;
    createdAt: string;
    flow: number[];
    pressure: number[];
    pressureRaw: number[];
    pumpStatus: "ON" | "OFF";
    status: string;
    localization: string;
    confidence: number;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function eventBadgeMeta(alert: LiveAlert) {
  const kind = alert.source?.eventKind;
  if (kind === "leak") {
    return {
      label: alert.source?.firmwareStatus ?? "Leak",
      pillClass: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (alert.source?.isNoFlow) {
    return {
      label: `${alert.source.firmwareStatus} · No Flow`,
      pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }
  if (kind === "sensor_failure") {
    return {
      label: alert.source?.firmwareStatus ?? "SensorFailure",
      pillClass: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }
  return {
    label: alert.source?.firmwareStatus ?? "Event",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

function segmentDisplay(alert: LiveAlert): { primary: string; secondary: string } {
  if (alert.zoneId != null) {
    const z = ZONES.find((item) => item.id === alert.zoneId);
    return {
      primary: `Zone ${alert.zoneId} (${z ? `${z.stationA} → ${z.stationB}` : alert.stationId})`,
      secondary: alert.source?.localizationRaw ?? `Zone ${alert.zoneId}`,
    };
  }
  const rawLoc = alert.source?.localizationRaw ?? "None";
  return {
    primary: rawLoc === "None" || !rawLoc ? "System / Unlocalized" : rawLoc,
    secondary: `localization="${rawLoc}"`,
  };
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [eventKindFilter, setEventKindFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<LiveAlert | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const queryParams = new URLSearchParams();
  if (severityFilter !== "all") queryParams.set("severity", severityFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (zoneFilter !== "all") queryParams.set("zoneId", zoneFilter);
  if (eventKindFilter !== "all") queryParams.set("eventKind", eventKindFilter);

  const qs = queryParams.toString();
  const { data: alerts, mutate, isLoading } = useSWR<LiveAlert[]>(
    qs ? `/api/alerts?${qs}` : "/api/alerts",
    fetcher,
    {
      refreshInterval: 6000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  const { data: sourceOverview } = useSWR<SourceOverviewMini>("/api/source", fetcher, {
    refreshInterval: 6000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const handleUpdateStatus = async (alertId: number, newStatus: "acknowledged" | "resolved") => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await mutate();
        if (selectedAlert?.id === alertId) {
          setSelectedAlert({ ...selectedAlert, status: newStatus });
        }
      }
    } catch (e) {
      console.error("Failed to update alert:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveAll = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/alerts", { method: "DELETE" });
      if (res.ok) {
        setAlarmActive(false);
        await mutate();
        setSelectedAlert(null);
      }
    } catch (e) {
      console.error("Failed to resolve all alerts:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!alerts) return;
    setAlarmActive(alerts.some((a) => a.status === "active"));
  }, [alerts]);

  const summary = useMemo(() => {
    const list = alerts ?? [];
    const leaks = list.filter((a) => a.source?.eventKind === "leak").length;
    const sensorFaults = list.filter((a) => a.source?.eventKind === "sensor_failure").length;
    const active = list.filter((a) => a.status === "active").length;
    const newest = list[0] ?? null;
    return { count: list.length, leaks, sensorFaults, active, newest };
  }, [alerts]);

  const dossierChartData = useMemo(() => {
    if (!selectedAlert?.source) return [];
    return STATION_IDS.map((sid, i) => ({
      station: sid,
      flow: selectedAlert.source!.flows[i] ?? 0,
      pressure: selectedAlert.source!.pressuresBar[i] ?? 0,
    }));
  }, [selectedAlert]);

  const dossierStats = useMemo(() => {
    if (!selectedAlert?.source) return null;
    const { flows, pressuresBar, pressuresAdc } = selectedAlert.source;
    const minFlow = Math.min(...flows);
    const maxFlow = Math.max(...flows);
    const minFlowIdx = flows.indexOf(minFlow);
    const minP = Math.min(...pressuresBar);
    const maxP = Math.max(...pressuresBar);
    const minAdc = Math.min(...pressuresAdc);
    const maxAdc = Math.max(...pressuresAdc);
    return {
      flowSpan: Number((maxFlow - minFlow).toFixed(2)),
      pressSpan: Number((maxP - minP).toFixed(3)),
      lowestFlowStation: STATION_IDS[minFlowIdx] ?? "S1",
      minFlow,
      maxFlow,
      minP,
      maxP,
      minAdc,
      maxAdc,
    };
  }, [selectedAlert]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{ background: "#DFF5FF", color: "#0076A0", borderColor: "#ABE0F9" }}
            >
              <Database className="w-3 h-3" />
              Friend DB: sensor_data
            </span>
            <span className="text-[11px] text-slate-500">
              Read-only source stream · auto-clears when latest status returns to Normal
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Alerts Log &amp; Telemetry Triage
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Full 14-column breakdown (S1–S4 Flow, Pressure bar + ADC, Pump ON/OFF, Confidence, Localization) in Manila PHT
          </p>
        </div>
      </div>

      {/* ─── DB Overview Strip ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-premium">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Source DB Records (<code className="font-mono">sensor_data</code>)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {sourceOverview?.totalRows ?? "--"}
            </span>
            <span className="text-[11px] font-mono text-sky-700">
              {sourceOverview?.latest ? `Latest #${sourceOverview.latest.id}` : "Waiting"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {sourceOverview?.latest
              ? `${formatPhtDateTime(sourceOverview.latest.createdAt)} PHT`
              : "No rows recorded yet"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-premium">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Current Live DB Status
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            {sourceOverview?.latest ? (
              <>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    sourceOverview.latest.status.toLowerCase() === "normal"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : sourceOverview.latest.status.toLowerCase().includes("leak")
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {sourceOverview.latest.status.toLowerCase() === "normal" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {sourceOverview.latest.status}
                </span>
                <span className="text-[11px] font-mono text-slate-600">
                  Pump {sourceOverview.latest.pumpStatus}
                </span>
              </>
            ) : (
              <span className="text-slate-400">--</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1.5 font-mono tabular-nums">
            {sourceOverview?.latest
              ? `Flow: ${sourceOverview.latest.flow.map((v) => v.toFixed(2)).join(" / ")} L/m`
              : "Awaiting ESP32 upload"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-premium">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Anomaly Breakdown (Last 100)
          </span>
          <div className="mt-1 flex items-baseline gap-3 font-mono tabular-nums">
            <span className="text-lg font-bold text-red-600">{summary.leaks} Leaks</span>
            <span className="text-slate-300">/</span>
            <span className="text-lg font-bold text-amber-700">
              {summary.sensorFaults} SensorFailure
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {summary.active > 0
              ? `${summary.active} ongoing active leak alert`
              : "0 active ongoing leaks"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-premium">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Latest Logged Anomaly Snapshot
          </span>
          {summary.newest?.source ? (
            <>
              <div className="mt-1 font-mono tabular-nums text-sm font-bold text-slate-900">
                #{summary.newest.id} · {summary.newest.source.firmwareStatus}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1 font-mono tabular-nums">
                S1–S4: {summary.newest.source.flows.map((f) => f.toFixed(2)).join(" / ")} L/m
              </span>
            </>
          ) : (
            <div className="mt-2 text-slate-400">No non-Normal rows matched</div>
          )}
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-premium flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-900" />
          <span>Filters:</span>
        </div>

        <select
          value={eventKindFilter}
          onChange={(e) => setEventKindFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium shadow-2xs focus:outline-none cursor-pointer"
        >
          <option value="all">All Event Types</option>
          <option value="leak">Leaks Only</option>
          <option value="sensor_failure">SensorFailure / No Flow</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium shadow-2xs focus:outline-none cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="high">High Severity</option>
          <option value="medium">Medium Severity</option>
          <option value="low">Low Severity</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium shadow-2xs focus:outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 font-medium shadow-2xs focus:outline-none cursor-pointer"
        >
          <option value="all">All Zones</option>
          {[1, 2, 3, 4].map((z) => (
            <option key={z} value={z}>
              Zone {z}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-slate-500 font-mono tabular-nums">
            Showing {alerts?.length ?? 0} record{alerts?.length !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            variant="secondary"
            loading={isUpdating}
            onClick={handleResolveAll}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Resolve All Active
          </Button>
        </div>
      </div>

      {/* ─── Rich Alerts Table ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3.5">Event / Severity</th>
                <th className="py-2.5 px-3.5">DB Row &amp; PHT Time</th>
                <th className="py-2.5 px-3.5">Localization</th>
                <th className="py-2.5 px-3">Pump</th>
                <th className="py-2.5 px-3.5">Flow S1–S4 (L/min)</th>
                <th className="py-2.5 px-3.5">Pressure S1–S4 (bar / ADC)</th>
                <th className="py-2.5 px-3 text-right">ΔQ / SI%</th>
                <th className="py-2.5 px-3 text-right">Conf</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-mono animate-pulse">
                    Loading telemetry events from Neon sensor_data…
                  </td>
                </tr>
              ) : !alerts || alerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No anomaly rows in <code>sensor_data</code> match the selected filters.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => {
                  const badge = eventBadgeMeta(a);
                  const seg = segmentDisplay(a);
                  const src = a.source;
                  const minF = src ? Math.min(...src.flows) : 0;
                  const maxF = src ? Math.max(...src.flows) : 0;
                  const minP = src ? Math.min(...src.pressuresBar) : 0;
                  const maxP = src ? Math.max(...src.pressuresBar) : 0;
                  const minAdc = src ? Math.min(...src.pressuresAdc) : 0;
                  const maxAdc = src ? Math.max(...src.pressuresAdc) : 0;

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        selectedAlert?.id === a.id ? "bg-sky-50/70" : ""
                      }`}
                      onClick={() => setSelectedAlert(a)}
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant={
                              a.severity === "high"
                                ? "critical"
                                : a.severity === "medium"
                                  ? "warning"
                                  : "info"
                            }
                            size="sm"
                            dot
                          >
                            {a.severity.toUpperCase()}
                          </Badge>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.pillClass}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono tabular-nums whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          #{src?.rowId ?? a.id} · {formatPhtTime(a.ts)} PHT
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(a.ts).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{seg.primary}</span>
                        <span className="text-[10px] font-mono text-slate-400">{seg.secondary}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {src ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              src.pumpStatus === "ON"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {src.pumpStatus === "ON" ? (
                              <Zap className="w-2.5 h-2.5" />
                            ) : (
                              <ZapOff className="w-2.5 h-2.5" />
                            )}
                            {src.pumpStatus}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono tabular-nums whitespace-nowrap">
                        {src ? (
                          <div>
                            <div className="flex items-center gap-1 text-[11px]">
                              {src.flows.map((val, idx) => {
                                const isLowOutlier = maxF >= 0.8 && val < maxF * 0.72;
                                return (
                                  <span
                                    key={idx}
                                    className={`px-1 rounded ${
                                      isLowOutlier
                                        ? "bg-amber-100 text-amber-900 font-bold"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {val.toFixed(2)}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              range {minF.toFixed(2)}–{maxF.toFixed(2)} L/m
                            </span>
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono tabular-nums whitespace-nowrap">
                        {src ? (
                          <div>
                            <span className="font-semibold text-violet-800 block">
                              {minP.toFixed(2)}–{maxP.toFixed(2)} bar
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ADC {minAdc}–{maxAdc}
                            </span>
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {src?.eventKind === "leak" ? (
                          <div>
                            <span className="font-bold text-red-600 block">
                              −{(a.leakRate ?? 0).toFixed(2)} L/m
                            </span>
                            <span className="text-[11px] font-bold text-amber-800">
                              SI {(a.si ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-700 block">
                              ΔQ {(a.features?.flowDifference ?? 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">No leak SI</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums font-mono text-sky-700 font-semibold">
                        {(a.confidence * 100).toFixed(0)}%
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`capitalize font-semibold ${
                            a.status === "active"
                              ? "text-red-600"
                              : a.status === "acknowledged"
                                ? "text-amber-700"
                                : "text-emerald-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAlert(a)}
                            icon={<Eye className="w-3 h-3" />}
                          >
                            Inspect
                          </Button>
                          {a.status === "active" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={isUpdating}
                              onClick={() => handleUpdateStatus(a.id, "acknowledged")}
                            >
                              Ack
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="h-3.5 w-full pattern-fluted border-t border-slate-100 opacity-60" />
      </div>

      {/* ─── Full 14-Column Friend DB Telemetry Dossier Drawer ─── */}
      {selectedAlert && (
        <div className="bg-white rounded-2xl border border-sky-300 shadow-lg p-6 animate-fade-in space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Database Record Dossier #{selectedAlert.source?.rowId ?? selectedAlert.id}
                </h3>
                <Badge
                  variant={
                    selectedAlert.severity === "high"
                      ? "critical"
                      : selectedAlert.severity === "medium"
                        ? "warning"
                        : "info"
                  }
                  size="sm"
                  dot
                >
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
                {selectedAlert.source && (
                  <>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${eventBadgeMeta(selectedAlert).pillClass}`}
                    >
                      firmware status: {selectedAlert.source.firmwareStatus}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        selectedAlert.source.pumpStatus === "ON"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      Pump {selectedAlert.source.pumpStatus}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recorded at {formatPhtDateTime(selectedAlert.ts)} PHT · Localization:{" "}
                <strong className="text-slate-700">
                  {segmentDisplay(selectedAlert).primary}
                </strong>{" "}
                ({segmentDisplay(selectedAlert).secondary})
              </p>
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer self-start"
              aria-label="Close dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Individual Station Sensor Cards from sensor_data */}
          {selectedAlert.source && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STATION_IDS.map((sid, idx) => {
                const flowVal = selectedAlert.source!.flows[idx] ?? 0;
                const pressBar = selectedAlert.source!.pressuresBar[idx] ?? 0;
                const pressAdc = selectedAlert.source!.pressuresAdc[idx] ?? 0;
                const isLowestFlow = dossierStats?.lowestFlowStation === sid;

                return (
                  <div
                    key={sid}
                    className={`p-3.5 rounded-xl border ${
                      isLowestFlow && (dossierStats?.flowSpan ?? 0) > 0.3
                        ? "bg-amber-50/70 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">Station {sid}</span>
                      {isLowestFlow && (dossierStats?.flowSpan ?? 0) > 0.3 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Lowest Flow
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sky-700 font-semibold flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> flow{idx + 1}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-slate-900">
                          {flowVal.toFixed(2)} L/m
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-violet-700 font-semibold flex items-center gap-1">
                          <Gauge className="w-3 h-3" /> pressure{idx + 1}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-violet-900">
                          {pressBar.toFixed(2)} bar
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-slate-400 font-mono">
                        <span>Raw 12-bit ADC</span>
                        <span>{pressAdc}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Protocol + Confidence + Deltas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Triage Assessment &amp; Recommended Action
              </span>
              <p className="text-sm font-semibold text-slate-900">
                {selectedAlert.recommendedAction}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">
                Flow Span (Max − Min ΔQ)
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-sky-700">
                {dossierStats ? `${dossierStats.flowSpan.toFixed(2)} L/m` : "--"}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {dossierStats
                  ? `${dossierStats.minFlow.toFixed(2)} → ${dossierStats.maxFlow.toFixed(2)} L/min`
                  : ""}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block">
                Model Confidence &amp; ΔP
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {(selectedAlert.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {dossierStats
                  ? `ΔP = ${dossierStats.pressSpan.toFixed(2)} bar (${dossierStats.minAdc}–${dossierStats.maxAdc} ADC)`
                  : ""}
              </span>
            </div>
          </div>

          {/* Real 4-Station Chart + Raw sensor_data Row JSON */}
          {selectedAlert.source && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  S1–S4 Flow &amp; Pressure Profile (Row #{selectedAlert.source.rowId})
                </h4>
                <div className="h-52 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dossierChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="station" tick={{ fontSize: 11, fill: "#475569" }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" domain={[0, "auto"]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#cbd5e1",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="flow" name="Flow (L/min)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pressure" name="Pressure (bar)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-sky-600" />
                  Raw <code className="font-mono">sensor_data</code> Record Columns
                </h4>
                <pre className="h-52 overflow-auto p-3.5 rounded-xl bg-slate-900 text-sky-100 text-[11px] font-mono leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedAlert.source.rowId,
                      created_at_pht: `${formatPhtDateTime(selectedAlert.ts)} PHT`,
                      status: selectedAlert.source.firmwareStatus,
                      localization: selectedAlert.source.localizationRaw,
                      pump_status: selectedAlert.source.pumpStatus,
                      confidence: selectedAlert.source.confidenceRaw,
                      flow1: selectedAlert.source.flows[0],
                      flow2: selectedAlert.source.flows[1],
                      flow3: selectedAlert.source.flows[2],
                      flow4: selectedAlert.source.flows[3],
                      pressure1_adc: selectedAlert.source.pressuresAdc[0],
                      pressure2_adc: selectedAlert.source.pressuresAdc[1],
                      pressure3_adc: selectedAlert.source.pressuresAdc[2],
                      pressure4_adc: selectedAlert.source.pressuresAdc[3],
                      pressure_bar: selectedAlert.source.pressuresBar,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
