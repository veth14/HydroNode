// src/app/api/alerts/route.ts
// GET /api/alerts — returns all alerts (filterable by status/severity/zone).
// DELETE /api/alerts — resolves all active alerts and normalizes station/zone statuses.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, stations, zones } from "@/db/schema";
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const purge = searchParams.get("purge") === "true";

    if (purge) {
      await db.delete(alerts);
    } else {
      // Mark all active alerts as resolved
      await db
        .update(alerts)
        .set({ status: "resolved" })
        .where(eq(alerts.status, "active"));
    }

    // Reset all stations to 'online' and 'normal' sampling
    await db
      .update(stations)
      .set({ status: "online", samplingMode: "normal" });

    // Reset all zones to 'healthy'
    await db
      .update(zones)
      .set({ status: "healthy" });

    return NextResponse.json({
      ok: true,
      message: purge
        ? "All alerts permanently purged and pipeline normalized."
        : "All active alerts marked resolved and pipeline normalized.",
    });
  } catch (err: unknown) {
    console.error("Error resetting alerts:", err);
    return NextResponse.json(
      { error: "Failed to reset alerts", details: String(err) },
      { status: 500 }
    );
  }
}


