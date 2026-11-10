// src/db/schema.ts
// Drizzle ORM schema for HydroNode.

import {
  pgTable,
  serial,
  varchar,
  integer,
  real,
  timestamp,
  text,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// stations
// ---------------------------------------------------------------------------
export const stations = pgTable("stations", {
  id: varchar("id", { length: 10 }).primaryKey(), // S1–S6
  name: varchar("name", { length: 100 }).notNull(),
  zoneUpstream: integer("zone_upstream"),
  zoneDownstream: integer("zone_downstream"),
  lat: real("lat"),
  lng: real("lng"),
  status: varchar("status", { length: 20 }).notNull().default("online"),
  samplingMode: varchar("sampling_mode", { length: 20 })
    .notNull()
    .default("normal"),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// zones
// ---------------------------------------------------------------------------
export const zones = pgTable("zones", {
  id: integer("id").primaryKey(), // 1–5
  name: varchar("name", { length: 100 }).notNull(),
  stationA: varchar("station_a", { length: 10 }).notNull(),
  stationB: varchar("station_b", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("healthy"),
});

// ---------------------------------------------------------------------------
// readings_raw   — keep only the last 48 h (cleaned up daily by cron)
// ---------------------------------------------------------------------------
export const readingsRaw = pgTable(
  "readings_raw",
  {
    id: serial("id").primaryKey(),
    stationId: varchar("station_id", { length: 10 })
      .notNull()
      .references(() => stations.id),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    flow: real("flow").notNull(),
    pressure: real("pressure").notNull(),
    vibration: real("vibration").notNull(),
  },
  (t) => [index("idx_raw_station_ts").on(t.stationId, t.ts)]
);

// ---------------------------------------------------------------------------
// readings_minute  — 1 row per station per minute; kept long-term
// ---------------------------------------------------------------------------
export const readingsMinute = pgTable(
  "readings_minute",
  {
    stationId: varchar("station_id", { length: 10 })
      .notNull()
      .references(() => stations.id),
    minuteTs: timestamp("minute_ts", { withTimezone: true }).notNull(),
    flowAvg: real("flow_avg").notNull(),
    flowMin: real("flow_min").notNull(),
    flowMax: real("flow_max").notNull(),
    pressureAvg: real("pressure_avg").notNull(),
    pressureMin: real("pressure_min").notNull(),
    pressureMax: real("pressure_max").notNull(),
    vibAvg: real("vib_avg").notNull(),
    vibMax: real("vib_max").notNull(),
    sampleCount: integer("sample_count").notNull().default(1),
  },
  (t) => [
    uniqueIndex("idx_minute_unique").on(t.stationId, t.minuteTs),
    index("idx_minute_station_ts").on(t.stationId, t.minuteTs),
  ]
);

// ---------------------------------------------------------------------------
// alerts  — permanent
// ---------------------------------------------------------------------------
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  stationId: varchar("station_id", { length: 10 })
    .notNull()
    .references(() => stations.id),
  zoneId: integer("zone_id").references(() => zones.id),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  featuresJson: jsonb("features_json"),
  confidence: real("confidence").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // low / medium / high
  si: real("si"), // severity index %
  leakRate: real("leak_rate"), // L/min
  recommendedAction: text("recommended_action"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  repeatCount: integer("repeat_count").notNull().default(1),
});

// ---------------------------------------------------------------------------
// settings  — key-value store (editable from Settings page)
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  valueJson: jsonb("value_json").notNull(),
});

