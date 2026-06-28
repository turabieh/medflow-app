// Client-side Jordan timezone helpers
// Use these in client components ("use client") instead of new Date().toISOString()

const TZ = "Asia/Amman";

/** Today's date in Jordan: "2026-06-27" */
export function todayJordan(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Date N days from today in Jordan */
export function daysFromTodayJordan(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Convert "HH:MM" or "HH:MM:SS" 24h to "h:MM AM/PM" */
export function to12h(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Format a date string "YYYY-MM-DD" for display: "Mon, Jun 27" */
export function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en", {
    weekday: "short", month: "short", day: "numeric",
  });
}
