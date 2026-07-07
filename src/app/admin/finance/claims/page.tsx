import { createClient } from "@/lib/supabase/server";
import { InsuranceClaimsManager } from "@/app/secretary/insurance-claims/insurance-claims-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminInsuranceClaimsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user?.id ?? "").single();

  const clinicId = profile?.clinic_id ?? "";

  const { data: insuranceCompanies } = await supabase
    .from("insurance_companies")
    .select("id, name, name_ar, phone, email, portal_url")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");

  const { data: claims } = await supabase
    .from("insurance_claims")
    .select("id, claim_number, claim_seq, from_date, to_date, total_claimed, total_paid, paid_date, status, notes, created_at, is_followup, parent_claim_id, insurance_companies(name)")
    .eq("clinic_id", clinicId)
    .order("claim_seq", { ascending: false });

  const { data: clinicSetting } = await supabase
    .from("clinic_settings").select("value")
    .eq("clinic_id", clinicId).eq("key", "currency").single();
  const currency = clinicSetting?.value ?? "JOD";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/admin/finance?tab=unclaimed" className="text-neutral-400 hover:text-neutral-600">
          ← Unclaimed Revenue
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Insurance Claims</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Submit billing claims to insurance companies and track payments.
      </p>
      <InsuranceClaimsManager
        insuranceCompanies={insuranceCompanies ?? []}
        claims={(claims ?? []).map(c => ({
          ...c,
          insuranceName: (Array.isArray(c.insurance_companies)
            ? c.insurance_companies[0]
            : c.insurance_companies as { name: string } | null)?.name ?? "—",
        }))}
        currency={currency}
        clinicId={clinicId}
      />
    </div>
  );
}
