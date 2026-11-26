"use client";
// src/components/rig/RigCanvas.tsx
// Wraps the 3D pipeline canvas (GLB viewer via React Three Fiber).
// Passes live telemetry or Time Machine playback overrides down to the 3D viewport.

import type { StationId, ZoneId } from "@/config/rig";
import type { LiveAlert } from "@/types";
import { Pipeline3DCanvas } from "./Pipeline3DCanvas";

interface RigCanvasProps {
  selectedStationId?: StationId | null;
  selectedZoneId?: ZoneId | null;
  onSelectStation?: (id: StationId | null) => void;
  overrideFlow?: [number, number, number, number] | null;
  overridePressure?: [number, number, number, number] | null;
  overridePumpOn?: boolean | null;
  overrideAlerts?: LiveAlert[] | null;
  isPlaybackMode?: boolean;
  playbackLabel?: string | null;
}

export function RigCanvas({
  selectedStationId,
  selectedZoneId,
  onSelectStation,
  overrideFlow,
  overridePressure,
  overridePumpOn,
  overrideAlerts,
  isPlaybackMode,
  playbackLabel,
}: RigCanvasProps) {
  return (
    <Pipeline3DCanvas
      selectedStationId={selectedStationId}
      selectedZoneId={selectedZoneId}
      onSelectStation={onSelectStation}
      overrideFlow={overrideFlow}
      overridePressure={overridePressure}
      overridePumpOn={overridePumpOn}
      overrideAlerts={overrideAlerts}
      isPlaybackMode={isPlaybackMode}
      playbackLabel={playbackLabel}
    />
  );
}
