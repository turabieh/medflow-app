"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("users").select("id, role, clinic_id").eq("id", user.id).single();
  if (!profile) return { ok: false as const, error: "Profile not found." };
  return { ok: true as const, supabase, userId: profile.id, clinicId: profile.clinic_id, role: profile.role };
}

export async function admitInpatient(input: {
  // Patient — existing or new
  patientId?: string;
  patientName?: string;
  patientNameAr?: string;
  patientDob?: string;
  patientGender?: string;
  patientPhone?: string;
  patientBloodType?: string;
  patientAllergies?: string;
  // Admission
  hospitalId: string;
  hospitalPatientId?: string;
  admissionDate: string;
  location: string;
  diagnosisSummary?: string;
  feePerVisit?: number;
}): Promise<{ success: boolean; error?: string; inpatientId?: string; patientId?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  let patientId = input.patientId;

  // Create patient if not existing
  if (!patientId) {
    if (!input.patientName || !input.patientPhone) {
      return { success: false, error: "Patient name and phone are required for new patients." };
    }
    const { data: newPatient, error: patientError } = await auth.supabase
      .from("patients").insert({
        clinic_id:    auth.clinicId,
        full_name:    input.patientName.trim(),
        full_name_ar: input.patientNameAr?.trim() || null,
        dob:          input.patientDob || null,
        gender:       input.patientGender || null,
        phone:        input.patientPhone.trim(),
        blood_type:   input.patientBloodType || null,
        allergies:    input.patientAllergies?.trim() || null,
      }).select("id").single();

    if (patientError || !newPatient) {
      return { success: false, error: patientError?.message ?? "Could not create patient." };
    }
    patientId = newPatient.id;
  }

  const { data: inpatient, error } = await auth.supabase
    .from("inpatients").insert({
      clinic_id:           auth.clinicId,
      patient_id:          patientId,
      hospital_id:         input.hospitalId || null,
      hospital_patient_id: input.hospitalPatientId?.trim() || null,
      doctor_id:           auth.userId,
      admission_date:      input.admissionDate,
      location:            input.location.trim(),
      diagnosis_summary:   input.diagnosisSummary?.trim() || null,
      fee_per_visit:       input.feePerVisit || null,
      status:              "active",
    }).select("id").single();

  if (error || !inpatient) return { success: false, error: error?.message ?? "Could not admit patient." };

  revalidatePath("/doctor/inpatients");
  return { success: true, inpatientId: inpatient.id, patientId };
}

export async function createInpatientVisit(inpatientId: string, visitDate: string): Promise<{ success: boolean; error?: string; visitId?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // Get inpatient record
  const { data: admission } = await auth.supabase
    .from("inpatients").select("patient_id, doctor_id").eq("id", inpatientId).single();
  if (!admission) return { success: false, error: "Inpatient record not found." };

  const { data: visit, error } = await auth.supabase
    .from("visits").insert({
      clinic_id:     auth.clinicId,
      patient_id:    admission.patient_id,
      doctor_id:     auth.userId,
      inpatient_id:  inpatientId,
      visit_context: "inpatient",
      visit_date:    visitDate,
      visit_type:    "follow_up",
      status:        "in_progress",
    }).select("id").single();

  if (error || !visit) return { success: false, error: error?.message ?? "Could not create visit." };

  revalidatePath("/doctor/inpatients");
  revalidatePath(`/doctor/inpatients/${inpatientId}`);
  return { success: true, visitId: visit.id };
}

export async function dischargeInpatient(inpatientId: string, dischargeDate: string, dischargeNotes?: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("inpatients").update({
      status:          "discharged",
      discharge_date:  dischargeDate,
      discharge_notes: dischargeNotes?.trim() || null,
      updated_at:      new Date().toISOString(),
    }).eq("id", inpatientId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/doctor/inpatients");
  revalidatePath(`/doctor/inpatients/${inpatientId}`);
  return { success: true };
}

export async function updateInpatientLocation(inpatientId: string, location: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("inpatients").update({ location: location.trim(), updated_at: new Date().toISOString() })
    .eq("id", inpatientId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/doctor/inpatients/${inpatientId}`);
  return { success: true };
}
