"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const hasName = input.firstName?.trim() || input.fullName?.trim();
  if (!hasName || !input.phone?.trim()) {
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
      full_name: (input.firstName?.trim() ? [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ") : input.fullName).trim(),
      full_name_ar: (input.firstNameAr?.trim() ? [input.firstNameAr, input.middleNameAr, input.lastNameAr].filter(Boolean).join(" ") : input.fullNameAr?.trim()) || null,
      first_name: input.firstName?.trim() || input.fullName.trim(),
      middle_name: input.middleName?.trim() || null,
      last_name: input.lastName?.trim() || null,
      first_name_ar: input.firstNameAr?.trim() || null,
      middle_name_ar: input.middleNameAr?.trim() || null,
      last_name_ar: input.lastNameAr?.trim() || null,
      mrn: input.mrn?.trim() || undefined,
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
  const admin    = createAdminClient();

  // Fetch appointment first so we know all fields for visit creation
  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, clinic_id, patient_id, doctor_id, visit_type, appt_date")
    .eq("id", appointmentId)
    .single();

  if (apptError || !appt) return { success: false, error: "Could not find appointment." };

  // Update status
  const { error } = await supabase
    .from("appointments")
    .update({ status: "with_doctor" })
    .eq("id", appointmentId);

  if (error) return { success: false, error: error.message };

  // Fetch vitals saved by secretary
  const { data: apptVitals } = await supabase
    .from("appointments")
    .select("vital_heart_rate, vital_bp, vital_temperature, vital_o2_saturation, vital_resp_rate, vital_weight_kg, vital_height_cm")
    .eq("id", appointmentId)
    .single();

  // Upsert visit record using admin client (bypasses RLS).
  // onConflict:"appointment_id" means safe to call multiple times.
  const { error: visitError } = await admin.from("visits").upsert(
    {
      clinic_id:          appt.clinic_id,
      patient_id:         appt.patient_id,
      doctor_id:          appt.doctor_id,
      appointment_id:     appt.id,
      visit_date:         appt.appt_date,
      visit_type:         appt.visit_type,
      status:             "in_progress",
      heart_rate:         apptVitals?.vital_heart_rate        ?? null,
      blood_pressure:     apptVitals?.vital_bp                ?? null,
      temperature:        apptVitals?.vital_temperature       ?? null,
      oxygen_saturation:  apptVitals?.vital_o2_saturation     ?? null,
      resp_rate:          apptVitals?.vital_resp_rate         ?? null,
      weight_kg:          apptVitals?.vital_weight_kg         ?? null,
      height_cm:          apptVitals?.vital_height_cm         ?? null,
    },
    { onConflict: "appointment_id" }
  );

  if (visitError) {
    // Log but don't fail — appointment status was already updated
    console.error("[markWithDoctor] visit upsert failed:", visitError.message, visitError.details);
  }

  revalidatePath("/dashboard");
  revalidatePath("/secretary/dashboard");
  revalidatePath("/doctor/dashboard");
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

export interface BookWalkInInput {
  clinicId: string;
  patientId: string;
  doctorId: string;
  apptDate: string;
  startTime: string;
  visitType: VisitType;
  secretaryNotes?: string;
  symptomIds: string[];
}

/**
 * Books a walk-in or manually-created appointment — skips the pending
 * state entirely since the secretary is booking on behalf of a patient
 * who is present or on the phone, so a time slot is assigned immediately.
 * Status goes directly to 'booked'.
 */
export async function bookWalkInAppointment(
  input: BookWalkInInput
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };
  if (!input.patientId) return { success: false, error: "Patient is required." };
  if (!input.doctorId) return { success: false, error: "Doctor is required." };
  if (!input.startTime) return { success: false, error: "Time slot is required." };

  const endTime = computeEndTime(input.startTime, input.visitType, DEFAULT_SCHEDULE_SETTINGS);

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      clinic_id: input.clinicId,
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      appt_date: input.apptDate,
      start_time: input.startTime,
      end_time: endTime,
      visit_type: input.visitType,
      status: "booked",
      heard_from: "walk_in",
      secretary_notes: input.secretaryNotes?.trim() || null,
    })
    .select("id")
    .single();

  if (apptError || !appt) {
    return { success: false, error: apptError?.message ?? "Could not create appointment." };
  }

  if (input.symptomIds.length > 0) {
    await supabase.from("appointment_symptoms").insert(
      input.symptomIds.map((symptomId) => ({
        appointment_id: appt.id,
        symptom_id: symptomId,
      }))
    );
  }

  revalidatePath("/secretary/appointments");
  revalidatePath("/secretary/dashboard");
  return { success: true };
}

export interface SaveVitalsInput {
  appointmentId: string;
  heartRate?: number;
  bp?: string;
  temperature?: number;
  o2Saturation?: number;
  respRate?: number;
  weightKg?: number;
  heightCm?: number;
}

export async function saveVitals(input: SaveVitalsInput): Promise<ConfirmBookingResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("appointments")
    .update({
      vital_heart_rate:    input.heartRate    ?? null,
      vital_bp:            input.bp?.trim()   || null,
      vital_temperature:   input.temperature  ?? null,
      vital_o2_saturation: input.o2Saturation ?? null,
      vital_resp_rate:     input.respRate     ?? null,
      vital_weight_kg:     input.weightKg     ?? null,
      vital_height_cm:     input.heightCm     ?? null,
      vitals_recorded_at:  new Date().toISOString(),
    })
    .eq("id", input.appointmentId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/secretary/dashboard");
  return { success: true };
}

export async function confirmPayment(
  appointmentId: string,
  data: {
    paymentMethod:        "cash" | "card" | "insurance" | "other";
    visitFee:             number;
    patientCashAmount:    number;
    insuranceClaimAmount: number;
    patientPaymentMethod?: "cash" | "card" | "other";
  }
): Promise<ConfirmBookingResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("appointments")
    .update({
      payment_method:         data.paymentMethod,
      visit_fee:              data.visitFee        || null,
      payment_amount:         data.patientCashAmount,
      patient_cash_amount:    data.patientCashAmount,
      insurance_claim_amount: data.insuranceClaimAmount,
      patient_payment_method: data.patientPaymentMethod ?? null,
      payment_confirmed:      true,
      payment_confirmed_at:   new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/secretary/dashboard");
  return { success: true };
}

