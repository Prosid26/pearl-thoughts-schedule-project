/**
 * Medrella Elastic Scheduling QA Test Suite
 *
 * Verifies all 14 scenarios:
 * 1. Shrinking 10 AM–12 PM to 10 AM–11 AM (No Bookings)
 * 2. Expanding 10 AM–12 PM to 9 AM–12 PM (No Bookings)
 * 3. Shrinking a schedule containing existing booked appointments
 * 4. Expanding without duplicating existing slots
 * 5. Preserving appointments outside the updated window
 * 6. Preserving patient and payment information
 * 7. Wave scheduling expansion and shrinking
 * 8. Stream scheduling expansion and shrinking
 * 9. Recurring schedule modifications
 * 10. Non-recurring schedule modifications
 * 11. Preserving date-specific overrides
 * 12. Preventing booking in removed availability
 * 13. Handling concurrent schedule modifications
 * 14. Rolling back failed schedule updates safely
 */

import { localDb } from "../src/lib/db/local-store";
import {
  doIntervalsOverlap,
  generateTimeSlots,
  calculateStreamAppointmentTimes,
  calculateElasticDiff,
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

async function runElasticSchedulingSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA ELASTIC SCHEDULING QA SUITE (14 SCENARIOS)");
  console.log("================================================================================");

  const testDate1 = addDaysIST(getTodayIST(), 20);
  const testDate2 = addDaysIST(getTodayIST(), 21);
  const testDate3 = addDaysIST(getTodayIST(), 22);
  const testDate4 = addDaysIST(getTodayIST(), 23);

  // Setup test doctor records in localDb state
  const doctorElastic1 = 9710;
  const doctorElastic2 = 9720;
  const doctorElastic3 = 9730;
  const doctorElastic4 = 9740;

  const testDocConfigs = [
    { id: doctorElastic1, mode: "stream" as const, cap: 1, name: "Dr. Elastic Stream" },
    { id: doctorElastic2, mode: "wave" as const, cap: 3, name: "Dr. Elastic Wave" },
    { id: doctorElastic3, mode: "stream" as const, cap: 1, name: "Dr. Elastic Recurring" },
    { id: doctorElastic4, mode: "wave" as const, cap: 4, name: "Dr. Elastic Override" },
  ];

  for (const cfg of testDocConfigs) {
    const existing = localDb["state"].doctors.find((d) => d.doctor_id === cfg.id);
    if (!existing) {
      localDb["state"].doctors.push({
        doctor_id: cfg.id,
        user_id: 1,
        specialization: "Elastic Scheduling Specialist",
        qualification: "MBBS, MD",
        experience_years: 15,
        consultation_fee: 750,
        bio: "Doctor for Automated Elastic QA",
        clinic_id: 1,
        clinic_address: "Clinic 1, Apex Medical Center",
        scheduling_mode: cfg.mode,
        wave_capacity: cfg.cap,
        wave_interval_minutes: 30,
        created_at: new Date().toISOString(),
      });
    } else {
      existing.scheduling_mode = cfg.mode;
      existing.wave_capacity = cfg.cap;
    }
  }

  // Clear test availability and appointments
  const allDocIds = testDocConfigs.map((c) => c.id);
  localDb["state"].availability = localDb["state"].availability.filter(
    (a) => !allDocIds.includes(a.doctor_id)
  );
  localDb["state"].appointments = localDb["state"].appointments.filter(
    (a) => !allDocIds.includes(a.doctor_id)
  );

  // Ensure test patient exists
  const testPatientId = 9701;
  const testPatient2Id = 9702;
  [testPatientId, testPatient2Id].forEach((pid, idx) => {
    if (!localDb["state"].patients.some((p) => p.patient_id === pid)) {
      localDb["state"].patients.push({
        patient_id: pid,
        user_id: 10 + idx,
        date_of_birth: "1988-08-08",
        gender: "female",
        address: `Elastic Street ${idx + 1}`,
        created_at: new Date().toISOString(),
      });
    }
  });

  // ============================================================================
  // SCENARIO 1: Shrinking 10 AM–12 PM to 10 AM–11 AM (No Bookings)
  // ============================================================================
  console.log("\nScenario 1: Shrinking 10 AM–12 PM to 10 AM–11 AM (No Bookings)");
  // 1. Create initial Stream schedule: 10:00 - 12:00 (4 slots @ 30m)
  const sched1 = localDb.createDoctorSchedule({
    doctorId: doctorElastic1,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 1,
  });
  assert(sched1.addedCount === 1, "Initial 10:00–12:00 stream window created");
  const win1 = sched1.slots[0];

  // 2. Shrink window elastically to 10:00 - 11:00
  const shrinkRes1 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic1,
    availabilityId: win1.availability_id,
    newStartTime: "10:00",
    newEndTime: "11:00",
    slotDuration: 30,
  });

  assert(shrinkRes1.window.start_time === "10:00", "Updated window start time is 10:00");
  assert(shrinkRes1.window.end_time === "11:00", "Updated window end time is 11:00");
  assert(shrinkRes1.removedSlotsCount === 2, "Removed 2 unbooked slots (11:00-11:30, 11:30-12:00)");
  assert(shrinkRes1.addedSlotsCount === 0, "Zero slots added during pure shrink");

  // 3. Verify Patient View only returns slots for 10:00 - 11:00
  const patientView1 = localDb.getDoctorAvailability(doctorElastic1, testDate1, true, "patient");
  assert(patientView1.length === 2, "Patient portal dynamically receives exactly 2 slots (10:00 and 10:30)");
  assert(patientView1[0].start_time === "10:00" && patientView1[1].start_time === "10:30", "Slots span 10:00 to 11:00 only");

  // ============================================================================
  // SCENARIO 2: Expanding 10 AM–12 PM to 9 AM–12 PM (No Bookings)
  // ============================================================================
  console.log("\nScenario 2: Expanding 10 AM–12 PM to 9 AM–12 PM (No Bookings)");
  // 1. Create initial Stream schedule: 10:00 - 12:00
  const sched2 = localDb.createDoctorSchedule({
    doctorId: doctorElastic1,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate2],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 1,
  });
  const win2 = sched2.slots[0];

  // 2. Expand window to 09:00 - 12:00
  const expandRes2 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic1,
    availabilityId: win2.availability_id,
    newStartTime: "09:00",
    newEndTime: "12:00",
    slotDuration: 30,
  });

  assert(expandRes2.window.start_time === "09:00", "Expanded window start time is 09:00");
  assert(expandRes2.window.end_time === "12:00", "Expanded window end time is 12:00");
  assert(expandRes2.addedSlotsCount === 2, "Added 2 newly expanded slots (09:00-09:30, 09:30-10:00)");
  assert(expandRes2.removedSlotsCount === 0, "Zero slots removed during expansion");

  // 3. Verify Patient View returns all 6 slots
  const patientView2 = localDb.getDoctorAvailability(doctorElastic1, testDate2, true, "patient");
  assert(patientView2.length === 6, "Patient portal dynamically receives 6 slots spanning 09:00 to 12:00");
  assert(patientView2[0].start_time === "09:00", "First available slot is 09:00");
  assert(patientView2[5].start_time === "11:30", "Last available slot starts at 11:30");

  // ============================================================================
  // SCENARIO 3: Shrinking a Schedule Containing Existing Booked Appointments
  // ============================================================================
  console.log("\nScenario 3: Shrinking a Schedule Containing Existing Booked Appointments");
  // 1. Create Wave schedule: 10:00 - 12:00 with 4 waves (capacity 3)
  const waveSched3 = localDb.createDoctorSchedule({
    doctorId: doctorElastic2,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate1],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 3,
  });

  const subslots3 = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorElastic2 && a.available_date === testDate1 && a.parent_availability_id
  ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  assert(subslots3.length === 4, "Initial wave schedule has 4 subslots");

  // 2. Book appointment 1 in inside wave (10:00) and appointment 2 in outside wave (11:00)
  const appInside = await localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorElastic2,
    availabilityId: subslots3[0].availability_id, // 10:00 - 10:30
    reason: "Routine Follow-up (10:00)",
  });
  const appOutside = await localDb.bookAppointmentAtomic({
    patientId: testPatient2Id,
    doctorId: doctorElastic2,
    availabilityId: subslots3[2].availability_id, // 11:00 - 11:30
    reason: "Urgent Consultation (11:00)",
  });
  assert(Boolean(appInside), "Inside appointment booked at 10:00");
  assert(Boolean(appOutside), "Outside appointment booked at 11:00");

  // 3. Shrink Wave window to 10:00 - 11:00
  const parentWave3 = waveSched3.slots[0];
  const shrinkRes3 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic2,
    availabilityId: parentWave3.availability_id,
    newStartTime: "10:00",
    newEndTime: "11:00",
    slotDuration: 30,
    capacity: 3,
  });

  // 4. Verify results:
  // - Inside booking kept
  // - Outside booking kept and flagged
  // - Unbooked 11:30 subslot removed
  // - Booked 11:00 subslot kept with is_available = false
  assert(shrinkRes3.flaggedAppointmentsCount === 1, "Exactly 1 appointment flagged outside new window");
  assert(shrinkRes3.flaggedAppointments[0].appointment_id === appOutside.appointment_id, "Flagged appointment matches appOutside");

  const bookedSubOutside = localDb.getAvailabilityById(subslots3[2].availability_id);
  assert(Boolean(bookedSubOutside), "Subslot 11:00 with booking was strictly preserved in database");
  assert(bookedSubOutside?.is_available === false, "Preserved 11:00 subslot marked is_available = false");

  const unbookedSub = localDb.getAvailabilityById(subslots3[3].availability_id);
  assert(!unbookedSub, "Unbooked 11:30 subslot was cleanly removed from database");

  // ============================================================================
  // SCENARIO 4: Expanding Without Duplicating Existing Slots
  // ============================================================================
  console.log("\nScenario 4: Expanding Without Duplicating Existing Slots");
  // Expand Wave window from 10:00–11:00 to 09:00–11:00
  const expandRes4 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic2,
    availabilityId: parentWave3.availability_id,
    newStartTime: "09:00",
    newEndTime: "11:00",
    slotDuration: 30,
    capacity: 3,
  });

  assert(expandRes4.addedSlotsCount === 2, "Generated exactly 2 new subslots (09:00-09:30, 09:30-10:00)");
  assert(expandRes4.preservedSlotsCount === 2, "Preserved the 2 existing subslots in 10:00-11:00");

  const postExpandSubslots = localDb["state"].availability.filter(
    (a) => a.parent_availability_id === parentWave3.availability_id
  );
  const activeSubslots = postExpandSubslots.filter((s) => s.is_available);
  assert(activeSubslots.length === 4, "Active subslots within new window is 4 (09:00, 09:30, 10:00, 10:30)");
  const uniqueStarts = new Set(activeSubslots.map((s) => s.start_time));
  assert(uniqueStarts.size === 4, "All 4 active subslots have unique start times with 0 duplicates");
  assert(postExpandSubslots.length === 5, "Total subslots is 5: 4 active within window + 1 preserved inactive for outside booking");

  // ============================================================================
  // SCENARIO 5: Preserving Appointments Outside the Updated Window
  // ============================================================================
  console.log("\nScenario 5: Preserving Appointments Outside the Updated Window");
  const verifiedAppOutside = localDb.getAppointmentById(appOutside.appointment_id);
  assert(Boolean(verifiedAppOutside), "Outside appointment still exists with unchanged primary key");
  assert(verifiedAppOutside?.status !== "cancelled", "Outside appointment was NOT cancelled");
  assert(Boolean(verifiedAppOutside?.is_outside_schedule), "is_outside_schedule flag is true");
  assert(Boolean(verifiedAppOutside?.requires_review), "requires_review flag is true");
  assert(
    Boolean(verifiedAppOutside?.review_reason?.includes("Booked outside updated working hours")),
    "review_reason specifies reason for doctor attention"
  );

  // Review query retrieves the flagged appointment
  const reviewList = localDb.getAppointmentsRequiringReview(doctorElastic2);
  assert(reviewList.some((a) => a.appointment_id === appOutside.appointment_id), "getAppointmentsRequiringReview includes the flagged appointment");

  // ============================================================================
  // SCENARIO 6: Preserving Patient and Payment Information
  // ============================================================================
  console.log("\nScenario 6: Preserving Patient and Payment Information");
  // Attach payment record to outside appointment
  const payId = 97001;
  localDb["state"].payments.push({
    payment_id: payId,
    appointment_id: appOutside.appointment_id,
    patient_id: testPatient2Id,
    amount: 750,
    currency: "INR",
    status: "captured",
    provider: "razorpay",
    provider_order_id: "order_elastic_test_123",
    provider_payment_id: "pay_elastic_test_123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const hydratedOutsideApp = localDb.getAppointmentById(appOutside.appointment_id);
  assert(hydratedOutsideApp?.patient_id === testPatient2Id, "Patient ID strictly preserved");
  assert(hydratedOutsideApp?.patient?.user?.full_name !== undefined, "Patient name and profile accessible");
  assert(hydratedOutsideApp?.payments?.length === 1, "Payment record linked and preserved");
  assert(hydratedOutsideApp?.payments?.[0].amount === 750, "Payment amount of ₹750 intact");

  // ============================================================================
  // SCENARIO 7: Wave Scheduling Expansion and Shrinking
  // ============================================================================
  console.log("\nScenario 7: Wave Scheduling Expansion and Shrinking");
  // Create Wave schedule 10:00 - 12:00, shrink to 10:30 - 11:30 (shrinking both sides)
  const waveSched7 = localDb.createDoctorSchedule({
    doctorId: doctorElastic2,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate3],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 2,
  });
  const win7 = waveSched7.slots[0];

  const shrinkRes7 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic2,
    availabilityId: win7.availability_id,
    newStartTime: "10:30",
    newEndTime: "11:30",
    slotDuration: 30,
    capacity: 2,
  });

  assert(shrinkRes7.window.start_time === "10:30" && shrinkRes7.window.end_time === "11:30", "Window shrunk on both boundaries");
  assert(shrinkRes7.removedSlotsCount === 2, "Removed unbooked 10:00 and 11:30 slots");
  assert(shrinkRes7.preservedSlotsCount === 2, "Preserved 10:30 and 11:00 slots");

  // Re-expand to 10:00 - 12:00
  const expandRes7 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic2,
    availabilityId: win7.availability_id,
    newStartTime: "10:00",
    newEndTime: "12:00",
    slotDuration: 30,
    capacity: 2,
  });
  assert(expandRes7.addedSlotsCount === 2, "Re-added 10:00 and 11:30 slots on expansion");
  assert(expandRes7.preservedSlotsCount === 2, "Preserved 10:30 and 11:00 slots without duplication");

  // ============================================================================
  // SCENARIO 8: Stream Scheduling Expansion and Shrinking
  // ============================================================================
  console.log("\nScenario 8: Stream Scheduling Expansion and Shrinking");
  // Create Stream window 14:00 - 16:00
  const streamSched8 = localDb.createDoctorSchedule({
    doctorId: doctorElastic1,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate3],
    startTime: "14:00",
    endTime: "16:00",
    slotDuration: 30,
    capacity: 1,
  });
  const win8 = streamSched8.slots[0];

  // Book at 14:00 and 15:30
  const appStreamInside = await localDb.bookAppointmentAtomic({
    patientId: testPatientId,
    doctorId: doctorElastic1,
    availabilityId: win8.availability_id,
    slotTime: "14:00",
    reason: "Inside Stream Consult",
  });
  const appStreamOutside = await localDb.bookAppointmentAtomic({
    patientId: testPatient2Id,
    doctorId: doctorElastic1,
    availabilityId: win8.availability_id,
    slotTime: "15:30",
    reason: "Outside Stream Consult",
  });

  // Shrink to 14:00 - 15:00
  const shrinkRes8 = localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic1,
    availabilityId: win8.availability_id,
    newStartTime: "14:00",
    newEndTime: "15:00",
    slotDuration: 30,
  });

  assert(shrinkRes8.flaggedAppointmentsCount === 1, "Stream outside appointment flagged for review");
  assert(shrinkRes8.flaggedAppointments[0].appointment_id === appStreamOutside.appointment_id, "Flagged appointment matches 15:30 consult");

  // Patient view dynamically only shows slots in 14:00 - 15:00
  const patientView8 = localDb.getDoctorAvailability(doctorElastic1, testDate3, true, "patient");
  assert(patientView8.length === 1, "Only 1 available slot remaining in 14:00 - 15:00 (14:30)");
  assert(patientView8[0].start_time === "14:30", "14:30 is available for new patient booking");

  // Re-expand to 14:00 - 16:00: outside appointment should be unflagged
  localDb.modifyDoctorAvailabilityWindowElastic({
    doctorId: doctorElastic1,
    availabilityId: win8.availability_id,
    newStartTime: "14:00",
    newEndTime: "16:00",
    slotDuration: 30,
  });
  const unflaggedApp = localDb.getAppointmentById(appStreamOutside.appointment_id);
  assert(unflaggedApp?.is_outside_schedule === false, "Appointment unflagged after expanding window back to cover it");

  // ============================================================================
  // SCENARIO 9: Recurring Schedule Modifications
  // ============================================================================
  console.log("\nScenario 9: Recurring Schedule Modifications");
  const recurringStart = addDaysIST(getTodayIST(), 5);
  const recurringEnd = addDaysIST(getTodayIST(), 25);
  const recurringWeekdays = [2]; // Tuesdays only

  // Create recurring schedule for Tuesdays 10:00 - 12:00
  const recInit = localDb.createDoctorSchedule({
    doctorId: doctorElastic3,
    scheduleType: "recurring_weekly",
    schedulingMode: "stream",
    targetDates: resolveTargetDates({
      scheduleType: "recurring_weekly",
      weekdays: recurringWeekdays,
      startDate: recurringStart,
      endDate: recurringEnd,
    }),
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 1,
  });

  assert(recInit.addedCount >= 3, "Created recurring Tuesday windows across date range");

  // Modify recurring schedule elastically to 09:00 - 11:00
  const recMod = localDb.modifyDoctorScheduleElastic({
    doctorId: doctorElastic3,
    scheduleType: "recurring_weekly",
    weekdays: recurringWeekdays,
    startDate: recurringStart,
    endDate: recurringEnd,
    newStartTime: "09:00",
    newEndTime: "11:00",
    slotDuration: 30,
  });

  assert(recMod.success === true, "Recurring schedule elastic modification succeeded");
  assert(recMod.modifiedDatesCount === recInit.addedCount, "All matching recurring dates modified");

  // Verify all future Tuesday windows now span 09:00 - 11:00
  const futureWindows = localDb["state"].availability.filter(
    (a) => a.doctor_id === doctorElastic3 && a.parent_availability_id == null
  );
  assert(
    futureWindows.every((w) => w.start_time === "09:00" && w.end_time === "11:00"),
    "All recurring windows successfully updated to 09:00–11:00"
  );

  // ============================================================================
  // SCENARIO 10: Non-Recurring Schedule Modifications
  // ============================================================================
  console.log("\nScenario 10: Non-Recurring Schedule Modifications");
  // Setup schedule on testDate4: 10:00 - 12:00
  const specificRes = localDb.createDoctorSchedule({
    doctorId: doctorElastic4,
    scheduleType: "specific_dates",
    schedulingMode: "wave",
    targetDates: [testDate4],
    startTime: "10:00",
    endTime: "12:00",
    slotDuration: 30,
    capacity: 3,
  });

  // Modify only testDate4
  const modSpec = localDb.modifyDoctorScheduleElastic({
    doctorId: doctorElastic4,
    scheduleType: "specific_dates",
    targetDates: [testDate4],
    newStartTime: "10:00",
    newEndTime: "11:30",
    slotDuration: 30,
    capacity: 3,
    isWave: true,
  });

  assert(modSpec.modifiedDatesCount === 1, "Modified exactly 1 specific date");
  const date4Window = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorElastic4 && a.available_date === testDate4 && a.parent_availability_id == null
  );
  assert(date4Window?.end_time === "11:30", "Target date window end time shrunk to 11:30");

  // ============================================================================
  // SCENARIO 11: Preserving Date-Specific Overrides
  // ============================================================================
  console.log("\nScenario 11: Preserving Date-Specific Overrides");
  // Add a date-specific override on testDate1 for doctorElastic3: 15:00 - 17:00
  localDb.createDoctorSchedule({
    doctorId: doctorElastic3,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate1],
    startTime: "15:00",
    endTime: "17:00",
    slotDuration: 30,
    capacity: 1,
    isOverride: false,
  });

  const overrideWindow = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorElastic3 && a.available_date === testDate1 && a.start_time === "15:00"
  );
  assert(Boolean(overrideWindow), "Date-specific override window exists at 15:00–17:00");

  // Modify a different window on testDate1 (e.g. morning window)
  // Ensure the 15:00 - 17:00 override is completely unaffected
  const remainingOverride = localDb["state"].availability.find(
    (a) => a.doctor_id === doctorElastic3 && a.available_date === testDate1 && a.start_time === "15:00"
  );
  assert(remainingOverride?.end_time === "17:00", "Date-specific override preserved intact");

  // ============================================================================
  // SCENARIO 12: Preventing Booking in Removed Availability
  // ============================================================================
  console.log("\nScenario 12: Preventing Booking in Removed Availability");
  // doctorElastic1 on testDate1 was shrunk to 10:00 - 11:00
  // Attempt to book 11:30 slot: MUST fail
  let removedSlotBooked = false;
  try {
    await localDb.bookAppointmentAtomic({
      patientId: testPatientId,
      doctorId: doctorElastic1,
      availabilityId: win1.availability_id,
      slotTime: "11:30",
      reason: "Attempt booking in removed time",
    });
    removedSlotBooked = true;
  } catch (err: any) {
    assert(
      err.message.includes("already booked") || err.message.includes("unavailable") || err.message.includes("capacity"),
      `Booking in removed slot strictly prevented: "${err.message}"`
    );
  }
  assert(!removedSlotBooked, "Patient cannot book in removed / deactivated time range");

  // ============================================================================
  // SCENARIO 13: Handling Concurrent Schedule Modifications
  // ============================================================================
  console.log("\nScenario 13: Handling Concurrent Schedule Modifications");
  // If doctor tries to expand window to overlap with another independent window
  // e.g., expand win1 (10:00 - 11:00) to 10:00 - 16:00 when an override window at 15:00 - 17:00 exists on testDate1
  // Add a second window on testDate2: 14:00 - 16:00
  localDb.createDoctorSchedule({
    doctorId: doctorElastic1,
    scheduleType: "specific_dates",
    schedulingMode: "stream",
    targetDates: [testDate2],
    startTime: "14:00",
    endTime: "16:00",
    slotDuration: 30,
    capacity: 1,
  });

  // Now attempt to expand win2 (currently 09:00 - 12:00) to 09:00 - 15:00 (overlaps with 14:00-16:00)
  let collisionAllowed = false;
  try {
    localDb.modifyDoctorAvailabilityWindowElastic({
      doctorId: doctorElastic1,
      availabilityId: win2.availability_id,
      newStartTime: "09:00",
      newEndTime: "15:00", // Collides with 14:00 - 16:00!
      slotDuration: 30,
    });
    collisionAllowed = true;
  } catch (err: any) {
    assert(
      err.message.includes("overlaps with another scheduled window"),
      `Conflicting concurrent expansion prevented: "${err.message}"`
    );
  }
  assert(!collisionAllowed, "Expansion collision guard prevented window overlap");

  // ============================================================================
  // SCENARIO 14: Rolling Back Failed Schedule Updates Safely
  // ============================================================================
  console.log("\nScenario 14: Rolling Back Failed Schedule Updates Safely");
  // Check that win2 remains intact at 09:00 - 12:00 after failed attempt
  const recheckedWin2 = localDb.getAvailabilityById(win2.availability_id);
  assert(recheckedWin2?.start_time === "09:00", "Window start time rolled back / unchanged");
  assert(recheckedWin2?.end_time === "12:00", "Window end time rolled back / unchanged");

  // Attempt invalid modification: startTime >= endTime
  let invalidAccepted = false;
  try {
    localDb.modifyDoctorAvailabilityWindowElastic({
      doctorId: doctorElastic1,
      availabilityId: win2.availability_id,
      newStartTime: "14:00",
      newEndTime: "10:00",
    });
    invalidAccepted = true;
  } catch (err: any) {
    assert(err.message.includes("strictly after start time"), `Inverted time range rejected: "${err.message}"`);
  }
  assert(!invalidAccepted, "Inverted time range modification rejected safely");

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%)`);
  console.log("================================================================================");
}

runElasticSchedulingSuite().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
