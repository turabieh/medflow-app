import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/ui/logout-button";

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/technician/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, role, clinic_id, clinics(name)")
    .eq("id", user.id).single();

  if (!profile || profile.role !== "technician") redirect("/login");

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics as {name:string}|null;

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {/* Top bar */}
      <div style={{ background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"0 20px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ fontSize:"15px", fontWeight:"800", color:"#fff" }}>
            🔬 <span style={{ color:"#38bdf8" }}>Tech</span>Lab
          </div>
          <span style={{ color:"#334155", fontSize:"12px" }}>|</span>
          <span style={{ color:"#94a3b8", fontSize:"13px" }}>{clinic?.name}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
          {[
            { href:"/technician",              label:"Dashboard" },
            { href:"/technician/appointments/new", label:"+ New Appointment" },
          ].map(n => (
            <Link key={n.href} href={n.href}
              style={{ fontSize:"13px", color:"#94a3b8", textDecoration:"none", fontWeight:"500" }}>
              {n.label}
            </Link>
          ))}
          <span style={{ fontSize:"12px", color:"#475569" }}>{profile.full_name}</span>
          <LogoutButton />
        </div>
      </div>

      <main style={{ maxWidth:"960px", margin:"0 auto", padding:"28px 20px" }}>
        {children}
      </main>
    </div>
  );
}
