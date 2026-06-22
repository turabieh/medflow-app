/**
 * Appointment slot scheduling logic.
 *
 * Ported directly from the validated Streamlit implementation:
 *   - Working hours divided into 15-minute base slots
 *   - New patient visits consume 3 base slots (45 min)
 *   - Follow-up visits consume 2 base slots (30 min)
 *   - An optional break (e.g. lunch) removes slots from the pool
 *   - A slot is "available" only if it AND all consecutive slots needed
 *     for the visit duration are free
 *   - Overbooking is only offered when there are genuinely zero free
 *     slots for the requested visit type — never as a casual option
 */

export interface ClinicScheduleSettings {
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  hasBreak: boolean;
  breakStart?: string; // "HH:MM"
  breakEnd?: string; // "HH:MM"
  slotsNewPatient: number; // base 15-min slots consumed, default 3 (45 min)
  slotsFollowUp: number; // base 15-min slots consumed, default 2 (30 min)
  slotsReview: number; // default 1 (15 min)
  workingDays: number[]; // 0=Sunday ... 6=Saturday, days the clinic is open
  publicHolidays: Record<string, string>; // "YYYY-MM-DD" -> description
}

export const DEFAULT_SCHEDULE_SETTINGS: ClinicScheduleSettings = {
  openTime: "09:00",
  closeTime: "17:00",
  hasBreak: true,
  breakStart: "12:00",
  breakEnd: "12:30",
  slotsNewPatient: 3,
  slotsFollowUp: 2,
  slotsReview: 1,
  // Sunday-Thursday by default (standard Jordan clinic week) — Friday off.
  workingDays: [0, 1, 2, 3, 4],
  publicHolidays: {},
};

export interface DateAllowedResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Ported from the original Streamlit _is_allowed() — checks whether a
 * given date is bookable: not Friday (or whichever days aren't in
 * workingDays), and not a registered public holiday.
 */
export function isDateAllowed(
  dateStr: string, // "YYYY-MM-DD"
  settings: ClinicScheduleSettings
): DateAllowedResult {
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay(); // 0=Sunday ... 6=Saturday

  if (!settings.workingDays.includes(dayOfWeek)) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return { allowed: false, reason: `${dayNames[dayOfWeek]} is not a working day.` };
  }

  if (settings.publicHolidays[dateStr]) {
    return { allowed: false, reason: settings.publicHolidays[dateStr] };
  }

  return { allowed: true };
}

export type VisitType = "new" | "followup" | "review";

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [hour, minute] = hhmm.split(":").map(Number);
  return { hour, minute };
}

function timeToMinutes(hhmm: string): number {
  const { hour, minute } = parseTime(hhmm);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Number of 15-minute base slots a given visit type consumes. */
export function slotsNeeded(
  visitType: VisitType,
  settings: ClinicScheduleSettings
): number {
  switch (visitType) {
    case "new":
      return settings.slotsNewPatient;
    case "followup":
      return settings.slotsFollowUp;
    case "review":
      return settings.slotsReview;
  }
}

/** Visit duration in minutes for a given visit type. */
export function visitDurationMinutes(
  visitType: VisitType,
  settings: ClinicScheduleSettings
): number {
  return slotsNeeded(visitType, settings) * 15;
}

/** Builds every 15-minute base slot within working hours, excluding breaks. */
export function buildAllSlots(settings: ClinicScheduleSettings): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(settings.openTime);
  const end = timeToMinutes(settings.closeTime);
  const breakStart = settings.hasBreak && settings.breakStart ? timeToMinutes(settings.breakStart) : null;
  const breakEnd = settings.hasBreak && settings.breakEnd ? timeToMinutes(settings.breakEnd) : null;

  for (let t = start; t < end; t += 15) {
    const inBreak = breakStart !== null && breakEnd !== null && t >= breakStart && t < breakEnd;
    if (!inBreak) {
      slots.push(minutesToTime(t));
    }
  }
  return slots;
}

