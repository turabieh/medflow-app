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

  let query = supabase
    .from("inpatients")
    .select("id, hospital_patient_id, location, status, admitted_at, hospitals(name), patients(full_name, full_name_ar, dob, blood_type)")
    .eq("clinic_id", profile.clinic_id)
    .eq("doctor_id", profile.id)
    .order("admitted_at", { ascending: false });

  if (q?.trim()) {
    // Search by patient name or hospital patient ID
    query = query.or(`hospital_patient_id.ilike.%${q}%,patients.full_name.ilike.%${q}%`);
  }

  const { data: inpatients } = await query.limit(30);

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 0 80px 0" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"16px", marginBottom:"16px", borderBottom:"1px solid #334155" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
          <Link href="/inpatient-portal" style={{ color:"#64748b", fontSize:"20px", textDecoration:"none" }}>←</Link>
          <div style={{ fontSize:"17px", fontWeight:"700", color:"#f1f5f9" }}>All Inpatients</div>
        </div>
        <form method="GET">
          <input name="q" defaultValue={q ?? ""} placeholder="Search by name or MRN..."
            style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
              color:"#f1f5f9", padding:"12px 16px", fontSize:"15px", fontFamily:"system-ui", outline:"none" }} />
        </form>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Active vs discharged filter links */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
          {["active","discharged","all"].map(s => (
            <Link key={s} href={`/inpatient-portal/patients${q ? `?q=${q}` : ""}`}
              style={{ textDecoration:"none", background:"#1e293b", borderRadius:"20px", padding:"6px 14px",
                fontSize:"12px", fontWeight:"600", color:"#64748b", border:"1px solid #334155" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>

        {(inpatients ?? []).length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"#475569" }}>
            <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔍</div>
            <div style={{ fontSize:"15px" }}>No patients found</div>
            {q && <div style={{ fontSize:"13px", marginTop:"6px" }}>Try a different search term</div>}
          </div>
        ) : (inpatients ?? []).map(ip => {
          const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as {full_name:string;full_name_ar:string|null;dob:string|null;blood_type:string|null}|null;
          const h = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as {name:string}|null;
          const a = p?.dob ? Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*86400000)) : null;
          const isActive = ip.status === "active";
          return (
            <Link key={ip.id} href={`/inpatient-portal/patients/${ip.id}`} style={{ textDecoration:"none" }}>
              <div style={{ background:"#1e293b", border:`1.5px solid ${isActive?"#334155":"#1e3a8a"}`, borderRadius:"14px", padding:"14px 16px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>{p?.full_name}</span>
                    <span style={{ fontSize:"10px", background: isActive ? "#166534" : "#1e3a8a", color: isActive ? "#86efac" : "#93c5fd", borderRadius:"10px", padding:"2px 8px", fontWeight:"600" }}>
                      {isActive ? "Active" : "Discharged"}
                    </span>
                  </div>
                  {p?.full_name_ar && <div style={{ fontSize:"12px", color:"#64748b", direction:"rtl", marginTop:"1px" }}>{p.full_name_ar}</div>}
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"4px" }}>
                    <span style={{ fontFamily:"monospace" }}>{ip.hospital_patient_id}</span>
                    {ip.location && <span style={{marginLeft:"8px"}}>· {ip.location}</span>}
                    {h?.name && <span style={{marginLeft:"8px"}}>· {h.name}</span>}
                    {a !== null && <span style={{marginLeft:"8px"}}>{a}y</span>}
                    {p?.blood_type && <span style={{marginLeft:"8px",color:"#ef4444"}}>{p.blood_type}</span>}
                  </div>
                </div>
                <span style={{ color:"#64748b", fontSize:"18px", flexShrink:0, marginLeft:"8px" }}>→</span>
              </div>
            </Link>
          );
        })}
      </div>

      <PortalNav active="patients" />
    </div>
  );
}
