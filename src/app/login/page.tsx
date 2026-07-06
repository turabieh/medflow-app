import { createClient as sc } from "@supabase/supabase-js";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let banner = "", company = "VeloTech", tagline = "Smart Clinic Management",
      email = "", phone = "", website = "";
  try {
    const sb = sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await sb.from("app_settings").select("key,value")
      .in("key",["login_banner_url","login_company_name","login_tagline","login_contact_email","login_contact_phone","login_website"]);
    const s = Object.fromEntries((data??[]).map((r:{key:string;value:string})=>[r.key,r.value??""]));
    banner  = s.login_banner_url    || "";
    company = s.login_company_name  || "VeloTech";
    tagline = s.login_tagline       || "Smart Clinic Management";
    email   = s.login_contact_email || "";
    phone   = s.login_contact_phone || "";
    website = s.login_website       || "";
  } catch {}

  return (
    <div style={{minHeight:"100vh",background:"#F9F8F6",display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>

        {/* Logo / Banner image */}
        {banner && (
          <div style={{width:"100%",marginBottom:"2rem",borderRadius:16,overflow:"hidden",background:"#fff",boxShadow:"0 4px 24px rgba(10,35,66,0.08)"}}>
            <img src={banner} alt={company} style={{width:"100%",display:"block",objectFit:"contain",maxHeight:200}}/>
          </div>
        )}

        {/* Company + tagline */}
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <p style={{fontSize:"0.65rem",fontWeight:800,letterSpacing:"0.25em",textTransform:"uppercase",color:"#C9A84C",marginBottom:"0.4rem"}}>{company}</p>
          <h1 style={{fontSize:"1.6rem",fontWeight:800,color:"#0A2342",letterSpacing:"-0.02em",lineHeight:1.2}}>{tagline}</h1>
        </div>

        {/* Login card */}
        <div style={{width:"100%",background:"#fff",borderRadius:20,padding:"2rem",boxShadow:"0 4px 32px rgba(10,35,66,0.08)",border:"1px solid rgba(10,35,66,0.06)",marginBottom:"1.5rem"}}>
          <h2 style={{fontSize:"1.1rem",fontWeight:700,color:"#0A2342",marginBottom:"0.3rem"}}>Sign in</h2>
          <p style={{fontSize:"0.82rem",color:"#9CA3AF",marginBottom:"1.5rem"}}>Enter your credentials to continue</p>
          <LoginForm/>
        </div>

        {/* Contact info */}
        {(email||phone||website) && (
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"0.75rem 1.5rem",paddingTop:"0.5rem"}}>
            {email && <a href={`mailto:${email}`} style={{display:"flex",alignItems:"center",gap:"0.35rem",fontSize:"0.75rem",color:"#9CA3AF",textDecoration:"none"}}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              {email}
            </a>}
            {phone && <a href={`tel:${phone}`} style={{display:"flex",alignItems:"center",gap:"0.35rem",fontSize:"0.75rem",color:"#9CA3AF",textDecoration:"none"}}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              {phone}
            </a>}
            {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:"0.35rem",fontSize:"0.75rem",color:"#9CA3AF",textDecoration:"none"}}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
              {website.replace("https://","")}
            </a>}
          </div>
        )}

      </div>
    </div>
  );
}
