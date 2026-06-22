"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireStaffAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile, error } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();

  if (error || !profile) return { ok: false as const, error: "Could not resolve your account." };
  if (!["admin", "doctor"].includes(profile.role)) {
    return { ok: false as const, error: "Only admins and doctors can manage procedures." };
  }
  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export interface AddProcedureInput {
  name: string;
  nameAr?: string;
  category?: string;
  outpatientPrice: number;
  inpatientPrice?: number;
  durationMinutes?: number;
  notes?: string;
}

export async function addProcedure(input: AddProcedureInput) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.name?.trim()) return { success: false, error: "Procedure name is required." };
  if (input.outpatientPrice < 0) return { success: false, error: "Price cannot be negative." };

  const { error } = await auth.supabase.from("procedures_catalog").insert({
    clinic_id: auth.clinicId,
    name: input.name.trim(),
    name_ar: input.nameAr?.trim() || null,
    category: input.category?.trim() || null,
    outpatient_price: input.outpatientPrice,
    inpatient_price: input.inpatientPrice ?? null,
    duration_minutes: input.durationMinutes ?? null,
    notes: input.notes?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "This procedure already exists." };
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/procedures");
  return { success: true };
}

export async function toggleProcedureActive(procedureId: string, isActive: boolean) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("procedures_catalog").update({ is_active: isActive }).eq("id", procedureId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/procedures");
  return { success: true };
}

export async function updateProcedure(id: string, input: {
  name: string;
  nameAr?: string;
  category?: string;
  outpatientPrice: number;
  inpatientPrice?: number;
  durationMinutes?: number;
  notes?: string;
}) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "Name is required." };

  const { error } = await auth.supabase
    .from("procedures_catalog")
    .update({
      name: input.name.trim(),
      name_ar: input.nameAr?.trim() || null,
      category: input.category?.trim() || null,
      outpatient_price: input.outpatientPrice,
      inpatient_price: input.inpatientPrice ?? null,
      duration_minutes: input.durationMinutes ?? null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/insurance");
  revalidatePath("/settings/procedures");
  return { success: true };
}
