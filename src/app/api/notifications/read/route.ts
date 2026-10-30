import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = parseInt(body.notificationId, 10);

    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid notificationId provided" },
        { status: 400 }
      );
    }

    const updated = await db.markInAppNotificationRead(
      notificationId,
      session.user_id
    );

    const unreadCount = await db.getUnreadInAppNotificationCount(
      session.user_id
    );

    return NextResponse.json({
      success: true,
      notification: updated,
      unreadCount,
    });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Failed to mark notification as read";
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

