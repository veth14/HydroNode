// src/db/seed.ts
// Seeds stations S1–S4, zones 1–4, and default live calibration settings.
// Run: npm run db:seed

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { STATION_IDS, ZONES as RIG_ZONES, STATION_LATLNG } from "../config/rig";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url), { schema });

  console.log("Seeding stations S1–S4…");
  await db
    .insert(schema.stations)
    .values(
      STATION_IDS.map((id, idx) => ({
        id,
        name: `Station ${id}`,
        zoneUpstream: idx > 0 ? idx : null,
        zoneDownstream: idx + 1,
        lat: STATION_LATLNG[id][0],
        lng: STATION_LATLNG[id][1],
        status: "online",
        samplingMode: "normal",
      }))
    )
    .onConflictDoNothing();

  console.log("Seeding zones 1–4…");
  await db
    .insert(schema.zones)
    .values(
      RIG_ZONES.map((z) => ({
        id: z.id,
        name: `Zone ${z.id}`,
        stationA: z.stationA,
        stationB: z.stationB,
        status: "healthy",
      }))
    )
    .onConflictDoNothing();

  console.log("Seeding default settings…");
  const defaults = [
    // Baselines per station (Q0 L/min, P0 bar)
    { key: "baseline_S1", valueJson: { q0: 15.0, p0: 5.0 } },
    { key: "baseline_S2", valueJson: { q0: 14.8, p0: 4.9 } },
    { key: "baseline_S3", valueJson: { q0: 14.6, p0: 4.8 } },
    { key: "baseline_S4", valueJson: { q0: 14.4, p0: 4.7 } },
    // Severity thresholds (SI %)
    { key: "severity_thresholds", valueJson: { low: 5, medium: 10 } },
    // Repeated-alert window (minutes)
    { key: "repeat_alert_window_min", valueJson: { value: 10 } },
    // Data source
    { key: "data_source", valueJson: { value: "live" } },
    // Units
    { key: "units", valueJson: { flow: "L/min", pressure: "bar", vibration: "g" } },
  ];
  for (const row of defaults) {
    await db
      .insert(schema.settings)
      .values(row)
      .onConflictDoNothing();
  }

  console.log("Seed complete ✓");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
