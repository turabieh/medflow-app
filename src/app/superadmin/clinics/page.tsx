import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string,string> = {
  active:"text-emerald-400", trial:"text-amber-400",
  past_due:"text-red-400",   suspended:"text-neutral-500", cancelled:"text-neutral-600",
};
const TIER_BG: Record<string,string> = {
  basic:"#1f2937 ", professional:"#1e1b4b", ai:"#2e1065",
};

export default async function ClinicsListPage() {
  await requireSASession();
  const sb = getSASupabase();

  const { data: clinics } = await sb
    .from("clinics")
    .select("id, name, email, phone, is_active, created_at, tier, clinic_subscriptions(status, tier_key, current_period_end, monthly_price)")
    .order("created_at", { ascending: false });

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
        <div>
          <h1 style={{ fontSize:"20px", fontWeight:"800", color:"#fff", margin:0 }}>All Clinics</h1>
          <p style={{ fontSize:"13px", color:"#525252", marginTop:"4px" }}>{(clinics ?? []).length} clinics registered</p>
        </div>
        <Link href="/superadmin/clinics/new"
          style={{ background:"#6366f1", color:"#fff", textDecoration:"none", borderRadius:"8px", padding:"9px 18px", fontSize:"13px", fontWeight:"700" }}>
          + New Clinic
        </Link>
      </div>

      <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #1f1f1f" }}>
              {["Clinic","Contact","Tier","Status","Period End","MRR","Action"].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#525252" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(clinics ?? []).map(c => {
              const sub = Array.isArray(c.clinic_subscriptions) ? c.clinic_subscriptions[0] : c.clinic_subscriptions as {status:string;tier_key:string;current_period_end:string;monthly_price:number}|null;
              return (
                <tr key={c.id} style={{ borderBottom:"1px solid #141414" }}>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ fontWeight:"600", color: c.is_active ? "#f5f5f5" : "#525252" }}>{c.name}</div>
                    <div style={{ fontSize:"11px", color:"#404040", marginTop:"1px" }}>
                      Created {c.created_at?.split("T")[0]}
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ fontSize:"12px", color:"#737373" }}>{c.email}</div>
                    <div style={{ fontSize:"12px", color:"#525252" }}>{c.phone}</div>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ background: TIER_BG[sub?.tier_key ?? "basic"] ?? "#111", color:"#a5b4fc", borderRadius:"6px", padding:"3px 8px", fontSize:"11px", fontWeight:"700", textTransform:"capitalize" }}>
                      {sub?.tier_key ?? c.tier}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span className={STATUS_COLOR[sub?.status ?? "active"]} style={{ fontSize:"12px", fontWeight:"600" }}>
                      ● {sub?.status ?? "active"}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px", color:"#525252", fontFamily:"monospace", fontSize:"12px" }}>
                    {sub?.current_period_end ?? "—"}
                  </td>
                  <td style={{ padding:"13px 16px", color:"#818cf8", fontFamily:"monospace", fontWeight:"600" }}>
                    ${sub?.monthly_price ?? 0}/mo
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <Link href={`/superadmin/clinics/${c.id}`}
                      style={{ color:"#6366f1", textDecoration:"none", fontSize:"12px", fontWeight:"600" }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(clinics ?? []).length === 0 && (
          <div style={{ padding:"48px", textAlign:"center", color:"#525252", fontSize:"13px" }}>
            No clinics yet. <Link href="/superadmin/clinics/new" style={{ color:"#6366f1" }}>Create the first one →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
