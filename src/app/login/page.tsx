import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let s: Record<string,string> = {};
  try {
    const sb = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb.from("app_settings").select("key,value")
      .in("key",["login_banner_url","login_company_name","login_tagline","login_contact_email","login_contact_phone","login_website"]);
    s = Object.fromEntries((data??[]).map(r=>[r.key,r.value??""]));
  } catch { /* table may not exist yet */ }

  const banner  = s.login_banner_url    || "";
  const company = s.login_company_name  || "VeloTech";
  const tagline = s.login_tagline       || "Smart Clinic Management";
  const email   = s.login_contact_email || "";
  const phone   = s.login_contact_phone || "";
  const website = s.login_website       || "";

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"stretch",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* ── LEFT: branding panel ── */}
      <div style={{
        flex:"0 0 45%",
        background:"linear-gradient(160deg,#0A2342 0%,#0D3B66 100%)",
        display:"flex",flexDirection:"column",justifyContent:"center",
        padding:"4rem 3.5rem",position:"relative",overflow:"hidden",
      }}>
        {/* dot grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)",backgroundSize:"24px 24px"}}/>
        {/* gold top bar */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#C9A84C,#f0d97a,#C9A84C)"}}/>

        <div style={{position:"relative",zIndex:1}}>
          {/* company + tagline */}
          <p style={{fontSize:"0.65rem",fontWeight:800,letterSpacing:"0.25em",textTransform:"uppercase",color:"#C9A84C",marginBottom:"0.6rem"}}>{company}</p>
          <h1 style={{fontSize:"2.2rem",fontWeight:800,color:"#fff",lineHeight:1.2,letterSpacing:"-0.02em",marginBottom:"0.75rem"}}>{tagline}</h1>
          <div style={{width:40,height:3,background:"linear-gradient(90deg,#C9A84C,transparent)",borderRadius:2,marginBottom:"2.5rem"}}/>

          {/* banner image */}
          {banner && (
            <div style={{borderRadius:12,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.35)",background:"#fff",marginBottom:"2.5rem"}}>
              <img src={banner} alt="" style={{width:"100%",display:"block",objectFit:"contain",maxHeight:260}}/>
            </div>
          )}

          {/* contact */}
          {(email||phone||website) && (
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",paddingTop:"1.5rem",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
              {email  && <a href={`mailto:${email}`}  style={{color:"rgba(255,255,255,0.5)",fontSize:"0.78rem",textDecoration:"none",display:"flex",alignItems:"center",gap:"0.45rem"}}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                {email}
              </a>}
              {phone  && <a href={`tel:${phone}`}     style={{color:"rgba(255,255,255,0.5)",fontSize:"0.78rem",textDecoration:"none",display:"flex",alignItems:"center",gap:"0.45rem"}}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                {phone}
              </a>}
              {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{color:"rgba(255,255,255,0.5)",fontSize:"0.78rem",textDecoration:"none",display:"flex",alignItems:"center",gap:"0.45rem"}}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                {website.replace("https://","")}
              </a>}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: login form ── */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem 2rem",background:"#fff"}}>
        <div style={{width:"100%",maxWidth:360}}>
          <h2 style={{fontSize:"1.6rem",fontWeight:800,color:"#0A2342",marginBottom:"0.35rem",letterSpacing:"-0.02em"}}>Welcome back</h2>
          <p style={{fontSize:"0.85rem",color:"#9CA3AF",marginBottom:"2rem"}}>Sign in to your MedFlow account</p>
          <LoginForm/>
        </div>
      </div>
    </div>
  );
}
