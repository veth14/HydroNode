"use client";
// src/hooks/useSettings.ts
// Shared SWR hook for live database settings (/api/settings) so every chart and page
// reads calibrated Q0/P0 baselines and thresholds directly from PostgreSQL.

import useSWR from "swr";
import type { StationId } from "@/config/rig";

export interface BaselineSetting {
  q0: number;
  p0: number;
}

export interface SettingsMap {
  baseline_S1?: BaselineSetting;
  baseline_S2?: BaselineSetting;
  baseline_S3?: BaselineSetting;
  baseline_S4?: BaselineSetting;
  severity_thresholds?: { low: number; medium: number };
  repeat_alert_window_min?: { value: number };
  units?: { flow: string; pressure: string; vibration: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSettings() {
  const { data, mutate, isLoading } = useSWR<SettingsMap>("/api/settings", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const getBaseline = (stationId: StationId): BaselineSetting | null => {
    const entry = data?.[`baseline_${stationId}`];
    if (!entry || typeof entry.q0 !== "number" || typeof entry.p0 !== "number") {
      return null;
    }
    return entry;
  };

  return {
    settings: data,
    isLoading,
    mutateSettings: mutate,
    getBaseline,
  };
}
