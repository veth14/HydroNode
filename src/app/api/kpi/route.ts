// src/app/api/kpi/route.ts
// GET /api/kpi — lightweight O(1) KPI summary for S1–S4 in a single db.batch() round-trip.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { stations, zones, alerts, settings } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { STATION_IDS, ZONE_IDS } from "@/config/rig";
import type { PumpStatus } from "@/types";

const PUMP_STALE_MS = 180_000; // Treat pump as off if no ESP32 update for 3 minutes

export async function GET() {
  const [stationRows, zoneRows, alertStats, pumpRows] = (await db.batch([
    db
      .select({
        status: stations.status,
        lastSeen: stations.lastSeen,
      })
      .from(stations)
      .where(inArray(stations.id, [...STATION_IDS])),
    db
      .select({ status: zones.status })
      .from(zones)
      .where(inArray(zones.id, [...ZONE_IDS])),
    db
      .select({
        activeCount: sql<number>`count(*)::int`,
        estimatedLoss: sql<number>`coalesce(sum(${alerts.leakRate}), 0)::real`,
        activeZones: sql<number>`count(distinct ${alerts.zoneId})::int`,
      })
      .from(alerts)
      .where(eq(alerts.status, "active")),
    db
      .select({ valueJson: settings.valueJson })
      .from(settings)
      .where(eq(settings.key, "pump_status")),
  ] as Parameters<typeof db.batch>[0])) as [
    { status: string; lastSeen: Date | null }[],
    { status: string }[],
    { activeCount: number; estimatedLoss: number; activeZones: number }[],
    { valueJson: unknown }[],
  ];

  const stationsOnline = stationRows.filter(
    (s) =>
      s.lastSeen !== null &&
      (s.status === "online" || s.status === "elevated" || s.status === "alert")
  ).length;

  const zonesTotal = zoneRows.length || ZONE_IDS.length;
  const activeAlertZones = Number(alertStats[0]?.activeZones ?? 0);
  const healthyFromTable = zoneRows.filter((z) => z.status === "healthy").length;
  const zonesHealthy = Math.min(healthyFromTable, Math.max(0, zonesTotal - activeAlertZones));

  let latestSeenMs = 0;
  for (const s of stationRows) {
    if (s.lastSeen) {
      const ms = s.lastSeen.getTime();
      if (ms > latestSeenMs) latestSeenMs = ms;
    }
  }

  const rawPump = pumpRows[0]?.valueJson as
    | { status?: string; updatedAt?: string }
    | undefined;
  const pumpUpdatedMs = rawPump?.updatedAt ? new Date(rawPump.updatedAt).getTime() : 0;
  const pumpFresh =
    stationsOnline > 0 && pumpUpdatedMs > 0 && Date.now() - pumpUpdatedMs < PUMP_STALE_MS;
  const pumpStatus: PumpStatus =
    pumpFresh && (rawPump?.status === "starting" || rawPump?.status === "running")
      ? rawPump.status
      : "off";

  return NextResponse.json(
    {
      activeAlerts: Number(alertStats[0]?.activeCount ?? 0),
      zonesHealthy,
      zonesTotal,
      stationsOnline,
      stationsTotal: stationRows.length || STATION_IDS.length,
      estimatedWaterLoss: Number(Number(alertStats[0]?.estimatedLoss ?? 0).toFixed(2)),
      lastUpdated: latestSeenMs > 0 ? new Date(latestSeenMs).toISOString() : null,
      pumpStatus,
      pumpUpdatedAt: pumpUpdatedMs > 0 ? new Date(pumpUpdatedMs).toISOString() : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
