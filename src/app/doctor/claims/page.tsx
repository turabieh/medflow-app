import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClaimsManager } from "./claims-manager";

export const dynamic = "force-dynamic";

export default async function DoctorClaimsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id").eq("id", user?.id ?? "").single();

  const clinicId = profile?.clinic_id ?? "";

  // ── UNCLAIMED hospital visits ─────────────────────────────────────────────
  const { data: claimedVisitLinks } = await supabase
    .from("hospital_claims")
    .select("hospital_id, from_date, to_date")
    .eq("clinic_id", clinicId)
    .eq("is_followup", false);

  // Fetch visits with hospital info via inpatients join
  const { data: unclaimedVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_fee, inpatients(hospital_id, hospitals(id, name))")
    .eq("doctor_id", profile?.id ?? "")
    .eq("visit_context", "inpatient")
    .in("status", ["done","finalized"])
    .not("visit_fee","is",null)
    .gt("visit_fee", 0);

  // Group unclaimed visits by hospital
  const hospMap = new Map<string, {id:string;name:string;amount:number;count:number;from:string;to:string}>();
  for (const v of unclaimedVisits ?? []) {
    if (!v.visit_date) continue;
    const ip   = Array.isArray(v.inpatients) ? v.inpatients[0] : v.inpatients as any;
    const hosp = ip?.hospitals ? (Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals) as {id:string;name:string}|null : null;
    if (!hosp?.id) continue;
    const isClaimed = (claimedVisitLinks ?? []).some((cl: any) =>
      cl.hospital_id === hosp.id && v.visit_date >= cl.from_date && v.visit_date <= cl.to_date
    );
    if (isClaimed) continue;
    const e = hospMap.get(hosp.id) ?? {id:hosp.id,name:hosp.name,amount:0,count:0,from:v.visit_date,to:v.visit_date};
    e.amount += v.visit_fee ?? 0; e.count++;
    if (v.visit_date < e.from) e.from = v.visit_date;
    if (v.visit_date > e.to)   e.to   = v.visit_date;
    hospMap.set(hosp.id, e);
  }
  const readyToClaim = Array.from(hospMap.values()).sort((a,b) => b.amount - a.amount);

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
        readyToClaim={readyToClaim}
        currency={currency}
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
