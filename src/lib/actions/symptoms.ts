"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { ok: false as const, error: "Could not resolve your account." };
  }

  if (profile.role !== "admin" && profile.role !== "doctor") {
    return { ok: false as const, error: "Only admins and doctors can manage the symptoms checklist." };
  }

  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export async function addSymptom(name: string, nameAr?: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!name?.trim()) {
    return { success: false, error: "Symptom name is required." };
  }

  const { error } = await auth.supabase.from("symptoms_catalog").insert({
    clinic_id: auth.clinicId,
    name: name.trim(),
    name_ar: nameAr?.trim() || null,
  });

  if (error) {
    // Unique constraint violation -> friendlier message
    if (error.code === "23505") {
      return { success: false, error: "This symptom already exists." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/symptoms");
  return { success: true };
}

export async function toggleSymptomActive(symptomId: string, isActive: boolean) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("symptoms_catalog")
    .update({ is_active: isActive })
    .eq("id", symptomId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/symptoms");
  return { success: true };
}
