// src/app/api/db-usage/route.ts
// GET /api/db-usage — returns row counts and DB size for the Settings page.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute, alerts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const [rawCount, minCount, alertCount, dbSize] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(readingsRaw),
    db.select({ count: sql<number>`count(*)` }).from(readingsMinute),
    db.select({ count: sql<number>`count(*)` }).from(alerts),
    db.execute(sql`SELECT pg_database_size(current_database()) AS size`),
  ]);

  return NextResponse.json({
    rawRows: Number(rawCount[0]?.count ?? 0),
    minuteRows: Number(minCount[0]?.count ?? 0),
    alertRows: Number(alertCount[0]?.count ?? 0),
    dbSizeBytes: Number((dbSize.rows[0] as { size: string })?.size ?? 0),
  });
}

