import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalPatientActions } from "./patient-actions";

export const dynamic = "force-dynamic";

export default async function PortalPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/inpatient-portal/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) redirect("/inpatient-portal/login");

  const { data: ip } = await supabase
    .from("inpatients")
    .select("*, hospitals(id,name,address,primary_phone), patients(id,full_name,full_name_ar,dob,gender,blood_type,phone,insurance_company_id,insurance_companies(name))")
    .eq("id", id).single();

  if (!ip) redirect("/inpatient-portal/patients");

  const today = new Date().toISOString().split("T")[0];

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_type, status, visit_fee, subjective")
    .eq("inpatient_id", id)
    .order("visit_date", { ascending: false })
    .limit(20);

  const { data: nurseRecords } = await supabase
    .from("nurse_procedure_records")
    .select("id, procedure_name, category, started_at, notes, recorded_by_name")
    .or(`inpatient_id.eq.${id},notes.ilike.%MRN: ${ip.hospital_patient_id}%`)
    .order("started_at", { ascending: false })
    .limit(20);

  const todayVisit = (visits ?? []).find(v => v.visit_date === today);
  const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as Record<string,unknown>|null;
  const h = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as {id:string;name:string}|null;
  const ins = p ? (Array.isArray((p as Record<string,unknown>).insurance_companies) ? ((p as Record<string,unknown>).insurance_companies as {name:string}[])[0] : (p as Record<string,unknown>).insurance_companies as {name:string}|null) : null;
  const age = (p as Record<string,string|null>|null)?.dob ? Math.floor((Date.now()-new Date((p as Record<string,string>).dob).getTime())/(365.25*86400000)) : null;

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 0 80px 0", fontFamily:"system-ui,sans-serif", color:"#f1f5f9" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"16px", borderBottom:"1px solid #334155" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
          <Link href="/inpatient-portal" style={{ color:"#64748b", fontSize:"20px", textDecoration:"none" }}>←</Link>
          <div>
            <div style={{ fontSize:"18px", fontWeight:"800" }}>{(p as {full_name:string}|null)?.full_name}</div>
            {(p as {full_name_ar:string|null}|null)?.full_name_ar && (
              <div style={{ fontSize:"13px", color:"#64748b", direction:"rtl" }}>{(p as {full_name_ar:string}|null)?.full_name_ar}</div>
            )}
          </div>
          <div style={{ marginLeft:"auto" }}>
            <span style={{ background: ip.status==="active" ? "#166534" : "#1e3a8a", color: ip.status==="active" ? "#86efac" : "#93c5fd", borderRadius:"12px", padding:"4px 10px", fontSize:"12px", fontWeight:"700" }}>
              {ip.status}
            </span>
          </div>
        </div>

        {/* Patient info grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
          {[
            ["MRN", ip.hospital_patient_id],
            age !== null ? ["Age", `${age}y`] : null,
            (p as {blood_type:string|null}|null)?.blood_type ? ["Blood", (p as {blood_type:string}).blood_type] : null,
            ["Room", ip.location ?? "—"],
            ["Hospital", h?.name ?? "—"],
            ins ? ["Insurance", (ins as {name:string}).name] : null,
          ].filter(Boolean).map((row, i) => row && (
            <div key={i} style={{ background:"#0f172a", borderRadius:"10px", padding:"8px 10px" }}>
              <div style={{ fontSize:"9px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px" }}>{row[0]}</div>
              <div style={{ fontSize:"13px", fontWeight:"700", marginTop:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px" }}>
        {/* Today's status */}
        {todayVisit ? (
          <div style={{ background:"#166534", borderRadius:"14px", padding:"14px 16px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"13px", fontWeight:"700", color:"#86efac" }}>✓ Visited Today</div>
              <div style={{ fontSize:"12px", color:"#4ade80", marginTop:"2px", textTransform:"capitalize" }}>{todayVisit.visit_type?.replace("_"," ")}</div>
            </div>
            <Link href={`/inpatient-portal/visit/${todayVisit.id}`}
              style={{ background:"rgba(255,255,255,0.15)", borderRadius:"8px", padding:"8px 12px", fontSize:"12px", fontWeight:"600", color:"#86efac", textDecoration:"none" }}>
              Open Notes →
            </Link>
          </div>
        ) : ip.status === "active" && (
          <div style={{ background:"#7c2d12", border:"1.5px solid #92400e", borderRadius:"14px", padding:"14px 16px", marginBottom:"16px" }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#fca5a5" }}>⚠ Not visited today</div>
            <div style={{ fontSize:"12px", color:"#f87171", marginTop:"2px" }}>Record today&apos;s visit below</div>
          </div>
        )}

        {/* Actions */}
        <PortalPatientActions
          inpatientId={id}
          patientId={(p as {id:string}|null)?.id ?? ""}
          hospitalId={h?.id ?? ""}
          doctorId={profile.id}
          clinicId={profile.clinic_id}
          todayVisitId={todayVisit?.id}
          isActive={ip.status === "active"}
          hospitalPatientId={ip.hospital_patient_id}
        />

        {/* Visit history */}
        <div style={{ marginBottom:"16px" }}>
          <div className="ip-section-title" style={{ marginBottom:"10px" }}>📋 Visit History</div>
          {(visits ?? []).length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px", color:"#475569", fontSize:"13px" }}>No visits yet</div>
          ) : (visits ?? []).map(v => (
            <Link key={v.id} href={`/inpatient-portal/visit/${v.id}`} style={{ textDecoration:"none" }}>
              <div style={{ background:"#1e293b", borderRadius:"12px", padding:"12px 14px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"600", color:v.visit_date===today?"#60a5fa":"#f1f5f9", textTransform:"capitalize" }}>
                    {v.visit_type?.replace("_"," ")} {v.visit_date===today && "· Today"}
                  </div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>{v.visit_date}</div>
                  {v.subjective && <div style={{ fontSize:"11px", color:"#475569", marginTop:"3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"200px" }}>{v.subjective}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  {v.visit_fee && <div style={{ fontSize:"14px", fontWeight:"700", color:"#34d399" }}>{v.visit_fee} JOD</div>}
                  <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px", textTransform:"capitalize" }}>{v.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Nurse procedures */}
        {(nurseRecords ?? []).length > 0 && (
          <div>
            <div className="ip-section-title" style={{ marginBottom:"10px" }}>🩺 Nurse Procedures</div>
            {(nurseRecords ?? []).map(r => (
              <div key={r.id} style={{ background:"#1e293b", borderRadius:"12px", padding:"12px 14px", marginBottom:"8px", display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"600" }}>{r.procedure_name}</div>
                  {r.recorded_by_name && <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>By: {r.recorded_by_name}</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:"8px" }}>
                  <div style={{ fontSize:"12px", color:"#94a3b8" }}>{new Date(r.started_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</div>
                  <div style={{ fontSize:"11px", color:"#64748b" }}>{new Date(r.started_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
