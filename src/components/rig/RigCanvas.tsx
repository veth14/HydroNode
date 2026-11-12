"use client";
// src/components/rig/RigCanvas.tsx
// Encapsulates RigMap and RigTimeMachine so that high-frequency playback ticks
// update only the rig canvas and never trigger full dashboard page re-renders.

import { useState } from "react";
import { RigMap } from "./RigMap";
import { RigTimeMachine } from "./RigTimeMachine";
import type { PlaybackFrame } from "@/lib/incidentPlayback";
import type { StationId, ZoneId, TestPoint as TestPointType } from "@/config/rig";

interface RigCanvasProps {
  selectedStationId?: StationId | null;
  selectedZoneId?: ZoneId | null;
  onSelectStation?: (id: StationId) => void;
  onSelectZone?: (id: ZoneId) => void;
  onInjectLeak?: (tp: TestPointType) => void;
  isPlaybackMode: boolean;
  playbackScenarioId: string;
  onExitPlayback: () => void;
}

export function RigCanvas({
  selectedStationId,
  selectedZoneId,
  onSelectStation,
  onSelectZone,
  onInjectLeak,
  isPlaybackMode,
  playbackScenarioId,
  onExitPlayback,
}: RigCanvasProps) {
  const [playbackFrame, setPlaybackFrame] = useState<PlaybackFrame | null>(null);

  return (
    <div className="space-y-4">
      {/* Time Machine Playback Console */}
      {isPlaybackMode && (
        <RigTimeMachine
          initialScenarioId={playbackScenarioId}
          onFrameUpdate={setPlaybackFrame}
          onExit={onExitPlayback}
        />
      )}

      {/* Hero Physical Rig SVG */}
      <RigMap
        selectedStationId={selectedStationId}
        selectedZoneId={selectedZoneId}
        onSelectStation={onSelectStation}
        onSelectZone={onSelectZone}
        onInjectLeak={onInjectLeak}
        isPlaybackMode={isPlaybackMode}
        playbackStations={playbackFrame?.stations}
        playbackAlerts={playbackFrame?.alerts}
        playbackInjectedLeaks={playbackFrame?.injectedLeaks}
      />
    </div>
  );
}
