"use client";
// src/components/rig/RigTimeMachine.tsx
// Interactive Historic Incident Playback Controller (Time Machine) for HydroNode SCADA.
// Allows operators to replay pipeline bursts frame-by-frame across the physical test rig.

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Radio,
  X,
  Droplets,
  Gauge,
  Activity,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  PRESET_INCIDENTS,
  calculatePlaybackFrame,
  type IncidentScenario,
  type PlaybackFrame,
} from "@/lib/incidentPlayback";

interface RigTimeMachineProps {
  onFrameUpdate: (frame: PlaybackFrame) => void;
  onExit: () => void;
  initialScenarioId?: string;
}

export function RigTimeMachine({
  onFrameUpdate,
  onExit,
  initialScenarioId = "zone-2-burst",
}: RigTimeMachineProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(initialScenarioId);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const scenario =
    PRESET_INCIDENTS.find((s) => s.id === selectedScenarioId) ?? PRESET_INCIDENTS[0];

  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;

  // Compute active frame with useMemo
  const currentFrame = useMemo(() => {
    return calculatePlaybackFrame(scenario, currentSeconds);
  }, [scenario, currentSeconds]);

  // Notify parent only when time or scenario actually advances
  const lastEmittedT = useRef<number>(-1);
  const lastScenarioId = useRef<string>("");

  useEffect(() => {
    if (
      lastScenarioId.current !== selectedScenarioId ||
      Math.abs(lastEmittedT.current - currentSeconds) >= 0.04
    ) {
      lastEmittedT.current = currentSeconds;
      lastScenarioId.current = selectedScenarioId;
      onFrameUpdate(currentFrame);
    }
  }, [currentSeconds, selectedScenarioId, currentFrame, onFrameUpdate]);

  // Clean 20 FPS ticker (50ms interval) for smooth, gentle updates
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const interval = setInterval(() => {
      setCurrentSeconds((prev) => {
        const next = prev + (intervalMs / 1000) * speedRef.current;
        if (next >= scenario.durationSeconds) {
          setIsPlaying(false);
          return scenario.durationSeconds;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, scenario.durationSeconds]);

  const handleSeek = (newSeconds: number) => {
    setCurrentSeconds(Math.max(0, Math.min(newSeconds, scenario.durationSeconds)));
  };

  const handleTogglePlay = () => {
    if (currentSeconds >= scenario.durationSeconds) {
      setCurrentSeconds(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleStep = (delta: number) => {
    handleSeek(currentSeconds + delta);
  };

  const handleScenarioChange = (id: string) => {
    setSelectedScenarioId(id);
    setCurrentSeconds(0);
    setIsPlaying(true);
  };

  // Format seconds into mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-premium p-4 sm:p-5 select-none space-y-4 font-sans">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            TIME MACHINE REPLAY
          </span>

          {/* Scenario Selector Dropdown */}
          <select
            value={selectedScenarioId}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
          >
            {PRESET_INCIDENTS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Phase Badge & Exit Button */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80">
            {currentFrame.currentEvent.phase}
          </span>

          <button
            onClick={onExit}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Return to Live Telemetry"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Return to Live</span>
          </button>
        </div>
      </div>

      {/* ─── Main Scrubber & Playback Controls ─── */}
      <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Play/Pause & Step Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTogglePlay}
              className={`flex items-center justify-center w-8 h-8 rounded-xl font-bold transition shadow-xs cursor-pointer ${
                isPlaying
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
              aria-label={isPlaying ? "Pause Playback" : "Start Playback"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleStep(-5)}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs cursor-pointer text-xs"
              title="Step Back 5s"
            >
              −5s
            </button>

            <button
              onClick={() => handleStep(5)}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs cursor-pointer text-xs"
              title="Step Forward 5s"
            >
              +5s
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Restart from 00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-sm font-bold tabular-nums text-slate-900">
              {formatTime(currentSeconds)}
            </span>
            <span className="text-xs text-slate-400 font-mono">/</span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {formatTime(scenario.durationSeconds)}
            </span>
          </div>

          {/* Speed Multiplier Pill Group */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  speedMultiplier === spd
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* ─── Timeline Slider Track with Keyframe Markers ─── */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={scenario.durationSeconds}
            step={0.1}
            value={currentSeconds}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
          />

          {/* Event Dots along the track */}
          <div className="relative w-full h-3 mt-1 pointer-events-none">
            {scenario.events.map((evt, idx) => {
              const leftPercent = (evt.tSeconds / scenario.durationSeconds) * 100;
              const isPassed = currentSeconds >= evt.tSeconds;
              return (
                <div
                  key={idx}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-pointer"
                  onClick={() => handleSeek(evt.tSeconds)}
                  title={`${formatTime(evt.tSeconds)} — ${evt.label}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full border transition-all ${
                      isPassed
                        ? "bg-amber-600 border-amber-700 ring-2 ring-amber-200 scale-110"
                        : "bg-white border-slate-400 hover:scale-125"
                    }`}
                  />
                  <span className="hidden md:block text-[9px] font-semibold text-slate-400 mt-0.5 whitespace-nowrap">
                    {evt.tSeconds}s
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Real-Time Physical Delta Readouts Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Flow Loss Delta */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Flow Delta (ΔQ)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  currentFrame.flowImbalance > 0.5 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {currentFrame.flowImbalance > 0 ? `−${currentFrame.flowImbalance.toFixed(1)}` : "0.0"}
              </span>
              <span className="text-[10px] text-slate-400">L/min</span>
            </div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              currentFrame.flowImbalance > 0.5
                ? "bg-red-50 text-red-600"
                : "bg-sky-50 text-sky-600"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Head Loss Delta */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pressure Head Loss
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  currentFrame.pressureDrop > 0.2 ? "text-amber-700" : "text-slate-900"
                }`}
              >
                {currentFrame.pressureDrop > 0 ? `−${currentFrame.pressureDrop.toFixed(2)}` : "0.00"}
              </span>
              <span className="text-[10px] text-slate-400">bar</span>
            </div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              currentFrame.pressureDrop > 0.2
                ? "bg-amber-50 text-amber-700"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Acoustic Wave Peak */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Acoustic Wave Peak
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  currentFrame.vibrationRmsPeak > 0.15 ? "text-amber-800" : "text-slate-900"
                }`}
              >
                {currentFrame.vibrationRmsPeak.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-400">g RMS</span>
            </div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              currentFrame.vibrationRmsPeak > 0.15
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ESP32 Edge Sampling Mode */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              ESP32-S3 Polling
            </span>
            <div className="mt-1">
              {currentFrame.vibrationRmsPeak > 0.150 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                  100 Hz Surge
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  10 Hz Nominal
                </span>
              )}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 text-[10px] font-mono font-bold">
            MCU
          </div>
        </div>
      </div>

      {/* ─── Active Event Narrative Card ─── */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/60 via-slate-50/40 to-white border border-amber-200/80 text-xs flex items-start gap-3">
        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">
              {currentFrame.currentEvent.label}
            </span>
            <span className="text-[10px] text-amber-800 font-mono font-semibold">
              (t = {currentFrame.currentEvent.tSeconds}s)
            </span>
          </div>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            {currentFrame.currentEvent.description}
          </p>
        </div>
      </div>
    </div>
  );
}

