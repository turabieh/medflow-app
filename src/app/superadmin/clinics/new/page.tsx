import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import Link from "next/link";
import { NewClinicForm } from "./new-clinic-form";

export const dynamic = "force-dynamic";

export default async function NewClinicPage() {
  await requireSASession();
  const sb = getSASupabase();
  const { data: tiers } = await sb
    .from("subscription_tiers").select("key, name, price_monthly")
    .eq("is_active", true).order("sort_order");

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", maxWidth:"560px" }}>
      <div style={{ marginBottom:"20px", display:"flex", alignItems:"center", gap:"12px" }}>
        <Link href="/superadmin/clinics" style={{ color:"#525252", textDecoration:"none", fontSize:"13px" }}>← Clinics</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:"13px", color:"#a3a3a3" }}>New Clinic</span>
      </div>
      <h1 style={{ fontSize:"20px", fontWeight:"800", color:"#fff", marginBottom:"4px" }}>Create New Clinic</h1>
      <p style={{ fontSize:"13px", color:"#525252", marginBottom:"24px" }}>
        This will create the clinic, set up a subscription, and create an admin account for the clinic owner.
      </p>
      <NewClinicForm tiers={tiers ?? []} />
    </div>
  );
}
