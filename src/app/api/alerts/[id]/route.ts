// src/app/api/alerts/[id]/route.ts
// PATCH /api/alerts/[id] — acknowledge or resolve an alert and keep its zone status synchronized.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, zones } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const alertId = parseInt(id, 10);
  if (isNaN(alertId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = PatchSchema.safeParse(bodyJson);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const [updated] = await db
    .update(alerts)
    .set({ status: body.data.status })
    .where(eq(alerts.id, alertId))
    .returning({ zoneId: alerts.zoneId });

  // When resolving an alert, restore zone status to healthy if no other active alerts remain in that zone
  if (body.data.status === "resolved" && updated?.zoneId != null) {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .where(and(eq(alerts.zoneId, updated.zoneId), eq(alerts.status, "active")));

    if (Number(remaining?.count ?? 0) === 0) {
      await db.update(zones).set({ status: "healthy" }).where(eq(zones.id, updated.zoneId));
    }
  }

  return NextResponse.json({ ok: true });
}