export interface ExistingAppointmentForSlots {
  id: string;
  start_time: string | null; // "HH:MM:SS" or "HH:MM"
  visit_type: VisitType;
  status: string;
  doctor_id?: string | null;
}

/**
 * Returns the subset of slots that are genuinely free for the requested
 * visit type on a given date — meaning the slot AND every consecutive
 * slot the visit needs are all unoccupied. Cancelled and no-show
 * appointments don't block slots.
 */
export function getAvailableSlots(
  visitType: VisitType,
  existingAppointments: ExistingAppointmentForSlots[],
  settings: ClinicScheduleSettings,
  excludeAppointmentId?: string,
  dateStr?: string
): string[] {
  // If a date is provided and it's not a working day / is a holiday,
  // there are no slots at all — no point computing anything further.
  if (dateStr) {
    const { allowed } = isDateAllowed(dateStr, settings);
    if (!allowed) return [];
  }

  const allSlots = buildAllSlots(settings);
  const needed = slotsNeeded(visitType, settings);

  const occupied = new Set<string>();

  for (const appt of existingAppointments) {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
    if (!appt.start_time) continue;
    if (appt.status === "cancelled" || appt.status === "no_show") continue;

    const normalizedTime = appt.start_time.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
    const startIdx = allSlots.indexOf(normalizedTime);
    if (startIdx === -1) continue;

    const apptNeeded = slotsNeeded(appt.visit_type, settings);
    for (let i = 0; i < apptNeeded; i++) {
      const idx = startIdx + i;
      if (idx < allSlots.length) {
        occupied.add(allSlots[idx]);
      }
    }
  }

  const available: string[] = [];
  for (let i = 0; i < allSlots.length; i++) {
    const slot = allSlots[i];
    if (occupied.has(slot)) continue;

    const block = allSlots.slice(i, i + needed);
    if (block.length < needed) continue; // not enough room before closing time
    if (block.some((s) => occupied.has(s))) continue;

    // Critical: buildAllSlots() already strips out break-time entries, so
    // consecutive array indices are NOT guaranteed to be consecutive in
    // actual clock time — e.g. slots jump straight from 11:45 to 12:30
    // across a 12:00-12:30 break. A naive array slice would let a 45-min
    // visit starting at 11:45 silently swallow the break. Verify every
    // slot in the block is exactly 15 minutes after the previous one.
    let isContiguous = true;
    for (let j = 1; j < block.length; j++) {
      if (timeToMinutes(block[j]) - timeToMinutes(block[j - 1]) !== 15) {
        isContiguous = false;
        break;
      }
    }
    if (!isContiguous) continue;

    available.push(slot);
  }

  return available;
}

/**
 * Computes which calendar date the confirmation call should happen on:
 * the LAST actual working day before the appointment date, walking
 * backwards until it finds one. This handles cases where the naive
 * "24 hours before" lands on a closed day (e.g. appointment is Sunday,
 * naive 24h-before is Saturday, but Friday+Saturday are both off — the
 * call should happen Thursday, the last real working day).
 *
 * workingDaysOfWeek: which days of week (0=Sun..6=Sat) this doctor
 * works at all, derived from their doctor_working_hours rows.
 */
export function computeConfirmationCallDate(
  appointmentDateStr: string,
  workingDaysOfWeek: number[],
  publicHolidays: Record<string, string> = {}
): string {
  const apptDate = new Date(appointmentDateStr + "T00:00:00");

  // Walk backwards day by day from the appointment date (exclusive)
  // until we find a day that's both a working day of week AND not a
  // public holiday. Cap the walk-back at 14 days as a sanity bound —
  // a doctor working zero days a week is a misconfiguration, not
  // something this function should loop forever trying to solve.
  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(apptDate);
    candidate.setDate(candidate.getDate() - i);
    const candidateStr = candidate.toISOString().split("T")[0];
    const dow = candidate.getDay();

    if (workingDaysOfWeek.includes(dow) && !publicHolidays[candidateStr]) {
      return candidateStr;
    }
  }

  // Fallback: if no working day found in 14 days (misconfigured
  // schedule), default to simple 24h-before so the system doesn't
  // silently produce no call date at all.
  const fallback = new Date(apptDate);
  fallback.setDate(fallback.getDate() - 1);
  return fallback.toISOString().split("T")[0];
}

