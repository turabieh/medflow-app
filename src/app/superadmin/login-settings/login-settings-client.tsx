"use client";
import { useState, useRef } from "react";

interface S {
  login_banner_url: string; login_company_name: string; login_tagline: string;
  login_contact_email: string; login_contact_phone: string; login_website: string;
}

export function LoginPageSettings({ initial }: { initial: S }) {
  const [s, setS]               = useState(initial);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
    padding: "1.5rem", marginBottom: "1rem",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 700,
    color: "#374151", marginBottom: "0.4rem",
    textTransform: "uppercase", letterSpacing: "0.06em",
  };
  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #D1D5DB", borderRadius: 8,
    padding: "0.7rem 0.9rem", fontSize: "0.9rem", color: "#111827",
    background: "#fff", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  async function upload(file: File) {
    setUploading(true); setError(null);
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > 1200) { height = Math.round(height * 1200 / width); width = 1200; }
      const c = document.createElement("canvas"); c.width = width; c.height = height;
      c.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const base64 = c.toDataURL("image/jpeg", 0.88).split(",")[1];
      try {
        const res = await fetch("/api/superadmin/upload-banner", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
        });
        const d = await res.json();
        if (d.url) setS(p => ({ ...p, login_banner_url: d.url }));
        else setError(d.error ?? "Upload failed");
      } catch (e) { setError(String(e)); }
      setUploading(false);
    };
    img.onerror = () => { setError("Failed to read image"); setUploading(false); };
    img.src = url;
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/superadmin/login-settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const d = await res.json();
      if (d.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.error ?? "Save failed");
    } catch (e) { setError(String(e)); }
    setSaving(false);
  }

  const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={lbl}>{label}</label>
      <input
        style={inp} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.currentTarget.style.borderColor = "#0A2342"}
        onBlur={e => e.currentTarget.style.borderColor = "#D1D5DB"}
      />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 600 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0A2342", marginBottom: "0.3rem" }}>
        Login Page Settings
      </h2>
      <p style={{ fontSize: "0.85rem", color: "#6B7280", marginBottom: "1.75rem" }}>
        Customize what appears on the MedFlow login screen.
        <a href="/login" target="_blank" style={{ color: "#0A2342", fontWeight: 600, marginLeft: "0.5rem", textDecoration: "none" }}>
          Preview login page →
        </a>
      </p>

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: "0.83rem", color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* 1. Branding */}
      <div style={card}>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0A2342", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #F3F4F6" }}>
          🏷️ Branding
        </p>
        <Field label="Company Name" value={s.login_company_name} onChange={v => setS(p => ({ ...p, login_company_name: v }))} placeholder="VeloTech" />
        <Field label="Tagline" value={s.login_tagline} onChange={v => setS(p => ({ ...p, login_tagline: v }))} placeholder="Smart Clinic Management" />
      </div>

      {/* 2. Banner Image */}
      <div style={card}>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0A2342", marginBottom: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid #F3F4F6" }}>
          🖼️ Banner Image
        </p>
        <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "1rem" }}>
          Appears above the login form. White background recommended.
        </p>
        {s.login_banner_url && (
          <div style={{ marginBottom: "1rem", borderRadius: 10, overflow: "hidden", border: "1px solid #E5E7EB", background: "#F9FAFB", maxWidth: 320 }}>
            <img src={s.login_banner_url} alt="" style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 180 }} />
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button onClick={() => ref.current?.click()} disabled={uploading}
            style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: "1.5px solid #D1D5DB", background: "#fff", fontSize: "0.85rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            {uploading ? "Uploading…" : "📁 Upload Image"}
          </button>
          {s.login_banner_url && (
            <button onClick={() => setS(p => ({ ...p, login_banner_url: "" }))}
              style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: "1.5px solid #FCA5A5", background: "#FEF2F2", fontSize: "0.85rem", fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
              Remove
            </button>
          )}
        </div>
        <label style={lbl}>Or paste image URL</label>
        <input style={inp} value={s.login_banner_url}
          onChange={e => setS(p => ({ ...p, login_banner_url: e.target.value }))}
          placeholder="https://..."
          onFocus={e => e.currentTarget.style.borderColor = "#0A2342"}
          onBlur={e => e.currentTarget.style.borderColor = "#D1D5DB"} />
      </div>

      {/* 3. Contact Info */}
      <div style={card}>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0A2342", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #F3F4F6" }}>
          📞 Contact Information
        </p>
        <Field label="Email" value={s.login_contact_email} onChange={v => setS(p => ({ ...p, login_contact_email: v }))} placeholder="hello@velotech.app" />
        <Field label="Phone" value={s.login_contact_phone} onChange={v => setS(p => ({ ...p, login_contact_phone: v }))} placeholder="+962 79 000 0000" />
        <Field label="Website" value={s.login_website} onChange={v => setS(p => ({ ...p, login_website: v }))} placeholder="https://velotech.app" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingTop: "0.5rem" }}>
        <button onClick={save} disabled={saving} style={{
          padding: "0.8rem 2.5rem", borderRadius: 10,
          background: saving ? "#6B7280" : "#0A2342",
          color: "#fff", fontSize: "0.92rem", fontWeight: 700,
          border: "none", cursor: saving ? "not-allowed" : "pointer",
          boxShadow: saving ? "none" : "0 4px 12px rgba(10,35,66,0.2)",
        }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#059669" }}>✓ Saved successfully</span>}
      </div>
    </div>
  );
}
