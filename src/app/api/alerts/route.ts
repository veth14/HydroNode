// src/app/api/alerts/route.ts
// GET /api/alerts – returns anomaly/leak events from friend's sensor_data (when configured)
// or legacy HydroNode alerts table.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, stations, zones } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendAlerts } from "@/lib/friendSource";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const zoneId = searchParams.get("zoneId");

  if (hasFriendDbConfigured()) {
    try {
      const friendAlerts = await queryFriendAlerts({ status, severity, zoneId });
      return NextResponse.json(friendAlerts, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error("[/api/alerts] Friend DB error:", err);
      return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
    }
  }

  const conditions = [];
  if (status) conditions.push(eq(alerts.status, status));
  if (severity) conditions.push(eq(alerts.severity, severity));
  if (zoneId) conditions.push(eq(alerts.zoneId, parseInt(zoneId)));

  const rows = await db
    .select()
    .from(alerts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(alerts.ts))
    .limit(100);

  return NextResponse.json(
    rows.map((a) => ({
      ...a,
      ts: a.ts.toISOString(),
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(req: NextRequest) {
  if (hasFriendDbConfigured()) {
    // Source DB sensor_data is read-only and owned by the ESP32/Flask uploader
    return NextResponse.json({
      ok: true,
      readOnlySource: true,
      message: "Source database sensor_data is read-only; active status clears automatically when readings return to Normal.",
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const purge = searchParams.get("purge") === "true";

    if (purge) {
      await db.delete(alerts);
    } else {
      await db
        .update(alerts)
        .set({ status: "resolved" })
        .where(eq(alerts.status, "active"));
    }

    await Promise.all([
      db.update(stations).set({ status: "online", samplingMode: "normal" }),
      db.update(zones).set({ status: "healthy" }),
    ]);

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
