import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  const { getNeonDb } = await import('../src/lib/db/neon');
  const schema = await import('../src/lib/db/schema');
  const { desc } = await import('drizzle-orm');

  const neonDb = getNeonDb();
  if (!neonDb) {
    console.log('Neon DB not connected!');
    return;
  }

  const logs = await neonDb
    .select()
    .from(schema.notificationLogs)
    .orderBy(desc(schema.notificationLogs.created_at))
    .limit(10);
  
  console.log(`\n=== LAST 10 NOTIFICATION LOGS ===`);
  logs.forEach(l => {
    console.log(JSON.stringify({
      delivery_id: l.delivery_id,
      channel: l.channel,
      provider: l.provider,
      status: l.status,
      event_type: l.event_type,
      recipient_email: l.recipient_email,
      provider_message_id: l.provider_message_id,
      error_message: l.error_message,
      created_at: l.created_at
    }, null, 2));
  });
}

main().catch(console.error);
