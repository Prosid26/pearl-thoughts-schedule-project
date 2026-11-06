import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function migrateClinicsAndReceptionists() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Skipping Postgres migration (local mode active).");
    return;
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL for Clinics & Receptionist Schema Migration...");

  console.log("1. Creating clinics table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS clinics (
      clinic_id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      address TEXT NOT NULL,
      phone VARCHAR(30) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  console.log("2. Creating receptionists table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS receptionists (
      receptionist_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      clinic_id INTEGER NOT NULL REFERENCES clinics(clinic_id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  console.log("3. Creating receptionist_invitations table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS receptionist_invitations (
      invitation_id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(clinic_id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      created_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  console.log("4. Adding clinic_id to doctors table...");
  await sql`
    ALTER TABLE doctors 
    ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(clinic_id) ON DELETE SET NULL;
  `;

  console.log("5. Adding is_blocked & block_reason to availability table...");
  await sql`
    ALTER TABLE availability 
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
  `;
  await sql`
    ALTER TABLE availability 
    ADD COLUMN IF NOT EXISTS block_reason TEXT;
  `;

  console.log("6. Adding booked_by_user_id & booked_by_role to appointments table...");
  await sql`
    ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS booked_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
  `;
  await sql`
    ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS booked_by_role VARCHAR(20);
  `;

  console.log("7. Seeding initial clinics if empty...");
  const existingClinics = await sql`SELECT count(*) FROM clinics;`;
  if (parseInt(existingClinics[0].count, 10) === 0) {
    await sql`
      INSERT INTO clinics (clinic_id, name, address, phone) VALUES
      (1, 'Apex Heart & Medical Center', 'Suite 402, Link Road, Andheri West, Mumbai', '+91 22 2630 1122'),
      (2, 'Twacha Healthcare Clinic', 'Hill Road, Bandra West, Mumbai', '+91 22 2640 3344'),
      (3, 'Mind & Nerve Healthcare Center', 'Central Avenue, Hiranandani Gardens, Powai, Mumbai', '+91 22 2570 5566'),
      (4, 'Vatsalya Children''s & Family Clinic', 'Gokhale Road, Dadar West, Mumbai', '+91 22 2430 7788')
      ON CONFLICT (clinic_id) DO NOTHING;
    `;
    await sql`SELECT setval('clinics_clinic_id_seq', (SELECT MAX(clinic_id) FROM clinics));`;
    console.log("Seeded 4 default clinics.");
  }

  console.log("8. Updating doctor clinic associations...");
  await sql`UPDATE doctors SET clinic_id = 1 WHERE doctor_id IN (1, 5, 6) AND (clinic_id IS NULL OR clinic_id = 1);`;
  await sql`UPDATE doctors SET clinic_id = 2 WHERE doctor_id IN (2, 7) AND (clinic_id IS NULL OR clinic_id = 2);`;
  await sql`UPDATE doctors SET clinic_id = 3 WHERE doctor_id IN (3, 8) AND (clinic_id IS NULL OR clinic_id = 3);`;
  await sql`UPDATE doctors SET clinic_id = 4 WHERE doctor_id = 4 AND (clinic_id IS NULL OR clinic_id = 4);`;

  console.log("Migration completed successfully.");
}

migrateClinicsAndReceptionists().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

