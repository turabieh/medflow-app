"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/superadmin/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid credentials"); setLoading(false); return; }
      router.push("/superadmin");
      router.refresh();
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width:"100%", background:"#111", border:"1px solid #262626",
    borderRadius:"8px", color:"#f5f5f5", padding:"12px 14px",
    fontSize:"14px", fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  };

  return (
    <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
      {error && (
        <div style={{ background:"#1a0a0a", border:"1px solid #7f1d1d", borderRadius:"8px", padding:"10px 14px", color:"#fca5a5", fontSize:"13px" }}>
          {error}
        </div>
      )}
      <div>
        <label style={{ display:"block", fontSize:"11px", color:"#737373", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="admin@velotech.app" />
      </div>
      <div>
        <label style={{ display:"block", fontSize:"11px", color:"#737373", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
      </div>
      <button type="submit" disabled={loading}
        style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:"8px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginTop:"4px", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
