import { PaymentProvider } from "./types";
import { RazorpayPaymentProvider } from "./razorpay";
import { MockPaymentProvider } from "./mock-provider";

export * from "./types";
export * from "./policy";
export * from "./razorpay";
export * from "./mock-provider";

let cachedProvider: PaymentProvider | null = null;

export function getPaymentProvider(forceNew = false): PaymentProvider {
  if (cachedProvider && !forceNew) return cachedProvider;

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (
    razorpayKeyId &&
    razorpayKeySecret &&
    !razorpayKeyId.includes("placeholder") &&
    razorpayKeyId.startsWith("rzp_")
  ) {
    cachedProvider = new RazorpayPaymentProvider();
  } else {
    cachedProvider = new MockPaymentProvider();
  }

  return cachedProvider;
}

export function isLivePaymentConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes("placeholder") &&
      process.env.RAZORPAY_KEY_ID.startsWith("rzp_")
  );
}

export function resetPaymentProviderCache(): void {
  cachedProvider = null;
}
