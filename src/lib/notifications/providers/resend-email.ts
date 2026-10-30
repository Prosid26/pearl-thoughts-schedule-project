import { IEmailProvider, SendEmailParams, ProviderSendResult } from "./types";
import { withRetry } from "../retry";

/**
 * Official Resend Email Provider
 * Connects directly to https://api.resend.com/emails with automatic retry handling.
 * Reads RESEND_API_KEY and EMAIL_FROM dynamically from environment variables.
 */
export class ResendEmailProvider implements IEmailProvider {
  public readonly name = "resend";

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(
      key &&
        !key.includes("placeholder") &&
        !key.startsWith("re_your_") &&
        key.length > 5
    );
  }

  private getApiKey(): string | undefined {
    const raw = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
    return raw ? raw.replace(/^["']|["']$/g, "").trim() : undefined;
  }

  private getFromAddress(paramFrom?: string): string | undefined {
    const from = process.env.EMAIL_FROM || paramFrom;
    return from ? from.replace(/^["']|["']$/g, "").trim() : undefined;
  }

  public async sendEmail(params: SendEmailParams): Promise<ProviderSendResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "RESEND_API_KEY environment variable is not configured.",
      };
    }

    const fromAddress = this.getFromAddress(params.from);
    if (!fromAddress) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: "EMAIL_FROM environment variable is not configured.",
      };
    }

    if (!params.to || !params.to.includes("@")) {
      return {
        success: false,
        provider: this.name,
        status: "failed",
        error: `Valid recipient email address is required. Received: '${params.to || ""}'`,
      };
    }

    try {
      const { result } = await withRetry(
        async (attempt) => {
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
            let parsedDetails = errorText;
            try {
              const errJson = JSON.parse(errorText);
              if (errJson?.message) {
                parsedDetails = `(${errJson.name || "ResendError"}): ${errJson.message}`;
              }
            } catch {
              // Non-JSON response, keep raw text
            }
            throw new Error(`Resend HTTP ${res.status}: ${parsedDetails}`);
          }

          const data = (await res.json()) as { id: string };
          return data;
        },
        {
          maxRetries: 2,
          initialDelayMs: 300,
          onRetry: (err, attempt) => {
            console.warn(
              `[NOTIF-RETRY] Resend send attempt ${attempt} failed: ${err.message}. Retrying...`
            );
          },
        }
      );

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
