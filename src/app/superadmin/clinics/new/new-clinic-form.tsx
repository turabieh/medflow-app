"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tier = { key: string; name: string; price_monthly: number };

export function NewClinicForm({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();

  // Clinic fields
  const [clinicName, setClinicName]   = useState("");
  const [clinicNameAr, setClinicNameAr] = useState("");
  const [slug, setSlug]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [address, setAddress]         = useState("");
  const [currency, setCurrency]       = useState("JOD");
  const [tierKey, setTierKey]         = useState(tiers[0]?.key ?? "basic");

  // Admin user fields
  const [adminName, setAdminName]     = useState("");
  const [adminEmail, setAdminEmail]   = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Auto-generate slug from clinic name
  function handleClinicNameChange(val: string) {
    setClinicName(val);
    if (!slug || slug === autoSlug(clinicName)) {
      setSlug(autoSlug(val));
    }
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicName || !slug || !adminName || !adminEmail || !adminPassword) {
      setError("Please fill all required fields.");
      return;
    }
    if (adminPassword.length < 8) {
      setError("Admin password must be at least 8 characters.");
      return;
    }
    setSaving(true); setError("");

    const res = await fetch("/api/superadmin/clinics/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic: { name: clinicName, nameAr: clinicNameAr, slug, email, phone, address, currency, tier: tierKey },
        admin:  { fullName: adminName, email: adminEmail, password: adminPassword },
        tierKey,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Failed to create clinic."); return; }
    router.push(`/superadmin/clinics/${data.clinicId}`);
  }

  const inp: React.CSSProperties = {
    width:"100%", background:"#0a0a0a", border:"1px solid #262626",
    borderRadius:"8px", color:"#f5f5f5", padding:"10px 12px",
    fontSize:"13px", fontFamily:"inherit", boxSizing:"border-box", outline:"none",
  };
  const label = (text: string, required = false): React.CSSProperties => ({ display:"block", fontSize:"11px", color:"#525252", marginBottom:"5px", textTransform:"uppercase" as const, letterSpacing:"0.5px" });
  const section: React.CSSProperties = { background:"#111", border:"1px solid #1f1f1f", borderRadius:"12px", padding:"20px", marginBottom:"16px" };
  const grid2: React.CSSProperties  = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background:"#1a0808", border:"1px solid #7f1d1d", borderRadius:"8px", padding:"10px 14px", color:"#fca5a5", fontSize:"13px", marginBottom:"14px" }}>
          ⚠ {error}
        </div>
      )}

      {/* Clinic details */}
      <div style={section}>
        <p style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 14px" }}>Clinic Information</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div style={grid2}>
            <div>
              <label style={label("Clinic Name")}>Clinic Name (EN) *</label>
              <input value={clinicName} onChange={e => handleClinicNameChange(e.target.value)} required placeholder="Maali Neurology Clinic" style={inp} />
            </div>
            <div>
              <label style={label("Clinic Name AR")}>Clinic Name (AR)</label>
              <input value={clinicNameAr} onChange={e => setClinicNameAr(e.target.value)} placeholder="عيادة مالي للأعصاب" style={{ ...inp, direction:"rtl" }} />
            </div>
          </div>
          <div style={grid2}>
            <div>
              <label style={label("Slug")}>URL Slug * <span style={{ color:"#404040", textTransform:"none" }}>({slug}.medflow.app)</span></label>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} required placeholder="maali-neurology" style={{ ...inp, fontFamily:"monospace" }} />
            </div>
            <div>
              <label style={label("Currency")}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                {["JOD","USD","EUR","SAR","AED","EGP"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={grid2}>
            <div>
              <label style={label("Email")}>Contact Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinic@example.com" style={inp} />
            </div>
            <div>
              <label style={label("Phone")}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+962 6 xxx xxxx" style={inp} />
            </div>
          </div>
          <div>
            <label style={label("Address")}>Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Building, Street, City" style={inp} />
          </div>
        </div>
      </div>

      {/* Subscription tier */}
      <div style={section}>
        <p style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 14px" }}>Subscription Tier</p>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${tiers.length},1fr)`, gap:"8px" }}>
          {tiers.map(t => (
            <button key={t.key} type="button" onClick={() => setTierKey(t.key)}
              style={{ background: tierKey===t.key ? "#6366f1" : "#0a0a0a", color: tierKey===t.key ? "#fff" : "#737373",
                border:`1.5px solid ${tierKey===t.key ? "#6366f1" : "#262626"}`, borderRadius:"10px",
                padding:"12px", cursor:"pointer", fontFamily:"inherit", textAlign:"center" }}>
              <div style={{ fontSize:"14px", fontWeight:"800" }}>{t.name}</div>
              <div style={{ fontSize:"12px", marginTop:"2px", opacity:0.8 }}>${t.price_monthly}/mo</div>
            </button>
          ))}
        </div>
      </div>

      {/* Admin account */}
      <div style={section}>
        <p style={{ fontSize:"13px", fontWeight:"700", color:"#a3a3a3", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 4px" }}>Clinic Admin Account</p>
        <p style={{ fontSize:"12px", color:"#404040", margin:"0 0 14px" }}>This person will manage the clinic — they can add doctors, secretaries, and configure everything.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div>
            <label style={label("Admin Name")}>Admin Full Name *</label>
            <input value={adminName} onChange={e => setAdminName(e.target.value)} required placeholder="Dr. Ahmad Al-Hassan" style={inp} />
          </div>
          <div style={grid2}>
            <div>
              <label style={label("Admin Email")}>Admin Email * <span style={{ color:"#404040", textTransform:"none" }}>(used to login)</span></label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required placeholder="admin@clinic.com" style={inp} />
            </div>
            <div>
              <label style={label("Password")}>Temporary Password * <span style={{ color:"#404040", textTransform:"none" }}>(min 8 chars)</span></label>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required minLength={8} placeholder="••••••••" style={inp} />
            </div>
          </div>
          <p style={{ fontSize:"11px", color:"#404040", margin:0 }}>
            ℹ Share these credentials with the clinic admin. They can change their password after first login.
          </p>
        </div>
      </div>

      <button type="submit" disabled={saving}
        style={{ width:"100%", background: saving ? "#334155" : "#6366f1", color:"#fff", border:"none",
          borderRadius:"10px", padding:"14px", fontSize:"15px", fontWeight:"700",
          cursor:"pointer", fontFamily:"inherit", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Creating clinic..." : "✓ Create Clinic & Admin Account"}
      </button>
    </form>
  );
}
