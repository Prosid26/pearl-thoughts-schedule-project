export type NotificationChannel = "email" | "sms" | "whatsapp";

export type NotificationEventType =
  | "booking_confirmed"
  | "payment_success"
  | "payment_failed"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "refund_requested"
  | "refund_processed"
  | "refund_failed"
  | "appointment_reminder";

export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  userId: number;
  appointmentId?: number;
  doctorName: string;
  specialization: string;
  appointmentDate: string; // ISO string
  appointmentTimeStr: string; // e.g. "10:00 – 10:30 IST"
  clinicAddress?: string | null;
  amountFormatted?: string; // e.g. "₹1,000"
  paymentId?: string;
  orderId?: string;
  refundAmountFormatted?: string;
  refundReason?: string;
  failureReason?: string;
  reminderType?: string; // "24 hours prior"
  customNotes?: string;
  idempotencyKey?: string;
}

export interface SendNotificationResult {
  success: boolean;
  channel: NotificationChannel;
  provider: string;
  messageId?: string;
  status: "sent" | "delivered" | "simulated" | "failed";
  error?: string;
}

export interface NotificationProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string; status: "sent" | "delivered" | "simulated" }>;
}

