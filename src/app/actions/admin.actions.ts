"use server";

import { db } from "@/lib/db";
import { requireAdmin, createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  createReceptionistInvitationSchema,
  acceptReceptionistInvitationSchema,
  updateReceptionistClinicSchema,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { ActionResult } from "./auth.actions";

export async function createReceptionistInvitationAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ invitationUrl: string; rawToken: string }>> {
  try {
    const admin = await requireAdmin();

    const rawData = {
      clinic_id: formData.get("clinic_id"),
      email: formData.get("email"),
    };

    const validated = createReceptionistInvitationSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { clinic_id, email } = validated.data;
    const { invitation, rawToken } = await db.createReceptionistInvitation({
      clinicId: clinic_id,
      email,
      invitedByUserId: admin.user_id,
    });

    const invitationUrl = `/auth/receptionist-invite?token=${rawToken}`;

    revalidatePath("/admin/dashboard");
    return {
      success: true,
      message: `Invitation successfully generated for ${email}.`,
      data: { invitationUrl, rawToken },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create receptionist invitation.";
    return { success: false, error: message };
  }
}

export async function revokeReceptionistInvitationAction(
  invitationId: number
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await db.revokeReceptionistInvitation(invitationId);
    revalidatePath("/admin/dashboard");
    return {
      success: true,
      message: "Invitation has been revoked.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}

export async function updateReceptionistClinicAssignmentAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const rawData = {
      receptionist_id: formData.get("receptionist_id"),
      clinic_id: formData.get("clinic_id"),
    };

    const validated = updateReceptionistClinicSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    await db.updateReceptionistClinic(
      validated.data.receptionist_id,
      validated.data.clinic_id
    );

    revalidatePath("/admin/dashboard");
    revalidatePath("/reception/workspace");

    return {
      success: true,
      message: "Receptionist clinic assignment successfully updated.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update clinic assignment.";
    return { success: false, error: message };
  }
}

export async function acceptReceptionistInvitationAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      token: formData.get("token"),
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
      password: formData.get("password"),
    };

    const validated = acceptReceptionistInvitationSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const { token, full_name, phone, password } = validated.data;
    const passwordHash = await hashPassword(password);

    const { user, receptionist } = await db.acceptReceptionistInvitation({
      rawToken: token,
      fullName: full_name,
      phone,
      passwordHash,
    });

    // Auto-login receptionist into new session
    await createSession({
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: "receptionist",
      receptionist_id: receptionist.receptionist_id,
      clinic_id: receptionist.clinic_id,
      patient_id: null,
      doctor_id: null,
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Welcome to Medrella, ${user.full_name}! Your receptionist profile is now active.`,
      data: { role: "receptionist" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to complete onboarding.";
    return { success: false, error: message };
  }
}

