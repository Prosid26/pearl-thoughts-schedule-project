import { neon } from "@neondatabase/serverless";

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(url);

  console.log("Creating notification_preferences table in Neon PostgreSQL...");
  await sql`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      preference_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      email_enabled BOOLEAN NOT NULL DEFAULT true,
      sms_enabled BOOLEAN NOT NULL DEFAULT true,
      whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
      appointment_confirmations BOOLEAN NOT NULL DEFAULT true,
      appointment_reminders BOOLEAN NOT NULL DEFAULT true,
      cancellation_rescheduling BOOLEAN NOT NULL DEFAULT true,
      payment_confirmations BOOLEAN NOT NULL DEFAULT true,
      refund_updates BOOLEAN NOT NULL DEFAULT true,
      unsubscribed_all BOOLEAN NOT NULL DEFAULT false,
      sms_consent BOOLEAN NOT NULL DEFAULT true,
      whatsapp_consent BOOLEAN NOT NULL DEFAULT true,
      consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);`;

  console.log("notification_preferences table created successfully in Neon PostgreSQL!");
}

migrate().catch(console.error);

