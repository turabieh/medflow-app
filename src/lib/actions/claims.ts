"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile) return { ok: false as const, error: "Profile not found." };
  return { ok: true as const, supabase, userId: profile.id, clinicId: profile.clinic_id };
}

export async function createClaim(input: {
  hospitalId: string;
  fromDate: string;
  toDate: string;
  totalClaimed: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; claimId?: string; claimNumber?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // Generate claim number: CLM-YYYY-NNN per clinic
  const year = new Date().getFullYear();
  const { count } = await auth.supabase
    .from("hospital_claims")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", auth.clinicId);

  const claimNumber = `CLM-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: claim, error } = await auth.supabase
    .from("hospital_claims")
    .insert({
      clinic_id:     auth.clinicId,
      hospital_id:   input.hospitalId,
      doctor_id:     auth.userId,
      claim_number:  claimNumber,
      from_date:     input.fromDate,
      to_date:       input.toDate,
      total_claimed: input.totalClaimed,
      notes:         input.notes?.trim() || null,
      status:        "submitted",
    })
    .select("id")
    .single();

  if (error || !claim) return { success: false, error: error?.message ?? "Failed." };
  revalidatePath("/doctor/claims");
  return { success: true, claimId: claim.id, claimNumber };
}

export async function updateClaimPayment(
  claimId: string,
  totalPaid: number,
  paidDate: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("hospital_claims").select("total_claimed").eq("id", claimId).single();

  const status = totalPaid >= (claim?.total_claimed ?? 0) ? "paid" : "partial";

  const { error } = await auth.supabase
    .from("hospital_claims")
    .update({ total_paid: totalPaid, paid_date: paidDate, status, updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/doctor/claims");
  return { success: true };
}
