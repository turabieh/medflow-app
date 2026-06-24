"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deletePatient(
  patientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users").select("role, clinic_id").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { success: false, error: "Only admins can delete patients." };
  }

  // Verify patient belongs to this clinic
  const { data: patient } = await supabase
    .from("patients").select("id, clinic_id").eq("id", patientId).single();
  if (!patient || patient.clinic_id !== profile.clinic_id) {
    return { success: false, error: "Patient not found in this clinic." };
  }

  const admin = createAdminClient();

  // 1. Get all visit IDs and appointment IDs for this patient
  const { data: visits } = await admin.from("visits").select("id").eq("patient_id", patientId);
  const { data: appointments } = await admin.from("appointments").select("id").eq("patient_id", patientId);
  const visitIds = (visits ?? []).map(v => v.id);
  const apptIds = (appointments ?? []).map(a => a.id);

  // 2. Delete visit sub-records
  if (visitIds.length) {
    await admin.from("visit_diagnoses").delete().in("visit_id", visitIds);
    await admin.from("visit_labs").delete().in("visit_id", visitIds);
    await admin.from("prescriptions").delete().in("visit_id", visitIds);
  }
  // Also delete prescriptions by patient_id in case some aren't linked to a visit
  await admin.from("prescriptions").delete().eq("patient_id", patientId);

  // 3. Delete appointment sub-records
  if (apptIds.length) {
    await admin.from("appointment_symptoms").delete().in("appointment_id", apptIds);
  }

  // 4. Delete main records
  await admin.from("visits").delete().eq("patient_id", patientId);
  await admin.from("appointments").delete().eq("patient_id", patientId);

  // 5. Finally delete the patient
  const { error } = await admin.from("patients").delete().eq("id", patientId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/patients");
  return { success: true };
}
