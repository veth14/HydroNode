"use client";
// src/hooks/usePolling.ts
// Polls the API and updates Zustand store.
// Intervals tuned for 30s ESP32 ingest cycle:
//   stations + kpi → 15s (no need to poll faster than half the ingest interval)
//   alerts         → 8s  (alert state can change without a full ingest cycle)
// Live-only mode: no simulation injection, alarm driven purely by DB alerts.

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
    refreshInterval: 15000,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const { data: alerts } = useSWR<LiveAlert[]>("/api/alerts", fetcher, {
    refreshInterval: 8000,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const { data: kpi } = useSWR<KpiData>("/api/kpi", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  useEffect(() => {
    if (stations && stations.length > 0) {
      setStations(stations);
      markBatchReceived();
    }
  }, [stations, setStations, markBatchReceived]);

  useEffect(() => {
    if (alerts) setAlerts(alerts); // alarm activation handled inside setAlerts
  }, [alerts, setAlerts]);

  useEffect(() => {
    if (kpi) setKpi(kpi);
  }, [kpi, setKpi]);
}
