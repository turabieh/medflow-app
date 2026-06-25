import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MobileVisitTabs } from "./visit-tabs";

export const dynamic = "force-dynamic";

export default async function MobileVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/inpatient-portal/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) redirect("/inpatient-portal/login");

  const { data: visit } = await supabase
    .from("visits")
    .select("*, patients(id, full_name, full_name_ar, dob, gender, blood_type, phone, allergies, insurance_company_id, insurance_companies(name))")
    .eq("id", id).single();

  if (!visit) return (
    <div style={{ padding:"32px 16px", textAlign:"center", fontFamily:"system-ui", color:"#fca5a5" }}>
      <div style={{ fontSize:"32px", marginBottom:"12px" }}>⚠</div>
      <div style={{ fontSize:"16px", fontWeight:"600" }}>Visit not found</div>
      <a href="/inpatient-portal" style={{ display:"inline-block", marginTop:"16px", color:"#3b82f6", fontSize:"14px" }}>← Back to portal</a>
    </div>
  );

  // Inpatient details if this is an inpatient visit
  let inpatient = null;
  if (visit.inpatient_id) {
    const { data: ip } = await supabase
      .from("inpatients")
      .select("id, hospital_patient_id, location, hospitals(name)")
      .eq("id", visit.inpatient_id).single();
    inpatient = ip;
  }

  // Previous visits for context
  const { data: prevVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, final_note, assessment")
    .eq("patient_id", visit.patient_id)
    .neq("id", id)
    .order("visit_date", { ascending: false })
    .limit(5);

  // Medications
  const { data: medications } = await supabase
    .from("prescriptions")
    .select("id, drug_name, dose, frequency, duration, instructions")
    .eq("visit_id", id)
    .order("created_at");

  const p = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients as Record<string,unknown>|null;
  const age = (p as {dob?:string}|null)?.dob
    ? Math.floor((Date.now()-new Date((p as {dob:string}).dob).getTime())/(365.25*86400000))
    : null;

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#0f172a", fontFamily:"system-ui,sans-serif", color:"#f1f5f9" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"14px 16px", borderBottom:"1px solid #334155", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <Link href={visit.inpatient_id ? `/inpatient-portal/patients/${visit.inpatient_id}` : "/inpatient-portal"}
            style={{ color:"#64748b", fontSize:"20px", textDecoration:"none", flexShrink:0 }}>←</Link>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:"16px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {(p as {full_name?:string}|null)?.full_name}
            </div>
            <div style={{ fontSize:"11px", color:"#64748b" }}>
              {visit.visit_date} · {(visit.visit_type ?? "").replace("_"," ")}
              {inpatient && ` · ${(inpatient as {location?:string}).location ?? ""}`}
            </div>
          </div>
          {age !== null && (
            <div style={{ marginLeft:"auto", background:"#0f172a", borderRadius:"8px", padding:"4px 8px", flexShrink:0 }}>
              <div style={{ fontSize:"11px", color:"#64748b", textAlign:"center" }}>{age}y</div>
              {(p as {blood_type?:string}|null)?.blood_type && (
                <div style={{ fontSize:"11px", fontWeight:"700", color:"#ef4444", textAlign:"center" }}>{(p as {blood_type:string}).blood_type}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileVisitTabs
        visit={visit}
        patient={p}
        inpatient={inpatient}
        prevVisits={prevVisits ?? []}
        medications={medications ?? []}
        clinicId={profile.clinic_id}
        doctorId={profile.id}
      />
    </div>
  );
}
