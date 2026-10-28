"use server";

import { db } from "@/lib/db";
import {
  getSession,
  requireUser,
  requireDoctor,
  requirePatient,
  requireAdmin,
} from "@/lib/auth/session";
import {
  addToWaitingQueueSchema,
  updateWaitingQueueStatusSchema,
  earlyOfferActionSchema,
  completeConsultationSchema,
} from "@/lib/validations/schemas";
import {
  WaitingQueueStatus,
  WaitingQueueEntry,
  EarlySlotOffer,
  InAppNotification,
  Appointment,
} from "@/types/database";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * 1. Doctor Completes Consultation & Early Slot Detection
 * Authenticated to attending doctor only.
 */
export async function completeConsultationAction(
  appointmentId: number
): Promise<ActionResult<{ appointment: Appointment; earlySlotOffered: boolean; offer?: EarlySlotOffer }>> {
  try {
    const doctorSession = await requireDoctor();

    const validated = completeConsultationSchema.safeParse({
      appointment_id: appointmentId,
    });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid appointment ID.",
      };
    }

    const result = await db.completeConsultationAndCheckEarlyOffer(
      validated.data.appointment_id,
      doctorSession.user_id
    );

    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/appointments");
    revalidatePath("/patient/dashboard");
    revalidatePath("/reception/dashboard");

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to complete consultation.",
    };
  }
}

/**
 * 2. Get Active Early Slot Offer for Logged-In Patient
 */
export async function getActivePatientOfferAction(): Promise<
  ActionResult<EarlySlotOffer | null>
> {
  try {
    const patientSession = await requirePatient();
    const offer = await db.getActiveOfferForPatient(patientSession.patient_id);
    return {
      success: true,
      data: offer,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to check early slot offers.",
    };
  }
}

/**
 * 3. Patient Accepts Early Slot Offer (Atomic Concurrency-Safe)
 */
export async function acceptEarlyOfferAction(
  offerId: number
): Promise<ActionResult<{ appointment: Appointment; offer: EarlySlotOffer }>> {
  try {
    const patientSession = await requirePatient();

    const validated = earlyOfferActionSchema.safeParse({ offer_id: offerId });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid offer ID.",
      };
    }

    const result = await db.acceptEarlySlotOfferAtomic(
      validated.data.offer_id,
      patientSession.user_id
    );

    revalidatePath("/patient/dashboard");
    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/dashboard");
    revalidatePath("/reception/dashboard");

    return {
      success: true,
      message: "Earlier appointment slot reserved successfully!",
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to accept earlier slot offer.",
    };
  }
}

/**
 * 4. Patient Declines Early Slot Offer
 */
export async function declineEarlyOfferAction(
  offerId: number
): Promise<ActionResult<void>> {
  try {
    const patientSession = await requirePatient();

    const validated = earlyOfferActionSchema.safeParse({ offer_id: offerId });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid offer ID.",
      };
    }

    await db.declineEarlySlotOffer(validated.data.offer_id, patientSession.user_id);

    revalidatePath("/patient/dashboard");
    revalidatePath("/reception/dashboard");

    return {
      success: true,
      message: "Offer declined. The slot will be offered to the next patient.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to decline offer.",
    };
  }
}

/**
 * 5. Reception Staff Adds Walk-in Patient to Waiting Queue
 */
export async function addToWaitingQueueAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<WaitingQueueEntry>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "doctor")) {
      return {
        success: false,
        error: "Access Denied: Only reception staff or clinic admins can add to waiting queue.",
      };
    }

    const rawData = {
      doctor_id: formData.get("doctor_id"),
      patient_id: formData.get("patient_id") || null,
      patient_name: formData.get("patient_name"),
      patient_phone: formData.get("patient_phone"),
      notes: formData.get("notes") || undefined,
    };

    const validated = addToWaitingQueueSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid input data.",
      };
    }

    const entry = await db.addToWaitingQueue({
      doctorId: validated.data.doctor_id,
      patientId: validated.data.patient_id,
      patientName: validated.data.patient_name,
      patientPhone: validated.data.patient_phone,
      notes: validated.data.notes,
    });

    revalidatePath("/reception/dashboard");
    revalidatePath("/doctor/dashboard");

    return {
      success: true,
      message: `Patient ${entry.patient_name} added to waiting queue successfully.`,
      data: entry,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to add patient to waiting queue.",
    };
  }
}

/**
 * 6. Reception Staff Updates Waiting Queue Status
 */
export async function updateWaitingQueueStatusAction(
  queueId: number,
  status: WaitingQueueStatus
): Promise<ActionResult<WaitingQueueEntry>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "doctor")) {
      return {
        success: false,
        error: "Access Denied: Reception or doctor authorization required.",
      };
    }

    const validated = updateWaitingQueueStatusSchema.safeParse({
      queue_id: queueId,
      status,
    });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid status update.",
      };
    }

    const updated = await db.updateWaitingQueueStatus(
      validated.data.queue_id,
      validated.data.status
    );

    revalidatePath("/reception/dashboard");
    revalidatePath("/doctor/dashboard");

    return {
      success: true,
      message: `Waiting queue status updated to ${status}.`,
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update waiting queue status.",
    };
  }
}

/**
 * 7. Get Waiting Queue for Reception/Doctor
 */
export async function getWaitingQueueAction(
  doctorId?: number,
  status?: WaitingQueueStatus
): Promise<ActionResult<WaitingQueueEntry[]>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const queue = await db.getWaitingQueue(doctorId, status);
    return {
      success: true,
      data: queue,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to retrieve waiting queue.",
    };
  }
}

/**
 * 8. Get In-App Notifications for Current User
 */
export async function getMyNotificationsAction(): Promise<
  ActionResult<InAppNotification[]>
> {
  try {
    const user = await requireUser();
    const notifications = await db.getNotificationsForUser(user.user_id);
    return {
      success: true,
      data: notifications,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to retrieve notifications.",
    };
  }
}

/**
 * 9. Mark In-App Notification as Read
 */
export async function markNotificationReadAction(
  notificationId: number
): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    await db.markNotificationRead(notificationId, user.user_id);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to mark notification as read.",
    };
  }
}

/**
 * 10. Get All Early Slot Offers (Reception / Staff Audit)
 */
export async function getAllEarlyOffersAction(): Promise<
  ActionResult<EarlySlotOffer[]>
> {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Reception privileges required." };
    }

    const offers = await db.getAllOffers();
    return {
      success: true,
      data: offers,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to fetch early offers.",
    };
  }
}
