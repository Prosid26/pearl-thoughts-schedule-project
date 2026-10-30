import assert from "assert";
import { db } from "../src/lib/db";
import { sendClinicalNotification } from "../src/lib/notifications/dispatcher";
import { processDueReminders } from "../src/lib/notifications/reminders";

async function runInAppNotificationTests() {
  console.log("=================================================");
  console.log("MEDRELLA IN-APP NOTIFICATION SYSTEM TEST SUITE");
  console.log("=================================================\n");

  const testUserPatient = 1; // Standard patient in test seed
  const testUserDoctor = 2;  // Standard doctor in test seed
  const testTimestamp = Date.now();

  // Test 1: Notification Creation for Patient & Doctor
  console.log("1. Testing In-App Notification Creation (Patient & Doctor)...");
  const patientNotif = await db.createInAppNotification({
    userId: testUserPatient,
    title: "Appointment Confirmed: Dr. Sharma",
    message: "Your appointment is confirmed for tomorrow at 10:00 AM IST.",
    category: "booking",
    appointmentId: 101,
    actionUrl: "/booking-confirmation?id=101",
    idempotencyKey: `test_inapp_patient_${testTimestamp}`,
  });

  assert(patientNotif, "Failed to create patient notification");
  assert.strictEqual(patientNotif.user_id, testUserPatient);
  assert.strictEqual(patientNotif.category, "booking");
  assert.strictEqual(patientNotif.is_read, false);
  assert.strictEqual(patientNotif.action_url, "/booking-confirmation?id=101");

  const doctorNotif = await db.createInAppNotification({
    userId: testUserDoctor,
    title: "New Booking Request",
    message: "Patient Rahul Verma booked slot for tomorrow at 10:00 AM IST.",
    category: "booking",
    appointmentId: 101,
    actionUrl: "/doctor/appointments",
    idempotencyKey: `test_inapp_doc_${testTimestamp}`,
  });

  assert(doctorNotif, "Failed to create doctor notification");
  assert.strictEqual(doctorNotif.user_id, testUserDoctor);
  assert.strictEqual(doctorNotif.category, "booking");
  console.log("   [PASS] Created distinct notifications for patient and doctor.");

  // Test 2: Idempotency and Deduplication
  console.log("\n2. Testing Idempotency & Deduplication...");
  const duplicateNotif = await db.createInAppNotification({
    userId: testUserPatient,
    title: "Duplicate Attempt",
    message: "This should not be duplicated.",
    category: "booking",
    appointmentId: 101,
    actionUrl: "/booking-confirmation?id=101",
    idempotencyKey: `test_inapp_patient_${testTimestamp}`, // Exact same key
  });

  assert.strictEqual(
    duplicateNotif.notification_id,
    patientNotif.notification_id,
    "Idempotent insert should return existing notification"
  );
  console.log("   [PASS] Idempotency prevented duplicate notification creation.");

  // Test 3: Strict Data Isolation between Users
  console.log("\n3. Testing Strict User Data Isolation...");
  const patientList = await db.getInAppNotificationsForUser(testUserPatient);
  const doctorList = await db.getInAppNotificationsForUser(testUserDoctor);

  const patientHasDoctorNotif = patientList.some(
    (n) => n.notification_id === doctorNotif.notification_id
  );
  const doctorHasPatientNotif = doctorList.some(
    (n) => n.notification_id === patientNotif.notification_id
  );

  assert(!patientHasDoctorNotif, "Patient must not see doctor's notifications");
  assert(!doctorHasPatientNotif, "Doctor must not see patient's notifications");
  console.log("   [PASS] Cross-user notification leakage prevented.");

  // Test 4: Unread Count and Mark as Read
  console.log("\n4. Testing Read Status Updates & Unread Counts...");
  const initialUnreadCount = await db.getUnreadInAppNotificationCount(testUserPatient);
  assert(initialUnreadCount >= 1, "Unread count should be at least 1");

  // Mark single notification read
  const markedSingle = await db.markInAppNotificationRead(
    patientNotif.notification_id,
    testUserPatient
  );
  assert.strictEqual(markedSingle, true, "markInAppNotificationRead should return true for owner");

  const patientNotifsAfterMark = await db.getInAppNotificationsForUser(testUserPatient);
  const updatedNotif = patientNotifsAfterMark.find(
    (n) => n.notification_id === patientNotif.notification_id
  );
  assert(updatedNotif?.is_read, "Notification should now be marked as read in database");
  assert(updatedNotif?.read_at, "read_at timestamp must be populated");

  const unreadCountAfterOne = await db.getUnreadInAppNotificationCount(testUserPatient);
  assert.strictEqual(
    unreadCountAfterOne,
    initialUnreadCount - 1,
    "Unread count should decrement by 1"
  );

  // Cross-user unauthorized mark-as-read check
  const unauthorizedMark = await db.markInAppNotificationRead(
    doctorNotif.notification_id,
    testUserPatient
  );
  assert.strictEqual(
    unauthorizedMark,
    false,
    "Patient must not be able to mark doctor's notification as read"
  );

  // Mark all as read
  await db.createInAppNotification({
    userId: testUserPatient,
    title: "Second unread message",
    message: "Another message for unread count test.",
    category: "general",
    idempotencyKey: `test_unread_all_${testTimestamp}`,
  });

  const markedCount = await db.markAllInAppNotificationsRead(testUserPatient);
  assert(markedCount >= 1, "Should mark at least 1 unread notification");

  const finalUnreadCount = await db.getUnreadInAppNotificationCount(testUserPatient);
  assert.strictEqual(finalUnreadCount, 0, "Unread count must be 0 after markAllRead");
  console.log("   [PASS] Read/unread transitions and authorization guards verified.");

  // Test 5: Central Dispatcher Event In-App Mirroring
  console.log("\n5. Testing Dispatcher Event In-App Mirroring across Categories...");
  const eventsToTest = [
    { type: "booking_confirmed" as const, expectedCat: "booking" },
    { type: "appointment_cancelled" as const, expectedCat: "cancellation" },
    { type: "appointment_rescheduled" as const, expectedCat: "reschedule" },
    { type: "payment_success" as const, expectedCat: "payment" },
    { type: "refund_processed" as const, expectedCat: "refund" },
    { type: "appointment_reminder" as const, expectedCat: "reminder" },
  ];

  for (const { type, expectedCat } of eventsToTest) {
    const key = `test_dispatch_${type}_${testTimestamp}`;
    await sendClinicalNotification(type, {
      recipientEmail: "testpatient@medrella.com",
      recipientPhone: "+919876543210",
      recipientName: "Test Patient",
      userId: testUserPatient,
      appointmentId: 202,
      doctorName: "Dr. Ananya Roy",
      specialization: "Cardiology",
      appointmentDate: "2026-11-10",
      appointmentTimeStr: "11:00 AM IST",
      clinicAddress: "Suite 404, Medrella Clinic",
      amountFormatted: "INR 1,200",
      refundAmountFormatted: "INR 1,200",
      idempotencyKey: key,
    });

    const notifs = await db.getInAppNotificationsForUser(testUserPatient, { limit: 10 });
    const mirrored = notifs.find((n) => n.idempotency_key === `${key}_inapp`);
    assert(mirrored, `Dispatcher must generate in-app notification for ${type}`);
    assert.strictEqual(
      mirrored.category,
      expectedCat,
      `Category for ${type} should be ${expectedCat}`
    );
  }
  console.log("   [PASS] All 6 clinical event categories correctly mirrored into in-app notifications.");

  // Test 6: In-App Preference Toggle Enforcement
  console.log("\n6. Testing Notification Preference Enforcement (in_app_enabled)...");
  // Temporarily disable in-app notifications for patient
  await db.updateNotificationPreferences(testUserPatient, {
    in_app_enabled: false,
  });

  const suppressedKey = `test_suppressed_${testTimestamp}`;
  await sendClinicalNotification("booking_confirmed", {
    recipientEmail: "testpatient@medrella.com",
    recipientName: "Test Patient",
    userId: testUserPatient,
    appointmentId: 303,
    doctorName: "Dr. Roy",
    specialization: "General Medicine",
    appointmentDate: "2026-11-10",
    appointmentTimeStr: "10:00 AM IST",
    idempotencyKey: suppressedKey,
  });

  const notifsAfterSuppression = await db.getInAppNotificationsForUser(testUserPatient, { limit: 10 });
  const suppressedFound = notifsAfterSuppression.find(
    (n) => n.idempotency_key === `${suppressedKey}_inapp`
  );
  assert(!suppressedFound, "In-app notification must not be created when in_app_enabled is false");

  // Re-enable in-app notifications
  await db.updateNotificationPreferences(testUserPatient, {
    in_app_enabled: true,
  });
  console.log("   [PASS] User preference 'in_app_enabled = false' successfully respected.");

  // Test 7: Reminder In-App Generation Even When External Providers Suppressed
  console.log("\n7. Testing Reminder In-App Generation...");
  const reminderResult = await sendClinicalNotification("appointment_reminder", {
    recipientEmail: "testpatient@medrella.com",
    recipientName: "Test Patient",
    userId: testUserPatient,
    appointmentId: 404,
    doctorName: "Dr. Roy",
    specialization: "General Medicine",
    appointmentDate: "2026-11-12",
    appointmentTimeStr: "02:00 PM IST",
    reminderType: "24 hours prior",
    idempotencyKey: `test_reminder_inapp_${testTimestamp}`,
  });

  const reminderNotifs = await db.getInAppNotificationsForUser(testUserPatient, { limit: 5 });
  const reminderFound = reminderNotifs.find(
    (n) => n.idempotency_key === `test_reminder_inapp_${testTimestamp}_inapp`
  );
  assert(reminderFound, "Reminder in-app notification must be created");
  assert.strictEqual(reminderFound.category, "reminder");
  console.log("   [PASS] In-app reminder successfully created and verified.");

  console.log("\n=================================================");
  console.log("ALL IN-APP NOTIFICATION TESTS PASSED SUCCESSFULLY");
  console.log("=================================================");
}

runInAppNotificationTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
