"use client";
// src/hooks/useNow.ts
// Shared client clock hook ticking at a fixed interval so relative timestamps ("1m ago", "2m ago")
// stay accurate even while SWR responses remain unchanged during stale telemetry periods.

import { useCallback, useSyncExternalStore } from "react";

let currentNow = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function getSnapshot(): number {
  return currentNow;
}

function getServerSnapshot(): number {
  return 0;
}

export function useNow(intervalMs = 5000): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (listeners.size === 0) {
        currentNow = Date.now();
      }
      listeners.add(onStoreChange);
      if (typeof window !== "undefined" && timer === null) {
        timer = setInterval(() => {
          currentNow = Date.now();
          for (const listener of listeners) {
            listener();
          }
        }, intervalMs);
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    [intervalMs]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
