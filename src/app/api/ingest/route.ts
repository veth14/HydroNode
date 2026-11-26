// src/app/api/ingest/route.ts
// POST /api/ingest — receives batched sensor data from the live ESP32 controller.
// Protected by x-api-key header.
// Architecture: 4 stations (S1–S4), 2 sensors per junction (flow + pressure; vibration defaults to 0 until installed).
// Optimized for 30s ingest cadence: single db.batch() round-trip for raw + minute + station snapshots,
// single batched settings read on alert, and non-blocking retention cleanup via Next.js after().

import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute, alerts, stations, zones, settings } from "@/db/schema";
import { sql, eq, and, inArray, lt } from "drizzle-orm";
import { evaluateAlert } from "@/lib/leakLogic";
import { STATION_IDS } from "@/config/rig";
import type { SeverityThresholds } from "@/types";

const RAW_RETENTION_HOURS = 2;
const CLEANUP_MIN_INTERVAL_MS = 30 * 60 * 1000;
let lastCleanupAtMs = 0;

// ── Zod schema ────────────────────────────────────────────────────────────────
const ReadingSchema = z.object({
  stationId: z.enum(["S1", "S2", "S3", "S4"]),
  t: z.string().datetime(),
  flow: z.number(),
  pressure: z.number(),
  vibration: z.number().default(0),
});

const AlertFeaturesSchema = z.object({
  pressureDropRate: z.number(),
  flowDifference: z.number(),
  vibrationRms: z.number().default(0),
  dominantFreq: z.number().optional(),
  bandEnergy: z.number().optional(),
});

const AlertSchema = z.object({
  stationId: z.enum(["S1", "S2", "S3", "S4"]),
  t: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  features: AlertFeaturesSchema,
});

const SamplingModeSchema = z.enum(["normal", "elevated"]);

const IngestBodySchema = z.object({
  deviceId: z.string(),
  sentAt: z.string().datetime(),
  readings: z.array(ReadingSchema).min(1),
  alerts: z.array(AlertSchema).default([]),
  samplingModes: z.record(z.string(), SamplingModeSchema).default({}),
});

// ── Helper: check x-api-key ───────────────────────────────────────────────────
function checkApiKey(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  return Boolean(process.env.INGEST_API_KEY) && key === process.env.INGEST_API_KEY;
}

