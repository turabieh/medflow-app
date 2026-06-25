"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addNurseProcedure(input: {
  clinicId: string;
  name: string;
  nameAr?: string;
  category: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("nurse_procedures_catalog").insert({
    clinic_id: input.clinicId,
    name:      input.name.trim(),
    name_ar:   input.nameAr?.trim() || null,
    category:  input.category,
    notes:     input.notes?.trim() || null,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/nurse-procedures");
  return { success: true };
}

export async function toggleNurseProcedure(id: string, isActive: boolean): Promise<{ success: boolean }> {
  const supabase = await createClient();
  await supabase.from("nurse_procedures_catalog").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/nurse-procedures");
  return { success: true };
}

export async function deleteNurseProcedure(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  await supabase.from("nurse_procedures_catalog").delete().eq("id", id);
  revalidatePath("/admin/nurse-procedures");
  return { success: true };
}

// Public action — no auth required
export async function recordNurseProcedure(input: {
  inpatientId: string;
  clinicId: string;
  procedureId: string;
  procedureName: string;
  category: string;
  startedAt: string;
  notes?: string;
  recordedByName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("nurse_procedure_records").insert({
    clinic_id:        input.clinicId,
    inpatient_id:     input.inpatientId,
    procedure_id:     input.procedureId,
    procedure_name:   input.procedureName,
    category:         input.category,
    started_at:       input.startedAt,
    notes:            input.notes?.trim() || null,
    recorded_by_name: input.recordedByName?.trim() || null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
