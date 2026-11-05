"use server";

import { db } from "@/lib/db";
import { requireDoctor } from "@/lib/auth/session";
import {
  addAvailabilitySchema,
  createDoctorScheduleSchema,
  updateDoctorProfileSchema,
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

    const timeSlots = generateTimeSlots(
      data.start_time,
      data.end_time,
      data.slot_duration
    );

    if (timeSlots.length === 0) {
      return {
        success: false,
        error: `Operating window (${data.start_time}–${data.end_time}) is too short for a ${data.slot_duration}-minute duration.`,
      };
    }

    const isWave = data.scheduling_mode === "wave";
    const slotsToInsert: Array<{
      available_date: string;
      start_time: string;
      end_time: string;
      slot_duration: number;
      is_wave: boolean;
      wave_capacity: number;
    }> = [];

    for (const d of targetDates) {
      for (const ts of timeSlots) {
        slotsToInsert.push({
          available_date: d,
          start_time: ts.startTime,
          end_time: ts.endTime,
          slot_duration: ts.slotDuration,
          is_wave: isWave,
          wave_capacity: data.capacity,
        });
      }
    }

    const res = await db.addAvailabilityBatch({
      doctorId: sessionDoctor.doctor_id,
      slots: slotsToInsert,
    });

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    const modeLabel = isWave ? "Wave" : "Stream";
    return {
      success: true,
      message: `Published ${res.addedCount} ${modeLabel} slot(s) across ${targetDates.length} operating day(s).${
        res.skippedCount > 0 ? ` (${res.skippedCount} pre-existing slots retained)` : ""
      }`,
      data: {
        addedCount: res.addedCount,
        datesCount: targetDates.length,
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

    const timeSlots = generateTimeSlots(start_time, end_time, slot_duration);
    if (timeSlots.length <= 1) {
      await db.addAvailabilitySlot(
        sessionDoctor.doctor_id,
        available_date,
        start_time,
        end_time,
        slot_duration,
        is_wave,
        wave_capacity
      );
    } else {
      await db.addAvailabilityBatch({
        doctorId: sessionDoctor.doctor_id,
        slots: timeSlots.map((ts) => ({
          available_date,
          start_time: ts.startTime,
          end_time: ts.endTime,
          slot_duration: ts.slotDuration,
          is_wave: Boolean(is_wave),
          wave_capacity,
        })),
      });
    }

    revalidatePath("/doctor/availability");
    revalidatePath(`/doctors/${sessionDoctor.doctor_id}`);
    revalidatePath("/doctors");

    return {
      success: true,
      message: is_wave
        ? `Wave arrival window (${wave_capacity || 3} patients) added for ${available_date} (${timeSlots.length} window${timeSlots.length > 1 ? "s" : ""}).`
        : `Availability added for ${available_date} (${timeSlots.length} slot${timeSlots.length > 1 ? "s" : ""}).`,
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
