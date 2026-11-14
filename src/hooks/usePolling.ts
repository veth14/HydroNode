"use client";
// src/hooks/usePolling.ts
// Polls the API every 3 s and updates the Zustand store using atomic selectors.
// Plays /alert.mp3 audible siren on active leak detection.

import useSWR from "swr";
import { useEffect } from "react";
import { useHydroStore } from "@/store/hydroStore";
import { setAlarmActive, unlockAudio } from "@/lib/sound";
import type { LiveStation, LiveZone, LiveAlert, KpiData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePolling() {
  const setStations = useHydroStore((s) => s.setStations);
  const setAlerts = useHydroStore((s) => s.setAlerts);
  const setKpi = useHydroStore((s) => s.setKpi);
  const markBatchReceived = useHydroStore((s) => s.markBatchReceived);

  // Attach global user interaction listener to unlock audio playback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleInteract = () => {
      unlockAudio();
    };
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
    if (alerts) {
      setAlerts(alerts);
      const activeAlerts = alerts.filter((a) => a.status === "active");
      const injectedLeaks = useHydroStore.getState().injectedLeaks;
      const hasAnyLeak = activeAlerts.length > 0 || injectedLeaks.length > 0;
      setAlarmActive(hasAnyLeak);
    }
  }, [alerts, setAlerts]);

  useEffect(() => {
    if (kpi) setKpi(kpi);
  }, [kpi, setKpi]);
}

