// src/app/api/source/route.ts
// GET /api/source
// Returns latest telemetry, pump state & transition history, and recent series from
// the friend's ESP32 Neon DB (sensor_data). Returns ok:true + empty:true when 0 rows exist.

import { NextResponse } from "next/server";
import { hasFriendDbConfigured } from "@/db/friendClient";
import { queryFriendSourceOverview } from "@/lib/friendSource";
import {
  adcToBar,
  normalizeConfidence01,
  normalizePumpRaw,
  rowFlows,
  rowPressuresBar,
  rowPressuresRaw,
} from "@/lib/friendTelemetry";

const HISTORY_ROWS = 60;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!hasFriendDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: "FRIEND_DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const { totalRows, latest, chronoHistory, pumpTransitions, pumpState } =
      await queryFriendSourceOverview(HISTORY_ROWS);

    if (!latest) {
      return NextResponse.json(
        {
          ok: true,
          empty: true,
          latest: null,
          pumpState,
          pumpTransitions: [],
          series: [],
          rowCount: 0,
          totalRows: 0,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const series = chronoHistory.map((r) => ({
      t: r.created_at,
      flow: rowFlows(r),
      pressure: rowPressuresBar(r),
      pressureRaw: rowPressuresRaw(r),
      pumpStatus: normalizePumpRaw(r.pump_status),
      status: r.status ?? "Unknown",
    }));

    return NextResponse.json(
      {
        ok: true,
        empty: false,
        latest: {
          id: latest.id,
          createdAt: latest.created_at,
          flow: rowFlows(latest),
          pressure: [
            adcToBar(latest.pressure1),
            adcToBar(latest.pressure2),
            adcToBar(latest.pressure3),
            adcToBar(latest.pressure4),
          ],
          pressureRaw: rowPressuresRaw(latest),
          pumpStatus: normalizePumpRaw(latest.pump_status),
          status: latest.status ?? "Normal",
          localization: latest.localization ?? "None",
          confidence: Math.round(normalizeConfidence01(latest.confidence) * 100),
        },
        pumpState,
        pumpTransitions,
        series,
        rowCount: chronoHistory.length,
        totalRows,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/source] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not reach friend source database" },
      { status: 500 }
    );
  }
}
