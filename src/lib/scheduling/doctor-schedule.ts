/**
 * Medrella Doctor Clinical Operating Schedules & Availability Generator
 * Generates dynamic rolling consultation windows strictly in Asia/Kolkata (IST).
 */

import { addDaysIST, getDayOfWeekIST, getTodayIST } from "@/lib/utils/date";

export interface SlotDefinition {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  slotDuration: number; // minutes
}

export interface DoctorWeeklySchedule {
  workingDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  slots: SlotDefinition[];
}

// Standard 30-minute clinic slots
const MORNING_SLOTS_30M: SlotDefinition[] = [
  { startTime: "09:00", endTime: "09:30", slotDuration: 30 },
  { startTime: "09:30", endTime: "10:00", slotDuration: 30 },
  { startTime: "10:00", endTime: "10:30", slotDuration: 30 },
  { startTime: "10:30", endTime: "11:00", slotDuration: 30 },
  { startTime: "11:00", endTime: "11:30", slotDuration: 30 },
  { startTime: "11:30", endTime: "12:00", slotDuration: 30 },
  { startTime: "12:00", endTime: "12:30", slotDuration: 30 },
  { startTime: "12:30", endTime: "13:00", slotDuration: 30 },
];

const AFTERNOON_SLOTS_30M: SlotDefinition[] = [
  { startTime: "14:00", endTime: "14:30", slotDuration: 30 },
  { startTime: "14:30", endTime: "15:00", slotDuration: 30 },
  { startTime: "15:00", endTime: "15:30", slotDuration: 30 },
  { startTime: "15:30", endTime: "16:00", slotDuration: 30 },
  { startTime: "16:00", endTime: "16:30", slotDuration: 30 },
  { startTime: "16:30", endTime: "17:00", slotDuration: 30 },
];

const STANDARD_FULL_DAY_SLOTS: SlotDefinition[] = [
  ...MORNING_SLOTS_30M,
  ...AFTERNOON_SLOTS_30M,
];

// Monday to Saturday (1 to 6)
const STANDARD_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

/**
 * Doctor-specific weekly operating schedule configuration
 */
