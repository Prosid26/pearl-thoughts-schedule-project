"use server";

import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth/session";
import {
  addAvailabilitySchema,
  createDoctorScheduleSchema,
  updateDoctorProfileSchema,
  blockDoctorDateSchema,
  unblockDoctorDateSchema,
  modifyDoctorAvailabilityWindowElasticSchema,
  modifyDoctorScheduleElasticSchema,
  previewDoctorScheduleElasticSchema,
} from "@/lib/validations/schemas";
import {
  generateTimeSlots,
  resolveTargetDates,
} from "@/lib/scheduling/slot-generator";
import { revalidatePath } from "next/cache";
import { ActionResult } from "./auth.actions";

export async function createDoctorScheduleAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ addedCount: number; datesCount: number }>> {
  try {
    const sessionDoctor = await requireDoctor();

    // Parse potential JSON or comma-separated weekdays
    let rawWeekdays: number[] | undefined;
    const weekdaysInput = formData.get("weekdays");
    if (weekdaysInput) {
      if (typeof weekdaysInput === "string") {
        try {
          const parsed = JSON.parse(weekdaysInput);
          if (Array.isArray(parsed)) {
            rawWeekdays = parsed.map(Number);
          }
        } catch {
          rawWeekdays = weekdaysInput
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n));
        }
      }
    }

    // Parse potential JSON or comma-separated specific dates
    let rawSpecificDates: string[] | undefined;
    const specificDatesInput = formData.get("specific_dates");
    if (specificDatesInput && typeof specificDatesInput === "string") {
      try {
        const parsed = JSON.parse(specificDatesInput);
        if (Array.isArray(parsed)) {
          rawSpecificDates = parsed;
        }
      } catch {
        rawSpecificDates = specificDatesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    const isOverride =
      formData.get("is_override") === "true" ||
      formData.get("is_override") === "1" ||
      formData.get("is_override") === "on";

    const rawData = {
      schedule_type: formData.get("schedule_type") || "specific_dates",
      scheduling_mode: formData.get("scheduling_mode") || "stream",
      specific_dates: rawSpecificDates,
      weekdays: rawWeekdays,
      start_date: (formData.get("start_date") as string) || undefined,
      end_date: (formData.get("end_date") as string) || undefined,
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      slot_duration: formData.get("slot_duration") || 30,
      capacity: formData.get("capacity") || formData.get("wave_capacity") || 1,
      is_override: isOverride,
    };

    const validated = createDoctorScheduleSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid schedule configuration.",
      };
    }

    const data = validated.data;
    const targetDates = resolveTargetDates({
      scheduleType: data.schedule_type,
      specificDates: Array.isArray(data.specific_dates)
        ? data.specific_dates
        : data.specific_dates
        ? [data.specific_dates]
        : undefined,
      startDate: data.start_date,
      endDate: data.end_date,
      weekdays: Array.isArray(data.weekdays)
        ? (data.weekdays as number[])
        : undefined,
    });

    if (targetDates.length === 0) {
      return {
        success: false,
        error: "No upcoming valid dates matched the selected criteria (past dates are excluded).",
      };
    }

    const res = await db.createDoctorSchedule({
      doctorId: sessionDoctor.doctor_id,
      scheduleType: data.schedule_type,
      schedulingMode: data.scheduling_mode,
      targetDates,
      startTime: data.start_time,
      endTime: data.end_time,
      slotDuration: data.slot_duration,
      capacity: data.capacity,
      isOverride: data.is_override,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    const modeLabel = data.scheduling_mode === "wave" ? "Wave" : "Stream";
    return {
      success: true,
      message: `Published ${res.addedCount} ${modeLabel} window(s) across ${res.datesCount} operating day(s).${
        res.skippedCount > 0 ? ` (${res.skippedCount} pre-existing windows retained)` : ""
      }${
        res.replacedCount > 0 ? ` (${res.replacedCount} pre-existing windows replaced)` : ""
      }`,
      data: {
        addedCount: res.addedCount,
        datesCount: res.datesCount,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create doctor schedule.";
    return { success: false, error: message };
  }
}

export async function addDoctorAvailabilityAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();

    const isOverride =
      formData.get("is_override") === "true" ||
      formData.get("is_override") === "1" ||
      formData.get("is_override") === "on";

    const rawData = {
      available_date: formData.get("available_date"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      slot_duration: formData.get("slot_duration") || 30,
      is_wave: formData.get("is_wave") === "true",
      wave_capacity: formData.get("wave_capacity") || undefined,
    };

    const validated = addAvailabilitySchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Invalid availability parameters.",
      };
    }

    const { available_date, start_time, end_time, slot_duration, is_wave, wave_capacity } =
      validated.data;

    const res = await db.createDoctorSchedule({
      doctorId: sessionDoctor.doctor_id,
      scheduleType: "specific_dates",
      schedulingMode: is_wave ? "wave" : "stream",
      targetDates: [available_date],
      startTime: start_time,
      endTime: end_time,
      slotDuration: slot_duration,
      capacity: wave_capacity || (is_wave ? 3 : 1),
      isOverride: isOverride,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return {
      success: true,
      message: is_wave
        ? `Wave arrival schedule configured for ${available_date} (${wave_capacity || 3} patients/wave).`
        : `Continuous stream availability window configured for ${available_date}.`,
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
      scheduling_mode: formData.get("scheduling_mode") || undefined,
      wave_capacity: formData.get("wave_capacity") || undefined,
      wave_interval_minutes: formData.get("wave_interval_minutes") || undefined,
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
    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return { success: true, message: "Doctor profile updated successfully!" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}

export async function updateDoctorSchedulingPolicyAction(
  schedulingMode: "stream" | "wave",
  waveCapacity?: number,
  waveIntervalMinutes?: number
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();

    await db.updateDoctor(sessionDoctor.doctor_id, {
      scheduling_mode: schedulingMode,
      ...(waveCapacity ? { wave_capacity: waveCapacity } : {}),
      ...(waveIntervalMinutes ? { wave_interval_minutes: waveIntervalMinutes } : {}),
    });

    revalidatePath("/doctor/availability");
    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/profile");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return {
      success: true,
      message: `Practice scheduling mode switched to ${schedulingMode.toUpperCase()} scheduling.`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update scheduling policy.";
    return { success: false, error: message };
  }
}

export async function blockDoctorAvailabilityAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();
    const rawData = {
      doctor_id: sessionDoctor.doctor_id,
      date: formData.get("date"),
      reason: formData.get("reason") || undefined,
    };

    const validated = blockDoctorDateSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    await db.blockDoctorDate({
      doctorId: sessionDoctor.doctor_id,
      date: validated.data.date,
      reason: validated.data.reason,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctor/dashboard");

    return {
      success: true,
      message: `Schedule for ${validated.data.date} has been blocked successfully.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to block schedule date.";
    return { success: false, error: message };
  }
}

export async function unblockDoctorAvailabilityAction(
  date: string
): Promise<ActionResult> {
  try {
    const sessionDoctor = await requireDoctor();
    const validated = unblockDoctorDateSchema.safeParse({
      doctor_id: sessionDoctor.doctor_id,
      date,
    });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed.",
      };
    }

    await db.unblockDoctorDate({
      doctorId: sessionDoctor.doctor_id,
      date: validated.data.date,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctor/dashboard");

    return {
      success: true,
      message: `Schedule for ${date} has been unblocked.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to unblock schedule date.";
    return { success: false, error: message };
  }
}

export async function modifyDoctorAvailabilityWindowElasticAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{
  addedSlotsCount: number;
  removedSlotsCount: number;
  flaggedAppointmentsCount: number;
}>> {
  try {
    const sessionDoctor = await requireDoctor();

    const rawData = {
      availability_id: formData.get("availability_id"),
      new_start_time: formData.get("new_start_time"),
      new_end_time: formData.get("new_end_time"),
      slot_duration: formData.get("slot_duration") || undefined,
      capacity: formData.get("capacity") || undefined,
    };

    const validated = modifyDoctorAvailabilityWindowElasticSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed for schedule adjustment.",
      };
    }

    const { availability_id, new_start_time, new_end_time, slot_duration, capacity } = validated.data;

    const res = await db.modifyDoctorAvailabilityWindowElastic({
      doctorId: sessionDoctor.doctor_id,
      availabilityId: availability_id,
      newStartTime: new_start_time,
      newEndTime: new_end_time,
      slotDuration: slot_duration,
      capacity,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/appointments");

    return {
      success: true,
      message: `Schedule modified: ${new_start_time}–${new_end_time}. Added ${res.addedSlotsCount} slot(s), removed ${res.removedSlotsCount} slot(s). ${res.flaggedAppointmentsCount} booked appointment(s) preserved.`,
      data: {
        addedSlotsCount: res.addedSlotsCount,
        removedSlotsCount: res.removedSlotsCount,
        flaggedAppointmentsCount: res.flaggedAppointmentsCount,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to modify availability window.";
    return { success: false, error: message };
  }
}

export async function modifyDoctorScheduleElasticAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{
  modifiedDatesCount: number;
  addedSlotsCount: number;
  removedSlotsCount: number;
  flaggedAppointmentsCount: number;
}>> {
  try {
    const sessionDoctor = await requireDoctor();

    let rawWeekdays: number[] | undefined;
    const weekdaysInput = formData.get("weekdays");
    if (weekdaysInput) {
      if (typeof weekdaysInput === "string") {
        try {
          const parsed = JSON.parse(weekdaysInput);
          if (Array.isArray(parsed)) rawWeekdays = parsed.map(Number);
        } catch {
          rawWeekdays = weekdaysInput
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n));
        }
      }
    }

    let rawSpecificDates: string[] | undefined;
    const specificDatesInput = formData.get("specific_dates");
    if (specificDatesInput && typeof specificDatesInput === "string") {
      try {
        const parsed = JSON.parse(specificDatesInput);
        if (Array.isArray(parsed)) rawSpecificDates = parsed.map(String);
      } catch {
        rawSpecificDates = specificDatesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    const rawData = {
      schedule_type: formData.get("schedule_type"),
      specific_dates: rawSpecificDates,
      weekdays: rawWeekdays,
      start_date: formData.get("start_date") || undefined,
      end_date: formData.get("end_date") || undefined,
      new_start_time: formData.get("new_start_time"),
      new_end_time: formData.get("new_end_time"),
      slot_duration: formData.get("slot_duration") || undefined,
      capacity: formData.get("capacity") || undefined,
      is_wave: formData.get("is_wave") === "true",
    };

    const validated = modifyDoctorScheduleElasticSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed for elastic schedule modification.",
      };
    }

    const d = validated.data;
    const res = await db.modifyDoctorScheduleElastic({
      doctorId: sessionDoctor.doctor_id,
      scheduleType: d.schedule_type,
      targetDates: Array.isArray(d.specific_dates) ? d.specific_dates : undefined,
      weekdays: Array.isArray(d.weekdays) ? d.weekdays : undefined,
      startDate: d.start_date,
      endDate: d.end_date,
      newStartTime: d.new_start_time,
      newEndTime: d.new_end_time,
      slotDuration: d.slot_duration,
      capacity: d.capacity,
      isWave: d.is_wave,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctor/dashboard");
    revalidatePath("/doctor/appointments");

    return {
      success: true,
      message: res.message,
      data: {
        modifiedDatesCount: res.modifiedDatesCount,
        addedSlotsCount: res.addedSlotsCount,
        removedSlotsCount: res.removedSlotsCount,
        flaggedAppointmentsCount: res.flaggedAppointmentsCount,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to modify schedule elastically.";
    return { success: false, error: message };
  }
}

export async function previewDoctorScheduleElasticAction(params: {
  availabilityId?: number;
  scheduleType?: "specific_dates" | "recurring_weekly";
  specificDates?: string[];
  weekdays?: number[];
  startDate?: string;
  endDate?: string;
  newStartTime: string;
  newEndTime: string;
  slotDuration?: number;
  capacity?: number;
  isWave?: boolean;
}): Promise<ActionResult<{
  datesCount: number;
  addedSlots: Array<{ date: string; time: string }>;
  removedSlots: Array<{ date: string; time: string }>;
  preservedSlotsCount: number;
  conflictingAppointments: Array<{
    appointmentId: number;
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    date: string;
    time: string;
    reason: string;
    status: string;
  }>;
  hasConflicts: boolean;
}>> {
  try {
    const sessionDoctor = await requireDoctor();

    const validated = previewDoctorScheduleElasticSchema.safeParse({
      availability_id: params.availabilityId,
      schedule_type: params.scheduleType,
      specific_dates: params.specificDates,
      weekdays: params.weekdays,
      start_date: params.startDate,
      end_date: params.endDate,
      new_start_time: params.newStartTime,
      new_end_time: params.newEndTime,
      slot_duration: params.slotDuration,
      capacity: params.capacity,
      is_wave: params.isWave,
    });

    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Validation failed for schedule preview.",
      };
    }

    const d = validated.data;
    const preview = await db.previewDoctorScheduleElasticChanges({
      doctorId: sessionDoctor.doctor_id,
      availabilityId: d.availability_id,
      scheduleType: d.schedule_type,
      targetDates: Array.isArray(d.specific_dates) ? d.specific_dates : undefined,
      weekdays: Array.isArray(d.weekdays) ? d.weekdays : undefined,
      startDate: d.start_date,
      endDate: d.end_date,
      newStartTime: d.new_start_time,
      newEndTime: d.new_end_time,
      slotDuration: d.slot_duration,
      capacity: d.capacity,
      isWave: d.is_wave,
    });

    return {
      success: true,
      data: preview,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate schedule preview.";
    return { success: false, error: message };
  }
}

export async function getAppointmentsRequiringReviewAction(): Promise<ActionResult<{
  appointments: any[];
}>> {
  try {
    const sessionDoctor = await requireDoctor();
    const list = await db.getAppointmentsRequiringReview(sessionDoctor.doctor_id);
    return {
      success: true,
      data: { appointments: list },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve review appointments.";
    return { success: false, error: message };
  }
}
