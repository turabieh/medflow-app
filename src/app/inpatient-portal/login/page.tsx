"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("Invalid email or password."); setLoading(false); return; }
    router.push("/inpatient-portal");
    router.refresh();
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"24px", maxWidth:"400px", margin:"0 auto" }}>
      {/* Logo area */}
      <div style={{ textAlign:"center", marginBottom:"36px" }}>
        <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏥</div>
        <div style={{ fontSize:"24px", fontWeight:"800", color:"#f1f5f9" }}>Inpatient Portal</div>
        <div style={{ fontSize:"14px", color:"#64748b", marginTop:"4px" }}>MedFlow · Doctor Access</div>
      </div>

      <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
        {error && <div className="ip-error">⚠ {error}</div>}
        <div>
          <label className="ip-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="doctor@clinic.com" required autoComplete="email"
            className="ip-input" style={{ fontSize:"16px" }} />
        </div>
        <div>
          <label className="ip-label">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            className="ip-input" style={{ fontSize:"16px" }} />
        </div>
        <button type="submit" disabled={loading} className="ip-btn ip-btn-primary"
          style={{ marginTop:"8px", fontSize:"17px", padding:"18px" }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </form>

      <p style={{ textAlign:"center", fontSize:"12px", color:"#334155", marginTop:"32px" }}>
        Use your MedFlow doctor credentials
      </p>
    </div>
  );
}
