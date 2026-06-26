"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Tier = {
  id: string; key: string; name: string;
  price_monthly: number; features: string[];
  is_active: boolean; sort_order: number;
};

const ALL_FEATURES = [
  { key:"appointments",      label:"Appointments & Scheduling" },
  { key:"patients",          label:"Patient Management"        },
  { key:"reports",           label:"Reports & Print"           },
  { key:"secretary_access",  label:"Secretary Portal"          },
  { key:"insurance_claims",  label:"Insurance Claims"          },
  { key:"inpatients",        label:"Inpatient (Hospital) Module"},
  { key:"finance",           label:"Finance Dashboard"         },
  { key:"data_backup",       label:"Data Backup & Export"      },
  { key:"permissions",       label:"Custom Permissions"        },
  { key:"ai_diagnosis",      label:"AI Diagnosis Assistant"    },
  { key:"ai_notes",          label:"AI Clinical Notes"         },
];

const TIER_COLORS: Record<string, string> = {
  basic:"#1f2937", professional:"#1e1b4b", ai:"#2e1065",
};

export function TiersManager({ tiers, tierCounts }: { tiers: Tier[]; tierCounts: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Tier | null>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  function startEdit(tier: Tier) {
    setEditing({ ...tier, features: [...(tier.features ?? [])], price_monthly: Number(tier.price_monthly) || 0 });
  }

  function toggleFeature(key: string) {
    if (!editing) return;
    const has = editing.features.includes(key);
    setEditing({ ...editing, features: has ? editing.features.filter(f => f !== key) : [...editing.features, key] });
  }

  async function save() {
    if (!editing) return;
    setSaving(true); setMsg("");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Use service role via API
    const res = await fetch("/api/superadmin/tiers/update", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (res.ok) { setMsg("✓ Saved"); setEditing(null); router.refresh(); }
    else setMsg("✗ Failed");
  }

  const S: React.CSSProperties = { fontFamily:"system-ui,-apple-system,sans-serif" };
  const inp: React.CSSProperties = { background:"#0a0a0a", border:"1px solid #262626", borderRadius:"8px", color:"#f5f5f5", padding:"9px 12px", fontSize:"13px", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };

  return (
    <div style={S}>
      {msg && <div style={{ background:"#0a1a0a", border:"1px solid #166534", borderRadius:"8px", padding:"8px 14px", color:"#34d399", fontSize:"13px", marginBottom:"14px" }}>{msg}</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"24px" }}>
        {tiers.map(t => (
          <div key={t.id} style={{ background:"#111", border:`1px solid ${TIER_COLORS[t.key] ?? "#1f1f1f"}`, borderRadius:"14px", padding:"20px", position:"relative" }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
              <div>
                <div style={{ fontSize:"16px", fontWeight:"800", color:"#f5f5f5" }}>{t.name}</div>
                <div style={{ fontSize:"22px", fontWeight:"800", color:"#818cf8", marginTop:"4px" }}>${t.price_monthly}<span style={{ fontSize:"12px", color:"#525252", fontWeight:"400" }}>/mo</span></div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"11px", color:"#525252" }}>Active clinics</div>
                <div style={{ fontSize:"20px", fontWeight:"800", color:"#f5f5f5" }}>{tierCounts[t.key] ?? 0}</div>
              </div>
            </div>

            {/* Features */}
            <div style={{ marginBottom:"16px" }}>
              {ALL_FEATURES.map(f => {
                const has = (t.features ?? []).includes(f.key);
                return (
                  <div key={f.key} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"5px" }}>
                    <span style={{ fontSize:"12px", color: has ? "#34d399" : "#2a2a2a", fontWeight:"700" }}>{has ? "✓" : "✕"}</span>
                    <span style={{ fontSize:"12px", color: has ? "#d4d4d4" : "#404040" }}>{f.label}</span>
                  </div>
                );
              })}
            </div>

            <button onClick={() => startEdit(t)}
              style={{ width:"100%", background:"#1f1f1f", color:"#a3a3a3", border:"1px solid #2a2a2a", borderRadius:"8px", padding:"8px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
              ✏️ Edit Tier
            </button>
          </div>
        ))}
      </div>

      {/* Edit panel */}
      {editing && (
        <div style={{ background:"#111", border:"1px solid #6366f1", borderRadius:"14px", padding:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <h3 style={{ fontSize:"14px", fontWeight:"700", color:"#f5f5f5", margin:0 }}>Editing: {editing.name}</h3>
            <button onClick={() => setEditing(null)} style={{ background:"none", border:"none", color:"#525252", fontSize:"18px", cursor:"pointer" }}>✕</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Name</label>
              <input value={editing.name} onChange={e => setEditing({...editing, name:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Monthly Price ($)</label>
              <input type="number" value={editing.price_monthly ?? ""} onChange={e => setEditing({...editing, price_monthly: e.target.value === "" ? 0 : parseFloat(e.target.value)})} style={inp} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px" }}>Status</label>
              <select value={editing.is_active ? "active" : "inactive"} onChange={e => setEditing({...editing, is_active: e.target.value==="active"})} style={inp}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom:"16px" }}>
            <label style={{ display:"block", fontSize:"11px", color:"#525252", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Features Included</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {ALL_FEATURES.map(f => {
                const has = editing.features.includes(f.key);
                return (
                  <button key={f.key} type="button" onClick={() => toggleFeature(f.key)}
                    style={{ display:"flex", alignItems:"center", gap:"8px", background: has ? "#0f2e1a" : "#0a0a0a",
                      border:`1px solid ${has ? "#166534" : "#262626"}`, borderRadius:"8px", padding:"8px 12px",
                      cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <span style={{ fontSize:"14px", color: has ? "#34d399" : "#404040", fontWeight:"700" }}>{has ? "✓" : "○"}</span>
                    <span style={{ fontSize:"12px", color: has ? "#d4d4d4" : "#525252" }}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            style={{ background: saving ? "#334155" : "#6366f1", color:"#fff", border:"none", borderRadius:"8px", padding:"10px 20px", fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
