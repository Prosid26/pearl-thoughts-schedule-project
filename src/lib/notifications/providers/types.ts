/**
 * Notification Provider Abstraction Interfaces
 * Supports multi-channel providers (Email, SMS) with uniform result contracts.
 */

export interface ProviderSendResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  status: "sent" | "delivered" | "simulated" | "failed";
  error?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export interface SendWhatsAppParams {
  to: string;
  bodyText: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{
      type: "text" | "currency" | "date_time";
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }>;
  }>;
}

export interface IEmailProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(params: SendEmailParams): Promise<ProviderSendResult>;
}

export interface ISmsProvider {
  name: string;
  isConfigured(): boolean;
  sendSms(params: SendSmsParams): Promise<ProviderSendResult>;
}

export interface IWhatsAppProvider {
  name: string;
  isConfigured(): boolean;
  sendWhatsApp(params: SendWhatsAppParams): Promise<ProviderSendResult>;
}

