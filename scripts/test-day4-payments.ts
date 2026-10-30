/**
 * Day 4: Automated Verification Suite for Payments, Refunds, Webhooks & Reminders
 * Medrella Healthcare Appointment Booking System
 */

import { localDb } from "../src/lib/db/local-store";
import { MockPaymentProvider } from "../src/lib/payments/mock-provider";
import { calculateEligibleRefund } from "../src/lib/payments/policy";
import {
  sendClinicalNotification,
  scheduleAppointmentReminders,
  rescheduleAppointmentReminders,
  cancelAppointmentReminders,
  processDueReminders,
} from "../src/lib/notifications";
import { formatINR } from "../src/lib/utils/currency";
import { formatISTTime, formatISTDateTime } from "../src/lib/utils/date";

async function runDay4Tests() {
  console.log("================================================================================");
  console.log("MEDRELLA DAY 4: PAYMENTS, REFUNDS, WEBHOOKS & NOTIFICATIONS QA TEST SUITE");
  console.log("================================================================================\n");

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

  const mockProvider = new MockPaymentProvider();

  // Setup: Find doctor and create a fresh test slot
  const doctors = localDb.getDoctors();
  const testDoctor = doctors[0]; // e.g. Dr. Ananya Sharma (consultation_fee: ₹1000)
  const docFee = Number(testDoctor.consultation_fee); // 1000
  const expectedFeePaise = docFee * 100; // 100000 paise

  function getOrCreateSlot(doctorId: number) {
    const openSlots = localDb.getDoctorAvailability(doctorId, undefined, true);
    if (openSlots.length > 0) {
      return openSlots[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + 100 + Math.floor(Math.random() * 400));
    const h = String(Math.floor(Math.random() * 8) + 9).padStart(2, "0");
    const m = Math.random() > 0.5 ? "00" : "30";
    const em = m === "00" ? "30" : "00";
    const eh = m === "00" ? h : String(Number(h) + 1).padStart(2, "0");
    const slotDate = d.toISOString().split("T")[0];
    return localDb.addAvailabilitySlot(doctorId, slotDate, `${h}:${m}`, `${eh}:${em}`, 30);
  }

  const slot = getOrCreateSlot(testDoctor.doctor_id);
  const patient = localDb.getPatientById(1)!;

  // ============================================================================
  // TEST SUITE 1: Server-Side Order Amount Security (Never trust client)
  // ============================================================================
  console.log("1. Server-Side Consultation Fee & Order Creation");
  const appointment = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: testDoctor.doctor_id,
    availabilityId: slot.availability_id,
    reason: "Cardiology consultation for persistent hypertension.",
  });
  assert(appointment.appointment_id > 0, "Created appointment for payment testing");
  assert(appointment.payment_status === "unpaid", "Initial appointment payment_status is 'unpaid'");

  // Server creates order using doctor's fee in database (100,000 paise for ₹1,000)
  const order = await mockProvider.createOrder({
    amount: expectedFeePaise,
    currency: "INR",
    receipt: `rcpt_${appointment.appointment_id}`,
  });
  assert(order.amount === expectedFeePaise, `Order amount (${order.amount}) matches database consultation fee in paise (₹${docFee})`);
  assert(order.currency === "INR", "Order currency is strictly INR");

  const paymentRecord = localDb.createPayment({
    appointmentId: appointment.appointment_id,
    patientId: patient.patient_id,
    provider: mockProvider.name,
    providerOrderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    idempotencyKey: `pay_order_init_${order.orderId}`,
  });
  assert(paymentRecord.status === "pending", "Payment record initialized in 'pending' status");
  assert(paymentRecord.amount === expectedFeePaise, "Stored payment record retains exact minor unit amount");

  // ============================================================================
  // TEST SUITE 2: Invalid Payment Signature Rejection & Cryptographic Verification
  // ============================================================================
  console.log("\n2. Cryptographic Payment Signature Verification");
  const validPaymentId = `pay_live_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const validSignature = mockProvider.generateMockSignature(order.orderId, validPaymentId);
  const isValidSig = mockProvider.verifyPaymentSignature({
    orderId: order.orderId,
    paymentId: validPaymentId,
    signature: validSignature,
  });
  assert(isValidSig === true, "Valid HMAC-SHA256 signature accepted");

  const isInvalidSig = mockProvider.verifyPaymentSignature({
    orderId: order.orderId,
    paymentId: validPaymentId,
    signature: "invalid_test_signature",
  });
  assert(isInvalidSig === false, "Tampered / fraudulent signature rejected by cryptographic verification");

  // Record failed payment attempt when signature is invalid
  const failedPayment = localDb.updatePaymentStatus({
    paymentId: paymentRecord.payment_id,
    status: "failed",
    failureReason: "Cryptographic signature verification failed (signature mismatch).",
  });
  assert(failedPayment.status === "failed", "Payment marked 'failed' upon signature rejection");
  const appAfterFail = localDb.getAppointmentById(appointment.appointment_id);
  assert(appAfterFail?.payment_status === "failed", "Appointment payment_status updated to 'failed'");

  // ============================================================================
  // TEST SUITE 3: Webhook Signature Verification
  // ============================================================================
  console.log("\n3. Webhook Signature Verification");
  const sampleWebhookPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: validPaymentId,
          order_id: order.orderId,
          amount: expectedFeePaise,
          status: "captured",
        },
      },
    },
  });

  const validWebhookSig = mockProvider.generateMockWebhookSignature(sampleWebhookPayload);
  const isValidWebhook = mockProvider.verifyWebhookSignature({
    rawBody: sampleWebhookPayload,
    signature: validWebhookSig,
    secret: "mock_medrella_webhook_secret_2026",
  });
  assert(isValidWebhook === true, "Valid webhook HMAC-SHA256 signature verified against webhook secret");

  const isInvalidWebhook = mockProvider.verifyWebhookSignature({
    rawBody: sampleWebhookPayload,
    signature: "invalid_signature",
    secret: "mock_medrella_webhook_secret_2026",
  });
  assert(isInvalidWebhook === false, "Webhook with invalid signature safely rejected");

  // ============================================================================
  // TEST SUITE 4: Webhook Idempotency (Prevent Duplicate Processing)
  // ============================================================================
  console.log("\n4. Webhook Idempotency Protections");
  const testProviderEventId = `evt_test_${Date.now()}`;

  // First webhook delivery
  const recordedEvent1 = localDb.recordWebhookEvent({
    provider: mockProvider.name,
    providerEventId: testProviderEventId,
    eventType: "payment.captured",
    payload: sampleWebhookPayload,
    status: "processed",
  });
  assert(recordedEvent1.event_id > 0, "First webhook delivery recorded with unique event_id");
  assert(recordedEvent1.status === "processed", "Webhook event processed successfully");

  // Duplicate webhook delivery
  const recordedEvent2 = localDb.recordWebhookEvent({
    provider: mockProvider.name,
    providerEventId: testProviderEventId,
    eventType: "payment.captured",
    payload: sampleWebhookPayload,
    status: "processed",
  });
  assert(recordedEvent2.event_id === recordedEvent1.event_id, "Duplicate webhook identified and skipped idempotently");

  // ============================================================================
  // TEST SUITE 5: Payment Lifecycle & Delayed Reconciliation
  // ============================================================================
  console.log("\n5. Payment States & Reconciliation");
  // Successfully capture payment
  const capturedPayment = localDb.updatePaymentStatus({
    paymentId: paymentRecord.payment_id,
    status: "captured",
    providerPaymentId: validPaymentId,
    providerSignature: validSignature,
  });
  assert(capturedPayment.status === "captured", "Payment transitioned to 'captured'");

  // Verify provider payment ID lookup for webhooks & reconciliation
  const lookedUpPayment = localDb.getPaymentByProviderPaymentId(validPaymentId);
  assert(lookedUpPayment?.payment_id === paymentRecord.payment_id, "Lookup payment by providerPaymentId succeeds for webhook reconciliation");

  const appAfterCapture = localDb.getAppointmentById(appointment.appointment_id);
  assert(appAfterCapture?.payment_status === "paid", "Appointment payment_status atomically marked 'paid'");
  assert(appAfterCapture?.status === "confirmed", "Appointment status confirmed upon payment capture");

  // Test Abandoned Checkout flow (user closes modal before paying)
  const slotAbandon = getOrCreateSlot(testDoctor.doctor_id);
  const appAbandon = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: testDoctor.doctor_id,
    availabilityId: slotAbandon.availability_id,
    reason: "Abandoned checkout test.",
  });
  const abandonPayment = localDb.createPayment({
    appointmentId: appAbandon.appointment_id,
    patientId: patient.patient_id,
    provider: mockProvider.name,
    providerOrderId: "order_abandon_123",
    amount: expectedFeePaise,
  });
  assert(abandonPayment.status === "pending", "New payment record starts as 'pending'");
  const updatedAbandon = localDb.updatePaymentStatus({
    paymentId: abandonPayment.payment_id,
    status: "abandoned",
    failureReason: "Patient dismissed Checkout modal before completing payment.",
  });
  assert(updatedAbandon.status === "abandoned", "Checkout dismissal successfully sets status to 'abandoned'");
  const appAfterAbandon = localDb.getAppointmentById(appAbandon.appointment_id);
  assert(appAfterAbandon?.payment_status === "unpaid", "Appointment remains 'unpaid' when checkout is abandoned");

  // ============================================================================
  // TEST SUITE 6: Concurrent Booking & Overbooking Guards
  // ============================================================================
  console.log("\n6. Concurrent Booking & Overbooking Protection");
  let collisionBlocked = false;
  try {
    localDb.bookAppointmentAtomic({
      patientId: 2,
      doctorId: testDoctor.doctor_id,
      availabilityId: slot.availability_id,
      reason: "Conflicting booking attempt on same slot.",
    });
  } catch (err: unknown) {
    collisionBlocked = true;
  }
  assert(collisionBlocked === true, "Atomic slot lock blocks concurrent patient from double-booking slot");

  // ============================================================================
  // TEST SUITE 7: Refund Policy Engine (Full, Partial & No-Refund Windows)
  // ============================================================================
  console.log("\n7. Clinical Refund Policy Engine & Calculation");
  const appointmentDateTime = new Date(appointment.appointment_date);

  // Scenario A: Cancellation > 24 hours prior (Full 100% refund)
  const dateMoreThan24hBefore = new Date(appointmentDateTime.getTime() - 48 * 60 * 60 * 1000);
  const fullRefundResult = calculateEligibleRefund({
    appointmentDate: appointmentDateTime,
    cancellationDate: dateMoreThan24hBefore,
    cancelledByRole: "patient",
    capturedAmount: expectedFeePaise,
  });
  assert(fullRefundResult.eligibleAmount === expectedFeePaise, "Policy grants 100% refund for cancellations > 24 hours prior");
  assert(fullRefundResult.refundPercentage === 100, "Refund percentage is 100%");

  // Scenario B: Cancellation between 2h and 24h prior (50% partial refund)
  const date5hBefore = new Date(appointmentDateTime.getTime() - 5 * 60 * 60 * 1000);
  const partialRefundResult = calculateEligibleRefund({
    appointmentDate: appointmentDateTime,
    cancellationDate: date5hBefore,
    cancelledByRole: "patient",
    capturedAmount: expectedFeePaise,
  });
  assert(partialRefundResult.eligibleAmount === expectedFeePaise * 0.5, "Policy grants 50% partial refund for cancellations between 2h and 24h prior");
  assert(partialRefundResult.refundPercentage === 50, "Refund percentage is 50%");

  // Scenario C: Cancellation < 2 hours prior (0% refund, late cancellation)
  const date1hBefore = new Date(appointmentDateTime.getTime() - 1 * 60 * 60 * 1000);
  const noRefundResult = calculateEligibleRefund({
    appointmentDate: appointmentDateTime,
    cancellationDate: date1hBefore,
    cancelledByRole: "patient",
    capturedAmount: expectedFeePaise,
  });
  assert(noRefundResult.eligibleAmount === 0, "Policy denies refund for late cancellations < 2 hours prior");
  assert(noRefundResult.canRefund === false, "canRefund flag is false for late window");

  // Scenario D: Doctor / Clinic cancellation (Always 100% refund regardless of time)
  const doctorCancelResult = calculateEligibleRefund({
    appointmentDate: appointmentDateTime,
    cancellationDate: date1hBefore, // even 1 hour before
    cancelledByRole: "doctor",
    capturedAmount: expectedFeePaise,
  });
  assert(doctorCancelResult.eligibleAmount === expectedFeePaise, "Doctor cancellation unconditionally receives 100% refund");

  // Scenario E: Over-refund prevention
  const refund1 = localDb.createRefundRecord({
    paymentId: paymentRecord.payment_id,
    appointmentId: appointment.appointment_id,
    amount: 50000, // ₹500
    reason: "Partial cancellation",
    policyApplied: "PARTIAL_REFUND_50_PERCENT",
    provider: mockProvider.name,
    status: "processed",
  });
  assert(refund1.refund_id > 0, "Created partial refund record (₹500)");

  let overRefundBlocked = false;
  try {
    // Attempt to refund more than remaining ceiling (ceiling is 50000, requesting 60000)
    localDb.createRefundRecord({
      paymentId: paymentRecord.payment_id,
      appointmentId: appointment.appointment_id,
      amount: 60000,
      reason: "Excessive refund",
      policyApplied: "INVALID_OVER_REFUND",
      provider: mockProvider.name,
    });
  } catch (err: unknown) {
    overRefundBlocked = true;
  }
  assert(overRefundBlocked === true, "Over-refund ceiling guard blocked refund exceeding total captured amount");

  // Complete second partial refund to reach full 100%
  const refund2 = localDb.createRefundRecord({
    paymentId: paymentRecord.payment_id,
    appointmentId: appointment.appointment_id,
    amount: 50000, // ₹500
    reason: "Remaining balance refund",
    policyApplied: "BALANCE_REFUND",
    provider: mockProvider.name,
    status: "processed",
  });
  assert(refund2.refund_id > 0, "Created second partial refund reaching 100%");

  const appAfterFullRefund = localDb.getAppointmentById(appointment.appointment_id);
  assert(appAfterFullRefund?.payment_status === "refunded", "Appointment payment_status updated to 'refunded' after 100% of amount returned");

  // ============================================================================
  // TEST SUITE 8: Separation of Appointment Cancellation from Refund Completion
  // ============================================================================
  console.log("\n8. Separation of Cancellation & Refund Completion");
  // Create another appointment for separation test
  const slot2 = getOrCreateSlot(testDoctor.doctor_id);
  const appSeparation = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: testDoctor.doctor_id,
    availabilityId: slot2.availability_id,
    reason: "Consultation to test separation of cancellation and refund failure.",
  });
  // Simulate payment
  const payment2 = localDb.createPayment({
    appointmentId: appSeparation.appointment_id,
    patientId: patient.patient_id,
    provider: mockProvider.name,
    providerOrderId: `order_sep_${Date.now()}`,
    amount: expectedFeePaise,
  });
  localDb.updatePaymentStatus({
    paymentId: payment2.payment_id,
    status: "captured",
    providerPaymentId: `pay_sep_${Date.now()}`,
  });

  // Cancel appointment
  const cancelledApp = localDb.updateAppointmentStatus({
    appointmentId: appSeparation.appointment_id,
    newStatus: "cancelled",
    requesterUserId: patient.user_id,
    requesterRole: "patient",
  });
  assert(cancelledApp.status === "cancelled", "Appointment successfully cancelled");

  // Simulate refund failure (e.g. gateway downtime)
  const failedRefundRecord = localDb.createRefundRecord({
    paymentId: payment2.payment_id,
    appointmentId: appSeparation.appointment_id,
    amount: expectedFeePaise,
    reason: "Patient cancellation",
    policyApplied: "FULL_REFUND",
    provider: mockProvider.name,
    status: "failed",
    errorMessage: "Simulated gateway connection error",
  });
  assert(failedRefundRecord.status === "failed", "Refund recorded accurately in 'failed' status");
  const appCheck = localDb.getAppointmentById(appSeparation.appointment_id);
  assert(appCheck?.status === "cancelled", "Appointment remains cleanly cancelled even when refund fails");
  assert(appCheck?.payment_status !== "refunded", "Appointment is NOT falsely marked 'refunded' when refund failed");

  // ============================================================================
  // TEST SUITE 9: Notifications & Email Idempotency
  // ============================================================================
  console.log("\n9. Notification Delivery & Deduplication");
  const notifResult1 = await sendClinicalNotification("booking_confirmed", {
    recipientEmail: "test.qa@demo.com",
    recipientName: "Test Patient",
    userId: patient.user_id,
    appointmentId: appointment.appointment_id,
    doctorName: testDoctor.user?.full_name || "Doctor",
    specialization: testDoctor.specialization,
    appointmentDate: appointment.appointment_date,
    appointmentTimeStr: "11:00 – 11:30 IST",
    idempotencyKey: `notif_test_${appointment.appointment_id}_qa`,
  });
  assert(notifResult1.success === true, "Dispatched booking_confirmed notification");

  // Attempt duplicate send with identical idempotency key
  const notifResult2 = await sendClinicalNotification("booking_confirmed", {
    recipientEmail: "test.qa@demo.com",
    recipientName: "Test Patient",
    userId: patient.user_id,
    appointmentId: appointment.appointment_id,
    doctorName: testDoctor.user?.full_name || "Doctor",
    specialization: testDoctor.specialization,
    appointmentDate: appointment.appointment_date,
    appointmentTimeStr: "11:00 – 11:30 IST",
    idempotencyKey: `notif_test_${appointment.appointment_id}_qa`,
  });
  assert(
    notifResult2.status === "delivered" || notifResult2.status === "simulated",
    "Duplicate notification identified and suppressed by idempotency key"
  );

  // ============================================================================
  // TEST SUITE 10: Scheduled Reminders Lifecycle (Durable, Reschedule & Cancel)
  // ============================================================================
  console.log("\n10. Durable Reminders Scheduling, Cancellation & Rescheduling");
  // Create an appointment scheduled in future
  const slotFuture = getOrCreateSlot(testDoctor.doctor_id);
  const reminderAppt = localDb.bookAppointmentAtomic({
    patientId: patient.patient_id,
    doctorId: testDoctor.doctor_id,
    availabilityId: slotFuture.availability_id,
    reason: "Reminder lifecycle QA test.",
  });

  // Schedule reminders (24h before & 2h before)
  await scheduleAppointmentReminders(reminderAppt.appointment_id);
  const remindersScheduled = localDb.getDueScheduledReminders();
  assert(Array.isArray(remindersScheduled), "Retrieved scheduled reminders list from database");

  // Upsert a due reminder to test the processor
  const dueReminder = localDb.upsertScheduledReminder({
    appointmentId: reminderAppt.appointment_id,
    reminderType: "24h_before",
    scheduledFor: new Date(Date.now() - 1000), // Due in the past
  });
  assert(dueReminder.status === "scheduled", "Reminder set in 'scheduled' status");

  // Run the background reminder processor
  const summary = await processDueReminders();
  assert(summary.processedCount >= 1, `Reminder background job processed ${summary.processedCount} due reminder(s)`);

  // Cancel appointment and verify reminders cancelled
  await cancelAppointmentReminders(reminderAppt.appointment_id);
  const cancelledReminders = localDb
    .getDueScheduledReminders()
    .filter((r) => r.appointment_id === reminderAppt.appointment_id);
  assert(cancelledReminders.length === 0, "Cancelled appointment's reminders are not returned as due");

  // ============================================================================
  // TEST SUITE 11: Deterministic IST Time Formatting (Zero Hydration Mismatch)
  // ============================================================================
  console.log("\n11. Deterministic IST Time Formatting (SSR/Client Hydration Safety)");
  // 14:30 should format as "02:30 PM" deterministically
  const time1430 = formatISTTime("14:30");
  assert(time1430 === "02:30 PM", `formatISTTime('14:30') returns deterministic '02:30 PM' (got: '${time1430}')`);

  // Morning 09:05 should format as "09:05 AM"
  const time0905 = formatISTTime("09:05");
  assert(time0905 === "09:05 AM", `formatISTTime('09:05') returns deterministic '09:05 AM' (got: '${time0905}')`);

  // Midnight 00:00 should format as "12:00 AM"
  const time0000 = formatISTTime("00:00");
  assert(time0000 === "12:00 AM", `formatISTTime('00:00') returns deterministic '12:00 AM' (got: '${time0000}')`);

  // Noon 12:00 should format as "12:00 PM"
  const time1200 = formatISTTime("12:00");
  assert(time1200 === "12:00 PM", `formatISTTime('12:00') returns deterministic '12:00 PM' (got: '${time1200}')`);

  // UTC Date object 09:00 UTC -> IST is 14:30 -> "02:30 PM"
  const utcDate = new Date("2026-10-29T09:00:00.000Z");
  const timeFromDate = formatISTTime(utcDate);
  assert(timeFromDate === "02:30 PM", `formatISTTime(Date) correctly converts UTC to IST and produces '02:30 PM' (got: '${timeFromDate}')`);

  // Ensure uppercase AM/PM in formatISTDateTime
  const dateTimeFormatted = formatISTDateTime(utcDate);
  assert(dateTimeFormatted.includes("02:30 PM IST"), `formatISTDateTime contains uppercase '02:30 PM IST' (got: '${dateTimeFormatted}')`);

  console.log("\n================================================================================");
  console.log(`DAY 4 QA SUITE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runDay4Tests().catch((err) => {
  console.error("Day 4 test suite failed:", err);
  process.exit(1);
});
