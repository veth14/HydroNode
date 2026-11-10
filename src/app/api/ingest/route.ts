// src/app/api/ingest/route.ts
// POST /api/ingest — receives batched sensor data from the ESP32 (or simulator).
// Protected by x-api-key header.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { readingsRaw, readingsMinute, alerts, stations, zones, settings } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { evaluateAlert } from "@/lib/leakLogic";
import type { StationId, SeverityThresholds } from "@/types";

// ── Zod schema ────────────────────────────────────────────────────────────────
const ReadingSchema = z.object({
  stationId: z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]),
  t: z.string().datetime(),
  flow: z.number(),
  pressure: z.number(),
  vibration: z.number(),
});

const AlertFeaturesSchema = z.object({
  pressureDropRate: z.number(),
  flowDifference: z.number(),
  vibrationRms: z.number(),
  dominantFreq: z.number().optional(),
  bandEnergy: z.number().optional(),
});

const AlertSchema = z.object({
  stationId: z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]),
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
  return key === process.env.INGEST_API_KEY;
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

  // 1. Batch-insert raw readings
  if (readings.length > 0) {
    await db.insert(readingsRaw).values(
      readings.map((r) => ({
        stationId: r.stationId,
        ts: new Date(r.t),
        flow: r.flow,
        pressure: r.pressure,
        vibration: r.vibration,
      }))
    );
  }

  // 2. Upsert per-minute aggregates
  // Group readings by (stationId, minute bucket)
  const minuteMap = new Map<
    string,
    { stationId: string; minuteTs: Date; flows: number[]; pressures: number[]; vibs: number[] }
  >();

  for (const r of readings) {
    const ms = new Date(r.t);
    ms.setSeconds(0, 0);
    const key = `${r.stationId}|${ms.toISOString()}`;
    if (!minuteMap.has(key)) {
      minuteMap.set(key, {
        stationId: r.stationId,
        minuteTs: ms,
        flows: [],
        pressures: [],
        vibs: [],
      });
    }
    const bucket = minuteMap.get(key)!;
    bucket.flows.push(r.flow);
    bucket.pressures.push(r.pressure);
    bucket.vibs.push(r.vibration);
  }

  for (const bucket of minuteMap.values()) {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = (arr: number[]) => Math.min(...arr);
    const max = (arr: number[]) => Math.max(...arr);

    await db
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
      });
  }

  // 3. Process alerts
  let alertsInserted = 0;

  // Load thresholds from settings
  const threshRow = await db.query.settings.findFirst({
    where: eq(settings.key, "severity_thresholds"),
  });
  const thresholds: SeverityThresholds =
    (threshRow?.valueJson as SeverityThresholds) ?? { low: 5, medium: 10 };

  const repeatWindowRow = await db.query.settings.findFirst({
    where: eq(settings.key, "repeat_alert_window_min"),
  });
  const repeatWindowMs =
    ((repeatWindowRow?.valueJson as { value?: number })?.value ?? 10) * 60 * 1000;

  for (const ingestAlert of ingestAlerts) {
    // Retrieve baseline for this station
    const baselineRow = await db.query.settings.findFirst({
      where: eq(settings.key, `baseline_${ingestAlert.stationId}`),
    });
    const baseline = (baselineRow?.valueJson as { q0: number; p0: number }) ?? {
      q0: 15,
      p0: 5,
    };

    // Approximate per-station flow readings (use latest from this batch)
    const latestByStation = new Map<string, number>();
    for (const r of readings) {
      latestByStation.set(r.stationId, r.flow);
    }
    const flows = ["S1", "S2", "S3", "S4", "S5", "S6"].map(
      (id) => latestByStation.get(id) ?? baseline.q0
    );

    const evaluated = evaluateAlert(
      ingestAlert.features,
      baseline,
      flows,
      thresholds
    );
    if (!evaluated) continue; // suppressed (demand spike etc.)

    const alertTs = new Date(ingestAlert.t);
    const repeatWindowStart = new Date(alertTs.getTime() - repeatWindowMs);

    // Check for recent duplicate from same station/zone
    const existing = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.stationId, ingestAlert.stationId),
        sql`${alerts.ts} > ${repeatWindowStart}`,
        eq(alerts.status, "active")
      ),
    });

    if (existing) {
      // Increment repeat count
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
    }
  }

  // 4. Update station status and last_seen
  const now = new Date();
  const stationIdsSeen = [...new Set(readings.map((r) => r.stationId))];
  for (const stationId of stationIdsSeen) {
    const hasAlert = ingestAlerts.some((a) => a.stationId === stationId);
    const mode = samplingModes[stationId] ?? "normal";
    await db
      .update(stations)
      .set({
        status: hasAlert ? "alert" : mode === "elevated" ? "elevated" : "online",
        samplingMode: mode,
        lastSeen: now,
      })
      .where(eq(stations.id, stationId));
  }

  return NextResponse.json({
    ok: true,
    readingsInserted: readings.length,
    minuteBucketsUpserted: minuteMap.size,
    alertsInserted,
  });
}

