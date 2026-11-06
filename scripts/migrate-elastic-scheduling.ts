import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function migrateElasticScheduling() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Skipping Postgres migration (local mode active).");
    return;
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL for Elastic Scheduling Schema Migration...");

  console.log("1. Adding is_outside_schedule, requires_review, and review_reason to appointments table...");
  await sql`
    ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS is_outside_schedule BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS review_reason TEXT;
  `;

  console.log("Migration completed successfully!");
}

migrateElasticScheduling().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

