// src/app/api/kpi/route.ts
// GET /api/kpi — returns live KPI summary for the 4-station, 4-zone rig.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations, zones, alerts, readingsRaw } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { STATION_IDS, ZONE_IDS } from "@/config/rig";

export async function GET() {
  const [stationRows, zoneRows, activeAlertRows] = await Promise.all([
    db.select().from(stations).where(inArray(stations.id, [...STATION_IDS])),
    db.select().from(zones).where(inArray(zones.id, [...ZONE_IDS])),
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
    .where(inArray(readingsRaw.stationId, [...STATION_IDS]))
    .orderBy(desc(readingsRaw.ts))
    .limit(1);

  return NextResponse.json({
    activeAlerts: activeAlertRows.length,
    zonesHealthy,
    zonesTotal: zoneRows.length || ZONE_IDS.length,
    stationsOnline,
    stationsTotal: stationRows.length || STATION_IDS.length,
    estimatedWaterLoss: parseFloat(estimatedLoss.toFixed(2)),
    lastUpdated: lastBatch[0]?.ts?.toISOString() ?? null,
  });
}
