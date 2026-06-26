"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Clinic = Record<string, unknown>;
type Sub    = Record<string, unknown> | null;
type Payment= Record<string, unknown>;
type User   = { id: string; full_name: string; role: string; email: string | null; is_active: boolean };
type Tier   = { key: string; name: string; price_monthly: number };

const TIER_COLOR: Record<string, string> = {
  basic:"#374151", professional:"#312e81", ai:"#4a1d96",
};

const STATUS_OPTS = ["trial","active","past_due","suspended","cancelled"];

export function ClinicManager({ clinic, sub, payments, users, tiers, stats }: {
  clinic: Clinic; sub: Sub; payments: Payment[];
  users: User[]; tiers: Tier[];
  stats: { patients: number; appointments: number; visits: number };
}) {
  const router = useRouter();
  const [tab, setTab]     = useState<"overview"|"payments"|"users"|"settings">("overview");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");

  // Subscription form
  const [tierKey, setTierKey]   = useState((sub as {tier_key?:string}|null)?.tier_key ?? "basic");
  const [status, setStatus]     = useState((sub as {status?:string}|null)?.status ?? "active");
  const [price, setPrice]       = useState(String((sub as {monthly_price?:number}|null)?.monthly_price ?? 49));
  const [periodEnd, setPeriodEnd] = useState((sub as {current_period_end?:string}|null)?.current_period_end ?? "");

  // Payment form
  const [payAmt, setPayAmt]   = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payFrom, setPayFrom] = useState("");
  const [payTo, setPayTo]     = useState("");
  const [payMethod, setPayMethod] = useState("bank");
  const [payRef, setPayRef]   = useState("");
  const [payNote, setPayNote] = useState("");

  async function saveSubscription() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/superadmin/clinics/subscription", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ clinicId: clinic.id, tierKey, status, monthlyPrice: parseFloat(price), currentPeriodEnd: periodEnd }),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Subscription updated"); router.refresh(); }
    else setMsg("✗ Failed to update");
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const res = await fetch("/api/superadmin/clinics/payment", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ clinicId: clinic.id, amount: parseFloat(payAmt), paymentDate: payDate, periodFrom: payFrom, periodTo: payTo, method: payMethod, reference: payRef, notes: payNote }),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Payment recorded"); setPayAmt(""); setPayRef(""); setPayNote(""); router.refresh(); }
    else setMsg("✗ Failed to record payment");
  }

  async function toggleClinicActive() {
    setSaving(true);
    await fetch("/api/superadmin/clinics/toggle", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ clinicId: clinic.id, isActive: !clinic.is_active }),
    });
    setSaving(false);
    router.refresh();
  }

  const S = { fontFamily:"system-ui,-apple-system,sans-serif" };
  const card: React.CSSProperties = { background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", padding:"20px", marginBottom:"16px" };
  const inp: React.CSSProperties  = { background:"#0a0a0a", border:"1px solid #262626", borderRadius:"8px", color:"#f5f5f5", padding:"9px 12px", fontSize:"13px", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };
  const btn = (bg: string, color="#fff"): React.CSSProperties => ({ background:bg, color, border:"none", borderRadius:"8px", padding:"9px 18px", fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" });

  return (
    <div style={S}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <h1 style={{ fontSize:"20px", fontWeight:"800", color:"#f5f5f5", margin:0 }}>{clinic.name as string}</h1>
            <span style={{ background: clinic.is_active ? "#052e16" : "#1a0a0a", color: clinic.is_active ? "#34d399" : "#f87171", border:`1px solid ${clinic.is_active ? "#166534" : "#7f1d1d"}`, borderRadius:"20px", padding:"2px 10px", fontSize:"11px", fontWeight:"700" }}>
              {clinic.is_active ? "Active" : "Suspended"}
            </span>
          </div>
          <p style={{ fontSize:"12px", color:"#525252", marginTop:"4px" }}>{clinic.email as string} · {clinic.phone as string}</p>
        </div>
        <button onClick={toggleClinicActive} disabled={saving}
          style={btn(clinic.is_active ? "#7f1d1d" : "#052e16", clinic.is_active ? "#fca5a5" : "#34d399")}>
          {clinic.is_active ? "Suspend Clinic" : "Reactivate Clinic"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
        {[
          { label:"Patients",     value:stats.patients },
          { label:"Appointments", value:stats.appointments },
          { label:"Visits",       value:stats.visits },
        ].map(s => (
          <div key={s.label} style={{ background:"#0a0a0a", border:"1px solid #1f1f1f", borderRadius:"10px", padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:"22px", fontWeight:"800", color:"#f5f5f5" }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize:"11px", color:"#525252", marginTop:"2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ background:"#0a1a0a", border:"1px solid #166534", borderRadius:"8px", padding:"9px 14px", color:"#34d399", fontSize:"13px", marginBottom:"14px" }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:"flex", gap:"2px", marginBottom:"16px", background:"#0a0a0a", borderRadius:"10px", padding:"4px", border:"1px solid #1a1a1a" }}>
        {(["overview","payments","users","settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...btn(tab===t?"#1f1f1f":"transparent", tab===t?"#f5f5f5":"#737373"), flex:1, borderRadius:"8px", textTransform:"capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div>
          <div style={card}>
            <h3 style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"14px" }}>Subscription</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
              <div>
                <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Tier</label>
                <select value={tierKey} onChange={e => setTierKey(e.target.value)} style={{ ...inp }}>
                  {tiers.map(t => <option key={t.key} value={t.key}>{t.name} (${t.price_monthly}/mo)</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp }}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Monthly Price ($)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01" style={inp} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Period End</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} style={inp} />
              </div>
            </div>
            <button onClick={saveSubscription} disabled={saving} style={btn("#6366f1")}>
              {saving ? "Saving..." : "Update Subscription"}
            </button>
          </div>
        </div>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <div>
          <form onSubmit={recordPayment} style={{ ...card }}>
            <h3 style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"14px" }}>Record Payment</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"10px" }}>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Amount ($) *</label><input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} step="0.01" required style={inp} /></div>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Payment Date *</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required style={inp} /></div>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inp}>
                  {["bank","cash","card","wire","other"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Period From *</label><input type="date" value={payFrom} onChange={e => setPayFrom(e.target.value)} required style={inp} /></div>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Period To *</label><input type="date" value={payTo} onChange={e => setPayTo(e.target.value)} required style={inp} /></div>
              <div><label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Reference #</label><input value={payRef} onChange={e => setPayRef(e.target.value)} style={inp} /></div>
            </div>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, marginBottom:"10px" }} />
            <button type="submit" disabled={saving} style={btn("#059669")}>Record Payment</button>
          </form>

          {payments.length > 0 && (
            <div style={card}>
              <h3 style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"14px" }}>Payment History</h3>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                <thead>
                  <tr>
                    {["Date","Amount","Period","Method","Reference"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"6px 10px", fontSize:"10px", color:"#525252", fontWeight:"700", textTransform:"uppercase", borderBottom:"1px solid #1f1f1f" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={(p as {id:string}).id} style={{ borderBottom:"1px solid #141414" }}>
                      <td style={{ padding:"9px 10px", color:"#a3a3a3", fontFamily:"monospace" }}>{(p as {payment_date:string}).payment_date}</td>
                      <td style={{ padding:"9px 10px", color:"#34d399", fontFamily:"monospace", fontWeight:"700" }}>${(p as {amount:number}).amount.toFixed(2)}</td>
                      <td style={{ padding:"9px 10px", color:"#525252", fontSize:"11px", fontFamily:"monospace" }}>{(p as {period_from:string}).period_from} → {(p as {period_to:string}).period_to}</td>
                      <td style={{ padding:"9px 10px", color:"#737373", textTransform:"capitalize" }}>{(p as {method:string}).method}</td>
                      <td style={{ padding:"9px 10px", color:"#525252", fontFamily:"monospace" }}>{(p as {reference:string|null}).reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div style={card}>
          <h3 style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"14px" }}>
            Clinic Users ({users.length})
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
            <thead>
              <tr>
                {["Name","Role","Email","Status"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"6px 10px", fontSize:"10px", color:"#525252", fontWeight:"700", textTransform:"uppercase", borderBottom:"1px solid #1f1f1f" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom:"1px solid #141414" }}>
                  <td style={{ padding:"9px 10px", fontWeight:"600", color: u.is_active ? "#f5f5f5" : "#525252" }}>{u.full_name}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{ background: TIER_COLOR[u.role] ?? "#1a1a1a", color:"#d4d4d4", borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:"600", textTransform:"capitalize" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:"9px 10px", color:"#525252", fontSize:"12px" }}>{u.email ?? "—"}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{ color: u.is_active ? "#34d399" : "#525252", fontSize:"12px", fontWeight:"600" }}>
                      {u.is_active ? "● Active" : "○ Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings */}
      {tab === "settings" && (
        <div style={card}>
          <h3 style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"14px" }}>Clinic Info</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            {[
              ["Name",    clinic.name],
              ["Slug",    clinic.slug],
              ["Email",   clinic.email],
              ["Phone",   clinic.phone],
              ["Address", clinic.address],
              ["Currency",clinic.currency],
              ["Created", (clinic.created_at as string)?.split("T")[0]],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <div style={{ fontSize:"11px", color:"#525252", marginBottom:"3px" }}>{String(label)}</div>
                <div style={{ fontSize:"13px", color:"#d4d4d4" }}>{String(val ?? "—")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
