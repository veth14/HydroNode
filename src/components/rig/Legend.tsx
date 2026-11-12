"use client";
// src/components/rig/Legend.tsx
// Layer toggles, sensor type guide, and pan/zoom controls for RigMap in Light Mode.
// Follows "20 Ways to Unslop AI Designs" (Lucide icons, no emojis, consistent typography).

import { ZoomIn, ZoomOut, RotateCcw, Layers, Cpu, Activity, Tag } from "lucide-react";

interface LegendProps {
  showZones: boolean;
  setShowZones: (val: boolean | ((v: boolean) => boolean)) => void;
  showCables: boolean;
  setShowCables: (val: boolean | ((v: boolean) => boolean)) => void;
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
  showCables,
  setShowCables,
  showVibration,
  setShowVibration,
  showLabels,
  setShowLabels,
  zoom,
  setZoom,
  onResetView,
}: LegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 select-none">
      {/* 3 Physical Sensors Color Guide & Station Status */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
          <span className="flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Nominal
          </span>
          <span className="flex items-center gap-1.5 text-amber-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            Adaptive
          </span>
          <span className="flex items-center gap-1.5 text-red-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Alert
          </span>
        </div>

        {/* 3 Physical Sensors & Leak Simulation Valve */}
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1 text-sky-700">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
            Flow (Pulse/EL817)
          </span>
          <span className="flex items-center gap-1 text-indigo-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Pressure (ADS1115 I²C)
          </span>
          <span className="flex items-center gap-1 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Seismic (Piezo/EL817)
          </span>
          <span className="flex items-center gap-1 text-slate-500 pl-2 border-l border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
            Leak Valve
          </span>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setShowZones((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
            showZones
              ? "bg-white text-sky-700 shadow-xs border border-sky-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Toggle Zone Overlays"
        >
          <Layers className="w-3.5 h-3.5" />
          Zones
        </button>

        <button
          onClick={() => setShowCables((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
            showCables
              ? "bg-white text-sky-700 shadow-xs border border-sky-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Toggle Station Signal Cables"
        >
          <Cpu className="w-3.5 h-3.5" />
          Signal Cables
        </button>

        <button
          onClick={() => setShowVibration((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
            showVibration
              ? "bg-white text-sky-700 shadow-xs border border-sky-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Toggle Acoustic Wave Overlays"
        >
          <Activity className="w-3.5 h-3.5" />
          Seismic Wave
        </button>

        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
            showLabels
              ? "bg-white text-sky-700 shadow-xs border border-sky-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Toggle Rig Labels"
        >
          <Tag className="w-3.5 h-3.5" />
          Labels
        </button>
      </div>

      {/* View Zoom & Reset Controls */}
      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
          className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Zoom in"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono tabular-nums px-1.5 text-slate-700">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.7))}
          className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onResetView}
          className="p-1 ml-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Reset view"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
