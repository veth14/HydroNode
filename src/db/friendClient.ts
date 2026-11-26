// src/db/friendClient.ts
// Read-only connection to the friend's Neon DB (ep-square-star-be6fg2ub).
// This DB has a single table: sensor_data, written by the friend's ESP32/Flask server.
// Uses lazy initialization so importing in Next.js build never fails if env var is unset.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type FriendSqlClient = NeonQueryFunction<false, false>;

declare global {
  var __friendSql: FriendSqlClient | undefined;
}

export function hasFriendDbConfigured(): boolean {
  return Boolean(process.env.FRIEND_DATABASE_URL);
}

export function getFriendSql(): FriendSqlClient {
  const url = process.env.FRIEND_DATABASE_URL;
  if (!url) {
    throw new Error("FRIEND_DATABASE_URL environment variable is not set");
  }
  if (process.env.NODE_ENV === "production") {
    return neon(url);
  }
  return (globalThis.__friendSql ??= neon(url));
}

// Raw row shape returned from sensor_data queries
export interface FriendSensorRow {
  id: number;
  created_at: string; // ISO UTC string ending in Z (via SQL to_char)
  status: string | null;
  flow1: number | null;
  flow2: number | null;
  flow3: number | null;
  flow4: number | null;
  pressure1: number | null;
  pressure2: number | null;
  pressure3: number | null;
  pressure4: number | null;
  localization: string | null;
  confidence: number | null;
  pump_status: string | null;
}

export interface PumpTransitionRow {
  id: number;
  created_at: string; // ISO UTC string ending in Z
  pump_status: "ON" | "OFF";
  prev_pump_status: "ON" | "OFF" | null;
}