/** Human-readable label, e.g. "09:00 (45 min)". */
export function slotLabel(
  slot: string,
  visitType: VisitType,
  settings: ClinicScheduleSettings
): string {
  return `${slot} (${visitDurationMinutes(visitType, settings)} min)`;
}

/** Computes the end_time for an appointment given its start and visit type. */
export function computeEndTime(
  startTime: string,
  visitType: VisitType,
  settings: ClinicScheduleSettings
): string {
  const startMinutes = timeToMinutes(startTime.slice(0, 5));
  return minutesToTime(startMinutes + visitDurationMinutes(visitType, settings));
}

// ============================================================================
// Multi-doctor schedule aggregation
//
// A clinic with multiple doctors needs two different views of the same
// data: "is Dr. X free at this time" (for booking with a specific
// doctor) and "is the clinic open at all at this time" (for showing a
// combined view, or for a single-doctor clinic where there's only one
// possible answer anyway). Doctor A being blocked does NOT make a slot
// unavailable if Doctor B is free — only when EVERY doctor is blocked
// does a slot disappear from the clinic-wide pool.
// ============================================================================

export interface DoctorWorkingHours {
  doctorId: string;
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStart?: string;
  breakEnd?: string;
}

export interface DoctorScheduleBlock {
  doctorId: string;
  blockDate: string; // "YYYY-MM-DD"
  startTime: string | null; // null = whole day blocked
  endTime: string | null;
  reason: string;
}

/**
 * Builds a single doctor's working-hour settings for a specific date,
 * accounting for their recurring weekly pattern. Returns null if the
 * doctor doesn't work that day of week at all.
 */
export function getDoctorScheduleForDate(
  doctorId: string,
  dateStr: string,
  workingHours: DoctorWorkingHours[]
): ClinicScheduleSettings | null {
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay();

  const hours = workingHours.find(
    (wh) => wh.doctorId === doctorId && wh.dayOfWeek === dayOfWeek
  );

  if (!hours) return null; // doctor doesn't work this day of week

  return {
    openTime: hours.openTime,
    closeTime: hours.closeTime,
    hasBreak: hours.hasBreak,
    breakStart: hours.breakStart,
    breakEnd: hours.breakEnd,
    slotsNewPatient: DEFAULT_SCHEDULE_SETTINGS.slotsNewPatient,
    slotsFollowUp: DEFAULT_SCHEDULE_SETTINGS.slotsFollowUp,
    slotsReview: DEFAULT_SCHEDULE_SETTINGS.slotsReview,
    // Derive working days from the actual rows for THIS doctor, so
    // isDateAllowed reflects what the doctor actually configured rather
    // than the hardcoded Sun-Thu default.
    workingDays: workingHours
      .filter((wh) => wh.doctorId === doctorId)
      .map((wh) => wh.dayOfWeek),
    publicHolidays: DEFAULT_SCHEDULE_SETTINGS.publicHolidays,
  };
}

/**
 * Removes slots covered by one-off blocks for a specific doctor on a
 * specific date. A block with null start/end removes ALL slots (whole
 * day off). A block with a time range only removes slots inside it.
 */
function applyDoctorBlocks(
  slots: string[],
  doctorId: string,
  dateStr: string,
  blocks: DoctorScheduleBlock[]
): string[] {
  const relevantBlocks = blocks.filter(
    (b) => b.doctorId === doctorId && b.blockDate === dateStr
  );

  if (relevantBlocks.length === 0) return slots;

  // A whole-day block wipes everything for this doctor on this date.
  if (relevantBlocks.some((b) => b.startTime === null)) return [];

  const blockedMinuteRanges = relevantBlocks
    .filter((b) => b.startTime !== null && b.endTime !== null)
    .map((b) => ({
      start: timeToMinutes(b.startTime!),
      end: timeToMinutes(b.endTime!),
    }));

  return slots.filter((slot) => {
    const slotMinutes = timeToMinutes(slot);
    return !blockedMinuteRanges.some(
      (range) => slotMinutes >= range.start && slotMinutes < range.end
    );
  });
}

