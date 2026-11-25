// src/app/api/stations/route.ts
// GET /api/stations — returns S1–S4 station rows with latest live reading snapshot.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations, readingsRaw } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { STATION_IDS } from "@/config/rig";

import type { LiveStation } from "@/types";

// Fallback skeleton when DB is unreachable (live mode — no fake telemetry numbers)
let cachedStations: LiveStation[] = STATION_IDS.map((id) => ({
  id,
  name: `Station ${id}`,
  status: "offline",
  samplingMode: "normal",
  lastSeen: null,
  latestFlow: null,
  latestPressure: null,
  latestVibration: null,
}));

export async function GET() {
  try {
    const stationRows = await db
      .select()
      .from(stations)
      .where(inArray(stations.id, [...STATION_IDS]));

    if (!stationRows || stationRows.length === 0) {
      return NextResponse.json(cachedStations);
    }

    const latestPromises = stationRows.map(async (s) => {
      try {
        const row = await db
          .select()
          .from(readingsRaw)
          .where(eq(readingsRaw.stationId, s.id))
          .orderBy(desc(readingsRaw.ts))
          .limit(1);
        return {
          id: s.id,
          flow: row[0]?.flow ?? null,
          pressure: row[0]?.pressure ?? null,
          vibration: row[0]?.vibration ?? null,
        };
      } catch {
        return { id: s.id, flow: null, pressure: null, vibration: null };
      }
    });

    const latestResults = await Promise.all(latestPromises);
    const latestMap = Object.fromEntries(latestResults.map((r) => [r.id, r]));

    const result: LiveStation[] = stationRows
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((s) => ({
        id: s.id as LiveStation["id"],
        name: s.name,
        status: s.status as LiveStation["status"],
        samplingMode: s.samplingMode as LiveStation["samplingMode"],
        lastSeen: s.lastSeen?.toISOString() ?? null,
        latestFlow: latestMap[s.id]?.flow ?? null,
        latestPressure: latestMap[s.id]?.pressure ?? null,
        latestVibration: latestMap[s.id]?.vibration ?? null,
      }));

    cachedStations = result;
    return NextResponse.json(result);
  } catch (err) {
    console.warn("Neon connection lagged, returning cached stations:", err);
    return NextResponse.json(cachedStations);
  }
}
