// src/app/api/readings/route.ts
// GET /api/readings?stationId=S1&range=1h|24h|7d|30d
// Reads from friend's Neon DB (sensor_data) when FRIEND_DATABASE_URL is configured.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute } from "@/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { STATION_IDS, type StationId } from "@/config/rig";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendReadings } from "@/lib/friendSource";

export const dynamic = "force-dynamic";

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const RAW_LIMIT = 720;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const range = searchParams.get("range") ?? "1h";
  const raw = searchParams.get("raw") === "true";

  if (!stationId) {
    return NextResponse.json({ error: "stationId required" }, { status: 400 });
  }

  const headers = { "Cache-Control": "no-store" };

  if (hasFriendDbConfigured()) {
    if (!STATION_IDS.includes(stationId as StationId)) {
      return NextResponse.json([], { headers });
    }
    try {
      const data = await queryFriendReadings(stationId as StationId, range, raw);
      return NextResponse.json(data, { headers });
    } catch (err) {
      console.warn("Friend readings query error:", err);
      return NextResponse.json([], { headers });
    }
  }

  const ms = RANGE_MS[range] ?? RANGE_MS["1h"];
  const since = new Date(Date.now() - ms);

  try {
    if (raw) {
      const rows = await db
        .select()
        .from(readingsRaw)
        .where(and(eq(readingsRaw.stationId, stationId), gte(readingsRaw.ts, since)))
        .orderBy(desc(readingsRaw.ts))
        .limit(RAW_LIMIT);

      rows.reverse();

      return NextResponse.json(
        rows.map((r) => ({
          t: r.ts.toISOString(),
          flow: r.flow,
          pressure: r.pressure,
          vibration: r.vibration,
        })),
        { headers }
      );
    }

    const rows = await db
      .select()
      .from(readingsMinute)
      .where(and(eq(readingsMinute.stationId, stationId), gte(readingsMinute.minuteTs, since)))
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
      })),
      { headers }
    );
  } catch (err) {
    console.warn("Readings query error:", err);
    return NextResponse.json([], { headers });
  }
}
