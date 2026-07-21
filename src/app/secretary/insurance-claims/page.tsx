import { createClient } from "@/lib/supabase/server";
import { InsuranceClaimsManager } from "./insurance-claims-manager";

export const dynamic = "force-dynamic";

export default async function SecretaryInsuranceClaimsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user?.id ?? "").single();

  const { data: insuranceCompanies } = await supabase
    .from("insurance_companies")
    .select("id, name, name_ar, phone, email, portal_url")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  const { data: claims } = await supabase
    .from("insurance_claims")
    .select("id, claim_number, claim_seq, from_date, to_date, total_claimed, total_paid, paid_date, status, notes, created_at, is_followup, parent_claim_id, insurance_companies(name)")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .order("claim_seq", { ascending: false });

  const { data: clinicSetting } = await supabase
    .from("clinic_settings").select("value").eq("clinic_id", profile?.clinic_id ?? "").eq("key", "currency").single();
  const currency = clinicSetting?.value ?? "JOD";

  // Fetch unclaimed appointments grouped by company
  const { data: unclaimedAppts } = await supabase
    .from("appointments")
    .select("id, appt_date, insurance_claim_amount, insurance_fee, patients(insurance_company_id, insurance_companies(id, name))")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("payment_method", "insurance")
    .eq("payment_confirmed", true)
    .in("status", ["done","finalized"]);

  const { data: claimedLinks } = await supabase
    .from("insurance_claim_appointments").select("appointment_id");
  const claimedSet = new Set((claimedLinks ?? []).map((r: any) => r.appointment_id));

  const companyMap = new Map<string, { id:string; name:string; amount:number; count:number; from:string; to:string }>();
  for (const a of (unclaimedAppts ?? []).filter((a: any) => !claimedSet.has(a.id))) {
    const pt  = Array.isArray(a.patients) ? a.patients[0] : a.patients as any;
    const ins = pt?.insurance_companies ? (Array.isArray(pt.insurance_companies) ? pt.insurance_companies[0] : pt.insurance_companies) as { id:string; name:string }|null : null;
    if (!ins?.id || !a.appt_date) continue;
    const amt = (a.insurance_claim_amount ?? a.insurance_fee) ?? 0;
    if (amt <= 0) continue;
    const e = companyMap.get(ins.id) ?? { id:ins.id, name:ins.name, amount:0, count:0, from:a.appt_date, to:a.appt_date };
    e.amount += amt; e.count++;
    if (a.appt_date < e.from) e.from = a.appt_date;
    if (a.appt_date > e.to)   e.to   = a.appt_date;
    companyMap.set(ins.id, e);
  }
  const readyToClaim = Array.from(companyMap.values()).sort((a,b)=>b.amount-a.amount);

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Insurance Claims</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Submit billing claims to insurance companies and track payments.
      </p>
      <InsuranceClaimsManager
        insuranceCompanies={insuranceCompanies ?? []}
        claims={(claims ?? []).map(c => ({
          ...c,
          insuranceName: (Array.isArray(c.insurance_companies) ? c.insurance_companies[0] : c.insurance_companies as { name: string } | null)?.name ?? "—",
        }))}
        currency={currency}
        clinicId={profile?.clinic_id ?? ""}
        readyToClaim={readyToClaim}
        currency={currency}
      />
    </div>
  );
}
