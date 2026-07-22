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

/** Get next sequential claim number for this clinic — never reuses deleted numbers */
async function nextClaimNumber(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, clinicId: string, suffix = ""): Promise<string> {
  const year = new Date().getFullYear();

  // Upsert the sequence row and increment atomically
  const { data } = await supabase.rpc("increment_claim_seq", { p_clinic_id: clinicId }).single() as { data: number | null };
  let seq = data ?? 1;

  if (!data) {
    // Fallback: count existing claims including deleted ones via max seq
    const { data: maxRow } = await supabase
      .from("hospital_claims")
      .select("claim_seq")
      .eq("clinic_id", clinicId)
      .order("claim_seq", { ascending: false })
      .limit(1)
      .single();
    seq = (maxRow?.claim_seq ?? 0) + 1;
  }

  return `CLM-${year}-${String(seq).padStart(3, "0")}${suffix}`;
}

/** Compute total amount for a hospital/doctor in a date range */
async function computeClaimTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  doctorId: string,
  hospitalId: string,
  fromDate: string,
  toDate: string
): Promise<number> {
  const { data: inpatients } = await supabase
    .from("inpatients").select("id")
    .eq("hospital_id", hospitalId).eq("clinic_id", clinicId).eq("doctor_id", doctorId);

  const ids = (inpatients ?? []).map(i => i.id);
  if (!ids.length) return 0;

  const { data: visits } = await supabase
    .from("visits").select("id, visit_fee")
    .in("inpatient_id", ids)
    .gte("visit_date", fromDate).lte("visit_date", toDate)
    .in("status", ["done", "finalized"])
    .not("visit_fee", "is", null)
    .gt("visit_fee", 0);

  const visitIds = (visits ?? []).map(v => v.id);
  let procTotal = 0;
  if (visitIds.length) {
    const { data: procs } = await supabase
      .from("inpatient_visit_procedures").select("price").in("visit_id", visitIds);
    procTotal = (procs ?? []).reduce((s, p) => s + (p.price ?? 0), 0);
  }
  return (visits ?? []).reduce((s, v) => s + (v.visit_fee ?? 0), 0) + procTotal;
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

  // Check for overlapping claims for same hospital (excluding follow-ups)
  const { data: existing } = await auth.supabase
    .from("hospital_claims")
    .select("claim_number, from_date, to_date")
    .eq("clinic_id", auth.clinicId)
    .eq("hospital_id", input.hospitalId)
    .eq("is_followup", false)
    .lte("from_date", input.toDate)
    .gte("to_date", input.fromDate);

  if (existing && existing.length > 0) {
    const overlap = existing[0];
    return {
      success: false,
      error: `Overlapping claim exists: ${overlap.claim_number} covers ${overlap.from_date} → ${overlap.to_date}. Delete it first or choose a non-overlapping period.`,
    };
  }

  const total = await computeClaimTotal(auth.supabase, auth.clinicId, auth.userId, input.hospitalId, input.fromDate, input.toDate);

  // Simple sequential number: max existing seq + 1 (safe without RPC)
  const { data: maxRow } = await auth.supabase
    .from("hospital_claims").select("claim_seq")
    .eq("clinic_id", auth.clinicId)
    .order("claim_seq", { ascending: false })
    .limit(1).single();
  const seq = (maxRow?.claim_seq ?? 0) + 1;
  const year = new Date().getFullYear();
  const claimNumber = `CLM-${year}-${String(seq).padStart(3, "0")}`;

  const { data: claim, error } = await auth.supabase
    .from("hospital_claims").insert({
      clinic_id:     auth.clinicId,
      hospital_id:   input.hospitalId,
      doctor_id:     auth.userId,
      claim_number:  claimNumber,
      claim_seq:     seq,
      from_date:     input.fromDate,
      to_date:       input.toDate,
      total_claimed: total > 0 ? total : input.totalClaimed,
      notes:         input.notes?.trim() || null,
      status:        "submitted",
      is_followup:   false,
    }).select("id").single();

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
    .from("hospital_claims")
    .select("total_claimed, is_followup, parent_claim_id")
    .eq("id", claimId).single();

  const isFullyPaid = totalPaid >= (claim?.total_claimed ?? 0);
  const status = isFullyPaid ? "paid" : "partial";

  const { error } = await auth.supabase
    .from("hospital_claims")
    .update({ total_paid: totalPaid, paid_date: paidDate, status, updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };

  // If this follow-up is fully paid, also close the parent claim
  if (isFullyPaid && claim?.is_followup && claim?.parent_claim_id) {
    await auth.supabase.from("hospital_claims")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  revalidatePath("/doctor/claims");
  return { success: true };
}

export async function closeClaimAtPartial(claimId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("hospital_claims").select("total_paid, is_followup, parent_claim_id").eq("id", claimId).single();
  if (!claim?.total_paid) return { success: false, error: "No payment recorded yet." };

  const { error } = await auth.supabase
    .from("hospital_claims")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };

  // Close parent too if this is a follow-up
  if (claim.is_followup && claim.parent_claim_id) {
    await auth.supabase.from("hospital_claims")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  revalidatePath("/doctor/claims");
  return { success: true };
}

export async function createFollowUpClaim(
  originalClaimId: string,
): Promise<{ success: boolean; error?: string; claimId?: string; claimNumber?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // Fetch fresh values from DB
  const { data: original } = await auth.supabase
    .from("hospital_claims")
    .select("hospital_id, from_date, to_date, claim_number, claim_seq, total_claimed, total_paid")
    .eq("id", originalClaimId).single();

  if (!original) return { success: false, error: "Original claim not found." };

  // Outstanding = what was claimed minus what was paid
  const outstanding = Math.max(0, (original.total_claimed ?? 0) - (original.total_paid ?? 0));
  if (outstanding <= 0) return { success: false, error: "No outstanding balance." };

  // Follow-up gets next seq number with -FU suffix
  const { data: maxRow } = await auth.supabase
    .from("hospital_claims").select("claim_seq")
    .eq("clinic_id", auth.clinicId)
    .order("claim_seq", { ascending: false })
    .limit(1).single();
  const seq = (maxRow?.claim_seq ?? 0) + 1;
  const year = new Date().getFullYear();
  const claimNumber = `CLM-${year}-${String(seq).padStart(3, "0")}-FU`;

  const { data: claim, error } = await auth.supabase
    .from("hospital_claims").insert({
      clinic_id:      auth.clinicId,
      hospital_id:    original.hospital_id,
      doctor_id:      auth.userId,
      claim_number:   claimNumber,
      claim_seq:      seq,
      parent_claim_id: originalClaimId,
      is_followup:    true,
      from_date:      original.from_date,
      to_date:        original.to_date,
      // Follow-up only claims the OUTSTANDING amount — not duplicating the original
      total_claimed:  outstanding,
      notes:          `Follow-up to ${original.claim_number}. Original: ${original.total_claimed} JOD | Paid: ${original.total_paid ?? 0} JOD | Outstanding: ${outstanding} JOD`,
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

export async function deleteClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // If deleting a follow-up, revert parent to submitted
  const { data: claim } = await auth.supabase
    .from("hospital_claims").select("is_followup, parent_claim_id").eq("id", claimId).single();

  if (claim?.is_followup && claim?.parent_claim_id) {
    await auth.supabase.from("hospital_claims")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  const { error } = await auth.supabase
    .from("hospital_claims").delete()
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/doctor/claims");
  return { success: true };
}
