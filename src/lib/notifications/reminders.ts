import { db } from "@/lib/db";
import { sendClinicalNotification } from "./email-service";
import { formatISTDate } from "@/lib/utils/date";

/**
 * Durable Healthcare Appointment Reminder Scheduler
 */
export async function scheduleAppointmentReminders(appointmentId: number): Promise<void> {
  const appointment = await db.getAppointmentById(appointmentId);
  if (!appointment) return;

  const apptTime = new Date(appointment.appointment_date).getTime();

  // 1. 24-hour advance reminder (only if scheduled > 24 hours in future)
  const reminder24hTime = new Date(apptTime - 24 * 60 * 60 * 1000);
  if (reminder24hTime.getTime() > Date.now()) {
    await db.upsertScheduledReminder({
      appointmentId,
      reminderType: "24h_before",
      scheduledFor: reminder24hTime,
    });
  }

  // 2. 2-hour advance reminder (only if scheduled > 2 hours in future)
  const reminder2hTime = new Date(apptTime - 2 * 60 * 60 * 1000);
  if (reminder2hTime.getTime() > Date.now()) {
    await db.upsertScheduledReminder({
      appointmentId,
      reminderType: "2h_before",
      scheduledFor: reminder2hTime,
    });
  }
}

/**
 * Reschedule reminders when an appointment's date/time changes
 */
export async function rescheduleAppointmentReminders(appointmentId: number): Promise<void> {
  // Cancel old pending reminders for this appointment
  await db.cancelRemindersForAppointment(appointmentId);
  // Re-schedule based on new appointment time
  await scheduleAppointmentReminders(appointmentId);
}

/**
 * Cancel reminders when an appointment is cancelled or completed
 */
export async function cancelAppointmentReminders(appointmentId: number): Promise<void> {
  await db.cancelRemindersForAppointment(appointmentId);
}

/**
 * Background / External Scheduled runner: Process and dispatch due reminders idempotently
 */
export async function processDueReminders(options?: {
  batchSize?: number;
}): Promise<{
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  batchSize: number;
  remainingDue: number;
}> {
  const batchSize = options?.batchSize ?? 25;
  const dueReminders = await db.getDueScheduledReminders(batchSize);
  let processedCount = 0;
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const reminder of dueReminders) {
    // 1. Atomic Locking: Claim this reminder to prevent duplicate processing by concurrent requests
    const claimed = await db.claimScheduledReminder(reminder.reminder_id);
    if (!claimed) {
      // Already claimed by another concurrent worker or already processed
      continue;
    }
    processedCount++;

    const appointment = await db.getAppointmentById(reminder.appointment_id);

    // Rule: Do not send appointment reminders for cancelled or completed appointments
    if (
      !appointment ||
      appointment.status === "cancelled" ||
      appointment.status === "completed" ||
      appointment.status === "rejected"
    ) {
      await db.updateReminderStatus(reminder.reminder_id, "cancelled", "Appointment not active");
      skippedCount++;
      continue;
    }

    const patientUser = appointment.patient?.user;
    const patientUserId =
      appointment.patient?.user_id ||
      (await db.getPatientById(appointment.patient_id))?.user_id ||
      appointment.patient_id;

    const appTime = appointment.availability
      ? `${appointment.availability.start_time.slice(0, 5)} – ${appointment.availability.end_time.slice(0, 5)} IST`
      : "Scheduled Window";

    const idempotencyKey = `reminder_${reminder.reminder_id}_${reminder.reminder_type}`;

    // 1. Dispatch Clinical Reminder (handles Email, SMS, WhatsApp & persistent In-App notification)
    const res = await sendClinicalNotification("appointment_reminder", {
      recipientEmail: patientUser?.email || "patient@medrella.com",
      recipientPhone: patientUser?.phone,
      recipientName: patientUser?.full_name || "Patient",
      userId: patientUserId,
      appointmentId: appointment.appointment_id,
      doctorName: appointment.doctor?.user?.full_name || "Doctor",
      specialization: appointment.doctor?.specialization || "Specialist",
      appointmentDate: appointment.appointment_date,
      appointmentTimeStr: appTime,
      clinicAddress: appointment.doctor?.clinic_address,
      reminderType: reminder.reminder_type === "24h_before" ? "24 hours prior" : "2 hours prior",
      idempotencyKey,
    });

    // 2. Also ensure Doctor receives an in-app reminder
    const doctorUserId = appointment.doctor?.user_id;
    if (doctorUserId) {
      const timeDescription = reminder.reminder_type === "24h_before" ? "tomorrow (in 24 hours)" : "in 2 hours";
      await db
        .createInAppNotification({
          userId: doctorUserId,
          title: `Upcoming Consultation: ${patientUser?.full_name || "Patient"}`,
          message: `Consultation reminder: Scheduled ${timeDescription} on ${appointment.appointment_date} (${appTime}) with patient ${patientUser?.full_name || "Patient"}.`,
          category: "reminder",
          appointmentId: appointment.appointment_id,
          actionUrl: "/doctor/appointments",
          idempotencyKey: `${idempotencyKey}_doc_inapp`,
        })
        .catch((e) => console.warn("[DOC-REMINDER-INAPP-FAIL]", e));
    }

    if (res.skipped) {
      await db.updateReminderStatus(
        reminder.reminder_id,
        "cancelled",
        res.skipReason || "Suppressed by current patient notification preferences"
      );
      skippedCount++;
    } else if (res.success) {
      await db.updateReminderStatus(reminder.reminder_id, "sent");
      sentCount++;
    } else {
      // Even if external dispatch failed, in-app notification was recorded
      await db.updateReminderStatus(
        reminder.reminder_id,
        "sent",
        "In-app reminder saved; external dispatch failed: " + res.error
      );
      sentCount++;
    }
  }

  const remainingDue = await db.countDueScheduledReminders();

  return {
    processedCount,
    sentCount,
    skippedCount,
    failedCount,
    batchSize,
    remainingDue,
  };
}
