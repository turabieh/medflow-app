"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Admins only." };
  return { ok: true as const, supabase, userId: user.id, clinicId: profile.clinic_id };
}

export async function addExpense(input: {
  expenseDate: string;
  category: string;
  description?: string;
  amount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("expenses").insert({
    clinic_id:    auth.clinicId,
    expense_date: input.expenseDate,
    category:     input.category.trim(),
    description:  input.description?.trim() || null,
    amount:       input.amount,
    notes:        input.notes?.trim() || null,
    created_by:   auth.userId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  await auth.supabase.from("expenses").delete().eq("id", id).eq("clinic_id", auth.clinicId);
  revalidatePath("/admin/finance");
  return { success: true };
}

export async function upsertStaffSalary(input: {
  userId: string;
  monthlySalary: number;
  effectiveFrom: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await getAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("staff_salaries").upsert({
    clinic_id:      auth.clinicId,
    user_id:        input.userId,
    monthly_salary: input.monthlySalary,
    effective_from: input.effectiveFrom,
    notes:          input.notes?.trim() || null,
  }, { onConflict: "clinic_id,user_id,effective_from" });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/finance");
  return { success: true };
}
