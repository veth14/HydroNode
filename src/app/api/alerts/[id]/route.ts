// src/app/api/alerts/[id]/route.ts
// PATCH /api/alerts/[id] — acknowledge or resolve.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const alertId = parseInt(id);
  if (isNaN(alertId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  await db
    .update(alerts)
    .set({ status: body.data.status })
    .where(eq(alerts.id, alertId));

  return NextResponse.json({ ok: true });
}

