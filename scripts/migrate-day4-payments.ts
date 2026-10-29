import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function migrateDay4() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL for Day 4 Migration...");

  // 1. Add payment_status to appointments
  console.log("1. Adding payment_status column to appointments table...");
  await sql`
    ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid';
  `;

  // 2. Create payments table
  console.log("2. Creating payments table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'razorpay',
      provider_order_id VARCHAR(100) NOT NULL UNIQUE,
      provider_payment_id VARCHAR(100),
      provider_signature TEXT,
      amount INTEGER NOT NULL, -- minor units (paise)
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      idempotency_key VARCHAR(100) UNIQUE,
      failure_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Create refunds table
  console.log("3. Creating refunds table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS refunds (
      refund_id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
      appointment_id INTEGER NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
      amount INTEGER NOT NULL, -- minor units (paise)
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      reason TEXT NOT NULL,
      policy_applied VARCHAR(100) NOT NULL,
      provider VARCHAR(30) NOT NULL DEFAULT 'razorpay',
      provider_refund_id VARCHAR(100) UNIQUE,
      idempotency_key VARCHAR(100) UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE
    );
  `;

  // 4. Create webhook_events table
  console.log("4. Creating webhook_events table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id SERIAL PRIMARY KEY,
      provider VARCHAR(30) NOT NULL DEFAULT 'razorpay',
      provider_event_id VARCHAR(150) NOT NULL UNIQUE,
      event_type VARCHAR(100) NOT NULL,
      payload TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'processed',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 5. Create notification_logs table
  console.log("5. Creating notification_logs table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS notification_logs (
      delivery_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      recipient_email VARCHAR(255) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'email',
      event_type VARCHAR(50) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      appointment_id INTEGER REFERENCES appointments(appointment_id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'delivered',
      provider VARCHAR(50) NOT NULL DEFAULT 'console',
      provider_message_id VARCHAR(150),
      idempotency_key VARCHAR(100) UNIQUE,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 6. Create scheduled_reminders table
  console.log("6. Creating scheduled_reminders table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS scheduled_reminders (
      reminder_id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
      reminder_type VARCHAR(50) NOT NULL DEFAULT '24h_before',
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      sent_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 7. Indexes
  console.log("7. Creating performance & uniqueness indexes...");
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_appt ON payments(appointment_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(provider_order_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_refunds_appt ON refunds(appointment_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_pid ON webhook_events(provider, provider_event_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON notification_logs(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notif_logs_appt ON notification_logs(appointment_id);`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS appt_reminder_type_idx ON scheduled_reminders(appointment_id, reminder_type);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON scheduled_reminders(status, scheduled_for);`;

  console.log("Day 4 Database Migration completed successfully!");
}

migrateDay4().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

