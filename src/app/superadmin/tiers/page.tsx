import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import { TiersManager } from "./tiers-manager";

export const dynamic = "force-dynamic";

export default async function TiersPage() {
  await requireSASession();
  const sb = getSASupabase();

  const { data: tiers } = await sb
    .from("subscription_tiers")
    .select("*")
    .order("sort_order");

  // Count clinics per tier
  const { data: subs } = await sb
    .from("clinic_subscriptions")
    .select("tier_key, status");

  const tierCounts: Record<string, number> = {};
  for (const s of subs ?? []) {
    if (s.status === "active" || s.status === "trial") {
      tierCounts[s.tier_key] = (tierCounts[s.tier_key] ?? 0) + 1;
    }
  }

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"20px", fontWeight:"800", color:"#fff", margin:0 }}>Tiers & Pricing</h1>
        <p style={{ fontSize:"13px", color:"#525252", marginTop:"4px" }}>Manage subscription plans and their features</p>
      </div>
      <TiersManager tiers={tiers ?? []} tierCounts={tierCounts} />
    </div>
  );
}
