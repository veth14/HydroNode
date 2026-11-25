// src/store/hydroStore.ts
// Zustand store for HydroNode client state.
// Live-only mode — no simulation injection.
// 4 zones, 4 stations (S1–S4), 8 sensors (flow + pressure, no vibration yet).

import { create } from "zustand";
import { setAlarmActive } from "@/lib/sound";
import type {
  LiveStation,
  LiveZone,
  LiveAlert,
  KpiData,
} from "@/types";

interface HydroState {
  // Data
  stations: LiveStation[];
  zones: LiveZone[];
  alerts: LiveAlert[];
  kpi: KpiData | null;
  lastBatchTs: number | null;

  // Actions
  setStations: (stations: LiveStation[]) => void;
  setZones: (zones: LiveZone[]) => void;
  setAlerts: (alerts: LiveAlert[]) => void;
  setKpi: (kpi: KpiData) => void;
  markBatchReceived: () => void;
}

export const useHydroStore = create<HydroState>((set) => ({
  stations: [],
  zones: [],
  alerts: [],
  kpi: null,
  lastBatchTs: null,

  setStations: (stations) => set({ stations }),
  setZones: (zones) => set({ zones }),
  setAlerts: (alerts) => {
    // Auto-activate alarm if any alert is active
    const hasActive = alerts.some((a) => a.status === "active");
    setAlarmActive(hasActive);
    set({ alerts });
  },
  setKpi: (kpi) => set({ kpi }),
  markBatchReceived: () => set({ lastBatchTs: Date.now() }),
}));
