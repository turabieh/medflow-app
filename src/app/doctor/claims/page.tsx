import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClaimsManager } from "./claims-manager";

export const dynamic = "force-dynamic";

export default async function DoctorClaimsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user?.id ?? "").single();

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("is_active", true)
    .order("name");

  const { data: claims } = await supabase
    .from("hospital_claims")
    .select("id, claim_number, claim_seq, from_date, to_date, total_claimed, total_paid, paid_date, status, notes, created_at, is_followup, parent_claim_id, hospitals(name)")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .eq("doctor_id", profile?.id ?? "")
    .order("created_at", { ascending: false });

  const { data: clinicSetting } = await supabase
    .from("clinic_settings").select("value").eq("clinic_id", profile?.clinic_id ?? "").eq("key", "currency").single();
  const currency = clinicSetting?.value ?? "JOD";

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Hospital Claims</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Submit billing claims to hospitals and track payments</p>
        </div>
      </div>

      <ClaimsManager
        hospitals={hospitals ?? []}
        claims={(claims ?? []).map(c => ({
          ...c,
          hospitalName: (Array.isArray(c.hospitals) ? c.hospitals[0] : c.hospitals as { name: string } | null)?.name ?? "—",
          is_followup: c.is_followup ?? false,
          parent_claim_id: c.parent_claim_id ?? null,
        }))}
        currency={currency}
        doctorId={profile?.id ?? ""}
        clinicId={profile?.clinic_id ?? ""}
      />
    </div>
  );
}
