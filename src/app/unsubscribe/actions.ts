"use server";

import { db } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import { revalidatePath } from "next/cache";

export interface PublicUnsubResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Public action: Unsubscribes email channel only using a signed cryptographic token
 * Does not require authentication.
 */
export async function unsubscribeEmailWithTokenAction(
  token: string
): Promise<PublicUnsubResult> {
  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return {
      success: false,
      error: "Invalid or tampered unsubscribe link. Please sign in to manage preferences.",
    };
  }

  try {
    await db.updateNotificationPreferences(verified.userId, {
      email_enabled: false,
    });

    try {
      revalidatePath("/patient/dashboard");
      revalidatePath("/patient/profile");
    } catch {
      // Ignored in non-HTTP/unit test execution
    }

    return {
      success: true,
      message: `Successfully unsubscribed ${verified.email} from Medrella email notifications.`,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to process unsubscribe.";
    return { success: false, error };
  }
}

/**
 * Public action: Globally unsubscribes all optional channels using a signed cryptographic token
 * Cancels pending scheduled reminders and does not require authentication.
 */
export async function unsubscribeAllWithTokenAction(
  token: string
): Promise<PublicUnsubResult> {
  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return {
      success: false,
      error: "Invalid or tampered unsubscribe link. Please sign in to manage preferences.",
    };
  }

  try {
    await db.unsubscribeAll(verified.userId);

    try {
      revalidatePath("/patient/dashboard");
      revalidatePath("/patient/profile");
    } catch {
      // Ignored in non-HTTP/unit test execution
    }

    return {
      success: true,
      message: `Successfully unsubscribed ${verified.email} from all Medrella optional notifications. Pending reminders have been cancelled.`,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to process unsubscribe.";
    return { success: false, error };
  }
}
