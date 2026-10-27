import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";

export const isNeonConfigured = Boolean(
  databaseUrl &&
    (databaseUrl.startsWith("postgres://") ||
      databaseUrl.startsWith("postgresql://")) &&
    !databaseUrl.includes("user:password@ep-sample")
);

export const getNeonDb = () => {
  if (!isNeonConfigured) return null;
  const sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
};
