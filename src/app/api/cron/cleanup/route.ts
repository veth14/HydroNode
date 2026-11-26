// src/app/api/cron/cleanup/route.ts
// GET /api/cron/cleanup — scheduled cron endpoint (protected by CRON_SECRET).
// POST /api/cron/cleanup — manual retention cleanup trigger from Settings page.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw } from "@/db/schema";
import { lt } from "drizzle-orm";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const direct = req.headers.get("x-cron-secret");
  return bearer === secret || direct === secret;
}

async function runCleanup(hoursParam: string | null) {
  const hours = Number(hoursParam) || 2;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = await db
    .delete(readingsRaw)
    .where(lt(readingsRaw.ts, cutoff));

  return NextResponse.json({
    ok: true,
    deleted: result.rowCount ?? 0,
    cutoff: cutoff.toISOString(),
    retentionHours: hours,
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCleanup(req.nextUrl.searchParams.get("hours"));
}

export async function POST(req: NextRequest) {
  return runCleanup(req.nextUrl.searchParams.get("hours"));
}
