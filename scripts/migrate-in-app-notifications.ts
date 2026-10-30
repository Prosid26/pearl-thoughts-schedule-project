import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

export async function migrateInAppNotifications() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not configured.");
    return false;
  }

  const sql = neon(databaseUrl);
  console.log("Connecting to Neon PostgreSQL for In-App Notifications Migration...");

  try {
    // 1. Create in_app_notifications table
    console.log("1. Creating in_app_notifications table...");
    await sql`
      CREATE TABLE IF NOT EXISTS in_app_notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        appointment_id INTEGER REFERENCES appointments(appointment_id) ON DELETE SET NULL,
        action_url VARCHAR(255),
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        idempotency_key VARCHAR(150) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Indexes for performance
    console.log("2. Creating indexes for in_app_notifications...");
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notif_user ON in_app_notifications(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notif_appt ON in_app_notifications(appointment_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notif_is_read ON in_app_notifications(is_read);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_in_app_notif_created ON in_app_notifications(created_at DESC);`;

    // 3. Add in_app_enabled to notification_preferences if it exists
    console.log("3. Adding in_app_enabled column to notification_preferences...");
    await sql`
      ALTER TABLE notification_preferences
      ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN NOT NULL DEFAULT true;
    `;

    console.log("In-App Notifications Migration completed successfully!");
    return true;
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  }
}

if (require.main === module) {
  migrateInAppNotifications()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

