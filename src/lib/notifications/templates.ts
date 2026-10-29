import { NotificationEventType, NotificationPayload } from "./types";
import { formatISTDate } from "@/lib/utils/date";

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailTemplate(
  eventType: NotificationEventType,
  payload: NotificationPayload
): RenderedTemplate {
  const dateFormatted = formatISTDate(payload.appointmentDate);
  const timeFormatted = payload.appointmentTimeStr || "Scheduled Clinical Window";
  const doctor = payload.doctorName;
  const specialty = payload.specialization;
  const clinic = payload.clinicAddress || "Medrella Healthcare Clinic";

  switch (eventType) {
    case "booking_confirmed":
      return {
        subject: `Appointment Confirmed with ${doctor} (#APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")})`,
        text: `Dear ${payload.recipientName},\n\nYour consultation with ${doctor} (${specialty}) has been confirmed for ${dateFormatted} at ${timeFormatted}.\n\nClinic: ${clinic}\nStatus: Slot Atomically Reserved\nReference: #APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")}\n\nThank you for choosing Medrella Healthcare.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8FA89B;">Medrella Clinical Consultation</span>
              <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Consultation Slot Confirmed</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Your appointment has been atomically secured in our schedule. Here are the consultation details:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Specialist:</strong> ${doctor} (${specialty})</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Date:</strong> ${dateFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Time:</strong> ${timeFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Clinic Location:</strong> ${clinic}</div>
                <div style="font-size: 13px;"><strong>Booking Reference:</strong> #APT-${String(
                  payload.appointmentId || "NEW"
                ).padStart(5, "0")}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Please arrive 10 minutes before your scheduled window. If you need to reschedule, please do so at least 24 hours in advance.</p>
            </div>
          </div>
        `,
      };

    case "payment_success":
      return {
        subject: `Payment Receipt: ${payload.amountFormatted || "₹0"} for ${doctor} (#APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")})`,
        text: `Dear ${payload.recipientName},\n\nPayment of ${payload.amountFormatted} was successfully received for consultation #APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")} with ${doctor}.\n\nPayment ID: ${payload.paymentId || "Captured"}\nDate: ${dateFormatted} @ ${timeFormatted}\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8FA89B;">Official Payment Receipt</span>
              <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Payment Successfully Captured</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Thank you for completing your consultation fee payment. Your transaction has been cryptographically verified and recorded.</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 16px; font-weight: bold; color: #1B3B2B; margin-bottom: 12px;">Amount Paid: ${payload.amountFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Doctor:</strong> ${doctor}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Date & Time:</strong> ${dateFormatted} (${timeFormatted})</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Payment Reference ID:</strong> ${payload.paymentId || "N/A"}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> #APT-${String(
                  payload.appointmentId || "NEW"
                ).padStart(5, "0")}</div>
              </div>
            </div>
          </div>
        `,
      };

    case "payment_failed":
      return {
        subject: `Payment Alert: Consultation with ${doctor} could not be completed`,
        text: `Dear ${payload.recipientName},\n\nThe payment attempt for your consultation with ${doctor} was unsuccessful.\n\nReason: ${payload.failureReason || "Transaction declined or timed out"}.\n\nPlease revisit your appointment portal to complete payment or retry with another payment method.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #8B261E; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Payment Processing Failed</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>We were unable to process the consultation fee for your appointment with <strong>${doctor}</strong>.</p>
              <p style="background: #FFF5F5; border: 1px solid #FEB2B2; padding: 14px; border-radius: 6px; font-size: 13px; color: #9B2C2C;">
                <strong>Reason:</strong> ${payload.failureReason || "Payment was rejected or abandoned by the provider."}
              </p>
              <p>You can sign in to your Medrella patient portal and retry payment before your appointment window.</p>
            </div>
          </div>
        `,
      };

    case "appointment_cancelled":
      return {
        subject: `Appointment Cancelled: ${doctor} (#APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")})`,
        text: `Dear ${payload.recipientName},\n\nYour appointment with ${doctor} on ${dateFormatted} has been cancelled. Your time slot has been freed.\n\nRefund Status: ${payload.refundAmountFormatted ? `Eligible for refund: ${payload.refundAmountFormatted}` : "Processed according to clinic policy"}\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #718096; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Appointment Cancelled</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Your appointment with <strong>${doctor}</strong> scheduled for <strong>${dateFormatted} at ${timeFormatted}</strong> has been cancelled.</p>
              ${
                payload.refundAmountFormatted
                  ? `<div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
                      <strong>Refund Evaluation:</strong> Eligible refund of <strong>${payload.refundAmountFormatted}</strong> initiated per cancellation policy.
                    </div>`
                  : ""
              }
              <p style="font-size: 13px; color: #718096;">If you wish to reschedule or find another specialist, you can visit our doctor directory at any time.</p>
            </div>
          </div>
        `,
      };

    case "appointment_rescheduled":
      return {
        subject: `Appointment Rescheduled: ${doctor} (#APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")})`,
        text: `Dear ${payload.recipientName},\n\nYour appointment with ${doctor} has been rescheduled to ${dateFormatted} at ${timeFormatted}.\n\nLocation: ${clinic}\nBooking Ref: #APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Consultation Rescheduled</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Your consultation slot with <strong>${doctor}</strong> has been successfully moved to the new date and time:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>New Date:</strong> ${dateFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>New Time:</strong> ${timeFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Clinic Location:</strong> ${clinic}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> #APT-${String(
                  payload.appointmentId || "NEW"
                ).padStart(5, "0")}</div>
              </div>
            </div>
          </div>
        `,
      };

    case "refund_requested":
    case "refund_processed":
      return {
        subject: `Refund Processed: ${payload.refundAmountFormatted || "Refund"} for Consultation with ${doctor}`,
        text: `Dear ${payload.recipientName},\n\nA refund of ${payload.refundAmountFormatted || "the consultation fee"} has been successfully processed for your appointment with ${doctor}.\n\nReason: ${payload.refundReason || "Cancellation policy"}\n\nThe amount will reflect in your original payment method within 5-7 business days.\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Refund Processed</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>A refund has been issued for your consultation #APT-${String(
                payload.appointmentId || "NEW"
              ).padStart(5, "0")}:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 16px; font-weight: bold; color: #1B3B2B; margin-bottom: 10px;">Refund Amount: ${payload.refundAmountFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Doctor:</strong> ${doctor}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Policy Applied:</strong> ${payload.refundReason || "Clinical Cancellation Policy"}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> #APT-${String(
                  payload.appointmentId || "NEW"
                ).padStart(5, "0")}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Refunds typically take 5 to 7 business days to credit to your bank account or payment provider.</p>
            </div>
          </div>
        `,
      };

    case "refund_failed":
      return {
        subject: `Refund Issue Notice: Consultation with ${doctor}`,
        text: `Dear ${payload.recipientName},\n\nWe encountered an issue while processing your refund for appointment #APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")}.\n\nOur administrative staff has been notified and will review this transaction manually.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #8B261E; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Refund Processing Notice</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>An automated refund for appointment <strong>#APT-${String(
                payload.appointmentId || "NEW"
              ).padStart(5, "0")}</strong> could not be completed automatically by the payment gateway.</p>
              <p>Our clinic administrative desk has been notified and will assist you directly.</p>
            </div>
          </div>
        `,
      };

    case "appointment_reminder":
    default:
      return {
        subject: `Upcoming Appointment Reminder: ${doctor} on ${dateFormatted}`,
        text: `Dear ${payload.recipientName},\n\nThis is a friendly reminder of your upcoming consultation with ${doctor} (${specialty}) on ${dateFormatted} at ${timeFormatted}.\n\nClinic: ${clinic}\nAppointment Ref: #APT-${String(
          payload.appointmentId || "NEW"
        ).padStart(5, "0")}\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8FA89B;">Clinical Reminder</span>
              <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Upcoming Consultation Reminder</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>This is a reminder that your consultation is scheduled soon:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Specialist:</strong> ${doctor} (${specialty})</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Date:</strong> ${dateFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Time:</strong> ${timeFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Venue:</strong> ${clinic}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> #APT-${String(
                  payload.appointmentId || "NEW"
                ).padStart(5, "0")}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Please arrive 10 minutes prior to your time window. If you are experiencing an acute emergency, please contact your local emergency services.</p>
            </div>
          </div>
        `,
      };
  }
}

