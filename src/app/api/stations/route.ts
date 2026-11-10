// src/app/api/stations/route.ts
// GET /api/stations — returns all station rows with latest reading snapshot.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations, readingsRaw } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET() {
  const stationRows = await db.select().from(stations);

  // Fetch latest reading per station
  const latestMap: Record<string, { flow: number; pressure: number; vibration: number }> = {};
  for (const s of stationRows) {
    const row = await db
      .select()
      .from(readingsRaw)
      .where(eq(readingsRaw.stationId, s.id))
      .orderBy(desc(readingsRaw.ts))
      .limit(1);
    if (row[0]) {
      latestMap[s.id] = {
        flow: row[0].flow,
        pressure: row[0].pressure,
        vibration: row[0].vibration,
      };
    }
  }

  const result = stationRows.map((s) => ({
    ...s,
    lastSeen: s.lastSeen?.toISOString() ?? null,
    latestFlow: latestMap[s.id]?.flow ?? null,
    latestPressure: latestMap[s.id]?.pressure ?? null,
    latestVibration: latestMap[s.id]?.vibration ?? null,
  }));

  return NextResponse.json(result);
}

