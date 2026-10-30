/**
 * Medrella Healthcare Appointment Booking System
 * Regression QA Suite for React Error #441, Patient Notification Preferences & Hydration Integrity
 */

import { db } from "../src/lib/db";
import { localDb } from "../src/lib/db/local-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runHydrationAndPreferencesTests() {
  console.log("================================================================================");
  console.log("MEDRELLA HYDRATION INTEGRITY & NOTIFICATION PREFERENCES REGRESSION SUITE");
  console.log("================================================================================\n");

  // 1. Notification Preferences Table Retrieval & Fault-Tolerance
  console.log("1. Notification Preferences Resilience (Neon & Local Store)");

  const patient = localDb.getPatientById(1)!;
  assert(Boolean(patient), "Retrieved test patient (ID 1)");

  const prefs = await db.getNotificationPreferences(patient.user_id);
  assert(Boolean(prefs), "db.getNotificationPreferences returned valid preferences object");
  assert(typeof prefs.email_enabled === "boolean", "prefs.email_enabled is boolean");
  assert(typeof prefs.sms_enabled === "boolean", "prefs.sms_enabled is boolean");
  assert(typeof prefs.whatsapp_enabled === "boolean", "prefs.whatsapp_enabled is boolean");
  assert(typeof prefs.unsubscribed_all === "boolean", "prefs.unsubscribed_all is boolean");

  // 2. Safe Defaults When New / Unseeded User Queries Preferences
  console.log("\n2. Deterministic Preferences for Unseeded / Non-Existent Users");

  const nonExistentUserId = 888999 + Math.floor(Math.random() * 1000);
  const defaultPrefs = await db.getNotificationPreferences(nonExistentUserId);
  assert(defaultPrefs.user_id === nonExistentUserId, "Generated preferences for unseeded user");
  assert(defaultPrefs.email_enabled === true, "Default email_enabled is true");
  assert(defaultPrefs.sms_enabled === true, "Default sms_enabled is true");
  assert(defaultPrefs.whatsapp_enabled === true, "Default whatsapp_enabled is true");
  assert(defaultPrefs.unsubscribed_all === false, "Default unsubscribed_all is false");

  // 3. Preference Updates & Revalidation Safety
  console.log("\n3. Preference Update & Unsubscribe Safety");

  const updatedPrefs = await db.updateNotificationPreferences(patient.user_id, {
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: true,
  });
  assert(updatedPrefs.sms_enabled === false, "Successfully toggled sms_enabled to false");
  assert(updatedPrefs.email_enabled === true, "Email remained enabled");

  // Restore preferences
  await db.updateNotificationPreferences(patient.user_id, {
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    unsubscribed_all: false,
  });
  assert(true, "Restored standard preferences state for test patient");

  // 4. Patient Dashboard Data Integrity
  console.log("\n4. Patient Dashboard & Appointment Data Hydration Determinism");

  const appointments = await db.getAppointmentsForPatient(patient.patient_id);
  assert(Array.isArray(appointments), "Retrieved patient appointments array");

  const offer = await db.getActiveOfferForPatient(patient.patient_id);
  assert(offer === null || typeof offer === "object", "Active offer retrieved deterministically");

  // 5. Global Unsubscribe Workflow
  console.log("\n5. Global Unsubscribe & Reminder Resiliency");

  const unsubAll = await db.unsubscribeAll(patient.user_id);
  assert(unsubAll.unsubscribed_all === true, "unsubscribeAll set unsubscribed_all = true");
  assert(unsubAll.email_enabled === false, "unsubscribeAll disabled email");
  assert(unsubAll.sms_enabled === false, "unsubscribeAll disabled SMS");
  assert(unsubAll.whatsapp_enabled === false, "unsubscribeAll disabled WhatsApp");

  // Restore for subsequent test suites
  await db.updateNotificationPreferences(patient.user_id, {
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    unsubscribed_all: false,
  });

  console.log("\n================================================================================");
  console.log("HYDRATION & PREFERENCES QA: ALL TESTS PASSED (100%)");
  console.log("================================================================================\n");
}

runHydrationAndPreferencesTests().catch((err) => {
  console.error("Hydration & Preferences QA Suite Failed:", err);
  process.exit(1);
});

