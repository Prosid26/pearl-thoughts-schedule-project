import { IWhatsAppProvider, SendWhatsAppParams, ProviderSendResult } from "./types";

/**
 * Local Console WhatsApp Simulator
 * Fallback for local development, demo environments, and automated testing.
 */
export class ConsoleWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = "console-whatsapp-simulator";

  public isConfigured(): boolean {
    return true;
  }

  public async sendWhatsApp(params: SendWhatsAppParams): Promise<ProviderSendResult> {
    const messageId = `wamid_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const preview =
      params.bodyText.length > 120
        ? `${params.bodyText.slice(0, 120)}...`
        : params.bodyText;

    console.log(
      `[WHATSAPP-SIMULATOR] Sent WhatsApp to ${params.to} | Template: ${params.templateName || "custom_text"} | Message ID: ${messageId} | Content: "${preview}"`
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId: messageId,
      status: "simulated",
    };
  }
}

