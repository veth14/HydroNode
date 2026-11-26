// src/app/api/source/route.ts
// GET /api/source
// Returns the latest sensor readings + pump status from the friend's ESP32 database.
// Polling-safe: responds in <200 ms (single indexed PK lookup + small window query).
// No auth required — this is read-only public telemetry for the dashboard.

import { NextResponse } from "next/server";
import { friendSql } from "@/db/friendClient";
import type { FriendSensorRow } from "@/db/friendClient";

// How many recent rows to include in the chart history (last N readings ~= last N*3s)
const HISTORY_ROWS = 60; // ~3 minutes of data at 3s cadence

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Latest single row — for KPI cards (pump status, latest readings)
    const [latest] = (await friendSql`
      SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1
    `) as FriendSensorRow[];

    if (!latest) {
      return NextResponse.json({ ok: false, error: "No data in source DB" }, { status: 503 });
    }

    // 2. Recent history for charts
    const history = (await friendSql`
      SELECT id, created_at, flow1, flow2, flow3, flow4,
             pressure1, pressure2, pressure3, pressure4,
             pump_status, status, confidence, localization
      FROM sensor_data
      ORDER BY id DESC
      LIMIT ${HISTORY_ROWS}
    `) as FriendSensorRow[];

    // History is DESC from DB — reverse to chronological for charts
    const chronoHistory = [...history].reverse();

    // 3. Detect pump ON→OFF and OFF→ON transitions in the full history window
    // A "transition" is any row where pump_status differs from the previous row
    const pumpTransitions: { id: number; created_at: string; pump_status: "ON" | "OFF" }[] = [];
    let prev: "ON" | "OFF" | null = null;
    for (const row of chronoHistory) {
      if (prev !== null && row.pump_status !== prev) {
        pumpTransitions.push({
          id: row.id,
          created_at: row.created_at,
          pump_status: row.pump_status,
        });
      }
      prev = row.pump_status;
    }

    // 4. Pressure ADC → bar conversion
    // Direct-wired, no voltage divider. ADC range: ~200 (0 bar) to 4095 (12 bar)
    const ADC_ZERO = 200;
    const ADC_MAX = 4095;
    const BAR_MAX = 12.0;
    function adcToBar(adc: number): number {
      return Math.max(0, ((adc - ADC_ZERO) / (ADC_MAX - ADC_ZERO)) * BAR_MAX);
    }

    // 5. Build chart-friendly series
    const series = chronoHistory.map((r) => ({
      t: r.created_at,
      flow: [r.flow1, r.flow2, r.flow3, r.flow4],
      pressure: [
        adcToBar(r.pressure1),
        adcToBar(r.pressure2),
        adcToBar(r.pressure3),
        adcToBar(r.pressure4),
      ],
      pressureRaw: [r.pressure1, r.pressure2, r.pressure3, r.pressure4],
      pumpStatus: r.pump_status,
      status: r.status,
    }));

    return NextResponse.json({
      ok: true,
      latest: {
        id: latest.id,
        createdAt: latest.created_at,
        flow: [latest.flow1, latest.flow2, latest.flow3, latest.flow4],
        pressure: [
          adcToBar(latest.pressure1),
          adcToBar(latest.pressure2),
          adcToBar(latest.pressure3),
          adcToBar(latest.pressure4),
        ],
        pressureRaw: [latest.pressure1, latest.pressure2, latest.pressure3, latest.pressure4],
        pumpStatus: latest.pump_status, // "ON" | "OFF"
        status: latest.status,
        localization: latest.localization,
        confidence: latest.confidence,
      },
      pumpTransitions, // array of ON↔OFF switch events in the history window
      series,
      rowCount: history.length,
    });
  } catch (err) {
    console.error("[/api/source] DB error:", err);
    return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
  }
}
