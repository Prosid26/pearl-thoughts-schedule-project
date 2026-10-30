import { NotificationEventType, NotificationPayload } from "./types";
import { formatISTDate } from "@/lib/utils/date";
import { generateUnsubscribeToken } from "./unsubscribe-token";

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
  sms: string;
  whatsapp: {
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
  };
}

function buildEmailFooterHtml(userId?: number, email?: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://pearl-thoughts-schedule-project.vercel.app";
  const token =
    userId && email ? generateUnsubscribeToken(userId, email) : "";
  const unsubUrl = token ? `${appUrl}/unsubscribe?token=${token}` : `${appUrl}/auth/sign-in`;

  return `
    <div style="background-color: #FAF8F5; border-top: 1px solid #E8E5DF; padding: 20px 32px; font-size: 11px; color: #718096; text-align: center; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;"><strong>Medrella Healthcare</strong> • Automated Clinical System Notification</p>
      <p style="margin: 0;">To update your notification preferences or <a href="${unsubUrl}" style="color: #8B261E; text-decoration: underline;">unsubscribe from email updates</a>, click here.</p>
    </div>
  `;
}

function buildEmailFooterText(userId?: number, email?: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://pearl-thoughts-schedule-project.vercel.app";
  const token =
    userId && email ? generateUnsubscribeToken(userId, email) : "";
  const unsubUrl = token ? `${appUrl}/unsubscribe?token=${token}` : `${appUrl}/auth/sign-in`;

  return `\n\n---\nMedrella Healthcare • Automated Clinical Notification\nTo unsubscribe or manage communication preferences: ${unsubUrl}`;
}

