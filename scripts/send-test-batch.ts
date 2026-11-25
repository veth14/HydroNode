// scripts/send-test-batch.ts
// CLI connectivity verification script to post a live-shaped ESP32 batch to POST /api/ingest.

import type { IngestPayload } from "../src/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const apiKey = process.env.INGEST_API_KEY || "hydronode_secure_ingest_key_2026";
  const now = new Date().toISOString();

  const payload: IngestPayload = {
    deviceId: "esp32-s3-rig-01",
    sentAt: now,
    readings: [
      { stationId: "S1", t: now, flow: 15.0, pressure: 5.0, vibration: 0 },
      { stationId: "S2", t: now, flow: 14.8, pressure: 4.9, vibration: 0 },
      { stationId: "S3", t: now, flow: 14.6, pressure: 4.8, vibration: 0 },
      { stationId: "S4", t: now, flow: 14.4, pressure: 4.7, vibration: 0 },
    ],
    alerts: [],
    samplingModes: {
      S1: "normal",
      S2: "normal",
      S3: "normal",
      S4: "normal",
    },
  };

  console.log(`Posting live connectivity test batch to ${url}/api/ingest...`);

  const response = await fetch(`${url}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed with status ${response.status}:`, errorText);
    process.exit(1);
  }

  const result = await response.json();
  console.log("Success! Server response:", result);
}

main().catch((err) => {
  console.error("Error executing send-test-batch:", err);
  process.exit(1);
});
