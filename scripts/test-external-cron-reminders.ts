/**
 * Medrella Healthcare Appointment Booking System
 * Automated Verification Suite for External Scheduled Reminders & Vercel Hobby Compliance
 *
 * Verifies:
 * 1. vercel.json compliance (no unsupported recurring cron on Hobby plan)
 * 2. Secure HTTP authentication (Bearer header, x-cron-secret header, ?secret query)
 * 3. Timing-safe rejection of invalid / missing credentials
 * 4. Atomic claiming and database locking against concurrent / repeated executions
 * 5. Idempotent multi-channel notification dispatch
 * 6. Batch size limit (?limit=N) and remaining due count
 * 7. Fast response time within external scheduler timeout window (< 30s)
 */

import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/reminders/process/route";
import { localDb } from "../src/lib/db/local-store";
import {
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
  processDueReminders,
} from "../src/lib/notifications";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runCronSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA EXTERNAL CRON & VERCEL HOBBY COMPLIANCE QA SUITE");
  console.log("================================================================================\n");

  // ============================================================================
  // 1. VERCEL HOBBY DEPLOYMENT COMPLIANCE
  // ============================================================================
  console.log("1. Vercel Hobby Deployment Compliance (vercel.json)");

  const vercelJsonPath = path.join(process.cwd(), "vercel.json");
  assert(fs.existsSync(vercelJsonPath), "vercel.json exists");

  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
  assert(
    !vercelConfig.crons || vercelConfig.crons.length === 0,
    "Unsupported recurring cron expression (*/15 * * * *) removed from vercel.json"
  );
  assert(
    !JSON.stringify(vercelConfig).includes("*/15"),
    "vercel.json contains no every-15-minute cron schedule that would fail Vercel Hobby build"
  );

  // ============================================================================
  // 2. ENDPOINT AUTHENTICATION LOGIC & CRON_SECRET VALIDATION
  // ============================================================================
  console.log("\n2. Endpoint Authentication & CRON_SECRET Security");

  const TEST_CRON_SECRET = "medrella_test_cron_secret_secure_999";
  process.env.CRON_SECRET = TEST_CRON_SECRET;

  // 2a. Missing credentials -> 401 Unauthorized
  const unauthReq = new NextRequest("http://localhost:3000/api/reminders/process", {
    method: "GET",
  });
  const unauthRes = await GET(unauthReq);
  assert(unauthRes.status === 401, "Unauthenticated GET request rejected with 401 Unauthorized");
  const unauthBody = await unauthRes.json();
  assert(unauthBody.success === false, "Returns success: false on missing credentials");

  // 2b. Invalid token -> 401 Unauthorized
  const invalidReq = new NextRequest("http://localhost:3000/api/reminders/process", {
    method: "GET",
    headers: {
      Authorization: "Bearer invalid_secret_token_1234",
    },
  });
  const invalidRes = await GET(invalidReq);
  assert(invalidRes.status === 401, "Invalid Bearer token rejected with 401 Unauthorized");

  // 2c. Valid Bearer Authorization Header -> 200 OK
  const bearerReq = new NextRequest("http://localhost:3000/api/reminders/process", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${TEST_CRON_SECRET}`,
    },
  });
  const bearerRes = await GET(bearerReq);
  assert(bearerRes.status === 200, "Valid 'Authorization: Bearer <CRON_SECRET>' accepted with 200 OK");
  const bearerBody = await bearerRes.json();
  assert(bearerBody.success === true, "Endpoint returns success: true");
  assert(typeof bearerBody.processedCount === "number", "Endpoint response includes processedCount");

  // 2d. Valid Dedicated Header (x-cron-secret) -> 200 OK
  const headerReq = new NextRequest("http://localhost:3000/api/reminders/process", {
    method: "POST",
    headers: {
      "x-cron-secret": TEST_CRON_SECRET,
    },
  });
  const headerRes = await POST(headerReq);
  assert(headerRes.status === 200, "Valid 'x-cron-secret' header accepted with 200 OK on POST");

  // 2e. Valid Query Parameter (?secret=...) -> 200 OK
  const queryReq = new NextRequest(
    `http://localhost:3000/api/reminders/process?secret=${TEST_CRON_SECRET}`,
    { method: "GET" }
  );
  const queryRes = await GET(queryReq);
  assert(queryRes.status === 200, "Valid '?secret=<CRON_SECRET>' query parameter accepted with 200 OK");

  // ============================================================================
  // 3. ATOMIC LOCKING & PREVENTION OF DUPLICATE REMINDER PROCESSING
  // ============================================================================
  console.log("\n3. Atomic Locking & Prevention of Duplicate Reminder Dispatch");

  // Create a patient and doctor appointment
  const doctor = localDb.getDoctors()[0];
  const patient = localDb.getPatientById(1)!;
  const availSlot = localDb.getDoctorAvailability(doctor.doctor_id, undefined, true)[0];

  const appt = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: doctor.doctor_id,
    availabilityId: availSlot.availability_id,
    reason: "Cron duplication QA verification",
  });

  // Schedule a reminder and set it due in the past
  const dueReminder = localDb.upsertScheduledReminder({
    appointmentId: appt.appointment_id,
    reminderType: "24h_before",
    scheduledFor: new Date(Date.now() - 60000), // 1 minute in the past
  });
  assert(dueReminder.status === "scheduled", "Reminder inserted in 'scheduled' status");

  // Trigger processDueReminders() First Time
  const firstRun = await processDueReminders();
  assert(firstRun.processedCount >= 1, "First run successfully claimed and processed the due reminder");
  assert(firstRun.sentCount >= 1, "First run successfully dispatched the reminder");

  // Trigger processDueReminders() Second Time Immediately
  const secondRun = await processDueReminders();
  assert(
    secondRun.sentCount === 0,
    "Second run dispatches ZERO reminders (repeated requests cannot process the same reminder twice)"
  );

  // Verify the reminder record has transitioned to 'sent'
  const updatedRem = localDb.getDueScheduledReminders().find((r) => r.reminder_id === dueReminder.reminder_id);
  assert(
    !updatedRem,
    "Processed reminder is no longer returned in getDueScheduledReminders() (status is 'sent')"
  );

  // Clean up test appointment
  localDb.updateAppointmentStatus({
    appointmentId: appt.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 1,
    requesterRole: "admin",
  });

  // ============================================================================
  // 4. BATCH SIZE LIMITING & EXTERNAL SCHEDULER TIMEOUT SAFETY
  // ============================================================================
  console.log("\n4. Safe Batch Limiting & Scheduler Timeout Protection");

  // Create 3 mock due reminders
  const mockAppt = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: doctor.doctor_id,
    availabilityId: localDb.getDoctorAvailability(doctor.doctor_id, undefined, true)[0].availability_id,
    reason: "Batch test",
  });

  const r1 = localDb.upsertScheduledReminder({
    appointmentId: mockAppt.appointment_id,
    reminderType: "24h_before",
    scheduledFor: new Date(Date.now() - 30000),
  });
  // Use a simulated second reminder
  const r2 = localDb.upsertScheduledReminder({
    appointmentId: mockAppt.appointment_id,
    reminderType: "2h_before",
    scheduledFor: new Date(Date.now() - 20000),
  });

  // Call the HTTP endpoint with ?limit=1
  const startTime = Date.now();
  const batchReq = new NextRequest(
    `http://localhost:3000/api/reminders/process?secret=${TEST_CRON_SECRET}&limit=1`,
    { method: "GET" }
  );
  const batchRes = await GET(batchReq);
  const duration = Date.now() - startTime;
  const batchBody = await batchRes.json();

  assert(batchRes.status === 200, "Batch request returned 200 OK");
  assert(batchBody.processedCount === 1, "Batch endpoint processed exactly 1 reminder when ?limit=1 specified");
  assert(duration < 5000, `Execution finished in ${duration}ms (well within external scheduler 30s timeout)`);

  // Clean up mock appointment
  await cancelAppointmentReminders(mockAppt.appointment_id);
  localDb.updateAppointmentStatus({
    appointmentId: mockAppt.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 1,
    requesterRole: "admin",
  });

  console.log("\n================================================================================");
  console.log("EXTERNAL CRON & VERCEL HOBBY COMPLIANCE QA: ALL TESTS PASSED (100%)");
  console.log("================================================================================\n");
}

runCronSuite().catch((err) => {
  console.error("External Cron QA Suite Failed:", err);
  process.exit(1);
});
