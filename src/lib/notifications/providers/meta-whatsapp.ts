import { IWhatsAppProvider, SendWhatsAppParams, ProviderSendResult } from "./types";
import { withRetry } from "../retry";

/**
 * Normalizes phone numbers to standard Meta WhatsApp format (digits only, no '+' sign)
 * e.g., "+91 98200 11223" -> "919820011223"
 * "9820011223" -> "919820011223" (defaults to India 91 if 10 digits)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Official Meta WhatsApp Business Cloud API Provider
 * Direct REST integration with graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
 */
export class WhatsAppCloudProvider implements IWhatsAppProvider {
  public readonly name = "meta-whatsapp-cloud";

  public isConfigured(): boolean {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    return Boolean(
      token &&
        phoneId &&
        !token.includes("placeholder") &&
        !token.startsWith("your_meta_") &&
        !phoneId.startsWith("your_meta_")
    );
  }

  public async sendWhatsApp(params: SendWhatsAppParams): Promise<ProviderSendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error:
          "WhatsApp Cloud API credentials (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured.",
      };
    }

    const recipientPhone = normalizeWhatsAppNumber(params.to);
    if (!recipientPhone) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "Invalid recipient phone number for WhatsApp delivery.",
      };
    }

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

    // Construct Meta Cloud API payload:
    // If a registered template is specified and components are provided, use "template";
    // otherwise fallback to transactional text payload.
    let payload: Record<string, unknown>;

    if (params.templateName && params.templateComponents && params.templateComponents.length > 0) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: params.templateLanguage || "en",
          },
          components: params.templateComponents,
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: params.bodyText,
        },
      };
    }

    try {
      const { result } = await withRetry(
        async () => {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = (await res.json().catch(() => ({}))) as any;

          if (!res.ok) {
            const errObj = data?.error;
            const errorMsg =
              errObj?.message ||
              `Meta WhatsApp API error (HTTP ${res.status}): ${JSON.stringify(data)}`;
            const err: any = new Error(errorMsg);
            err.status = res.status;
            err.code = errObj?.code;
            err.fbtrace_id = errObj?.fbtrace_id;
            throw err;
          }

          return data;
        },
        {
          maxRetries: 2,
          initialDelayMs: 600,
        }
      );

      const messageId = result?.messages?.[0]?.id;

      return {
        success: true,
        provider: this.name,
        providerMessageId: messageId,
        status: "sent",
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "WhatsApp Cloud API request failed";
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: errorMsg,
      };
    }
  }
}
