// src/app/api/db-usage/route.ts
// GET /api/db-usage – returns row counts and DB size for the Settings page.
// Uses db.batch() to pipeline all 4 queries into a single Neon HTTP round-trip.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute, alerts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const [rawCount, minCount, alertCount, dbSize] = await db.batch([
    db.select({ count: sql<number>`count(*)::int` }).from(readingsRaw),
    db.select({ count: sql<number>`count(*)::int` }).from(readingsMinute),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts),
    db.execute(sql`SELECT pg_database_size(current_database())::bigint AS size`),
  ] as Parameters<typeof db.batch>[0]);

  return NextResponse.json({
    rawRows: Number((rawCount as { count: number }[])[0]?.count ?? 0),
    minuteRows: Number((minCount as { count: number }[])[0]?.count ?? 0),
    alertRows: Number((alertCount as { count: number }[])[0]?.count ?? 0),
    dbSizeBytes: Number(
      ((dbSize as { rows: { size: string | number }[] }).rows[0] as { size: string | number })?.size ?? 0
    ),
  }, { headers: { "Cache-Control": "no-store" } });
}
