"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user.id).single();
  if (!profile) return { ok: false as const, error: "Profile not found." };
  return { ok: true as const, supabase, userId: profile.id, clinicId: profile.clinic_id };
}

async function nextSeq(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, clinicId: string): Promise<{ seq: number; year: number }> {
  const year = new Date().getFullYear();
  const { data: maxRow } = await supabase
    .from("insurance_claims").select("claim_seq")
    .eq("clinic_id", clinicId)
    .order("claim_seq", { ascending: false })
    .limit(1).single();
  return { seq: (maxRow?.claim_seq ?? 0) + 1, year };
}

/** Compute total claimable amount for an insurance company in a date range */
async function computeInsuranceTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  insuranceCompanyId: string,
  fromDate: string,
  toDate: string
): Promise<number> {
  // Get patients with this insurance
  const { data: patients } = await supabase
    .from("patients").select("id")
    .eq("clinic_id", clinicId)
    .eq("insurance_company_id", insuranceCompanyId);

  const patientIds = (patients ?? []).map(p => p.id);
  if (!patientIds.length) return 0;

  // Get finalized/done appointments in date range
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, insurance_fee, payment_amount")
    .in("patient_id", patientIds)
    .gte("appt_date", fromDate).lte("appt_date", toDate)
    .in("status", ["finalized", "done"]);

  const apptIds = (appts ?? []).map(a => a.id);

  // Visit fees
  const visitFeeTotal = (appts ?? []).reduce((s, a) => s + (a.insurance_fee ?? a.payment_amount ?? 0), 0);

  // Approved procedures
  let procTotal = 0;
  if (apptIds.length) {
    const { data: procs } = await supabase
      .from("outpatient_procedure_claims")
      .select("price")
      .in("appointment_id", apptIds)
      .eq("auth_status", "approved");
    procTotal = (procs ?? []).reduce((s, p) => s + (p.price ?? 0), 0);
  }

  return visitFeeTotal + procTotal;
}

