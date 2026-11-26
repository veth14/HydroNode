// src/db/friendClient.ts
// Read-only connection to the friend's Neon DB (ep-square-star-be6fg2ub).
// This DB has a single table: sensor_data, written directly by the ESP32 firmware.
// We never write to this DB — it is owned by the other team.

import { neon } from "@neondatabase/serverless";

function getFriendSql() {
  const url = process.env.FRIEND_DATABASE_URL;
  if (!url) {
    throw new Error("FRIEND_DATABASE_URL environment variable is not set");
  }
  return neon(url);
}

declare global {
  var __friendSql: ReturnType<typeof getFriendSql> | undefined;
}

// Singleton — reuse across HMR reloads in dev
export const friendSql: ReturnType<typeof getFriendSql> =
  process.env.NODE_ENV === "production"
    ? getFriendSql()
    : (globalThis.__friendSql ??= getFriendSql());

// ── Types ─────────────────────────────────────────────────────────────────────
// Raw row shape from the friend's sensor_data table
export interface FriendSensorRow {
  id: number;
  created_at: string; // ISO string from postgres
  status: string; // "Normal" | "SensorFailure" | "LeakDetected" | etc.
  flow1: number;
  flow2: number;
  flow3: number;
  flow4: number;
  pressure1: number;
  pressure2: number;
  pressure3: number;
  pressure4: number;
  localization: string; // "None" | zone label
  confidence: number; // 0–100
  pump_status: "ON" | "OFF";
}
