"use client";
// src/app/(dashboard)/simulation/page.tsx
// Simulation Control Panel — Mission Control SCADA Design System.

import { useState } from "react";
import { useHydroStore } from "@/store/hydroStore";
import type { ZoneId } from "@/config/rig";
import { ZONES } from "@/config/rig";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FlaskConical,
  Radio,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Zap,
  Trash2,
  Terminal,
} from "lucide-react";

export default function SimulationPage() {
  const dataSource = useHydroStore((s) => s.dataSource);
  const setDataSource = useHydroStore((s) => s.setDataSource);
  const injectedLeaks = useHydroStore((s) => s.injectedLeaks);
  const injectLeak = useHydroStore((s) => s.injectLeak);
  const clearLeak = useHydroStore((s) => s.clearLeak);
  const clearAllLeaks = useHydroStore((s) => s.clearAllLeaks);

  const [activeZone, setActiveZone] = useState<ZoneId>(2);
  const [magnitude, setMagnitude] = useState<"small" | "medium" | "large">("medium");
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "Rig simulation service connected. Ready to generate test cycles.",
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleToggleDataSource = async (mode: "simulated" | "live") => {
    setDataSource(mode);
    addLog(`Switched data source mode to: ${mode.toUpperCase()}`);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "data_source", value: { value: mode } }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectLeak = async () => {
    setIsSending(true);
    injectLeak(activeZone);
    addLog(`Injecting ${magnitude.toUpperCase()} leak into Zone ${activeZone}...`);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaks: [{ zoneId: activeZone, magnitude }],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(
          `Batch processed: ${data.ingest?.readingsInserted ?? 210} readings, ${
            data.ingest?.alertsInserted ?? 1
          } alert logged.`
        );
      } else {
        addLog(`Error: ${data.error ?? "Failed to ingest"}`);
      }
    } catch (err: unknown) {
      addLog(`Network error: ${String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleInjectEvent = async (type: "demand_spike" | "pump_transient") => {
    setIsSending(true);
    addLog(
      `Triggering ${type === "demand_spike" ? "Demand Surge" : "Pump Startup Surge"} (Negative Control)...`
    );

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extras: [{ type }],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`Transient batch accepted. 0 false leak alarms raised.`);
      }
    } catch (err: unknown) {
      addLog(`Error: ${String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = async () => {
    setIsSending(true);
    clearAllLeaks();
    addLog("Pipeline reset: clearing all simulated orifice breaches...");

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaks: [], extras: [] }),
      });
      if (res.ok) {
        addLog("Nominal baseline flow and pressure restored across all stations.");
      }
    } catch (err: unknown) {
      addLog(`Error: ${String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans font-mono">
      <div className="pb-2 border-b border-[#1e2733]">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Simulation & Rig Testbench
        </h1>
        <p className="text-xs text-[#7a8fa6] mt-0.5">
          Inject synthetic hydraulic leaks, demand surges, and pump transients into the 5-zone pipeline
        </p>
      </div>

      {/* Mode Switch Card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <span className="text-xs font-semibold text-[#7a8fa6] block">
              Active Ingest Pipeline
            </span>
            <div className="text-sm font-semibold text-white mt-0.5">
              Current Source:{" "}
              <span className={dataSource === "simulated" ? "text-[#00b4d8] font-bold" : "text-emerald-400 font-bold"}>
                {dataSource === "simulated" ? "Simulated Testbench" : "Live ESP32 Hardware"}
              </span>
            </div>
          </div>

          <div className="flex bg-[#0a0d12] p-1 rounded-lg border border-[#1e2733]">
            <button
              onClick={() => handleToggleDataSource("simulated")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                dataSource === "simulated"
                  ? "bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.6)]"
                  : "text-[#7a8fa6] hover:text-white"
              }`}
            >
              Simulated
            </button>
            <button
              onClick={() => handleToggleDataSource("live")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                dataSource === "live"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : "text-[#7a8fa6] hover:text-white"
              }`}
            >
              Live (ESP32)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Controls & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Injectors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipe Leak Injection Card */}
          <Card glow={true}>
            <CardHeader
              title="Inject Pipeline Leak"
              subtitle="Engage orifice breach on selected zone"
            />
            <CardContent className="space-y-4">
              {/* Zone Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#7a8fa6] mb-2">
                  Target Zone:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setActiveZone(z.id)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        activeZone === z.id
                          ? "border-[#00b4d8] bg-[#00b4d818] text-[#00b4d8] font-bold shadow-[0_0_12px_-2px_rgba(0,180,216,0.3)]"
                          : "border-[#1e2733] bg-[#0a0d12] hover:border-[#2a3644] text-[#7a8fa6] hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-semibold">Zone {z.id}</div>
                      <div className="text-[10px] text-[#4a5a6e] mt-0.5">
                        {z.stationA} ➔ {z.stationB}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Magnitude Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#7a8fa6] mb-2">
                  Orifice Magnitude:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["small", "medium", "large"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMagnitude(m)}
                      className={`py-2 px-3 rounded-lg border text-xs capitalize font-bold transition-all cursor-pointer ${
                        magnitude === m
                          ? "border-[#00b4d8] bg-[#00b4d8] text-slate-950 shadow-[0_0_8px_rgba(0,180,216,0.5)]"
                          : "border-[#1e2733] bg-[#0a0d12] text-[#7a8fa6] hover:text-white hover:border-[#2a3644]"
                      }`}
                    >
                      {m} (
                      {m === "small"
                        ? "1.5 L/min"
                        : m === "medium"
                        ? "4.0 L/min"
                        : "8.0 L/min"}
                      )
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  loading={isSending}
                  onClick={handleInjectLeak}
                  icon={<AlertTriangle className="w-4 h-4" />}
                >
                  Inject Leak into Zone {activeZone}
                </Button>
                <Button
                  variant="secondary"
                  loading={isSending}
                  onClick={handleReset}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Reset Pipeline
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Negative Controls Card (Transients) */}
          <Card>
            <CardHeader
              title="Negative Control Events (Non-Leak Operational Scenarios)"
              subtitle="Events that must not generate false alarms in water district networks"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-[#1e2733] rounded-lg space-y-2 bg-[#0a0d12]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <TrendingUp className="w-4 h-4 text-[#00b4d8]" />
                    <span>Consumer Demand Surge</span>
                  </div>
                  <p className="text-[11px] text-[#7a8fa6] leading-relaxed">
                    Uniform flow increase across all stations with stable pressure.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    loading={isSending}
                    onClick={() => handleInjectEvent("demand_spike")}
                  >
                    Simulate Demand Surge
                  </Button>
                </div>

                <div className="p-4 border border-[#1e2733] rounded-lg space-y-2 bg-[#0a0d12]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Pump Startup Impulse</span>
                  </div>
                  <p className="text-[11px] text-[#7a8fa6] leading-relaxed">
                    Brief pressure spike suppressed by edge filter heuristics.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    loading={isSending}
                    onClick={() => handleInjectEvent("pump_transient")}
                  >
                    Simulate Pump Transient
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Injections & Real-time Log */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Active Injected Scenarios" />
            <CardContent>
              {injectedLeaks.length === 0 ? (
                <p className="text-xs text-[#7a8fa6]">
                  No active simulated leaks. Pipeline operating nominally.
                </p>
              ) : (
                <div className="space-y-2">
                  {injectedLeaks.map((zid) => (
                    <div
                      key={zid}
                      className="flex items-center justify-between p-2.5 bg-red-950/60 border border-red-900/60 rounded-md text-xs text-red-300 font-medium"
                    >
                      <span>Zone {zid} Orifice Engaged</span>
                      <button
                        onClick={() => clearLeak(zid)}
                        className="text-red-400 hover:text-red-200 font-bold p-1 cursor-pointer"
                        title="Remove leak"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#00b4d8]" />
                  <span>Rig Activity Log</span>
                </div>
              }
              action={
                <button
                  onClick={() => setLogs([])}
                  className="text-[11px] text-[#7a8fa6] hover:text-white font-medium cursor-pointer"
                >
                  Clear
                </button>
              }
            />
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-1.5 text-[11px] text-[#7a8fa6] tabular-nums font-mono">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-b border-[#1e2733] pb-1">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
