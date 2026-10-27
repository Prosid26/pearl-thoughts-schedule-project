import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { verifyPassword } from "../src/lib/auth/password";
import { SignJWT, jwtVerify } from "jose";

async function verify() {
  console.log("=========================================================");
  console.log("VERIFYING NEON AUTHENTICATION & DASHBOARD QUERIES");
  console.log("=========================================================\n");

  // 1. Patient Auth & Profile Verification
  console.log("1. Testing Patient Login Flow ('patient@demo.com')...");
  const patientUser = await db.getUserByEmail("patient@demo.com");
  if (!patientUser) {
    throw new Error("Patient user 'patient@demo.com' not found in Neon database!");
  }
  console.log(`  ✓ Found user: ID ${patientUser.user_id}, Name: ${patientUser.full_name}, Role: ${patientUser.role}`);

  const isPatientPasswordValid = await verifyPassword("Password123!", patientUser.password_hash);
  if (!isPatientPasswordValid) {
    throw new Error("Password verification failed for patient@demo.com!");
  }
  console.log("  ✓ Password123! verified successfully via bcrypt.");

  const patientProfile = await db.getPatientByUserId(patientUser.user_id);
  if (!patientProfile) {
    throw new Error("Patient profile record not found!");
  }
  console.log(`  ✓ Resolved patient profile: ID ${patientProfile.patient_id}, Gender: ${patientProfile.gender}`);

  const patientAppointments = await db.getAppointmentsForPatient(patientProfile.patient_id);
  console.log(`  ✓ Retrieved ${patientAppointments.length} appointment(s) for patient.`);
  if (patientAppointments.length > 0) {
    const first = patientAppointments[0];
    const docName = first.doctor?.user?.full_name || "Specialist";
    console.log(`    ↳ Sample: With ${docName} on ${new Date(first.appointment_date).toLocaleDateString()} (${first.status})`);
  }

  // 2. Doctor Auth & Profile Verification
  console.log("\n2. Testing Doctor Login Flow ('doctor.sarah@demo.com')...");
  const doctorUser = await db.getUserByEmail("doctor.sarah@demo.com");
  if (!doctorUser) {
    throw new Error("Doctor user 'doctor.sarah@demo.com' not found in Neon database!");
  }
  console.log(`  ✓ Found user: ID ${doctorUser.user_id}, Name: ${doctorUser.full_name}, Role: ${doctorUser.role}`);

  const isDocPasswordValid = await verifyPassword("Password123!", doctorUser.password_hash);
  if (!isDocPasswordValid) {
    throw new Error("Password verification failed for doctor.sarah@demo.com!");
  }
  console.log("  ✓ Password123! verified successfully via bcrypt.");

  const doctorProfile = await db.getDoctorByUserId(doctorUser.user_id);
  if (!doctorProfile) {
    throw new Error("Doctor profile record not found!");
  }
  console.log(`  ✓ Resolved doctor profile: ID ${doctorProfile.doctor_id}, Specialization: ${doctorProfile.specialization}, Fee: $${doctorProfile.consultation_fee}`);

  const doctorAppointments = await db.getAppointmentsForDoctor(doctorProfile.doctor_id);
  console.log(`  ✓ Retrieved ${doctorAppointments.length} appointment(s) for doctor.`);

  const doctorSlots = await db.getDoctorAvailability(doctorProfile.doctor_id);
  console.log(`  ✓ Retrieved ${doctorSlots.length} availability slot(s) for doctor.`);

  // 3. JWT Token Session Check
  console.log("\n3. Testing JWT Token Session Flow...");
  const secretKey = new TextEncoder().encode(
    process.env.SESSION_SECRET ||
      "medrella_super_secure_healthcare_jwt_session_secret_2026_key"
  );
  const token = await new SignJWT({
    user_id: patientUser.user_id,
    email: patientUser.email,
    role: patientUser.role,
    full_name: patientUser.full_name,
    patient_id: patientProfile.patient_id,
    doctor_id: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  console.log(`  ✓ Successfully signed JWT session token (length: ${token.length})`);

  const { payload } = await jwtVerify(token, secretKey);
  if (!payload || payload.email !== "patient@demo.com") {
    throw new Error("Failed to verify JWT session token!");
  }
  console.log(`  ✓ Successfully verified JWT token for: ${payload.email} (role: ${payload.role}, patient_id: ${payload.patient_id})`);

  console.log("\n=========================================================");
  console.log("ALL AUTH & DASHBOARD CHECKS PASSED AGAINST NEON DB!");
  console.log("=========================================================\n");
}

verify().catch((err) => {
  console.error("Verification Error:", err);
  process.exit(1);
});
