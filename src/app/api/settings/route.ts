// src/app/api/settings/route.ts
// GET /api/settings — read all settings.
// PUT /api/settings — update one setting by key.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const rows = await db.select().from(settings);
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.valueJson;
  }
  return NextResponse.json(result);
}

const PutSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export async function PUT(req: NextRequest) {
  const body = PutSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  await db
    .insert(settings)
    .values({ key: body.data.key, valueJson: body.data.value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { valueJson: body.data.value },
    });

  return NextResponse.json({ ok: true });
}

