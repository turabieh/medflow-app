import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalNav } from "../portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalPatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/inpatient-portal/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) redirect("/inpatient-portal/login");

  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  // Fetch all inpatients for this doctor
  const { data: allInpatients } = await supabase
    .from("inpatients")
    .select("id, hospital_patient_id, location, status, admission_date, hospitals(name), patients(id, full_name, full_name_ar, dob, blood_type)")
    .eq("clinic_id", profile.clinic_id)
    .eq("doctor_id", profile.id)
    .order("admission_date", { ascending: false })
    .limit(100);

  // Filter client-side so we can search on both MRN and patient name
  const inpatients = term
    ? (allInpatients ?? []).filter(ip => {
        const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as {full_name:string;full_name_ar:string|null}|null;
        const name = (p?.full_name ?? "").toLowerCase();
        const nameAr = (p?.full_name_ar ?? "");
        const mrn  = (ip.hospital_patient_id ?? "").toLowerCase();
        const t    = term.toLowerCase();
        return name.includes(t) || nameAr.includes(t) || mrn.includes(t);
      })
    : (allInpatients ?? []);

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 0 80px 0", fontFamily:"system-ui,sans-serif", color:"#f1f5f9" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"16px", marginBottom:"16px", borderBottom:"1px solid #334155" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
          <Link href="/inpatient-portal" style={{ color:"#64748b", fontSize:"20px", textDecoration:"none" }}>←</Link>
          <div style={{ fontSize:"17px", fontWeight:"700" }}>
            All Inpatients <span style={{ color:"#64748b", fontWeight:"400", fontSize:"14px" }}>({inpatients.length})</span>
          </div>
        </div>
        <form method="GET" action="/inpatient-portal/patients">
          <input name="q" defaultValue={term}
            placeholder="Search by name or MRN..."
            autoComplete="off"
            style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
              color:"#f1f5f9", padding:"12px 16px", fontSize:"16px", fontFamily:"system-ui", outline:"none",
              boxSizing:"border-box" }} />
        </form>
      </div>

      <div style={{ padding:"0 16px" }}>
        {inpatients.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"#475569" }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔍</div>
            <div style={{ fontSize:"15px" }}>{term ? "No patients found" : "No inpatients yet"}</div>
            {term && <div style={{ fontSize:"13px", marginTop:"6px", color:"#334155" }}>Try a different name or MRN</div>}
            {!term && (
              <Link href="/inpatient-portal/admit" style={{ textDecoration:"none" }}>
                <div style={{ marginTop:"16px", display:"inline-block", background:"#1d4ed8", borderRadius:"12px", padding:"12px 24px", color:"#fff", fontWeight:"700", fontSize:"15px" }}>
                  + Admit First Patient
                </div>
              </Link>
            )}
          </div>
        ) : inpatients.map(ip => {
          const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as {full_name:string;full_name_ar:string|null;dob:string|null;blood_type:string|null}|null;
          const h = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as {name:string}|null;
          const a = p?.dob ? Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*86400000)) : null;
          const isActive = ip.status === "active";
          return (
            <Link key={ip.id} href={`/inpatient-portal/patients/${ip.id}`} style={{ textDecoration:"none" }}>
              <div style={{ background:"#1e293b", border:`1.5px solid ${isActive?"#334155":"#1e3a8a"}`,
                borderRadius:"14px", padding:"14px 16px", marginBottom:"8px",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                    <span style={{ fontSize:"15px", fontWeight:"700" }}>{p?.full_name}</span>
                    <span style={{ fontSize:"10px",
                      background: isActive ? "#166534" : "#1e3a8a",
                      color: isActive ? "#86efac" : "#93c5fd",
                      borderRadius:"10px", padding:"2px 8px", fontWeight:"600" }}>
                      {isActive ? "Active" : "Discharged"}
                    </span>
                  </div>
                  {p?.full_name_ar && <div style={{ fontSize:"12px", color:"#64748b", direction:"rtl", marginTop:"1px" }}>{p.full_name_ar}</div>}
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"4px" }}>
                    <span style={{ fontFamily:"monospace", color:"#7dd3fc" }}>{ip.hospital_patient_id}</span>
                    {ip.location && <span style={{marginLeft:"8px"}}>· {ip.location}</span>}
                    {h?.name && <span style={{marginLeft:"8px"}}>· {h.name}</span>}
                    {a !== null && <span style={{marginLeft:"8px"}}>{a}y</span>}
                    {p?.blood_type && <span style={{marginLeft:"8px",color:"#ef4444",fontWeight:"700"}}>{p.blood_type}</span>}
                  </div>
                </div>
                <span style={{ color:"#64748b", fontSize:"18px", flexShrink:0, marginLeft:"12px" }}>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      <PortalNav active="patients" />
    </div>
  );
}
