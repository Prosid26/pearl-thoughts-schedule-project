/**
 * Extensible Payment Provider Interfaces & Data Types
 * Medrella Healthcare Appointment Booking System
 */

export interface CreateOrderParams {
  amount: number; // In minor units (paise for INR, e.g., 100000 = ₹1,000)
  currency: string; // "INR"
  receipt: string; // e.g. "rcpt_apt_1234"
  notes?: Record<string, string>;
}

export interface ProviderOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyWebhookParams {
  rawBody: string;
  signature: string;
  secret: string;
}

export interface CreateRefundParams {
  paymentId: string; // Provider's payment ID (e.g., "pay_...")
  amount: number; // Minor units (paise)
  reason?: string;
  notes?: Record<string, string>;
  idempotencyKey?: string;
}

export interface ProviderRefund {
  refundId: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  currency: string;
}

export interface ProviderPaymentDetails {
  id: string;
  status: "pending" | "captured" | "failed" | "refunded";
  amount: number;
  currency: string;
  email?: string;
  contact?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreateOrderParams): Promise<ProviderOrder>;
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;
  verifyWebhookSignature(params: VerifyWebhookParams): boolean;
  createRefund(params: CreateRefundParams): Promise<ProviderRefund>;
  fetchPayment(paymentId: string): Promise<ProviderPaymentDetails>;
}

