/**
 * Medrella Slot & Schedule Generation Engine
 * Handles deterministic generation of time slots and recurrence dates in Asia/Kolkata (IST).
 */

import {
  getTodayIST,
  addDaysIST,
  getDayOfWeekIST,
  isDateInPast,
} from "@/lib/utils/date";

export interface TimeSlot {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  slotDuration: number; // minutes
}

export interface TargetDatesConfig {
  scheduleType: "specific_dates" | "recurring_weekly";
  specificDates?: string[];
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  weekdays?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

/**
 * Converts a 24-hour "HH:mm" time string to total minutes from 00:00.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr.trim())) {
    throw new Error(`Invalid time format: '${timeStr}'. Expected HH:mm.`);
  }
  const [hours, minutes] = timeStr.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from 00:00 to 24-hour "HH:mm" time string.
 */
export function minutesToTimeString(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes % (24 * 60));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Generates consecutive individual consultation slots within an operating window.
 *
 * Rules:
 * - Slices [startTime, endTime] into non-overlapping intervals of durationMinutes.
 * - Rejects invalid time ranges (startTime >= endTime or duration <= 0).
 * - Does NOT generate incomplete final slots (e.g. 09:00-10:15 with 30m duration yields 2 slots, not 3).
 * - Supports arbitrary positive durations (e.g. 15, 30, 45, 60 minutes).
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): TimeSlot[] {
  if (!durationMinutes || durationMinutes <= 0 || !Number.isInteger(durationMinutes)) {
    throw new Error(
      `Invalid slot duration: ${durationMinutes}. Duration must be a positive integer in minutes.`
    );
  }

  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);

  if (startMin >= endMin) {
    throw new Error(
      `Invalid operating window: Start time (${startTime}) must be strictly earlier than end time (${endTime}).`
    );
  }

  const slots: TimeSlot[] = [];
  let currentMin = startMin;

  while (currentMin + durationMinutes <= endMin) {
    const slotStart = minutesToTimeString(currentMin);
    const slotEnd = minutesToTimeString(currentMin + durationMinutes);
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      slotDuration: durationMinutes,
    });
    currentMin += durationMinutes;
  }

  return slots;
}

/**
 * Resolves all target calendar dates (YYYY-MM-DD) for a given schedule configuration.
 *
 * Rules:
 * - Operates strictly in Asia/Kolkata (IST).
 * - Filters out historical/past dates.
 * - Deduplicates dates and sorts chronologically.
 * - Supports one-time specific dates, multi-date arrays, and recurring weekly patterns.
 */
export function resolveTargetDates(config: TargetDatesConfig): string[] {
  const todayIST = getTodayIST();
  const dateSet = new Set<string>();

  if (config.scheduleType === "specific_dates") {
    const rawDates = [
      ...(config.specificDates || []),
      ...(config.startDate ? [config.startDate] : []),
    ];

    for (const d of rawDates) {
      const clean = typeof d === "string" ? d.trim() : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        if (!isDateInPast(clean)) {
          dateSet.add(clean);
        }
      }
    }
  } else if (config.scheduleType === "recurring_weekly") {
    // Start date defaults to today if not provided or in past
    let current = config.startDate?.trim() || todayIST;
    if (isDateInPast(current)) {
      current = todayIST;
    }

    // End date defaults to 4 weeks ahead if missing or earlier than start
    let end = config.endDate?.trim();
    if (!end || end < current) {
      end = addDaysIST(current, 28);
    }

    // Default weekdays: Mon-Sat (1 to 6) if not specified
    const targetWeekdays =
      Array.isArray(config.weekdays) && config.weekdays.length > 0
        ? config.weekdays
        : [1, 2, 3, 4, 5, 6];

    let cursor = current;
    // Cap recurring expansion to max 90 days to prevent infinite loops or runaway memory
    const maxDate = addDaysIST(current, 90);
    const effectiveEnd = end > maxDate ? maxDate : end;

    while (cursor <= effectiveEnd) {
      if (!isDateInPast(cursor)) {
        const dow = getDayOfWeekIST(cursor);
        if (targetWeekdays.includes(dow)) {
          dateSet.add(cursor);
        }
      }
      cursor = addDaysIST(cursor, 1);
    }
  }

  return Array.from(dateSet).sort();
}

