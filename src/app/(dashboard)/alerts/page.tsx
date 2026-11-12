"use client";
// src/app/(dashboard)/alerts/page.tsx
// Alerts Log & Event Triage in Light Mode.
// Follows 20 Rules:
// - Sans-serif typography for labels, tabular-nums for data
// - High text contrast (WCAG AAA)
// - Clean white surfaces and slate borders
// - Crisp action buttons

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
import { CheckCircle2, AlertTriangle, X, Filter, Activity, Droplets } from "lucide-react";

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Alert Log & Event Triage
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acoustic emission and hydraulic flow imbalance classified by on-device Random Forest
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-sky-600" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="all">All Zones</option>
            {[1, 2, 3, 4, 5].map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-slate-500 font-mono tabular-nums">
          Showing {alerts?.length ?? 0} record{alerts?.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono animate-pulse">
                    Loading alerts...
                  </td>
                </tr>
              ) : !alerts || alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedAlert?.id === a.id ? "bg-sky-50/50" : ""
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
                    <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                      {new Date(a.ts).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Zone {a.zoneId ?? "?"} ({a.stationId})
                      {a.repeatCount > 1 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 font-bold font-mono rounded text-[11px] tabular-nums">
                          ×{a.repeatCount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-amber-800 font-bold">
                      {a.si?.toFixed(1) ?? "--"}%
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-red-600 font-bold">
                      {a.leakRate?.toFixed(1) ?? "--"} L/min
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-sky-700 font-semibold">
                      {(a.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4">
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
        <div className="bg-white rounded-xl border border-sky-300 shadow-lg p-6 animate-fade-in space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
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
              <p className="text-xs text-slate-500 mt-1">
                Detected at {new Date(selectedAlert.ts).toLocaleString()} on Node {selectedAlert.stationId} (Zone {selectedAlert.zoneId})
              </p>
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Severity Index (SI)</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-800">
                {selectedAlert.si?.toFixed(1) ?? "--"}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Formula: (ΔP / P₀) × 100%
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Calculated Leak Rate</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-red-600">
                {selectedAlert.leakRate?.toFixed(1) ?? "--"} <span className="text-xs font-normal">L/min</span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Baseline flow delta (Q₀ − Q)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Model Confidence</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-sky-700">
                {(selectedAlert.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                On-device Random Forest
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Repeat Count</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                ×{selectedAlert.repeatCount}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Within 10-min window
              </span>
            </div>
          </div>

          {/* Action Protocol Recommendation */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recommended Protocol Action
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {selectedAlert.recommendedAction}
            </p>
          </div>

          {/* Features Breakdown */}
          {selectedAlert.features && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  ML Feature Vector Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">Pressure Drop Rate (ΔP)</span>
                    <span className="font-bold font-mono tabular-nums text-slate-900">
                      {selectedAlert.features.pressureDropRate?.toFixed(2) ?? "--"} bar/s
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">Flow Difference (ΔQ)</span>
                    <span className="font-bold font-mono tabular-nums text-sky-700">
                      {selectedAlert.features.flowDifference?.toFixed(2) ?? "--"} L/min
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">Seismic Wave RMS Energy</span>
                    <span className="font-bold font-mono tabular-nums text-amber-800">
                      {selectedAlert.features.vibrationRms?.toFixed(3) ?? "--"} g
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600">Dominant Seismic Frequency</span>
                    <span className="font-bold font-mono tabular-nums text-slate-900">
                      {selectedAlert.features.dominantFreq?.toFixed(0) ?? "--"} Hz
                    </span>
                  </div>
                </div>
              </div>

              {/* Upstream vs Downstream Flow Balance */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  Inter-Station Flow Imbalance (Localization)
                </h4>
                <div className="h-44 w-full bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowComparisonData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" unit=" L/m" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#cbd5e1" width={110} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#cbd5e1",
                          borderRadius: "8px",
                          color: "#0f172a",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="flow" fill="#0284c7" radius={[0, 4, 4, 0]} />
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
