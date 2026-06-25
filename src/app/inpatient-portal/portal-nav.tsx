"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PortalNav({ active }: { active: "home" | "patients" | "admit" }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/inpatient-portal/login");
  }

  const tabs = [
    { id: "home",     href: "/inpatient-portal",         icon: "🏠", label: "Home" },
    { id: "patients", href: "/inpatient-portal/patients", icon: "👥", label: "Patients" },
    { id: "admit",    href: "/inpatient-portal/admit",    icon: "➕", label: "Admit" },
  ] as const;

  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0,
      background:"#1e293b", borderTop:"1px solid #334155",
      display:"flex", justifyContent:"space-around", alignItems:"center",
      padding:"10px 0 max(10px, env(safe-area-inset-bottom))",
      zIndex: 100, maxWidth:"480px", margin:"0 auto",
    }}>
      {tabs.map(t => (
        <Link key={t.id} href={t.href} style={{ textDecoration:"none", textAlign:"center", flex:1 }}>
          <div style={{ fontSize:"22px" }}>{t.icon}</div>
          <div style={{ fontSize:"11px", color: active === t.id ? "#3b82f6" : "#64748b", fontWeight: active === t.id ? "700" : "400", marginTop:"2px" }}>
            {t.label}
          </div>
        </Link>
      ))}
      <button onClick={signOut} style={{ background:"none", border:"none", cursor:"pointer", flex:1, textAlign:"center", padding:0 }}>
        <div style={{ fontSize:"22px" }}>↩</div>
        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>Sign Out</div>
      </button>
    </div>
  );
}
