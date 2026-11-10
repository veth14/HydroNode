// src/app/api/kpi/route.ts
// GET /api/kpi — returns KPI summary for the dashboard.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations, zones, alerts, readingsRaw } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const [stationRows, zoneRows, activeAlertRows] = await Promise.all([
    db.select().from(stations),
    db.select().from(zones),
    db.select().from(alerts).where(eq(alerts.status, "active")),
  ]);

  const stationsOnline = stationRows.filter(
    (s) => s.status === "online" || s.status === "elevated" || s.status === "alert"
  ).length;

  const zonesHealthy = zoneRows.filter((z) => z.status === "healthy").length;

  const estimatedLoss = activeAlertRows.reduce(
    (sum, a) => sum + (a.leakRate ?? 0),
    0
  );

  const lastBatch = await db
    .select({ ts: readingsRaw.ts })
    .from(readingsRaw)
    .orderBy(desc(readingsRaw.ts))
    .limit(1);

  return NextResponse.json({
    activeAlerts: activeAlertRows.length,
    zonesHealthy,
    zonesTotal: zoneRows.length,
    stationsOnline,
    stationsTotal: stationRows.length,
    estimatedWaterLoss: parseFloat(estimatedLoss.toFixed(2)),
    lastUpdated: lastBatch[0]?.ts?.toISOString() ?? null,
  });
}

