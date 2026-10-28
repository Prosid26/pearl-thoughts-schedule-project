"use server";

import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth/session";
import {
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validations/schemas";
import { AppointmentStatus, Availability } from "@/types/database";
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

    await db.updateAppointmentStatus({
      appointmentId,
      newStatus,
      requesterUserId: session.user_id,
      requesterRole: session.role,
    });

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

    const updated = await db.rescheduleAppointmentAtomic({
      appointmentId,
      newAvailabilityId,
      reason,
      requesterUserId: session.user_id,
      requesterRole: session.role,
    });

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
