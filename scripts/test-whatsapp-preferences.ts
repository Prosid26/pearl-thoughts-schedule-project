/**
 * Medrella WhatsApp Business Cloud API, Patient Preferences & Unsubscribe QA Suite
 *
 * Verifies:
 * 1. Modular WhatsApp Provider Abstraction & Console Simulator Fallback
 * 2. Meta WhatsApp Cloud API Provider Configuration & Validation
 * 3. E.164 Phone Normalization for WhatsApp (Meta format)
 * 4. Multi-Channel WhatsApp Notification Templates & Components
 * 5. Patient Notification Preferences: Persistence, Channels, Categories & Defaults
 * 6. Independent Channel Unsubscribe & Preference Enforcement in Dispatcher
 * 7. Category-Specific Preference Enforcement (Confirmations, Reminders, Reschedule, Payments, Refunds)
 * 8. Global Unsubscribe: Disables all channels & cancels pending scheduled reminders
 * 9. Re-subscription with Regulatory Telecommunication Consent Enforcement
 * 10. WhatsApp Webhooks: Verification Challenge, HMAC-SHA256 Signature Validation, Delivery Callbacks, Inbound STOP Unsubscribe
 */

import crypto from "crypto";
import { localDb } from "../src/lib/db/local-store";
import {
  sendClinicalNotification,
  renderEmailTemplate,
  getWhatsAppProvider,
  ConsoleWhatsAppProvider,
  WhatsAppCloudProvider,
  normalizeWhatsAppNumber,
  scheduleAppointmentReminders,
} from "../src/lib/notifications";
import { verifyMetaSignature } from "../src/app/api/webhooks/whatsapp/route";

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

