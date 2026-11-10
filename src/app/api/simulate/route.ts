// src/app/api/simulate/route.ts
// POST /api/simulate — triggers a simulated batch from the server side.
// Body: { leaks: [{zoneId, magnitude}], extras: [{type}] }

import { NextRequest, NextResponse } from "next/server";
import { generateBatch } from "@/services/simulator";
import { z } from "zod";

const SimSchema = z.object({
  leaks: z
    .array(
      z.object({
        zoneId: z.number().int().min(1).max(5),
        magnitude: z.enum(["small", "medium", "large"]),
      })
    )
    .default([]),
  extras: z
    .array(z.object({ type: z.enum(["demand_spike", "pump_transient"]) }))
    .default([]),
});

export async function POST(req: NextRequest) {
  const body = SimSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const batch = generateBatch(
    body.data.leaks.map((l) => ({
      zoneId: l.zoneId as 1 | 2 | 3 | 4 | 5,
      magnitude: l.magnitude,
    })),
    body.data.extras
  );

  // Self-post to /api/ingest
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  const ingestRes = await fetch(`${baseUrl}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.INGEST_API_KEY ?? "",
    },
    body: JSON.stringify(batch),
  });

  const ingestData = await ingestRes.json();
  return NextResponse.json({ ok: true, ingest: ingestData, batchSentAt: batch.sentAt });
}

