"use client";
// src/components/rig/RigTimeMachine.tsx
// Live-Data-Only Time Machine Replay Console for HydroNode SCADA.
// Loads real chronological rows from Neon `sensor_data` (/api/source?limit=300)
// and lets the operator scrub, play/pause, and adjust speed across recorded PHT history.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  buildDbReplayScenario,
  calculatePlaybackFrame,
  type IncidentScenario,
  type PlaybackFrame,
} from "@/lib/incidentPlayback";
import { FLOW_NOMINAL_LPM } from "@/lib/friendTelemetry";
import type { FriendSensorRow } from "@/db/friendClient";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Radio,
  Database,
  Droplets,
  Gauge,
  AlertTriangle,
  FastForward,
  RefreshCw,
} from "lucide-react";

interface RigTimeMachineProps {
  onFrameUpdate: (frame: PlaybackFrame | null) => void;
  onExit: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
const REPLAY_FETCH_LIMIT = 300;

async function fetchDbHistory(): Promise<FriendSensorRow[]> {
  const res = await fetch(`/api/source?limit=${REPLAY_FETCH_LIMIT}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    ok?: boolean;
    history?: FriendSensorRow[];
    error?: string;
  };
  if (data.ok === false) throw new Error(data.error ?? "Database unavailable");
  return Array.isArray(data.history) ? data.history : [];
}

function formatClock(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RigTimeMachine({ onFrameUpdate, onExit }: RigTimeMachineProps) {
  const [scenario, setScenario] = useState<IncidentScenario>(() => buildDbReplayScenario([]));
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const elapsedRef = useRef<number>(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const scenarioRef = useRef<IncidentScenario>(scenario);
  const speedRef = useRef<number>(speedMultiplier);
  const onFrameRef = useRef<(frame: PlaybackFrame | null) => void>(onFrameUpdate);

  useEffect(() => {
    scenarioRef.current = scenario;
    speedRef.current = speedMultiplier;
    onFrameRef.current = onFrameUpdate;
  }, [scenario, speedMultiplier, onFrameUpdate]);

  // Initial load from live sensor_data (async callbacks only -> passes set-state-in-effect)
  useEffect(() => {
    let cancelled = false;
    fetchDbHistory()
      .then((rows) => {
        if (cancelled) return;
        const sc = buildDbReplayScenario(rows);
        elapsedRef.current = 0;
        setScenario(sc);
        setElapsedSec(0);
        setIsPlaying(sc.durationSec > 0);
        onFrameRef.current(calculatePlaybackFrame(sc, 0));
      })
      .catch((err) => {
        if (cancelled) return;
        setDbError(err instanceof Error ? err.message : String(err));
        onFrameRef.current(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDb(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync paused/single-row frame to parent whenever paused
  useEffect(() => {
    if (!isPlaying) {
      onFrameUpdate(calculatePlaybackFrame(scenario, elapsedSec));
    }
  }, [scenario, elapsedSec, isPlaying, onFrameUpdate]);

  // rAF playback loop
  useEffect(() => {
    if (!isPlaying || scenarioRef.current.durationSec <= 0) return;

    lastTsRef.current = null;

    function loop(now: number) {
      if (lastTsRef.current == null) lastTsRef.current = now;
      const dtSec = Math.min((now - lastTsRef.current) / 1000, 0.1);
      lastTsRef.current = now;

      const sc = scenarioRef.current;
      const duration = sc.durationSec;
      const rawNext = elapsedRef.current + dtSec * speedRef.current;
      const done = duration <= 0 || rawNext >= duration;
      const next = done ? duration : rawNext;

      elapsedRef.current = next;
      setElapsedSec(next);
      onFrameRef.current(calculatePlaybackFrame(sc, next));

      if (!done) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
        setIsPlaying(false);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  const handleRefreshDb = useCallback(async () => {
    setLoadingDb(true);
    setDbError(null);
    try {
      const rows = await fetchDbHistory();
      const sc = buildDbReplayScenario(rows);
      elapsedRef.current = 0;
      setScenario(sc);
      setElapsedSec(0);
      setIsPlaying(sc.durationSec > 0);
      onFrameUpdate(calculatePlaybackFrame(sc, 0));
    } catch (err) {
      setDbError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDb(false);
    }
  }, [onFrameUpdate]);

  const seekSeconds = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(sec, scenario.durationSec));
      elapsedRef.current = clamped;
      setElapsedSec(clamped);
      onFrameUpdate(calculatePlaybackFrame(scenario, clamped));
    },
    [scenario, onFrameUpdate]
  );

  const handleTogglePlay = useCallback(() => {
    if (scenario.durationSec <= 0) return;
    if (!isPlaying && elapsedRef.current >= scenario.durationSec) {
      elapsedRef.current = 0;
      setElapsedSec(0);
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, scenario.durationSec]);

  const duration = scenario.durationSec;
  const currentFrame = calculatePlaybackFrame(scenario, elapsedSec);
  const progressPct = duration > 0 ? (elapsedSec / duration) * 100 : 0;
  const hasLeak = (currentFrame?.alerts.length ?? 0) > 0;

  return (
    <div
      className="rounded-2xl bg-white p-4 sm:p-5 select-none space-y-4 font-sans"
      style={{
        border: "1.5px solid #ABE0F9",
        boxShadow: "0 4px 20px rgba(0,118,160,0.08)",
      }}
    >
      {/* ─── Top Header ─── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3"
        style={{ borderBottom: "1px solid #DFF5FF" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" }}
          >
            <Database className="w-3 h-3" />
            LIVE DB TIME MACHINE
          </span>

          <span className="text-xs font-semibold" style={{ color: "#0C2340" }}>
            {loadingDb ? "Loading recorded sensor_data…" : scenario.label}
          </span>

          <button
            type="button"
            onClick={() => void handleRefreshDb()}
            disabled={loadingDb}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer disabled:opacity-60"
            style={{
              background: "#F4FAFD",
              color: "#0076A0",
              border: "1px solid #C8E5F2",
            }}
            title="Reload latest rows from sensor_data"
          >
            <RefreshCw className={`w-3 h-3 ${loadingDb ? "animate-spin" : ""}`} />
            {loadingDb ? "Syncing…" : "Refresh DB"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentFrame && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{
                background: "#EEF6FA",
                color: "#0076A0",
                border: "1px solid #C8E5F2",
              }}
            >
              {currentFrame.currentEvent.phase}
            </span>
          )}

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl transition cursor-pointer"
            style={{
              background: "#F4FAFD",
              color: "#2D5A7A",
              border: "1px solid #DFF5FF",
            }}
            title="Exit replay and return to live feed"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Return to Live</span>
          </button>
        </div>
      </div>

      {dbError && (
        <div className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200">
          Unable to load `sensor_data`: {dbError}
        </div>
      )}

      {/* ─── Empty State (0 rows in sensor_data) ─── */}
      {!loadingDb && scenario.rowCount === 0 ? (
        <div
          className="rounded-xl p-6 text-center space-y-2"
          style={{ background: "#F4FAFD", border: "1px dashed #ABE0F9" }}
        >
          <Database className="w-7 h-7 mx-auto" style={{ color: "#819FD7" }} />
          <h4 className="text-sm font-bold" style={{ color: "#0C2340" }}>
            No Recorded Telemetry Yet
          </h4>
          <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: "#2D5A7A" }}>
            Time Machine replays actual rows recorded in <code className="font-mono">sensor_data</code>.
            Start your ESP32 rig to stream live readings, then click <strong>Refresh DB</strong>.
          </p>
        </div>
      ) : (
        currentFrame && (
          <>
            {/* ─── Scrubber & Transport Controls ─── */}
            <div
              className="space-y-3 p-3.5 rounded-xl"
              style={{ background: "#F4FAFD", border: "1px solid #DFF5FF" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    disabled={duration <= 0}
                    className="flex items-center justify-center w-8 h-8 rounded-xl font-bold transition cursor-pointer disabled:opacity-40"
                    style={
                      isPlaying
                        ? { background: "#0C2340", color: "#ffffff" }
                        : { background: "linear-gradient(135deg,#0076A0,#019FD7)", color: "#ffffff" }
                    }
                    title={duration <= 0 ? "Need 2+ DB rows to animate timeline" : isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      seekSeconds(elapsedSec - 5);
                    }}
                    disabled={duration <= 0}
                    className="px-2.5 h-8 rounded-xl bg-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                    style={{ border: "1px solid #DFF5FF", color: "#2D5A7A" }}
                  >
                    −5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      seekSeconds(elapsedSec + 5);
                    }}
                    disabled={duration <= 0}
                    className="px-2.5 h-8 rounded-xl bg-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                    style={{ border: "1px solid #DFF5FF", color: "#2D5A7A" }}
                  >
                    +5s
                  </button>
                  <button
                    type="button"
                    onClick={() => seekSeconds(0)}
                    disabled={duration <= 0}
                    className="p-2 rounded-xl bg-white cursor-pointer disabled:opacity-40"
                    style={{ border: "1px solid #DFF5FF", color: "#2D5A7A" }}
                    title="Restart from beginning of DB window"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Clock */}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: "#819FD7" }} />
                  <span className="font-mono text-sm font-bold tabular-nums" style={{ color: "#0C2340" }}>
                    {formatClock(elapsedSec)}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#819FD7" }}>
                    / {formatClock(duration)}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white border border-sky-100 text-sky-800">
                    {currentFrame.label}
                  </span>
                </div>

                {/* Speed Pills */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl" style={{ border: "1px solid #DFF5FF" }}>
                  <FastForward className="w-3 h-3 ml-1.5 mr-0.5" style={{ color: "#819FD7" }} />
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setSpeedMultiplier(spd)}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg transition cursor-pointer"
                      style={
                        speedMultiplier === spd
                          ? { background: "#0076A0", color: "#ffffff" }
                          : { color: "#2D5A7A" }
                      }
                    >
                      {spd}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 1)}
                  step={0.1}
                  value={duration > 0 ? elapsedSec : 0}
                  disabled={duration <= 0}
                  onChange={(e) => {
                    setIsPlaying(false);
                    seekSeconds(Number(e.target.value));
                  }}
                  className="w-full accent-sky-600 cursor-pointer"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span style={{ color: "#819FD7" }}>
                    {progressPct.toFixed(0)}% · {currentFrame.note}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {scenario.events.slice(0, 6).map((evt, idx) => (
                      <button
                        key={`${evt.tSeconds}-${idx}`}
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          seekSeconds(evt.tSeconds);
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer"
                        style={
                          evt.tSeconds <= elapsedSec
                            ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }
                            : { background: "#ffffff", color: "#2D5A7A", border: "1px solid #DFF5FF" }
                        }
                        title={evt.description}
                      >
                        {evt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

              {/* ─── Station S1–S4 Flow & Pressure Bars ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div
                className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl"
                style={{ background: "#F4FAFD", border: "1px solid #DFF5FF" }}
              >
                {(["S1", "S2", "S3", "S4"] as const).map((sid, i) => {
                  const f = currentFrame.flow[i] ?? 0;
                  const p = currentFrame.pressure[i] ?? 0;
                  const maxF = Math.max(...currentFrame.flow, 0);
                  const flowPct = Math.min(100, (f / Math.max(FLOW_NOMINAL_LPM, 0.1)) * 100);
                  const pressPct = Math.min(100, (p / 1.2) * 100);
                  const isLeakStation = currentFrame.alerts.some((a) => a.stationId === sid);
                  const starved =
                    isLeakStation ||
                    (currentFrame.issueKind === "leak" &&
                      maxF >= 1.0 &&
                      f < maxF * 0.55);
                  const isNoFlow = f < 0.15;

                  return (
                    <div
                      key={sid}
                      className="p-2.5 rounded-xl bg-white"
                      style={{
                        border: `1px solid ${starved ? "#fecaca" : "#DFF5FF"}`,
                        background: starved ? "#fef2f2" : "#ffffff",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold" style={{ color: "#0C2340" }}>
                          {sid}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            starved
                              ? "bg-red-100 text-red-700"
                              : isNoFlow
                                ? "bg-slate-100 text-slate-600"
                                : currentFrame.pumpOn
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {starved ? "LEAK" : isNoFlow ? "NO FLOW" : currentFrame.pumpOn ? "OK" : "OFF"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between text-[10px]">
                            <span className="flex items-center gap-0.5 text-sky-700 font-semibold">
                              <Droplets className="w-2.5 h-2.5" /> Flow
                            </span>
                            <span className="font-mono font-bold tabular-nums text-slate-900">
                              {f.toFixed(2)} L/m
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-75"
                              style={{
                                width: `${flowPct}%`,
                                background: starved ? "#ef4444" : "#019FD7",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px]">
                            <span className="flex items-center gap-0.5 text-violet-700 font-semibold">
                              <Gauge className="w-2.5 h-2.5" /> Press
                            </span>
                            <span className="font-mono font-bold tabular-nums text-slate-900">
                              {p.toFixed(2)} bar
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-75"
                              style={{
                                width: `${pressPct}%`,
                                background: starved ? "#f97316" : "#8b5cf6",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    background: hasLeak
                      ? "#fef2f2"
                      : currentFrame.issueKind === "sensor_fault"
                        ? "#fffbeb"
                        : "#F4FAFD",
                    border: `1px solid ${
                      hasLeak
                        ? "#fecaca"
                        : currentFrame.issueKind === "sensor_fault"
                          ? "#fde68a"
                          : "#DFF5FF"
                    }`,
                  }}
                >
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "#819FD7" }}>
                      Row #{currentFrame.rowId} · Pump {currentFrame.pumpOn ? "ON" : "OFF"}
                    </span>
                    <span
                      className="text-sm font-bold flex items-center gap-1.5 mt-0.5"
                      style={{
                        color: hasLeak
                          ? "#b91c1c"
                          : currentFrame.issueKind === "sensor_fault"
                            ? "#b45309"
                            : currentFrame.issueKind === "no_flow"
                              ? "#475569"
                              : "#047857",
                      }}
                    >
                      {hasLeak && <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
                      {currentFrame.issueKind === "no_flow"
                        ? `No Flow (${currentFrame.status})`
                        : currentFrame.status}
                    </span>
                  </div>
                  <div className="text-right font-mono tabular-nums text-xs">
                    <div className={currentFrame.flowDelta > 0.5 ? "font-bold text-red-600" : "font-semibold text-slate-700"}>
                      ΔQ {currentFrame.flowDelta.toFixed(2)} L/m
                    </div>
                    <div style={{ color: "#819FD7" }}>
                      ΔP {currentFrame.pressureDrop.toFixed(2)} bar
                    </div>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl text-xs leading-relaxed"
                  style={{ background: "#F4FAFD", border: "1px solid #DFF5FF", color: "#2D5A7A" }}
                >
                  <span className="font-bold block mb-0.5" style={{ color: "#0C2340" }}>
                    {scenario.description}
                  </span>
                  {currentFrame.currentEvent.description}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
