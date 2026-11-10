"use client";
// src/hooks/usePolling.ts
// Polls the API every 3 s and updates the Zustand store using atomic selectors.

import useSWR from "swr";
import { useEffect } from "react";
import { useHydroStore } from "@/store/hydroStore";
import type { LiveStation, LiveZone, LiveAlert, KpiData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePolling() {
  const setStations = useHydroStore((s) => s.setStations);
  const setAlerts = useHydroStore((s) => s.setAlerts);
  const setKpi = useHydroStore((s) => s.setKpi);
  const markBatchReceived = useHydroStore((s) => s.markBatchReceived);

  const { data: stations } = useSWR<LiveStation[]>("/api/stations", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });

  const { data: alerts } = useSWR<LiveAlert[]>("/api/alerts", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });

  const { data: kpi } = useSWR<KpiData>("/api/kpi", fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (stations && stations.length > 0) {
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
