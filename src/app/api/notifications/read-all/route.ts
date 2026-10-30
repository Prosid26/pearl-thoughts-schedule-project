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

    const count = await db.markAllInAppNotificationsRead(session.user_id);

    return NextResponse.json({
      success: true,
      markedCount: count,
      unreadCount: 0,
    });
  } catch (err: unknown) {
    const error =
      err instanceof Error
        ? err.message
        : "Failed to mark all notifications as read";
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

