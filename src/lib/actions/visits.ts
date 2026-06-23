"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getClinicId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (!profile) return { ok: false as const, error: "Profile not found." };
  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

function revalidateVisit(visitId: string) {
  revalidatePath(`/doctor/visit/${visitId}`);
}

// ── Vitals ──────────────────────────────────────────────────────────────────

export async function saveVitalsToVisit(visitId: string, data: {
  heartRate?: number | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  respRate?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
}) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("visits").update({
    heart_rate:        data.heartRate ?? null,
    blood_pressure:    data.bloodPressure?.trim() || null,
    temperature:       data.temperature ?? null,
    oxygen_saturation: data.oxygenSaturation ?? null,
    resp_rate:         data.respRate ?? null,
    weight_kg:         data.weightKg ?? null,
    height_cm:         data.heightCm ?? null,
    updated_at:        new Date().toISOString(),
  }).eq("id", visitId);

  if (error) return { success: false, error: error.message };
  revalidateVisit(visitId);
  return { success: true };
}

// ── Symptoms ─────────────────────────────────────────────────────────────────

export async function saveVisitSymptoms(visitId: string, symptomIds: string[]) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };

  // Clear and re-insert
  await auth.supabase.from("visit_symptoms").delete().eq("visit_id", visitId);

  if (symptomIds.length > 0) {
    const { error } = await auth.supabase.from("visit_symptoms").insert(
      symptomIds.map((sid) => ({
        visit_id:  visitId,
        clinic_id: auth.clinicId,
        symptom_id: sid,
      }))
    );
    if (error) return { success: false, error: error.message };
  }

  revalidateVisit(visitId);
  return { success: true };
}

// ── Labs & Imaging ────────────────────────────────────────────────────────────

export async function addLab(visitId: string, data: {
  type: "lab" | "imaging" | "other";
  name: string;
  labDate?: string;
  findings?: string;
  linkUrl?: string;
}) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.name?.trim()) return { success: false, error: "Name is required." };

  const { error } = await auth.supabase.from("visit_labs").insert({
    visit_id:  visitId,
    clinic_id: auth.clinicId,
    type:      data.type,
    name:      data.name.trim(),
    lab_date:  data.labDate || null,
    findings:  data.findings?.trim() || null,
    link_url:  data.linkUrl?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidateVisit(visitId);
  return { success: true };
}

export async function deleteLab(labId: string, visitId: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("visit_labs").delete().eq("id", labId);
  revalidateVisit(visitId);
  return { success: true };
}

// ── Medications / Prescriptions ───────────────────────────────────────────────

export async function addPrescription(visitId: string, data: {
  medicationId?: string;
  medicationName: string;
  dose?: string;
  unit?: string;
  instructions?: string;
  duration?: string;
}) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.medicationName?.trim()) return { success: false, error: "Medication name is required." };

  const { error } = await auth.supabase.from("prescriptions").insert({
    clinic_id:       auth.clinicId,
    visit_id:        visitId,
    medication_id:   data.medicationId || null,
    medication_name: data.medicationName.trim(),
    dose:            data.dose?.trim() || null,
    unit:            data.unit?.trim() || null,
    instructions:    data.instructions?.trim() || null,
    duration:        data.duration?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidateVisit(visitId);
  return { success: true };
}

export async function deletePrescription(prescriptionId: string, visitId: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("prescriptions").delete().eq("id", prescriptionId);
  revalidateVisit(visitId);
  return { success: true };
}

// ── Diagnoses ─────────────────────────────────────────────────────────────────

export async function addDiagnosis(visitId: string, data: {
  icdCode?: string;
  description: string;
  isPrimary: boolean;
}) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.description?.trim()) return { success: false, error: "Description is required." };

  const { error } = await auth.supabase.from("visit_diagnoses").insert({
    visit_id:    visitId,
    clinic_id:   auth.clinicId,
    icd_code:    data.icdCode?.trim() || null,
    description: data.description.trim(),
    is_primary:  data.isPrimary,
  });

  if (error) return { success: false, error: error.message };
  revalidateVisit(visitId);
  return { success: true };
}

export async function deleteDiagnosis(diagnosisId: string, visitId: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("visit_diagnoses").delete().eq("id", diagnosisId);
  revalidateVisit(visitId);
  return { success: true };
}

// ── Mark Done ─────────────────────────────────────────────────────────────────

export async function markVisitDone(visitId: string, appointmentId: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error: visitError } = await auth.supabase
    .from("visits").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", visitId);

  const { error: apptError } = await auth.supabase
    .from("appointments").update({ status: "done" }).eq("id", appointmentId);

  if (visitError || apptError) {
    return { success: false, error: visitError?.message ?? apptError?.message ?? "Error" };
  }

  revalidateVisit(visitId);
  revalidatePath("/doctor/dashboard");
  return { success: true };
}

export async function saveVisitNotes(visitId: string, voiceNotes: string, keyPoints: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("visits").update({
    voice_notes:         voiceNotes.trim() || null,
    key_clinical_points: keyPoints.trim()  || null,
    updated_at:          new Date().toISOString(),
  }).eq("id", visitId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/doctor/visit/${visitId}`);
  return { success: true };
}

export async function saveAINote(visitId: string, clinicalNote: string) {
  const auth = await getClinicId();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("visits").update({
    clinical_note: clinicalNote.trim() || null,
    updated_at:    new Date().toISOString(),
  }).eq("id", visitId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/doctor/visit/${visitId}`);
  return { success: true };
}
