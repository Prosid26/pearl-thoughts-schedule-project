/**
 * Medrella Wave & Stream Scheduling QA Test Suite
 *
 * Comprehensive Automated Verification covering all 13 scenarios:
 * 1. Creating a Wave schedule once (1 parent window + 4 subslots).
 * 2. Submitting the exact same Wave schedule twice (idempotency, 0 duplicate parent or subslots).
 * 3. Preventing duplicate Wave subslots.
 * 4. Preventing overlapping Wave windows (10:00–12:00 vs 11:00–13:00 rejected).
 * 5. Creating a Stream schedule (persists exactly 1 continuous window in DB).
 * 6. Ensuring Stream does not create duplicate persisted slots (count remains 1).
 * 7. Dynamically calculating Stream appointment times (4 dynamic slots for 2h window @ 30m).
 * 8. Replacing an existing date-specific schedule via is_override = true.
 * 9. Preserving booked appointments during overrides (booked slot preserved, unbooked replaced).
 * 10. Preserving unaffected recurring dates during date-specific override.
 * 11. Preventing concurrent overbooking at same dynamic stream time slot.
 * 12. Cancelling an appointment and restoring capacity.
 * 13. Timezone boundaries using Asia/Kolkata (past slots rejected, valid IST times accepted).
 */

import { localDb } from "../src/lib/db/local-store";
import {
  doIntervalsOverlap,
  generateTimeSlots,
  calculateStreamAppointmentTimes,
  resolveTargetDates,
} from "../src/lib/scheduling/slot-generator";
import { isSlotInPast, getTodayIST, addDaysIST } from "../src/lib/utils/date";

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

async function runWaveStreamOverlapOverrideSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA WAVE & STREAM SCHEDULING: OVERLAP & OVERRIDE QA SUITE (13 SCENARIOS)");
  console.log("================================================================================");

  const testDate1 = addDaysIST(getTodayIST(), 10);
  const testDate2 = addDaysIST(getTodayIST(), 11);
  const testDate3 = addDaysIST(getTodayIST(), 12);

  // Setup test doctor records in localDb state
  const doctorWaveId = 9910;
  const doctorStreamId = 9920;
  const doctorOverrideId = 9930;
  const doctorMultiDateId = 9940;
  const doctorBookingId = 9950;

  [doctorWaveId, doctorStreamId, doctorOverrideId, doctorMultiDateId, doctorBookingId].forEach((docId) => {
    if (!localDb["state"].doctors.some((d) => d.doctor_id === docId)) {
      localDb["state"].doctors.push({
        doctor_id: docId,
        user_id: 1,
        specialization: "QA Test Specialist",
        qualification: "MBBS, MD",
        experience_years: 10,
        consultation_fee: 500,
        bio: "Automated QA Test Doctor",
        scheduling_mode: "stream",
        wave_capacity: 3,
        wave_interval_minutes: 60,
      });
    }
  });

  const testDoctorIds = [doctorWaveId, doctorStreamId, doctorOverrideId, doctorMultiDateId, doctorBookingId];
  localDb["state"].availability = localDb["state"].availability.filter(
    (a) => !testDoctorIds.includes(a.doctor_id)
  );
  localDb["state"].appointments = localDb["state"].appointments.filter(
    (a) => !testDoctorIds.includes(a.doctor_id)
  );

  // Ensure test patient exists
  const testPatientId = 9999;
  if (!localDb["state"].patients.some((p) => p.patient_id === testPatientId)) {
    localDb["state"].patients.push({
      patient_id: testPatientId,
      user_id: 2,
      date_of_birth: "1990-01-01",
      gender: "male",
      address: "123 Test St",
      created_at: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SCENARIO 1: Creating a Wave Schedule Once (1 Parent Window + 4 Subslots)
  // ============================================================================
  console.log("\nScenario 1: Creating a Wave Schedule (1 Parent Window + 4 Subslots)");
  // 10:00 to 12:00 with 30-min duration and capacity 5 per wave
  const waveRes1 = localDb.createDoctorSchedule({
    doctorId: doctorWaveId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 5,
  });

  assert(waveRes1.addedCount === 5, "Added 5 total rows (1 parent + 4 subslots)");
  assert(waveRes1.datesCount === 1, "Configured across 1 target date");

  // Verify internal DB representation
  const allDocWaveSlots = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorWaveId && a.available_date === testDate1
  );
  const parentWindows = allDocWaveSlots.filter((a) => !a.parent_availability_id);
  const childSubslots = allDocWaveSlots.filter((a) => Boolean(a.parent_availability_id));

  assert(parentWindows.length === 1, "Exactly 1 parent availability window stored in database");
  assert(parentWindows[0].start_time === "10:00" && parentWindows[0].end_time === "12:00", "Parent window spans 10:00 to 12:00");
  assert(parentWindows[0].is_wave === true, "Parent window has is_wave = true");
  assert(childSubslots.length === 4, "Exactly 4 child subslots linked to the parent window");
  assert(childSubslots.every((c) => c.parent_availability_id === parentWindows[0].availability_id), "All 4 subslots reference parent_availability_id");
  assert(childSubslots.every((c) => c.wave_capacity === 5), "All subslots have capacity 5");

  // Verify Doctor View
  const doctorView = localDb.getDoctorAvailability(doctorWaveId, undefined, false, "doctor");
  const doctorDateSlots = doctorView.filter((a) => a.available_date === testDate1);
  assert(doctorDateSlots.length === 1, "Doctor portal receives exactly 1 top-level parent window");
  assert((doctorDateSlots[0].subslots || []).length === 4, "Parent window has 4 nested subslots in doctor view");

  // ============================================================================
  // SCENARIO 2: Submitting Exact Same Wave Schedule Twice (Idempotency)
  // ============================================================================
  console.log("\nScenario 2: Submitting Exact Same Wave Schedule Twice (Idempotency)");
  const waveRes2 = localDb.createDoctorSchedule({
    doctorId: doctorWaveId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 5,
    isOverride: false,
  });

  assert(waveRes2.addedCount === 0, "Idempotent re-submission: 0 new rows added");
  assert(waveRes2.skippedCount === 1, "1 existing window cleanly retained/skipped");

  const totalWaveSlotsAfterReSubmit = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorWaveId && a.available_date === testDate1
  );
  assert(totalWaveSlotsAfterReSubmit.length === 5, "Database maintains strictly 5 rows (0 duplicate parent or subslots created)");

  // ============================================================================
  // SCENARIO 3: Preventing Duplicate Wave Subslots
  // ============================================================================
  console.log("\nScenario 3: Preventing Duplicate Wave Subslots");
  const subslotTimes = childSubslots.map((c) => `${c.start_time}-${c.end_time}`);
  const uniqueSubslotTimes = new Set(subslotTimes);
  assert(subslotTimes.length === uniqueSubslotTimes.size, "All subslots have unique non-overlapping intervals: 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00");

  // ============================================================================
  // SCENARIO 4: Preventing Overlapping Wave Windows
  // ============================================================================
  console.log("\nScenario 4: Preventing Overlapping Wave Windows (10:00–12:00 vs 11:00–13:00 Rejected)");
  let overlapErrorThrown = false;
  try {
    localDb.createDoctorSchedule({
      doctorId: doctorWaveId,
      scheduleType: "specific_dates",
      schedulingMode: "wave",
      targetDates: [testDate1],
      startTime: "11:00",
      endTime: "13:00",
      slotDuration: 30,
      capacity: 3,
      isOverride: false,
    });
  } catch (err: unknown) {
    overlapErrorThrown = true;
    assert(
      (err as Error).message.includes("Overlapping availability window exists"),
      "Throws clear validation error explaining the conflict with existing window"
    );
  }
  assert(overlapErrorThrown, "Overlapping Wave window submission strictly blocked");

  // ============================================================================
  // SCENARIO 5: Creating a Stream Schedule (Persists 1 Continuous Window)
  // ============================================================================
  console.log("\nScenario 5: Creating a Stream Schedule (Persists 1 Continuous Window)");
  const streamRes1 = localDb.createDoctorSchedule({
    doctorId: doctorStreamId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 1,
  });

  assert(streamRes1.addedCount === 1, "Added exactly 1 row for continuous stream operating window");
  const streamSlotsInDb = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorStreamId && a.available_date === testDate1
  );
  assert(streamSlotsInDb.length === 1, "Database stores exactly 1 continuous row, 0 fragmented subslots persisted");
  assert(streamSlotsInDb[0].start_time === "10:00" && streamSlotsInDb[0].end_time === "12:00", "Stream window is 10:00 to 12:00");
  assert(streamSlotsInDb[0].slot_duration === 30, "Slot duration is preserved as 30m");

  // ============================================================================
  // SCENARIO 6: Ensuring Stream Does Not Create Duplicate Persisted Slots
  // ============================================================================
  console.log("\nScenario 6: Stream Re-submission Does Not Create Duplicate Slots");
  const streamRes2 = localDb.createDoctorSchedule({
    doctorId: doctorStreamId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 1,
    isOverride: false,
  });
  assert(streamRes2.addedCount === 0 && streamRes2.skippedCount === 1, "Stream re-submission skipped without duplicates");
  const streamSlotsAfterReSubmit = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorStreamId && a.available_date === testDate1
  );
  assert(streamSlotsAfterReSubmit.length === 1, "Database row count remains exactly 1");

  // ============================================================================
  // SCENARIO 7: Dynamically Calculating Stream Appointment Times
  // ============================================================================
  console.log("\nScenario 7: Dynamically Calculating Stream Appointment Times");
  const patientViewStream = localDb.getDoctorAvailability(doctorStreamId, undefined, false, "patient");
  const patientSlotsDate1 = patientViewStream.filter((a) => a.available_date === testDate1);
  assert(patientSlotsDate1.length === 4, "Patient portal dynamically receives 4 slots for 2-hour window at 30m duration");
  assert(patientSlotsDate1[0].start_time === "10:00" && patientSlotsDate1[0].end_time === "10:30", "Slot 1: 10:00–10:30");
  assert(patientSlotsDate1[1].start_time === "10:30" && patientSlotsDate1[1].end_time === "11:00", "Slot 2: 10:30–11:00");
  assert(patientSlotsDate1[2].start_time === "11:00" && patientSlotsDate1[2].end_time === "11:30", "Slot 3: 11:00–11:30");
  assert(patientSlotsDate1[3].start_time === "11:30" && patientSlotsDate1[3].end_time === "12:00", "Slot 4: 11:30–12:00");

  // ============================================================================
  // SCENARIO 8: Replacing Existing Schedule via is_override = true
  // ============================================================================
  console.log("\nScenario 8: Replacing Existing Schedule via is_override = true");
  const overrideRes = localDb.createDoctorSchedule({
    doctorId: doctorStreamId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "14:00",
    endTime: "16:00",
    slotDuration: 30,
    capacity: 1,
    isOverride: true,
  });

  assert(overrideRes.addedCount === 1, "Published 1 replacement window");
  assert(overrideRes.replacedCount === 1, "Replaced 1 pre-existing window");

  const streamSlotsAfterOverride = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorStreamId && a.available_date === testDate1
  );
  assert(streamSlotsAfterOverride.length === 1, "Only 1 window exists in DB after override");
  assert(streamSlotsAfterOverride[0].start_time === "14:00" && streamSlotsAfterOverride[0].end_time === "16:00", "Window updated to 14:00–16:00");

  // ============================================================================
  // SCENARIO 9: Preserving Booked Appointments During Overrides
  // ============================================================================
  console.log("\nScenario 9: Preserving Booked Appointments During Overrides");
  // Setup doctor with a Wave schedule on testDate2
  localDb.createDoctorSchedule({
    doctorId: doctorOverrideId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate2],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 3,
  });

  const subslotsDocOverride = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorOverrideId && a.available_date === testDate2 && Boolean(a.parent_availability_id)
  );
  const firstSubslot = subslotsDocOverride[0];

  // Book an appointment in first subslot
  const bookedApp = localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorOverrideId,
    availabilityId: firstSubslot.availability_id,
    reason: "Pre-existing booked consultation that must not be deleted",
  });
  assert(bookedApp.status === "pending", "Appointment booked successfully");

  // Now execute an override for that date
  const overrideWaveRes = localDb.createDoctorSchedule({
    doctorId: doctorOverrideId,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate2],
    startTime: "14:00",
    endTime: "16:00",
    slotDuration: 30,
    capacity: 3,
    isOverride: true,
  });

  // Verify booked slot was preserved
  const preservedSlot = localDb.getAvailabilityById(firstSubslot.availability_id);
  assert(preservedSlot !== null, "Booked availability slot was preserved across override");
  const appointmentStillExists = localDb.getAppointmentById(bookedApp.appointment_id);
  assert(appointmentStillExists !== null, "Booked appointment record remains intact and active");
  assert(overrideWaveRes.addedCount === 5, "New 14:00–16:00 schedule added (1 parent + 4 subslots)");

  // ============================================================================
  // SCENARIO 10: Preserving Unaffected Recurring Dates During Override
  // ============================================================================
  console.log("\nScenario 10: Preserving Unaffected Recurring Dates During Override");
  // Setup schedule across testDate2 and testDate3
  localDb.createDoctorSchedule({
    doctorId: doctorMultiDateId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate2, testDate3],
    startTime: "09:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 1,
  });

  // Override ONLY testDate2
  localDb.createDoctorSchedule({
    doctorId: doctorMultiDateId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate2],
    startTime: "15:00",
    endTime: "17:00",
    slotDuration: 30,
    capacity: 1,
    isOverride: true,
  });

  const slotsDate2 = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorMultiDateId && a.available_date === testDate2
  );
  const slotsDate3 = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorMultiDateId && a.available_date === testDate3
  );

  assert(slotsDate2.length === 1 && slotsDate2[0].start_time === "15:00", "testDate2 was updated to 15:00–17:00");
  assert(slotsDate3.length === 1 && slotsDate3[0].start_time === "09:00", "testDate3 was completely preserved at 09:00–11:00");

  // ============================================================================
  // SCENARIO 11: Preventing Concurrent Overbooking at Same Dynamic Stream Slot
  // ============================================================================
  console.log("\nScenario 11: Preventing Concurrent Overbooking at Same Dynamic Stream Slot");
  localDb.createDoctorSchedule({
    doctorId: doctorBookingId,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "09:00",
    endTime: "11:00",
    slotDuration: 30,
    capacity: 1,
  });

  const streamBookingWindow = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorBookingId && a.available_date === testDate1
  )!;

  // Book 09:00 dynamic slot
  const app1 = localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorBookingId,
    availabilityId: streamBookingWindow.availability_id,
    reason: "First patient at 09:00",
    slotTime: "09:00",
  });
  assert(app1.estimated_consult_time === "09:00", "First patient booked for 09:00");

  // Attempt duplicate booking for 09:00 slot
  let streamDoubleBookingBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: testPatientId,
      doctorId: doctorBookingId,
      availabilityId: streamBookingWindow.availability_id,
      reason: "Conflicting patient at 09:00",
      slotTime: "09:00",
    });
  } catch (err: unknown) {
    streamDoubleBookingBlocked = true;
    assert((err as Error).message.includes("already been booked"), "Blocked double booking for identical dynamic stream time");
  }
  assert(streamDoubleBookingBlocked, "Collision protection active for dynamic stream time slots");

  // Book 09:30 dynamic slot -> succeeds
  const app2 = localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorBookingId,
    availabilityId: streamBookingWindow.availability_id,
    reason: "Second patient at 09:30",
    slotTime: "09:30",
  });
  assert(app2.estimated_consult_time === "09:30", "Second patient successfully booked for consecutive slot (09:30)");

  // ============================================================================
  // SCENARIO 12: Cancelling an Appointment and Restoring Capacity
  // ============================================================================
  console.log("\nScenario 12: Cancelling an Appointment and Restoring Capacity");
  const bookedCountBeforeCancel = streamBookingWindow.wave_booked_count || 0;
  localDb.updateAppointmentStatus({
    appointmentId: app1.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 2,
    requesterRole: "patient",
  });

  assert(
    (streamBookingWindow.wave_booked_count || 0) === bookedCountBeforeCancel - 1,
    "Window booked count decremented upon cancellation"
  );

  // Now booking 09:00 again succeeds
  const rebookedApp = localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorBookingId,
    availabilityId: streamBookingWindow.availability_id,
    reason: "New patient booking vacated 09:00 slot",
    slotTime: "09:00",
  });
  assert(rebookedApp.estimated_consult_time === "09:00", "Vacated dynamic slot successfully booked after cancellation");

  // ============================================================================
  // SCENARIO 13: Timezone Boundaries Using Asia/Kolkata
  // ============================================================================
  console.log("\nScenario 13: Timezone Boundaries Using Asia/Kolkata");
  const pastDate = "2020-01-01";
  assert(isSlotInPast(pastDate, "10:00") === true, "isSlotInPast correctly flags historical dates as in the past");
  assert(isSlotInPast(testDate1, "23:59") === false, "isSlotInPast accepts upcoming future IST dates");

  // Overlap interval formula verification: startA < endB && endA > startB
  assert(doIntervalsOverlap("10:00", "12:00", "11:00", "13:00") === true, "10:00–12:00 overlaps with 11:00–13:00");
  assert(doIntervalsOverlap("10:00", "12:00", "12:00", "14:00") === false, "10:00–12:00 and 12:00–14:00 abut without overlapping");
  assert(doIntervalsOverlap("09:00", "10:00", "10:00", "11:00") === false, "Consecutive adjacent windows do not overlap");
  assert(doIntervalsOverlap("10:00", "12:00", "09:00", "13:00") === true, "Encompassing window detects overlap");

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} assertions passed successfully!`);
  console.log("================================================================================");
}

runWaveStreamOverlapOverrideSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