export const DOCTOR_WEEKLY_SCHEDULES: Record<number, DoctorWeeklySchedule> = {
  // Dr. Ananya Sharma (Cardiology) - Mon-Sat
  1: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: STANDARD_FULL_DAY_SLOTS,
  },
  // Dr. Priya Nair (Dermatology) - Mon-Sat
  2: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: [
      { startTime: "10:00", endTime: "10:30", slotDuration: 30 },
      { startTime: "10:30", endTime: "11:00", slotDuration: 30 },
      { startTime: "11:00", endTime: "11:30", slotDuration: 30 },
      { startTime: "11:30", endTime: "12:00", slotDuration: 30 },
      { startTime: "12:00", endTime: "12:30", slotDuration: 30 },
      { startTime: "12:30", endTime: "13:00", slotDuration: 30 },
      { startTime: "14:30", endTime: "15:00", slotDuration: 30 },
      { startTime: "15:00", endTime: "15:30", slotDuration: 30 },
      { startTime: "15:30", endTime: "16:00", slotDuration: 30 },
      { startTime: "16:00", endTime: "16:30", slotDuration: 30 },
      { startTime: "16:30", endTime: "17:00", slotDuration: 30 },
      { startTime: "17:00", endTime: "17:30", slotDuration: 30 },
    ],
  },
  // Dr. Rohan Iyer (Neurology) - Mon-Fri
  3: {
    workingDays: [1, 2, 3, 4, 5],
    slots: [
      { startTime: "09:30", endTime: "10:00", slotDuration: 30 },
      { startTime: "10:00", endTime: "10:30", slotDuration: 30 },
      { startTime: "10:30", endTime: "11:00", slotDuration: 30 },
      { startTime: "11:00", endTime: "11:30", slotDuration: 30 },
      { startTime: "11:30", endTime: "12:00", slotDuration: 30 },
      { startTime: "12:00", endTime: "12:30", slotDuration: 30 },
      { startTime: "14:00", endTime: "14:30", slotDuration: 30 },
      { startTime: "14:30", endTime: "15:00", slotDuration: 30 },
      { startTime: "15:00", endTime: "15:30", slotDuration: 30 },
      { startTime: "15:30", endTime: "16:00", slotDuration: 30 },
      { startTime: "16:00", endTime: "16:30", slotDuration: 30 },
      { startTime: "16:30", endTime: "17:00", slotDuration: 30 },
    ],
  },
  // Dr. Sneha Kulkarni (Pediatrics - Wave Mode) - Mon-Sat
  4: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: [
      { startTime: "09:00", endTime: "10:00", slotDuration: 60 },
      { startTime: "10:00", endTime: "11:00", slotDuration: 60 },
      { startTime: "11:00", endTime: "12:00", slotDuration: 60 },
      { startTime: "12:00", endTime: "13:00", slotDuration: 60 },
      { startTime: "14:00", endTime: "15:00", slotDuration: 60 },
      { startTime: "15:00", endTime: "16:00", slotDuration: 60 },
    ],
  },
  // Dr. Vikram Malhotra (Orthopedics) - Mon-Sat
  5: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: STANDARD_FULL_DAY_SLOTS,
  },
  // Dr. Aditi Patel (Gynecology) - Mon-Sat
  6: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: [
      { startTime: "10:00", endTime: "10:30", slotDuration: 30 },
      { startTime: "10:30", endTime: "11:00", slotDuration: 30 },
      { startTime: "11:00", endTime: "11:30", slotDuration: 30 },
      { startTime: "11:30", endTime: "12:00", slotDuration: 30 },
      { startTime: "12:00", endTime: "12:30", slotDuration: 30 },
      { startTime: "12:30", endTime: "13:00", slotDuration: 30 },
      { startTime: "15:00", endTime: "15:30", slotDuration: 30 },
      { startTime: "15:30", endTime: "16:00", slotDuration: 30 },
      { startTime: "16:00", endTime: "16:30", slotDuration: 30 },
      { startTime: "16:30", endTime: "17:00", slotDuration: 30 },
      { startTime: "17:00", endTime: "17:30", slotDuration: 30 },
      { startTime: "17:30", endTime: "18:00", slotDuration: 30 },
    ],
  },
  // Dr. Karan Shah (General Medicine - Wave Mode) - Mon-Sat
  7: {
    workingDays: STANDARD_WORKING_DAYS,
    slots: [
      { startTime: "09:00", endTime: "10:00", slotDuration: 60 },
      { startTime: "10:00", endTime: "11:00", slotDuration: 60 },
      { startTime: "11:00", endTime: "12:00", slotDuration: 60 },
      { startTime: "14:00", endTime: "15:00", slotDuration: 60 },
      { startTime: "15:00", endTime: "16:00", slotDuration: 60 },
      { startTime: "16:00", endTime: "17:00", slotDuration: 60 },
    ],
  },
};

/**
 * Get configured or default weekly schedule for a doctor
 */
export function getDoctorSchedule(doctorId: number): DoctorWeeklySchedule {
  return (
    DOCTOR_WEEKLY_SCHEDULES[doctorId] || {
      workingDays: STANDARD_WORKING_DAYS,
      slots: STANDARD_FULL_DAY_SLOTS,
    }
  );
}

/**
 * Generate standard clinical slots for a doctor on a specific date (YYYY-MM-DD)
 */
export function generateDoctorSlotsForDate(
  doctorId: number,
  dateStr: string,
  schedulingMode?: "stream" | "wave",
  waveCapacity?: number
): Array<SlotDefinition & { isWave: boolean; waveCapacity: number }> {
  const schedule = getDoctorSchedule(doctorId);
  const dayOfWeek = getDayOfWeekIST(dateStr);

  if (!schedule.workingDays.includes(dayOfWeek)) {
    return [];
  }

  const isWave = schedulingMode === "wave";
  const resolvedCapacity = isWave
    ? waveCapacity && waveCapacity > 0
      ? waveCapacity
      : 3
    : 1;

  return schedule.slots.map((s) => ({
    ...s,
    isWave,
    waveCapacity: resolvedCapacity,
  }));
}

/**
 * Generate rolling window of dates (default: 14 days ahead starting today)
 */
export function getRollingDateWindow(daysAhead: number = 14, startDateStr?: string): string[] {
  const start = startDateStr || getTodayIST();
  const dates: string[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    dates.push(addDaysIST(start, i));
  }
  return dates;
}

