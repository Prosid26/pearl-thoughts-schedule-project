import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user_id;
  const encoder = new TextEncoder();

  let isClosed = false;
  let intervalId: NodeJS.Timeout | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller might already be closed
        }
      };

      const sendHeartbeat = () => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Controller closed
        }
      };

      let lastUnreadCount = -1;

      const checkUpdates = async () => {
        if (isClosed) return;
        try {
          const [notifications, unreadCount] = await Promise.all([
            db.getInAppNotificationsForUser(userId, { limit: 20 }),
            db.getUnreadInAppNotificationCount(userId),
          ]);

          if (lastUnreadCount === -1) {
            lastUnreadCount = unreadCount;
            sendEvent("init", { unreadCount, notifications });
          } else if (lastUnreadCount !== unreadCount) {
            lastUnreadCount = unreadCount;
            sendEvent("update", { unreadCount, notifications });
          } else {
            sendHeartbeat();
          }
        } catch (e) {
          sendHeartbeat();
        }
      };

      // 1. Initial push immediately
      await checkUpdates();

      // 2. Poll every 4 seconds for SSE subscribers
      intervalId = setInterval(checkUpdates, 4000);

      // 3. Graceful serverless lifespan (25s max to comfortably fit within serverless execution caps)
      // Standard EventSource automatically and transparently reconnects
      timeoutId = setTimeout(() => {
        if (!isClosed) {
          isClosed = true;
          if (intervalId) clearInterval(intervalId);
          try {
            sendEvent("reconnect", { timestamp: Date.now() });
            controller.close();
          } catch {
            // Already closed
          }
        }
      }, 25000);
    },
    cancel() {
      isClosed = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    },
  });

  req.signal.addEventListener("abort", () => {
    isClosed = true;
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

