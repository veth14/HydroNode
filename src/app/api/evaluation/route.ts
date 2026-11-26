// src/app/api/evaluation/route.ts
// GET /api/evaluation — real-time DB aggregation for the Rig Evaluation page.
// Reads from friend's Neon DB (sensor_data) when FRIEND_DATABASE_URL is configured.

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, readingsMinute, readingsRaw, stations, zones } from "@/db/schema";
import { asc, desc, inArray, sql } from "drizzle-orm";
import { STATION_IDS, ZONE_IDS } from "@/config/rig";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendEvaluation } from "@/lib/friendSource";

export const dynamic = "force-dynamic";

export async function GET() {
  if (hasFriendDbConfigured()) {
    try {
      const payload = await queryFriendEvaluation();
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("[/api/evaluation] Friend DB error:", err);
      return NextResponse.json(
        { error: "Failed to load evaluation metrics from source database" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  try {
    const [stationRows, zoneRows, alertStats, severityStats, zoneAlertStats, stationTelemetryStats, recentAlerts, rawCountRows] =
      (await db.batch([
        db
          .select()
          .from(stations)
          .where(inArray(stations.id, [...STATION_IDS]))
          .orderBy(asc(stations.id)),
        db
          .select()
          .from(zones)
          .where(inArray(zones.id, [...ZONE_IDS]))
          .orderBy(asc(zones.id)),
        db
          .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${alerts.status} = 'active')::int`,
            acknowledged: sql<number>`count(*) filter (where ${alerts.status} = 'acknowledged')::int`,
            resolved: sql<number>`count(*) filter (where ${alerts.status} = 'resolved')::int`,
            avgConfidence: sql<number | null>`avg(${alerts.confidence})::real`,
            avgSi: sql<number | null>`avg(${alerts.si})::real`,
            avgLeakRate: sql<number | null>`avg(${alerts.leakRate})::real`,
          })
          .from(alerts),
        db
          .select({
            severity: alerts.severity,
            count: sql<number>`count(*)::int`,
          })
          .from(alerts)
          .groupBy(alerts.severity),
        db
          .select({
            zoneId: alerts.zoneId,
            totalAlerts: sql<number>`count(*)::int`,
            activeAlerts: sql<number>`count(*) filter (where ${alerts.status} = 'active')::int`,
            avgSi: sql<number | null>`avg(${alerts.si})::real`,
            avgLeakRate: sql<number | null>`avg(${alerts.leakRate})::real`,
          })
          .from(alerts)
          .groupBy(alerts.zoneId),
        db
          .select({
            stationId: readingsMinute.stationId,
            minuteBuckets: sql<number>`count(*)::int`,
            totalSamples: sql<number>`coalesce(sum(${readingsMinute.sampleCount}), 0)::int`,
            flowAvg: sql<number | null>`avg(${readingsMinute.flowAvg})::real`,
            flowMin: sql<number | null>`min(${readingsMinute.flowMin})::real`,
            flowMax: sql<number | null>`max(${readingsMinute.flowMax})::real`,
            pressureAvg: sql<number | null>`avg(${readingsMinute.pressureAvg})::real`,
            pressureMin: sql<number | null>`min(${readingsMinute.pressureMin})::real`,
            pressureMax: sql<number | null>`max(${readingsMinute.pressureMax})::real`,
          })
          .from(readingsMinute)
          .where(inArray(readingsMinute.stationId, [...STATION_IDS]))
          .groupBy(readingsMinute.stationId),
        db
          .select()
          .from(alerts)
          .orderBy(desc(alerts.ts))
          .limit(50),
        db.select({ count: sql<number>`count(*)::int` }).from(readingsRaw),
      ] as Parameters<typeof db.batch>[0])) as [
        {
          id: string;
          name: string;
          status: string;
          samplingMode: string;
          lastSeen: Date | null;
          latestFlow: number | null;
          latestPressure: number | null;
        }[],
        { id: number; name: string; stationA: string; stationB: string; status: string }[],
        {
          total: number;
          active: number;
          acknowledged: number;
          resolved: number;
          avgConfidence: number | null;
          avgSi: number | null;
          avgLeakRate: number | null;
        }[],
        { severity: string; count: number }[],
        {
          zoneId: number | null;
          totalAlerts: number;
          activeAlerts: number;
          avgSi: number | null;
          avgLeakRate: number | null;
        }[],
        {
          stationId: string;
          minuteBuckets: number;
          totalSamples: number;
          flowAvg: number | null;
          flowMin: number | null;
          flowMax: number | null;
          pressureAvg: number | null;
          pressureMin: number | null;
          pressureMax: number | null;
        }[],
        {
          id: number;
          stationId: string;
          zoneId: number | null;
          ts: Date;
          featuresJson: unknown;
          confidence: number;
          severity: string;
          si: number | null;
          leakRate: number | null;
          recommendedAction: string | null;
          status: string;
          repeatCount: number;
        }[],
        { count: number }[],
      ];

    const telemetryByStation = new Map(
      stationTelemetryStats.map((row) => [row.stationId, row])
    );
    const zoneStatsById = new Map(zoneAlertStats.map((row) => [row.zoneId, row]));
    const severityCountMap = new Map(severityStats.map((s) => [s.severity, Number(s.count)]));

    const stationsSummary = STATION_IDS.map((sid) => {
      const st = stationRows.find((r) => r.id === sid);
      const agg = telemetryByStation.get(sid);
      const hasReported = st?.lastSeen != null && st.status !== "offline";
      return {
        stationId: sid,
        name: st?.name ?? `Station ${sid}`,
        status: hasReported ? st.status : "offline",
        samplingMode: hasReported ? st.samplingMode : null,
        lastSeen: st?.lastSeen?.toISOString() ?? null,
        latestFlow: st?.latestFlow ?? null,
        latestPressure: st?.latestPressure ?? null,
        minuteBuckets: Number(agg?.minuteBuckets ?? 0),
        totalSamples: Number(agg?.totalSamples ?? 0),
        flowAvg: agg?.flowAvg != null ? Number(agg.flowAvg.toFixed(2)) : null,
        flowMin: agg?.flowMin != null ? Number(agg.flowMin.toFixed(2)) : null,
        flowMax: agg?.flowMax != null ? Number(agg.flowMax.toFixed(2)) : null,
        pressureAvg: agg?.pressureAvg != null ? Number(agg.pressureAvg.toFixed(2)) : null,
        pressureMin: agg?.pressureMin != null ? Number(agg.pressureMin.toFixed(2)) : null,
        pressureMax: agg?.pressureMax != null ? Number(agg.pressureMax.toFixed(2)) : null,
      };
    });

    const zonesSummary = ZONE_IDS.map((zid) => {
      const z = zoneRows.find((r) => r.id === zid);
      const zAgg = zoneStatsById.get(zid);
      return {
        zoneId: zid,
        name: z?.name ?? `Zone ${zid}`,
        status: z?.status ?? "healthy",
        totalAlerts: Number(zAgg?.totalAlerts ?? 0),
        activeAlerts: Number(zAgg?.activeAlerts ?? 0),
        avgSi: zAgg?.avgSi != null ? Number(zAgg.avgSi.toFixed(2)) : null,
        avgLeakRate: zAgg?.avgLeakRate != null ? Number(zAgg.avgLeakRate.toFixed(2)) : null,
      };
    });

    const stationsReporting = stationsSummary.filter((s) => s.lastSeen != null).length;
    const totalSamples = stationsSummary.reduce((acc, s) => acc + s.totalSamples, 0);
    const totalMinuteBuckets = stationsSummary.reduce((acc, s) => acc + s.minuteBuckets, 0);

    let lastIngestMs = 0;
    for (const s of stationRows) {
      if (s.lastSeen && s.lastSeen.getTime() > lastIngestMs) {
        lastIngestMs = s.lastSeen.getTime();
      }
    }

    const agg = alertStats[0];

    return NextResponse.json(
      {
        summary: {
          stationsReporting,
          stationsTotal: STATION_IDS.length,
          zonesHealthy: zonesSummary.filter((z) => z.activeAlerts === 0 && z.status === "healthy").length,
          zonesTotal: ZONE_IDS.length,
          rawRows: Number(rawCountRows[0]?.count ?? 0),
          minuteBuckets: totalMinuteBuckets,
          totalSamples,
          totalAlerts: Number(agg?.total ?? 0),
          activeAlerts: Number(agg?.active ?? 0),
          acknowledgedAlerts: Number(agg?.acknowledged ?? 0),
          resolvedAlerts: Number(agg?.resolved ?? 0),
          avgConfidence: agg?.avgConfidence != null ? Number(agg.avgConfidence.toFixed(3)) : null,
          avgSi: agg?.avgSi != null ? Number(agg.avgSi.toFixed(2)) : null,
          avgLeakRate: agg?.avgLeakRate != null ? Number(agg.avgLeakRate.toFixed(2)) : null,
          lastIngestAt: lastIngestMs > 0 ? new Date(lastIngestMs).toISOString() : null,
        },
        severityBreakdown: [
          { severity: "low", count: severityCountMap.get("low") ?? 0 },
          { severity: "medium", count: severityCountMap.get("medium") ?? 0 },
          { severity: "high", count: severityCountMap.get("high") ?? 0 },
        ],
        stationsSummary,
        zonesSummary,
        incidents: recentAlerts.map((a) => ({
          id: a.id,
          stationId: a.stationId,
          zoneId: a.zoneId,
          ts: a.ts.toISOString(),
          features: a.featuresJson,
          confidence: a.confidence,
          severity: a.severity,
          si: a.si,
          leakRate: a.leakRate,
          recommendedAction: a.recommendedAction,
          status: a.status,
          repeatCount: a.repeatCount,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Evaluation query failed:", err);
    return NextResponse.json(
      { error: "Failed to load evaluation metrics" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
