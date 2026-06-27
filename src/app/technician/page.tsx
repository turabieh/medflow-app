import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayClinic } from "@/lib/clinic-timezone";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, {bg:string;color:string;label:string}> = {
  scheduled:   { bg:"#eff6ff", color:"#1d4ed8", label:"Scheduled"    },
  in_progress: { bg:"#fefce8", color:"#92400e", label:"In Progress"  },
  done:        { bg:"#f0fdf4", color:"#166534", label:"Done"         },
  cancelled:   { bg:"#fef2f2", color:"#991b1b", label:"Cancelled"    },
  no_show:     { bg:"#f9fafb", color:"#6b7280", label:"No Show"      },
};

export default async function TechnicianDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/technician/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "technician") redirect("/login");

  const today = todayClinic();

  const { data: todayAppts } = await supabase
    .from("technician_appointments")
    .select("id, appt_date, start_time, status, patients(full_name, phone), technician_procedures(name), technician_reports(id, status)")
    .eq("clinic_id", profile.clinic_id)
    .eq("technician_id", profile.id)
    .eq("appt_date", today)
    .order("start_time");

  const { data: upcomingAppts } = await supabase
    .from("technician_appointments")
    .select("id, appt_date, start_time, status, patients(full_name), technician_procedures(name)")
    .eq("clinic_id", profile.clinic_id)
    .eq("technician_id", profile.id)
    .gt("appt_date", today)
    .order("appt_date").order("start_time")
    .limit(10);

  const done  = (todayAppts ?? []).filter(a => a.status === "done").length;
  const total = (todayAppts ?? []).length;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px" }}>
        <div>
          <h1 style={{ fontSize:"20px", fontWeight:"700", color:"#0f172a", margin:0 }}>Today's Schedule</h1>
          <p style={{ fontSize:"13px", color:"#64748b", marginTop:"4px" }}>{today} · {done}/{total} completed</p>
        </div>
        <Link href="/technician/appointments/new"
          style={{ background:"#0f172a", color:"#fff", textDecoration:"none", borderRadius:"8px", padding:"9px 18px", fontSize:"13px", fontWeight:"600" }}>
          + Book Appointment
        </Link>
      </div>

      {/* Today */}
      {(todayAppts ?? []).length === 0 ? (
        <div style={{ background:"#fff", border:"1.5px dashed #e2e8f0", borderRadius:"12px", padding:"48px", textAlign:"center", marginBottom:"24px" }}>
          <div style={{ fontSize:"36px", marginBottom:"8px" }}>📋</div>
          <p style={{ fontSize:"14px", color:"#64748b" }}>No appointments today</p>
          <Link href="/technician/appointments/new" style={{ display:"inline-block", marginTop:"12px", color:"#2563eb", fontSize:"13px", textDecoration:"none" }}>
            Book the first one →
          </Link>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:"24px", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          {(todayAppts ?? []).map((a, i) => {
            const p    = Array.isArray(a.patients) ? a.patients[0] : a.patients as {full_name:string}|null;
            const proc = Array.isArray(a.technician_procedures) ? a.technician_procedures[0] : a.technician_procedures as {name:string}|null;
            const rep  = Array.isArray(a.technician_reports) ? a.technician_reports[0] : a.technician_reports as {id:string;status:string}|null;
            const st   = STATUS_STYLE[a.status] ?? STATUS_STYLE.scheduled;
            return (
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:"16px", padding:"14px 20px", borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                {/* Time */}
                <div style={{ width:"52px", textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:"16px", fontWeight:"700", color:"#0f172a", fontFamily:"monospace" }}>{a.start_time?.slice(0,5)}</div>
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"14px", fontWeight:"600", color:"#0f172a" }}>{p?.full_name}</div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>
                    {proc?.name ?? "Procedure not set"}
                  </div>
                </div>
                {/* Status */}
                <span style={{ background:st.bg, color:st.color, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:"700", flexShrink:0 }}>
                  {st.label}
                </span>
                {/* Action */}
                <Link href={`/technician/appointments/${a.id}`}
                  style={{ background: a.status==="done" ? "#f1f5f9" : "#0f172a", color: a.status==="done" ? "#64748b" : "#fff",
                    textDecoration:"none", borderRadius:"8px", padding:"7px 14px", fontSize:"12px", fontWeight:"600", flexShrink:0 }}>
                  {a.status === "done" ? "View Report" : rep ? "Continue →" : "Start →"}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming */}
      {(upcomingAppts ?? []).length > 0 && (
        <div>
          <h2 style={{ fontSize:"14px", fontWeight:"600", color:"#64748b", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Upcoming</h2>
          <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
            {(upcomingAppts ?? []).map((a, i) => {
              const p    = Array.isArray(a.patients) ? a.patients[0] : a.patients as {full_name:string}|null;
              const proc = Array.isArray(a.technician_procedures) ? a.technician_procedures[0] : a.technician_procedures as {name:string}|null;
              return (
                <Link key={a.id} href={`/technician/appointments/${a.id}`}
                  style={{ display:"flex", alignItems:"center", gap:"16px", padding:"12px 20px", borderTop: i>0?"1px solid #f1f5f9":"none", textDecoration:"none" }}>
                  <div style={{ fontSize:"12px", color:"#475569", fontFamily:"monospace", width:"80px", flexShrink:0 }}>
                    {a.appt_date} {a.start_time?.slice(0,5)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:"#0f172a" }}>{p?.full_name}</div>
                    <div style={{ fontSize:"11px", color:"#94a3b8" }}>{proc?.name}</div>
                  </div>
                  <span style={{ color:"#94a3b8", fontSize:"14px" }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