export function renderEmailTemplate(
  eventType: NotificationEventType,
  payload: NotificationPayload
): RenderedTemplate {
  const dateFormatted = formatISTDate(payload.appointmentDate);
  const timeFormatted = payload.appointmentTimeStr || "Scheduled Clinical Window";
  const doctor = payload.doctorName;
  const specialty = payload.specialization;
  const clinic = payload.clinicAddress || "Medrella Healthcare Clinic, Mumbai";
  const patient = payload.patientName || payload.recipientName || "Patient";
  const ref = payload.bookingRef || `#APT-${String(payload.appointmentId || "NEW").padStart(5, "0")}`;

  const isDoc =
    eventType === "doctor_booking_alert" ||
    eventType === "doctor_cancellation_alert" ||
    eventType === "doctor_reschedule_alert";

  const footerHtml = isDoc ? "" : buildEmailFooterHtml(payload.userId, payload.recipientEmail);
  const footerText = isDoc ? "" : buildEmailFooterText(payload.userId, payload.recipientEmail);

  switch (eventType) {
    case "booking_confirmed":
      return {
        subject: `Appointment Confirmed with ${doctor} (${ref})`,
        sms: `Medrella: Appt with ${doctor} (${specialty}) is confirmed for ${dateFormatted} at ${timeFormatted}. Ref: ${ref}. Arrive 10m early.`,
        whatsapp: {
          bodyText: `*Medrella Healthcare*\n\nDear ${payload.recipientName},\nYour consultation with *${doctor}* (${specialty}) has been confirmed.\n\n📅 Date: ${dateFormatted}\n⏰ Time: ${timeFormatted}\n🏥 Clinic: ${clinic}\n🔖 Ref: ${ref}\n💳 Payment: ${payload.paymentStatus || "Unpaid"}\n\nPlease arrive 10 minutes prior to your time window.`,
          templateName: "appointment_confirmation",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: doctor },
                { type: "text", text: `${dateFormatted} at ${timeFormatted}` },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nYour consultation with ${doctor} (${specialty}) has been confirmed for ${dateFormatted} at ${timeFormatted}.\n\nClinic: ${clinic}\nStatus: Slot Atomically Reserved\nReference: ${ref}\nPayment Status: ${payload.paymentStatus || "Unpaid - Pay Online"}\n\nThank you for choosing Medrella Healthcare.${footerText}`,
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
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Booking Reference:</strong> ${ref}</div>
                <div style="font-size: 13px;"><strong>Payment Status:</strong> <span style="font-weight: 600; text-transform: uppercase;">${payload.paymentStatus || "Unpaid"}</span></div>
              </div>
              <p style="font-size: 13px; color: #718096;">Please arrive 10 minutes before your scheduled window. If you need to reschedule or cancel, please do so in advance via your patient portal.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "doctor_booking_alert":
      return {
        subject: `New Patient Consultation: ${patient} (${ref})`,
        sms: `Dr. ${doctor}: New consultation booked with ${patient} for ${dateFormatted} at ${timeFormatted}. Ref: ${ref}. Medrella`,
        whatsapp: {
          bodyText: `*Medrella Doctor Alert*\n\nDr. ${doctor},\nA new patient consultation has been scheduled in your roster:\n\n👤 Patient: ${patient}\n📅 Date: ${dateFormatted}\n⏰ Time: ${timeFormatted}\n🔖 Ref: ${ref}\n📝 Context: ${payload.customNotes || "Routine Consultation"}`,
          templateName: "doctor_booking_alert",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: doctor },
                { type: "text", text: patient },
                { type: "text", text: `${dateFormatted} at ${timeFormatted}` },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${doctor},\n\nA new consultation has been booked in your clinic schedule.\n\nPatient: ${patient}\nDate: ${dateFormatted}\nTime: ${timeFormatted}\nBooking Reference: ${ref}\nClinical Context: ${payload.customNotes || "Routine Consultation"}\n\nYou can review full medical details in your practitioner portal.\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8FA89B;">Practitioner Alert</span>
              <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Patient Consultation Booked</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${doctor}</strong>,</p>
              <p>A patient has scheduled a consultation with your practice:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Patient:</strong> ${patient}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Date:</strong> ${dateFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Time Window:</strong> ${timeFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Reference:</strong> ${ref}</div>
                <div style="font-size: 13px;"><strong>Reason / Symptoms:</strong> ${payload.customNotes || "General Consultation"}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">You can view and manage your clinic roster through the doctor dashboard.</p>
            </div>
          </div>
        `,
      };

    case "appointment_cancelled":
      return {
        subject: `Appointment Cancelled: ${doctor} (${ref})`,
        sms: `Medrella: Your appointment with ${doctor} on ${dateFormatted} is cancelled. ${payload.refundAmountFormatted ? `Eligible refund: ${payload.refundAmountFormatted}.` : ""}`,
        whatsapp: {
          bodyText: `*Medrella Healthcare*\n\nDear ${payload.recipientName},\nYour appointment ${ref} with *${doctor}* on ${dateFormatted} has been cancelled.\n${payload.refundAmountFormatted ? `💰 Refund: ${payload.refundAmountFormatted} initiated per clinical policy.\n` : ""}Reason: ${payload.cancellationReason || "Patient request"}\n\nYou can book a new appointment on our portal anytime.`,
          templateName: "appointment_cancellation",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: doctor },
                { type: "text", text: dateFormatted },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nYour appointment with ${doctor} on ${dateFormatted} at ${timeFormatted} has been cancelled.\n\nBooking Reference: ${ref}\nReason: ${payload.cancellationReason || "Patient request"}\nRefund Status: ${payload.refundAmountFormatted ? `Eligible for refund of ${payload.refundAmountFormatted}` : "Handled per cancellation policy"}\n\nMedrella Healthcare${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #718096; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Appointment Cancelled</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Your appointment with <strong>${doctor}</strong> scheduled for <strong>${dateFormatted} at ${timeFormatted}</strong> (${ref}) has been cancelled.</p>
              ${
                payload.cancellationReason
                  ? `<p style="font-size: 13px; color: #4A5568;"><strong>Cancellation Reason:</strong> ${payload.cancellationReason}</p>`
                  : ""
              }
              ${
                payload.refundAmountFormatted
                  ? `<div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
                      <strong>Refund Evaluation:</strong> Eligible refund of <strong>${payload.refundAmountFormatted}</strong> initiated per clinical cancellation policy.
                    </div>`
                  : ""
              }
              <p style="font-size: 13px; color: #718096;">If you wish to reschedule or find another specialist, you can visit our doctor directory at any time.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "doctor_cancellation_alert":
      return {
        subject: `Appointment Cancelled by Patient: ${patient} (${ref})`,
        sms: `Dr. ${doctor}: Appointment ${ref} with ${patient} on ${dateFormatted} has been cancelled. Your slot is now open for booking. Medrella`,
        whatsapp: {
          bodyText: `*Medrella Roster Alert*\n\nDr. ${doctor}: Appointment ${ref} with ${patient} on ${dateFormatted} at ${timeFormatted} has been cancelled.\nReason: ${payload.cancellationReason || "Patient request"}.\nYour time slot has been returned to the open schedule.`,
          templateName: "doctor_cancellation_alert",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: doctor },
                { type: "text", text: patient },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${doctor},\n\nThe following appointment in your roster has been cancelled:\n\nPatient: ${patient}\nDate: ${dateFormatted} at ${timeFormatted}\nReference: ${ref}\nReason: ${payload.cancellationReason || "Patient request"}\n\nThe time slot has been automatically restored and is available for other patients.\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #718096; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Appointment Cancelled</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${doctor}</strong>,</p>
              <p>An upcoming consultation in your schedule has been cancelled:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Patient:</strong> ${patient}</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Date & Time:</strong> ${dateFormatted} (${timeFormatted})</div>
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Reference:</strong> ${ref}</div>
                <div style="font-size: 13px;"><strong>Reason:</strong> ${payload.cancellationReason || "Patient cancelled"}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">The time slot has been returned to your open roster.</p>
            </div>
          </div>
        `,
      };

    case "appointment_rescheduled":
      return {
        subject: `Appointment Rescheduled: ${doctor} (${ref})`,
        sms: `Medrella: Your appointment with ${doctor} has been moved to ${dateFormatted} at ${timeFormatted}. Ref: ${ref}.`,
        whatsapp: {
          bodyText: `*Medrella Healthcare*\n\nDear ${payload.recipientName},\nYour consultation with *${doctor}* has been rescheduled.\n\n📅 New Slot: ${dateFormatted} at ${timeFormatted}\n${payload.previousDate ? `⏮️ Previous Slot: ${formatISTDate(payload.previousDate)} at ${payload.previousTimeStr || "Previous Window"}\n` : ""}🏥 Venue: ${clinic}\n🔖 Ref: ${ref}\n\nPlease arrive 10 minutes prior to your new window.`,
          templateName: "appointment_rescheduled",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: doctor },
                { type: "text", text: `${dateFormatted} at ${timeFormatted}` },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nYour appointment with ${doctor} has been rescheduled.\n\nNew Date & Time: ${dateFormatted} at ${timeFormatted}\n${payload.previousDate ? `Previous Window: ${formatISTDate(payload.previousDate)} at ${payload.previousTimeStr || "Previous Window"}\n` : ""}Clinic: ${clinic}\nBooking Ref: ${ref}\n\nMedrella Healthcare${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Consultation Rescheduled</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>Your consultation slot with <strong>${doctor}</strong> has been successfully rescheduled:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 14px; font-weight: bold; color: #1B3B2B; margin-bottom: 8px;">New Date & Time: ${dateFormatted} (${timeFormatted})</div>
                ${
                  payload.previousDate
                    ? `<div style="font-size: 13px; color: #718096; margin-bottom: 8px;">Previous Slot: ${formatISTDate(payload.previousDate)} at ${payload.previousTimeStr || "Previous Time"}</div>`
                    : ""
                }
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Clinic Location:</strong> ${clinic}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> ${ref}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Please arrive 10 minutes prior to your new consultation window.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "doctor_reschedule_alert":
      return {
        subject: `Appointment Rescheduled: ${patient} with ${doctor} (${ref})`,
        sms: `Dr. ${doctor}: Consultation ${ref} with ${patient} moved to ${dateFormatted} at ${timeFormatted}. Medrella`,
        whatsapp: {
          bodyText: `*Medrella Roster Alert*\n\nDr. ${doctor}: Consultation ${ref} with ${patient} has been rescheduled to ${dateFormatted} at ${timeFormatted}.${payload.previousDate ? ` (Moved from ${formatISTDate(payload.previousDate)} ${payload.previousTimeStr || ""})` : ""}`,
          templateName: "doctor_reschedule_alert",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: doctor },
                { type: "text", text: patient },
                { type: "text", text: `${dateFormatted} at ${timeFormatted}` },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${doctor},\n\nAn appointment in your calendar has been rescheduled.\n\nPatient: ${patient}\nNew Time Window: ${dateFormatted} at ${timeFormatted}\n${payload.previousDate ? `Previous Window: ${formatISTDate(payload.previousDate)} at ${payload.previousTimeStr || "Previous Window"}\n` : ""}Reference: ${ref}\n\nMedrella Healthcare`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Appointment Rescheduled in Roster</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${doctor}</strong>,</p>
              <p>A patient consultation in your schedule has been moved to a new time window:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 14px; font-weight: bold; color: #1B3B2B; margin-bottom: 8px;">New Time: ${dateFormatted} (${timeFormatted})</div>
                ${
                  payload.previousDate
                    ? `<div style="font-size: 13px; color: #718096; margin-bottom: 8px;">Previous Window: ${formatISTDate(payload.previousDate)} at ${payload.previousTimeStr || "Previous Window"}</div>`
                    : ""
                }
                <div style="font-size: 13px; margin-bottom: 8px;"><strong>Patient:</strong> ${patient}</div>
                <div style="font-size: 13px;"><strong>Reference:</strong> ${ref}</div>
              </div>
            </div>
          </div>
        `,
      };

    case "payment_success":
      return {
        subject: `Payment Receipt: ${payload.amountFormatted || "Fee"} for ${doctor} (${ref})`,
        sms: `Medrella: Payment of ${payload.amountFormatted || "₹0"} captured for consultation ${ref} with ${doctor}. Thank you.`,
        whatsapp: {
          bodyText: `*Medrella Payment Receipt*\n\nDear ${payload.recipientName},\nPayment of *${payload.amountFormatted || "₹0"}* for consultation ${ref} with *${doctor}* was captured successfully.\n\n💳 Payment ID: ${payload.paymentId || "Captured"}\n📅 Date: ${dateFormatted} at ${timeFormatted}\n\nThank you for choosing Medrella Healthcare.`,
          templateName: "payment_receipt",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: payload.amountFormatted || "₹0" },
                { type: "text", text: doctor },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nPayment of ${payload.amountFormatted} was successfully received for consultation ${ref} with ${doctor}.\n\nPayment ID: ${payload.paymentId || "Captured"}\nDate: ${dateFormatted} @ ${timeFormatted}\n\nMedrella Healthcare${footerText}`,
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
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> ${ref}</div>
              </div>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "payment_failed":
      return {
        subject: `Payment Alert: Consultation with ${doctor} (${ref})`,
        sms: `Medrella: Payment failed for consultation ${ref} with ${doctor}. Please visit your patient portal to retry.`,
        whatsapp: {
          bodyText: `*Medrella Payment Alert*\n\nDear ${payload.recipientName},\nWe could not process payment for your consultation ${ref} with *${doctor}*.\nReason: ${payload.failureReason || "Transaction declined or timed out"}.\n\nPlease visit your Medrella patient portal to retry payment.`,
          templateName: "payment_failed",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: doctor },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nThe payment attempt for your consultation with ${doctor} (${ref}) was unsuccessful.\n\nReason: ${payload.failureReason || "Transaction declined or timed out"}.\n\nPlease revisit your appointment portal to complete payment or retry with another payment method.${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #8B261E; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Payment Processing Failed</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>We were unable to process the consultation fee for your appointment with <strong>${doctor}</strong> (${ref}).</p>
              <p style="background: #FFF5F5; border: 1px solid #FEB2B2; padding: 14px; border-radius: 6px; font-size: 13px; color: #9B2C2C;">
                <strong>Reason:</strong> ${payload.failureReason || "Payment was rejected or abandoned by the provider."}
              </p>
              <p>You can sign in to your Medrella patient portal and retry payment before your appointment window.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "refund_requested":
    case "refund_processed":
      return {
        subject: `Refund Processed: ${payload.refundAmountFormatted || "Refund"} for Consultation with ${doctor}`,
        sms: `Medrella: Refund of ${payload.refundAmountFormatted || "fee"} processed for appointment ${ref}. Will reflect in 5-7 business days.`,
        whatsapp: {
          bodyText: `*Medrella Refund Processed*\n\nDear ${payload.recipientName},\nA refund of *${payload.refundAmountFormatted || "the consultation fee"}* has been processed for appointment ${ref} with *${doctor}*.\nPolicy: ${payload.refundReason || "Clinical policy"}\n\nThe refund will credit to your original payment method in 5-7 business days.`,
          templateName: "refund_processed",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: payload.refundAmountFormatted || "Refund" },
                { type: "text", text: doctor },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nA refund of ${payload.refundAmountFormatted || "the consultation fee"} has been successfully processed for your appointment with ${doctor} (${ref}).\n\nReason: ${payload.refundReason || "Cancellation policy"}\n\nThe amount will reflect in your original payment method within 5-7 business days.\n\nMedrella Healthcare${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Refund Processed</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>A refund has been issued for your consultation ${ref}:</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 16px; font-weight: bold; color: #1B3B2B; margin-bottom: 10px;">Refund Amount: ${payload.refundAmountFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Doctor:</strong> ${doctor}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Policy Applied:</strong> ${payload.refundReason || "Clinical Cancellation Policy"}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> ${ref}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Refunds typically take 5 to 7 business days to credit to your bank account or payment provider.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "refund_failed":
      return {
        subject: `Refund Issue Notice: Consultation with ${doctor} (${ref})`,
        sms: `Medrella: An automated refund issue occurred for appointment ${ref}. Our clinic administrative desk is reviewing this for you.`,
        whatsapp: {
          bodyText: `*Medrella Notice*\n\nDear ${payload.recipientName},\nAn automated refund issue occurred for appointment ${ref}. Our clinic administrative desk is reviewing this transaction manually.`,
          templateName: "refund_failed",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nWe encountered an issue while processing your refund for appointment ${ref}.\n\nOur administrative staff has been notified and will review this transaction manually.${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #8B261E; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Refund Processing Notice</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>An automated refund for appointment <strong>${ref}</strong> could not be completed automatically by the payment gateway.</p>
              <p>Our clinic administrative desk has been notified and will assist you directly.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };

    case "appointment_reminder":
    default:
      return {
        subject: `Upcoming Appointment Reminder: ${doctor} on ${dateFormatted}`,
        sms: `Medrella Reminder: Consultation with ${doctor} on ${dateFormatted} at ${timeFormatted}. Ref: ${ref}. Arrive 10m early.`,
        whatsapp: {
          bodyText: `*Medrella Consultation Reminder*\n\nDear ${payload.recipientName},\nReminder: You have an upcoming consultation with *${doctor}* (${specialty}) on ${dateFormatted} at ${timeFormatted}.\n\n🏥 Venue: ${clinic}\n🔖 Ref: ${ref}\n\nPlease arrive 10 minutes early.`,
          templateName: "appointment_reminder",
          templateLanguage: "en",
          templateComponents: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.recipientName },
                { type: "text", text: doctor },
                { type: "text", text: `${dateFormatted} at ${timeFormatted}` },
                { type: "text", text: ref },
              ],
            },
          ],
        },
        text: `Dear ${payload.recipientName},\n\nThis is a friendly reminder of your upcoming consultation with ${doctor} (${specialty}) on ${dateFormatted} at ${timeFormatted}.\n\nClinic: ${clinic}\nAppointment Ref: ${ref}\n\nMedrella Healthcare${footerText}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E5DF; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #1B3B2B; padding: 24px 32px; color: #FAF8F5;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8FA89B;">Clinical Reminder</span>
              <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Upcoming Consultation Reminder</h1>
            </div>
            <div style="padding: 32px; color: #2D3748; line-height: 1.6;">
              <p>Dear <strong>${payload.recipientName}</strong>,</p>
              <p>This is a reminder that your consultation is scheduled soon (${payload.reminderType || "upcoming"}):</p>
              <div style="background: #FAF8F5; border: 1px solid #E8E5DF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Specialist:</strong> ${doctor} (${specialty})</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Date:</strong> ${dateFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Time:</strong> ${timeFormatted}</div>
                <div style="font-size: 13px; margin-bottom: 6px;"><strong>Venue:</strong> ${clinic}</div>
                <div style="font-size: 13px;"><strong>Appointment Ref:</strong> ${ref}</div>
              </div>
              <p style="font-size: 13px; color: #718096;">Please arrive 10 minutes prior to your time window. If you are experiencing an acute emergency, please contact your local emergency services.</p>
            </div>
            ${footerHtml}
          </div>
        `,
      };
  }
}
