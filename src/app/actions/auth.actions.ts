"use server";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import {
  signInSchema,
  patientRegistrationSchema,
  doctorProvisioningSchema,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

const DOCTOR_PROVISIONING_SECRET =
  process.env.DOCTOR_PROVISIONING_SECRET || "MEDRELLA_CLINIC_ADMIN_2026";

export async function signInAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validated = signInSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid input data",
      };
    }

    const { email, password } = validated.data;
    const user = await db.getUserByEmail(email);
    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return { success: false, error: "Invalid email or password." };
    }

    let patientId: number | null = null;
    let doctorId: number | null = null;

    if (user.role === "patient") {
      const patient = await db.getPatientByUserId(user.user_id);
      patientId = patient ? patient.patient_id : null;
    } else if (user.role === "doctor") {
      const doctor = await db.getDoctorByUserId(user.user_id);
      doctorId = doctor ? doctor.doctor_id : null;
    }

    await createSession({
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      patient_id: patientId,
      doctor_id: doctorId,
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      data: { role: user.role },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign-in failed.";
    return { success: false, error: message };
  }
}

export async function signUpPatientAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      date_of_birth: formData.get("date_of_birth") || undefined,
      gender: formData.get("gender") || undefined,
      address: formData.get("address") || undefined,
    };

    const validated = patientRegistrationSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const {
      full_name,
      email,
      phone,
      password,
      date_of_birth,
      gender,
      address,
    } = validated.data;

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db.createUser(
      full_name,
      email,
      phone,
      passwordHash,
      "patient"
    );

    const newPatient = await db.createPatient(
      newUser.user_id,
      date_of_birth,
      gender,
      address
    );

    await createSession({
      user_id: newUser.user_id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: "patient",
      patient_id: newPatient.patient_id,
      doctor_id: null,
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Patient account registered successfully!",
      data: { role: "patient" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to register account.";
    return { success: false, error: message };
  }
}

export async function provisionDoctorAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = {
      provision_key: formData.get("provision_key"),
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      specialization: formData.get("specialization"),
      qualification: formData.get("qualification"),
      experience_years: formData.get("experience_years"),
      consultation_fee: formData.get("consultation_fee"),
      bio: formData.get("bio") || undefined,
      clinic_address: formData.get("clinic_address") || undefined,
    };

    const validated = doctorProvisioningSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    const data = validated.data;
    if (data.provision_key !== DOCTOR_PROVISIONING_SECRET) {
      return {
        success: false,
        error:
          "Invalid Clinic Authorization Key. Doctor accounts can only be provisioned with authorized credentials.",
      };
    }

    const existingUser = await db.getUserByEmail(data.email);
    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const passwordHash = await hashPassword(data.password);
    const newUser = await db.createUser(
      data.full_name,
      data.email,
      data.phone,
      passwordHash,
      "doctor"
    );

    const newDoctor = await db.createDoctor(
      newUser.user_id,
      data.specialization,
      data.qualification,
      data.experience_years,
      data.consultation_fee,
      data.bio,
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
      data.clinic_address
    );

    await createSession({
      user_id: newUser.user_id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: "doctor",
      patient_id: null,
      doctor_id: newDoctor.doctor_id,
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Doctor profile provisioned successfully!",
      data: { role: "doctor" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to provision doctor.";
    return { success: false, error: message };
  }
}

export async function signOutAction(): Promise<ActionResult> {
  await destroySession();
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getCurrentUserAction() {
  return await getSession();
}