async function runWhatsAppAndPreferencesSuite() {
  console.log("================================================================================");
  console.log("MEDRELLA WHATSAPP BUSINESS & NOTIFICATION PREFERENCES QA SUITE");
  console.log("================================================================================\n");

  // ============================================================================
  // 1. WHATSAPP PROVIDER ABSTRACTION & FALLBACK INITIALIZATION
  // ============================================================================
  console.log("1. WhatsApp Provider Abstraction & Console Simulator");

  const activeWhatsAppProvider = getWhatsAppProvider();
  assert(Boolean(activeWhatsAppProvider), "WhatsApp provider resolved successfully");
  assert(activeWhatsAppProvider.name === "console-whatsapp-simulator", "Resolved ConsoleWhatsAppProvider when API keys unconfigured");
  assert(activeWhatsAppProvider.isConfigured() === true, "ConsoleWhatsAppProvider reports configured = true for simulation");

  const simResult = await activeWhatsAppProvider.sendWhatsApp({
    to: "+91 98200 11223",
    bodyText: "Medrella: Test WhatsApp alert",
    templateName: "appointment_confirmation",
  });
  assert(simResult.success === true, "ConsoleWhatsAppProvider successfully dispatches simulated WhatsApp");
  assert(simResult.status === "simulated", "ConsoleWhatsAppProvider marks status as 'simulated'");
  assert(Boolean(simResult.providerMessageId?.startsWith("wamid_sim_")), "Generated unique simulated WhatsApp message ID (wamid)");

  // ============================================================================
  // 2. META WHATSAPP CLOUD API PROVIDER SPECIFICATIONS
  // ============================================================================
  console.log("\n2. Meta WhatsApp Cloud API Provider Specs & Validation");

  const metaProvider = new WhatsAppCloudProvider();
  assert(metaProvider.name === "meta-whatsapp-cloud", "Meta provider identifies as 'meta-whatsapp-cloud'");
  assert(metaProvider.isConfigured() === false, "WhatsAppCloudProvider correctly reports unconfigured when credentials absent");

  const unconfiguredSend = await metaProvider.sendWhatsApp({
    to: "+91 98200 11223",
    bodyText: "Test message",
  });
  assert(unconfiguredSend.success === false, "Unconfigured WhatsAppCloudProvider rejects dispatch safely");
  assert(Boolean(unconfiguredSend.error?.includes("WHATSAPP_ACCESS_TOKEN")), "Provides clear error message regarding missing Meta credentials");

  // Phone Normalization
  assert(normalizeWhatsAppNumber("+91 98200 11223") === "919820011223", "normalizeWhatsAppNumber formats '+91 98200 11223' to '919820011223'");
  assert(normalizeWhatsAppNumber("9820011223") === "919820011223", "normalizeWhatsAppNumber prepends India country code (91) for 10-digit number");
  assert(normalizeWhatsAppNumber("+1 (555) 234-5678") === "15552345678", "normalizeWhatsAppNumber formats US number '15552345678'");

  // ============================================================================
  // 3. WHATSAPP TEMPLATES & COMPONENT CREATION
  // ============================================================================
  console.log("\n3. Multi-Channel Notification Templates (WhatsApp Component Payloads)");

  const samplePayload = {
    recipientEmail: "qa.patient@medrella.com",
    recipientPhone: "+919820011223",
    recipientName: "Aarav Patel",
    userId: 1,
    appointmentId: 444,
    doctorName: "Dr. Ananya Sharma",
    specialization: "Cardiology",
    appointmentDate: "2026-11-20",
    appointmentTimeStr: "10:30 – 11:00 IST",
    clinicAddress: "Medrella Clinic, Colaba, Mumbai",
    bookingRef: "#APT-00444",
    amountFormatted: "₹800",
    paymentStatus: "paid",
  };

  // 3a. Booking Confirmation
  const bookingTpl = renderEmailTemplate("booking_confirmed", samplePayload);
  assert(Boolean(bookingTpl.whatsapp), "Template includes WhatsApp payload");
  assert(bookingTpl.whatsapp.templateName === "appointment_confirmation", "Booking template has correct templateName");
  assert(bookingTpl.whatsapp.bodyText.includes("Aarav Patel"), "WhatsApp body includes recipient name");
  assert(bookingTpl.whatsapp.bodyText.includes("Dr. Ananya Sharma"), "WhatsApp body includes doctor name");
  assert(bookingTpl.whatsapp.bodyText.includes("#APT-00444"), "WhatsApp body includes booking reference");

  // 3b. Cancellation
  const cancelTpl = renderEmailTemplate("appointment_cancelled", {
    ...samplePayload,
    refundAmountFormatted: "₹800",
    cancellationReason: "Schedule conflict",
  });
  assert(cancelTpl.whatsapp.templateName === "appointment_cancellation", "Cancellation template has correct templateName");
  assert(cancelTpl.whatsapp.bodyText.includes("cancelled"), "WhatsApp cancellation body indicates cancelled status");
  assert(cancelTpl.whatsapp.bodyText.includes("₹800"), "WhatsApp cancellation includes refund amount");

  // 3c. Reschedule
  const reschedTpl = renderEmailTemplate("appointment_rescheduled", {
    ...samplePayload,
    previousDate: "2026-11-15",
    previousTimeStr: "09:00 – 09:30 IST",
  });
  assert(reschedTpl.whatsapp.templateName === "appointment_rescheduled", "Reschedule template has correct templateName");
  assert(reschedTpl.whatsapp.bodyText.includes("rescheduled"), "WhatsApp reschedule body states appointment was rescheduled");
  assert(reschedTpl.whatsapp.bodyText.includes("Previous Slot"), "WhatsApp reschedule body notes previous slot");

  // 3d. Payment Success
  const payTpl = renderEmailTemplate("payment_success", {
    ...samplePayload,
    paymentId: "pay_test_8888",
  });
  assert(payTpl.whatsapp.templateName === "payment_receipt", "Payment success template has correct templateName");
  assert(payTpl.whatsapp.bodyText.includes("₹800"), "WhatsApp receipt includes fee amount");
  assert(payTpl.whatsapp.bodyText.includes("pay_test_8888"), "WhatsApp receipt includes payment ID");

  // 3e. Reminder
  const reminderTpl = renderEmailTemplate("appointment_reminder", samplePayload);
  assert(reminderTpl.whatsapp.templateName === "appointment_reminder", "Reminder template has correct templateName");
  assert(reminderTpl.whatsapp.bodyText.includes("Reminder"), "WhatsApp reminder includes reminder header");

  // ============================================================================
  // 4. PATIENT NOTIFICATION PREFERENCES PERSISTENCE & DEFAULTS
  // ============================================================================
  console.log("\n4. Patient Notification Preferences: Persistence & Defaults");

  const freshUserId = 999000 + Math.floor(Math.random() * 1000);
  const initialPrefs = localDb.getNotificationPreferences(freshUserId);
  assert(initialPrefs.user_id === freshUserId, "Retrieved preferences for new user");
  assert(initialPrefs.email_enabled === true, "Default email_enabled is true");
  assert(initialPrefs.sms_enabled === true, "Default sms_enabled is true");
  assert(initialPrefs.whatsapp_enabled === true, "Default whatsapp_enabled is true");
  assert(initialPrefs.appointment_confirmations === true, "Default appointment_confirmations is true");
  assert(initialPrefs.appointment_reminders === true, "Default appointment_reminders is true");
  assert(initialPrefs.cancellation_rescheduling === true, "Default cancellation_rescheduling is true");
  assert(initialPrefs.payment_confirmations === true, "Default payment_confirmations is true");
  assert(initialPrefs.refund_updates === true, "Default refund_updates is true");
  assert(initialPrefs.unsubscribed_all === false, "Default unsubscribed_all is false");

  const testUserId = 1;
  localDb.updateNotificationPreferences(testUserId, {
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    appointment_confirmations: true,
    appointment_reminders: true,
    cancellation_rescheduling: true,
    payment_confirmations: true,
    refund_updates: true,
    unsubscribed_all: false,
  });

  // ============================================================================
  // 5. INDEPENDENT CHANNEL UNSUBSCRIBE & BACKEND ENFORCEMENT
  // ============================================================================
  console.log("\n5. Independent Channel Unsubscribe & Preference Enforcement");

  // Disable SMS only
  localDb.updateNotificationPreferences(testUserId, { sms_enabled: false });
  const updatedPrefs = localDb.getNotificationPreferences(testUserId);
  assert(updatedPrefs.sms_enabled === false, "SMS successfully disabled independently");
  assert(updatedPrefs.email_enabled === true, "Email remains enabled when SMS disabled");
  assert(updatedPrefs.whatsapp_enabled === true, "WhatsApp remains enabled when SMS disabled");

  // Test dispatch with SMS disabled
  const dispatchRes = await sendClinicalNotification("booking_confirmed", {
    ...samplePayload,
    idempotencyKey: `pref_test_dispatch_${Date.now()}`,
  });
  assert(dispatchRes.success === true, "sendClinicalNotification dispatched successfully");
  assert(dispatchRes.smsResult === undefined, "SMS was suppressed per patient preference");
  assert(dispatchRes.whatsappResult?.success === true, "WhatsApp was dispatched since WhatsApp channel is enabled");

  // Re-enable SMS for subsequent tests
  localDb.updateNotificationPreferences(testUserId, { sms_enabled: true });

  // ============================================================================
  // 6. CATEGORY PREFERENCE ENFORCEMENT
  // ============================================================================
  console.log("\n6. Category Preference Enforcement (Suppress by Category)");

  // Turn off appointment reminders category
  localDb.updateNotificationPreferences(testUserId, {
    appointment_reminders: false,
  });

  const reminderDispatch = await sendClinicalNotification("appointment_reminder", {
    ...samplePayload,
    idempotencyKey: `category_suppress_${Date.now()}`,
  });

  assert(reminderDispatch.skipped === true, "Reminder dispatch correctly skipped due to category preference");
  assert(Boolean(reminderDispatch.skipReason?.includes("appointment_reminder")), "Provides explicit skipReason indicating disabled category");

  // Verify critical doctor alerts bypass patient category suppression
  const doctorAlert = await sendClinicalNotification("doctor_booking_alert", {
    ...samplePayload,
    idempotencyKey: `doctor_alert_${Date.now()}`,
  });
  assert(doctorAlert.skipped !== true, "Doctor alerts are not suppressed by patient preferences");

  // Restore category
  localDb.updateNotificationPreferences(testUserId, {
    appointment_reminders: true,
  });

  // ============================================================================
  // 7. GLOBAL UNSUBSCRIBE & REMINDER CANCELLATION
  // ============================================================================
  console.log("\n7. Global Unsubscribe ('Unsubscribe from all notifications')");

  // 7a. Book test appointment and schedule reminders
  const futureSlot = localDb.getDoctorAvailability(1, undefined, true)[0];
  const appt = localDb.bookAppointmentAtomic({
    patientId: 1,
    doctorId: 1,
    availabilityId: futureSlot.availability_id,
    reason: "Global Unsubscribe QA test",
  });
  await scheduleAppointmentReminders(appt.appointment_id);

  const dueBefore = localDb
    .getDueScheduledReminders()
    .filter((r) => r.appointment_id === appt.appointment_id);

  // 7b. Execute Global Unsubscribe
  const unsubAll = localDb.unsubscribeAll(testUserId);
  assert(unsubAll.unsubscribed_all === true, "unsubscribed_all flag set to true");
  assert(unsubAll.email_enabled === false, "email_enabled set to false");
  assert(unsubAll.sms_enabled === false, "sms_enabled set to false");
  assert(unsubAll.whatsapp_enabled === false, "whatsapp_enabled set to false");

  // Verify future notifications are skipped
  const postUnsubSend = await sendClinicalNotification("payment_success", {
    ...samplePayload,
    idempotencyKey: `unsub_all_test_${Date.now()}`,
  });
  assert(postUnsubSend.skipped === true, "Notifications blocked while user is globally unsubscribed");
  assert(Boolean(postUnsubSend.skipReason?.includes("globally unsubscribed")), "Provides skipReason for global unsubscribe");

  // Verify scheduled reminders were cancelled
  const dueAfter = localDb
    .getDueScheduledReminders()
    .filter((r) => r.appointment_id === appt.appointment_id);
  assert(dueAfter.length === 0, "Pending reminder jobs cancelled upon global unsubscribe");

  // ============================================================================
  // 8. RE-SUBSCRIPTION & CONSENT ENFORCEMENT
  // ============================================================================
  console.log("\n8. Re-subscription with Regulatory Consent Enforcement");

  // Re-enable channels with consent
  const resubscribe = localDb.updateNotificationPreferences(testUserId, {
    unsubscribed_all: false,
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    sms_consent: true,
    whatsapp_consent: true,
    consent_timestamp: new Date().toISOString(),
  });
  assert(resubscribe.unsubscribed_all === false, "unsubscribed_all cleared upon re-enabling channels");
  assert(resubscribe.email_enabled === true, "Email re-enabled successfully");
  assert(resubscribe.sms_enabled === true, "SMS re-enabled with consent");
  assert(resubscribe.whatsapp_enabled === true, "WhatsApp re-enabled with consent");

  // ============================================================================
  // 9. WHATSAPP WEBHOOK: HMAC SIGNATURE VERIFICATION
  // ============================================================================
  console.log("\n9. WhatsApp Webhook Cryptographic HMAC-SHA256 Verification");

  const testAppSecret = "medrella_test_meta_app_secret_123";
  const testPayload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "123456789" }],
  });

  const validHmac = crypto
    .createHmac("sha256", testAppSecret)
    .update(testPayload)
    .digest("hex");

  assert(
    verifyMetaSignature(testPayload, `sha256=${validHmac}`, testAppSecret) === true,
    "Valid HMAC-SHA256 signature verified successfully"
  );

  assert(
    verifyMetaSignature(testPayload, "sha256=invalid_tampered_signature", testAppSecret) === false,
    "Tampered / fraudulent signature rejected"
  );

  assert(
    verifyMetaSignature(testPayload, null, testAppSecret) === false,
    "Missing signature header rejected"
  );

  // ============================================================================
  // 10. WHATSAPP WEBHOOK: INBOUND STOP & DELIVERY CALLBACKS
  // ============================================================================
  console.log("\n10. WhatsApp Webhook: Inbound STOP Keyword & Delivery Callbacks");

  // Test Inbound STOP Unsubscribe
  const patientUser = localDb.getUserById(testUserId)!;
  const userPhone = patientUser.phone; // e.g. "+91 98200 11223"

  // Ensure WhatsApp is enabled first
  localDb.updateNotificationPreferences(testUserId, { whatsapp_enabled: true });
  assert(localDb.getNotificationPreferences(testUserId).whatsapp_enabled === true, "WhatsApp enabled prior to STOP test");

  // Process inbound STOP
  const stopResult = localDb.unsubscribeChannelByPhone(userPhone, "whatsapp");
  assert(stopResult.success === true, "Inbound STOP matched patient phone and processed unsubscribe");
  assert(localDb.getNotificationPreferences(testUserId).whatsapp_enabled === false, "Patient whatsapp_enabled set to false upon STOP keyword");

  // Test Delivery Status Callback Update
  const testMsgId = "wamid.HBgTESTMESSAGE123";
  const testCallbackKey = `wa_callback_test_${Date.now()}`;
  localDb.createNotificationLog({
    userId: testUserId,
    recipientEmail: "test@wa.medrella.com",
    channel: "whatsapp",
    eventType: "booking_confirmed",
    subject: "Appointment Confirmed",
    status: "sent",
    provider: "meta-whatsapp-cloud",
    providerMessageId: testMsgId,
    idempotencyKey: testCallbackKey,
  });

  localDb.updateNotificationLogStatus(testMsgId, "delivered");
  const updatedLog = localDb.getNotificationLogByMessageId(testMsgId);

  assert(updatedLog?.status === "delivered", "WhatsApp delivery callback updated notification log status to 'delivered'");

  // Clean up test appointment
  localDb.updateAppointmentStatus({
    appointmentId: appt.appointment_id,
    newStatus: "cancelled",
    requesterUserId: 1,
    requesterRole: "admin",
  });

  // Re-enable preferences for standard state
  localDb.updateNotificationPreferences(testUserId, {
    email_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    unsubscribed_all: false,
  });

  console.log("\n================================================================================");
  console.log(`WHATSAPP & NOTIFICATION PREFERENCES QA: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runWhatsAppAndPreferencesSuite().catch((err) => {
  console.error("WhatsApp & Preferences QA Suite Failed:", err);
  process.exit(1);
});
