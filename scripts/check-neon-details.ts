import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql.query('SELECT a.appointment_id, a.appointment_date, s.start_time, s.end_time FROM appointments a LEFT JOIN availability s ON a.availability_id = s.availability_id LIMIT 5');
  console.log(rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
