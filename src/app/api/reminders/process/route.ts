import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleProcessReminders(req);
}

export async function POST(req: NextRequest) {
  return handleProcessReminders(req);
}

async function handleProcessReminders(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");

    const provided =
      authHeader?.replace("Bearer ", "") ||
      req.headers.get("x-cron-secret") ||
      querySecret;

    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await processDueReminders();
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...summary,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reminder processing error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

