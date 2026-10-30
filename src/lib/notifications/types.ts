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
  | "appointment_reminder"
  | "doctor_booking_alert"
  | "doctor_cancellation_alert"
  | "doctor_reschedule_alert";

export interface NotificationPayload {
  recipientEmail: string;
  recipientPhone?: string | null;
  recipientName: string;
  userId: number;
  appointmentId?: number;
  bookingRef?: string;
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string;
  patientName?: string;
  patientPhone?: string;
  specialization: string;
  appointmentDate: string; // ISO string or YYYY-MM-DD
  appointmentTimeStr: string; // e.g. "10:00 – 10:30 IST"
  previousDate?: string; // For reschedule
  previousTimeStr?: string; // For reschedule
  clinicAddress?: string | null;
  amountFormatted?: string; // e.g. "₹1,000"
  paymentId?: string;
  orderId?: string;
  paymentStatus?: string;
  refundAmountFormatted?: string;
  refundReason?: string;
  failureReason?: string;
  cancellationReason?: string;
  cancelledBy?: "patient" | "doctor" | "clinic";
  reminderType?: string; // "24 hours prior" | "2 hours prior"
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
  smsResult?: {
    success: boolean;
    provider: string;
    messageId?: string;
    status: "sent" | "delivered" | "simulated" | "failed";
    error?: string;
  };
  whatsappResult?: {
    success: boolean;
    provider: string;
    messageId?: string;
    status: "sent" | "delivered" | "simulated" | "failed";
    error?: string;
  };
  skipped?: boolean;
  skipReason?: string;
}

export interface NotificationProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string; status: "sent" | "delivered" | "simulated" }>;
}
