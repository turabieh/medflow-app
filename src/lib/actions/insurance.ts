"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireStaffAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile, error } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) return { ok: false as const, error: "Could not resolve your account." };
  if (!["admin", "doctor"].includes(profile.role)) {
    return { ok: false as const, error: "Only admins and doctors can manage insurance companies." };
  }

  return { ok: true as const, supabase, clinicId: profile.clinic_id };
}

export interface AddInsuranceCompanyInput {
  name: string;
  nameAr?: string;
  portalUrl?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isCovered: boolean;
}

export async function addInsuranceCompany(input: AddInsuranceCompanyInput) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.name?.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const { error } = await auth.supabase.from("insurance_companies").insert({
    clinic_id: auth.clinicId,
    name: input.name.trim(),
    name_ar: input.nameAr?.trim() || null,
    portal_url: input.portalUrl?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    is_covered: input.isCovered,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This insurance company already exists." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/insurance");
  return { success: true };
}

export async function toggleInsuranceCompanyActive(companyId: string, isActive: boolean) {
  const auth = await requireStaffAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("insurance_companies")
    .update({ is_active: isActive })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/insurance");
  return { success: true };
}
