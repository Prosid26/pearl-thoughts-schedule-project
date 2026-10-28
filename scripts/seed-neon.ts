import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { eq, or } from "drizzle-orm";

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
  console.log("SEEDING NEON POSTGRESQL DATABASE (INDIAN HEALTHCARE DATA)");
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

  // 2. Define Demo Users & Realistic Indian Healthcare Profiles
  const demoUsers = [
    // Patients
    {
      full_name: "Aarav Sharma",
      email: "patient@demo.com",
      legacyEmail: "patient@demo.com",
      phone: "+91 98200 11223",
      role: "patient" as const,
      patientDetails: {
        date_of_birth: "1992-05-14",
        gender: "Male",
        address: "204 Silver Arch, Lokhandwala Complex, Andheri West, Mumbai",
      },
    },
    {
      full_name: "Priya Verma",
      email: "jane@demo.com",
      legacyEmail: "jane@demo.com",
      phone: "+91 98200 44556",
      role: "patient" as const,
      patientDetails: {
        date_of_birth: "1996-11-22",
        gender: "Female",
        address: "501 Sea View Apartments, Hill Road, Bandra West, Mumbai",
      },
    },

    // Doctors (Realistic Indian Demo Profiles with INR Consultation Fees)
    // Doctor 1 (Preserves ID 1): Dr. Ananya Sharma — Cardiologist (Andheri West, Mumbai)
    {
      targetDoctorId: 1,
      full_name: "Dr. Ananya Sharma",
      email: "doctor.ananya@demo.com",
      legacyEmail: "doctor.sarah@demo.com",
      phone: "+91 98201 23456",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Cardiology",
        qualification: "MBBS, MD (Medicine), DM (Cardiology - AIIMS New Delhi)",
        experience_years: 14,
        consultation_fee: "1000.00",
        bio: "Dr. Ananya Sharma is a senior consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension management, and heart rhythm disorders.",
        avatar_url: null,
        clinic_address: "Apex Heart & Vascular Clinic, Suite 402, Link Road, Andheri West, Mumbai",
      },
    },

    // Doctor 2 (Preserves ID 2): Dr. Priya Nair — Dermatologist (Bandra West, Mumbai)
    {
      targetDoctorId: 2,
      full_name: "Dr. Priya Nair",
      email: "doctor.priya@demo.com",
      legacyEmail: "doctor.marcus@demo.com",
      phone: "+91 98202 34567",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Dermatology",
        qualification: "MBBS, MD (Dermatology, Venereology & Leprosy - Grant Medical College)",
        experience_years: 11,
        consultation_fee: "800.00",
        bio: "Dr. Priya Nair provides expert medical and aesthetic dermatological care, focusing on chronic eczema, acne scar treatments, psoriasis, and pediatric skin conditions.",
        avatar_url: null,
        clinic_address: "Twacha Skin & Aesthetic Clinic, Hill Road, Bandra West, Mumbai",
      },
    },

    // Doctor 3 (Preserves ID 3): Dr. Rohan Iyer — Neurologist (Powai, Mumbai)
    {
      targetDoctorId: 3,
      full_name: "Dr. Rohan Iyer",
      email: "doctor.rohan@demo.com",
      legacyEmail: "doctor.elena@demo.com",
      phone: "+91 98203 45678",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Neurology",
        qualification: "MBBS, MD (Medicine), DM (Neurology - NIMHANS Bengaluru)",
        experience_years: 16,
        consultation_fee: "1200.00",
        bio: "Dr. Rohan Iyer is a senior consultant neurologist focusing on stroke rehabilitation, epilepsy management, migraine headaches, Parkinson's disease, and neurophysiology.",
        avatar_url: null,
        clinic_address: "Mind & Nerve Healthcare, Central Avenue, Hiranandani Gardens, Powai, Mumbai",
      },
    },

    // Doctor 4 (Preserves ID 4): Dr. Sneha Kulkarni — Pediatrician (Dadar West, Mumbai)
    {
      targetDoctorId: 4,
      full_name: "Dr. Sneha Kulkarni",
      email: "doctor.sneha@demo.com",
      legacyEmail: "doctor.david@demo.com",
      phone: "+91 98204 56789",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Pediatrics",
        qualification: "MBBS, DCH, DNB (Pediatrics - Bai Jerbai Wadia Hospital for Children)",
        experience_years: 12,
        consultation_fee: "700.00",
        bio: "Dr. Sneha Kulkarni is known for compassionate pediatric care, specializing in newborn care, developmental assessment, childhood vaccinations, and nutrition counseling.",
        avatar_url: null,
        clinic_address: "Vatsalya Children's Clinic, Gokhale Road, Dadar West, Mumbai",
      },
    },

    // Doctor 5 (Preserves ID 5): Dr. Rahul Mehta — Orthopedic Specialist (Goregaon West, Mumbai)
    {
      targetDoctorId: 5,
      full_name: "Dr. Rahul Mehta",
      email: "doctor.rahul@demo.com",
      legacyEmail: "doctor.priyasharma@demo.com",
      phone: "+91 98205 67890",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Orthopedics",
        qualification: "MBBS, MS (Orthopedics - KEM Hospital Mumbai), Fellowship in Joint Replacement",
        experience_years: 15,
        consultation_fee: "900.00",
        bio: "Dr. Rahul Mehta specializes in robotic joint replacement, arthroscopic knee and shoulder surgery, sports medicine, and complex fracture care.",
        avatar_url: null,
        clinic_address: "Mehta Bone & Joint Clinic, S.V. Road, Goregaon West, Mumbai",
      },
    },

    // Doctor 6 (ID 6): Dr. Arjun Deshmukh — General Physician (Thane West, Maharashtra)
    {
      targetDoctorId: 6,
      full_name: "Dr. Arjun Deshmukh",
      email: "doctor.arjun@demo.com",
      phone: "+91 98206 78901",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "General Medicine",
        qualification: "MBBS, MD (General Medicine - B.J. Medical College Pune)",
        experience_years: 13,
        consultation_fee: "500.00",
        bio: "Dr. Arjun Deshmukh is a trusted family physician with comprehensive expertise in diabetes management, infectious diseases, preventive health screenings, and geriatric care.",
        avatar_url: null,
        clinic_address: "Deshmukh Family Healthcare, Teen Hath Naka, Thane West, Maharashtra",
      },
    },

    // Doctor 7 (ID 7): Dr. Aditi Patel — Gynecologist (Navi Mumbai, Maharashtra)
    {
      targetDoctorId: 7,
      full_name: "Dr. Aditi Patel",
      email: "doctor.aditi@demo.com",
      phone: "+91 98207 89012",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Gynecology",
        qualification: "MBBS, MS (Obstetrics & Gynecology - Seth GS Medical College & KEM)",
        experience_years: 10,
        consultation_fee: "800.00",
        bio: "Dr. Aditi Patel is a dedicated obstetrician and gynecologist specializing in high-risk pregnancy management, adolescent health, PCOS care, and minimally invasive laparoscopic surgeries.",
        avatar_url: null,
        clinic_address: "Matrutva Women's Care Clinic, Palm Beach Road, Sector 17, Vashi, Navi Mumbai, Maharashtra",
      },
    },

    // Doctor 8 (ID 8): Dr. Karan Shah — Dentist (Pune, Maharashtra)
    {
      targetDoctorId: 8,
      full_name: "Dr. Karan Shah",
      email: "doctor.karan@demo.com",
      phone: "+91 98208 90123",
      role: "doctor" as const,
      doctorDetails: {
        specialization: "Dentistry",
        qualification: "BDS, MDS (Prosthodontics & Implantology - Nair Hospital Dental College)",
        experience_years: 9,
        consultation_fee: "600.00",
        bio: "Dr. Karan Shah provides high-precision cosmetic dentistry, dental implants, pain-free root canals, and orthodontic smile designs.",
        avatar_url: null,
        clinic_address: "Shah Dental Studio & Laser Clinic, FC Road, Shivajinagar, Pune, Maharashtra",
      },
    },
  ];

  const seededDoctors: { doctor_id: number; user_id: number; email: string }[] = [];
  const seededPatients: { patient_id: number; user_id: number; email: string }[] = [];

  // Pre-seed phase: Ensure no collisions between old demo doctor emails
  await sql`UPDATE users SET email = 'temp_doc_' || user_id || '@local.demo' WHERE role = 'doctor' AND email LIKE '%@demo.com' AND email NOT IN ('doctor.ananya@demo.com', 'doctor.priya@demo.com', 'doctor.rohan@demo.com', 'doctor.sneha@demo.com', 'doctor.rahul@demo.com', 'doctor.arjun@demo.com', 'doctor.aditi@demo.com', 'doctor.karan@demo.com');`;
  
  // If user_id 7 still holds doctor.priya@demo.com, free it up for user_id 4
  await sql`UPDATE users SET email = 'temp_doc_7@local.demo' WHERE user_id = 7 AND email = 'doctor.priya@demo.com';`;

  for (const uData of demoUsers) {
    // Check if user already exists by new email, legacy email, or target doctor ID
    let existing: { user_id: number; email: string }[] = [];

    if (uData.role === "doctor" && uData.targetDoctorId) {
      const docRecord = await db
        .select()
        .from(schema.doctors)
        .where(eq(schema.doctors.doctor_id, uData.targetDoctorId))
        .limit(1);

      if (docRecord.length > 0) {
        const userRec = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.user_id, docRecord[0].user_id))
          .limit(1);
        if (userRec.length > 0) {
          existing = [userRec[0]];
        }
      }
    }

    if (existing.length === 0) {
      existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, uData.email.toLowerCase().trim()))
        .limit(1);
    }

    let userId: number;
    if (existing.length > 0) {
      userId = existing[0].user_id;
      await db
        .update(schema.users)
        .set({
          full_name: uData.full_name,
          email: uData.email.toLowerCase().trim(),
          phone: uData.phone,
        })
        .where(eq(schema.users.user_id, userId));
      console.log(`  ✓ Updated user '${uData.email}' (ID: ${userId})`);
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
        await db
          .update(schema.patients)
          .set({
            ...uData.patientDetails,
          })
          .where(eq(schema.patients.patient_id, patientId));
        console.log(`    ↳ Updated patient profile (ID: ${patientId})`);
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
        await db
          .update(schema.doctors)
          .set({
            ...uData.doctorDetails,
          })
          .where(eq(schema.doctors.doctor_id, doctorId));
        console.log(`    ↳ Updated doctor profile (ID: ${doctorId})`);
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

  // 3. Seed Future Availability Slots for all Doctors
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
      const existingSlot = await db
        .select()
        .from(schema.availability)
        .where(eq(schema.availability.doctor_id, doc.doctor_id));

      const alreadyExists = existingSlot.some(
        (slot) => slot.available_date === s.date && slot.start_time === s.start
      );

      if (!alreadyExists) {
        const isReservedSample =
          doc.email === "doctor.ananya@demo.com" &&
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
      } else {
        const found = existingSlot.find(
          (slot) => slot.available_date === s.date && slot.start_time === s.start
        );
        if (
          found &&
          doc.email === "doctor.ananya@demo.com" &&
          s.date === date1 &&
          s.start === "10:00"
        ) {
          sampleAvailabilityId = found.availability_id;
          sampleDoctorId = doc.doctor_id;
        }
      }
    }
  }
  console.log("  ✓ Availability slots processed.");

  // 4. Seed Initial Sample Appointment if Not Present
  if (sampleAvailabilityId && sampleDoctorId && seededPatients.length > 0) {
    const patientAarav = seededPatients.find(
      (p) => p.email === "patient@demo.com"
    );
    if (patientAarav) {
      const existingApp = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.availability_id, sampleAvailabilityId))
        .limit(1);

      if (existingApp.length === 0) {
        await db.insert(schema.appointments).values({
          patient_id: patientAarav.patient_id,
          doctor_id: sampleDoctorId,
          availability_id: sampleAvailabilityId,
          appointment_date: new Date(`${date1}T10:00:00Z`),
          status: "confirmed",
          reason: "Routine cardiac consultation and blood pressure evaluation.",
        });
        console.log("  ✓ Inserted active sample appointment for demo dashboard visualization.");
      } else {
        // Update appointment reason to Indian demo context if needed
        await db
          .update(schema.appointments)
          .set({
            reason: "Routine cardiac consultation and blood pressure evaluation.",
          })
          .where(eq(schema.appointments.appointment_id, existingApp[0].appointment_id));
      }
    }
  }

  console.log("\n=========================================================");
  console.log("NEON SEEDING COMPLETED SUCCESSFULLY!");
  console.log("Demo Accounts (Password: Password123!):");
  console.log("  • patient@demo.com (Aarav Sharma - Andheri West, Mumbai)");
  console.log("  • jane@demo.com (Priya Verma - Bandra West, Mumbai)");
  console.log("  • doctor.ananya@demo.com (Dr. Ananya Sharma - Cardiology, ₹1,000)");
  console.log("  • doctor.priya@demo.com (Dr. Priya Nair - Dermatology, ₹800)");
  console.log("  • doctor.rohan@demo.com (Dr. Rohan Iyer - Neurology, ₹1,200)");
  console.log("  • doctor.sneha@demo.com (Dr. Sneha Kulkarni - Pediatrics, ₹700)");
  console.log("  • doctor.rahul@demo.com (Dr. Rahul Mehta - Orthopedics, ₹900)");
  console.log("  • doctor.arjun@demo.com (Dr. Arjun Deshmukh - General Medicine, ₹500)");
  console.log("  • doctor.aditi@demo.com (Dr. Aditi Patel - Gynecology, ₹800)");
  console.log("  • doctor.karan@demo.com (Dr. Karan Shah - Dentistry, ₹600)");
  console.log("=========================================================\n");
}

seed().catch((err) => {
  console.error("Seeding Error:", err);
  process.exit(1);
});
