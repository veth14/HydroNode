"use client";
// src/app/(dashboard)/alerts/page.tsx
// Alerts Log & Event Triage — Mission Control SCADA Design System.

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { LiveAlert } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CheckCircle2, Clock, AlertTriangle, X, Filter, Activity, Droplets } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<LiveAlert | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const queryParams = new URLSearchParams();
  if (severityFilter !== "all") queryParams.set("severity", severityFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (zoneFilter !== "all") queryParams.set("zoneId", zoneFilter);

  const { data: alerts, mutate, isLoading } = useSWR<LiveAlert[]>(
    `/api/alerts?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 4000 }
  );

  const handleUpdateStatus = async (alertId: number, newStatus: "acknowledged" | "resolved") => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        mutate();
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

  const flowComparisonData = selectedAlert
    ? [
        { name: "Upstream (Q_in)", flow: 15.0 },
        {
          name: "Downstream (Q_out)",
          flow: Math.max(0, 15.0 - (selectedAlert.features?.flowDifference ?? 4.0)),
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans font-mono">
      <div className="pb-2 border-b border-[#1e2733]">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Alert Log & Event Triage
        </h1>
        <p className="text-xs text-[#7a8fa6] mt-0.5">
          Acoustic emission and hydraulic flow imbalance classified by on-device Random Forest
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f1419] p-4 rounded-xl border border-[#1e2733] shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-[#7a8fa6] font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-[#00b4d8]" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-[#1e2733] rounded-lg px-2.5 py-1.5 bg-[#0a0d12] text-[#e8edf2] font-mono font-medium focus:outline-none focus:border-[#00b4d8]"
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#1e2733] rounded-lg px-2.5 py-1.5 bg-[#0a0d12] text-[#e8edf2] font-mono font-medium focus:outline-none focus:border-[#00b4d8]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="border border-[#1e2733] rounded-lg px-2.5 py-1.5 bg-[#0a0d12] text-[#e8edf2] font-mono font-medium focus:outline-none focus:border-[#00b4d8]"
          >
            <option value="all">All Zones</option>
            {[1, 2, 3, 4, 5].map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-[#7a8fa6] tabular-nums">
          Showing {alerts?.length ?? 0} record{alerts?.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0f1419] rounded-xl border border-[#1e2733] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0a0d12] text-[#7a8fa6] font-semibold border-b border-[#1e2733]">
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Pipeline Segment</th>
                <th className="py-2.5 px-4 text-right">SI (%)</th>
                <th className="py-2.5 px-4 text-right">Leak Rate</th>
                <th className="py-2.5 px-4 text-right">Confidence</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2733]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#7a8fa6] animate-pulse">
                    Loading alerts...
                  </td>
                </tr>
              ) : !alerts || alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7a8fa6]">
                    No alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-[#141c24] transition-colors cursor-pointer ${
                      selectedAlert?.id === a.id
                        ? "bg-[#00b4d810]"
                        : ""
                    }`}
                    onClick={() => setSelectedAlert(a)}
                  >
                    <td className="py-3 px-4">
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
                    </td>
                    <td className="py-3 px-4 text-[#7a8fa6] tabular-nums">
                      {new Date(a.ts).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      Zone {a.zoneId ?? "?"} ({a.stationId})
                      {a.repeatCount > 1 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-900/60 font-bold rounded tabular-nums">
                          ×{a.repeatCount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-amber-400 font-bold">
                      {a.si?.toFixed(1) ?? "--"}%
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-red-400 font-bold">
                      {a.leakRate?.toFixed(1) ?? "--"} L/min
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#00b4d8]">
                      {(a.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`capitalize font-medium ${
                          a.status === "active"
                            ? "text-red-400"
                            : a.status === "acknowledged"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                        {a.status !== "resolved" && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={isUpdating}
                            onClick={() => handleUpdateStatus(a.id, "resolved")}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Dossier Detail Drawer */}
      {selectedAlert && (
        <div className="bg-[#0f1419] rounded-xl border border-[#00b4d850] shadow-2xl p-6 animate-fade-in space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#1e2733]">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Incident Dossier #{selectedAlert.id}
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
              </div>
              <p className="text-xs text-[#7a8fa6] mt-1">
                Detected at {new Date(selectedAlert.ts).toLocaleString()} on Node {selectedAlert.stationId} (Zone {selectedAlert.zoneId})
              </p>
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-white hover:bg-[#1e2733] transition-colors"
              aria-label="Close dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733]">
              <span className="text-xs text-[#7a8fa6] block">Severity Index (SI)</span>
              <span className="text-2xl font-bold tabular-nums text-amber-400">
                {selectedAlert.si?.toFixed(1) ?? "--"}%
              </span>
              <span className="text-[11px] text-[#4a5a6e] block mt-0.5">
                Formula: (ΔP / P₀) × 100%
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733]">
              <span className="text-xs text-[#7a8fa6] block">Calculated Leak Rate</span>
              <span className="text-2xl font-bold tabular-nums text-red-400">
                {selectedAlert.leakRate?.toFixed(1) ?? "--"} <span className="text-xs font-normal">L/min</span>
              </span>
              <span className="text-[11px] text-[#4a5a6e] block mt-0.5">
                Baseline flow delta (Q₀ − Q)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733]">
              <span className="text-xs text-[#7a8fa6] block">Model Confidence</span>
              <span className="text-2xl font-bold tabular-nums text-[#00b4d8]">
                {(selectedAlert.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-[#4a5a6e] block mt-0.5">
                On-device Random Forest
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0a0d12] border border-[#1e2733]">
              <span className="text-xs text-[#7a8fa6] block">Repeat Count</span>
              <span className="text-2xl font-bold tabular-nums text-white">
                ×{selectedAlert.repeatCount}
              </span>
              <span className="text-[11px] text-[#4a5a6e] block mt-0.5">
                Within 10-min window
              </span>
            </div>
          </div>

          {/* Action Protocol Recommendation */}
          <div className="p-4 rounded-lg bg-[#0a0d12] border border-[#1e2733] space-y-1.5">
            <span className="text-xs font-semibold text-[#7a8fa6] uppercase tracking-wider">
              Recommended Protocol Action
            </span>
            <p className="text-sm font-semibold text-white">
              {selectedAlert.recommendedAction}
            </p>
          </div>

          {/* Features Breakdown */}
          {selectedAlert.features && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#00b4d8]" />
                  ML Feature Vector Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-[#0a0d12] border border-[#1e2733]">
                    <span className="text-[#7a8fa6]">Pressure Drop Rate (ΔP)</span>
                    <span className="font-bold tabular-nums text-white">
                      {selectedAlert.features.pressureDropRate?.toFixed(2) ?? "--"} bar/s
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#0a0d12] border border-[#1e2733]">
                    <span className="text-[#7a8fa6]">Flow Difference (ΔQ)</span>
                    <span className="font-bold tabular-nums text-[#00b4d8]">
                      {selectedAlert.features.flowDifference?.toFixed(2) ?? "--"} L/min
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#0a0d12] border border-[#1e2733]">
                    <span className="text-[#7a8fa6]">Seismic Wave RMS Energy</span>
                    <span className="font-bold tabular-nums text-[#f59e0b]">
                      {selectedAlert.features.vibrationRms?.toFixed(3) ?? "--"} g
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#0a0d12] border border-[#1e2733]">
                    <span className="text-[#7a8fa6]">Dominant Seismic Frequency</span>
                    <span className="font-bold tabular-nums text-white">
                      {selectedAlert.features.dominantFreq?.toFixed(0) ?? "--"} Hz
                    </span>
                  </div>
                </div>
              </div>

              {/* Upstream vs Downstream Flow Balance */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[#00b4d8]" />
                  Inter-Station Flow Imbalance (Localization)
                </h4>
                <div className="h-44 w-full bg-[#0a0d12] p-2 rounded-lg border border-[#1e2733]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowComparisonData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" unit=" L/m" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#7a8fa6" }} stroke="#1e2733" width={110} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1419",
                          borderColor: "#1e2733",
                          borderRadius: "8px",
                          color: "#e8edf2",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="flow" fill="#00b4d8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
