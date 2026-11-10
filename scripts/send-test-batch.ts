// scripts/send-test-batch.ts
// Test script to send a sample batch to POST /api/ingest

import { generateBatch } from "../src/services/simulator";

async function main() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const apiKey = process.env.INGEST_API_KEY || "hydronode_secure_ingest_key_2026";

  console.log(`Sending sample batch to ${url}/api/ingest...`);

  // Generate a realistic batch with a simulated medium leak on Zone 2
  const batch = generateBatch([{ zoneId: 2, magnitude: "medium" }]);

  console.log(`Generated batch: ${batch.readings.length} readings, ${batch.alerts.length} alert(s)`);

  const response = await fetch(`${url}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(batch),
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

