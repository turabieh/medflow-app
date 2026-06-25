import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalAdmitForm } from "./admit-form";
import { PortalNav } from "../portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalAdmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/inpatient-portal/login");

  const { data: profile } = await supabase
    .from("users").select("id, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["doctor","admin"].includes(profile.role ?? "")) redirect("/inpatient-portal/login");

  const { data: hospitals } = await supabase
    .from("hospitals").select("id, name").eq("clinic_id", profile.clinic_id).order("name");

  const { data: patients } = await supabase
    .from("patients").select("id, full_name, full_name_ar, dob").eq("clinic_id", profile.clinic_id).order("full_name");

  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 0 80px 0", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ background:"#1e293b", padding:"16px", marginBottom:"16px", borderBottom:"1px solid #334155" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <Link href="/inpatient-portal" style={{ color:"#64748b", fontSize:"20px", textDecoration:"none" }}>←</Link>
          <div style={{ fontSize:"17px", fontWeight:"700", color:"#f1f5f9" }}>Admit Patient</div>
        </div>
      </div>
      <div style={{ padding:"0 16px" }}>
        <PortalAdmitForm
          hospitals={hospitals ?? []}
          patients={patients ?? []}
          doctorId={profile.id}
          clinicId={profile.clinic_id}
        />
      </div>
      <PortalNav active="admit" />
    </div>
  );
}
