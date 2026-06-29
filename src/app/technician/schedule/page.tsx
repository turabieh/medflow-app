import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayClinic } from "@/lib/clinic-timezone";

export const dynamic = "force-dynamic";

export default async function TechSchedulePage({ searchParams }: { searchParams: Promise<{ date?:string }> }) {
  const { date: paramDate } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/technician/login");
  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "technician") redirect("/login");

  const today = todayClinic();
  const date  = paramDate ?? today;

  const { data: appts } = await supabase
    .from("technician_appointments")
    .select("id, start_time, end_time, status, patients(full_name, phone), technician_procedures(name, price, duration_min), technician_reports(id, status)")
    .eq("clinic_id", profile.clinic_id)
    .eq("technician_id", profile.id)
    .eq("appt_date", date)
    .order("start_time");

  const prev = new Date(date); prev.setDate(prev.getDate()-1);
  const next = new Date(date); next.setDate(next.getDate()+1);
  const fmt  = (d:Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const STATUS: Record<string,any> = {
    scheduled:  {bg:"#eff6ff",tc:"#1d4ed8",label:"Scheduled"},
    in_progress:{bg:"#fefce8",tc:"#92400e",label:"In Progress"},
    done:       {bg:"#f0fdf4",tc:"#166534",label:"Done"},
    cancelled:  {bg:"#f9fafb",tc:"#6b7280",label:"Cancelled"},
    no_show:    {bg:"#fef2f2",tc:"#991b1b",label:"No Show"},
  };

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"20px" }}>
        <h1 style={{ fontSize:"18px", fontWeight:"700", color:"#0f172a" }}>My Schedule</h1>
        <Link href="/technician/appointments/new" style={{ background:"#0f172a", color:"#fff", textDecoration:"none", borderRadius:"8px", padding:"8px 16px", fontSize:"13px", fontWeight:"600" }}>+ Book</Link>
      </div>

      {/* Date nav */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        <Link href={`?date=${fmt(prev)}`} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"6px 12px", textDecoration:"none", color:"#64748b", fontSize:"13px" }}>←</Link>
        <span style={{ fontSize:"14px", fontWeight:"700", color:"#0f172a" }}>{date === today ? "Today — " : ""}{date}</span>
        <Link href={`?date=${fmt(next)}`} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"6px 12px", textDecoration:"none", color:"#64748b", fontSize:"13px" }}>→</Link>
      </div>

      {(appts ?? []).length === 0 ? (
        <div style={{ background:"#fff", border:"2px dashed #e2e8f0", borderRadius:"12px", padding:"48px", textAlign:"center" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>📋</div>
          <p style={{ color:"#94a3b8", fontSize:"14px" }}>No appointments for {date}</p>
        </div>
      ) : (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
          {(appts ?? []).map((a, i) => {
            const p    = (Array.isArray(a.patients)?a.patients[0]:a.patients) as {full_name:string;phone:string}|null;
            const proc = (Array.isArray(a.technician_procedures)?a.technician_procedures[0]:a.technician_procedures) as {name:string;price:number|null}|null;
            const rep  = (Array.isArray(a.technician_reports)?a.technician_reports[0]:a.technician_reports) as {id:string;status:string}|null;
            const st   = STATUS[a.status as string] ?? STATUS.scheduled;
            return (
              <div key={a.id as string} style={{ display:"flex", alignItems:"center", gap:"16px", padding:"14px 20px", borderTop: i>0?"1px solid #f1f5f9":"none" }}>
                <div style={{ width:"52px", textAlign:"center" }}>
                  <p style={{ fontFamily:"monospace", fontSize:"16px", fontWeight:"700", color:"#0f172a" }}>{(a.start_time as string)?.slice(0,5)}</p>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:"14px", fontWeight:"600", color:"#0f172a" }}>{p?.full_name}</p>
                  <p style={{ fontSize:"12px", color:"#64748b" }}>{p?.phone} · {proc?.name}{proc?.price?` · ${proc.price} JOD`:""}</p>
                </div>
                <span style={{ background:(st as {bg:string;tc:string;label:string}).bg, color:(st as {bg:string;tc:string;label:string}).tc, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:"700" }}>{st.label}</span>
                <Link href={`/technician/appointments/${a.id}`}
                  style={{ background: a.status==="done"?"#f1f5f9":"#0f172a", color: a.status==="done"?"#64748b":"#fff",
                    textDecoration:"none", borderRadius:"8px", padding:"7px 14px", fontSize:"12px", fontWeight:"600" }}>
                  {a.status==="done"?"View":"Open →"}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
