import { requireSASession, getSASupabase } from "@/lib/superadmin-session";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TIER_COLOR: Record<string, string> = {
  basic:        "bg-neutral-700 text-neutral-200",
  professional: "bg-indigo-900 text-indigo-200",
  ai:           "bg-purple-900 text-purple-200",
  enterprise:   "bg-amber-900 text-amber-200",
};

const STATUS_COLOR: Record<string, string> = {
  active:    "text-emerald-400",
  trial:     "text-amber-400",
  past_due:  "text-red-400",
  suspended: "text-red-600",
  cancelled: "text-neutral-600",
};

export default async function SuperAdminDashboard() {
  const session = await requireSASession();
  const sb = getSASupabase();

  // All clinics with subscription + payment info
  const { data: clinics } = await sb
    .from("clinics")
    .select("id, name, email, phone, is_active, created_at, tier, clinic_subscriptions(status, tier_key, current_period_end, monthly_price, trial_ends_at)")
    .order("created_at", { ascending: false });

  // Recent payments
  const { data: recentPayments } = await sb
    .from("clinic_payments")
    .select("id, amount, currency, payment_date, method, clinics(name)")
    .order("payment_date", { ascending: false })
    .limit(5);

  // Aggregates
  const active   = (clinics ?? []).filter(c => c.is_active).length;
  const total    = (clinics ?? []).length;
  const subs     = (clinics ?? []).map(c => Array.isArray(c.clinic_subscriptions) ? c.clinic_subscriptions[0] : c.clinic_subscriptions) as {status:string;monthly_price:number;tier_key:string}[];
  const mrr      = subs.filter(s => s?.status === "active").reduce((n, s) => n + (s?.monthly_price ?? 0), 0);
  const pastDue  = subs.filter(s => s?.status === "past_due").length;
  const tierCount: Record<string, number> = {};
  for (const s of subs) { if (s?.tier_key) tierCount[s.tier_key] = (tierCount[s.tier_key] ?? 0) + 1; }

  const S: React.CSSProperties = { fontFamily:"system-ui,-apple-system,sans-serif" };

  return (
    <div style={S}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"20px", fontWeight:"800", color:"#fff", margin:0 }}>Dashboard</h1>
        <p style={{ fontSize:"13px", color:"#525252", marginTop:"4px" }}>Welcome back, {session.name}</p>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"28px" }}>
        {[
          { label:"Total Clinics",    value:total,              color:"#f5f5f5" },
          { label:"Active Clinics",   value:active,             color:"#34d399" },
          { label:"MRR",              value:`$${mrr.toFixed(0)}`,color:"#818cf8" },
          { label:"Past Due",         value:pastDue,            color: pastDue > 0 ? "#f87171" : "#525252" },
        ].map(k => (
          <div key={k.label} style={{ background:"#111", border:"1px solid #222", borderRadius:"12px", padding:"16px 20px" }}>
            <div style={{ fontSize:"11px", color:"#525252", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"6px" }}>{k.label}</div>
            <div style={{ fontSize:"26px", fontWeight:"800", color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"16px" }}>
        {/* Clinics list */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
            <h2 style={{ fontSize:"14px", fontWeight:"700", color:"#d4d4d4", margin:0 }}>All Clinics</h2>
            <Link href="/superadmin/clinics/new"
              style={{ background:"#6366f1", color:"#fff", textDecoration:"none", borderRadius:"8px", padding:"6px 14px", fontSize:"12px", fontWeight:"700" }}>
              + New Clinic
            </Link>
          </div>
          <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1f1f1f" }}>
                  {["Clinic","Tier","Status","Next Payment","MRR",""].map(h => (
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#525252" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(clinics ?? []).map(c => {
                  const sub = Array.isArray(c.clinic_subscriptions) ? c.clinic_subscriptions[0] : c.clinic_subscriptions as {status:string;tier_key:string;current_period_end:string;monthly_price:number}|null;
                  return (
                    <tr key={c.id} style={{ borderBottom:"1px solid #1a1a1a" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ fontWeight:"600", color: c.is_active ? "#f5f5f5" : "#525252" }}>{c.name}</div>
                        <div style={{ fontSize:"11px", color:"#525252", marginTop:"1px" }}>{c.email}</div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ borderRadius:"6px", padding:"3px 8px", fontSize:"11px", fontWeight:"700" }}
                          className={TIER_COLOR[sub?.tier_key ?? "basic"]}>
                          {(sub?.tier_key ?? "basic").charAt(0).toUpperCase() + (sub?.tier_key ?? "basic").slice(1)}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:"12px", fontWeight:"600" }}
                          className={STATUS_COLOR[sub?.status ?? "active"]}>
                          ● {sub?.status ?? "active"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px", color:"#737373", fontSize:"12px", fontFamily:"monospace" }}>
                        {sub?.current_period_end ?? "—"}
                      </td>
                      <td style={{ padding:"12px 14px", color:"#818cf8", fontFamily:"monospace", fontWeight:"600" }}>
                        ${sub?.monthly_price ?? 0}/mo
                      </td>
                      <td style={{ padding:"12px 14px" }}>
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
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          {/* Tier breakdown */}
          <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", padding:"16px" }}>
            <h3 style={{ fontSize:"12px", fontWeight:"700", color:"#737373", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 12px" }}>By Tier</h3>
            {Object.entries(tierCount).map(([tier, count]) => (
              <div key={tier} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <span style={{ fontSize:"13px", color:"#a3a3a3", textTransform:"capitalize" }}>{tier}</span>
                <span style={{ fontSize:"14px", fontWeight:"700", color:"#f5f5f5" }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Recent payments */}
          <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", padding:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
              <h3 style={{ fontSize:"12px", fontWeight:"700", color:"#737373", textTransform:"uppercase", letterSpacing:"0.5px", margin:0 }}>Recent Payments</h3>
            </div>
            {(recentPayments ?? []).length === 0 ? (
              <p style={{ fontSize:"12px", color:"#525252" }}>No payments recorded yet.</p>
            ) : (recentPayments ?? []).map(p => {
              const cn = Array.isArray(p.clinics) ? p.clinics[0] : p.clinics as {name:string}|null;
              return (
                <div key={p.id} style={{ marginBottom:"10px", paddingBottom:"10px", borderBottom:"1px solid #1a1a1a" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"13px", fontWeight:"600", color:"#d4d4d4" }}>{cn?.name}</span>
                    <span style={{ fontSize:"13px", fontWeight:"700", color:"#34d399", fontFamily:"monospace" }}>+${p.amount}</span>
                  </div>
                  <div style={{ fontSize:"11px", color:"#525252", marginTop:"2px" }}>{p.payment_date} · {p.method}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
