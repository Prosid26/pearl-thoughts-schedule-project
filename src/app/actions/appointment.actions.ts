"use server";

import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth/session";
import {
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validations/schemas";
import { AppointmentStatus, Availability } from "@/types/database";
import {
  sendClinicalNotification,
  scheduleAppointmentReminders,
  rescheduleAppointmentReminders,
  cancelAppointmentReminders,
} from "@/lib/notifications";
import { getPaymentProvider, calculateEligibleRefund } from "@/lib/payments";
import { formatINR } from "@/lib/utils/currency";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export async function bookAppointmentAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ appointmentId: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: "You must be signed in as a patient to book an appointment.",
      };
    }

    if (session.role !== "patient" || !session.patient_id) {
      return {
        success: false,
        error:
          "Doctor and administrative accounts cannot book patient appointments.",
      };
    }

    const rawData = {
      doctor_id: formData.get("doctor_id"),
      availability_id: formData.get("availability_id"),
      reason: formData.get("reason"),
    };

    const validated = bookAppointmentSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { doctor_id, availability_id, reason } = validated.data;

    // Atomic server-side booking execution
    const appointment = await db.bookAppointmentAtomic({
      patientId: session.patient_id,
      doctorId: doctor_id,
      availabilityId: availability_id,
      reason,
    });

    // Send booking confirmation notifications (Patient + Doctor)
    const appTime = appointment.availability
      ? `${appointment.availability.start_time.slice(0, 5)} – ${appointment.availability.end_time.slice(0, 5)} IST`
      : "Scheduled Window";
    const bookingRef = `#APT-${String(appointment.appointment_id).padStart(5, "0")}`;

    // 1. Notify Patient
    if (session.email) {
      sendClinicalNotification("booking_confirmed", {
        recipientEmail: session.email,
        recipientPhone: appointment.patient?.user?.phone,
        recipientName: session.full_name,
        userId: session.user_id,
        appointmentId: appointment.appointment_id,
        bookingRef,
        doctorName: appointment.doctor?.user?.full_name || "Doctor",
        specialization: appointment.doctor?.specialization || "Specialist",
        appointmentDate: appointment.appointment_date,
        appointmentTimeStr: appTime,
        clinicAddress: appointment.doctor?.clinic_address,
        paymentStatus: appointment.payment_status || "unpaid",
        idempotencyKey: `notif_book_${appointment.appointment_id}`,
      }).catch((err) => console.warn("Async booking notif error:", err));
    }

    // 2. Notify Assigned Doctor
    const doctorUser = appointment.doctor?.user;
    if (doctorUser?.email) {
      sendClinicalNotification("doctor_booking_alert", {
        recipientEmail: doctorUser.email,
        recipientPhone: doctorUser.phone,
        recipientName: doctorUser.full_name || "Doctor",
        userId: appointment.doctor?.user_id || 0,
        appointmentId: appointment.appointment_id,
        bookingRef,
        doctorName: doctorUser.full_name || "Doctor",
        patientName: session.full_name,
        patientPhone: appointment.patient?.user?.phone,
        specialization: appointment.doctor?.specialization || "Specialist",
        appointmentDate: appointment.appointment_date,
        appointmentTimeStr: appTime,
        clinicAddress: appointment.doctor?.clinic_address,
        customNotes: reason,
        idempotencyKey: `notif_doc_book_${appointment.appointment_id}`,
      }).catch((err) => console.warn("Async doc booking alert error:", err));
    }

    // Schedule reminders
    scheduleAppointmentReminders(appointment.appointment_id).catch((err) =>
      console.warn("Async reminder schedule error:", err)
    );

    // Revalidate affected views
    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/appointments");
    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${doctor_id}`);
    revalidatePath("/doctors");

    return {
      success: true,
      message: "Appointment booked successfully!",
      data: { appointmentId: appointment.appointment_id },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to complete appointment booking.";
    return { success: false, error: message };
  }
}

export async function updateAppointmentStatusAction(
  appointmentId: number,
  newStatus: AppointmentStatus
): Promise<ActionResult> {
  try {
    const session = await requireUser();

    const validated = updateAppointmentStatusSchema.safeParse({
      appointment_id: appointmentId,
      status: newStatus,
    });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid status transition.",
      };
    }

    const appBefore = await db.getAppointmentById(appointmentId);

    const updatedApp = await db.updateAppointmentStatus({
      appointmentId,
      newStatus,
      requesterUserId: session.user_id,
      requesterRole: session.role,
    });

    // Cancellation Workflow: Reminders, Refund Evaluation & Notifications
    if (newStatus === "cancelled" || newStatus === "rejected") {
      // 1. Cancel background reminders
      await cancelAppointmentReminders(appointmentId).catch((err) =>
        console.warn("Error cancelling reminders:", err)
      );

      // 2. Evaluate refund under clinical policy if payment was made
      let refundOutcome: {
        refundInitiated: boolean;
        amount: number;
        policyApplied: string;
      } | null = null;

      const payments = await db.getPaymentsForAppointment(appointmentId);
      const capturedPayment = payments.find((p) => p.status === "captured");

      if (capturedPayment) {
        const existingRefunds = await db.getRefundsForPayment(
          capturedPayment.payment_id
        );
        const alreadyRefunded = existingRefunds
          .filter((r) => r.status !== "failed")
          .reduce((sum, r) => sum + r.amount, 0);

        const policyResult = calculateEligibleRefund({
          appointmentDate: appBefore?.appointment_date || updatedApp.appointment_date,
          cancelledByRole: session.role,
          capturedAmount: capturedPayment.amount,
          alreadyRefundedAmount: alreadyRefunded,
        });

        if (policyResult.canRefund && policyResult.eligibleAmount > 0) {
          const provider = getPaymentProvider();
          const refundIdempotencyKey = `cancel_rfnd_${capturedPayment.payment_id}_${Date.now()}`;

          try {
            const providerRefund = await provider.createRefund({
              paymentId:
                capturedPayment.provider_payment_id ||
                capturedPayment.provider_order_id,
              amount: policyResult.eligibleAmount,
              reason: policyResult.reason,
              idempotencyKey: refundIdempotencyKey,
            });

            await db.createRefundRecord({
              paymentId: capturedPayment.payment_id,
              appointmentId,
              amount: policyResult.eligibleAmount,
              currency: capturedPayment.currency,
              reason: policyResult.reason,
              policyApplied: policyResult.policyApplied,
              provider: provider.name,
              providerRefundId: providerRefund.refundId,
              idempotencyKey: refundIdempotencyKey,
              status: "processed",
            });

            refundOutcome = {
              refundInitiated: true,
              amount: policyResult.eligibleAmount,
              policyApplied: policyResult.policyApplied,
            };
          } catch (providerErr: unknown) {
            console.error("Provider refund failed during cancellation:", providerErr);
            // Record failure without reverting appointment cancellation (Separation of cancellation from refund)
            await db.createRefundRecord({
              paymentId: capturedPayment.payment_id,
              appointmentId,
              amount: policyResult.eligibleAmount,
              currency: capturedPayment.currency,
              reason: policyResult.reason,
              policyApplied: policyResult.policyApplied,
              provider: provider.name,
              idempotencyKey: refundIdempotencyKey,
              status: "failed",
              errorMessage:
                providerErr instanceof Error
                  ? providerErr.message
                  : "Gateway refund failed",
            });
          }
        }
      }

      // 3. Dispatch Cancellation Notifications (Patient + Doctor)
      const bookingRef = `#APT-${String(updatedApp.appointment_id).padStart(5, "0")}`;
      const appTimeStr = updatedApp.availability
        ? `${updatedApp.availability.start_time.slice(0, 5)} – ${updatedApp.availability.end_time.slice(0, 5)} IST`
        : "";

      // 3a. Notify Patient
      const patientUser = updatedApp.patient?.user;
      if (patientUser?.email) {
        sendClinicalNotification("appointment_cancelled", {
          recipientEmail: patientUser.email,
          recipientPhone: patientUser.phone,
          recipientName: patientUser.full_name || "Patient",
          userId: updatedApp.patient?.user_id || updatedApp.patient_id,
          appointmentId: updatedApp.appointment_id,
          bookingRef,
          doctorName: updatedApp.doctor?.user?.full_name || "Doctor",
          specialization: updatedApp.doctor?.specialization || "Specialist",
          appointmentDate: updatedApp.appointment_date,
          appointmentTimeStr: appTimeStr,
          refundAmountFormatted: refundOutcome
            ? formatINR(refundOutcome.amount / 100)
            : undefined,
          refundReason: refundOutcome?.policyApplied,
          cancellationReason:
            session.role === "doctor"
              ? "Cancelled by doctor"
              : "Cancelled by patient",
          cancelledBy: session.role === "doctor" ? "doctor" : "patient",
          idempotencyKey: `notif_cancel_${updatedApp.appointment_id}`,
        }).catch((err) => console.warn("Async cancel notif error:", err));
      }

      // 3b. Notify Assigned Doctor
      const doctorUser = updatedApp.doctor?.user;
      if (doctorUser?.email) {
        sendClinicalNotification("doctor_cancellation_alert", {
          recipientEmail: doctorUser.email,
          recipientPhone: doctorUser.phone,
          recipientName: doctorUser.full_name || "Doctor",
          userId: updatedApp.doctor?.user_id || 0,
          appointmentId: updatedApp.appointment_id,
          bookingRef,
          doctorName: doctorUser.full_name || "Doctor",
          patientName: patientUser?.full_name || "Patient",
          specialization: updatedApp.doctor?.specialization || "Specialist",
          appointmentDate: updatedApp.appointment_date,
          appointmentTimeStr: appTimeStr,
          cancellationReason:
            session.role === "doctor"
              ? "Cancelled by doctor"
              : "Cancelled by patient",
          cancelledBy: session.role === "doctor" ? "doctor" : "patient",
          idempotencyKey: `notif_doc_cancel_${updatedApp.appointment_id}`,
        }).catch((err) => console.warn("Async doc cancel alert error:", err));
      }
    }

    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/appointments");
    revalidatePath("/patient/dashboard");
    revalidatePath("/patient/appointments");

    return {
      success: true,
      message: `Appointment status updated to ${newStatus}.`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update status.";
    return { success: false, error: message };
  }
}

