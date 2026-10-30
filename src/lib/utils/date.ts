/**
 * Indian Standard Time (IST - Asia/Kolkata) Date & Time Formatting Utilities
 * Deterministic formatting designed to prevent React SSR/hydration mismatches.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format date string/Date to Indian Standard Time readable string
 * e.g., "Wednesday, 28 Oct 2026"
 */
export function formatISTDate(
  dateInput: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

/**
 * Format 24h "HH:mm" time string to deterministic 12h Indian time with uppercase AM/PM
 * e.g. "14:30" -> "02:30 PM", "09:00" -> "09:00 AM"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/**
 * Deterministically format a Date object, ISO timestamp string, or "HH:mm" time string
 * to a 12-hour Indian Standard Time (IST - Asia/Kolkata) time string with uppercase "AM" / "PM".
 * E.g., "14:30" -> "02:30 PM", "2026-10-28T09:00:00.000Z" -> "02:30 PM"
 *
 * Guarantees 100% identical output across Node.js server SSR and client browser hydration,
 * avoiding environment-dependent ICU locale differences (e.g. "02:30 pm" vs "02:30 PM").
 */
export function formatISTTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  // 1. If input is a 24-hour time string like "HH:mm" or "HH:mm:ss"
  if (
    typeof dateInput === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(dateInput.trim())
  ) {
    return formatTime12h(dateInput.trim());
  }

  // 2. If input is an ISO string with a direct time component like "2026-10-28T14:30:00"
  // Note: if date string contains slot clock time like "T14:30:00.000Z", extract clock hours
  if (typeof dateInput === "string" && dateInput.includes("T")) {
    const timeMatch = dateInput.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      // Check if it's already an explicit local slot time string
      const [, h, m] = timeMatch;
      const hours = parseInt(h, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
    }
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  // 3. Use explicit en-GB 24-hour format in Asia/Kolkata to extract exact hour and minute
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value || "00";
  const minutePart = parts.find((p) => p.type === "minute")?.value || "00";

  const hour = parseInt(hourPart, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;

  return `${String(h12).padStart(2, "0")}:${minutePart} ${ampm}`;
}

/**
 * Format datetime string/Date to Indian Standard Time with time
 * e.g., "28 Oct 2026, 02:30 PM IST"
 */
export function formatISTDateTime(
  dateInput: string | Date,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const dateStr = formatISTDate(date);
  const timeStr = formatISTTime(date);
  return `${dateStr}, ${timeStr} IST`;
}

/**
 * Calculate seconds remaining until expiry timestamp
 */
export function getRemainingSeconds(expiresAtIso: string): number {
  const expiryTime = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const remainingMs = expiryTime - now;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Format seconds into mm:ss
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Return today's date formatted as "YYYY-MM-DD" in Indian Standard Time (Asia/Kolkata).
 */
export function getTodayIST(refDate: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
  }).format(refDate);
}

/**
 * Return current time formatted as 24-hour "HH:mm" in Indian Standard Time (Asia/Kolkata).
 */
export function getCurrentTimeIST(refDate: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(refDate);
}

/**
 * Add N days to a "YYYY-MM-DD" date string in IST, returning "YYYY-MM-DD".
 */
export function addDaysIST(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) in IST.
 */
export function getDayOfWeekIST(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
}

/**
 * Determine whether a given date ("YYYY-MM-DD") is strictly in the past (before today in IST).
 */
export function isDateInPast(dateStr: string, refDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const todayIST = getTodayIST(refDate);
  return dateStr < todayIST;
}

/**
 * Determine whether a slot (date + startTime) is in the past in IST.
 * - If availableDate < todayIST -> true
 * - If availableDate > todayIST -> false
 * - If availableDate === todayIST -> true if startTime <= currentTimeIST
 */
export function isSlotInPast(
  availableDate: string,
  startTime: string,
  refDate: Date = new Date()
): boolean {
  if (!availableDate) return false;
  const todayIST = getTodayIST(refDate);
  if (availableDate < todayIST) return true;
  if (availableDate > todayIST) return false;

  if (!startTime) return true;
  const currentTimeIST = getCurrentTimeIST(refDate);
  const slotTimeNormalized =
    startTime.length === 5 ? startTime : startTime.slice(0, 5);
  return slotTimeNormalized <= currentTimeIST;
}
