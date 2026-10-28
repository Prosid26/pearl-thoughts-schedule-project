import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { hashPassword } from "../src/lib/auth/password";

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL...");

  // 1. Create waiting_queue table
  console.log("1. Creating waiting_queue table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS waiting_queue (
      queue_id SERIAL PRIMARY KEY,
      doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
      patient_id INTEGER REFERENCES patients(patient_id) ON DELETE SET NULL,
      patient_name VARCHAR(150) NOT NULL,
      patient_phone VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'waiting',
      check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 2. Create early_slot_offers table
  console.log("2. Creating early_slot_offers table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS early_slot_offers (
      offer_id SERIAL PRIMARY KEY,
      slot_id INTEGER NOT NULL REFERENCES availability(availability_id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
      queue_id INTEGER REFERENCES waiting_queue(queue_id) ON DELETE SET NULL,
      original_appointment_id INTEGER REFERENCES appointments(appointment_id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      offered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      responded_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Create notifications table
  console.log("3. Creating notifications table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'general',
      related_offer_id INTEGER REFERENCES early_slot_offers(offer_id) ON DELETE SET NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 4. Create performance indexes
  console.log("4. Creating performance indexes...");
  await sql`
    CREATE INDEX IF NOT EXISTS idx_waiting_queue_doc_status ON waiting_queue(doctor_id, status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_early_offers_status ON early_slot_offers(status, expires_at);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_early_offers_patient ON early_slot_offers(patient_id, status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
  `;

  // 5. Ensure admin account exists
  console.log("5. Checking Reception / Staff Admin user...");
  const adminUsers = await sql`
    SELECT user_id, full_name, email, role FROM users WHERE email = 'admin@demo.com';
  `;

  if (adminUsers.length === 0) {
    const defaultPasswordHash = await hashPassword("Password123!");
    await sql`
      INSERT INTO users (full_name, email, phone, password_hash, role)
      VALUES (
        'Sunita Deshpande',
        'admin@demo.com',
        '+91 98200 99887',
        ${defaultPasswordHash},
        'admin'
      );
    `;
    console.log("  -> Created admin@demo.com (Sunita Deshpande - Reception Desk)");
  } else {
    console.log("  -> admin@demo.com already exists.");
  }

  // 6. Check if any waiting queue entries exist, add a demo one if empty
  const queueCount = await sql`SELECT count(*)::int as count FROM waiting_queue;`;
  if (queueCount[0].count === 0) {
    console.log("6. Adding initial demo walk-in patients to waiting queue...");
    // Let's find Dr. Ananya Sharma (doctor_id 1)
    await sql`
      INSERT INTO waiting_queue (doctor_id, patient_id, patient_name, patient_phone, status, notes)
      VALUES (
        1,
        NULL,
        'Vikram Malhotra',
        '+91 98111 22334',
        'waiting',
        'Walk-in check-in at 09:30 AM. Routine cardiology follow-up.'
      );
    `;
    console.log("  -> Inserted sample walk-in patient Vikram Malhotra");
  }

  console.log("\nMigration completed successfully on Neon PostgreSQL!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