export async function createInsuranceClaim(input: {
  insuranceCompanyId: string;
  fromDate: string;
  toDate: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; claimId?: string; claimNumber?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  // Check for overlapping claims (non-followup) for same insurance company
  const { data: existing } = await auth.supabase
    .from("insurance_claims")
    .select("claim_number, from_date, to_date")
    .eq("clinic_id", auth.clinicId)
    .eq("insurance_company_id", input.insuranceCompanyId)
    .eq("is_followup", false)
    .lte("from_date", input.toDate)
    .gte("to_date", input.fromDate);

  if (existing && existing.length > 0) {
    const o = existing[0];
    return {
      success: false,
      error: `Overlapping claim exists: ${o.claim_number} covers ${o.from_date} → ${o.to_date}. Delete it first or choose a different period.`,
    };
  }

  const total = await computeInsuranceTotal(auth.supabase, auth.clinicId, input.insuranceCompanyId, input.fromDate, input.toDate);
  const { seq, year } = await nextSeq(auth.supabase, auth.clinicId);
  const claimNumber = `INS-${year}-${String(seq).padStart(3, "0")}`;

  const { data: claim, error } = await auth.supabase
    .from("insurance_claims").insert({
      clinic_id:            auth.clinicId,
      insurance_company_id: input.insuranceCompanyId,
      created_by:           auth.userId,
      claim_number:         claimNumber,
      claim_seq:            seq,
      from_date:            input.fromDate,
      to_date:              input.toDate,
      total_claimed:        total,
      notes:                input.notes?.trim() || null,
      status:               "submitted",
      is_followup:          false,
    }).select("id").single();

  if (error || !claim) return { success: false, error: error?.message ?? "Failed." };
  revalidatePath("/secretary/insurance-claims");
  return { success: true, claimId: claim.id, claimNumber };
}

export async function updateInsuranceClaimPayment(
  claimId: string,
  totalPaid: number,
  paidDate: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("insurance_claims")
    .select("total_claimed, is_followup, parent_claim_id")
    .eq("id", claimId).single();

  const isFullyPaid = totalPaid >= (claim?.total_claimed ?? 0);
  const status = isFullyPaid ? "paid" : "partial";

  await auth.supabase.from("insurance_claims")
    .update({ total_paid: totalPaid, paid_date: paidDate, status, updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (isFullyPaid && claim?.is_followup && claim?.parent_claim_id) {
    await auth.supabase.from("insurance_claims")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  revalidatePath("/secretary/insurance-claims");
  return { success: true };
}

export async function createInsuranceFollowUpClaim(
  originalClaimId: string
): Promise<{ success: boolean; error?: string; claimId?: string; claimNumber?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: original } = await auth.supabase
    .from("insurance_claims")
    .select("insurance_company_id, from_date, to_date, claim_number, claim_seq, total_claimed, total_paid")
    .eq("id", originalClaimId).single();

  if (!original) return { success: false, error: "Original claim not found." };

  const outstanding = Math.max(0, (original.total_claimed ?? 0) - (original.total_paid ?? 0));
  if (outstanding <= 0) return { success: false, error: "No outstanding balance." };

  const { seq, year } = await nextSeq(auth.supabase, auth.clinicId);
  const claimNumber = `INS-${year}-${String(seq).padStart(3, "0")}-FU`;

  const { data: claim, error } = await auth.supabase
    .from("insurance_claims").insert({
      clinic_id:            auth.clinicId,
      insurance_company_id: original.insurance_company_id,
      created_by:           auth.userId,
      claim_number:         claimNumber,
      claim_seq:            seq,
      parent_claim_id:      originalClaimId,
      is_followup:          true,
      from_date:            original.from_date,
      to_date:              original.to_date,
      total_claimed:        outstanding,
      notes:                `Follow-up to ${original.claim_number}. Original: ${original.total_claimed} | Paid: ${original.total_paid ?? 0} | Outstanding: ${outstanding}`,
      status:               "submitted",
    }).select("id").single();

  if (error || !claim) return { success: false, error: error?.message ?? "Failed." };

  await auth.supabase.from("insurance_claims")
    .update({ status: "partial", updated_at: new Date().toISOString() })
    .eq("id", originalClaimId);

  revalidatePath("/secretary/insurance-claims");
  return { success: true, claimId: claim.id, claimNumber };
}

export async function closeInsuranceClaimAtPartial(claimId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("insurance_claims").select("total_paid, is_followup, parent_claim_id").eq("id", claimId).single();
  if (!claim?.total_paid) return { success: false, error: "No payment recorded yet." };

  await auth.supabase.from("insurance_claims")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  if (claim.is_followup && claim.parent_claim_id) {
    await auth.supabase.from("insurance_claims")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  revalidatePath("/secretary/insurance-claims");
  return { success: true };
}

export async function deleteInsuranceClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: claim } = await auth.supabase
    .from("insurance_claims").select("is_followup, parent_claim_id").eq("id", claimId).single();

  if (claim?.is_followup && claim?.parent_claim_id) {
    await auth.supabase.from("insurance_claims")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", claim.parent_claim_id);
  }

  await auth.supabase.from("insurance_claims").delete()
    .eq("id", claimId).eq("clinic_id", auth.clinicId);

  revalidatePath("/secretary/insurance-claims");
  return { success: true };
}

// Pre-authorization for procedures
export async function saveOutpatientProcedure(input: {
  visitId: string;
  appointmentId?: string;
  procedureId?: string;
  procedureName: string;
  price: number;
  authNumber?: string;
  authDate?: string;
  authStatus: "pending" | "approved" | "rejected" | "not_required";
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("outpatient_procedure_claims").insert({
    clinic_id:      auth.clinicId,
    visit_id:       input.visitId,
    appointment_id: input.appointmentId || null,
    procedure_id:   input.procedureId || null,
    procedure_name: input.procedureName.trim(),
    price:          input.price,
    auth_number:    input.authNumber?.trim() || null,
    auth_date:      input.authDate || null,
    auth_status:    input.authStatus,
    notes:          input.notes?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/doctor/visit/${input.visitId}`);
  return { success: true };
}

export async function updateProcedureAuth(
  id: string,
  authNumber: string,
  authDate: string,
  authStatus: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("outpatient_procedure_claims")
    .update({ auth_number: authNumber, auth_date: authDate, auth_status: authStatus })
    .eq("id", id).eq("clinic_id", auth.clinicId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteOutpatientProcedure(id: string): Promise<{ success: boolean }> {
  const auth = await getAuth();
  if (!auth.ok) return { success: false };
  await auth.supabase.from("outpatient_procedure_claims").delete().eq("id", id);
  return { success: true };
}
