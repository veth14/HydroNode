// src/app/api/cron/cleanup/route.ts
// GET /api/cron/cleanup — deletes raw readings older than 48 h.
// Protected by CRON_SECRET (Vercel Cron uses Authorization: Bearer <secret>).
// Also accepts x-cron-secret header for manual calls.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingsRaw } from "@/db/schema";
import { sql, lt } from "drizzle-orm";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const direct = req.headers.get("x-cron-secret");
  return bearer === secret || direct === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const result = await db
    .delete(readingsRaw)
    .where(lt(readingsRaw.ts, cutoff));

  return NextResponse.json({
    ok: true,
    deleted: result.rowCount ?? "unknown",
    cutoff: cutoff.toISOString(),
  });
}

