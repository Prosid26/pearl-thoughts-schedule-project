import crypto from "crypto";
import Razorpay from "razorpay";
import {
  PaymentProvider,
  CreateOrderParams,
  ProviderOrder,
  VerifyPaymentParams,
  VerifyWebhookParams,
  CreateRefundParams,
  ProviderRefund,
  ProviderPaymentDetails,
} from "./types";

export class RazorpayPaymentProvider implements PaymentProvider {
  public readonly name = "razorpay";
  private razorpayClient: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(options?: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
  }) {
    this.keyId = options?.keyId || process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = options?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret =
      options?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (this.keyId && this.keySecret) {
      this.razorpayClient = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
  }

  private getClient(): Razorpay {
    if (!this.razorpayClient) {
      if (!this.keyId || !this.keySecret) {
        throw new Error(
          "Razorpay credentials missing. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set."
        );
      }
      this.razorpayClient = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
    return this.razorpayClient;
  }

  public async createOrder(params: CreateOrderParams): Promise<ProviderOrder> {
    const client = this.getClient();
    // Razorpay amount is in integer paise (e.g. 50000 for ₹500.00)
    const options = {
      amount: Math.round(params.amount),
      currency: params.currency || "INR",
      receipt: params.receipt,
      notes: params.notes || {},
    };

    const order = await client.orders.create(options);

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  public verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    if (!this.keySecret) {
      throw new Error("Razorpay key secret not configured for signature verification.");
    }

    try {
      const text = `${params.orderId}|${params.paymentId}`;
      const generatedSignature = crypto
        .createHmac("sha256", this.keySecret)
        .update(text)
        .digest("hex");

      const generatedBuffer = Buffer.from(generatedSignature, "utf8");
      const signatureBuffer = Buffer.from(params.signature, "utf8");

      if (generatedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  }

  public verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    const secret = params.secret || this.webhookSecret;
    if (!secret) {
      throw new Error("Razorpay webhook secret not configured for verification.");
    }

    try {
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(params.rawBody)
        .digest("hex");

      const generatedBuffer = Buffer.from(generatedSignature, "utf8");
      const signatureBuffer = Buffer.from(params.signature, "utf8");

      if (generatedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  }

  public async createRefund(params: CreateRefundParams): Promise<ProviderRefund> {
    const client = this.getClient();

    const refund = await client.payments.refund(params.paymentId, {
      amount: Math.round(params.amount),
      notes: {
        ...(params.notes || {}),
        reason: params.reason || "Patient consultation cancellation",
      },
    });

    return {
      refundId: refund.id,
      amount: Number(refund.amount),
      currency: refund.currency,
      status: refund.status === "processed" ? "processed" : "pending",
    };
  }

  public async fetchPayment(paymentId: string): Promise<ProviderPaymentDetails> {
    const client = this.getClient();
    const payment = (await client.payments.fetch(paymentId)) as any;

    let status: ProviderPaymentDetails["status"] = "pending";
    if (payment.status === "captured") status = "captured";
    else if (payment.status === "failed") status = "failed";
    else if (payment.status === "refunded") status = "refunded";

    return {
      id: payment.id,
      status,
      amount: Number(payment.amount),
      currency: payment.currency,
      email: payment.email,
      contact: payment.contact,
    };
  }
}

