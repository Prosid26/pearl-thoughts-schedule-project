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
