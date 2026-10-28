import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function check() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found in .env.local");
    return;
  }
  const sql = neon(process.env.DATABASE_URL);
  try {
    console.log("Neon database connected successfully.");
    const usersCount = await sql`SELECT count(*)::int as count FROM users;`;
    const patientsCount = await sql`SELECT count(*)::int as count FROM patients;`;
    const doctorsCount = await sql`SELECT count(*)::int as count FROM doctors;`;
    const availabilityCount = await sql`SELECT count(*)::int as count FROM availability;`;
    const appointmentsCount = await sql`SELECT count(*)::int as count FROM appointments;`;

    console.log(`  • users: ${usersCount[0].count} rows`);
    console.log(`  • patients: ${patientsCount[0].count} rows`);
    console.log(`  • doctors: ${doctorsCount[0].count} rows`);
    console.log(`  • availability: ${availabilityCount[0].count} rows`);
    console.log(`  • appointments: ${appointmentsCount[0].count} rows`);

    const users = await sql`SELECT user_id, full_name, email, role FROM users ORDER BY user_id;`;
    const docs = await sql`SELECT doctor_id, user_id, specialization, consultation_fee, avatar_url, clinic_address FROM doctors ORDER BY doctor_id;`;
    console.log("Users:", JSON.stringify(users, null, 2));
    console.log("Doctors:", JSON.stringify(docs, null, 2));
  } catch (err: any) {
    console.error("Neon Query Error:", err.message);
  }
}

check();
