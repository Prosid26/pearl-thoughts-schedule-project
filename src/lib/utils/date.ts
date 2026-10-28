/**
 * Indian Standard Time (IST - Asia/Kolkata) Date & Time Formatting Utilities
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
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
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
 * Format datetime string/Date to Indian Standard Time with time
 * e.g., "28 Oct 2026, 10:30 AM IST"
 */
export function formatISTDateTime(
  dateInput: string | Date,
  includeSeconds: boolean = false
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
  return `${formatted} IST`;
}

/**
 * Format 24h "HH:mm" time to friendly 12h Indian time
 * e.g. "14:30" -> "02:30 PM"
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
