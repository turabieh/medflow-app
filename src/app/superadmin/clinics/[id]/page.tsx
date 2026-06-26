import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClinicManager } from "./clinic-manager";

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSASession();
  const { id } = await params;
  const sb = getSASupabase();

  const { data: clinic } = await sb
    .from("clinics")
    .select("*")
    .eq("id", id).single();

  if (!clinic) redirect("/superadmin/clinics");

  const { data: sub } = await sb
    .from("clinic_subscriptions")
    .select("*").eq("clinic_id", id).single();

  const { data: payments } = await sb
    .from("clinic_payments")
    .select("id, amount, currency, payment_date, period_from, period_to, method, reference, notes")
    .eq("clinic_id", id)
    .order("payment_date", { ascending: false });

  const { data: users } = await sb
    .from("users")
    .select("id, full_name, role, email, is_active, created_at")
    .eq("clinic_id", id)
    .order("role").order("full_name");

  const { data: tiers } = await sb
    .from("subscription_tiers")
    .select("key, name, price_monthly")
    .eq("is_active", true)
    .order("sort_order");

  // Usage stats
  const [{ count: ptCount }, { count: apptCount }, { count: visitCount }] = await Promise.all([
    sb.from("patients").select("*", { count:"exact", head:true }).eq("clinic_id", id),
    sb.from("appointments").select("*", { count:"exact", head:true }).eq("clinic_id", id),
    sb.from("visits").select("*", { count:"exact", head:true }).eq("clinic_id", id),
  ]);

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom:"20px", display:"flex", alignItems:"center", gap:"12px" }}>
        <Link href="/superadmin" style={{ color:"#525252", textDecoration:"none", fontSize:"13px" }}>← Dashboard</Link>
        <span style={{ color:"#333" }}>/</span>
        <span style={{ fontSize:"13px", color:"#a3a3a3" }}>{clinic.name}</span>
      </div>
      <ClinicManager
        clinic={clinic}
        sub={sub}
        payments={payments ?? []}
        users={users ?? []}
        tiers={tiers ?? []}
        stats={{ patients: ptCount ?? 0, appointments: apptCount ?? 0, visits: visitCount ?? 0 }}
      />
    </div>
  );
}
