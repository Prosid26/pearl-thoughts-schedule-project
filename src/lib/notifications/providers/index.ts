import { IEmailProvider, ISmsProvider, IWhatsAppProvider } from "./types";
import { ResendEmailProvider } from "./resend-email";
import { ConsoleEmailProvider } from "./console-email";
import { TwilioSmsProvider } from "./twilio-sms";
import { ConsoleSmsProvider } from "./console-sms";
import { WhatsAppCloudProvider } from "./meta-whatsapp";
import { ConsoleWhatsAppProvider } from "./console-whatsapp";

export * from "./types";
export * from "./resend-email";
export * from "./console-email";
export * from "./twilio-sms";
export * from "./console-sms";
export * from "./meta-whatsapp";
export * from "./console-whatsapp";

let cachedEmailProvider: IEmailProvider | null = null;
let cachedSmsProvider: ISmsProvider | null = null;
let cachedWhatsAppProvider: IWhatsAppProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  const resend = new ResendEmailProvider();
  if (resend.isConfigured()) {
    return resend;
  }
  if (!cachedEmailProvider) {
    cachedEmailProvider = new ConsoleEmailProvider();
  }
  return cachedEmailProvider;
}

export function getSmsProvider(): ISmsProvider {
  const twilio = new TwilioSmsProvider();
  if (twilio.isConfigured()) {
    return twilio;
  }
  if (!cachedSmsProvider) {
    cachedSmsProvider = new ConsoleSmsProvider();
  }
  return cachedSmsProvider;
}

export function getWhatsAppProvider(): IWhatsAppProvider {
  const meta = new WhatsAppCloudProvider();
  if (meta.isConfigured()) {
    return meta;
  }
  if (!cachedWhatsAppProvider) {
    cachedWhatsAppProvider = new ConsoleWhatsAppProvider();
  }
  return cachedWhatsAppProvider;
}

