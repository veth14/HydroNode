// src/db/client.ts
// Singleton Neon serverless client for use in Next.js Route Handlers.
// Uses @neondatabase/serverless over HTTP — no persistent connection needed.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// In development, avoid creating multiple connections across HMR reloads.
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof getDb> | undefined;
}

export const db: ReturnType<typeof getDb> =
  process.env.NODE_ENV === "production" ? getDb() : (globalThis.__db ??= getDb());

