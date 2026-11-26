// src/app/api/db-usage/route.ts
// GET /api/db-usage – returns row counts and DB size for the Settings page.
// Reads from friend's Neon DB (sensor_data) when FRIEND_DATABASE_URL is configured.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute, alerts } from "@/db/schema";
import { sql } from "drizzle-orm";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendDbUsage } from "@/lib/friendSource";

export const dynamic = "force-dynamic";

export async function GET() {
  if (hasFriendDbConfigured()) {
    try {
      const usage = await queryFriendDbUsage();
      return NextResponse.json(usage, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("[/api/db-usage] Friend DB error:", err);
      return NextResponse.json(
        { rawRows: 0, minuteRows: 0, alertRows: 0, dbSizeBytes: 0 },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  const [rawCount, minCount, alertCount, dbSize] = await db.batch([
    db.select({ count: sql<number>`count(*)::int` }).from(readingsRaw),
    db.select({ count: sql<number>`count(*)::int` }).from(readingsMinute),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts),
    db.execute(sql`SELECT pg_database_size(current_database())::bigint AS size`),
  ] as Parameters<typeof db.batch>[0]);

  return NextResponse.json(
    {
      rawRows: Number((rawCount as { count: number }[])[0]?.count ?? 0),
      minuteRows: Number((minCount as { count: number }[])[0]?.count ?? 0),
      alertRows: Number((alertCount as { count: number }[])[0]?.count ?? 0),
      dbSizeBytes: Number(
        ((dbSize as { rows: { size: string | number }[] }).rows[0] as { size: string | number })
          ?.size ?? 0
      ),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
