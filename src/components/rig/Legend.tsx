"use client";
// src/components/rig/Legend.tsx
// Layer toggles, sensor type guide, and pan/zoom controls for RigMap.
// Follows "20 Ways to Unslop AI Designs" (Lucide icons, no emojis, consistent typography).

import { ZoomIn, ZoomOut, RotateCcw, Layers, Cpu, Activity, Tag } from "lucide-react";

interface LegendProps {
  showZones: boolean;
  setShowZones: (val: boolean | ((v: boolean) => boolean)) => void;
  showCat6: boolean;
  setShowCat6: (val: boolean | ((v: boolean) => boolean)) => void;
  showVibration: boolean;
  setShowVibration: (val: boolean | ((v: boolean) => boolean)) => void;
  showLabels: boolean;
  setShowLabels: (val: boolean | ((v: boolean) => boolean)) => void;
  zoom: number;
  setZoom: (val: number | ((v: number) => number)) => void;
  onResetView: () => void;
}

export function Legend({
  showZones,
  setShowZones,
  showCat6,
  setShowCat6,
  showVibration,
  setShowVibration,
  showLabels,
  setShowLabels,
  zoom,
  setZoom,
  onResetView,
}: LegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#0a0d12] border-t border-[#1e2733] text-xs text-[#7a8fa6] select-none">
      {/* 3 Physical Sensors Color Guide & Station Status */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
        <div className="flex items-center gap-3 pr-3 border-r border-[#1e2733]">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            Nominal
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Adaptive
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Alert
          </span>
        </div>

        {/* 3 Physical Sensors & Leak Simulation Valve */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#00b4d8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b4d8]" />
            Flow (Pulse/EL817)
          </span>
          <span className="flex items-center gap-1 text-[#818cf8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
            Pressure (ADS1115 I²C)
          </span>
          <span className="flex items-center gap-1 text-[#f59e0b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            Seismic (Piezo/EL817)
          </span>
          <span className="flex items-center gap-1 text-slate-400 pl-2 border-l border-[#1e2733]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" />
            Leak Valve (Simulate)
          </span>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="flex items-center gap-1 bg-[#0f1419] p-1 rounded-lg border border-[#1e2733]">
        <button
          onClick={() => setShowZones((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
            showZones
              ? "bg-[#00b4d822] text-[#00b4d8] border border-[#00b4d844]"
              : "text-[#7a8fa6] hover:text-[#e8edf2]"
          }`}
          title="Toggle Zone Overlays"
        >
          <Layers className="w-3 h-3" />
          Zones
        </button>

        <button
          onClick={() => setShowCat6((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
            showCat6
              ? "bg-[#00b4d822] text-[#00b4d8] border border-[#00b4d844]"
              : "text-[#7a8fa6] hover:text-[#e8edf2]"
          }`}
          title="Toggle Station Signal Cables"
        >
          <Cpu className="w-3 h-3" />
          Signal Cables
        </button>

        <button
          onClick={() => setShowVibration((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
            showVibration
              ? "bg-[#00b4d822] text-[#00b4d8] border border-[#00b4d844]"
              : "text-[#7a8fa6] hover:text-[#e8edf2]"
          }`}
          title="Toggle Acoustic Wave Overlays"
        >
          <Activity className="w-3 h-3" />
          Seismic Wave
        </button>

        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
            showLabels
              ? "bg-[#00b4d822] text-[#00b4d8] border border-[#00b4d844]"
              : "text-[#7a8fa6] hover:text-[#e8edf2]"
          }`}
          title="Toggle Rig Labels"
        >
          <Tag className="w-3 h-3" />
          Labels
        </button>
      </div>

      {/* View Zoom & Reset Controls */}
      <div className="flex items-center gap-1 bg-[#0f1419] p-1 rounded-lg border border-[#1e2733]">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
          className="p-1 rounded text-[#7a8fa6] hover:text-white hover:bg-[#1e2733] transition-colors cursor-pointer"
          aria-label="Zoom in"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono tabular-nums px-1.5 text-[#7a8fa6]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.7))}
          className="p-1 rounded text-[#7a8fa6] hover:text-white hover:bg-[#1e2733] transition-colors cursor-pointer"
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onResetView}
          className="p-1 ml-1 rounded text-[#7a8fa6] hover:text-white hover:bg-[#1e2733] transition-colors cursor-pointer"
          aria-label="Reset view"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
