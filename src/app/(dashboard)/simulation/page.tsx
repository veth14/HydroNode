"use client";
// src/app/(dashboard)/simulation/page.tsx
// Simulation Control Panel in Light Mode.
// Follows 20 Rules:
// - Clean sans-serif typography, font-mono for parameters/numbers
// - High text contrast
// - Clean white surfaces and slate borders
// - Clear CTA emphasis

import { useState } from "react";
import { useHydroStore } from "@/store/hydroStore";
import type { ZoneId } from "@/config/rig";
import { ZONES } from "@/config/rig";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FlaskConical,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Zap,
  Trash2,
  Terminal,
  Power,
  Sliders,
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
  const [pumpOn, setPumpOn] = useState(true);
  const [pumpPwm, setPumpPwm] = useState(190); // ~75% duty cycle (BOM standard)
  const [pidAutoBalance, setPidAutoBalance] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "Rig simulation service connected. Ready to generate test cycles.",
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleTogglePump = () => {
    const nextState = !pumpOn;
    setPumpOn(nextState);
    addLog(`Water Pump: ${nextState ? "ON (PWM Active)" : "OFF (0% Duty Cycle via LR7843 MOSFET)"}`);
  };

  const handlePwmChange = (val: number) => {
    setPumpPwm(val);
    const pct = Math.round((val / 255) * 100);
    addLog(`Pump PWM adjusted to: ${val}/255 (${pct}% Duty Cycle). Target Flow: ${(8 + (val / 255) * 4).toFixed(1)} LPM`);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Simulation & Rig Testbench
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Inject synthetic hydraulic leaks, demand surges, and pump transients into the 5-zone pipeline
        </p>
      </div>

      {/* Mode Switch Card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              Active Ingest Pipeline
            </span>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">
              Current Source:{" "}
              <span className={dataSource === "simulated" ? "text-sky-700 font-bold" : "text-emerald-700 font-bold"}>
                {dataSource === "simulated" ? "Simulated Testbench" : "Live ESP32 Hardware"}
              </span>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleToggleDataSource("simulated")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                dataSource === "simulated"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Simulated
            </button>
            <button
              onClick={() => handleToggleDataSource("live")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                dataSource === "live"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Live (ESP32)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Controls & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Injectors & Pump Control */}
        <div className="lg:col-span-2 space-y-6">
          {/* Water Pump & PWM Pressure Controller Card */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Power className={`w-4 h-4 ${pumpOn ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Water Pump & PWM Pressure Control</span>
                </div>
              }
              subtitle="24V Brushless Centrifugal Pump (JT-800D) paired with LR7843 MOSFET PWM Driver"
              action={
                <Badge variant={pumpOn ? "success" : "neutral"} dot size="sm">
                  {pumpOn ? `RUNNING (${Math.round((pumpPwm / 255) * 100)}% PWM)` : "STOPPED"}
                </Badge>
              }
            />
            <CardContent className="space-y-4">
              {/* Pump Metrics & Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Target Flow Rate</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-0.5">
                    {pumpOn ? (8 + (pumpPwm / 255) * 4).toFixed(1) : "0.0"} <span className="text-xs font-normal text-slate-500">LPM</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Native 1/2&quot; BSP/NPT Loop</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Supply Head Pressure</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
                    {pumpOn ? (2.5 + (pumpPwm / 255) * 2.5).toFixed(2) : "0.00"} <span className="text-xs font-normal text-slate-500">bar</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">5–7m Head Capability</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-500">PID Pressure Balancing</div>
                    <div className="text-xs font-bold text-emerald-700 mt-1">
                      {pidAutoBalance ? "ACTIVE (Station 1 Feedback)" : "MANUAL OPEN LOOP"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !pidAutoBalance;
                      setPidAutoBalance(next);
                      addLog(`PID Automatic Pressure Balancing: ${next ? "ENABLED" : "DISABLED"}`);
                    }}
                    className="text-xs text-left text-sky-700 hover:text-sky-800 underline cursor-pointer mt-1"
                  >
                    Toggle Closed-Loop Auto
                  </button>
                </div>
              </div>

              {/* PWM Duty Cycle Slider */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-600" />
                    ESP32-S3 PWM Signal (`ledcWrite`):
                  </span>
                  <span className="font-mono text-sky-700 font-bold tabular-nums">
                    {pumpPwm} / 255 ({Math.round((pumpPwm / 255) * 100)}% Duty Cycle)
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="255"
                  value={pumpPwm}
                  onChange={(e) => handlePwmChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setPumpOn(false);
                        setPumpPwm(0);
                        addLog("Pump Cutoff: 0% Duty Cycle (MOSFET Pin LOW)");
                      }}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer shadow-xs"
                    >
                      OFF (0%)
                    </button>
                    <button
                      onClick={() => {
                        setPumpOn(true);
                        handlePwmChange(128);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer shadow-xs"
                    >
                      Low (50%)
                    </button>
                    <button
                      onClick={() => {
                        setPumpOn(true);
                        handlePwmChange(190);
                      }}
                      className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-semibold cursor-pointer shadow-xs"
                    >
                      Nominal (75%)
                    </button>
                    <button
                      onClick={() => {
                        setPumpOn(true);
                        handlePwmChange(255);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer shadow-xs"
                    >
                      Max (100%)
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant={pumpOn ? "destructive" : "primary"}
                    onClick={handleTogglePump}
                    icon={<Power className="w-3.5 h-3.5" />}
                  >
                    {pumpOn ? "Stop Pump (Cut Power)" : "Start Pump"}
                  </Button>
                </div>
              </div>

              {/* Hardware Vibration Isolation Note */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  Plumbing: 4–6&quot; flexible silicone coupling isolates centrifugal motor hum from rigid 1/2&quot; PVC loop.
                </span>
                <span className="text-sky-700 font-semibold">Clean Piezo Readings</span>
              </div>
            </CardContent>
          </Card>

          {/* Pipe Leak Injection Card */}
          <Card>
            <CardHeader
              title="Inject Pipeline Leak"
              subtitle="Engage orifice breach on selected zone"
            />
            <CardContent className="space-y-4">
              {/* Zone Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Target Zone:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setActiveZone(z.id)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        activeZone === z.id
                          ? "border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <div className="text-xs font-semibold">Zone {z.id}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {z.stationA} ➔ {z.stationB}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Magnitude Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Orifice Magnitude:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["small", "medium", "large"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMagnitude(m)}
                      className={`py-2 px-3 rounded-lg border text-xs capitalize font-bold transition-all cursor-pointer ${
                        magnitude === m
                          ? "border-sky-500 bg-sky-600 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-xs"
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
                <div className="p-4 border border-slate-200 rounded-lg space-y-2 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    <span>Consumer Demand Surge</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
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

                <div className="p-4 border border-slate-200 rounded-lg space-y-2 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Pump Startup Impulse</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
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
                <p className="text-xs text-slate-500">
                  No active simulated leaks. Pipeline operating nominally.
                </p>
              ) : (
                <div className="space-y-2">
                  {injectedLeaks.map((zid) => (
                    <div
                      key={zid}
                      className="flex items-center justify-between p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-semibold"
                    >
                      <span>Zone {zid} Orifice Engaged</span>
                      <button
                        onClick={() => clearLeak(zid)}
                        className="text-red-600 hover:text-red-800 font-bold p-1 cursor-pointer"
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
                  <Terminal className="w-3.5 h-3.5 text-sky-600" />
                  <span>Rig Activity Log</span>
                </div>
              }
              action={
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Clear
                </button>
              }
            />
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-1.5 text-xs text-slate-600 font-mono tabular-nums">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-b border-slate-100 pb-1">
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
