// src/types/index.ts
// Shared TypeScript types used across the app.

export type StationId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
export type ZoneId = 1 | 2 | 3 | 4 | 5;
export type StationStatus = "online" | "offline" | "alert" | "elevated";
export type ZoneStatus = "healthy" | "alert" | "warning";
export type SamplingMode = "normal" | "elevated";
export type Severity = "low" | "medium" | "high";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type DataSource = "simulated" | "live";
export type ArchitectureMode = "4x3" | "6x2"; // Option B: 4 stations × 3 sensors | Option A: 6 stations × 2 sensors

export interface SeverityThresholds {
  low: number;
  medium: number;
}

export interface StationReading {
  stationId: StationId;
  t: string; // ISO timestamp
  flow: number;
  pressure: number;
  vibration: number;
}

export interface AlertFeatures {
  pressureDropRate: number;
  flowDifference: number;
  vibrationRms: number;
  dominantFreq?: number;
  bandEnergy?: number;
}

export interface IngestAlert {
  stationId: StationId;
  t: string;
  confidence: number;
  features: AlertFeatures;
}

export interface IngestPayload {
  deviceId: string;
  sentAt: string;
  readings: StationReading[];
  alerts: IngestAlert[];
  samplingModes: Partial<Record<StationId, SamplingMode>>;
}

// Live station state (from Zustand store)
export interface LiveStation {
  id: StationId;
  name: string;
  status: StationStatus;
  samplingMode: SamplingMode;
  lastSeen: string | null;
  latestFlow: number | null;
  latestPressure: number | null;
  latestVibration: number | null;
}

// Live zone state
export interface LiveZone {
  id: ZoneId;
  name: string;
  status: ZoneStatus;
  stationA: StationId;
  stationB: StationId;
}

// Active alert for display
export interface LiveAlert {
  id: number;
  stationId: StationId;
  zoneId: ZoneId | null;
  ts: string;
  features: AlertFeatures | null;
  confidence: number;
  severity: Severity;
  si: number | null;
  leakRate: number | null;
  recommendedAction: string | null;
  status: AlertStatus;
  repeatCount: number;
}

export interface KpiData {
  activeAlerts: number;
  zonesHealthy: number;
  zonesTotal: number;
  stationsOnline: number;
  stationsTotal: number;
  estimatedWaterLoss: number; // L/min
  lastUpdated: string | null;
}

export interface DbUsage {
  dbSizeBytes: number;
  rawRows: number;
  minuteRows: number;
  alertRows: number;
}

