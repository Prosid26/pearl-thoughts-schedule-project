import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const { getNeonDb } = await import('../src/lib/db/neon');
  const schema = await import('../src/lib/db/schema');
  const { eq, desc } = await import('drizzle-orm');
  const { sendClinicalNotification } = await import('../src/lib/notifications');
  const { getEmailProvider, getSmsProvider, getWhatsAppProvider } = await import('../src/lib/notifications/providers');

  console.log('=== PHASE 7: CONTROLLED E2E NOTIFICATION TEST ===');
  
  const neonDb = getNeonDb();
  if (!neonDb) {
    console.error('Database connection failed.');
    return;
  }

  // 1. Fetch user 1 (Siddhesh Narvekar)
  const users = await neonDb.select().from(schema.users).where(eq(schema.users.user_id, 1));
  const testUser = users[0];
  console.log('Test User:', {
    id: testUser?.user_id,
    email: testUser?.email,
    phone: testUser?.phone,
    name: testUser?.full_name,
  });

  // 2. Fetch or ensure preferences
  let prefs = await neonDb.select().from(schema.notificationPreferences).where(eq(schema.notificationPreferences.user_id, testUser.user_id));
  if (prefs.length === 0) {
    console.log('Creating notification preferences for test user...');
    await neonDb.insert(schema.notificationPreferences).values({
      user_id: testUser.user_id,
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      sms_consent: true,
      whatsapp_consent: true,
      appointment_confirmations: true,
      appointment_reminders: true,
      cancellation_rescheduling: true,
      payment_confirmations: true,
      refund_updates: true,
      unsubscribed_all: false,
    });
  } else {
    console.log('Updating test user preferences to ensure ALL channels & consents are ACTIVE...');
    await neonDb.update(schema.notificationPreferences).set({
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      sms_consent: true,
      whatsapp_consent: true,
      appointment_confirmations: true,
      appointment_reminders: true,
      cancellation_rescheduling: true,
      payment_confirmations: true,
      refund_updates: true,
      unsubscribed_all: false,
    }).where(eq(schema.notificationPreferences.user_id, testUser.user_id));
  }

  // 3. Check active providers
  const emailProv = getEmailProvider();
  const smsProv = getSmsProvider();
  const waProv = getWhatsAppProvider();

  console.log('\n--- Active Provider Instances ---');
  console.log(`Email Provider: ${emailProv.name} (isConfigured: ${emailProv.isConfigured()})`);
  console.log(`SMS Provider: ${smsProv.name} (isConfigured: ${smsProv.isConfigured()})`);
  console.log(`WhatsApp Provider: ${waProv.name} (isConfigured: ${waProv.isConfigured()})`);

  // 4. Dispatch a test notification with a fresh idempotency key
  const testIdempotencyKey = `controlled_test_e2e_${Date.now()}`;
  console.log(`\n--- Dispatching sendClinicalNotification ('booking_confirmed') ---`);
  console.log(`Idempotency Key: ${testIdempotencyKey}`);

  const result = await sendClinicalNotification("booking_confirmed", {
    recipientEmail: testUser.email,
    recipientPhone: testUser.phone || "+919820011223",
    recipientName: testUser.full_name || "Siddhesh Narvekar",
    userId: testUser.user_id,
    appointmentId: 24,
    bookingRef: "#APT-TEST1",
    doctorName: "Dr. Ananya Sharma",
    specialization: "Cardiologist",
    appointmentDate: "2026-11-01",
    appointmentTimeStr: "10:00 – 10:30 IST",
    clinicAddress: "Suite 402, Medrella Heart Institute, Mumbai",
    paymentStatus: "unpaid",
    idempotencyKey: testIdempotencyKey,
  }, { channel: "all" });

  console.log('\n--- Dispatch Result ---');
  console.log('Result Success:', result.success);
  console.log('Active Channel:', result.channel);
  console.log('Active Provider:', result.provider);
  console.log('Status:', result.status);
  console.log('Error:', result.error || 'none');
  console.log('SMS Result:', result.smsResult);
  console.log('WhatsApp Result:', result.whatsappResult);

  // 5. Query the newly inserted logs in Neon DB
  console.log('\n--- Verifying Neon DB Notification Logs ---');
  const recentLogs = await neonDb
    .select()
    .from(schema.notificationLogs)
    .where(eq(schema.notificationLogs.user_id, testUser.user_id))
    .orderBy(desc(schema.notificationLogs.created_at))
    .limit(3);

  recentLogs.forEach(l => {
    console.log(`Logged Delivery ID: ${l.delivery_id} | Channel: ${l.channel} | Provider: ${l.provider} | Status: ${l.status} | Key: ${l.idempotency_key} | Created: ${l.created_at}`);
  });
}

main().catch(console.error);
