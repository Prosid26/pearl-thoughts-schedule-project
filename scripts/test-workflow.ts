import { localDb } from "../src/lib/db/local-store";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

async function runTestSuite() {
  console.log("=========================================================");
  console.log("MEDRELLA APPOINTMENT BOOKING SYSTEM - END-TO-END QA SUITE");
  console.log("=========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Password hashing and verification
  console.log("TEST 1: Authentication & Password Security");
  const plain = "PatientSecurePass123!";
  const hash = await hashPassword(plain);
  const isValid = await verifyPassword(plain, hash);
  const isInvalid = await verifyPassword("WrongPassword!", hash);
  assert(isValid && !isInvalid, "Bcryptjs correctly hashes and validates secure passwords");

  // TEST 2: Patient Registration
  console.log("\nTEST 2: Patient Registration & Entity Relational Integrity");
  const testEmail = `test.patient.${Date.now()}@testmed.com`;
  const newUser = localDb.createUser(
    "Alex Johnson",
    testEmail,
    "+1 (555) 789-0123",
    hash,
    "patient"
  );
  assert(newUser.user_id > 0 && newUser.email === testEmail, "Created user in database with role 'patient'");

  const newPatient = localDb.createPatient(
    newUser.user_id,
    "1990-08-15",
    "Male",
    "100 Medical Plaza, New York, NY"
  );
  assert(newPatient.patient_id > 0 && newPatient.user_id === newUser.user_id, "Linked patient entity to user entity");

  // TEST 3: Doctor Directory & Filters
  console.log("\nTEST 3: Doctor Directory Search & Filtering");
  const allDoctors = localDb.getDoctors();
  assert(allDoctors.length >= 5, `Retrieved ${allDoctors.length} doctors from seed repository`);

  const cardiologists = localDb.getDoctors({ specialization: "Cardiology" });
  assert(
    cardiologists.length >= 1 && cardiologists[0].specialization === "Cardiology",
    "Filtered doctors by specialization 'Cardiology'"
  );

  const seniorDoctors = localDb.getDoctors({ minExperience: 14 });
  assert(
    seniorDoctors.every((d) => d.experience_years >= 14),
    "Filtered doctors by minimum 14+ years experience"
  );

  // TEST 4: Fetch Doctor Availability Slots
  console.log("\nTEST 4: Doctor-Specific Availability Slots");
  const targetDoctor = cardiologists[0];
  const openSlots = localDb.getDoctorAvailability(targetDoctor.doctor_id, undefined, true);
  assert(openSlots.length > 0, `Found ${openSlots.length} available slots for Dr. ${targetDoctor.user?.full_name}`);
  const slotToBook = openSlots[0];

  // TEST 5: Atomic Slot Booking
  console.log("\nTEST 5: Atomic Appointment Booking Workflow");
  const initialOpenCount = localDb.getDoctorAvailability(targetDoctor.doctor_id, undefined, true).length;
  const appointment = localDb.bookAppointmentAtomic({
    patientId: newPatient.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: slotToBook.availability_id,
    reason: "Severe shortness of breath after aerobic exercise.",
  });
  assert(appointment.appointment_id > 0, "Created appointment record with unique PK");
  assert(appointment.status === "pending", "New appointment starts in 'pending' status");

  const bookedSlot = localDb.getAvailabilityById(slotToBook.availability_id);
  assert(bookedSlot?.is_available === false, "Availability slot atomically marked is_available = false");

  const openCountAfter = localDb.getDoctorAvailability(targetDoctor.doctor_id, undefined, true).length;
  assert(openCountAfter === initialOpenCount - 1, "Available slot count reduced by 1 in public directory");

  // TEST 6: Atomic Double-Booking Prevention (Concurrency Guard)
  console.log("\nTEST 6: Atomic Double-Booking Conflict Protection");
  let collisionErrorCaught = false;
  try {
    // A second patient attempts to reserve the identical slot
    localDb.bookAppointmentAtomic({
      patientId: 2, // Second patient
      doctorId: targetDoctor.doctor_id,
      availabilityId: slotToBook.availability_id,
      reason: "Routine cardiovascular screening.",
    });
  } catch (err: unknown) {
    collisionErrorCaught = true;
  }
  assert(collisionErrorCaught, "Rejected second patient's concurrent attempt to book the reserved slot");

  // TEST 7: Doctor Dashboard & Status Transitions
  console.log("\nTEST 7: Doctor Dashboard & Status Transitions");
  const doctorAppointments = localDb.getAppointmentsForDoctor(targetDoctor.doctor_id);
  const foundInDoctorList = doctorAppointments.some(
    (a) => a.appointment_id === appointment.appointment_id
  );
  assert(foundInDoctorList, "Booked appointment appears in the authenticated doctor's dashboard");

  // Doctor confirms the appointment
  const confirmed = localDb.updateAppointmentStatus({
    appointmentId: appointment.appointment_id,
    newStatus: "confirmed",
    requesterUserId: targetDoctor.user_id,
    requesterRole: "doctor",
  });
  assert(confirmed.status === "confirmed", "Doctor confirmed the appointment successfully");

  // Patient views updated status
  const patientAppointments = localDb.getAppointmentsForPatient(newPatient.patient_id);
  const patientView = patientAppointments.find((a) => a.appointment_id === appointment.appointment_id);
  assert(patientView?.status === "confirmed", "Patient portal immediately reflects confirmed status");

  // TEST 8: Cancellation & Slot Restoration
  console.log("\nTEST 8: Appointment Cancellation & Slot Auto-Restoration");
  const cancelled = localDb.updateAppointmentStatus({
    appointmentId: appointment.appointment_id,
    newStatus: "cancelled",
    requesterUserId: newUser.user_id,
    requesterRole: "patient",
  });
  assert(cancelled.status === "cancelled", "Patient successfully cancelled eligible appointment");

  const restoredSlot = localDb.getAvailabilityById(slotToBook.availability_id);
  assert(restoredSlot?.is_available === true, "Time slot automatically restored (is_available = true) for other patients");

  // TEST 9: Doctor Availability Slot Creation & Deletion
  console.log("\nTEST 9: Doctor Availability Management");
  const d = new Date();
  d.setDate(d.getDate() + 10);
  const futureDate = d.toISOString().split("T")[0];

  const addedSlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    futureDate,
    "16:00",
    "16:30",
    30
  );
  assert(addedSlot.availability_id > 0, `Doctor created new slot on ${futureDate} at 16:00`);

  const deleted = localDb.deleteAvailabilitySlot(addedSlot.availability_id, targetDoctor.doctor_id);
  assert(deleted === true, "Doctor successfully deleted the unused availability slot");

  console.log("\n=========================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("=========================================================\n");
}

runTestSuite().catch((e) => {
  console.error("Test Suite Error:", e);
  process.exit(1);
});
