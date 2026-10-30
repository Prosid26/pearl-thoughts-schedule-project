import { IEmailProvider, SendEmailParams, ProviderSendResult } from "./types";
import { withRetry } from "../retry";

/**
 * Official Resend Email Provider
 * Connects directly to https://api.resend.com/emails with automatic retry handling.
 */
export class ResendEmailProvider implements IEmailProvider {
  public readonly name = "resend";

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && !key.includes("placeholder") && !key.startsWith("re_your_"));
  }

  private getApiKey(): string | undefined {
    return process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  }

  public async sendEmail(params: SendEmailParams): Promise<ProviderSendResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "RESEND_API_KEY is not configured.",
      };
    }

    const fromAddress =
      params.from ||
      process.env.EMAIL_FROM ||
      "Medrella Healthcare <appointments@medrella.com>";

    try {
      const { result, attempts } = await withRetry(async (attempt) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [params.to],
            subject: params.subject,
            html: params.html,
            text: params.text,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Resend HTTP ${res.status}: ${errorText}`);
        }

        const data = (await res.json()) as { id: string };
        return data;
      }, {
        maxRetries: 2,
        initialDelayMs: 300,
        onRetry: (err, attempt) => {
          console.warn(`[NOTIF-RETRY] Resend send attempt ${attempt} failed: ${err.message}. Retrying...`);
        },
      });

      return {
        success: true,
        provider: this.name,
        providerMessageId: result.id,
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

