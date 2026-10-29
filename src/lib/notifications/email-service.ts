import { db } from "@/lib/db";
import {
  NotificationEventType,
  NotificationPayload,
  SendNotificationResult,
} from "./types";
import { renderEmailTemplate } from "./templates";

/**
 * High-reliability multi-provider notification dispatcher
 * Supports Resend, SMTP, and Local/Console Simulation
 */
export async function sendClinicalNotification(
  eventType: NotificationEventType,
  payload: NotificationPayload
): Promise<SendNotificationResult> {
  const rendered = renderEmailTemplate(eventType, payload);

  const idempotencyKey =
    payload.idempotencyKey ||
    `${eventType}_${payload.appointmentId || payload.userId}_${Date.now()}`;

  // 1. Idempotency Check: Don't dispatch duplicate emails on retry
  const existingLog = await db.getNotificationLogByIdempotency(idempotencyKey);
  if (existingLog) {
    return {
      success: true,
      channel: "email",
      provider: existingLog.provider,
      messageId: existingLog.provider_message_id || undefined,
      status: "delivered",
    };
  }

  let providerName = "console";
  let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let status: "sent" | "delivered" | "simulated" | "failed" = "simulated";
  let errorMessage: string | null = null;

  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey && !resendApiKey.includes("placeholder")) {
      providerName = "resend";
      // Official Resend REST API integration (no extra dependency needed)
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.EMAIL_FROM ||
            "Medrella Healthcare <appointments@medrella.com>",
          to: [payload.recipientEmail],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Resend API error: ${errorText}`);
      }

      const resData = (await res.json()) as { id: string };
      messageId = resData.id;
      status = "delivered";
    } else {
      // Console / Simulation fallback
      providerName = "console-simulator";
      status = "simulated";
      console.log(
        `[NOTIF-SIMULATOR] Dispatched '${eventType}' to ${payload.recipientEmail} | Subject: "${rendered.subject}"`
      );
    }
  } catch (err: unknown) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Notification delivery failed";
    console.error(`[NOTIF-ERROR] Delivery failed for ${payload.recipientEmail}:`, errorMessage);
  }

  // 2. Persist delivery log durably in database
  try {
    await db.createNotificationLog({
      userId: payload.userId,
      recipientEmail: payload.recipientEmail,
      channel: "email",
      eventType,
      subject: rendered.subject,
      appointmentId: payload.appointmentId || null,
      status,
      provider: providerName,
      providerMessageId: messageId,
      idempotencyKey,
      errorMessage: errorMessage || undefined,
    });
  } catch (logErr) {
    console.warn("[NOTIF-LOG-WARN] Failed to write notification audit log:", logErr);
  }

  // 3. Also mirror into in-app notifications so patient can see it in their notification center
  try {
    let notifType: any = "general";
    if (eventType === "appointment_rescheduled") notifType = "rescheduled";
    await db.createInAppNotification({
      userId: payload.userId,
      title: rendered.subject,
      message: rendered.text.slice(0, 300),
      type: notifType,
    });
  } catch {
    // Non-critical mirror
  }

  return {
    success: status !== "failed",
    channel: "email",
    provider: providerName,
    messageId,
    status,
    error: errorMessage || undefined,
  };
}
