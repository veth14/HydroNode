// scripts/seed-30d-history.ts
// Seeds 30 days of realistic minute/hourly historical telemetry for stations S1–S6 into Neon DB.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const STATION_BASELINES: Record<string, { q0: number; p0: number }> = {
  S1: { q0: 15.0, p0: 5.0 },
  S2: { q0: 14.8, p0: 4.9 },
  S3: { q0: 14.6, p0: 4.8 },
  S4: { q0: 14.4, p0: 4.7 },
  S5: { q0: 14.2, p0: 4.6 },
  S6: { q0: 14.0, p0: 4.5 },
};

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url), { schema });

  console.log("Generating 30 days of historical aggregates for stations S1–S6...");

  const now = new Date();
  const totalHours = 30 * 24; // 720 hours
  const stepHours = 2; // Every 2 hours = 360 data points per station spanning 30 days
  const rows: (typeof schema.readingsMinute.$inferInsert)[] = [];

  const stations = ["S1", "S2", "S3", "S4", "S5", "S6"];

  for (let h = totalHours; h >= 0; h -= stepHours) {
    const timestamp = new Date(now.getTime() - h * 60 * 60 * 1000);
    const hourOfDay = timestamp.getHours();
    
    // Diurnal factor (higher demand in morning 7-9am and evening 6-9pm)
    const diurnalFlow = Math.sin((hourOfDay - 6) * (Math.PI / 12)) * 1.2;
    const diurnalPress = -diurnalFlow * 0.08;

    // Is this within the recent 24-hour leak event on S2?
    const isRecentLeak = h <= 24;

    for (const sid of stations) {
      const base = STATION_BASELINES[sid];
      let flow = base.q0 + diurnalFlow + (Math.random() - 0.5) * 0.3;
      let press = base.p0 + diurnalPress + (Math.random() - 0.5) * 0.05;
      let vibRms = 0.075 + Math.random() * 0.02;

      // Leak anomaly on downstream stations during recent leak
      if (isRecentLeak) {
        if (sid === "S2") {
          vibRms = 0.25 + Math.random() * 0.04;
          flow -= 1.8;
          press -= 0.35;
        } else if (["S3", "S4", "S5", "S6"].includes(sid)) {
          flow -= 2.2;
          press -= 0.45;
          vibRms = 0.12 + Math.random() * 0.03;
        }
      }

      rows.push({
        stationId: sid,
        minuteTs: timestamp,
        flowAvg: Number(flow.toFixed(2)),
        flowMin: Number((flow - 0.4).toFixed(2)),
        flowMax: Number((flow + 0.4).toFixed(2)),
        pressureAvg: Number(press.toFixed(2)),
        pressureMin: Number((press - 0.1).toFixed(2)),
        pressureMax: Number((press + 0.1).toFixed(2)),
        vibAvg: Number(vibRms.toFixed(3)),
        vibMax: Number((vibRms * 1.5).toFixed(3)),
        sampleCount: 120,
      });
    }
  }

  console.log(`Total rows to insert: ${rows.length}. Inserting in batches of 200...`);

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db
      .insert(schema.readingsMinute)
      .values(batch)
      .onConflictDoNothing();
    process.stdout.write(`Inserted ${Math.min(i + batchSize, rows.length)} / ${rows.length}\r`);
  }

  console.log("\n30-day historical seed completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding 30-day history:", err);
  process.exit(1);
});
