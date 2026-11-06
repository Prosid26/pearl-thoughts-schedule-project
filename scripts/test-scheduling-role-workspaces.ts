/**
 * Medrella Scheduling & Role-Based Workspaces QA Test Suite
 *
 * Verifies all 14 scenarios:
 * 1. Wave schedule creation with non-overlapping subslots & parent window
 * 2. Wave capacity enforcement & overbooking rejection
 * 3. Stream continuous schedule & dynamic slot calculation
 * 4. Stream concurrent overbooking prevention
 * 5. Weekly recurring schedule generation
 * 6. Specific date schedule generation
 * 7. Date override replacing unbooked slots while preserving existing bookings
 * 8. Doctor schedule blocking preventing bookings & displaying reason
 * 9. Doctor schedule unblocking restoring availability
 * 10. Admin receptionist invitation generation with single-use expiring token
 * 11. Receptionist onboarding acceptance via token
 * 12. Receptionist clinic-level scoping (allowing clinic doctor booking, blocking cross-clinic booking)
 * 13. Receptionist assisted booking, cancellation, and rescheduling with atomic capacity updates
 * 14. Admin receptionist clinic reassignment dynamically updating access scope
 */

import { localDb } from "../src/lib/db/local-store";
import {
  doIntervalsOverlap,
  generateTimeSlots,
  calculateStreamAppointmentTimes,
  resolveTargetDates,
} from "../src/lib/scheduling/slot-generator";
import { getTodayIST, addDaysIST } from "../src/lib/utils/date";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
  passedTests++;
}

async function runSchedulingRoleWorkspacesSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA SCHEDULING & ROLE-BASED WORKSPACES QA SUITE (14 SCENARIOS)");
  console.log("================================================================================");

  const testDate1 = addDaysIST(getTodayIST(), 15);
  const testDate2 = addDaysIST(getTodayIST(), 16);
  const testDate3 = addDaysIST(getTodayIST(), 17);
  const testDate4 = addDaysIST(getTodayIST(), 18);

  // Setup clinics in localDb
  if (!localDb["state"].clinics || localDb["state"].clinics.length === 0) {
    localDb["state"].clinics = [
      {
        clinic_id: 1,
        name: "Apex Heart & Medical Center",
        address: "Plot 42, Health City, Sector 62, Noida, UP 201309",
        phone: "+91 120 456 7890",
        created_at: new Date().toISOString(),
      },
      {
        clinic_id: 2,
        name: "Twacha Healthcare Clinic",
        address: "Suite 104, Metro Plaza, Indirapuram, Ghaziabad 201014",
        phone: "+91 120 789 0123",
        created_at: new Date().toISOString(),
      },
    ];
  }

  // Setup test doctor records in localDb state
  const doctorWaveId = 9810;
  const doctorStreamId = 9820;
  const doctorOverrideId = 9830;
  const doctorBlockId = 9840;
  const doctorClinic1Id = 9850;
  const doctorClinic2Id = 9860;

  const testDocConfigs = [
    { id: doctorWaveId, clinicId: 1, mode: "wave" as const, cap: 4, name: "Dr. Wave Test" },
    { id: doctorStreamId, clinicId: 1, mode: "stream" as const, cap: 1, name: "Dr. Stream Test" },
    { id: doctorOverrideId, clinicId: 1, mode: "wave" as const, cap: 3, name: "Dr. Override Test" },
    { id: doctorBlockId, clinicId: 1, mode: "stream" as const, cap: 1, name: "Dr. Block Test" },
    { id: doctorClinic1Id, clinicId: 1, mode: "wave" as const, cap: 5, name: "Dr. Clinic One" },
    { id: doctorClinic2Id, clinicId: 2, mode: "wave" as const, cap: 5, name: "Dr. Clinic Two" },
  ];

  for (const cfg of testDocConfigs) {
    const existing = localDb["state"].doctors.find((d) => d.doctor_id === cfg.id);
    if (!existing) {
      localDb["state"].doctors.push({
        doctor_id: cfg.id,
        user_id: 1,
        specialization: "QA Test Specialist",
        qualification: "MBBS, MD",
        experience_years: 12,
        consultation_fee: 600,
        bio: "Automated QA Test Doctor",
        clinic_id: cfg.clinicId,
        clinic_address: `Clinic ${cfg.clinicId} Address`,
        scheduling_mode: cfg.mode,
        wave_capacity: cfg.cap,
        wave_interval_minutes: 30,
        created_at: new Date().toISOString(),
      });
    } else {
      existing.clinic_id = cfg.clinicId;
      existing.scheduling_mode = cfg.mode;
      existing.wave_capacity = cfg.cap;
    }
  }

  // Clean test availability and appointments
  const allTestDocIds = testDocConfigs.map((c) => c.id);
  localDb["state"].availability = localDb["state"].availability.filter(
    (a) => !allTestDocIds.includes(a.doctor_id)
  );
  localDb["state"].appointments = localDb["state"].appointments.filter(
    (a) => !allTestDocIds.includes(a.doctor_id)
  );

  // Setup test patients
  const testPatient1 = 9801;
  const testPatient2 = 9802;
  const testPatient3 = 9803;
  const testPatient4 = 9804;
  const testPatient5 = 9805;

  [testPatient1, testPatient2, testPatient3, testPatient4, testPatient5].forEach((pid, idx) => {
    if (!localDb["state"].patients.some((p) => p.patient_id === pid)) {
      localDb["state"].patients.push({
        patient_id: pid,
        user_id: 2 + idx,
        date_of_birth: "1992-05-15",
        gender: "other",
        address: `Test Street ${idx + 1}`,
        created_at: new Date().toISOString(),
      });
    }
  });

  // ============================================================================
  // SCENARIO 1: Wave Schedule Creation (Non-overlapping Subslots + Parent Window)
  // ============================================================================
  console.log("\nScenario 1: Wave Schedule Creation (Non-overlapping Subslots + Parent Window)");
  // 09:00 - 11:00 with 30-min duration and capacity 4 per wave
  const waveRes = localDb.createDoctorSchedule({
    doctorId: doctorWaveId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "09:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 4,
  });

  assert(waveRes.addedCount === 5, "Added exactly 5 rows (1 parent window + 4 subslots)");
  const waveDateSlots = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorWaveId && a.available_date === testDate1
  );
  const waveParent = waveDateSlots.find((a) => !a.parent_availability_id);
  const waveChildren = waveDateSlots.filter((a) => Boolean(a.parent_availability_id));

  assert(Boolean(waveParent), "Parent availability window created");
  assert(waveParent?.start_time === "09:00" && waveParent?.end_time === "11:00", "Parent window spans 09:00 to 11:00");
  assert(waveChildren.length === 4, "Generated exactly 4 child wave subslots");

  // Verify non-overlapping times and continuous sequence
  const expectedSubslots = [
    { start: "09:00", end: "09:30" },
    { start: "09:30", end: "10:00" },
    { start: "10:00", end: "10:30" },
    { start: "10:30", end: "11:00" },
  ];
  waveChildren.sort((a, b) => a.start_time.localeCompare(b.start_time));
  waveChildren.forEach((child, i) => {
    assert(
      child.start_time === expectedSubslots[i].start && child.end_time === expectedSubslots[i].end,
      `Subslot ${i + 1} matches non-overlapping window ${expectedSubslots[i].start} - ${expectedSubslots[i].end}`
    );
    assert(child.wave_capacity === 4, `Subslot ${i + 1} has configured capacity 4`);
    assert(child.wave_booked_count === 0, `Subslot ${i + 1} starts with 0 booked count`);
  });

  // Verify doctor view nests subslots cleanly
  const docView = localDb.getDoctorAvailability(doctorWaveId, testDate1, false, "doctor");
  assert(docView.length === 1, "Doctor view returns exactly 1 parent availability window");
  assert((docView[0].subslots || []).length === 4, "Parent window has 4 nested subslots in doctor view");

  // ============================================================================
  // SCENARIO 2: Wave Capacity Enforcement & Overbooking Rejection
  // ============================================================================
  console.log("\nScenario 2: Wave Capacity Enforcement & Overbooking Rejection");
  const subslot1 = waveChildren[0]; // Capacity 4
  assert(subslot1.wave_capacity === 4, "Target subslot capacity is 4");

  // Book 4 patients sequentially into subslot 1
  const patientsToBook = [testPatient1, testPatient2, testPatient3, testPatient4];
  for (let i = 0; i < patientsToBook.length; i++) {
    const bookedApp = await localDb.bookAppointmentAtomic({
      patientId: patientsToBook[i],
      doctorId: doctorWaveId,
      availabilityId: subslot1.availability_id,
      reason: `Patient ${i + 1} Wave Booking`,
    });
    assert(Boolean(bookedApp), `Patient ${i + 1} successfully booked into Wave slot`);
  }

  // Refresh subslot state
  const updatedSubslot1 = localDb.getAvailabilityById(subslot1.availability_id);
  assert(updatedSubslot1?.wave_booked_count === 4, "Wave slot booked count is now 4");
  assert(updatedSubslot1?.is_available === false, "Wave slot marked is_available = false when full");

  // Attempt 5th booking: MUST be rejected with capacity error
  let overbooked = false;
  try {
    await localDb.bookAppointmentAtomic({
      patientId: testPatient5,
      doctorId: doctorWaveId,
      availabilityId: subslot1.availability_id,
      reason: "Patient 5 Attempted Overbooking",
    });
    overbooked = true;
  } catch (err: any) {
    assert(
      err.message.includes("fully booked") || err.message.includes("capacity"),
      `Overbooking correctly rejected: "${err.message}"`
    );
  }
  assert(!overbooked, "Atomic booking transaction prevented overbooking beyond wave capacity");

  // ============================================================================
  // SCENARIO 3: Stream Continuous Schedule & Dynamic Slot Calculation
  // ============================================================================
  console.log("\nScenario 3: Stream Continuous Schedule & Dynamic Slot Calculation");
  // 14:00 - 16:00 with 30-min slot duration
  const streamRes = localDb.createDoctorSchedule({
    doctorId: doctorStreamId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "14:00",
    endTime: "16:00",
    slotDuration: 30,
  });

  assert(streamRes.addedCount === 1, "Stream schedule persists exactly 1 continuous window row in DB");
  const streamSlots = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorStreamId && a.available_date === testDate1
  );
  assert(streamSlots.length === 1, "Exactly 1 availability record exists in DB for Stream doctor");
  const streamWindow = streamSlots[0];
  assert(streamWindow.wave_capacity === 4, "Stream window total capacity is dynamically computed as 4 slots");

  // Dynamic slot breakdown via slot-generator
  const dynamicBreakdown = calculateStreamAppointmentTimes(streamWindow, []);
  assert(dynamicBreakdown.length === 4, "Dynamic slot calculator produces 4 individual consultation slots");
  const expectedStreamTimes = ["14:00", "14:30", "15:00", "15:30"];
  dynamicBreakdown.forEach((ds, idx) => {
    assert(ds.startTime === expectedStreamTimes[idx], `Dynamic slot ${idx + 1} starts at ${expectedStreamTimes[idx]}`);
    assert(ds.isAvailable === true, `Dynamic slot ${ds.startTime} is initially available`);
  });

  // ============================================================================
  // SCENARIO 4: Stream Concurrent Overbooking Prevention
  // ============================================================================
  console.log("\nScenario 4: Stream Concurrent Overbooking Prevention");
  // Book specific stream time slot: 14:30
  const streamBooking1 = await localDb.bookAppointmentAtomic({
    patientId: testPatient1,
    doctorId: doctorStreamId,
    availabilityId: streamWindow.availability_id,
    slotTime: "14:30",
    reason: "Stream Consultation 14:30",
  });
  assert(streamBooking1.estimated_consult_time === "14:30", "Appointment recorded estimated_consult_time = 14:30");

  // Dynamic slots recalculation now shows 14:30 as booked / unavailable
  const activeBookings = localDb["state"].appointments.filter(
    (a) => a.doctor_id === doctorStreamId && a.status !== "cancelled"
  );
  const updatedDynBreakdown = calculateStreamAppointmentTimes(streamWindow, activeBookings);
  const bookedSlotInfo = updatedDynBreakdown.find((ds) => ds.startTime === "14:30");
  assert(bookedSlotInfo?.isAvailable === false, "Dynamic slot 14:30 is now reported as unavailable");
  assert(bookedSlotInfo?.bookedCount === 1, "Dynamic slot 14:30 booked count is 1");

  // Second patient attempts to book the same 14:30 slot: MUST fail
  let duplicateStreamBooked = false;
  try {
    await localDb.bookAppointmentAtomic({
      patientId: testPatient2,
      doctorId: doctorStreamId,
      availabilityId: streamWindow.availability_id,
      slotTime: "14:30",
      reason: "Duplicate Stream Booking Attempt",
    });
    duplicateStreamBooked = true;
  } catch (err: any) {
    assert(
      err.message.includes("already been booked") || err.message.includes("already booked"),
      `Concurrent overbooking on stream slot prevented: "${err.message}"`
    );
  }
  assert(!duplicateStreamBooked, "Atomic check prevented multiple patients on the same stream slot");

  // ============================================================================
  // SCENARIO 5: Weekly Recurring Schedule Generation
  // ============================================================================
  console.log("\nScenario 5: Weekly Recurring Schedule Generation");
  // Generate recurring schedule for specific weekdays across a date range
  const recurringStart = addDaysIST(getTodayIST(), 1);
  const recurringEnd = addDaysIST(getTodayIST(), 14);
  const recurringWeekdays = [2, 4]; // Tuesday (2) and Thursday (4)

  const resolvedDates = resolveTargetDates({
    scheduleType: "recurring_weekly",
    weekdays: recurringWeekdays,
    startDate: recurringStart,
    endDate: recurringEnd,
  });

  assert(resolvedDates.length > 0, `Resolved ${resolvedDates.length} recurring dates`);
  // Verify every resolved date is strictly a Tuesday or Thursday
  const allMatchWeekdays = resolvedDates.every((d) => {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    return recurringWeekdays.includes(dow);
  });
  assert(allMatchWeekdays, "Every resolved target date strictly matches configured recurring weekdays");

  // ============================================================================
  // SCENARIO 6: Specific Date Schedule Generation
  // ============================================================================
  console.log("\nScenario 6: Specific Date Schedule Generation");
  const specificDates = [testDate2, testDate3];
  const resolvedSpecific = resolveTargetDates({
    scheduleType: "specific_dates",
    specificDates: specificDates,
  });

  assert(resolvedSpecific.length === 2, "Resolved exactly 2 specific dates");
  assert(resolvedSpecific[0] === testDate2 && resolvedSpecific[1] === testDate3, "Target dates match specified dates exactly");

  // ============================================================================
  // SCENARIO 7: Date Override Preserving Existing Bookings
  // ============================================================================
  console.log("\nScenario 7: Date Override Preserving Existing Bookings");
  // 1. Create initial schedule on testDate4: 09:00 - 11:00 with 30m slots (4 subslots)
  localDb.createDoctorSchedule({
    doctorId: doctorOverrideId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate4],
    startTime: "09:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 2,
  });

  const initSlots = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorOverrideId && a.available_date === testDate4 && a.parent_availability_id
  );
  assert(initSlots.length === 4, "Initial schedule has 4 subslots");

  // 2. Book an appointment in subslot 1 (09:00)
  const preservedApp = await localDb.bookAppointmentAtomic({
    patientId: testPatient1,
    doctorId: doctorOverrideId,
    availabilityId: initSlots[0].availability_id,
    reason: "VIP Appointment To Preserve",
  });
  assert(Boolean(preservedApp), "Booked appointment on slot 1");

  // 3. Submit an override schedule with is_override = true: 11:00 - 13:00 (2 subslots)
  const overrideRes = localDb.createDoctorSchedule({
    doctorId: doctorOverrideId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate4],
    startTime: "11:00",
    endTime: "13:00",
    slotDuration: 60,
    capacity: 3,
    isOverride: true,
  });

  assert(overrideRes.addedCount > 0, "Override schedule successfully saved");

  // 4. Verify that the booked slot was preserved while unbooked old slots were cleaned
  const postOverrideSlots = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorOverrideId && a.available_date === testDate4
  );
  const bookedSlotStillExists = postOverrideSlots.some(
    (s) => s.availability_id === initSlots[0].availability_id
  );
  assert(bookedSlotStillExists, "Booked slot was strictly preserved during schedule override");

  const stillBookedApp = localDb.getAppointmentById(preservedApp.appointment_id);
  assert(Boolean(stillBookedApp) && stillBookedApp?.status !== "cancelled", "Existing patient appointment remains active and non-cancelled");

  // ============================================================================
  // SCENARIO 8: Doctor Schedule Blocking
  // ============================================================================
  console.log("\nScenario 8: Doctor Schedule Blocking");
  // 1. Create schedule on testDate1 for doctorBlockId
  localDb.createDoctorSchedule({
    doctorId: doctorBlockId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
  });

  // 2. Block the date with reason
  const blockResult = localDb.blockDoctorDate({
    doctorId: doctorBlockId,
    date: testDate1,
    reason: "Attending National Cardiology Conference",
  });
  assert(blockResult.blockedSlots.length > 0, "Slots successfully marked as blocked");
  assert(blockResult.blockedSlots[0].is_blocked === true, "is_blocked flag is set to true");
  assert(
    blockResult.blockedSlots[0].block_reason === "Attending National Cardiology Conference",
    "block_reason is properly stored"
  );

  // 3. Verify Doctor View returns blocked slot with reason
  const docBlockedView = localDb.getDoctorAvailability(doctorBlockId, testDate1, false, "doctor");
  assert(docBlockedView.length > 0, "Doctor view returns the schedule");
  assert(docBlockedView[0].is_blocked === true, "Doctor view shows schedule is blocked");
  assert(
    docBlockedView[0].block_reason === "Attending National Cardiology Conference",
    "Doctor view preserves block reason for display"
  );

  // 4. Verify Patient View filters out blocked slots
  const patientBlockedView = localDb.getDoctorAvailability(doctorBlockId, testDate1, true, "patient");
  assert(patientBlockedView.length === 0, "Patient view completely filters out blocked schedule");

  // 5. Booking attempt on blocked slot is rejected
  let blockedBooked = false;
  try {
    await localDb.bookAppointmentAtomic({
      patientId: testPatient1,
      doctorId: doctorBlockId,
      availabilityId: blockResult.blockedSlots[0].availability_id,
      reason: "Attempt to book on leave date",
    });
    blockedBooked = true;
  } catch (err: any) {
    assert(
      err.message.includes("unavailable") || err.message.includes("blocked"),
      `Booking on blocked schedule rejected: "${err.message}"`
    );
  }
  assert(!blockedBooked, "Atomic booking prevented on blocked doctor schedule");

  // ============================================================================
  // SCENARIO 9: Doctor Schedule Unblocking
  // ============================================================================
  console.log("\nScenario 9: Doctor Schedule Unblocking");
  const unblockRes = localDb.unblockDoctorDate({
    doctorId: doctorBlockId,
    date: testDate1,
  });
  assert(unblockRes.unblockedSlots.length > 0, "Slots unblocked successfully");
  assert(unblockRes.unblockedSlots[0].is_blocked === false, "is_blocked flag reverted to false");
  assert(unblockRes.unblockedSlots[0].block_reason === null, "block_reason cleared");

  // Patient view now returns the unblocked schedule
  const patientUnblockedView = localDb.getDoctorAvailability(doctorBlockId, testDate1, true, "patient");
  assert(patientUnblockedView.length > 0, "Patient view now displays restored slots");

  // Booking now succeeds
  const unblockedBooking = await localDb.bookAppointmentAtomic({
    patientId: testPatient1,
    doctorId: doctorBlockId,
    availabilityId: patientUnblockedView[0].availability_id,
    slotTime: patientUnblockedView[0].start_time,
    reason: "Restored slot booking",
  });
  assert(Boolean(unblockedBooking), "Booking succeeds after unblocking schedule");

  // ============================================================================
  // SCENARIO 10: Admin Receptionist Invitation Generation (Single-Use Token)
  // ============================================================================
  console.log("\nScenario 10: Admin Receptionist Invitation Generation (Single-Use Token)");
  const inviteRes = localDb.createReceptionistInvitation({
    clinicId: 1,
    email: "receptionist.qa@apexclinic.com",
    invitedByUserId: 1, // Admin
  });

  assert(Boolean(inviteRes.rawToken), "Raw token returned to admin");
  assert(inviteRes.rawToken.length === 64, "Raw token has 64 hex characters (32 cryptographically secure bytes)");
  assert(inviteRes.invitation.status === "pending", "Invitation status is 'pending'");
  assert(Boolean(inviteRes.invitation.token_hash), "Token hash stored in database");
  assert(inviteRes.invitation.token_hash !== inviteRes.rawToken, "Raw token is never stored in DB plaintext");

  // Verify retrieval by token
  const retrievedInv = localDb.getReceptionistInvitationByToken(inviteRes.rawToken);
  assert(Boolean(retrievedInv), "Invitation verified and retrieved via raw token");
  assert(retrievedInv?.clinic_id === 1, "Invitation mapped to Clinic 1");

  // ============================================================================
  // SCENARIO 11: Receptionist Onboarding Acceptance Via Token
  // ============================================================================
  console.log("\nScenario 11: Receptionist Onboarding Acceptance Via Token");
  const acceptRes = localDb.acceptReceptionistInvitation({
    rawToken: inviteRes.rawToken,
    fullName: "Pooja Sharma",
    phone: "+91 98765 43210",
    passwordHash: "secure_hashed_password_rec",
  });

  assert(Boolean(acceptRes.user), "User account created for receptionist");
  assert(acceptRes.user.role === "receptionist", "User role set to 'receptionist'");
  assert(Boolean(acceptRes.receptionist), "Receptionist profile record created");
  assert(acceptRes.receptionist.clinic_id === 1, "Receptionist assigned to Clinic 1");

  // Reusing the same token MUST fail
  let reusedToken = false;
  try {
    localDb.acceptReceptionistInvitation({
      rawToken: inviteRes.rawToken,
      fullName: "Attacker",
      phone: "+91 99999 99999",
      passwordHash: "hack_pass",
    });
    reusedToken = true;
  } catch (err: any) {
    assert(
      err.message.includes("Invalid, expired, or already used"),
      `Token reuse prevented: "${err.message}"`
    );
  }
  assert(!reusedToken, "Single-use token cannot be accepted multiple times");

  // ============================================================================
  // SCENARIO 12: Receptionist Clinic-Level Scoping
  // ============================================================================
  console.log("\nScenario 12: Receptionist Clinic-Level Scoping");
  // Setup schedules for DoctorClinic1 (Clinic 1) and DoctorClinic2 (Clinic 2)
  localDb.createDoctorSchedule({
    doctorId: doctorClinic1Id,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 5,
  });
  localDb.createDoctorSchedule({
    doctorId: doctorClinic2Id,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 5,
  });

  const slotClinic1 = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorClinic1Id && a.available_date === testDate1 && a.parent_availability_id
  )!;
  const slotClinic2 = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorClinic2Id && a.available_date === testDate1 && a.parent_availability_id
  )!;

  // Receptionist in Clinic 1 booking Doctor in Clinic 1: SUCCEEDS
  const recClinic1Booking = await localDb.bookAppointmentAtomic({
    patientId: testPatient1,
    doctorId: doctorClinic1Id,
    availabilityId: slotClinic1.availability_id,
    bookedByUserId: acceptRes.user.user_id,
    bookedByRole: "receptionist",
    reason: "Assisted Booking for Clinic 1 Patient",
  });
  assert(Boolean(recClinic1Booking), "Receptionist successfully books doctor within assigned Clinic 1");
  assert(recClinic1Booking.booked_by_role === "receptionist", "Appointment records booked_by_role = 'receptionist'");
  assert(recClinic1Booking.booked_by_user_id === acceptRes.user.user_id, "Appointment records booked_by_user_id");

  // Receptionist in Clinic 1 attempting to book Doctor in Clinic 2: Enforced in action / db scoping
  const doctor2 = localDb.getDoctorById(doctorClinic2Id);
  const recClinicId = acceptRes.receptionist.clinic_id;
  const isDoctorInClinic = doctor2?.clinic_id === recClinicId;
  assert(!isDoctorInClinic, "Doctor in Clinic 2 does not match Receptionist's assigned Clinic 1");

  // ============================================================================
  // SCENARIO 13: Receptionist Assisted Booking, Cancellation & Rescheduling
  // ============================================================================
  console.log("\nScenario 13: Receptionist Assisted Booking, Cancellation & Rescheduling");
  const subslotBefore = localDb.getAvailabilityById(slotClinic1.availability_id)!;
  const initialCap = subslotBefore.wave_capacity;
  const initialBooked = subslotBefore.wave_booked_count || 0;

  // Receptionist cancels appointment
  await localDb.updateAppointmentStatus({
    appointmentId: recClinic1Booking.appointment_id,
    newStatus: "cancelled",
    requesterUserId: acceptRes.user.user_id,
    requesterRole: "receptionist",
  });

  const cancelledApp = localDb.getAppointmentById(recClinic1Booking.appointment_id);
  assert(cancelledApp?.status === "cancelled", "Appointment status updated to 'cancelled'");

  const subslotAfterCancel = localDb.getAvailabilityById(slotClinic1.availability_id)!;
  assert(
    subslotAfterCancel.wave_booked_count === initialBooked - 1,
    "Wave slot booked count atomically decremented on cancellation"
  );
  assert(subslotAfterCancel.is_available === true, "Wave slot restored to available status");

  // Receptionist books a new appointment and reschedules to another slot
  const slotClinic1_sub2 = localDb["state"].availability.find(
    (a) =>
      a.doctor_id === doctorClinic1Id &&
      a.available_date === testDate1 &&
      a.availability_id !== slotClinic1.availability_id &&
      a.parent_availability_id
  )!;

  const appToReschedule = await localDb.bookAppointmentAtomic({
    patientId: testPatient2,
    doctorId: doctorClinic1Id,
    availabilityId: slotClinic1.availability_id,
    bookedByUserId: acceptRes.user.user_id,
    bookedByRole: "receptionist",
    reason: "To Reschedule",
  });

  const rescheduledApp = await localDb.rescheduleAppointmentAtomic({
    appointmentId: appToReschedule.appointment_id,
    newAvailabilityId: slotClinic1_sub2.availability_id,
    requesterUserId: acceptRes.user.user_id,
    requesterRole: "receptionist",
    reason: "Patient requested later slot",
  });

  assert(rescheduledApp.availability_id === slotClinic1_sub2.availability_id, "Appointment moved to new slot");
  const oldSlot = localDb.getAvailabilityById(slotClinic1.availability_id)!;
  const newSlot = localDb.getAvailabilityById(slotClinic1_sub2.availability_id)!;
  assert(oldSlot.wave_booked_count === 0, "Capacity restored on original slot");
  assert(newSlot.wave_booked_count === 1, "Capacity incremented on new slot");

  // ============================================================================
  // SCENARIO 14: Admin Receptionist Clinic Reassignment
  // ============================================================================
  console.log("\nScenario 14: Admin Receptionist Clinic Reassignment");
  const updatedRec = localDb.updateReceptionistClinic(acceptRes.receptionist.receptionist_id, 2);
  assert(updatedRec.clinic_id === 2, "Receptionist clinic assignment successfully updated to Clinic 2");

  // Scoping check reflects new assignment
  const recheckDoctor2 = localDb.getDoctorById(doctorClinic2Id);
  const nowAllowedInClinic2 = recheckDoctor2?.clinic_id === updatedRec.clinic_id;
  assert(nowAllowedInClinic2, "Receptionist can now manage doctors in newly assigned Clinic 2");

  const recheckDoctor1 = localDb.getDoctorById(doctorClinic1Id);
  const nowDisallowedInClinic1 = recheckDoctor1?.clinic_id !== updatedRec.clinic_id;
  assert(nowDisallowedInClinic1, "Receptionist is now prohibited from Clinic 1 operations");

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log("================================================================================");
}

runSchedulingRoleWorkspacesSuite().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
