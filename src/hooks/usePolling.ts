"use client";
// src/hooks/usePolling.ts
// Polls the API every 3 s and updates the Zustand store using atomic selectors.
// Plays /alert.mp3 audible siren on active leak detection.

import useSWR from "swr";
import { useEffect, useRef } from "react";
import { useHydroStore } from "@/store/hydroStore";
import { playAlertSound, unlockAudio } from "@/lib/sound";
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
      window.removeEventListener("click", handleInteract);
      window.removeEventListener("keydown", handleInteract);
    };
    window.addEventListener("click", handleInteract, { once: true });
    window.addEventListener("keydown", handleInteract, { once: true });
    return () => {
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

  // Keep track of active alert IDs to detect newly arrived alerts
  const seenActiveAlertIds = useRef<Set<number>>(new Set());
  const lastSoundPlayedAt = useRef<number>(0);

  useEffect(() => {
    if (alerts) {
      setAlerts(alerts);
      const activeAlerts = alerts.filter((a) => a.status === "active");

      // Check if any active alert is new
      const hasNewAlert = activeAlerts.some((a) => !seenActiveAlertIds.current.has(a.id));
      const now = Date.now();

      // If a brand new alert arrived OR an active alert exists and hasn't chimed in the last 20 seconds
      if (activeAlerts.length > 0) {
        if (hasNewAlert || now - lastSoundPlayedAt.current > 20000) {
          playAlertSound();
          lastSoundPlayedAt.current = now;
        }
      }

      // Update seen set
      seenActiveAlertIds.current = new Set(activeAlerts.map((a) => a.id));
    }
  }, [alerts, setAlerts]);

  useEffect(() => {
    if (kpi) setKpi(kpi);
  }, [kpi, setKpi]);
}