export async function cancelAppointmentAction(
  appointmentId: number
): Promise<ActionResult> {
  return updateAppointmentStatusAction(appointmentId, "cancelled");
}

export async function rescheduleAppointmentAction(
  appointmentId: number,
  newAvailabilityId: number,
  reason?: string
): Promise<ActionResult<{ appointmentId: number }>> {
  try {
    const session = await requireUser();

    const validated = rescheduleAppointmentSchema.safeParse({
      appointment_id: appointmentId,
      new_availability_id: newAvailabilityId,
      reason,
    });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    // Retrieve original appointment details to capture previous time window for notifications
    const originalApp = await db.getAppointmentById(appointmentId);
    const prevDate = originalApp?.appointment_date;
    const prevTimeStr = originalApp?.availability
      ? `${originalApp.availability.start_time.slice(0, 5)} – ${originalApp.availability.end_time.slice(0, 5)} IST`
      : "";

    const updated = await db.rescheduleAppointmentAtomic({
      appointmentId,
      newAvailabilityId,
      reason,
      requesterUserId: session.user_id,
      requesterRole: session.role,
    });

    // Reschedule background reminders
    await rescheduleAppointmentReminders(updated.appointment_id).catch((err) =>
      console.warn("Error rescheduling reminders:", err)
    );

    // Dispatch Rescheduling Notifications (Patient + Doctor)
    const bookingRef = `#APT-${String(updated.appointment_id).padStart(5, "0")}`;
    const newAppTime = updated.availability
      ? `${updated.availability.start_time.slice(0, 5)} – ${updated.availability.end_time.slice(0, 5)} IST`
      : "Scheduled Window";

    // 1. Notify Patient
    const patientUser = updated.patient?.user;
    if (patientUser?.email) {
      sendClinicalNotification("appointment_rescheduled", {
        recipientEmail: patientUser.email,
        recipientPhone: patientUser.phone,
        recipientName: patientUser.full_name || "Patient",
        userId: updated.patient?.user_id || updated.patient_id,
        appointmentId: updated.appointment_id,
        bookingRef,
        doctorName: updated.doctor?.user?.full_name || "Doctor",
        specialization: updated.doctor?.specialization || "Specialist",
        appointmentDate: updated.appointment_date,
        appointmentTimeStr: newAppTime,
        previousDate: prevDate,
        previousTimeStr: prevTimeStr,
        clinicAddress: updated.doctor?.clinic_address,
        idempotencyKey: `notif_resched_${updated.appointment_id}_${Date.now()}`,
      }).catch((err) => console.warn("Async reschedule notif error:", err));
    }

    // 2. Notify Doctor
    const doctorUser = updated.doctor?.user;
    if (doctorUser?.email) {
      sendClinicalNotification("doctor_reschedule_alert", {
        recipientEmail: doctorUser.email,
        recipientPhone: doctorUser.phone,
        recipientName: doctorUser.full_name || "Doctor",
        userId: updated.doctor?.user_id || 0,
        appointmentId: updated.appointment_id,
        bookingRef,
        doctorName: doctorUser.full_name || "Doctor",
        patientName: patientUser?.full_name || "Patient",
        specialization: updated.doctor?.specialization || "Specialist",
        appointmentDate: updated.appointment_date,
        appointmentTimeStr: newAppTime,
        previousDate: prevDate,
        previousTimeStr: prevTimeStr,
        customNotes: reason || "Rescheduled by patient",
        idempotencyKey: `notif_doc_resched_${updated.appointment_id}_${Date.now()}`,
      }).catch((err) => console.warn("Async doc reschedule alert error:", err));
    }

    revalidatePath("/patient/appointments");
    revalidatePath("/patient/dashboard");
    revalidatePath("/doctor/appointments");
    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/availability");
    revalidatePath("/reception/dashboard");
    if (updated.doctor_id) {
      revalidatePath(`/doctors/${updated.doctor_id}`);
    }

    return {
      success: true,
      message: "Appointment successfully rescheduled.",
      data: { appointmentId: updated.appointment_id },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to reschedule appointment.";
    return { success: false, error: message };
  }
}

export async function getDoctorAvailableSlotsAction(
  doctorId: number
): Promise<ActionResult<Availability[]>> {
  try {
    const slots = await db.getDoctorAvailability(doctorId, undefined, true);
    return { success: true, data: slots };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve available slots.";
    return { success: false, error: message };
  }
}
