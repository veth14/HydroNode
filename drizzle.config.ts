// drizzle.config.ts
// Configuration for drizzle-kit migrations.
// Uses DATABASE_URL_UNPOOLED (direct connection) for migrations.

import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
} satisfies Config;

