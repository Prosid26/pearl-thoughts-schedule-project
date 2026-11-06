"use server";

import { db } from "@/lib/db";
import { requireReceptionist } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  receptionistBookAppointmentSchema,
  receptionistRegisterPatientSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validations/schemas";
import {
  sendClinicalNotification,
  scheduleAppointmentReminders,
  rescheduleAppointmentReminders,
  cancelAppointmentReminders,
} from "@/lib/notifications";
import { calculateEligibleRefund, getPaymentProvider } from "@/lib/payments";
import { revalidatePath } from "next/cache";
import { ActionResult } from "./auth.actions";
import { Appointment, Patient } from "@/types/database";

export async function receptionistBookAppointmentAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ appointment: Appointment }>> {
  try {
    const session = await requireReceptionist();

    const rawData = {
      patient_id: formData.get("patient_id"),
      doctor_id: formData.get("doctor_id"),
      availability_id: formData.get("availability_id"),
      slot_time: formData.get("slot_time") || undefined,
      reason: formData.get("reason"),
    };

    const validated = receptionistBookAppointmentSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { patient_id, doctor_id, availability_id, slot_time, reason } = validated.data;

    // Strict clinic scoping: verify target doctor belongs to receptionist's clinic
    const doctor = await db.getDoctorById(doctor_id);
    if (!doctor) {
      return { success: false, error: "Consulting doctor record not found." };
    }
    if (doctor.clinic_id !== session.clinic_id) {
      return {
        success: false,
        error: "Unauthorized: Receptionists can only book appointments for doctors within their assigned clinic.",
      };
    }

    const appointment = await db.bookAppointmentAtomic({
      patientId: patient_id,
      doctorId: doctor_id,
      availabilityId: availability_id,
      reason,
      slotTime: slot_time,
      bookedByUserId: session.user_id,
      bookedByRole: "receptionist",
    });

    // Schedule notifications and reminders asynchronously
    try {
      const patient = await db.getPatientById(patient_id);
      if (patient) {
        await scheduleAppointmentReminders(appointment.appointment_id);
        await sendClinicalNotification("booking_confirmed", {
          recipientEmail: patient.user?.email || "",
          recipientPhone: patient.user?.phone || "",
          recipientName: patient.user?.full_name || "Valued Patient",
          userId: patient.user_id,
          appointmentId: appointment.appointment_id,
          doctorName: doctor.user?.full_name || "Doctor",
          specialization: doctor.specialization,
          appointmentDate: appointment.appointment_date,
          appointmentTimeStr: appointment.estimated_consult_time || slot_time || "Scheduled Time",
        });
      }
    } catch (notifErr) {
      console.warn("Receptionist booking notification scheduling warning:", notifErr);
    }

    revalidatePath("/reception/workspace");
    revalidatePath(`/doctors/${doctor_id}`);

    return {
      success: true,
      message: `Appointment #${appointment.appointment_id} booked successfully on behalf of patient.`,
      data: { appointment },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to book appointment.";
    return { success: false, error: message };
  }
}

export async function receptionistCancelAppointmentAction(
  appointmentId: number,
  reason?: string
): Promise<ActionResult> {
  try {
    const session = await requireReceptionist();

    const app = await db.getAppointmentById(appointmentId);
    if (!app) {
      return { success: false, error: "Appointment not found." };
    }

    const doctor = await db.getDoctorById(app.doctor_id);
    if (!doctor || doctor.clinic_id !== session.clinic_id) {
      return {
        success: false,
        error: "Unauthorized: Receptionists can only cancel appointments for doctors within their assigned clinic.",
      };
    }

    // Full clinic cancellation refund (receptionist cancellation is clinic-initiated)
    const capturedPayment = app.payments?.find(
      (p) => p.status === "captured" || (p.status as string) === "completed"
    );
    if (capturedPayment) {
      const refundDecision = calculateEligibleRefund({
        appointmentDate: app.appointment_date,
        cancelledByRole: "receptionist",
        capturedAmount: capturedPayment.amount,
        alreadyRefundedAmount: 0,
      });

      if (refundDecision.canRefund && refundDecision.eligibleAmount > 0) {
        try {
          const provider = getPaymentProvider();
          const refundIdempotencyKey = `rec_cancel_rfnd_${capturedPayment.payment_id}_${Date.now()}`;
          const providerRefund = await provider.createRefund({
            paymentId: capturedPayment.provider_payment_id || capturedPayment.provider_order_id,
            amount: refundDecision.eligibleAmount,
            reason: refundDecision.reason,
            idempotencyKey: refundIdempotencyKey,
          });

          await db.createRefundRecord({
            paymentId: capturedPayment.payment_id,
            appointmentId,
            amount: refundDecision.eligibleAmount,
            currency: capturedPayment.currency,
            reason: refundDecision.reason,
            policyApplied: refundDecision.policyApplied,
            provider: provider.name,
            providerRefundId: providerRefund.refundId,
            idempotencyKey: refundIdempotencyKey,
            status: "processed",
          });
        } catch (refundErr) {
          console.warn("Receptionist cancellation refund warning:", refundErr);
        }
      }
    }

    await db.updateAppointmentStatus({
      appointmentId,
      newStatus: "cancelled",
      requesterUserId: session.user_id,
      requesterRole: "receptionist",
    });

    cancelAppointmentReminders(appointmentId);

    revalidatePath("/reception/workspace");
    revalidatePath(`/doctors/${app.doctor_id}`);

    return {
      success: true,
      message: "Appointment has been successfully cancelled and slot capacity restored.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel appointment.";
    return { success: false, error: message };
  }
}

export async function receptionistRescheduleAppointmentAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ appointment: Appointment }>> {
  try {
    const session = await requireReceptionist();

    const rawData = {
      appointment_id: formData.get("appointment_id"),
      new_availability_id: formData.get("new_availability_id"),
      new_slot_time: formData.get("new_slot_time") || undefined,
      reason: formData.get("reason") || undefined,
    };

    const validated = rescheduleAppointmentSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { appointment_id, new_availability_id, new_slot_time, reason } = validated.data;

    const app = await db.getAppointmentById(appointment_id);
    if (!app) {
      return { success: false, error: "Appointment not found." };
    }

    const doctor = await db.getDoctorById(app.doctor_id);
    if (!doctor || doctor.clinic_id !== session.clinic_id) {
      return {
        success: false,
        error: "Unauthorized: Receptionists can only reschedule appointments for doctors within their assigned clinic.",
      };
    }

    const updatedApp = await db.rescheduleAppointmentAtomic({
      appointmentId: appointment_id,
      newAvailabilityId: new_availability_id,
      newSlotTime: new_slot_time,
      reason,
      requesterUserId: session.user_id,
      requesterRole: "receptionist",
    });

    try {
      await rescheduleAppointmentReminders(updatedApp.appointment_id);
    } catch (notifErr) {
      console.warn("Receptionist reschedule reminder warning:", notifErr);
    }

    revalidatePath("/reception/workspace");
    revalidatePath(`/doctors/${app.doctor_id}`);

    return {
      success: true,
      message: `Appointment #${appointment_id} successfully rescheduled.`,
      data: { appointment: updatedApp },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to reschedule appointment.";
    return { success: false, error: message };
  }
}

export async function receptionistSearchPatientsAction(
  query: string
): Promise<ActionResult<{ patients: Patient[] }>> {
  try {
    await requireReceptionist();
    const patients = await db.getPatients(query);
    return { success: true, data: { patients } };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to search patients.";
    return { success: false, error: message };
  }
}

export async function receptionistRegisterPatientAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ patient: Patient }>> {
  try {
    await requireReceptionist();

    const rawData = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      date_of_birth: formData.get("date_of_birth") || undefined,
      gender: formData.get("gender") || undefined,
      address: formData.get("address") || undefined,
    };

    const validated = receptionistRegisterPatientSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { full_name, email, phone, date_of_birth, gender, address } = validated.data;

    let user = await db.getUserByEmail(email);
    let patient: Patient | null = null;

    if (user) {
      patient = await db.getPatientByUserId(user.user_id);
      if (!patient) {
        patient = await db.createPatient(user.user_id, date_of_birth, gender, address);
      }
    } else {
      const defaultPassword = "Password123!";
      const passwordHash = await hashPassword(defaultPassword);
      user = await db.createUser(full_name, email, phone, passwordHash, "patient");
      patient = await db.createPatient(user.user_id, date_of_birth, gender, address);
    }

    revalidatePath("/reception/workspace");
    return {
      success: true,
      message: `Patient ${full_name} registered successfully.`,
      data: { patient },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to register patient.";
    return { success: false, error: message };
  }
}
