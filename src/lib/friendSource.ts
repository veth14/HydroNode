// src/lib/friendSource.ts
// Server-only queries against the friend's Neon DB (sensor_data table).
// IMPORTANT: sensor_data.created_at is `timestamp without time zone` stored in UTC (GMT).
// Every query formats created_at via Postgres `to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
// so Node.js in UTC+8 (Manila) and Vercel in UTC+0 parse the exact same UTC instant.

import {
  getFriendSql,
  type FriendSensorRow,
  type PumpTransitionRow,
} from "@/db/friendClient";
import {
  adcToBar,
  classifyStatusKind,
  derivePumpState,
  evaluateFriendRowAnomaly,
  normalizeConfidence01,
  normalizePumpRaw,
  rowFlows,
  rowPressuresBar,
  rowPressuresRaw,
  STALE_THRESHOLD_MS,
} from "@/lib/friendTelemetry";
import { STATION_IDS, ZONE_IDS, ZONES, type StationId, type ZoneId } from "@/config/rig";
import type { KpiData, LiveAlert, LiveStation, Severity } from "@/types";

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Fetch recent sensor_data history, total row count, and full pump ON/OFF transition log. */
export async function queryFriendSourceOverview(historyLimit = 60) {
  const sql = getFriendSql();

  const [countRaw, historyRaw, transitionRaw] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total FROM sensor_data`,
    sql`
      SELECT
        id,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        status,
        flow1, flow2, flow3, flow4,
        pressure1, pressure2, pressure3, pressure4,
        localization,
        confidence,
        pump_status
      FROM sensor_data
      ORDER BY id DESC
      LIMIT ${historyLimit}
    `,
    sql`
      WITH ordered AS (
        SELECT
          id,
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          CASE WHEN upper(coalesce(trim(pump_status), 'OFF')) = 'ON' THEN 'ON' ELSE 'OFF' END AS pump_status,
          LAG(CASE WHEN upper(coalesce(trim(pump_status), 'OFF')) = 'ON' THEN 'ON' ELSE 'OFF' END)
            OVER (ORDER BY id) AS prev_pump_status
        FROM sensor_data
      )
      SELECT id, created_at, pump_status, prev_pump_status
      FROM ordered
      WHERE prev_pump_status IS NULL OR pump_status <> prev_pump_status
      ORDER BY id DESC
      LIMIT 30
    `,
  ]);

  const countRows = countRaw as unknown as { total: number }[];
  const historyRows = historyRaw as unknown as FriendSensorRow[];
  const transitionRows = transitionRaw as unknown as PumpTransitionRow[];

  const totalRows = Number(countRows[0]?.total ?? 0);
  const latest = historyRows[0] ?? null;
  const chronoHistory = [...historyRows].reverse();

  return {
    totalRows,
    latest,
    chronoHistory,
    pumpTransitions: transitionRows,
    pumpState: derivePumpState(latest, transitionRows[0] ?? null),
  };
}

/** Build GET /api/kpi payload from sensor_data. */
export async function queryFriendKpi(): Promise<KpiData> {
  const { latest, pumpTransitions, pumpState } = await queryFriendSourceOverview(1);

  if (!latest) {
    return {
      activeAlerts: 0,
      zonesHealthy: ZONE_IDS.length,
      zonesTotal: ZONE_IDS.length,
      stationsOnline: 0,
      stationsTotal: STATION_IDS.length,
      estimatedWaterLoss: 0,
      lastUpdated: null,
      pumpStatus: "off",
      pumpStatusRaw: "OFF",
      pumpUpdatedAt: null,
      lastPumpChangedAt: null,
      isStale: false,
      systemStatus: null,
    };
  }

  const evalRow = evaluateFriendRowAnomaly(latest);
  const isFresh = !pumpState.isStale;
  const isActiveLeak = isFresh && evalRow.kind === "leak";

  const activeAlerts = isActiveLeak ? 1 : 0;
  const zonesHealthy = isActiveLeak ? Math.max(0, ZONE_IDS.length - 1) : ZONE_IDS.length;
  const stationsOnline = isFresh ? STATION_IDS.length : 0;

  return {
    activeAlerts,
    zonesHealthy,
    zonesTotal: ZONE_IDS.length,
    stationsOnline,
    stationsTotal: STATION_IDS.length,
    estimatedWaterLoss: isActiveLeak ? evalRow.flowDiff : 0,
    lastUpdated: latest.created_at,
    pumpStatus: pumpState.pumpStatus,
    pumpStatusRaw: pumpState.pumpStatusRaw,
    pumpUpdatedAt: pumpState.pumpUpdatedAt,
    lastPumpChangedAt: pumpTransitions[0]?.created_at ?? pumpState.lastPumpChangedAt,
    isStale: pumpState.isStale,
    systemStatus: latest.status ?? "Normal",
  };
}

/** Build GET /api/stations payload (S1–S4) from latest sensor_data row. */
export async function queryFriendStations(): Promise<LiveStation[]> {
  const sql = getFriendSql();
  const rows = (await sql`
    SELECT
      id,
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
      status,
      flow1, flow2, flow3, flow4,
      pressure1, pressure2, pressure3, pressure4,
      localization,
      confidence,
      pump_status
    FROM sensor_data
    ORDER BY id DESC
    LIMIT 1
  `) as FriendSensorRow[];

  const latest = rows[0] ?? null;

  if (!latest) {
    return STATION_IDS.map((id) => ({
      id,
      name: `Station ${id}`,
      status: "offline",
      samplingMode: "normal",
      lastSeen: null,
      latestFlow: null,
      latestPressure: null,
      latestVibration: null,
    }));
  }

  const flows = rowFlows(latest);
  const pressures = rowPressuresBar(latest);
  const evalRow = evaluateFriendRowAnomaly(latest);
  const ageMs = Date.now() - new Date(latest.created_at).getTime();
  const isFresh = Number.isFinite(ageMs) && ageMs <= STALE_THRESHOLD_MS;

  const affectedZone =
    evalRow.kind === "leak" && evalRow.zoneId != null
      ? ZONES.find((z) => z.id === evalRow.zoneId)
      : undefined;

  return STATION_IDS.map((id, idx) => {
    const inAlertZone =
      affectedZone != null && (affectedZone.stationA === id || affectedZone.stationB === id);

    let status: LiveStation["status"] = "offline";
    if (isFresh) {
      if (evalRow.kind === "leak" && inAlertZone) {
        status = "alert";
      } else if (evalRow.kind === "sensor_failure" && flows[idx] === 0 && adcToBar(rowPressuresRaw(latest)[idx]) === 0) {
        status = "elevated";
      } else {
        status = "online";
      }
    }

    return {
      id,
      name: `Station ${id}`,
      status,
      samplingMode: evalRow.kind === "leak" ? "elevated" : "normal",
      lastSeen: latest.created_at,
      latestFlow: Number(flows[idx].toFixed(2)),
      latestPressure: Number(pressures[idx].toFixed(3)),
      latestVibration: 0,
    };
  });
}

/** Build GET /api/readings payload for one station across 1h|24h|7d|30d. */
export async function queryFriendReadings(
  stationId: StationId,
  range: string,
  raw: boolean
) {
  const sql = getFriendSql();
  const idx = STATION_IDS.indexOf(stationId);
  if (idx < 0) return [];

  const ms = RANGE_MS[range] ?? RANGE_MS["1h"];
  const sinceIso = new Date(Date.now() - ms).toISOString();

  // Safe fixed-column queries per station index (avoid dynamic identifier injection)
  const rows = (await sql`
    SELECT
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
      flow1, flow2, flow3, flow4,
      pressure1, pressure2, pressure3, pressure4
    FROM sensor_data
    WHERE created_at >= (${sinceIso}::timestamptz AT TIME ZONE 'UTC')
    ORDER BY id DESC
    LIMIT ${raw ? 720 : 5000}
  `) as Pick<
    FriendSensorRow,
    "created_at" | "flow1" | "flow2" | "flow3" | "flow4" | "pressure1" | "pressure2" | "pressure3" | "pressure4"
  >[];

  rows.reverse();

  const extractPoint = (r: (typeof rows)[number]) => {
    const f = [r.flow1, r.flow2, r.flow3, r.flow4][idx] ?? 0;
    const pRaw = [r.pressure1, r.pressure2, r.pressure3, r.pressure4][idx] ?? 0;
    return {
      t: r.created_at,
      flow: Number(Number(f).toFixed(2)),
      pressure: Number(adcToBar(pRaw).toFixed(3)),
    };
  };

  if (raw) {
    return rows.map((r) => {
      const pt = extractPoint(r);
      return {
        t: pt.t,
        flow: pt.flow,
        pressure: pt.pressure,
        vibration: 0,
      };
    });
  }

  // Group chronologically by minute for 24h / 7d / 30d views
  const buckets = new Map<string, { flows: number[]; pressures: number[] }>();
  for (const r of rows) {
    const pt = extractPoint(r);
    const minuteDate = new Date(pt.t);
    minuteDate.setSeconds(0, 0);
    const key = minuteDate.toISOString();
    let b = buckets.get(key);
    if (!b) {
      b = { flows: [], pressures: [] };
      buckets.set(key, b);
    }
    b.flows.push(pt.flow);
    b.pressures.push(pt.pressure);
  }

  return [...buckets.entries()].map(([minuteIso, b]) => {
    const avg = (arr: number[]) => arr.reduce((a, x) => a + x, 0) / arr.length;
    return {
      t: minuteIso,
      flowAvg: Number(avg(b.flows).toFixed(2)),
      flowMin: Number(Math.min(...b.flows).toFixed(2)),
      flowMax: Number(Math.max(...b.flows).toFixed(2)),
      pressureAvg: Number(avg(b.pressures).toFixed(3)),
      pressureMin: Number(Math.min(...b.pressures).toFixed(3)),
      pressureMax: Number(Math.max(...b.pressures).toFixed(3)),
      vibAvg: 0,
      vibMax: 0,
      sampleCount: b.flows.length,
    };
  });
}

/** Build GET /api/alerts payload from non-Normal rows in sensor_data. */
export async function queryFriendAlerts(filters?: {
  status?: string | null;
  severity?: string | null;
  zoneId?: string | null;
}): Promise<LiveAlert[]> {
  const sql = getFriendSql();

  const [latestRaw, anomalyRaw] = await Promise.all([
    sql`
      SELECT id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at, status
      FROM sensor_data
      ORDER BY id DESC
      LIMIT 1
    `,
    sql`
      SELECT
        id,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
        status,
        flow1, flow2, flow3, flow4,
        pressure1, pressure2, pressure3, pressure4,
        localization,
        confidence,
        pump_status
      FROM sensor_data
      WHERE coalesce(trim(lower(status)), 'normal') NOT IN ('normal', 'monitoring')
      ORDER BY id DESC
      LIMIT 100
    `,
  ]);

  const latestRows = latestRaw as unknown as {
    id: number;
    created_at: string;
    status: string | null;
  }[];
  const anomalyRows = anomalyRaw as unknown as FriendSensorRow[];

  const latestRow = latestRows[0] ?? null;
  const latestIsFresh =
    latestRow != null &&
    Date.now() - new Date(latestRow.created_at).getTime() <= STALE_THRESHOLD_MS;

  const mapped: LiveAlert[] = anomalyRows.map((row) => {
    const evalRow = evaluateFriendRowAnomaly(row);
    const isLatestOngoing = latestRow?.id === row.id && latestIsFresh;

    // Only real active Leaks trigger the audible alarm siren ("active");
    // SensorFailure or stale/historical events appear cleanly as acknowledged/resolved.
    const alertStatus: LiveAlert["status"] =
      isLatestOngoing && evalRow.kind === "leak"
        ? "active"
        : isLatestOngoing
        ? "acknowledged"
        : "resolved";

    return {
      id: row.id,
      stationId: evalRow.stationId,
      zoneId: evalRow.zoneId,
      ts: row.created_at,
      features: {
        pressureDropRate: evalRow.pressureDropBar,
        flowDifference: evalRow.flowDiff,
        vibrationRms: 0,
      },
      confidence: normalizeConfidence01(row.confidence),
      severity: evalRow.severity,
      si: evalRow.si,
      leakRate: evalRow.flowDiff,
      recommendedAction: evalRow.recommendedActionText,
      status: alertStatus,
      repeatCount: 1,
    };
  });

  return mapped.filter((a) => {
    if (filters?.status && a.status !== filters.status) return false;
    if (filters?.severity && a.severity !== filters.severity) return false;
    if (filters?.zoneId && a.zoneId !== parseInt(filters.zoneId, 10)) return false;
    return true;
  });
}

/** Build GET /api/evaluation payload from sensor_data statistics. */
export async function queryFriendEvaluation() {
  const sql = getFriendSql();

  const [aggRaw, anomalyRows, stationLatest] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_rows,
        COUNT(*) FILTER (WHERE coalesce(trim(lower(status)), 'normal') NOT IN ('normal', 'monitoring'))::int AS anomaly_rows,
        COUNT(*) FILTER (WHERE lower(coalesce(status, '')) LIKE '%leak%')::int AS leak_rows,
        AVG(flow1)::real AS flow1_avg, MIN(flow1)::real AS flow1_min, MAX(flow1)::real AS flow1_max,
        AVG(flow2)::real AS flow2_avg, MIN(flow2)::real AS flow2_min, MAX(flow2)::real AS flow2_max,
        AVG(flow3)::real AS flow3_avg, MIN(flow3)::real AS flow3_min, MAX(flow3)::real AS flow3_max,
        AVG(flow4)::real AS flow4_avg, MIN(flow4)::real AS flow4_min, MAX(flow4)::real AS flow4_max,
        AVG(pressure1)::real AS p1_avg, MIN(pressure1)::real AS p1_min, MAX(pressure1)::real AS p1_max,
        AVG(pressure2)::real AS p2_avg, MIN(pressure2)::real AS p2_min, MAX(pressure2)::real AS p2_max,
        AVG(pressure3)::real AS p3_avg, MIN(pressure3)::real AS p3_min, MAX(pressure3)::real AS p3_max,
        AVG(pressure4)::real AS p4_avg, MIN(pressure4)::real AS p4_min, MAX(pressure4)::real AS p4_max,
        to_char(MAX(created_at), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_ingest_at
      FROM sensor_data
    `,
    queryFriendAlerts(),
    queryFriendStations(),
  ]);

  const aggRows = aggRaw as unknown as Record<string, unknown>[];

  const agg = aggRows[0] ?? {};
  const recent50 = anomalyRows.slice(0, 50);

  const severityCounts: Record<Severity, number> = { low: 0, medium: 0, high: 0 };
  let confSum = 0;
  let siSum = 0;
  let siCount = 0;
  let leakSum = 0;
  let leakCount = 0;

  for (const a of anomalyRows) {
    severityCounts[a.severity]++;
    confSum += a.confidence;
    if (a.si != null) {
      siSum += a.si;
      siCount++;
    }
    if (a.leakRate != null) {
      leakSum += a.leakRate;
      leakCount++;
    }
  }

  const totalRows = Number(agg.total_rows ?? 0);
  const activeAlerts = anomalyRows.filter((a) => a.status === "active").length;
  const acknowledgedAlerts = anomalyRows.filter((a) => a.status === "acknowledged").length;
  const resolvedAlerts = anomalyRows.filter((a) => a.status === "resolved").length;
  const lastIngestAt = (agg.last_ingest_at as string | null) ?? null;

  const stationsSummary = STATION_IDS.map((sid, i) => {
    const idx = i + 1;
    const st = stationLatest[i];
    const fAvg = agg[`flow${idx}_avg`] as number | null;
    const fMin = agg[`flow${idx}_min`] as number | null;
    const fMax = agg[`flow${idx}_max`] as number | null;
    const pAvg = agg[`p${idx}_avg`] as number | null;
    const pMin = agg[`p${idx}_min`] as number | null;
    const pMax = agg[`p${idx}_max`] as number | null;
    return {
      stationId: sid,
      name: `Station ${sid}`,
      status: st?.status ?? "offline",
      samplingMode: st?.samplingMode ?? null,
      lastSeen: st?.lastSeen ?? null,
      latestFlow: st?.latestFlow ?? null,
      latestPressure: st?.latestPressure ?? null,
      minuteBuckets: totalRows,
      totalSamples: totalRows,
      flowAvg: fAvg != null ? Number(Number(fAvg).toFixed(2)) : null,
      flowMin: fMin != null ? Number(Number(fMin).toFixed(2)) : null,
      flowMax: fMax != null ? Number(Number(fMax).toFixed(2)) : null,
      pressureAvg: pAvg != null ? Number(adcToBar(Number(pAvg)).toFixed(3)) : null,
      pressureMin: pMin != null ? Number(adcToBar(Number(pMin)).toFixed(3)) : null,
      pressureMax: pMax != null ? Number(adcToBar(Number(pMax)).toFixed(3)) : null,
    };
  });

  const zonesSummary = ZONE_IDS.map((zid) => {
    const zAlerts = anomalyRows.filter((a) => a.zoneId === zid);
    const activeZ = zAlerts.filter((a) => a.status === "active").length;
    return {
      zoneId: zid as ZoneId,
      name: `Zone ${zid}`,
      status: activeZ > 0 ? "alert" : "healthy",
      totalAlerts: zAlerts.length,
      activeAlerts: activeZ,
      avgSi: null,
      avgLeakRate: null,
    };
  });

  return {
    summary: {
      stationsReporting: stationLatest.filter((s) => s.status !== "offline").length,
      stationsTotal: STATION_IDS.length,
      zonesHealthy: zonesSummary.filter((z) => z.activeAlerts === 0).length,
      zonesTotal: ZONE_IDS.length,
      rawRows: totalRows,
      minuteBuckets: totalRows,
      totalSamples: totalRows,
      totalAlerts: anomalyRows.length,
      activeAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      avgConfidence: anomalyRows.length > 0 ? Number((confSum / anomalyRows.length).toFixed(3)) : null,
      avgSi: siCount > 0 ? Number((siSum / siCount).toFixed(2)) : null,
      avgLeakRate: leakCount > 0 ? Number((leakSum / leakCount).toFixed(2)) : null,
      lastIngestAt,
    },
    severityBreakdown: [
      { severity: "low", count: severityCounts.low },
      { severity: "medium", count: severityCounts.medium },
      { severity: "high", count: severityCounts.high },
    ],
    stationsSummary,
    zonesSummary,
    incidents: recent50.map((a) => ({
      id: a.id,
      stationId: a.stationId,
      zoneId: a.zoneId,
      ts: a.ts,
      features: a.features,
      confidence: a.confidence,
      severity: a.severity,
      si: a.si,
      leakRate: a.leakRate,
      recommendedAction: a.recommendedAction,
      status: a.status,
      repeatCount: a.repeatCount,
    })),
  };
}

/** Build GET /api/db-usage payload from friend's Neon DB. */
export async function queryFriendDbUsage() {
  const sql = getFriendSql();
  const [countsRaw, sizeRaw] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_rows,
        COUNT(*) FILTER (WHERE coalesce(trim(lower(status)), 'normal') NOT IN ('normal', 'monitoring'))::int AS anomaly_rows,
        COUNT(DISTINCT date_trunc('minute', created_at))::int AS minute_buckets
      FROM sensor_data
    `,
    sql`SELECT pg_database_size(current_database())::bigint AS size`,
  ]);

  const counts = countsRaw as unknown as {
    total_rows: number;
    anomaly_rows: number;
    minute_buckets: number;
  }[];
  const sizeRows = sizeRaw as unknown as { size: string | number }[];

  return {
    rawRows: Number(counts[0]?.total_rows ?? 0),
    minuteRows: Number(counts[0]?.minute_buckets ?? 0),
    alertRows: Number(counts[0]?.anomaly_rows ?? 0),
    dbSizeBytes: Number(sizeRows[0]?.size ?? 0),
  };
}

export { classifyStatusKind, normalizePumpRaw };
