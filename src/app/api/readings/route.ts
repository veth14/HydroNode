// src/app/api/readings/route.ts
// GET /api/readings?stationId=S1&range=1h|24h|7d|30d
// Returns readings_minute aggregates for the station detail charts.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const range = searchParams.get("range") ?? "1h";
  const raw = searchParams.get("raw") === "true";

  if (!stationId) {
    return NextResponse.json({ error: "stationId required" }, { status: 400 });
  }

  const ms = RANGE_MS[range] ?? RANGE_MS["1h"];
  const since = new Date(Date.now() - ms);

  if (raw) {
    // Raw readings — only 1h supported (storage budget)
    const rows = await db
      .select()
      .from(readingsRaw)
      .where(
        and(eq(readingsRaw.stationId, stationId), gte(readingsRaw.ts, since))
      )
      .orderBy(readingsRaw.ts)
      .limit(2000);

    return NextResponse.json(
      rows.map((r) => ({
        t: r.ts.toISOString(),
        flow: r.flow,
        pressure: r.pressure,
        vibration: r.vibration,
      }))
    );
  }

  // Minute aggregates
  const rows = await db
    .select()
    .from(readingsMinute)
    .where(
      and(
        eq(readingsMinute.stationId, stationId),
        gte(readingsMinute.minuteTs, since)
      )
    )
    .orderBy(readingsMinute.minuteTs)
    .limit(5000);

  return NextResponse.json(
    rows.map((r) => ({
      t: r.minuteTs.toISOString(),
      flowAvg: r.flowAvg,
      flowMin: r.flowMin,
      flowMax: r.flowMax,
      pressureAvg: r.pressureAvg,
      pressureMin: r.pressureMin,
      pressureMax: r.pressureMax,
      vibAvg: r.vibAvg,
      vibMax: r.vibMax,
      sampleCount: r.sampleCount,
    }))
  );
}

