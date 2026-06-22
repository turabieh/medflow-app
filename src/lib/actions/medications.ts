"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "doctor"].includes(profile.role)) {
    return { ok: false as const, error: "Not authorized." };
  }
  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export async function addMedication(input: {
  name: string;
  nameAr?: string;
  defaultDose?: string;
  defaultUnit?: string;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "Medication name is required." };

  const { error } = await auth.supabase.from("medications_catalog").insert({
    clinic_id: auth.clinicId,
    name: input.name.trim(),
    name_ar: input.nameAr?.trim() || null,
    default_dose: input.defaultDose?.trim() || null,
    default_unit: input.defaultUnit?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "This medication already exists." };
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings/medications");
  return { success: true };
}

export async function toggleMedicationActive(id: string, isActive: boolean) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("medications_catalog").update({ is_active: isActive }).eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/medications");
  return { success: true };
}

export async function updateMedication(id: string, input: {
  name: string;
  nameAr?: string;
  defaultDose?: string;
  defaultUnit?: string;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "Name is required." };

  const { error } = await auth.supabase
    .from("medications_catalog")
    .update({
      name: input.name.trim(),
      name_ar: input.nameAr?.trim() || null,
      default_dose: input.defaultDose?.trim() || null,
      default_unit: input.defaultUnit?.trim() || null,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/medications");
  return { success: true };
}
