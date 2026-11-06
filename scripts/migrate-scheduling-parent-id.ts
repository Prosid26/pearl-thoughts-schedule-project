import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function migrateSchedulingParentId() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Skipping Postgres migration (local mode active).");
    return;
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL for Scheduling Parent Window Migration...");

  console.log("1. Adding parent_availability_id column to availability table...");
  await sql`
    ALTER TABLE availability 
    ADD COLUMN IF NOT EXISTS parent_availability_id INTEGER REFERENCES availability(availability_id) ON DELETE CASCADE;
  `;

  console.log("2. Updating unique index on availability table to include end_time...");
  await sql`
    DROP INDEX IF EXISTS doctor_date_slot_idx;
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS doctor_date_slot_window_idx 
    ON availability (doctor_id, available_date, start_time, end_time);
  `;

  console.log("Migration completed successfully.");
}

migrateSchedulingParentId().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

