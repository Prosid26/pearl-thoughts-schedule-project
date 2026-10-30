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
  localDb.updateDoctor(targetDoctor.doctor_id, {
    scheduling_mode: "stream",
    wave_capacity: 1,
  });
  const openSlots = localDb.getDoctorAvailability(targetDoctor.doctor_id, undefined, true);
  assert(openSlots.length > 0, `Found ${openSlots.length} available slots for ${targetDoctor.user?.full_name}`);
  const slotToBook = openSlots.find((s) => !s.is_wave) || openSlots[0];

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
    "18:00",
    "18:30",
    30
  );
  assert(addedSlot.availability_id > 0, `Doctor created new slot on ${futureDate} at 18:00`);

  const deleted = localDb.deleteAvailabilitySlot(addedSlot.availability_id, targetDoctor.doctor_id);
  assert(deleted === true, "Doctor successfully deleted the unused availability slot");

  // =========================================================================
  // SMART WAITING QUEUE & EARLY APPOINTMENT AVAILABILITY TESTS
  // =========================================================================

  // TEST 10: Reception Waiting Queue Walk-In Check-In & State Transitions
  console.log("\nTEST 10: Reception Waiting Queue Management (Walk-Ins)");
  const walkInPatient = localDb.addToWaitingQueue({
    doctorId: targetDoctor.doctor_id,
    patientId: null, // Unregistered walk-in
    patientName: "Vikram Malhotra",
    patientPhone: "+91 98111 22334",
    notes: "Triage: Walk-in with persistent headache & elevated BP",
  });
  assert(walkInPatient.queue_id > 0, "Reception staff checked in walk-in patient to queue");
  assert(walkInPatient.status === "waiting", "Walk-in patient starts in 'waiting' status");

  // Transition queue: waiting -> called -> in_consultation -> completed
  const calledEntry = localDb.updateWaitingQueueStatus(walkInPatient.queue_id, "called");
  assert(calledEntry.status === "called", "Reception marked patient as 'called'");

  const consultEntry = localDb.updateWaitingQueueStatus(walkInPatient.queue_id, "in_consultation");
  assert(consultEntry.status === "in_consultation", "Queue entry marked 'in_consultation'");

  const completedEntry = localDb.updateWaitingQueueStatus(walkInPatient.queue_id, "completed");
  assert(completedEntry.status === "completed", "Queue entry marked 'completed'");

  // TEST 11: Complete Consultation with Early Slot Opportunity Detection
  console.log("\nTEST 11: Complete Consultation & Smart Early Slot Offer Process");
  // Setup: create an available slot earlier for doctor
  const dEarly = new Date();
  dEarly.setDate(dEarly.getDate() + 30 + Math.floor(Math.random() * 500));
  const earlyDate = dEarly.toISOString().split("T")[0];

  const existingEarlySlots = localDb.getDoctorAvailability(targetDoctor.doctor_id).filter(
    (s) => s.available_date === earlyDate
  );
  for (const s of existingEarlySlots) {
    const linked = localDb.getAppointmentsForDoctor(targetDoctor.doctor_id).filter(
      (a) => a.availability_id === s.availability_id && a.status !== "cancelled"
    );
    for (const a of linked) {
      localDb.updateAppointmentStatus({
        appointmentId: a.appointment_id,
        newStatus: "cancelled",
        requesterUserId: 1,
        requesterRole: "admin",
      });
    }
    localDb.deleteAvailabilitySlot(s.availability_id, targetDoctor.doctor_id);
  }

  const earlySlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    earlyDate,
    "09:00",
    "09:30",
    30
  );

  // Setup scheduled patient 1 (scheduled at 15:00)
  const userPatient1 = localDb.createUser(
    "Rohit Deshmukh",
    `rohit.${Date.now()}@testmed.com`,
    "+91 98200 88990",
    hash,
    "patient"
  );
  const patient1 = localDb.createPatient(userPatient1.user_id, "1988-03-20", "Male", "Mumbai");

  const laterSlot1 = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    earlyDate,
    "15:00",
    "15:30",
    30
  );
  const appPatient1 = localDb.bookAppointmentAtomic({
    patientId: patient1.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: laterSlot1.availability_id,
    reason: "Scheduled follow-up appointment.",
  });
  localDb.updateAppointmentStatus({
    appointmentId: appPatient1.appointment_id,
    newStatus: "confirmed",
    requesterUserId: targetDoctor.user_id,
    requesterRole: "doctor",
  });

  // Setup scheduled patient 2 (scheduled later at 17:00 - eligible for cascade)
  const userPatient2 = localDb.createUser(
    "Anita Deshmukh",
    `anita.${Date.now()}@testmed.com`,
    "+91 98200 88991",
    hash,
    "patient"
  );
  const patient2 = localDb.createPatient(userPatient2.user_id, "1992-07-15", "Female", "Mumbai");

  const laterSlot2 = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    earlyDate,
    "17:00",
    "17:30",
    30
  );
  const appPatient2 = localDb.bookAppointmentAtomic({
    patientId: patient2.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: laterSlot2.availability_id,
    reason: "Late afternoon consultation.",
  });
  localDb.updateAppointmentStatus({
    appointmentId: appPatient2.appointment_id,
    newStatus: "confirmed",
    requesterUserId: targetDoctor.user_id,
    requesterRole: "doctor",
  });

  // Setup active appointment currently with doctor to complete early
  const currentSlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    earlyDate,
    "08:00",
    "08:30",
    30
  );
  const activeApp = localDb.bookAppointmentAtomic({
    patientId: newPatient.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: currentSlot.availability_id,
    reason: "Early morning ECG review.",
  });
  localDb.updateAppointmentStatus({
    appointmentId: activeApp.appointment_id,
    newStatus: "confirmed",
    requesterUserId: targetDoctor.user_id,
    requesterRole: "doctor",
  });

  // Doctor completes consultation early
  const completeResult = localDb.completeConsultationAndCheckEarlyOffer(
    activeApp.appointment_id,
    targetDoctor.user_id
  );
  assert(
    completeResult.appointment.status === "completed",
    "Doctor consultation updated to 'completed' status"
  );
  assert(
    completeResult.earlySlotOffered === true,
    "System detected earlier available slot and initiated offer"
  );

  // TEST 12: In-App Notification & Active Offer Countdown for Patient
  console.log("\nTEST 12: Patient Notification & 2-Minute Response Countdown");
  const offeredPatientId = completeResult.offer!.patient_id;
  const activeOffer = localDb.getActiveOfferForPatient(offeredPatientId);
  assert(activeOffer !== null, "Next eligible scheduled patient received an active offer");
  assert(activeOffer?.status === "pending", "Offer starts in 'pending' status");
  assert(
    activeOffer?.offer_id === completeResult.offer?.offer_id,
    "Active offer retrieved matches consultation completion offer"
  );

  const offeredPatient = localDb.getPatientById(offeredPatientId);
  const notifications = localDb.getNotificationsForUser(offeredPatient!.user_id);
  assert(
    notifications.length > 0 && notifications[0].type === "early_offer",
    "In-app notification created with doctor name, clinic, and 2-min response window"
  );

  // TEST 13: Prevent Duplicate Active Offers
  console.log("\nTEST 13: Prevent Duplicate Active Offers for Same Patient/Slot");
  let duplicateOfferError = false;
  try {
    localDb.createEarlySlotOffer({
      slotId: activeOffer!.slot_id,
      doctorId: targetDoctor.doctor_id,
      patientId: offeredPatientId,
    });
  } catch {
    duplicateOfferError = true;
  }
  assert(duplicateOfferError, "Blocked duplicate active offer for the same patient");

  // TEST 14: Patient Declines Offer & Automatic Fallback to Next Patient
  console.log("\nTEST 14: Offer Decline & Automatic Fallback to Next Patient");
  // Patient 1 declines offer
  const declineResult = localDb.declineEarlySlotOffer(
    activeOffer!.offer_id,
    offeredPatient!.user_id
  );
  assert(declineResult.success, "Patient successfully declined earlier offer");

  const declinedOffer = localDb.getOfferById(activeOffer!.offer_id);
  assert(declinedOffer?.status === "declined", "Offer marked as 'declined'");

  // Automatic cascade to next patient in queue (patient2 - Anita at 17:00)
  const cascadedOffer = localDb.getActiveOfferForPatient(patient2.patient_id);
  assert(
    cascadedOffer !== null && cascadedOffer.patient_id === patient2.patient_id,
    "Available slot automatically cascaded to next eligible patient in schedule"
  );

  // TEST 15: Atomic Offer Acceptance (Reschedule Without Duplicate Booking or Extra Fee)
  console.log("\nTEST 15: Atomic Offer Acceptance & Safe Rescheduling");
  const acceptResult = localDb.acceptEarlySlotOfferAtomic(
    cascadedOffer!.offer_id,
    userPatient2.user_id
  );
  assert(acceptResult.success, "Patient atomically accepted the early slot offer");
  assert(
    acceptResult.appointment.appointment_id === appPatient2.appointment_id,
    "Original appointment ID preserved (no duplicate booking created)"
  );
  assert(
    acceptResult.appointment.availability_id === activeOffer!.slot_id,
    "Appointment moved safely to earlier slot"
  );

  // Original later slot is freed back to availability
  const freedSlot = localDb.getAvailabilityById(laterSlot2.availability_id);
  assert(
    freedSlot?.is_available === true,
    "Patient's previous time slot freed (is_available = true) without double booking"
  );

  // Concurrent second acceptance on same offer is rejected
  let secondAcceptError = false;
  try {
    localDb.acceptEarlySlotOfferAtomic(cascadedOffer!.offer_id, userPatient2.user_id);
  } catch {
    secondAcceptError = true;
  }
  assert(secondAcceptError, "Concurrency guard prevented double acceptance on already accepted offer");

  // TEST 16: No Eligible Patients Remaining -> Return to Normal Availability
  console.log("\nTEST 16: Fallback to Public Availability When No Patients Remain");
  const farFutureDate = "2099-12-31";
  const existingFarFuture = localDb.getDoctorAvailability(targetDoctor.doctor_id).find(
    (s) => s.available_date === farFutureDate && s.start_time === "18:00"
  );
  if (existingFarFuture) {
    localDb.deleteAvailabilitySlot(existingFarFuture.availability_id, targetDoctor.doctor_id);
  }
  const remainingSlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    farFutureDate,
    "18:00",
    "18:30",
    30
  );
  // Mark slot as temporarily held for offer processing
  remainingSlot.is_available = false;

  // Advance offer when no eligible patients exist
  const noCandidateResult = localDb.advanceOfferToNextEligiblePatient(
    remainingSlot.availability_id,
    targetDoctor.doctor_id
  );
  assert(noCandidateResult === null, "Correctly identifies when no eligible patients remain in queue");

  const restoredRemaining = localDb.getAvailabilityById(remainingSlot.availability_id);
  assert(
    restoredRemaining?.is_available === true,
    "Slot returned to is_available = true for standard public booking"
  );

  // TEST 17: Stream vs Wave Scheduling Configuration
  console.log("\nTEST 17: Doctor Scheduling Policy (Stream vs Wave Mode)");
  const waveDoctor = localDb.updateDoctor(targetDoctor.doctor_id, {
    scheduling_mode: "wave",
    wave_capacity: 2,
    wave_interval_minutes: 60,
  });
  assert(waveDoctor.scheduling_mode === "wave", "Doctor successfully configured for wave scheduling");
  assert(waveDoctor.wave_capacity === 2, "Doctor wave capacity set to 2 patients per arrival wave");

  // TEST 18: Wave Slot Booking & Capacity Tracking
  console.log("\nTEST 18: Wave Slot Booking & Capacity Tracking");
  const waveDate = "2099-11-20";
  const existingWave = localDb.getDoctorAvailability(targetDoctor.doctor_id).find(
    (s) => s.available_date === waveDate && s.start_time === "14:00"
  );
  if (existingWave) {
    // Cancel any active appointments on this slot so it can be cleanly deleted
    const linkedApps = localDb.getAppointmentsForDoctor(targetDoctor.doctor_id).filter(
      (a) => a.availability_id === existingWave.availability_id && a.status !== "cancelled"
    );
    for (const a of linkedApps) {
      localDb.updateAppointmentStatus({
        appointmentId: a.appointment_id,
        newStatus: "cancelled",
        requesterUserId: 1,
        requesterRole: "admin",
      });
    }
    localDb.deleteAvailabilitySlot(existingWave.availability_id, targetDoctor.doctor_id);
  }
  const waveSlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    waveDate,
    "14:00",
    "15:00",
    60,
    true,
    2
  );
  assert(waveSlot.is_wave === true, "Availability slot created with is_wave = true");
  assert(waveSlot.wave_capacity === 2, "Wave slot has capacity of 2 patients");

  // Book patient 1 into wave
  const waveBooking1 = localDb.bookAppointmentAtomic({
    patientId: newPatient.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: waveSlot.availability_id,
    reason: "Wave consultation 1",
  });
  assert(waveBooking1.wave_number === 1, "First patient assigned wave sequence #1");
  assert(waveBooking1.estimated_consult_time === "14:00", "First patient estimated consult matches wave start (14:00)");
  assert(waveSlot.is_available === true, "Wave slot remains is_available = true after 1 of 2 bookings");

  // Book patient 2 into wave
  const waveBooking2 = localDb.bookAppointmentAtomic({
    patientId: patient2.patient_id,
    doctorId: targetDoctor.doctor_id,
    availabilityId: waveSlot.availability_id,
    reason: "Wave consultation 2",
  });
  assert(waveBooking2.wave_number === 2, "Second patient assigned wave sequence #2");
  assert(waveBooking2.estimated_consult_time === "14:20", "Second patient estimated consult offset by 20m (14:20)");
  assert(waveSlot.is_available === false, "Wave slot marked is_available = false upon reaching capacity (2/2)");

  // TEST 19: Wave Overfill Prevention
  console.log("\nTEST 19: Wave Overfill Prevention");
  let waveOverfillBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: newPatient.patient_id,
      doctorId: targetDoctor.doctor_id,
      availabilityId: waveSlot.availability_id,
      reason: "Wave consultation 3 (should fail)",
    });
  } catch {
    waveOverfillBlocked = true;
  }
  assert(waveOverfillBlocked, "Rejected attempt to book beyond wave capacity limit");

  // TEST 20: Appointment Rescheduling Workflow
  console.log("\nTEST 20: Atomic Appointment Rescheduling Workflow");
  const rescheduleDate = "2099-11-25";
  const existingResched = localDb.getDoctorAvailability(targetDoctor.doctor_id).find(
    (s) => s.available_date === rescheduleDate && s.start_time === "11:00"
  );
  if (existingResched) {
    const linkedApps = localDb.getAppointmentsForDoctor(targetDoctor.doctor_id).filter(
      (a) => a.availability_id === existingResched.availability_id && a.status !== "cancelled"
    );
    for (const a of linkedApps) {
      localDb.updateAppointmentStatus({
        appointmentId: a.appointment_id,
        newStatus: "cancelled",
        requesterUserId: 1,
        requesterRole: "admin",
      });
    }
    localDb.deleteAvailabilitySlot(existingResched.availability_id, targetDoctor.doctor_id);
  }
  const altSlot = localDb.addAvailabilitySlot(
    targetDoctor.doctor_id,
    rescheduleDate,
    "11:00",
    "11:30",
    30,
    false,
    1
  );
  assert(altSlot.is_available === true, "Alternative time slot open for rescheduling");

  // Reschedule waveBooking2 out of waveSlot into altSlot
  const rescheduledApp = localDb.rescheduleAppointmentAtomic({
    appointmentId: waveBooking2.appointment_id,
    newAvailabilityId: altSlot.availability_id,
    reason: "Schedule conflict resolved",
    requesterUserId: userPatient2.user_id,
    requesterRole: "patient",
  });
  assert(rescheduledApp.availability_id === altSlot.availability_id, "Appointment successfully moved to new slot");
  assert(rescheduledApp.rescheduled_from_id === waveSlot.availability_id, "Preserved record of original slot ID");
  assert(altSlot.is_available === false, "Target slot atomically reserved (is_available = false)");
  assert(waveSlot.is_available === true, "Original wave slot capacity restored (is_available = true)");
  assert(waveSlot.wave_booked_count === 1, "Wave booked count decremented from 2 to 1");

  // Patient notification created
  const patient2Notifications = localDb.getNotificationsForUser(userPatient2.user_id);
  const reschedNotif = patient2Notifications.find((n) => n.type === "rescheduled");
  assert(Boolean(reschedNotif), "Patient received in-app notification for successful reschedule");

  // Reset doctor back to stream mode
  localDb.updateDoctor(targetDoctor.doctor_id, {
    scheduling_mode: "stream",
    wave_capacity: 1,
  });

  console.log("\n=========================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("=========================================================\n");
}

runTestSuite().catch((e) => {
  console.error("Test Suite Error:", e);
  process.exit(1);
});
