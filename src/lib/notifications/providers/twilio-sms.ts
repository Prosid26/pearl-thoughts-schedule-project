import { ISmsProvider, SendSmsParams, ProviderSendResult } from "./types";
import { withRetry } from "../retry";

/**
 * Normalizes phone numbers to standard E.164 format
 * e.g., "+91 98200 11223" -> "+919820011223"
 * "9820011223" -> "+919820011223" (defaulting to India country code +91 if missing)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = `+${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

/**
 * Official Twilio SMS Provider
 * Uses native fetch with Basic Authentication to send SMS via Twilio Messages API.
 */
export class TwilioSmsProvider implements ISmsProvider {
  public readonly name = "twilio";

  public isConfigured(): boolean {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    return Boolean(
      sid &&
        token &&
        fromPhone &&
        !sid.includes("placeholder") &&
        !sid.startsWith("AC_your_")
    );
  }

  public async sendSms(params: SendSmsParams): Promise<ProviderSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !defaultFrom) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not configured.",
      };
    }

    const to = normalizePhoneNumber(params.to);
    const from = params.from || defaultFrom;

    if (!to) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "Invalid or missing recipient phone number.",
      };
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append("To", to);
      formData.append("From", from);
      formData.append("Body", params.body);

      const { result } = await withRetry(async (attempt) => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Twilio HTTP ${res.status}: ${errorText}`);
        }

        const data = (await res.json()) as {
          sid: string;
          status: string;
          error_code?: number;
          error_message?: string;
        };

        if (data.error_code) {
          throw new Error(`Twilio Error ${data.error_code}: ${data.error_message}`);
        }

        return data;
      }, {
        maxRetries: 2,
        initialDelayMs: 300,
        onRetry: (err, attempt) => {
          console.warn(`[SMS-RETRY] Twilio send attempt ${attempt} failed: ${err.message}. Retrying...`);
        },
      });

      return {
        success: true,
        provider: this.name,
        providerMessageId: result.sid,
        status: "delivered",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: errorMsg,
      };
    }
  }
}