/**
 * Available slots for ONE specific doctor on a specific date, accounting
 * for their recurring weekly hours, one-off blocks, and existing
 * appointments. Use this when booking is being assigned to a known doctor.
 */
export function getAvailableSlotsForDoctor(
  doctorId: string,
  dateStr: string,
  visitType: VisitType,
  workingHours: DoctorWorkingHours[],
  blocks: DoctorScheduleBlock[],
  existingAppointments: ExistingAppointmentForSlots[],
  excludeAppointmentId?: string
): string[] {
  const schedule = getDoctorScheduleForDate(doctorId, dateStr, workingHours);
  if (!schedule) return []; // doctor doesn't work this day

  const dateCheck = isDateAllowed(dateStr, schedule);
  if (!dateCheck.allowed) return [];

  const doctorAppointments = existingAppointments.filter(
    (a) => a.doctor_id === doctorId
  );

  const baseSlots = getAvailableSlots(
    visitType,
    doctorAppointments,
    schedule,
    excludeAppointmentId,
    dateStr
  );

  return applyDoctorBlocks(baseSlots, doctorId, dateStr, blocks);
}

/**
 * Clinic-wide combined availability: a slot appears here if AT LEAST ONE
 * doctor is free at that time. Useful for an overview ("is the clinic
 * open at 2pm at all") without committing to a specific doctor yet.
 */
export function getClinicWideAvailableSlots(
  doctorIds: string[],
  dateStr: string,
  visitType: VisitType,
  workingHours: DoctorWorkingHours[],
  blocks: DoctorScheduleBlock[],
  existingAppointments: ExistingAppointmentForSlots[]
): string[] {
  const combined = new Set<string>();

  for (const doctorId of doctorIds) {
    const slots = getAvailableSlotsForDoctor(
      doctorId,
      dateStr,
      visitType,
      workingHours,
      blocks,
      existingAppointments
    );
    slots.forEach((s) => combined.add(s));
  }

  return Array.from(combined).sort();
}

// ============================================================================
// Confirmation call scheduling
//
// The secretary calls to confirm an appointment roughly 24h before it
// happens. But "24h before" can land on a day the clinic is closed
// (e.g. appointment is Sunday -> naive 24h-before is Saturday, which
// might also be off). In that case the call needs to happen on the
// LAST actual working day before the appointment, however many days
// back that is -- never silently skipped.
// ============================================================================

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Returns the date the confirmation call should happen on: the last
 * working day strictly before the appointment date. Walks backward one
 * day at a time (bounded to 14 days back as a sanity limit -- a clinic
 * closed for 2 straight weeks is a configuration error, not a normal
 * case) until it finds a day that passes isDateAllowed.
 */
export function getConfirmationCallDueDate(
  appointmentDateStr: string,
  settings: ClinicScheduleSettings
): string {
  let candidate = addDays(appointmentDateStr, -1);

  for (let i = 0; i < 14; i++) {
    if (isDateAllowed(candidate, settings).allowed) {
      return candidate;
    }
    candidate = addDays(candidate, -1);
  }

  // Fallback: if somehow no working day was found in 14 days (broken
  // config), default to the naive day-before rather than crash.
  return addDays(appointmentDateStr, -1);
}

/** True if today is the day the confirmation call should be made. */
export function isConfirmationCallDueToday(
  appointmentDateStr: string,
  todayStr: string,
  settings: ClinicScheduleSettings
): boolean {
  return getConfirmationCallDueDate(appointmentDateStr, settings) === todayStr;
}
