import { IEmailProvider, SendEmailParams, ProviderSendResult } from "./types";

/**
 * Local Console Email Simulator
 * Safe fallback for local development, demoing, and automated test environments.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  public readonly name = "console-simulator";

  public isConfigured(): boolean {
    return true;
  }

  public async sendEmail(params: SendEmailParams): Promise<ProviderSendResult> {
    const messageId = `msg_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[EMAIL-SIMULATOR] Dispatched '${params.subject}' to ${params.to} | Message ID: ${messageId}`
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId: messageId,
      status: "simulated",
    };
  }
}

