import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MobileVisitTabs } from "./visit-tabs";

export const dynamic = "force-dynamic";

export default async function MobileVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Redirect to="/inpatient-portal/login" />;

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) return <Redirect to="/inpatient-portal/login" />;

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, patient_id, inpatient_id, visit_date, visit_type, visit_fee, status, visit_context, blood_pressure, heart_rate, temperature, oxygen_saturation, weight_kg, height_cm, resp_rate, subjective, objective, assessment, plan, key_clinical_points, clinical_note, final_note, diagnosis_codes")
    .eq("id", id).single();

  if (!visit) return (
    <div style={{ padding:"32px", textAlign:"center", fontFamily:"system-ui", color:"#fca5a5", background:"#0f172a", minHeight:"100vh" }}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>⚠</div>
      <div style={{ fontSize:"16px", fontWeight:"600" }}>Visit not found</div>
      {visitError && <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"8px" }}>{visitError.message}</div>}
      <Link href="/inpatient-portal" style={{ display:"inline-block", marginTop:"16px", color:"#3b82f6", textDecoration:"none" }}>← Back to portal</Link>
    </div>
  );

  // Fetch patient
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, full_name_ar, dob, gender, blood_type, phone, allergies, insurance_company_id, insurance_companies(name)")
    .eq("id", visit.patient_id).single();

  // Inpatient details
  let inpatient = null;
  if (visit.inpatient_id) {
    const { data: ip } = await supabase
      .from("inpatients")
      .select("id, hospital_patient_id, location, hospitals(name)")
      .eq("id", visit.inpatient_id).single();
    inpatient = ip;
  }

  // Previous visits for history
  const { data: prevVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, assessment, plan, subjective")
    .eq("patient_id", visit.patient_id)
    .neq("id", id)
    .not("visit_date", "is", null)
    .order("visit_date", { ascending: false })
    .limit(5);

  // Medications for this visit
  const { data: medications } = await supabase
    .from("prescriptions")
    .select("id, medication_name, dose, unit, instructions, duration")
    .eq("visit_id", id)
    .order("created_at");

  // Medications catalog for suggestions
  const { data: medCatalog } = await supabase
    .from("medications_catalog")
    .select("id, name, common_dose, common_unit")
    .eq("clinic_id", profile.clinic_id)
    .eq("is_active", true)
    .order("name")
    .limit(100);

  const p = patient as Record<string,unknown> | null;
  const age = (p as {dob?:string}|null)?.dob
    ? Math.floor((Date.now() - new Date((p as {dob:string}).dob).getTime()) / (365.25 * 86400000))
    : null;

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#0f172a", fontFamily:"system-ui,-apple-system,sans-serif", color:"#f1f5f9" }}>
      {/* Sticky header */}
      <div style={{ background:"#1e293b", padding:"14px 16px", borderBottom:"1px solid #334155", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <Link href={visit.inpatient_id ? `/inpatient-portal/patients/${visit.inpatient_id}` : "/inpatient-portal"}
            style={{ color:"#64748b", fontSize:"22px", textDecoration:"none", flexShrink:0 }}>←</Link>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:"16px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {(p as {full_name?:string}|null)?.full_name}
            </div>
            <div style={{ fontSize:"11px", color:"#64748b" }}>
              {visit.visit_date} · {(visit.visit_type ?? "").replace(/_/g," ")}
              {inpatient && ` · ${(inpatient as {location?:string}).location ?? ""}`}
            </div>
          </div>
          {(age !== null || (p as {blood_type?:string}|null)?.blood_type) && (
            <div style={{ background:"#0f172a", borderRadius:"8px", padding:"4px 10px", flexShrink:0, textAlign:"center" }}>
              {age !== null && <div style={{ fontSize:"12px", fontWeight:"700" }}>{age}y</div>}
              {(p as {blood_type?:string}|null)?.blood_type && (
                <div style={{ fontSize:"11px", fontWeight:"700", color:"#ef4444" }}>{(p as {blood_type:string}).blood_type}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileVisitTabs
        visitId={id}
        visit={visit as Record<string,unknown>}
        patient={p}
        inpatient={inpatient as Record<string,unknown> | null}
        prevVisits={(prevVisits ?? []) as Record<string,unknown>[]}
        medications={(medications ?? []) as Record<string,unknown>[]}
        medCatalog={(medCatalog ?? []) as Record<string,unknown>[]}
        clinicId={profile.clinic_id}
        doctorId={profile.id}
        patientId={visit.patient_id}
      />
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  return (
    <script dangerouslySetInnerHTML={{ __html: `window.location.href='${to}'` }} />
  );
}
