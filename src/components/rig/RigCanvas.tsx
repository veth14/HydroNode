"use client";
// src/components/rig/RigCanvas.tsx
// Wraps the 3D pipeline canvas (GLB viewer via React Three Fiber).
// Live-only mode: no simulation injection, no time machine playback.

import type { StationId, ZoneId } from "@/config/rig";
import { Pipeline3DCanvas } from "./Pipeline3DCanvas";

interface RigCanvasProps {
  selectedStationId?: StationId | null;
  selectedZoneId?: ZoneId | null;
  onSelectStation?: (id: StationId | null) => void;
}

export function RigCanvas({
  selectedStationId,
  selectedZoneId,
  onSelectStation,
}: RigCanvasProps) {
  return (
    <Pipeline3DCanvas
      selectedStationId={selectedStationId}
      selectedZoneId={selectedZoneId}
      onSelectStation={onSelectStation}
    />
  );
}
