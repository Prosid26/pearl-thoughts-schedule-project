import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getWhatsAppProvider } from "@/lib/notifications/providers";

export const dynamic = "force-dynamic";

/**
 * Validates Meta WhatsApp Webhook Signature
 * Verifies sha256 HMAC header against WHATSAPP_APP_SECRET
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret?: string
): boolean {
  if (!appSecret) {
    // In local development or test mode without WHATSAPP_APP_SECRET configured
    return true;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const providedSignature = signatureHeader.slice(7);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API Webhook Subscription Verification
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "medrella_whatsapp_verify_token_2026";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "ok", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Processes delivery status updates and inbound STOP / UNSUBSCRIBE messages
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // 1. Cryptographic Signature Validation
    if (appSecret && !verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
      console.warn("[WHATSAPP-WEBHOOK] Rejected invalid HMAC signature.");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 2. Audit Trail Logging for Webhook Receipt
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (entry?.id) {
      await db
        .recordWebhookEvent({
          provider: "meta_whatsapp",
          providerEventId: `wa_ev_${entry.id}_${Date.now()}`,
          eventType: changes?.field || "whatsapp_event",
          payload: rawBody,
        })
        .catch(() => {});
    }

    // 3. Process Delivery Status Callbacks (sent, delivered, read, failed)
    if (value?.statuses && Array.isArray(value.statuses)) {
      for (const statusItem of value.statuses) {
        const messageId = statusItem.id;
        const status = statusItem.status; // 'sent' | 'delivered' | 'read' | 'failed'
        const errorMessage = statusItem.errors?.[0]?.title || statusItem.errors?.[0]?.message;

        if (status === "delivered" || status === "read") {
          await db
            .updateNotificationLogStatus(messageId, "delivered")
            .catch(() => {});
        } else if (status === "failed") {
          await db
            .updateNotificationLogStatus(messageId, "failed", errorMessage)
            .catch(() => {});
        }
      }
    }

    // 4. Process Inbound Messages (e.g. STOP / UNSUBSCRIBE keywords)
    if (value?.messages && Array.isArray(value.messages)) {
      for (const msg of value.messages) {
        const senderPhone = msg.from; // e.g. "919820011223"
        const messageText = (msg.text?.body || "").trim();

        // Check for inbound STOP / START keywords per telecommunication compliance
        const isStopKeyword = /^(stop|unsubscribe|stopall|cancel|optout|opt-out)$/i.test(
          messageText
        );
        const isStartKeyword = /^(start|resubscribe|unstop|yes)$/i.test(
          messageText
        );

        if (isStopKeyword && senderPhone) {
          const res = await db.unsubscribeChannelByPhone(senderPhone, "whatsapp");
          console.log(
            `[WHATSAPP-STOP] Inbound unsubscribe keyword '${messageText}' processed for ${senderPhone}. Updated: ${res.success}`
          );

          // Reply with confirmation to the patient
          const whatsAppProvider = getWhatsAppProvider();
          await whatsAppProvider
            .sendWhatsApp({
              to: senderPhone,
              bodyText:
                "Medrella: You have been successfully unsubscribed from Medrella WhatsApp notifications. To manage preferences or re-enable, sign in to your Medrella Patient Dashboard.",
            })
            .catch((err) => console.warn("Inbound STOP acknowledgement failed:", err));
        } else if (isStartKeyword && senderPhone) {
          const res = await db.resubscribeChannelByPhone(senderPhone, "whatsapp");
          console.log(
            `[WHATSAPP-START] Inbound resubscribe keyword '${messageText}' processed for ${senderPhone}. Updated: ${res.success}`
          );

          const whatsAppProvider = getWhatsAppProvider();
          await whatsAppProvider
            .sendWhatsApp({
              to: senderPhone,
              bodyText:
                "Medrella: You have successfully resubscribed to Medrella WhatsApp notifications. To customize notification categories, visit your Medrella Patient Dashboard.",
            })
            .catch((err) => console.warn("Inbound START acknowledgement failed:", err));
        }
      }
    }

    return NextResponse.json({ success: true, status: "EVENT_RECEIVED" });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "WhatsApp webhook processing failed";
    console.error("WhatsApp webhook error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

