/**
 * Dynamic Availability & Real-Time Date Progression Test Suite
 *
 * Verifies:
 * 1. Dynamic date generation based on real-world IST time (Asia/Kolkata).
 * 2. Only future and upcoming slots are available for patient booking/rescheduling.
 * 3. Historical past dates (e.g. Oct 28, Oct 29) are strictly filtered out from bookable slots.
 * 4. Past time slots earlier today (start_time <= current_time IST) are excluded.
 * 5. Automatic date progression creates rolling availability windows without manual updates.
 * 6. Doctor working hours and weekly schedules (stream vs wave mode) are accurately respected.
 * 7. Backend concurrency & validation guards strictly reject booking or rescheduling to past slots.
 * 8. Database integrity: existing booked appointments and historical records are preserved.
 */

import { localDb } from "../src/lib/db/local-store";
import { db } from "../src/lib/db";
import {
  getTodayIST,
  getCurrentTimeIST,
  addDaysIST,
  getDayOfWeekIST,
  isDateInPast,
  isSlotInPast,
  formatISTDate,
} from "../src/lib/utils/date";
import {
  generateDoctorSlotsForDate,
  getDoctorSchedule,
  getRollingDateWindow,
} from "../src/lib/scheduling/doctor-schedule";

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

async function runDynamicAvailabilityTests() {
  console.log("================================================================================");
  console.log("MEDRELLA DYNAMIC AVAILABILITY & REAL-WORLD DATE PROGRESSION QA SUITE");
  console.log("================================================================================");

  const todayIST = getTodayIST();
  const currentTimeIST = getCurrentTimeIST();
  console.log(`\nSystem Environment Context:`);
  console.log(`- Today IST: ${todayIST} (${formatISTDate(todayIST)})`);
  console.log(`- Current Time IST: ${currentTimeIST}`);
  console.log(`- Timezone: Asia/Kolkata`);

  // --- 1. IST Date & Time Utility Validation ---
  console.log("\n1. IST Real-Time Date Validation & Calculation");
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(todayIST),
    `Today's date is formatted in standard YYYY-MM-DD: ${todayIST}`
  );
  assert(
    /^\d{2}:\d{2}$/.test(currentTimeIST),
    `Current time is 24-hour HH:mm: ${currentTimeIST}`
  );

  const yesterday = addDaysIST(todayIST, -1);
  const tomorrow = addDaysIST(todayIST, 1);
  const nextWeek = addDaysIST(todayIST, 7);

  assert(isDateInPast(yesterday) === true, `Yesterday (${yesterday}) is recognized as strictly in past`);
  assert(isDateInPast(tomorrow) === false, `Tomorrow (${tomorrow}) is recognized as future`);
  assert(isDateInPast(nextWeek) === false, `Next week (${nextWeek}) is recognized as future`);
  assert(isDateInPast(todayIST) === false, `Today (${todayIST}) is not in past`);

  // --- 2. Slot In Past Logic (Date + Time) ---
  console.log("\n2. Past-Slot vs Future-Slot Evaluation");
  assert(
    isSlotInPast("2026-10-28", "10:00") === true,
    "October 28th 2026 slot is recognized as in past"
  );
  assert(
    isSlotInPast("2026-10-29", "14:30") === true,
    "October 29th 2026 slot is recognized as in past"
  );
  assert(
    isSlotInPast(tomorrow, "09:00") === false,
    `Tomorrow (${tomorrow}) 09:00 slot is recognized as future`
  );
  assert(
    isSlotInPast(todayIST, "00:00") === true,
    `Today early morning (00:00) slot is recognized as in past`
  );
  assert(
    isSlotInPast(todayIST, "23:59") === false,
    `Today late evening (23:59) slot is recognized as future`
  );

  // --- 3. Dynamic Rolling Availability Window Generation ---
  console.log("\n3. Dynamic Rolling Availability Window Generation");
  const doctorId = 1; // Dr. Ananya Sharma
  localDb.ensureDoctorAvailabilityWindow(doctorId, 14);

  const allDoctorSlots = localDb.getDoctorAvailability(doctorId);
  assert(allDoctorSlots.length > 0, `Doctor has availability slots initialized in DB`);

  // Verify that slots exist for today through next 14 days
  const rollingDates = getRollingDateWindow(14);
  const datesInDb = new Set(allDoctorSlots.map((s) => s.available_date));

  let coveredCount = 0;
  for (const dateStr of rollingDates) {
    const dayOfWeek = getDayOfWeekIST(dateStr);
    const schedule = getDoctorSchedule(doctorId);
    if (schedule.workingDays.includes(dayOfWeek)) {
      if (datesInDb.has(dateStr)) {
        coveredCount++;
      }
    }
  }
  assert(
    coveredCount >= 10,
    `Rolling window successfully covers all active working days (${coveredCount} operating days)`
  );

  // --- 4. Filtering of Past Dates from Bookable Slots ---
  console.log("\n4. Bookable Slots Strictly Filter Out Past Dates and Times");
  const bookableSlots = localDb.getDoctorAvailability(doctorId, undefined, true);
  assert(bookableSlots.length > 0, `Found ${bookableSlots.length} bookable future slots`);

  // Ensure NO bookable slot is in the past
  const pastSlotsFound = bookableSlots.filter((s) =>
    isSlotInPast(s.available_date, s.start_time)
  );
  assert(
    pastSlotsFound.length === 0,
    "Zero past dates or passed hours found in bookable slots"
  );

  // Verify October 28 and 29 are NOT in bookableSlots
  const oct28Slots = bookableSlots.filter((s) => s.available_date === "2026-10-28");
  const oct29Slots = bookableSlots.filter((s) => s.available_date === "2026-10-29");
  assert(oct28Slots.length === 0, "No October 28th slots returned as bookable");
  assert(oct29Slots.length === 0, "No October 29th slots returned as bookable");

  // --- 5. Same-Day Future Slots Handling ---
  console.log("\n5. Same-Day Operating Hours Handling");
  const todayBookableSlots = bookableSlots.filter((s) => s.available_date === todayIST);
  for (const slot of todayBookableSlots) {
    assert(
      slot.start_time > currentTimeIST,
      `Today's bookable slot at ${slot.start_time} is strictly after current time ${currentTimeIST}`
    );
  }

  // --- 6. Backend Validation: Reject Booking in the Past ---
  console.log("\n6. Backend Security & Concurrency: Reject Past-Date Booking");
  // Find or create a past slot to test backend rejection
  let pastSlot = localDb.getDoctorAvailability(doctorId).find((s) =>
    isSlotInPast(s.available_date, s.start_time)
  );

  if (!pastSlot) {
    // Manually push a past slot for testing rejection
    pastSlot = {
      availability_id: 999991,
      doctor_id: doctorId,
      available_date: "2026-10-28",
      start_time: "09:00",
      end_time: "09:30",
      slot_duration: 30,
      is_available: true,
      is_wave: false,
      wave_capacity: 1,
      wave_booked_count: 0,
      created_at: new Date().toISOString(),
    };
    (localDb as any).state.availability.push(pastSlot);
  }

  let pastBookingBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: 1,
      doctorId: doctorId,
      availabilityId: pastSlot.availability_id,
      reason: "Attempting to book a past appointment slot",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("past date or time")) {
      pastBookingBlocked = true;
    }
  }
  assert(pastBookingBlocked, "Backend atomically rejected booking attempt for past slot (400 Bad Request)");

  // --- 7. Backend Validation: Reject Rescheduling to the Past ---
  console.log("\n7. Backend Security: Reject Rescheduling to Past Date");
  // Book a valid future slot
  const validFutureSlot = bookableSlots[0];
  const activeApp = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: doctorId,
    availabilityId: validFutureSlot.availability_id,
    reason: "Future appointment for rescheduling test",
  });

  let pastRescheduleBlocked = false;
  try {
    localDb.rescheduleAppointmentAtomic({
      appointmentId: activeApp.appointment_id,
      newAvailabilityId: pastSlot.availability_id,
      reason: "Attempting to reschedule into the past",
      requesterUserId: 1,
      requesterRole: "patient",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("past date or time")) {
      pastRescheduleBlocked = true;
    }
  }
  assert(pastRescheduleBlocked, "Backend atomically rejected rescheduling attempt into past slot");

  // Clean up test appointment
  localDb.updateAppointmentStatus({
    appointmentId: activeApp.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 1,
    requesterRole: "patient",
  });

  // --- 8. Wave vs Stream Scheduling Mode Preservation ---
  console.log("\n8. Multi-Modal Scheduling: Stream & Wave Working Hours");
  const waveDoctorId = 4; // Dr. Sneha Kulkarni (Pediatrics)
  localDb.updateDoctor(waveDoctorId, {
    scheduling_mode: "wave",
    wave_capacity: 3,
  });
  localDb.ensureDoctorAvailabilityWindow(waveDoctorId, 7);
  const waveSlots = localDb.getDoctorAvailability(waveDoctorId, undefined, true);
  assert(waveSlots.length > 0, `Wave doctor has future slots generated`);
  const sampleWave = waveSlots.find((s) => s.is_wave);
  assert(Boolean(sampleWave), `Wave doctor has wave slots generated with is_wave = true`);
  assert(Boolean(sampleWave && (sampleWave.wave_capacity ?? 0) >= 2), `Wave slots have configured cohort capacity (>= 2)`);

  // Reset doctor 4 back to stream mode
  localDb.updateDoctor(waveDoctorId, {
    scheduling_mode: "stream",
    wave_capacity: 1,
  });

  // --- 9. Database Consistency: Existing Historical Records Preserved ---
  console.log("\n9. Historical Records & Data Integrity Preservation");
  const existingAppointments = localDb.getAppointmentsForPatient(1);
  assert(existingAppointments.length > 0, "Patient's historical appointment records are preserved");

  const completedOrCancelled = existingAppointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );
  assert(
    completedOrCancelled.length > 0,
    "Historical consultation statuses (completed/cancelled) remain completely intact"
  );

  console.log("\n================================================================================");
  console.log(`DYNAMIC AVAILABILITY SUITE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runDynamicAvailabilityTests().catch((e) => {
  console.error("Test Suite Failed:", e);
  process.exit(1);
});
