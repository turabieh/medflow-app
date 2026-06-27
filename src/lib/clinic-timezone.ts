// Clinic timezone: Asia/Amman (Jordan, UTC+3)
// All "today" comparisons must use local Jordan date, not UTC
// This ensures clinic schedule matches what staff see on their phones

const CLINIC_TZ = "Asia/Amman";

/** Returns today's date string in Jordan time: "2026-06-27" */
export function todayClinic(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: CLINIC_TZ });
  // en-CA locale gives YYYY-MM-DD format natively
}

/** Format a UTC date string for display in Jordan time */
export function toClinicDate(utcDateStr: string): string {
  return new Date(utcDateStr).toLocaleDateString("en-CA", { timeZone: CLINIC_TZ });
}

/** Current time in Jordan as HH:MM */
export function nowClinicTime(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: CLINIC_TZ, hour:"2-digit", minute:"2-digit" });
}
