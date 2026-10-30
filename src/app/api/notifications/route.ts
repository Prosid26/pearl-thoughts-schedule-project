import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limitParam = parseInt(searchParams.get("limit") || "30", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 30 : limitParam, 1), 100);

    const [notifications, unreadCount] = await Promise.all([
      db.getInAppNotificationsForUser(session.user_id, {
        unreadOnly,
        limit,
      }),
      db.getUnreadInAppNotificationCount(session.user_id),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Internal notification server error";
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

