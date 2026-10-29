import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = ['users', 'doctors', 'patients', 'availability', 'appointments', 'payments', 'refunds', 'webhook_events', 'notification_logs', 'scheduled_reminders'];
  
  console.log('--- NEON POSTGRESQL TABLE RECORD COUNTS ---');
  for (const t of tables) {
    try {
      const res = await sql.query(`SELECT COUNT(*) as cnt FROM ${t}`);
      console.log(`  ${t.padEnd(20)}: ${res[0].cnt} records`);
    } catch (e: any) {
      console.log(`  ${t.padEnd(20)}: Error (${e.message})`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

