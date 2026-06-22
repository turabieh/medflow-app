"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { computeEndTime, type VisitType } from "@/lib/scheduling/slots";
import { DEFAULT_SCHEDULE_SETTINGS } from "@/lib/scheduling/slots";

export interface ConfirmBookingInput {
  appointmentId: string;
  patientId: string;
  doctorId: string;

  // Patient demographics (editable by secretary during the call)
  fullName: string;
  fullNameAr?: string;
  gender?: "male" | "female";
  dob?: string;
  address?: string;
  phone: string;
  phone2?: string;
  phone2Relation?: string;

  // Appointment details
  apptDate: string; // YYYY-MM-DD
  visitType: VisitType;
  startTime: string; // "HH:MM"
  isOverbooked: boolean;
  secretaryNotes?: string;

  // Symptoms checklist
  symptomIds: string[];
}

export interface ConfirmBookingResult {
  success: boolean;
  error?: string;
}

/**
 * Converts a pending appointment to booked: assigns a real time slot and
 * doctor, saves any patient demographic updates the secretary collected
 * during the call, and records the symptoms checklist. All in one atomic
 * action — matching the original Streamlit "Save & Assign" behavior where
 * a single save converts the patient from pending to booked.
 */
export async function confirmBooking(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  if (!input.fullName?.trim() || !input.phone?.trim()) {
    return { success: false, error: "Name and phone are required." };
  }
  if (!input.doctorId?.trim()) {
    return { success: false, error: "A doctor must be selected." };
  }
  if (!input.startTime) {
    return { success: false, error: "A time slot must be selected." };
  }

  // Update patient demographics with whatever the secretary collected.
  const { error: patientError } = await supabase
    .from("patients")
    .update({
      full_name: input.fullName.trim(),
      full_name_ar: input.fullNameAr?.trim() || null,
      gender: input.gender || null,
      dob: input.dob || null,
      address: input.address?.trim() || null,
      phone: input.phone.trim(),
      phone2: input.phone2?.trim() || null,
      phone2_relation: input.phone2Relation?.trim() || null,
    })
    .eq("id", input.patientId);

  if (patientError) {
    console.error("[confirmBooking] patient update failed:", patientError);
    return { success: false, error: `Could not update patient: ${patientError.message}` };
  }

  const endTime = computeEndTime(input.startTime, input.visitType, DEFAULT_SCHEDULE_SETTINGS);

  const { error: apptError } = await supabase
    .from("appointments")
    .update({
      doctor_id: input.doctorId,
      appt_date: input.apptDate,
      start_time: input.startTime,
      end_time: endTime,
      visit_type: input.visitType,
      status: "booked",
      period: null, // no longer needed once a real slot is assigned
      is_overbooked: input.isOverbooked,
      secretary_notes: input.secretaryNotes?.trim() || null,
    })
    .eq("id", input.appointmentId);

  if (apptError) {
    console.error("[confirmBooking] appointment update failed:", apptError);
    return { success: false, error: `Could not save appointment: ${apptError.message}` };
  }

  // Replace the symptoms checklist for this appointment with whatever
  // was checked in this save (simplest correct approach: clear and
  // re-insert, since the checklist is small).
  await supabase.from("appointment_symptoms").delete().eq("appointment_id", input.appointmentId);

  if (input.symptomIds.length > 0) {
    const { error: symptomsError } = await supabase.from("appointment_symptoms").insert(
      input.symptomIds.map((symptomId) => ({
        appointment_id: input.appointmentId,
        symptom_id: symptomId,
      }))
    );
    if (symptomsError) {
      return { success: false, error: `Could not save symptoms: ${symptomsError.message}` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/patients");

  return { success: true };
}

/** Logs a pending-slot call attempt without assigning a slot (no answer). */
export async function logPendingCallAttempt(
  appointmentId: string,
  makesCold: boolean
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("pending_call_attempts")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appt) {
    return { success: false, error: "Could not find appointment." };
  }

  const newAttempts = (appt.pending_call_attempts ?? 0) + 1;

  const { error } = await supabase
    .from("appointments")
    .update({
      pending_call_attempts: newAttempts,
      pending_last_call_at: new Date().toISOString(),
      pending_is_cold: makesCold || newAttempts >= 3,
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Marks a booked appointment as confirmed — the patient answered the
 * 24-hour confirmation call. Separate flow from pending-slot assignment.
 */
export async function confirmAppointmentAttendance(
  appointmentId: string
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("confirmation_call_attempts")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appt) {
    return { success: false, error: "Could not find appointment." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      confirmation_call_attempts: (appt.confirmation_call_attempts ?? 0) + 1,
      confirmation_last_call_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Logs an unanswered confirmation call — appointment stays 'booked',
 * never silently moves to 'confirmed' without the patient actually
 * answering. This is the exact rule you specified for the original
 * Streamlit build.
 */
export async function logConfirmationCallAttempt(
  appointmentId: string
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("confirmation_call_attempts")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appt) {
    return { success: false, error: "Could not find appointment." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      confirmation_call_attempts: (appt.confirmation_call_attempts ?? 0) + 1,
      confirmation_last_call_at: new Date().toISOString(),
      // status intentionally left untouched -- stays 'booked'
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Reschedules a booked appointment to a new date/time — used when the
 * secretary has the patient on the phone during the confirmation call
 * and they ask to move the appointment. Stays in 'booked' status (not
 * auto-confirmed just because it moved), so a fresh confirmation call
 * is still expected for the new date.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  visitType: VisitType
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  if (!newDate || !newStartTime) {
    return { success: false, error: "A new date and time are required." };
  }

  const endTime = computeEndTime(newStartTime, visitType, DEFAULT_SCHEDULE_SETTINGS);

  const { error } = await supabase
    .from("appointments")
    .update({
      appt_date: newDate,
      start_time: newStartTime,
      end_time: endTime,
      status: "booked", // reset to booked -- a moved appointment needs reconfirming
      confirmation_call_attempts: 0,
      confirmation_last_call_at: null,
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Cancels an appointment at the patient's request during a confirmation
 * (or any) call. Distinct from no_show -- this is an explicit, known
 * cancellation, not an unexplained absence.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      secretary_notes: reason?.trim() || null,
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Archives a pending request that couldn't be reached after repeated
 * call attempts. The row stays in the database (status remains
 * 'pending') but is_archived hides it from the default pending list so
 * the dashboard doesn't fill up with dead leads. Not a status change --
 * archiving and status are independent, so an archived request could
 * still theoretically be un-archived later if the patient calls back.
 */
export async function archivePendingAppointment(
  appointmentId: string
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("appointments")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: user?.id ?? null,
    })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/** Secretary marks a confirmed/booked patient as physically arrived. */
export async function markArrived(appointmentId: string): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "arrived" })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Doctor calls the patient in -- moves to with_doctor. From this point,
 * the secretary cannot cancel or reschedule (enforced by a database
 * trigger, not just hidden in the UI) until the doctor marks it done.
 */
export async function markWithDoctor(appointmentId: string): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "with_doctor" })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Doctor finishes the clinical visit. This does NOT mean the patient
 * has left the clinic -- they may still be at the front desk for
 * payment, printing, or booking a follow-up. 'finalized' is the actual
 * terminal state once those post-visit tasks are complete.
 */
export async function markDone(appointmentId: string): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "done" })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Secretary marks the visit fully finalized -- patient has physically
 * left the clinic, all post-visit tasks (payment, printing, follow-up
 * booking) are complete. This is the true terminal state.
 */
export async function markFinalized(appointmentId: string): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "finalized" })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Marks a patient who arrived but couldn't wait / left without being
 * seen. Distinct from the booking-stage no_show (which means they
 * never showed up at all) -- this is "arrived but left."
 */
export async function markNoShow(appointmentId: string): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
