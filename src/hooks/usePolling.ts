"use client";
// src/hooks/usePolling.ts
// Polls the API every 3 s and updates the Zustand store.

import useSWR from "swr";
import { useEffect } from "react";
import { useHydroStore } from "@/store/hydroStore";
import type { LiveStation, LiveZone, LiveAlert, KpiData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePolling() {
  const { setStations, setZones, setAlerts, setKpi, markBatchReceived } =
    useHydroStore();

  const { data: stations } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 3000,
  });

  const { data: alerts } = useSWR<LiveAlert[]>("/api/alerts", fetcher, {
    refreshInterval: 3000,
  });

  const { data: kpi } = useSWR<KpiData>("/api/kpi", fetcher, {
    refreshInterval: 3000,
  });

  useEffect(() => {
    if (stations) {
      setStations(stations);
      markBatchReceived();
    }
  }, [stations, setStations, markBatchReceived]);

  useEffect(() => {
    if (alerts) setAlerts(alerts);
  }, [alerts, setAlerts]);

  useEffect(() => {
    if (kpi) setKpi(kpi);
  }, [kpi, setKpi]);
}

