"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PatientNotificationPreferences } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface PreferencesActionResult {
  success: boolean;
  message?: string;
  error?: string;
  preferences?: PatientNotificationPreferences;
}

/**
 * Retrieves the authenticated patient's current notification preferences
 */
export async function getPreferencesAction(): Promise<PreferencesActionResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return {
        success: false,
        error: "You must be signed in as a patient to view preferences.",
      };
    }

    const preferences = await db.getNotificationPreferences(session.user_id);
    return {
      success: true,
      preferences,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to load notification preferences.";
    return { success: false, error };
  }
}

/**
 * Updates the patient's channel and category preferences with consent enforcement
 */
export async function updatePreferencesAction(
  formData: FormData
): Promise<PreferencesActionResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return {
        success: false,
        error: "You must be signed in as a patient to update preferences.",
      };
    }

    const emailEnabled = formData.get("email_enabled") === "true";
    const smsEnabled = formData.get("sms_enabled") === "true";
    const whatsAppEnabled = formData.get("whatsapp_enabled") === "true";

    const appointmentConfirmations =
      formData.get("appointment_confirmations") === "true";
    const appointmentReminders =
      formData.get("appointment_reminders") === "true";
    const cancellationRescheduling =
      formData.get("cancellation_rescheduling") === "true";
    const paymentConfirmations =
      formData.get("payment_confirmations") === "true";
    const refundUpdates = formData.get("refund_updates") === "true";

    const smsConsent = formData.get("sms_consent") === "true";
    const whatsAppConsent = formData.get("whatsapp_consent") === "true";

    // Telecommunications Consent Enforcement
    if (smsEnabled && !smsConsent) {
      return {
        success: false,
        error:
          "Explicit consent is required to receive SMS notifications per regulatory compliance.",
      };
    }

    if (whatsAppEnabled && !whatsAppConsent) {
      return {
        success: false,
        error:
          "Explicit consent is required to receive WhatsApp Business notifications.",
      };
    }

    // If the patient is turning on any channel, clear the global unsubscribed flag
    const isEnablingAnyChannel = emailEnabled || smsEnabled || whatsAppEnabled;

    const updated = await db.updateNotificationPreferences(session.user_id, {
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
      whatsapp_enabled: whatsAppEnabled,
      appointment_confirmations: appointmentConfirmations,
      appointment_reminders: appointmentReminders,
      cancellation_rescheduling: cancellationRescheduling,
      payment_confirmations: paymentConfirmations,
      refund_updates: refundUpdates,
      unsubscribed_all: isEnablingAnyChannel ? false : undefined,
      sms_consent: smsConsent,
      whatsapp_consent: whatsAppConsent,
      consent_timestamp: new Date().toISOString(),
    });

    try {
      revalidatePath("/patient/dashboard");
      revalidatePath("/patient/profile");
    } catch {
      // Ignored in non-HTTP/unit test execution
    }

    return {
      success: true,
      message: "Notification preferences updated successfully.",
      preferences: updated,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to update notification preferences.";
    return { success: false, error };
  }
}

/**
 * Global Unsubscribe: Disables all optional channels and cancels pending reminders
 */
export async function unsubscribeAllAction(): Promise<PreferencesActionResult> {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return {
        success: false,
        error: "You must be signed in as a patient to unsubscribe.",
      };
    }

    const updated = await db.unsubscribeAll(session.user_id);

    try {
      revalidatePath("/patient/dashboard");
      revalidatePath("/patient/profile");
    } catch {
      // Ignored in non-HTTP/unit test execution
    }

    return {
      success: true,
      message:
        "You have been unsubscribed from all optional notifications. Your pending reminder alerts have been cancelled.",
      preferences: updated,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to unsubscribe.";
    return { success: false, error };
  }
}

