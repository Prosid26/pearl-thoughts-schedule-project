import { ISmsProvider, SendSmsParams, ProviderSendResult } from "./types";

/**
 * Local Console SMS Simulator
 * Fallback for local development, demo environments, and automated testing.
 */
export class ConsoleSmsProvider implements ISmsProvider {
  public readonly name = "console-sms-simulator";

  public isConfigured(): boolean {
    return true;
  }

  public async sendSms(params: SendSmsParams): Promise<ProviderSendResult> {
    const messageId = `sms_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[SMS-SIMULATOR] Sent SMS to ${params.to} | Message ID: ${messageId} | Content: "${params.body}"`
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId: messageId,
      status: "simulated",
    };
  }
}

