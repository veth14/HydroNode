"use client";
// src/hooks/usePolling.ts
// Polls backend endpoints and synchronizes Zustand store.
// Tuned for the friend's ~3s ESP32 ingest cadence into sensor_data:
//   stations + kpi + alerts -> 5s refresh (single fast Neon HTTP query each).
// Live-only mode: no simulation injection.

import useSWR from "swr";
import { useEffect } from "react";
import { useHydroStore } from "@/store/hydroStore";
import { unlockAudio } from "@/lib/sound";
import type { LiveStation, LiveAlert, KpiData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePolling() {
  const setStations = useHydroStore((s) => s.setStations);
  const setAlerts   = useHydroStore((s) => s.setAlerts);
  const setKpi      = useHydroStore((s) => s.setKpi);
  const markBatchReceived = useHydroStore((s) => s.markBatchReceived);

  // Unlock audio on first user gesture
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleInteract = () => unlockAudio();
    window.addEventListener("pointerdown", handleInteract, { passive: true });
    window.addEventListener("click", handleInteract, { passive: true });
    window.addEventListener("keydown", handleInteract, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleInteract);
      window.removeEventListener("click", handleInteract);
      window.removeEventListener("keydown", handleInteract);
    };
  }, []);

  const { data: stations } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const { data: alerts } = useSWR<LiveAlert[]>("/api/alerts", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  const { data: kpi } = useSWR<KpiData>("/api/kpi", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  useEffect(() => {
    if (Array.isArray(stations) && stations.length > 0) {
      setStations(stations);
      markBatchReceived();
    }
  }, [stations, setStations, markBatchReceived]);

  useEffect(() => {
    if (Array.isArray(alerts)) setAlerts(alerts);
  }, [alerts, setAlerts]);

  useEffect(() => {
    if (kpi && "activeAlerts" in kpi) setKpi(kpi);
  }, [kpi, setKpi]);
}
