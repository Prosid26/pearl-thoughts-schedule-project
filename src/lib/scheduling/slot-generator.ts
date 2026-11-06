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

/**
 * Evaluates whether two time intervals overlap.
 * Strictly applies the interval overlap condition:
 * startA < endB AND endA > startB
 * Consecutive touching intervals (e.g., 10:00–10:30 and 10:30–11:00) do NOT overlap.
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export interface DynamicStreamSlot {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  slotDuration: number; // minutes
  isAvailable: boolean;
  bookedCount: number;
  capacity: number;
}

/**
 * Dynamically calculates available appointment times from a continuous Stream window.
 * Slices [start_time, end_time] into slot_duration increments and determines availability
 * by matching active booked appointments for that time.
 */
export function calculateStreamAppointmentTimes(
  window: {
    start_time: string;
    end_time: string;
    slot_duration: number;
    wave_capacity?: number;
  },
  activeBookings: Array<{
    appointment_time?: string | null;
    estimated_consult_time?: string | null;
    appointment_date?: string | Date;
  }> = []
): DynamicStreamSlot[] {
  const slots = generateTimeSlots(
    window.start_time,
    window.end_time,
    window.slot_duration
  );

  // In Stream mode, individual slot capacity is computed from window capacity divided by subslot count
  const subslotCount = slots.length;
  const slotCapacity =
    subslotCount > 0
      ? Math.max(1, Math.floor((window.wave_capacity || subslotCount) / subslotCount))
      : 1;

  // Count active bookings by start time
  const bookedCountsByTime = new Map<string, number>();
  for (const b of activeBookings) {
    let timeStr = b.appointment_time || b.estimated_consult_time;
    if (!timeStr && b.appointment_date) {
      const d =
        typeof b.appointment_date === "string"
          ? b.appointment_date
          : b.appointment_date.toISOString();
      const match = d.match(/T(\d{2}:\d{2})/);
      if (match) timeStr = match[1];
    }
    if (timeStr) {
      const cleanTime = timeStr.slice(0, 5);
      bookedCountsByTime.set(cleanTime, (bookedCountsByTime.get(cleanTime) || 0) + 1);
    }
  }

  return slots.map((s) => {
    const booked = bookedCountsByTime.get(s.startTime) || 0;
    return {
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDuration,
      isAvailable: booked < slotCapacity,
      bookedCount: booked,
      capacity: slotCapacity,
    };
  });
}

export interface ElasticDiffResult {
  addedSlots: TimeSlot[];
  removedSlots: TimeSlot[];
  preservedSlots: TimeSlot[];
  isShrinking: boolean;
  isExpanding: boolean;
  isShift: boolean;
}

/**
 * Calculates deterministic slot differences when elastically expanding or shrinking a schedule window.
 */
export function calculateElasticDiff(
  oldStartTime: string,
  oldEndTime: string,
  newStartTime: string,
  newEndTime: string,
  slotDuration: number
): ElasticDiffResult {
  const oldSlots = generateTimeSlots(oldStartTime, oldEndTime, slotDuration);
  const newSlots = generateTimeSlots(newStartTime, newEndTime, slotDuration);

  const oldSlotKeySet = new Set(oldSlots.map((s) => `${s.startTime}-${s.endTime}`));
  const newSlotKeySet = new Set(newSlots.map((s) => `${s.startTime}-${s.endTime}`));

  const addedSlots = newSlots.filter((s) => !oldSlotKeySet.has(`${s.startTime}-${s.endTime}`));
  const removedSlots = oldSlots.filter((s) => !newSlotKeySet.has(`${s.startTime}-${s.endTime}`));
  const preservedSlots = newSlots.filter((s) => oldSlotKeySet.has(`${s.startTime}-${s.endTime}`));

  const isShrinking = newStartTime > oldStartTime || newEndTime < oldEndTime;
  const isExpanding = newStartTime < oldStartTime || newEndTime > oldEndTime;
  const isShift = newStartTime !== oldStartTime || newEndTime !== oldEndTime;

  return {
    addedSlots,
    removedSlots,
    preservedSlots,
    isShrinking,
    isExpanding,
    isShift,
  };
}



