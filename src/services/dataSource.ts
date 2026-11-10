// src/services/dataSource.ts
// Abstract data source: hides whether data comes from the real ESP32 (via
// polling the DB) or from the simulator.  The UI uses this service, never
// caring about the underlying source.

import { generateBatch, type LeakScenario } from "./simulator";
import type { IngestPayload, ZoneId } from "@/types";

/** Post a batch to /api/ingest (used by both live polling and simulator). */
export async function postBatch(payload: IngestPayload): Promise<void> {
  const key = process.env.NEXT_PUBLIC_INGEST_API_KEY ?? "";
  await fetch("/api/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify(payload),
  });
}

/** Generate and immediately post a simulated batch. */
export async function sendSimulatedBatch(
  leaks: LeakScenario[] = []
): Promise<void> {
  const batch = generateBatch(leaks);
  await postBatch(batch);
}

