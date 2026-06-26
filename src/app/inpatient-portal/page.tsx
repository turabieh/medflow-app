import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalNav } from "./portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/inpatient-portal/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role, specialty")
    .eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) redirect("/inpatient-portal/login");

  const today = new Date().toISOString().split("T")[0];

  // Active inpatients for this doctor
  const { data: inpatients } = await supabase
    .from("inpatients")
    .select("id, hospital_patient_id, location, status, admission_date, hospitals(id,name), patients(id,full_name,dob,blood_type)")
    .eq("clinic_id", profile.clinic_id)
    .eq("doctor_id", profile.id)
    .eq("status", "active")
    .order("admission_date", { ascending: false });

  const inpatientIds = (inpatients ?? []).map(ip => ip.id);

  // Today's outpatient appointments (schedule)
  const { data: schedule } = await supabase
    .from("appointments")
    .select("id, appt_date, start_time, visit_type, status, patients(id, full_name, full_name_ar)")
    .eq("clinic_id", profile.clinic_id)
    .eq("doctor_id", profile.id)
    .eq("appt_date", today)
    .not("status", "in", '("cancelled","no_show")')
    .order("start_time");

  // Today's visits
  const { data: todayVisits } = inpatientIds.length ? await supabase
    .from("visits").select("id, inpatient_id, visit_type, status")
    .in("inpatient_id", inpatientIds).eq("visit_date", today) : { data: [] };

  const visitedSet = new Set((todayVisits ?? []).map(v => v.inpatient_id));
  const notVisited = (inpatients ?? []).filter(ip => !visitedSet.has(ip.id));

  // Group by hospital
  type HospGroup = { id: string; name: string; patients: typeof inpatients };
  const hospMap = new Map<string, HospGroup>();
  for (const ip of inpatients ?? []) {
    const h = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as {id:string;name:string}|null;
    if (!h) continue;
    if (!hospMap.has(h.id)) hospMap.set(h.id, { id: h.id, name: h.name, patients: [] });
    hospMap.get(h.id)!.patients!.push(ip);
  }
  const groups = Array.from(hospMap.values());

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 0 80px 0" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", padding:"20px 16px 16px", marginBottom:"16px", borderBottom:"1px solid #334155" }}>
        <div style={{ fontSize:"11px", color:"#475569", letterSpacing:"1px", textTransform:"uppercase" }}>Inpatient Portal</div>
        <div style={{ fontSize:"20px", fontWeight:"800", color:"#f1f5f9", marginTop:"2px" }}>
          Dr. {profile.full_name.replace(/^Dr\.?\s*/i,"")}
        </div>
        <div style={{ fontSize:"12px", color:"#64748b" }}>
          {new Date(today).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
        </div>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"20px" }}>
          {[
            { label:"Total", value: inpatients?.length ?? 0, color:"#3b82f6" },
            { label:"Visited", value: visitedSet.size, color:"#22c55e" },
            { label:"Remaining", value: notVisited.length, color: notVisited.length > 0 ? "#f59e0b" : "#64748b" },
          ].map(k => (
            <div key={k.label} style={{ background:"#1e293b", borderRadius:"14px", padding:"14px", textAlign:"center" }}>
              <div style={{ fontSize:"28px", fontWeight:"800", color:k.color }}>{k.value}</div>
              <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
          <Link href="/inpatient-portal/admit" style={{ textDecoration:"none" }}>
            <div style={{ background:"#1d4ed8", borderRadius:"14px", padding:"16px", textAlign:"center", cursor:"pointer" }}>
              <div style={{ fontSize:"24px", marginBottom:"6px" }}>➕</div>
              <div style={{ fontSize:"14px", fontWeight:"700", color:"#fff" }}>Admit Patient</div>
            </div>
          </Link>
          <Link href="/inpatient-portal/patients" style={{ textDecoration:"none" }}>
            <div style={{ background:"#1e293b", border:"1.5px solid #334155", borderRadius:"14px", padding:"16px", textAlign:"center", cursor:"pointer" }}>
              <div style={{ fontSize:"24px", marginBottom:"6px" }}>🔍</div>
              <div style={{ fontSize:"14px", fontWeight:"700", color:"#94a3b8" }}>Search Patients</div>
            </div>
          </Link>
        </div>

        {/* Today's schedule — outpatient appointments */}
        {(schedule ?? []).length > 0 && (
          <div style={{ marginBottom:"20px" }}>
            <div className="ip-section-title">🗓 Today&apos;s Schedule</div>
            {(schedule ?? []).map((appt: Record<string,unknown>) => {
              const pt = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients as {full_name:string}|null;
              const time = appt.start_time ? String(appt.start_time).slice(0,5) : "";
              const isDone = ["done","finalized"].includes(String(appt.status ?? ""));
              return (
                <div key={String(appt.id)} style={{ background:"#1e293b", border:`1.5px solid ${isDone?"#166534":"#1e40af"}`, borderRadius:"14px", padding:"12px 16px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"14px" }}>
                  <div style={{ background: isDone ? "#166534" : "#1e3a8a", borderRadius:"10px", padding:"8px 10px", textAlign:"center", flexShrink:0, minWidth:"48px" }}>
                    <div style={{ fontSize:"15px", fontWeight:"800", color: isDone ? "#86efac" : "#93c5fd", fontFamily:"monospace" }}>{time}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pt?.full_name ?? "Patient"}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px", textTransform:"capitalize" }}>
                      {String(appt.visit_type ?? "").replace(/_/g," ")}
                      {isDone && <span style={{ marginLeft:"8px", color:"#4ade80" }}>✓ Done</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Not visited yet — priority */}
        {notVisited.length > 0 && (
          <div style={{ marginBottom:"20px" }}>
            <div className="ip-section-title">⚠ Not Visited Yet — {notVisited.length}</div>
            {notVisited.map(ip => {
              const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as {full_name:string;dob:string|null;blood_type:string|null}|null;
              const h = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as {name:string}|null;
              const a = p?.dob ? Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*86400000)) : null;
              return (
                <Link key={ip.id} href={`/inpatient-portal/patients/${ip.id}`} style={{ textDecoration:"none" }}>
                  <div style={{ background:"#1e293b", border:"1.5px solid #92400e", borderRadius:"14px", padding:"14px 16px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>{p?.full_name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", marginTop:"3px" }}>
                        {ip.location} · {h?.name}
                        {a !== null && <span style={{marginLeft:"8px"}}>{a}y</span>}
                        {p?.blood_type && <span style={{marginLeft:"8px",color:"#ef4444"}}>{p.blood_type}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:"22px" }}>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* All by hospital */}
        {groups.map(g => (
          <div key={g.id} style={{ marginBottom:"20px" }}>
            <div className="ip-section-title">🏨 {g.name}</div>
            {(g.patients ?? []).map(ip => {
              const p = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as {full_name:string;dob:string|null;blood_type:string|null}|null;
              const visited = visitedSet.has(ip.id);
              const a = p?.dob ? Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*86400000)) : null;
              return (
                <Link key={ip.id} href={`/inpatient-portal/patients/${ip.id}`} style={{ textDecoration:"none" }}>
                  <div style={{ background:"#1e293b", border:`1.5px solid ${visited?"#166534":"#334155"}`, borderRadius:"14px", padding:"14px 16px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>{p?.full_name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>
                        {ip.location}
                        {a !== null && <span style={{marginLeft:"8px"}}>{a}y</span>}
                        <span style={{marginLeft:"8px",fontFamily:"monospace",color:"#475569"}}>{ip.hospital_patient_id}</span>
                      </div>
                    </div>
                    <span style={{ fontSize:"20px" }}>{visited ? "✅" : "→"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        {(inpatients ?? []).length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"#475569" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏥</div>
            <div style={{ fontSize:"16px", fontWeight:"600" }}>No active inpatients</div>
            <Link href="/inpatient-portal/admit">
              <div style={{ marginTop:"16px", display:"inline-block", background:"#1d4ed8", borderRadius:"12px", padding:"12px 24px", color:"#fff", fontWeight:"700", fontSize:"15px" }}>
                + Admit First Patient
              </div>
            </Link>
          </div>
        )}
      </div>

      <PortalNav active="home" />
    </div>
  );
}
