"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin}>
      {error && (
        <div style={{marginBottom:"1rem",padding:"0.75rem 1rem",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",fontSize:"0.85rem",color:"#dc2626"}}>
          {error}
        </div>
      )}

      <div style={{marginBottom:"1.25rem"}}>
        <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.85rem",fontWeight:500,color:"#374151"}}>
          Email address
        </label>
        <input
          type="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@clinic.com"
          style={{width:"100%",borderRadius:8,border:"1.5px solid #e5e7eb",padding:"0.65rem 0.875rem",fontSize:"0.9rem",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
          onFocus={e => e.target.style.borderColor="#0A2342"}
          onBlur={e => e.target.style.borderColor="#e5e7eb"}
        />
      </div>

      <div style={{marginBottom:"1.75rem"}}>
        <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.85rem",fontWeight:500,color:"#374151"}}>
          Password
        </label>
        <input
          type="password" required value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{width:"100%",borderRadius:8,border:"1.5px solid #e5e7eb",padding:"0.65rem 0.875rem",fontSize:"0.9rem",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
          onFocus={e => e.target.style.borderColor="#0A2342"}
          onBlur={e => e.target.style.borderColor="#e5e7eb"}
        />
      </div>

      <button
        type="submit" disabled={loading}
        style={{
          width:"100%",padding:"0.75rem",borderRadius:8,
          background: loading ? "#6b7280" : "#0A2342",
          color:"#fff",fontSize:"0.9rem",fontWeight:600,
          border:"none",cursor: loading ? "not-allowed" : "pointer",
          transition:"background 0.2s",
        }}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
