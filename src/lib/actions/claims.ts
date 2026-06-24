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

  const year = new Date().getFullYear();
  const { count } = await auth.supabase
    .from("hospital_claims")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", auth.clinicId);

  const claimNumber = `CLM-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  // Compute real total from inpatient visits in the date range for this hospital
  const { data: inpatients } = await auth.supabase
    .from("inpatients")
    .select("id")
    .eq("hospital_id", input.hospitalId)
    .eq("clinic_id", auth.clinicId)
    .eq("doctor_id", auth.userId);

  const inpatientIds = (inpatients ?? []).map(i => i.id);
  let computedTotal = 0;

  if (inpatientIds.length > 0) {
    const { data: visits } = await auth.supabase
      .from("visits")
      .select("id, visit_fee")
      .in("inpatient_id", inpatientIds)
      .gte("visit_date", input.fromDate)
      .lte("visit_date", input.toDate)
      .in("status", ["done", "finalized", "in_progress"]);

    const visitIds = (visits ?? []).map(v => v.id);
    let procTotal = 0;
    if (visitIds.length) {
      const { data: procs } = await auth.supabase
        .from("inpatient_visit_procedures")
        .select("price")
        .in("visit_id", visitIds);
      procTotal = (procs ?? []).reduce((s, p) => s + (p.price ?? 0), 0);
    }
    const visitTotal = (visits ?? []).reduce((s, v) => s + (v.visit_fee ?? 0), 0);
    computedTotal = visitTotal + procTotal;
  }

  const totalClaimed = computedTotal > 0 ? computedTotal : input.totalClaimed;

  const { data: claim, error } = await auth.supabase
    .from("hospital_claims")
    .insert({
      clinic_id:     auth.clinicId,
      hospital_id:   input.hospitalId,
      doctor_id:     auth.userId,
      claim_number:  claimNumber,
      from_date:     input.fromDate,
      to_date:       input.toDate,
      total_claimed: totalClaimed,
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

export async function closeClaimAtPartial(claimId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("hospital_claims").select("total_paid").eq("id", claimId).single();

  if (!claim?.total_paid) return { success: false, error: "No payment recorded yet." };

  const { error } = await auth.supabase
    .from("hospital_claims")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/doctor/claims");
  return { success: true };
}

export async function createFollowUpClaim(
  originalClaimId: string,
): Promise<{ success: boolean; error?: string; claimId?: string; claimNumber?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // Fetch fresh values from DB — not stale client-side state
  const { data: original } = await auth.supabase
    .from("hospital_claims")
    .select("hospital_id, from_date, to_date, claim_number, total_claimed, total_paid")
    .eq("id", originalClaimId).single();

  if (!original) return { success: false, error: "Original claim not found." };

  const remainingAmount = Math.max(0, (original.total_claimed ?? 0) - (original.total_paid ?? 0));
  if (remainingAmount <= 0) return { success: false, error: "No outstanding balance on this claim." };

  const year = new Date().getFullYear();
  const { count } = await auth.supabase
    .from("hospital_claims").select("id", { count: "exact", head: true })
    .eq("clinic_id", auth.clinicId);

  const claimNumber = `CLM-${year}-${String((count ?? 0) + 1).padStart(3, "0")}-FU`;

  const { data: claim, error } = await auth.supabase
    .from("hospital_claims").insert({
      clinic_id:     auth.clinicId,
      hospital_id:   original.hospital_id,
      doctor_id:     auth.userId,
      claim_number:  claimNumber,
      from_date:     original.from_date,
      to_date:       original.to_date,
      total_claimed: remainingAmount,
      notes:         `Follow-up to ${original.claim_number}. Original claimed: ${original.total_claimed} JOD, Paid: ${original.total_paid ?? 0} JOD, Outstanding: ${remainingAmount} JOD`,
      status:        "submitted",
    }).select("id").single();

  if (error || !claim) return { success: false, error: error?.message ?? "Failed." };

  // Mark original as partial
  await auth.supabase.from("hospital_claims")
    .update({ status: "partial", updated_at: new Date().toISOString() })
    .eq("id", originalClaimId);

  revalidatePath("/doctor/claims");
  return { success: true, claimId: claim.id, claimNumber };
}