// ── Numeric helpers ───────────────────────────────────────────────────────────
function avg(arr: number[]) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}
function min(arr: number[]) {
  return arr.length === 0 ? 0 : Math.min(...arr);
}
function max(arr: number[]) {
  return arr.length === 0 ? 0 : Math.max(...arr);
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = IngestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { readings, alerts: ingestAlerts, samplingModes } = parsed.data;

  // ── 1. Aggregate readings by (stationId, minute) and track chronologically latest per station ──
  const minuteMap = new Map<
    string,
    { stationId: string; minuteTs: Date; flows: number[]; pressures: number[]; vibs: number[] }
  >();
  const latestByStation = new Map<
    string,
    { tsMs: number; flow: number; pressure: number; vibration: number }
  >();

  const rawValues = readings.map((r) => {
    const tsDate = new Date(r.t);
    const tsMs = tsDate.getTime();

    const prevLatest = latestByStation.get(r.stationId);
    if (!prevLatest || tsMs >= prevLatest.tsMs) {
      latestByStation.set(r.stationId, {
        tsMs,
        flow: r.flow,
        pressure: r.pressure,
        vibration: r.vibration,
      });
    }

    const bucketDate = new Date(tsMs);
    bucketDate.setSeconds(0, 0);
    const key = `${r.stationId}|${bucketDate.toISOString()}`;
    let bucket = minuteMap.get(key);
    if (!bucket) {
      bucket = {
        stationId: r.stationId,
        minuteTs: bucketDate,
        flows: [],
        pressures: [],
        vibs: [],
      };
      minuteMap.set(key, bucket);
    }
    bucket.flows.push(r.flow);
    bucket.pressures.push(r.pressure);
    bucket.vibs.push(r.vibration);

    return {
      stationId: r.stationId,
      ts: tsDate,
      flow: r.flow,
      pressure: r.pressure,
      vibration: r.vibration,
    };
  });

  // ── 2. Single pipelined db.batch(): raw insert + minute upserts + station snapshot updates ──
  const now = new Date();
  const alertStationSet = new Set(ingestAlerts.map((a) => a.stationId));

  const rawInsertStmt = db.insert(readingsRaw).values(rawValues);

  const minuteUpsertStmts = [...minuteMap.values()].map((bucket) =>
    db
      .insert(readingsMinute)
      .values({
        stationId: bucket.stationId,
        minuteTs: bucket.minuteTs,
        flowAvg: avg(bucket.flows),
        flowMin: min(bucket.flows),
        flowMax: max(bucket.flows),
        pressureAvg: avg(bucket.pressures),
        pressureMin: min(bucket.pressures),
        pressureMax: max(bucket.pressures),
        vibAvg: avg(bucket.vibs),
        vibMax: max(bucket.vibs),
        sampleCount: bucket.flows.length,
      })
      .onConflictDoUpdate({
        target: [readingsMinute.stationId, readingsMinute.minuteTs],
        set: {
          flowAvg: sql`(readings_minute.flow_avg * readings_minute.sample_count + EXCLUDED.flow_avg * EXCLUDED.sample_count) / (readings_minute.sample_count + EXCLUDED.sample_count)`,
          flowMin: sql`LEAST(readings_minute.flow_min, EXCLUDED.flow_min)`,
          flowMax: sql`GREATEST(readings_minute.flow_max, EXCLUDED.flow_max)`,
          pressureAvg: sql`(readings_minute.pressure_avg * readings_minute.sample_count + EXCLUDED.pressure_avg * EXCLUDED.sample_count) / (readings_minute.sample_count + EXCLUDED.sample_count)`,
          pressureMin: sql`LEAST(readings_minute.pressure_min, EXCLUDED.pressure_min)`,
          pressureMax: sql`GREATEST(readings_minute.pressure_max, EXCLUDED.pressure_max)`,
          vibAvg: sql`(readings_minute.vib_avg * readings_minute.sample_count + EXCLUDED.vib_avg * EXCLUDED.sample_count) / (readings_minute.sample_count + EXCLUDED.sample_count)`,
          vibMax: sql`GREATEST(readings_minute.vib_max, EXCLUDED.vib_max)`,
          sampleCount: sql`readings_minute.sample_count + EXCLUDED.sample_count`,
        },
      })
  );

  const stationUpdateStmts = [...latestByStation.entries()].map(([stationId, snap]) => {
    const hasAlert = alertStationSet.has(stationId as "S1" | "S2" | "S3" | "S4");
    const mode = samplingModes[stationId] ?? "normal";
    return db
      .update(stations)
      .set({
        status: hasAlert ? "alert" : mode === "elevated" ? "elevated" : "online",
        samplingMode: mode,
        lastSeen: now,
        latestFlow: snap.flow,
        latestPressure: snap.pressure,
        latestVibration: snap.vibration,
      })
      .where(eq(stations.id, stationId));
  });

  await db.batch([
    rawInsertStmt,
    ...minuteUpsertStmts,
    ...stationUpdateStmts,
  ] as Parameters<typeof db.batch>[0]);

  // ── 3. Process alerts only when flagged by edge controller ──
  let alertsInserted = 0;

  if (ingestAlerts.length > 0) {
    const alertStationIds = [...alertStationSet];
    const settingKeys = [
      "severity_thresholds",
      "repeat_alert_window_min",
      ...alertStationIds.map((sid) => `baseline_${sid}`),
    ];

    const settingRows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, settingKeys));

    const settingsMap = new Map(settingRows.map((row) => [row.key, row.valueJson]));
    const thresholds =
      (settingsMap.get("severity_thresholds") as SeverityThresholds | undefined) ?? {
        low: 5,
        medium: 10,
      };
    const repeatWindowMs =
      ((settingsMap.get("repeat_alert_window_min") as { value?: number } | undefined)?.value ?? 10) *
      60 *
      1000;

    const triggeredZones = new Set<number>();

    for (const ingestAlert of ingestAlerts) {
      const baseline =
        (settingsMap.get(`baseline_${ingestAlert.stationId}`) as
          | { q0: number; p0: number }
          | undefined) ?? { q0: 15, p0: 5 };

      const flows = STATION_IDS.map((id) => latestByStation.get(id)?.flow ?? baseline.q0);
      const evaluated = evaluateAlert(ingestAlert.features, baseline, flows, thresholds);
      if (!evaluated) continue;

      const alertTs = new Date(ingestAlert.t);
      const repeatWindowStart = new Date(alertTs.getTime() - repeatWindowMs);

      const existing = await db.query.alerts.findFirst({
        where: and(
          eq(alerts.stationId, ingestAlert.stationId),
          sql`${alerts.ts} > ${repeatWindowStart}`,
          eq(alerts.status, "active")
        ),
      });

      if (existing) {
        await db
          .update(alerts)
          .set({ repeatCount: existing.repeatCount + 1, ts: alertTs })
          .where(eq(alerts.id, existing.id));
      } else {
        await db.insert(alerts).values({
          stationId: ingestAlert.stationId,
          zoneId: evaluated.zoneId,
          ts: alertTs,
          featuresJson: ingestAlert.features,
          confidence: ingestAlert.confidence,
          severity: evaluated.severity,
          si: evaluated.si,
          leakRate: evaluated.leakRateValue,
          recommendedAction: evaluated.recommendedActionText,
          status: "active",
          repeatCount: 1,
        });
        alertsInserted++;
        triggeredZones.add(evaluated.zoneId);
      }
    }

    if (triggeredZones.size > 0) {
      await db
        .update(zones)
        .set({ status: "alert" })
        .where(inArray(zones.id, [...triggeredZones]));
    }
  }

  // ── 4. Opportunistic background cleanup (adds zero latency to ESP32 response) ──
  const nowMs = now.getTime();
  const minuteOfHour = now.getMinutes();
  const isScheduledMinute = minuteOfHour === 0 || minuteOfHour === 30;
  if (
    nowMs - lastCleanupAtMs >= CLEANUP_MIN_INTERVAL_MS &&
    (isScheduledMinute || lastCleanupAtMs === 0)
  ) {
    lastCleanupAtMs = nowMs;
    const cutoff = new Date(nowMs - RAW_RETENTION_HOURS * 60 * 60 * 1000);
    after(async () => {
      try {
        await db.delete(readingsRaw).where(lt(readingsRaw.ts, cutoff));
      } catch (err) {
        console.warn("Background readings_raw retention prune failed:", err);
      }
    });
  }

  return NextResponse.json({
    ok: true,
    readingsInserted: readings.length,
    minuteBucketsUpserted: minuteMap.size,
    alertsInserted,
  });
}
