"use server";

import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth/session";
import {
  addAvailabilitySchema,
  updateDoctorProfileSchema,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { ActionResult } from "./auth.actions";

export async function addDoctorAvailabilityAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();

    const rawData = {
      available_date: formData.get("available_date"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      slot_duration: formData.get("slot_duration") || 30,
    };

    const validated = addAvailabilitySchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid availability parameters.",
      };
    }

    const { available_date, start_time, end_time, slot_duration } =
      validated.data;

    await db.addAvailabilitySlot(
      sessionDoctor.doctor_id,
      available_date,
      start_time,
      end_time,
      slot_duration
    );

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return {
      success: true,
      message: `Availability slot added for ${available_date} at ${start_time}.`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to add availability.";
    return { success: false, error: message };
  }
}

export async function deleteDoctorAvailabilityAction(
  availabilityId: number
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();

    await db.deleteAvailabilitySlot(availabilityId, sessionDoctor.doctor_id);

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);

    return { success: true, message: "Slot successfully removed." };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to remove slot.";
    return { success: false, error: message };
  }
}

export async function updateDoctorProfileAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();

    const rawData = {
      full_name: formData.get("full_name") || undefined,
      specialization: formData.get("specialization") || undefined,
      qualification: formData.get("qualification") || undefined,
      experience_years: formData.get("experience_years") || undefined,
      consultation_fee: formData.get("consultation_fee") || undefined,
      bio: formData.get("bio") || undefined,
      clinic_address: formData.get("clinic_address") || undefined,
    };

    const validated = updateDoctorProfileSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    await db.updateDoctor(sessionDoctor.doctor_id, validated.data);

    revalidatePath("/doctor/profile");
    revalidatePath("/doctor/dashboard");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return { success: true, message: "Doctor profile updated successfully!" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}
