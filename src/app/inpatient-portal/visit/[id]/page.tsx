import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MobileVisitTabs } from "./visit-tabs";

export const dynamic = "force-dynamic";

export default async function MobileVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <meta httpEquiv="refresh" content="0;url=/inpatient-portal/login" />;

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? ""))
    return <meta httpEquiv="refresh" content="0;url=/inpatient-portal/login" />;

  const clinicId = profile.clinic_id;

  const { data: visit, error: ve } = await supabase
    .from("visits")
    .select("id, patient_id, inpatient_id, visit_date, visit_type, visit_fee, status, visit_context, blood_pressure, heart_rate, temperature, oxygen_saturation, weight_kg, height_cm, resp_rate, subjective, objective, assessment, plan, key_clinical_points, clinical_note, voice_notes, final_note, diagnosis_codes")
    .eq("id", id).single();

  if (!visit) return (
    <div style={{ padding:"40px 20px", textAlign:"center", fontFamily:"system-ui", color:"#fca5a5", background:"#0f172a", minHeight:"100vh" }}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>⚠</div>
      <div style={{ fontSize:"16px", fontWeight:"600" }}>Visit not found</div>
      {ve && <div style={{ fontSize:"12px", color:"#64748b", marginTop:"8px" }}>{ve.message}</div>}
      <Link href="/inpatient-portal" style={{ display:"inline-block", marginTop:"20px", color:"#3b82f6", textDecoration:"none" }}>← Back</Link>
    </div>
  );

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, full_name_ar, dob, gender, blood_type, phone, allergies, insurance_company_id, insurance_companies(name), insurance_policy_number")
    .eq("id", visit.patient_id).single();

  let inpatient = null;
  if (visit.inpatient_id) {
    const { data: ip } = await supabase
      .from("inpatients").select("id, hospital_patient_id, location, hospitals(name)")
      .eq("id", visit.inpatient_id).single();
    inpatient = ip;
  }

  // Same data as clinic portal
  const { data: symptomsCatalog } = await supabase
    .from("symptoms_catalog").select("id, name, name_ar, category")
    .eq("clinic_id", clinicId).eq("is_active", true).order("name");

  const { data: visitSymptoms } = await supabase
    .from("visit_symptoms").select("symptom_id, notes").eq("visit_id", id);

  const { data: labs } = await supabase
    .from("visit_labs").select("id, type, name, lab_date, findings, link_url")
    .eq("visit_id", id).order("created_at");

  const { data: prescriptions } = await supabase
    .from("prescriptions").select("id, medication_id, medication_name, dose, unit, instructions, duration")
    .eq("visit_id", id).order("created_at");

  const { data: medsCatalog } = await supabase
    .from("medications_catalog").select("id, name, default_dose, default_unit")
    .eq("clinic_id", clinicId).eq("is_active", true).order("name").limit(200);

  const { data: diagnoses } = await supabase
    .from("visit_diagnoses").select("id, icd_code, description, is_primary")
    .eq("visit_id", id).order("created_at");

  const { data: prevVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, subjective, objective, assessment, plan, final_note, key_clinical_points, voice_notes, status")
    .eq("patient_id", visit.patient_id).neq("id", id)
    .not("visit_date", "is", null)
    .order("visit_date", { ascending: false }).limit(6);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = patient as any;
  const age = p?.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 86400000)) : null;

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#0f172a", fontFamily:"system-ui,-apple-system,sans-serif", color:"#f1f5f9" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"14px 16px", borderBottom:"1px solid #334155", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <Link href={visit.inpatient_id ? `/inpatient-portal/patients/${visit.inpatient_id}` : "/inpatient-portal"}
            style={{ color:"#64748b", fontSize:"22px", textDecoration:"none", flexShrink:0 }}>←</Link>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"16px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p?.full_name}</div>
            <div style={{ fontSize:"11px", color:"#64748b" }}>
              {visit.visit_date} · {(visit.visit_type ?? "").replace(/_/g," ")}
              {inpatient && ` · ${(inpatient as {location?:string}).location ?? ""}`}
            </div>
          </div>
          {(age !== null || p?.blood_type) && (
            <div style={{ background:"#0f172a", borderRadius:"8px", padding:"4px 10px", flexShrink:0, textAlign:"center" }}>
              {age !== null && <div style={{ fontSize:"12px", fontWeight:"700" }}>{age}y</div>}
              {p?.blood_type && <div style={{ fontSize:"11px", fontWeight:"700", color:"#ef4444" }}>{p.blood_type}</div>}
            </div>
          )}
        </div>
      </div>

      <MobileVisitTabs
        visitId={id}
        visit={visit as Record<string,unknown>}
        patient={p}
        inpatient={inpatient as Record<string,unknown>|null}
        symptomsCatalog={(symptomsCatalog ?? []) as Record<string,unknown>[]}
        checkedSymptomIds={(visitSymptoms ?? []).map((s: {symptom_id:string}) => s.symptom_id)}
        labs={(labs ?? []) as Record<string,unknown>[]}
        prescriptions={(prescriptions ?? []) as Record<string,unknown>[]}
        medsCatalog={(medsCatalog ?? []) as Record<string,unknown>[]}
        diagnoses={(diagnoses ?? []) as Record<string,unknown>[]}
        prevVisits={(prevVisits ?? []) as Record<string,unknown>[]}
        clinicId={clinicId}
        doctorId={profile.id}
        patientId={visit.patient_id}
      />
    </div>
  );
}
