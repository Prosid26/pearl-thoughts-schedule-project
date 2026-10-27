import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { eq } from "drizzle-orm";

// Helper to compute future dates YYYY-MM-DD
function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function seed() {
  console.log("=========================================================");
  console.log("SEEDING NEON POSTGRESQL DATABASE (IDEMPOTENT & SAFE)");
  console.log("=========================================================\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL is not defined in .env.local");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle({ client: sql, schema });

  // 1. Password Hash (Bcrypt)
  const defaultPasswordHash = await hashPassword("Password123!");

  // 2. Define Demo Users
  const demoUsers = [
    // Patients
    {
      full_name: "John Doe",
      email: "patient@demo.com",
      phone: "+1 (555) 234-5678",
      role: "patient" as const,
      patientDetails: {
        date_of_birth: "1992-05-14",
        gender: "Male",
        address: "742 Evergreen Terrace, Springfield, IL",
      },
    },
    {
      full_name: "Jane Smith",
      email: "jane@demo.com",
      phone: "+1 (555) 876-5432",
      role: "patient" as const,
      patientDetails: {
        date_of_birth: "1996-11-22",
        gender: "Female",
        address: "128 Beacon St, Boston, MA",
      },
    },
    // Doctors
    {
      full_name: "Dr. Sarah Jenkins",
      email: "doctor.sarah@demo.com",
      phone: "+1 (555) 901-2345",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Cardiology",
        qualification: "MBBS, MD, FACC (Harvard Medical School)",
        experience_years: 15,
        consultation_fee: "120.00",
        bio: "Dr. Sarah Jenkins is an internationally recognized consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension, and heart rhythm management.",
        avatar_url:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
        clinic_address: "Pearl Thought Heart Pavilion, Suite 402, Boston, MA",
      },
    },
    {
      full_name: "Dr. Marcus Vance",
      email: "doctor.marcus@demo.com",
      phone: "+1 (555) 345-6789",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Dermatology",
        qualification: "MD Dermatology (Johns Hopkins University)",
        experience_years: 11,
        consultation_fee: "95.00",
        bio: "Dr. Marcus Vance provides comprehensive clinical and cosmetic dermatologic care. Specializing in eczema, psoriasis, acne management, and laser therapies.",
        avatar_url:
          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
        clinic_address:
          "Aesthetic & Clinical Derma Center, 5th Floor, New York, NY",
      },
    },
    {
      full_name: "Dr. Elena Rostova",
      email: "doctor.elena@demo.com",
      phone: "+1 (555) 456-7890",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Neurology",
        qualification: "MD, PhD Neurology (Stanford University)",
        experience_years: 18,
        consultation_fee: "160.00",
        bio: "Dr. Elena Rostova is a board-certified neurologist focusing on complex migraine syndromes, neuro-degenerative diseases, and sleep disorders.",
        avatar_url:
          "https://images.unsplash.com/photo-1594824813593-7859c7717462?auto=format&fit=crop&q=80&w=300",
        clinic_address:
          "Stanford Neurocare Pavilion, Suite 12B, Palo Alto, CA",
      },
    },
    {
      full_name: "Dr. David Chen",
      email: "doctor.david@demo.com",
      phone: "+1 (555) 567-8901",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Pediatrics",
        qualification: "MD, FAAP Pediatrics (Columbia University)",
        experience_years: 12,
        consultation_fee: "85.00",
        bio: "Dr. David Chen is beloved for his gentle, attentive care with newborns, children, and adolescents. Specializing in childhood immunization and wellness.",
        avatar_url:
          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300",
        clinic_address: "Columbia Children Wellness Clinic, Chicago, IL",
      },
    },
    {
      full_name: "Dr. Priya Sharma",
      email: "doctor.priya@demo.com",
      phone: "+1 (555) 678-9012",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Orthopedics",
        qualification: "MBBS, MS Ortho, MCh (AIIMS & Oxford)",
        experience_years: 14,
        consultation_fee: "140.00",
        bio: "Dr. Priya Sharma specializes in joint preservation, arthroscopic knee and shoulder reconstruction, and sports medicine rehabilitation for active adults.",
        avatar_url:
          "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300",
        clinic_address: "Metropolitan Bone & Joint Center, Seattle, WA",
      },
    },
  ];

  const seededDoctors: { doctor_id: number; user_id: number; email: string }[] =
    [];
  const seededPatients: {
    patient_id: number;
    user_id: number;
    email: string;
  }[] = [];

  for (const uData of demoUsers) {
    // Check if user already exists (idempotent, never overwrite existing accounts)
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, uData.email.toLowerCase().trim()))
      .limit(1);

    let userId: number;
    if (existing.length > 0) {
      userId = existing[0].user_id;
      console.log(`  • User '${uData.email}' already exists (ID: ${userId}), keeping existing record.`);
    } else {
      const inserted = await db
        .insert(schema.users)
        .values({
          full_name: uData.full_name,
          email: uData.email.toLowerCase().trim(),
          phone: uData.phone,
          password_hash: defaultPasswordHash,
          role: uData.role,
        })
        .returning();
      userId = inserted[0].user_id;
      console.log(`  ✓ Inserted user '${uData.email}' (ID: ${userId})`);
    }

    // Role-specific records
    if (uData.role === "patient" && uData.patientDetails) {
      const existingPatient = await db
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.user_id, userId))
        .limit(1);

      let patientId: number;
      if (existingPatient.length > 0) {
        patientId = existingPatient[0].patient_id;
      } else {
        const insertedPatient = await db
          .insert(schema.patients)
          .values({
            user_id: userId,
            ...uData.patientDetails,
          })
          .returning();
        patientId = insertedPatient[0].patient_id;
        console.log(`    ↳ Inserted patient profile (ID: ${patientId})`);
      }
      seededPatients.push({ patient_id: patientId, user_id: userId, email: uData.email });
    } else if (uData.role === "doctor" && uData.doctorDetails) {
      const existingDoc = await db
        .select()
        .from(schema.doctors)
        .where(eq(schema.doctors.user_id, userId))
        .limit(1);

      let doctorId: number;
      if (existingDoc.length > 0) {
        doctorId = existingDoc[0].doctor_id;
      } else {
        const insertedDoc = await db
          .insert(schema.doctors)
          .values({
            user_id: userId,
            ...uData.doctorDetails,
          })
          .returning();
        doctorId = insertedDoc[0].doctor_id;
        console.log(`    ↳ Inserted doctor profile (ID: ${doctorId})`);
      }
      seededDoctors.push({ doctor_id: doctorId, user_id: userId, email: uData.email });
    }
  }

  // 3. Seed Future Availability Slots
  console.log("\nSeeding future availability slots...");
  const date1 = getFutureDate(1);
  const date2 = getFutureDate(2);
  const date3 = getFutureDate(3);
  const date4 = getFutureDate(4);

  let sampleAvailabilityId: number | null = null;
  let sampleDoctorId: number | null = null;

  for (const doc of seededDoctors) {
    const slots = [
      { date: date1, start: "09:00", end: "09:30" },
      { date: date1, start: "09:30", end: "10:00" },
      { date: date1, start: "10:00", end: "10:30" },
      { date: date1, start: "11:00", end: "11:30" },
      { date: date1, start: "14:00", end: "14:30" },
      { date: date2, start: "10:00", end: "10:30" },
      { date: date2, start: "11:00", end: "11:30" },
      { date: date3, start: "14:30", end: "15:00" },
      { date: date4, start: "15:30", end: "16:00" },
    ];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      // Check if slot exists
      const existingSlot = await db
        .select()
        .from(schema.availability)
        .where(
          eq(schema.availability.doctor_id, doc.doctor_id)
        );

      const alreadyExists = existingSlot.some(
        (slot) =>
          slot.available_date === s.date && slot.start_time === s.start
      );

      if (!alreadyExists) {
        const isReservedSample =
          doc.email === "doctor.sarah@demo.com" &&
          s.date === date1 &&
          s.start === "10:00";

        const insertedSlot = await db
          .insert(schema.availability)
          .values({
            doctor_id: doc.doctor_id,
            available_date: s.date,
            start_time: s.start,
            end_time: s.end,
            slot_duration: 30,
            is_available: !isReservedSample,
          })
          .returning();

        if (isReservedSample) {
          sampleAvailabilityId = insertedSlot[0].availability_id;
          sampleDoctorId = doc.doctor_id;
        }
      }
    }
  }
  console.log("  ✓ Availability slots processed.");

  // 4. Seed Initial Sample Appointment if Not Present
  if (sampleAvailabilityId && sampleDoctorId && seededPatients.length > 0) {
    const patientJohn = seededPatients.find(
      (p) => p.email === "patient@demo.com"
    );
    if (patientJohn) {
      const existingApp = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.availability_id, sampleAvailabilityId))
        .limit(1);

      if (existingApp.length === 0) {
        await db.insert(schema.appointments).values({
          patient_id: patientJohn.patient_id,
          doctor_id: sampleDoctorId,
          availability_id: sampleAvailabilityId,
          appointment_date: new Date(`${date1}T10:00:00Z`),
          status: "confirmed",
          reason: "Annual routine cardiac checkup and blood pressure review.",
        });
        console.log("  ✓ Inserted active sample appointment for demo dashboard visualization.");
      }
    }
  }

  console.log("\n=========================================================");
  console.log("NEON SEEDING COMPLETED SUCCESSFULLY!");
  console.log("Demo Accounts (Password: Password123!):");
  console.log("  • patient@demo.com (John Doe)");
  console.log("  • jane@demo.com (Jane Smith)");
  console.log("  • doctor.sarah@demo.com (Dr. Sarah Jenkins - Cardiology)");
  console.log("  • doctor.marcus@demo.com (Dr. Marcus Vance - Dermatology)");
  console.log("  • doctor.elena@demo.com (Dr. Elena Rostova - Neurology)");
  console.log("  • doctor.david@demo.com (Dr. David Chen - Pediatrics)");
  console.log("  • doctor.priya@demo.com (Dr. Priya Sharma - Orthopedics)");
  console.log("=========================================================\n");
}

seed().catch((err) => {
  console.error("Seeding Error:", err);
  process.exit(1);
});
