"use server";

import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth/session";
import { updatePatientProfileSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { ActionResult } from "./auth.actions";

export async function updatePatientProfileAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const sessionPatient = await requirePatient();

    const rawData = {
      full_name: (formData.get("full_name") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      date_of_birth: (formData.get("date_of_birth") as string)?.trim() || undefined,
      gender: (formData.get("gender") as string)?.trim() || undefined,
      address: (formData.get("address") as string)?.trim() || undefined,
    };

    const validated = updatePatientProfileSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    await db.updatePatient(sessionPatient.patient_id, validated.data);

    revalidatePath("/patient/profile");
    revalidatePath("/patient/dashboard");

    return { success: true, message: "Profile updated successfully!" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}
