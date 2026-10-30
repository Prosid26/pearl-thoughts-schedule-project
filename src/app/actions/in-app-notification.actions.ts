"use server";

import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth/session";
import { InAppNotification } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface NotificationsActionResult {
  success: boolean;
  notifications?: InAppNotification[];
  unreadCount?: number;
  error?: string;
  message?: string;
}

/**
 * Retrieves the authenticated user's persistent in-app notifications.
 * Automatically scopes results strictly to session.user_id (patient or doctor).
 */
export async function getMyNotificationsAction(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationsActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const [notifications, unreadCount] = await Promise.all([
      db.getInAppNotificationsForUser(session.user_id, {
        unreadOnly: options?.unreadOnly,
        limit: options?.limit ?? 50,
      }),
      db.getUnreadInAppNotificationCount(session.user_id),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to load notifications.";
    return { success: false, error };
  }
}

/**
 * Fast endpoint for polling and unread counter badges.
 */
export async function getUnreadNotificationCountAction(): Promise<{
  success: boolean;
  unreadCount: number;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: true, unreadCount: 0 };
    }

    const count = await db.getUnreadInAppNotificationCount(session.user_id);
    return { success: true, unreadCount: count };
  } catch (err: unknown) {
    return {
      success: false,
      unreadCount: 0,
      error:
        err instanceof Error ? err.message : "Failed to get unread count.",
    };
  }
}

/**
 * Mark a single in-app notification as read.
 * Enforces ownership: User can only mark their own notification.
 */
export async function markNotificationReadAction(
  notificationId: number
): Promise<NotificationsActionResult> {
  try {
    const session = await requireUser();
    if (!notificationId || isNaN(notificationId)) {
      return { success: false, error: "Valid notification ID is required." };
    }

    const updated = await db.markInAppNotificationRead(
      notificationId,
      session.user_id
    );

    const unreadCount = await db.getUnreadInAppNotificationCount(
      session.user_id
    );

    try {
      revalidatePath("/patient/notifications");
      revalidatePath("/doctor/notifications");
      revalidatePath("/patient/dashboard");
      revalidatePath("/doctor/dashboard");
    } catch {
      // Ignored in non-HTTP tests
    }

    return {
      success: true,
      message: "Notification marked as read.",
      unreadCount,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to mark notification as read.";
    return { success: false, error };
  }
}

/**
 * Mark all notifications for the authenticated user as read.
 */
export async function markAllNotificationsReadAction(): Promise<NotificationsActionResult> {
  try {
    const session = await requireUser();

    const count = await db.markAllInAppNotificationsRead(session.user_id);

    try {
      revalidatePath("/patient/notifications");
      revalidatePath("/doctor/notifications");
      revalidatePath("/patient/dashboard");
      revalidatePath("/doctor/dashboard");
    } catch {
      // Ignored in non-HTTP tests
    }

    return {
      success: true,
      message: `Marked ${count} notifications as read.`,
      unreadCount: 0,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to mark notifications as read.";
    return { success: false, error };
  }
}

