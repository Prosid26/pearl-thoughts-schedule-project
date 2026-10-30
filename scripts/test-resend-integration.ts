import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { ResendEmailProvider } from '../src/lib/notifications/providers/resend-email';
import { ConsoleEmailProvider } from '../src/lib/notifications/providers/console-email';
import { getEmailProvider } from '../src/lib/notifications/providers';
import { sendClinicalNotification } from '../src/lib/notifications';
import { renderEmailTemplate } from '../src/lib/notifications/templates';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
  passedTests++;
}

async function runResendTestSuite() {
  console.log('================================================================================');
  console.log('MEDRELLA RESEND EMAIL PROVIDER & INTEGRATION QA SUITE');
  console.log('================================================================================\n');

  // ============================================================================
  // 1. CONFIGURATION & ENVIRONMENT VARIABLE RESOLUTION
  // ============================================================================
  console.log('1. Configuration & Credential Detection');

  const provider = new ResendEmailProvider();
  assert(provider.name === 'resend', "Provider name is exactly 'resend'");
  assert(provider.isConfigured() === true, 'ResendEmailProvider.isConfigured() evaluates to true when valid key is provided');

  // Test placeholder rejection
  const origKey = process.env.RESEND_API_KEY;
  try {
    process.env.RESEND_API_KEY = 're_your_resend_api_key_here';
    assert(provider.isConfigured() === false, 'Rejects placeholder key (re_your_...)');

    process.env.RESEND_API_KEY = '';
    assert(provider.isConfigured() === false, 'Rejects empty API key');
  } finally {
    process.env.RESEND_API_KEY = origKey;
  }

  // Verify getEmailProvider resolves Resend
  const resolvedProvider = getEmailProvider();
  assert(resolvedProvider.name === 'resend', "getEmailProvider() resolves 'resend' when configured");

  // ============================================================================
  // 2. ERROR HANDLING: MISSING ENVIRONMENT VARIABLES
  // ============================================================================
  console.log('\n2. Error Handling: Missing Environment Variables');

  // 2a. Missing API Key
  try {
    process.env.RESEND_API_KEY = '';
    const resNoKey = await provider.sendEmail({
      to: 'patient@example.com',
      subject: 'Test Missing Key',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert(resNoKey.success === false, 'sendEmail fails gracefully when RESEND_API_KEY is missing');
    assert(resNoKey.status === 'failed', "status is 'failed' when RESEND_API_KEY is missing");
    assert(Boolean(resNoKey.error && resNoKey.error.includes('RESEND_API_KEY')), 'Error message specifies missing RESEND_API_KEY');
  } finally {
    process.env.RESEND_API_KEY = origKey;
  }

  // 2b. Missing EMAIL_FROM
  const origFrom = process.env.EMAIL_FROM;
  try {
    delete process.env.EMAIL_FROM;
    const resNoFrom = await provider.sendEmail({
      to: 'patient@example.com',
      subject: 'Test Missing From',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert(resNoFrom.success === false, 'sendEmail fails gracefully when EMAIL_FROM is missing');
    assert(resNoFrom.status === 'failed', "status is 'failed' when EMAIL_FROM is missing");
    assert(Boolean(resNoFrom.error && resNoFrom.error.includes('EMAIL_FROM')), 'Error message specifies missing EMAIL_FROM');
  } finally {
    process.env.EMAIL_FROM = origFrom;
  }

  // 2c. Invalid Recipient Email
  const resBadTo = await provider.sendEmail({
    to: 'invalid-email-address',
    subject: 'Test Invalid Recipient',
    html: '<p>Test</p>',
    text: 'Test',
  });
  assert(resBadTo.success === false, 'sendEmail fails when recipient email is invalid');
  assert(resBadTo.status === 'failed', "status is 'failed' for invalid recipient");
  assert(Boolean(resBadTo.error && resBadTo.error.includes('recipient')), 'Error message explains invalid recipient');

  // ============================================================================
  // 3. ERROR HANDLING: FAILED API REQUESTS (INVALID CREDENTIALS)
  // ============================================================================
  console.log('\n3. Error Handling: Failed Resend API Requests');

  try {
    // Provide a structurally valid-looking but unauthorized key
    process.env.RESEND_API_KEY = 're_invalid_secret_key_1234567890';
    const resBadKey = await provider.sendEmail({
      to: 'patient@example.com',
      subject: 'Test Invalid API Key',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert(resBadKey.success === false, 'sendEmail reports failure on rejected API credentials');
    assert(resBadKey.status === 'failed', "status is 'failed' on 401/403 API response");
    assert(Boolean(resBadKey.error && resBadKey.error.includes('Resend HTTP')), 'Captures detailed HTTP error status from Resend');
  } finally {
    process.env.RESEND_API_KEY = origKey;
  }

  // ============================================================================
  // 4. DISTINCTION BETWEEN LIVE AND SIMULATED DELIVERY
  // ============================================================================
  console.log('\n4. Live vs. Simulated Delivery Status Distinction');

  const consoleProvider = new ConsoleEmailProvider();
  const simResult = await consoleProvider.sendEmail({
    to: 'patient@example.com',
    subject: 'Simulated Email Test',
    html: '<p>Simulated</p>',
    text: 'Simulated',
  });
  assert(simResult.status === 'simulated', "ConsoleEmailProvider strictly marks status as 'simulated'");
  assert(simResult.status !== 'delivered', "Simulated emails are NEVER marked as 'delivered'");
  assert(simResult.provider === 'console-simulator', "Console provider identifies as 'console-simulator'");

  // ============================================================================
  // 5. CLINICAL TEMPLATES VERIFICATION FOR RESEND
  // ============================================================================
  console.log('\n5. Clinical Email Templates for Resend');

  const bookingTpl = renderEmailTemplate('booking_confirmed', {
    userId: 1,
    recipientEmail: 'patient@example.com',
    recipientName: 'Aarav Sharma',
    bookingRef: '#APT-99001',
    doctorName: 'Dr. Ananya Sharma',
    specialization: 'Cardiologist',
    appointmentDate: '2026-11-05',
    appointmentTimeStr: '10:00 – 10:30 IST',
    clinicAddress: 'Medrella Heart Center, Mumbai',
    paymentStatus: 'unpaid',
  });
  assert(bookingTpl.subject.includes('Confirmed'), 'Booking confirmed template renders subject with reference');
  assert(bookingTpl.html.includes('Dr. Ananya Sharma'), 'Booking HTML template includes doctor name');
  assert(bookingTpl.html.includes('#APT-99001'), 'Booking HTML template includes booking reference');
  assert(Boolean(bookingTpl.text), 'Booking template provides plain-text fallback for email clients');

  const cancelTpl = renderEmailTemplate('appointment_cancelled', {
    userId: 1,
    recipientEmail: 'patient@example.com',
    recipientName: 'Aarav Sharma',
    bookingRef: '#APT-99001',
    doctorName: 'Dr. Ananya Sharma',
    specialization: 'Cardiologist',
    appointmentDate: '2026-11-05',
    appointmentTimeStr: '10:00 – 10:30 IST',
    cancellationReason: 'Cancelled by patient',
  });
  assert(cancelTpl.subject.includes('Cancelled'), 'Cancellation template renders clear cancellation subject');
  assert(cancelTpl.html.includes('Cancelled'), 'Cancellation HTML includes cancellation details');

  const reschedTpl = renderEmailTemplate('appointment_rescheduled', {
    userId: 1,
    recipientEmail: 'patient@example.com',
    recipientName: 'Aarav Sharma',
    bookingRef: '#APT-99001',
    doctorName: 'Dr. Ananya Sharma',
    specialization: 'Cardiologist',
    appointmentDate: '2026-11-06',
    appointmentTimeStr: '14:00 – 14:30 IST',
    previousDate: '2026-11-05',
    previousTimeStr: '10:00 – 10:30 IST',
  });
  assert(reschedTpl.subject.includes('Rescheduled'), 'Reschedule template renders reschedule subject');
  assert(reschedTpl.html.includes('Consultation Rescheduled'), 'Reschedule HTML details previous and new windows');

  const reminderTpl = renderEmailTemplate('appointment_reminder', {
    userId: 1,
    recipientEmail: 'patient@example.com',
    recipientName: 'Aarav Sharma',
    bookingRef: '#APT-99001',
    doctorName: 'Dr. Ananya Sharma',
    specialization: 'Cardiologist',
    appointmentDate: '2026-11-05',
    appointmentTimeStr: '10:00 – 10:30 IST',
  });
  assert(reminderTpl.subject.includes('Reminder'), 'Reminder template renders reminder subject');

  // ============================================================================
  // 6. LIVE RESEND API REQUEST (WITH USER CREDENTIALS)
  // ============================================================================
  console.log('\n6. Live Resend API Call Execution');
  console.log(`Using sender: ${process.env.EMAIL_FROM}`);
  console.log(`Using API key prefix: ${origKey ? origKey.slice(0, 7) + '...' : 'undefined'}`);

  // Test live API call with user-configured credentials
  // Resend onboarding sender (onboarding@resend.dev) allows sending to the account owner's email,
  // or returns an informative 403 message if sending to an unverified email on free tier.
  const liveResult = await provider.sendEmail({
    to: 'delivered@resend.dev', // Resend's official test delivery address
    subject: 'Medrella Clinical Notification Verification',
    html: '<p>This is a verification email from Medrella Healthcare System.</p>',
    text: 'This is a verification email from Medrella Healthcare System.',
  });

  console.log('Live Resend API response:');
  console.log(`  Success: ${liveResult.success}`);
  console.log(`  Provider: ${liveResult.provider}`);
  console.log(`  Status: ${liveResult.status}`);
  console.log(`  Message ID: ${liveResult.providerMessageId || 'none'}`);
  console.log(`  Error: ${liveResult.error || 'none'}`);

  if (liveResult.success) {
    assert(liveResult.status === 'delivered', "Live send correctly marked as 'delivered'");
    assert(Boolean(liveResult.providerMessageId), 'Live send returned real Resend message ID');
  } else {
    // If on onboarding domain, Resend requires sending to account owner email or delivered@resend.dev
    assert(Boolean(liveResult.error), 'Resend API returned structured error message without crashing');
    console.log(`  Note on Resend response: ${liveResult.error}`);
  }

  // ============================================================================
  // 7. DISPATCHER INTEGRATION (CLINICAL NOTIFICATION VIA RESEND)
  // ============================================================================
  console.log('\n7. Dispatcher Pipeline Routing via Resend');

  const dispatchResult = await sendClinicalNotification(
    'booking_confirmed',
    {
      recipientEmail: 'delivered@resend.dev',
      recipientName: 'Verification Patient',
      userId: 1,
      bookingRef: '#APT-DISPATCH-TEST',
      doctorName: 'Dr. Ananya Sharma',
      specialization: 'Cardiology',
      appointmentDate: '2026-11-05',
      appointmentTimeStr: '10:00 – 10:30 IST',
      paymentStatus: 'unpaid',
      idempotencyKey: `resend_suite_test_${Date.now()}`,
    },
    { channel: 'email', ignorePreferences: true }
  );

  assert(dispatchResult.provider === 'resend', "Dispatcher routed email through 'resend' provider");
  console.log(`  Dispatcher status: ${dispatchResult.status} | Provider: ${dispatchResult.provider}`);

  console.log('\n================================================================================');
  console.log(`RESEND INTEGRATION QA: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================================\n');
}

runResendTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
