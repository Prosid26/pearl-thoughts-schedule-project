import { db } from "@/lib/db";
import {
  NotificationEventType,
  NotificationPayload,
  SendNotificationResult,
} from "./types";
import { renderEmailTemplate } from "./templates";
import {
  getEmailProvider,
  getSmsProvider,
  getWhatsAppProvider,
} from "./providers";

export interface DispatchOptions {
  channel?: "email" | "sms" | "whatsapp" | "all";
  ignorePreferences?: boolean;
}

/**
 * Checks whether an event type is a doctor administrative alert
 */
function isDoctorEvent(eventType: NotificationEventType): boolean {
  return (
    eventType === "doctor_booking_alert" ||
    eventType === "doctor_cancellation_alert" ||
    eventType === "doctor_reschedule_alert"
  );
}

/**
 * Centralized Clinical Notification Dispatcher
 * Multi-channel (Email + SMS + WhatsApp) with:
 * - Patient notification preference enforcement (channels & categories)
 * - Global & individual unsubscribe checks
 * - Provider abstraction (Resend, Twilio, Meta WhatsApp Cloud + Console fallbacks)
 * - Exponential backoff retry handling
 * - Strict idempotency & audit logging in PostgreSQL
 */
export async function sendClinicalNotification(
  eventType: NotificationEventType,
  payload: NotificationPayload,
  options: DispatchOptions = {}
): Promise<SendNotificationResult> {
  const rendered = renderEmailTemplate(eventType, payload);
  const targetChannel =
    options.channel || (payload.recipientPhone ? "all" : "email");

  const idempotencyBase =
    payload.idempotencyKey ||
    `${eventType}_${payload.appointmentId || payload.userId}_${Date.now()}`;

  // 1. Idempotency Check: Don't dispatch duplicate notifications on retry
  const existingLog =
    (await db.getNotificationLogByIdempotency(idempotencyBase)) ||
    (await db.getNotificationLogByIdempotency(`${idempotencyBase}_email`)) ||
    (await db.getNotificationLogByIdempotency(`${idempotencyBase}_sms`)) ||
    (await db.getNotificationLogByIdempotency(`${idempotencyBase}_whatsapp`));

  if (existingLog) {
    return {
      success: true,
      channel: (existingLog.channel as any) || "email",
      provider: existingLog.provider,
      messageId: existingLog.provider_message_id || undefined,
      status: (existingLog.status as any) || "delivered",
    };
  }

  // 2. Patient Notification Preferences & Unsubscribe Enforcement
  let allowEmail = true;
  let allowSms = true;
  let allowWhatsApp = true;

  if (!options.ignorePreferences && !isDoctorEvent(eventType) && payload.userId) {
    try {
      const prefs = await db.getNotificationPreferences(payload.userId);

      // 2a. Global Unsubscribe Check
      if (prefs.unsubscribed_all) {
        return {
          success: true,
          channel: "email",
          provider: "preference-guard",
          status: "delivered",
          skipped: true,
          skipReason: "User has globally unsubscribed from all notifications.",
        };
      }

      // 2b. Notification Category Check
      let categoryAllowed = true;
      if (eventType === "booking_confirmed") {
        categoryAllowed = prefs.appointment_confirmations;
      } else if (
        eventType === "appointment_cancelled" ||
        eventType === "appointment_rescheduled"
      ) {
        categoryAllowed = prefs.cancellation_rescheduling;
      } else if (eventType === "appointment_reminder") {
        categoryAllowed = prefs.appointment_reminders;
      } else if (
        eventType === "payment_success" ||
        eventType === "payment_failed"
      ) {
        categoryAllowed = prefs.payment_confirmations;
      } else if (
        eventType === "refund_requested" ||
        eventType === "refund_processed" ||
        eventType === "refund_failed"
      ) {
        categoryAllowed = prefs.refund_updates;
      }

      if (!categoryAllowed) {
        return {
          success: true,
          channel: "email",
          provider: "preference-guard",
          status: "delivered",
          skipped: true,
          skipReason: `Notification category for '${eventType}' is disabled in user preferences.`,
        };
      }

      // 2c. Independent Channel Permission & Consent Check
      allowEmail = prefs.email_enabled;
      allowSms = prefs.sms_enabled && prefs.sms_consent;
      allowWhatsApp = prefs.whatsapp_enabled && prefs.whatsapp_consent;
    } catch {
      // If preference retrieval fails, default to allowing dispatch so critical medical notices aren't dropped
    }
  }

  const emailProvider = getEmailProvider();
  const smsProvider = getSmsProvider();
  const whatsAppProvider = getWhatsAppProvider();

  let emailResult:
    | {
        success: boolean;
        provider: string;
        providerMessageId?: string;
        status: "sent" | "delivered" | "simulated" | "failed";
        error?: string;
      }
    | undefined = undefined;

  let smsResult:
    | {
        success: boolean;
        provider: string;
        providerMessageId?: string;
        status: "sent" | "delivered" | "simulated" | "failed";
        error?: string;
      }
    | undefined = undefined;

  let whatsAppResult:
    | {
        success: boolean;
        provider: string;
        providerMessageId?: string;
        status: "sent" | "delivered" | "simulated" | "failed";
        error?: string;
      }
    | undefined = undefined;

  // 3. Dispatch Email
  if (
    allowEmail &&
    (targetChannel === "email" || targetChannel === "all") &&
    payload.recipientEmail
  ) {
    try {
      const res = await emailProvider.sendEmail({
        to: payload.recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      emailResult = {
        success: res.success,
        provider: res.provider,
        providerMessageId: res.providerMessageId,
        status: res.status,
        error: res.error,
      };

      // Log Email Delivery Audit
      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail: payload.recipientEmail,
          channel: "email",
          eventType,
          subject: rendered.subject,
          appointmentId: payload.appointmentId || null,
          status: res.status,
          provider: res.provider,
          providerMessageId: res.providerMessageId,
          idempotencyKey: `${idempotencyBase}_email`,
          errorMessage: res.error,
        })
        .catch((e) => console.warn("[NOTIF-AUDIT-LOG-FAIL email]", e));
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Email delivery failed";
      emailResult = {
        success: false,
        provider: emailProvider.name,
        status: "failed",
        error: errorMsg,
        providerMessageId: undefined,
      };

      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail: payload.recipientEmail,
          channel: "email",
          eventType,
          subject: rendered.subject,
          appointmentId: payload.appointmentId || null,
          status: "failed",
          provider: emailProvider.name,
          idempotencyKey: `${idempotencyBase}_email`,
          errorMessage: errorMsg,
        })
        .catch(() => {});
    }
  }

  // 4. Dispatch SMS (if phone number is present and permitted)
  if (
    allowSms &&
    (targetChannel === "sms" || targetChannel === "all") &&
    payload.recipientPhone
  ) {
    try {
      const res = await smsProvider.sendSms({
        to: payload.recipientPhone,
        body: rendered.sms,
      });

      smsResult = {
        success: res.success,
        provider: res.provider,
        providerMessageId: res.providerMessageId,
        status: res.status,
        error: res.error,
      };

      // Log SMS Delivery Audit
      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail:
            payload.recipientEmail || `${payload.recipientPhone}@sms.medrella.com`,
          channel: "sms",
          eventType,
          subject: rendered.sms.slice(0, 100),
          appointmentId: payload.appointmentId || null,
          status: res.status,
          provider: res.provider,
          providerMessageId: res.providerMessageId,
          idempotencyKey: `${idempotencyBase}_sms`,
          errorMessage: res.error,
        })
        .catch((e) => console.warn("[NOTIF-AUDIT-LOG-FAIL sms]", e));
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "SMS delivery failed";
      smsResult = {
        success: false,
        provider: smsProvider.name,
        status: "failed",
        error: errorMsg,
      };

      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail:
            payload.recipientEmail || `${payload.recipientPhone}@sms.medrella.com`,
          channel: "sms",
          eventType,
          subject: rendered.sms.slice(0, 100),
          appointmentId: payload.appointmentId || null,
          status: "failed",
          provider: smsProvider.name,
          idempotencyKey: `${idempotencyBase}_sms`,
          errorMessage: errorMsg,
        })
        .catch(() => {});
    }
  }

  // 5. Dispatch WhatsApp (if phone number is present and permitted)
  if (
    allowWhatsApp &&
    (targetChannel === "whatsapp" || targetChannel === "all") &&
    payload.recipientPhone
  ) {
    try {
      const res = await whatsAppProvider.sendWhatsApp({
        to: payload.recipientPhone,
        bodyText: rendered.whatsapp.bodyText,
        templateName: rendered.whatsapp.templateName,
        templateLanguage: rendered.whatsapp.templateLanguage,
        templateComponents: rendered.whatsapp.templateComponents,
      });

      whatsAppResult = {
        success: res.success,
        provider: res.provider,
        providerMessageId: res.providerMessageId,
        status: res.status,
        error: res.error,
      };

      // Log WhatsApp Delivery Audit
      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail:
            payload.recipientEmail ||
            `${payload.recipientPhone}@wa.medrella.com`,
          channel: "whatsapp",
          eventType,
          subject: rendered.whatsapp.bodyText.slice(0, 100),
          appointmentId: payload.appointmentId || null,
          status: res.status,
          provider: res.provider,
          providerMessageId: res.providerMessageId,
          idempotencyKey: `${idempotencyBase}_whatsapp`,
          errorMessage: res.error,
        })
        .catch((e) => console.warn("[NOTIF-AUDIT-LOG-FAIL whatsapp]", e));
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "WhatsApp delivery failed";
      whatsAppResult = {
        success: false,
        provider: whatsAppProvider.name,
        status: "failed",
        error: errorMsg,
      };

      await db
        .createNotificationLog({
          userId: payload.userId,
          recipientEmail:
            payload.recipientEmail ||
            `${payload.recipientPhone}@wa.medrella.com`,
          channel: "whatsapp",
          eventType,
          subject: rendered.whatsapp.bodyText.slice(0, 100),
          appointmentId: payload.appointmentId || null,
          status: "failed",
          provider: whatsAppProvider.name,
          idempotencyKey: `${idempotencyBase}_whatsapp`,
          errorMessage: errorMsg,
        })
        .catch(() => {});
    }
  }

  // 6. Mirror into In-App Notifications for Real-Time Notification Center
  try {
    let notifType: any = "general";
    if (
      eventType === "appointment_rescheduled" ||
      eventType === "doctor_reschedule_alert"
    ) {
      notifType = "rescheduled";
    }
    await db.createInAppNotification({
      userId: payload.userId,
      title: rendered.subject,
      message: rendered.text.slice(0, 300),
      type: notifType,
    });
  } catch {
    // Non-critical in-app mirror
  }

  // Determine primary success
  const primaryDispatched =
    emailResult !== undefined ||
    smsResult !== undefined ||
    whatsAppResult !== undefined;

  const anyFailed =
    (emailResult && !emailResult.success) ||
    (smsResult && !smsResult.success) ||
    (whatsAppResult && !whatsAppResult.success);

  const activeChannel =
    targetChannel === "all"
      ? emailResult
        ? "email"
        : smsResult
        ? "sms"
        : "whatsapp"
      : targetChannel;

  const activeProvider =
    emailResult?.provider ||
    smsResult?.provider ||
    whatsAppResult?.provider ||
    "none";

  const activeStatus =
    emailResult?.status ||
    smsResult?.status ||
    whatsAppResult?.status ||
    "delivered";

  return {
    success: primaryDispatched ? !anyFailed : true,
    channel: activeChannel as any,
    provider: activeProvider,
    messageId:
      emailResult?.providerMessageId ||
      smsResult?.providerMessageId ||
      whatsAppResult?.providerMessageId,
    status: activeStatus,
    error:
      emailResult?.error || smsResult?.error || whatsAppResult?.error,
    smsResult,
    whatsappResult: whatsAppResult,
  };
}
