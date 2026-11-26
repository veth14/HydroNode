// src/app/api/stations/route.ts
// GET /api/stations — latest per-station flow & pressure snapshot for S1–S4.
// Reads from friend's Neon DB (sensor_data) when FRIEND_DATABASE_URL is configured.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations } from "@/db/schema";
import { asc, inArray } from "drizzle-orm";
import { STATION_IDS } from "@/config/rig";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendStations } from "@/lib/friendSource";
import type { LiveStation } from "@/types";

export const dynamic = "force-dynamic";

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
  if (hasFriendDbConfigured()) {
    try {
      const result = await queryFriendStations();
      cachedStations = result;
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.warn("Friend DB lagged, returning cached stations:", err);
      return NextResponse.json(cachedStations, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  try {
    const stationRows = await db
      .select()
      .from(stations)
      .where(inArray(stations.id, [...STATION_IDS]))
      .orderBy(asc(stations.id));

    if (!stationRows || stationRows.length === 0) {
      return NextResponse.json(cachedStations, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const result: LiveStation[] = stationRows.map((s) => ({
      id: s.id as LiveStation["id"],
      name: s.name,
      status: s.status as LiveStation["status"],
      samplingMode: s.samplingMode as LiveStation["samplingMode"],
      lastSeen: s.lastSeen?.toISOString() ?? null,
      latestFlow: s.latestFlow ?? null,
      latestPressure: s.latestPressure ?? null,
      latestVibration: s.latestVibration ?? null,
    }));

    cachedStations = result;
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn("Neon connection lagged, returning cached stations:", err);
    return NextResponse.json(cachedStations, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
