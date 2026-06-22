"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SubmitBookingRequestInput {
  clinicSlug: string;
  fullName: string;
  phone: string;
  preferredDate: string; // YYYY-MM-DD
  period: "morning" | "afternoon";
  notes?: string;
}

export interface SubmitBookingRequestResult {
  success: boolean;
  error?: string;
}

/**
 * Public, unauthenticated booking request. Anyone with the clinic's
 * /book/[slug] link can submit this — there is no logged-in user, so we
 * use the admin client (bypasses RLS) and instead scope everything
 * manually to the clinic resolved from the slug in the URL.
 *
 * This is intentionally a LIGHTWEIGHT submission: name, phone, a
 * preferred date, and a period (morning/afternoon) — no time slot yet.
 * The secretary fills in the rest (address, insurance, exact time) when
 * she calls the patient back. This mirrors the original Streamlit flow.
 *
 * Returning-patient matching: if a patient with this phone number
 * already exists in this clinic, we reuse that patient record instead
 * of creating a duplicate, and mark the visit_type as 'followup'.
 */
export async function submitBookingRequest(
  input: SubmitBookingRequestInput
): Promise<SubmitBookingRequestResult> {
  const supabase = createAdminClient();

  if (!input.fullName?.trim()) {
    return { success: false, error: "Name is required." };
  }
  if (!input.phone?.trim()) {
    return { success: false, error: "Phone number is required." };
  }
  if (!input.preferredDate) {
    return { success: false, error: "Preferred date is required." };
  }

  // Resolve clinic from slug — never trust a client-supplied clinic_id.
  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, is_active")
    .eq("slug", input.clinicSlug)
    .single();

  if (clinicError || !clinic) {
    return { success: false, error: "This clinic booking page could not be found." };
  }
  if (!clinic.is_active) {
    return { success: false, error: "This clinic is not currently accepting online bookings." };
  }

  const normalizedPhone = input.phone.trim();

  // Match returning patient by phone within this clinic only.
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("clinic_id", clinic.id)
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  let patientId: string;
  let visitType: "new" | "followup";

  if (existingPatient) {
    patientId = existingPatient.id;
    visitType = "followup";
  } else {
    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinic.id,
        full_name: input.fullName.trim(),
        phone: normalizedPhone,
      })
      .select("id")
      .single();

    if (patientError || !newPatient) {
      return { success: false, error: "Could not save your information. Please try again." };
    }

    patientId = newPatient.id;
    visitType = "new";
  }

  const { error: apptError } = await supabase.from("appointments").insert({
    clinic_id: clinic.id,
    patient_id: patientId,
    doctor_id: null,
    appt_date: input.preferredDate,
    start_time: null,
    visit_type: visitType,
    status: "pending",
    period: input.period,
    heard_from: "online_booking",
    secretary_notes: input.notes?.trim() || null,
  });

  if (apptError) {
    return { success: false, error: "Could not save your request. Please try again." };
  }

  return { success: true };
}
