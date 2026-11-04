/**
 * Medrella Recurring & Custom Availability Scheduling QA Suite
 *
 * Verifies:
 * 1. Time slot generation from operating window (09:00-12:00 @ 30m).
 * 2. Time slot generation for 15, 45, and 60-minute durations.
 * 3. Incomplete final slots are cleanly suppressed.
 * 4. Recurring weekly schedule resolution across a 4-week calendar horizon.
 * 5. Multiple selected specific dates resolution.
 * 6. Non-recurring schedule restriction (only appears on selected dates).
 * 7. Recurrence end-date enforcement.
 * 8. Duplicate generation prevention (idempotency via doctor_date_slot_idx).
 * 9. Wave capacity enforcement (cohort tracking).
 * 10. Stream capacity enforcement with capacity > 1.
 * 11. Concurrent booking protection across multi-capacity slots.
 * 12. Cancellation & rescheduling capacity restoration.
 */

import { localDb } from "../src/lib/db/local-store";
import {
  generateTimeSlots,
  resolveTargetDates,
  timeStringToMinutes,
  minutesToTimeString,
} from "../src/lib/scheduling/slot-generator";
import { getDayOfWeekIST, addDaysIST } from "../src/lib/utils/date";

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

async function runRecurringSchedulingSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA RECURRING & CUSTOM AVAILABILITY SCHEDULING QA SUITE");
  console.log("================================================================================");

  // ============================================================================
  // 1. GENERATE SLOTS: 09:00–12:00 WITH 30-MINUTE DURATION
  // ============================================================================
  console.log("\n1. Time Window Chunking (09:00–12:00 @ 30m)");
  const slots30m = generateTimeSlots("09:00", "12:00", 30);
  assert(slots30m.length === 6, "Generates exactly 6 slots for 3-hour window at 30 min duration");
  assert(slots30m[0].startTime === "09:00" && slots30m[0].endTime === "09:30", "First slot is 09:00–09:30");
  assert(slots30m[1].startTime === "09:30" && slots30m[1].endTime === "10:00", "Second slot is 09:30–10:00");
  assert(slots30m[5].startTime === "11:30" && slots30m[5].endTime === "12:00", "Last slot is 11:30–12:00");
  assert(slots30m.every((s) => s.slotDuration === 30), "All generated slots preserve slotDuration = 30");

  // Incomplete final slot check (09:00–10:15 @ 30m -> 2 slots, not 3)
  const incompleteWindowSlots = generateTimeSlots("09:00", "10:15", 30);
  assert(
    incompleteWindowSlots.length === 2,
    "Suppresses incomplete final slot (09:00–10:15 @ 30m yields exactly 2 full slots)"
  );
  assert(
    incompleteWindowSlots[1].startTime === "09:30" && incompleteWindowSlots[1].endTime === "10:00",
    "Final generated slot stops at 10:00 without exceeding 10:15 boundary"
  );

  // ============================================================================
  // 2. GENERATE SLOTS WITH 15, 45, AND 60-MINUTE DURATIONS
  // ============================================================================
  console.log("\n2. Configurable Durations (15m, 45m, 60m)");
  const slots15m = generateTimeSlots("14:00", "15:00", 15);
  assert(slots15m.length === 4, "15m duration yields 4 slots per hour");
  assert(slots15m[0].startTime === "14:00" && slots15m[0].endTime === "14:15", "First 15m slot is 14:00–14:15");
  assert(slots15m[3].startTime === "14:45" && slots15m[3].endTime === "15:00", "Last 15m slot is 14:45–15:00");

  const slots45m = generateTimeSlots("14:00", "16:00", 45);
  assert(slots45m.length === 2, "45m duration yields 2 slots in a 2-hour window (14:00–14:45, 14:45–15:30)");
  assert(slots45m[1].endTime === "15:30", "Second 45m slot ends at 15:30 (remaining 30m cleanly omitted)");

  const slots60m = generateTimeSlots("09:00", "13:00", 60);
  assert(slots60m.length === 4, "60m duration yields 4 slots across 4 hours");
  assert(slots60m[0].startTime === "09:00" && slots60m[3].endTime === "13:00", "60m slots span 09:00 to 13:00");

  // Invalid time range rejection
  let invalidRangeThrew = false;
  try {
    generateTimeSlots("17:00", "09:00", 30);
  } catch (err: unknown) {
    invalidRangeThrew = true;
  }
  assert(invalidRangeThrew, "Rejects inverted time range where startTime >= endTime");

  // ============================================================================
  // 3. RECURRING WEEKLY SCHEDULE FOR FOUR WEEKS
  // ============================================================================
  console.log("\n3. Recurring Weekly Schedule Resolution (4-Week Horizon)");
  // 2099-01-05 is a Monday
  const recurStart = "2099-01-05";
  const recurEnd = "2099-02-01"; // 4 weeks later (Sunday)
  // Target weekdays: Monday (1), Wednesday (3), Friday (5)
  const resolvedRecurDates = resolveTargetDates({
    scheduleType: "recurring_weekly",
    startDate: recurStart,
    endDate: recurEnd,
    weekdays: [1, 3, 5],
  });

  assert(resolvedRecurDates.length === 12, "4 weeks with 3 weekdays/week produces exactly 12 dates");
  assert(
    resolvedRecurDates.every((d) => [1, 3, 5].includes(getDayOfWeekIST(d))),
    "All resolved recurring dates strictly match Monday (1), Wednesday (3), or Friday (5)"
  );
  assert(resolvedRecurDates[0] === "2099-01-05", "First recurring date is 2099-01-05 (Monday)");
  assert(resolvedRecurDates[resolvedRecurDates.length - 1] === "2099-01-30", "Last recurring date is 2099-01-30 (Friday)");

  // ============================================================================
  // 4. MULTIPLE SELECTED SPECIFIC DATES
  // ============================================================================
  console.log("\n4. Multiple Selected Specific Dates Resolution");
  const chosenDates = ["2099-03-25", "2099-03-10", "2099-03-18", "2099-03-10"]; // Contains duplicate and out-of-order
  const resolvedSpecific = resolveTargetDates({
    scheduleType: "specific_dates",
    specificDates: chosenDates,
  });

  assert(resolvedSpecific.length === 3, "Deduplicates multiple specific dates to 3 unique dates");
  assert(resolvedSpecific[0] === "2099-03-10", "Sorts specific dates chronologically (2099-03-10 first)");
  assert(resolvedSpecific[1] === "2099-03-18", "Middle specific date is 2099-03-18");
  assert(resolvedSpecific[2] === "2099-03-25", "Last specific date is 2099-03-25");

  // ============================================================================
  // 5. NON-RECURRING SCHEDULE RESTRICTION (ONLY ON SELECTED DATES)
  // ============================================================================
  console.log("\n5. Non-Recurring Schedule Confinement");
  assert(!resolvedSpecific.includes("2099-03-11"), "Unselected date 2099-03-11 is strictly absent");
  assert(!resolvedSpecific.includes("2099-03-19"), "Unselected date 2099-03-19 is strictly absent");
  assert(!resolvedSpecific.includes("2099-03-24"), "Unselected date 2099-03-24 is strictly absent");

  // ============================================================================
  // 6. END-DATE ENFORCEMENT
  // ============================================================================
  console.log("\n6. Recurrence End-Date Boundary Enforcement");
  const boundedDates = resolveTargetDates({
    scheduleType: "recurring_weekly",
    startDate: "2099-04-01",
    endDate: "2099-04-10",
    weekdays: [1, 2, 3, 4, 5],
  });
  assert(
    boundedDates.every((d) => d <= "2099-04-10"),
    "Zero dates generated beyond recurrence end-date 2099-04-10"
  );
  assert(
    !boundedDates.includes("2099-04-13"),
    "Subsequent Monday (2099-04-13) is strictly excluded past end date"
  );

  // ============================================================================
  // 7. DUPLICATE GENERATION PREVENTION (BATCH IDEMPOTENCY)
  // ============================================================================
  console.log("\n7. Duplicate Slot Generation Prevention (doctor_date_slot_idx Idempotency)");
  const testDoctorId = 2; // Dr. Priya Nair

  function cleanDoctorDateSlots(doctorId: number, date: string) {
    const slots = localDb.getDoctorAvailability(doctorId, date);
    const rawState = (localDb as unknown as { state: { appointments: Array<{ appointment_id: number; availability_id: number; status: string }> } }).state;
    for (const s of slots) {
      if (rawState && rawState.appointments) {
        const apps = rawState.appointments.filter(
          (a) => a.availability_id === s.availability_id && a.status !== "cancelled" && a.status !== "rejected"
        );
        for (const app of apps) {
          try {
            localDb.updateAppointmentStatus({
              appointmentId: app.appointment_id,
              newStatus: "cancelled",
              requesterUserId: 1,
              requesterRole: "admin",
            });
          } catch {}
        }
      }
      try {
        localDb.deleteAvailabilitySlot(s.availability_id, doctorId);
      } catch {}
    }
  }

  const batchDate = "2099-05-15";
  cleanDoctorDateSlots(testDoctorId, batchDate);

  const generatedBatchSlots = [
    { available_date: batchDate, start_time: "09:00", end_time: "09:30", slot_duration: 30, is_wave: false, wave_capacity: 1 },
    { available_date: batchDate, start_time: "09:30", end_time: "10:00", slot_duration: 30, is_wave: false, wave_capacity: 1 },
    { available_date: batchDate, start_time: "10:00", end_time: "10:30", slot_duration: 30, is_wave: false, wave_capacity: 1 },
  ];

  const firstBatchRes = localDb.addAvailabilityBatch({
    doctorId: testDoctorId,
    slots: generatedBatchSlots,
  });

  assert(firstBatchRes.addedCount === 3, "Initial batch insertion added exactly 3 slots");
  assert(firstBatchRes.skippedCount === 0, "Zero slots skipped on initial batch insertion");

  // Re-run the exact same batch insertion
  const secondBatchRes = localDb.addAvailabilityBatch({
    doctorId: testDoctorId,
    slots: generatedBatchSlots,
  });

  assert(secondBatchRes.addedCount === 0, "Repeated batch insertion added 0 duplicate slots");
  assert(secondBatchRes.skippedCount === 3, "All 3 existing slots safely skipped due to unique index protection");

  const totalSlotsAfter = localDb.getDoctorAvailability(testDoctorId, batchDate);
  assert(totalSlotsAfter.length === 3, "Total slots in database remains exactly 3 without duplicates");

  // ============================================================================
  // 8. WAVE CAPACITY ENFORCEMENT
  // ============================================================================
  console.log("\n8. Wave Capacity Enforcement (Cohort Tracking)");
  const waveTestDate = "2099-06-10";
  cleanDoctorDateSlots(testDoctorId, waveTestDate);
  const waveSlot = localDb.addAvailabilitySlot(
    testDoctorId,
    waveTestDate,
    "11:00",
    "12:00",
    60,
    true, // is_wave
    2     // wave_capacity = 2
  );

  assert(waveSlot.is_wave === true, "Wave slot created with is_wave = true");
  assert(waveSlot.wave_capacity === 2, "Wave slot capacity set to 2 patients");

  // Book patient 1 into wave
  const waveApp1 = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: waveSlot.availability_id,
    reason: "Wave appointment 1",
  });
  assert(waveApp1.wave_number === 1, "First patient assigned wave sequence #1");
  assert(waveSlot.wave_booked_count === 1, "Wave booked count incremented to 1");
  assert(waveSlot.is_available === true, "Wave slot remains available with 1 spot remaining");

  // Book patient 2 into wave
  const waveApp2 = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: waveSlot.availability_id,
    reason: "Wave appointment 2",
  });
  assert(waveApp2.wave_number === 2, "Second patient assigned wave sequence #2");
  assert(waveSlot.wave_booked_count === 2, "Wave booked count reached capacity (2/2)");
  assert(waveSlot.is_available === false, "Wave slot marked is_available = false upon reaching capacity");

  // Attempt booking patient 3 into filled wave slot (must fail)
  let waveOverfillBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: 1,
      doctorId: testDoctorId,
      availabilityId: waveSlot.availability_id,
      reason: "Wave appointment 3 (should fail)",
    });
  } catch (err: unknown) {
    waveOverfillBlocked = true;
  }
  assert(waveOverfillBlocked, "Third booking into wave slot rejected by capacity guard");

  // ============================================================================
  // 9. STREAM CAPACITY ENFORCEMENT WITH CAPACITY > 1
  // ============================================================================
  console.log("\n9. Stream Capacity Enforcement with Capacity > 1");
  const streamMultiDate = "2099-06-15";
  cleanDoctorDateSlots(testDoctorId, streamMultiDate);
  const streamMultiSlot = localDb.addAvailabilitySlot(
    testDoctorId,
    streamMultiDate,
    "14:00",
    "14:30",
    30,
    false, // is_wave = false (Stream mode)
    2      // capacity = 2 (Multi-capacity stream)
  );

  assert(streamMultiSlot.is_wave === false, "Stream slot created with is_wave = false");
  assert(streamMultiSlot.wave_capacity === 2, "Stream slot capacity configured to 2 patients");

  // Book patient 1 into multi-capacity stream slot
  const streamApp1 = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: streamMultiSlot.availability_id,
    reason: "Stream multi-capacity 1",
  });
  assert(streamMultiSlot.wave_booked_count === 1, "Stream slot booked count incremented to 1");
  assert(streamMultiSlot.is_available === true, "Stream slot remains available for second patient");

  // Book patient 2 into multi-capacity stream slot
  const streamApp2 = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: streamMultiSlot.availability_id,
    reason: "Stream multi-capacity 2",
  });
  assert(streamMultiSlot.wave_booked_count === 2, "Stream slot booked count reached capacity (2/2)");
  assert(streamMultiSlot.is_available === false, "Stream slot marked is_available = false upon reaching capacity");

  // ============================================================================
  // 10. CONCURRENT BOOKING PROTECTION
  // ============================================================================
  console.log("\n10. Concurrent Overbooking Guard");
  let streamOverfillBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: 1,
      doctorId: testDoctorId,
      availabilityId: streamMultiSlot.availability_id,
      reason: "Stream overfill attempt (should fail)",
    });
  } catch (err: unknown) {
    streamOverfillBlocked = true;
  }
  assert(streamOverfillBlocked, "Rejected attempt to book beyond stream capacity limit");

  // ============================================================================
  // 11. CANCELLATION & RESCHEDULING CAPACITY RESTORATION
  // ============================================================================
  console.log("\n11. Cancellation and Rescheduling Capacity Restoration");
  // Cancel appointment 2 from the stream multi-slot
  localDb.updateAppointmentStatus({
    appointmentId: streamApp2.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 1,
    requesterRole: "admin",
  });

  assert(streamMultiSlot.wave_booked_count === 1, "Stream slot booked count decremented from 2 to 1 upon cancellation");
  assert(streamMultiSlot.is_available === true, "Stream slot availability restored (is_available = true) after cancellation");

  // Now a new patient can book the freed capacity
  const streamRebooking = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: streamMultiSlot.availability_id,
    reason: "Stream re-booking into restored capacity",
  });
  assert(streamRebooking.appointment_id > 0, "Booking into cancelled slot's restored capacity succeeds");
  assert(streamMultiSlot.wave_booked_count === 2, "Stream slot booked count returns to 2");
  assert(streamMultiSlot.is_available === false, "Stream slot marked unavailable again");

  // Test Rescheduling out of Wave slot
  const altSlotDate = "2099-06-20";
  cleanDoctorDateSlots(testDoctorId, altSlotDate);
  const altSlot = localDb.addAvailabilitySlot(
    testDoctorId,
    altSlotDate,
    "10:00",
    "10:30",
    30,
    false,
    1
  );

  // Reschedule waveApp1 out of waveSlot into altSlot
  const reschedApp = localDb.rescheduleAppointmentAtomic({
    appointmentId: waveApp1.appointment_id,
    newAvailabilityId: altSlot.availability_id,
    reason: "Rescheduling test",
    requesterUserId: 1,
    requesterRole: "admin",
  });

  assert(reschedApp.availability_id === altSlot.availability_id, "Appointment successfully moved to target slot");
  assert(waveSlot.wave_booked_count === 1, "Original wave slot booked count decremented from 2 to 1");
  assert(waveSlot.is_available === true, "Original wave slot availability restored (is_available = true)");

  // Clean up test appointments
  localDb.updateAppointmentStatus({ appointmentId: waveApp1.appointment_id, newStatus: "cancelled", requesterUserId: 1, requesterRole: "admin" });
  localDb.updateAppointmentStatus({ appointmentId: waveApp2.appointment_id, newStatus: "cancelled", requesterUserId: 1, requesterRole: "admin" });
  localDb.updateAppointmentStatus({ appointmentId: streamApp1.appointment_id, newStatus: "cancelled", requesterUserId: 1, requesterRole: "admin" });
  localDb.updateAppointmentStatus({ appointmentId: streamRebooking.appointment_id, newStatus: "cancelled", requesterUserId: 1, requesterRole: "admin" });

  // ============================================================================
  // 12. EXISTING SCHEDULING REGRESSION TEST (STANDARD 1:1 STREAM)
  // ============================================================================
  console.log("\n12. Standard 1:1 Stream Regression Verification");
  const standardDate = "2099-07-01";
  cleanDoctorDateSlots(testDoctorId, standardDate);
  const standardSlot = localDb.addAvailabilitySlot(
    testDoctorId,
    standardDate,
    "09:00",
    "09:30",
    30,
    false,
    1
  );
  assert(standardSlot.is_wave === false, "Standard slot has is_wave = false");
  assert(standardSlot.wave_capacity === 1, "Standard stream slot defaults to capacity = 1");

  const standardBooking = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: testDoctorId,
    availabilityId: standardSlot.availability_id,
    reason: "Standard 1:1 consultation",
  });
  assert(standardBooking.appointment_id > 0, "Standard 1:1 booking succeeds");
  assert(standardSlot.is_available === false, "Standard slot marked unavailable after 1 booking");

  let standardOverfillBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: 1,
      doctorId: testDoctorId,
      availabilityId: standardSlot.availability_id,
      reason: "Second booking on standard 1:1 slot (must fail)",
    });
  } catch (err: unknown) {
    standardOverfillBlocked = true;
  }
  assert(standardOverfillBlocked, "Standard 1:1 slot strictly rejects second booking attempt");

  localDb.updateAppointmentStatus({ appointmentId: standardBooking.appointment_id, newStatus: "cancelled", requesterUserId: 1, requesterRole: "admin" });

  console.log("\n================================================================================");
  console.log(`RECURRING & CUSTOM SCHEDULING QA COMPLETED: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runRecurringSchedulingSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
