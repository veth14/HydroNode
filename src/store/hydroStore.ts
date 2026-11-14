// src/store/hydroStore.ts
// Zustand store for HydroNode client state.
// All live sensor data flows through here.

import { create } from "zustand";
import { playAlertSound, stopAlertSound } from "@/lib/sound";
import type {
  LiveStation,
  LiveZone,
  LiveAlert,
  KpiData,
  StationId,
  ZoneId,
  Severity,
  DataSource,
  ArchitectureMode,
} from "@/types";

interface LeakEffect {
  zoneId: ZoneId;
  severity: Severity;
  si: number;
  leakRate: number;
  confidence: number;
  recommendedAction: string;
}

interface HydroState {
  // Data
  stations: LiveStation[];
  zones: LiveZone[];
  alerts: LiveAlert[];
  kpi: KpiData | null;
  lastBatchTs: number | null; // epoch ms of last received batch
  dataSource: DataSource;
  architectureMode: ArchitectureMode;
  activeLeaks: LeakEffect[];

  // Simulation control
  simulationActive: boolean;
  injectedLeaks: ZoneId[]; // zones currently with injected leak

  // Actions
  setStations: (stations: LiveStation[]) => void;
  setZones: (zones: LiveZone[]) => void;
  setAlerts: (alerts: LiveAlert[]) => void;
  setKpi: (kpi: KpiData) => void;
  markBatchReceived: () => void;
  setDataSource: (ds: DataSource) => void;
  setArchitectureMode: (mode: ArchitectureMode) => void;
  setActiveLeaks: (leaks: LeakEffect[]) => void;
  setSimulationActive: (active: boolean) => void;
  injectLeak: (zoneId: ZoneId) => void;
  clearLeak: (zoneId: ZoneId) => void;
  clearAllLeaks: () => void;
}

export const useHydroStore = create<HydroState>((set) => ({
  stations: [],
  zones: [],
  alerts: [],
  kpi: null,
  lastBatchTs: null,
  dataSource: "simulated",
  architectureMode: "4x3", // Default to Option B (4 Stations × 3 Sensors = 12 Transducers)
  activeLeaks: [],
  simulationActive: false,
  injectedLeaks: [],

  setStations: (stations) => set({ stations }),
  setZones: (zones) => set({ zones }),
  setAlerts: (alerts) => set({ alerts }),
  setKpi: (kpi) => set({ kpi }),
  markBatchReceived: () => set({ lastBatchTs: Date.now() }),
  setDataSource: (dataSource) => set({ dataSource }),
  setArchitectureMode: (architectureMode) => set({ architectureMode }),
  setActiveLeaks: (activeLeaks) => set({ activeLeaks }),
  setSimulationActive: (simulationActive) => set({ simulationActive }),
  injectLeak: (zoneId) => {
    playAlertSound();
    set((s) => ({
      injectedLeaks: s.injectedLeaks.includes(zoneId)
        ? s.injectedLeaks
        : [...s.injectedLeaks, zoneId],
    }));
  },
  clearLeak: (zoneId) =>
    set((s) => ({ injectedLeaks: s.injectedLeaks.filter((z) => z !== zoneId) })),
  clearAllLeaks: () => {
    stopAlertSound();
    set({ injectedLeaks: [] });
  },
}));

