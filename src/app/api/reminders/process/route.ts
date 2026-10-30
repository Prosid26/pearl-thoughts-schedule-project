import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  return handleProcessReminders(req);
}

export async function POST(req: NextRequest) {
  return handleProcessReminders(req);
}

/**
 * Constant-time string comparison to prevent timing attacks against CRON_SECRET
 */
function isValidSecret(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;
  try {
    const a = Buffer.from(provided.trim());
    const b = Buffer.from(expected.trim());
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Extract secret token from supported authentication mechanisms:
 * 1. RFC 6750 Bearer Authorization header: `Authorization: Bearer <CRON_SECRET>`
 * 2. Dedicated HTTP header: `x-cron-secret: <CRON_SECRET>`
 * 3. Query parameter: `?secret=<CRON_SECRET>`
 */
function extractProvidedSecret(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
    return authHeader.trim();
  }
  const xCronSecret = req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret");
  if (xCronSecret) return xCronSecret.trim();
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) return querySecret.trim();
  return null;
}

async function handleProcessReminders(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const provided = extractProvidedSecret(req);
    if (!isValidSecret(provided, cronSecret)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing authorization token. Provide 'Authorization: Bearer <CRON_SECRET>' header, 'x-cron-secret' header, or '?secret=<CRON_SECRET>' query parameter.",
        },
        { status: 401 }
      );
    }
  }

  // Parse batch size (default 25, clamped 1..100) to ensure execution finishes well within HTTP timeout
  const limitParam = req.nextUrl.searchParams.get("limit");
  const batchSize = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 25, 1), 100) : 25;

  try {
    const summary = await processDueReminders({ batchSize });
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
