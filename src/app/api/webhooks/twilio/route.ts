import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Validates Twilio Webhook Signature
 * Follows Twilio's official HMAC-SHA1 validation specification.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signatureHeader: string | null,
  authToken?: string
): boolean {
  if (!authToken) {
    // In local development or testing when TWILIO_AUTH_TOKEN is not configured
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/twilio
 * Processes Twilio SMS delivery callbacks, inbound STOP, and START resubscription
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-twilio-signature");
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Parse URL-encoded form data
    const urlParams = new URLSearchParams(rawBody);
    const params: Record<string, string> = {};
    urlParams.forEach((val, key) => {
      params[key] = val;
    });

    const requestUrl = req.url;

    // 1. Verify Twilio Cryptographic Signature
    if (authToken && !verifyTwilioSignature(requestUrl, params, signatureHeader, authToken)) {
      console.warn("[TWILIO-WEBHOOK] Rejected invalid Twilio HMAC-SHA1 signature.");
      return new NextResponse("<Response><Message>Invalid signature</Message></Response>", {
        status: 401,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const messageSid = params.MessageSid || params.SmsSid;
    const fromPhone = params.From; // e.g. "+919820011223"
    const messageBody = (params.Body || "").trim();
    const messageStatus = params.MessageStatus; // e.g. "delivered", "undelivered", "failed"

    // 2. Audit Trail Logging
    if (messageSid) {
      await db
        .recordWebhookEvent({
          provider: "twilio",
          providerEventId: `tw_${messageSid}_${Date.now()}`,
          eventType: messageStatus ? "status_callback" : "inbound_sms",
          payload: rawBody,
        })
        .catch(() => {});
    }

    // 3. Process Status Callbacks
    if (messageStatus && messageSid) {
      if (messageStatus === "delivered") {
        await db
          .updateNotificationLogStatus(messageSid, "delivered")
          .catch(() => {});
      } else if (messageStatus === "failed" || messageStatus === "undelivered") {
        await db
          .updateNotificationLogStatus(
            messageSid,
            "failed",
            params.ErrorMessage || `Twilio status: ${messageStatus}`
          )
          .catch(() => {});
      }
    }

    // 4. Inbound STOP and START Handling
    if (fromPhone && messageBody) {
      const isStopKeyword = /^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(
        messageBody
      );
      const isStartKeyword = /^(start|unstop|yes)$/i.test(messageBody);

      if (isStopKeyword) {
        const res = await db.unsubscribeChannelByPhone(fromPhone, "sms");
        console.log(
          `[TWILIO-STOP] Inbound STOP received from ${fromPhone}. Result: ${res.success}`
        );

        const twiml =
          "<Response><Message>Medrella: You have been successfully unsubscribed from SMS notifications. Reply START to resubscribe anytime.</Message></Response>";
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      if (isStartKeyword) {
        const res = await db.resubscribeChannelByPhone(fromPhone, "sms");
        console.log(
          `[TWILIO-START] Inbound START received from ${fromPhone}. Result: ${res.success}`
        );

        const twiml =
          "<Response><Message>Medrella: You have successfully resubscribed to Medrella SMS notifications.</Message></Response>";
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }
    }

    return new NextResponse("<Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Twilio webhook processing error";
    console.error("Twilio webhook error:", errorMsg);
    return new NextResponse(`<Response><Message>${errorMsg}</Message></Response>`, {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

