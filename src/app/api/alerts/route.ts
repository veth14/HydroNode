// src/app/api/alerts/route.ts
// GET /api/alerts — returns all alerts (filterable by status/severity/zone).
// PATCH /api/alerts/[id] — acknowledge or resolve an alert.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts } from "@/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const zoneId = searchParams.get("zoneId");

  const conditions = [];
  if (status) conditions.push(eq(alerts.status, status));
  if (severity) conditions.push(eq(alerts.severity, severity));
  if (zoneId) conditions.push(eq(alerts.zoneId, parseInt(zoneId)));

  const rows = await db
    .select()
    .from(alerts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(alerts.ts))
    .limit(200);

  return NextResponse.json(
    rows.map((a) => ({
      ...a,
      ts: a.ts.toISOString(),
    }))
  );
}

