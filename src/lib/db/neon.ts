import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const getDatabaseUrl = () => process.env.DATABASE_URL || "";

export const isNeonConfigured = Boolean(
  getDatabaseUrl() &&
    (getDatabaseUrl().startsWith("postgres://") ||
      getDatabaseUrl().startsWith("postgresql://")) &&
    !getDatabaseUrl().includes("user:password@ep-sample")
);

// Cached singleton client & drizzle instance to reuse HTTP keep-alive connections
export type NeonDatabase = ReturnType<typeof drizzle<typeof schema>>;
let cachedDb: NeonDatabase | null = null;
let cachedUrl: string | null = null;

export const getNeonDb = (): NeonDatabase | null => {
  const url = getDatabaseUrl();
  const valid = Boolean(
    url &&
      (url.startsWith("postgres://") || url.startsWith("postgresql://")) &&
      !url.includes("user:password@ep-sample")
  );

  if (!valid) return null;

  // Re-instantiate only if connection URL changes (e.g. env swap)
  if (!cachedDb || cachedUrl !== url) {
    const sql = neon(url);
    cachedDb = drizzle({ client: sql, schema });
    cachedUrl = url;
  }

  return cachedDb;
};
