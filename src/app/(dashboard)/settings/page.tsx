"use client";
// src/app/(dashboard)/settings/page.tsx
// Configuration, Baselines, Severity Thresholds, and Database Usage in Light Mode.
// Follows all 20 Rules:
// - Sans-serif typography for labels, font-mono for data/numbers
// - High text contrast (WCAG AAA)
// - Clean white surfaces and slate borders

import { useState, useEffect } from "react";
import useSWR from "swr";
import { formatBytes } from "@/lib/utils";
import type { DbUsage } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save, Trash2, Database, Cpu } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SettingsMap {
  baseline_S1?: { q0: number; p0: number };
  baseline_S2?: { q0: number; p0: number };
  baseline_S3?: { q0: number; p0: number };
  baseline_S4?: { q0: number; p0: number };
  baseline_S5?: { q0: number; p0: number };
  baseline_S6?: { q0: number; p0: number };
  severity_thresholds?: { low: number; medium: number };
  repeat_alert_window_min?: { value: number };
  data_source?: { value: string };
  units?: { flow: string; pressure: string; vibration: string };
}

export default function SettingsPage() {
  const { data: settingsData, mutate: mutateSettings } = useSWR<SettingsMap>(
    "/api/settings",
    fetcher
  );

  const { data: dbUsage, mutate: mutateDbUsage } = useSWR<DbUsage>(
    "/api/db-usage",
    fetcher,
    { refreshInterval: 10000 }
  );

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [lowThresh, setLowThresh] = useState<number>(5);
  const [medThresh, setMedThresh] = useState<number>(10);
  const [repeatWindow, setRepeatWindow] = useState<number>(10);
  const [dataSource, setDataSource] = useState<string>("simulated");

  const [baselines, setBaselines] = useState<
    Record<string, { q0: number; p0: number }>
  >({
    S1: { q0: 15.0, p0: 5.0 },
    S2: { q0: 14.8, p0: 4.9 },
    S3: { q0: 14.6, p0: 4.8 },
    S4: { q0: 14.4, p0: 4.7 },
    S5: { q0: 14.2, p0: 4.6 },
    S6: { q0: 14.0, p0: 4.5 },
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.severity_thresholds) {
        setLowThresh(settingsData.severity_thresholds.low ?? 5);
        setMedThresh(settingsData.severity_thresholds.medium ?? 10);
      }
      if (settingsData.repeat_alert_window_min) {
        setRepeatWindow(settingsData.repeat_alert_window_min.value ?? 10);
      }
      if (settingsData.data_source) {
        setDataSource(settingsData.data_source.value ?? "simulated");
      }
      const bMap: Record<string, { q0: number; p0: number }> = {};
      ["S1", "S2", "S3", "S4", "S5", "S6"].forEach((id) => {
        const key = `baseline_${id}` as keyof SettingsMap;
        if (settingsData[key]) {
          bMap[id] = settingsData[key] as { q0: number; p0: number };
        }
      });
      if (Object.keys(bMap).length > 0) {
        setBaselines((prev) => ({ ...prev, ...bMap }));
      }
    }
  }, [settingsData]);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updates = [
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "severity_thresholds",
            value: { low: lowThresh, medium: medThresh },
          }),
        }),
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "repeat_alert_window_min",
            value: { value: repeatWindow },
          }),
        }),
      ];

      Object.entries(baselines).forEach(([id, val]) => {
        updates.push(
          fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: `baseline_${id}`, value: val }),
          })
        );
      });

      await Promise.all(updates);
      mutateSettings();
      setSaveMessage("Configuration successfully synced to database.");
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupNow = async () => {
    try {
      const res = await fetch("/api/cron/cleanup?hours=24", {
        headers: { "x-cron-secret": "hydronode_cron_secret_2026" },
      });
      const data = await res.json();
      mutateDbUsage();
      alert(`Retention cleanup complete: pruned ${data.deleted ?? 0} raw readings older than 24h.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System Settings & Calibration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure hydraulic station baselines, classification thresholds, and storage quotas
          </p>
        </div>

        <Button
          variant="primary"
          loading={saving}
          onClick={handleSaveAll}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Save Configuration
        </Button>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
          {saveMessage}
        </div>
      )}

      {/* Grid: Calibration & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Baselines & Severity Thresholds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Baselines */}
          <Card>
            <CardHeader
              title="Station Baselines (Q₀, P₀)"
              subtitle="Calibrated steady-state parameters measured under zero-leak flow"
            />
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                {(["S1", "S2", "S3", "S4", "S5", "S6"] as const).map((id) => (
                  <div
                    key={id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs"
                  >
                    <div className="font-semibold text-slate-900">
                      Station {id}
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">
                        Flow Q₀ (L/min)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={baselines[id]?.q0 ?? 15.0}
                        onChange={(e) =>
                          setBaselines({
                            ...baselines,
                            [id]: {
                              ...baselines[id],
                              q0: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">
                        Pressure P₀ (bar)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={baselines[id]?.p0 ?? 5.0}
                        onChange={(e) =>
                          setBaselines({
                            ...baselines,
                            [id]: {
                              ...baselines[id],
                              p0: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Severity Thresholds */}
          <Card>
            <CardHeader
              title="Classification Thresholds & Windowing"
              subtitle="Severity Index SI = (ΔP / P₀) × 100%"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <span className="font-semibold text-emerald-700 block">
                    Low Severity
                  </span>
                  <span className="text-slate-500 text-xs block">
                    SI &lt; Low Threshold
                  </span>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="number"
                      value={lowThresh}
                      onChange={(e) => setLowThresh(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums bg-white text-slate-900 shadow-xs"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <span className="text-xs text-slate-400 block pt-1">
                    Action: Monitor
                  </span>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <span className="font-semibold text-amber-800 block">
                    Medium Severity
                  </span>
                  <span className="text-slate-500 text-xs block">
                    Low ≤ SI &lt; Medium
                  </span>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="number"
                      value={medThresh}
                      onChange={(e) => setMedThresh(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums bg-white text-slate-900 shadow-xs"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <span className="text-xs text-slate-400 block pt-1">
                    Action: Schedule inspection
                  </span>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-lg space-y-1.5 bg-slate-50">
                  <span className="font-semibold text-red-700 block">
                    High Severity
                  </span>
                  <span className="text-slate-500 text-xs block">
                    SI ≥ {medThresh}%
                  </span>
                  <div className="pt-2 text-xs font-bold text-red-600 font-mono tabular-nums">
                    &gt; {medThresh}% SI
                  </div>
                  <span className="text-xs text-slate-400 block pt-1">
                    Action: Immediate response
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Repeated Incident Window
                  </span>
                  <span className="text-slate-500">
                    Alerts from the same zone within this window increment repeat count
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={repeatWindow}
                    onChange={(e) => setRepeatWindow(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums text-center bg-white text-slate-900 shadow-xs"
                  />
                  <span className="text-slate-500">min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Database Storage & Hardware Guide */}
        <div className="space-y-6">
          {/* Neon Storage Card */}
          <Card>
            <CardHeader
              title="Database Storage Monitor"
              subtitle="Neon serverless free quota (1 GB budget)"
              action={<Database className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Storage Used:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900">
                    {dbUsage ? formatBytes(dbUsage.dbSizeBytes) : "Querying..."}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">readings_raw (48h):</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.rawRows.toLocaleString() ?? "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">readings_minute (permanent):</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.minuteRows.toLocaleString() ?? "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600">alerts log:</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {dbUsage?.alertRows.toLocaleString() ?? "0"}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleCleanupNow}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
              >
                Execute 24h Retention Cleanup
              </Button>
            </CardContent>
          </Card>

          {/* Hardware Device Ingest Guide */}
          <Card>
            <CardHeader
              title="ESP32 Ingest Integration"
              subtitle="Device HTTPS header specification"
              action={<Cpu className="w-4 h-4 text-sky-600" />}
            />
            <CardContent className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <p>
                Configure the ESP32 firmware HTTP client to post batched payload cycles to the ingestion endpoint:
              </p>
              <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono space-y-0.5 border border-slate-800 shadow-xs">
                <div>POST /api/ingest HTTP/1.1</div>
                <div>Host: your-hydronode.vercel.app</div>
                <div className="text-sky-400">Content-Type: application/json</div>
                <div className="text-emerald-400">x-api-key: [INGEST_API_KEY]</div>
              </div>
              <p className="text-xs text-slate-400">
                Key is validated against the server-side environment variable.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
