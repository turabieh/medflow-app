import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

function publicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function LoginPage() {
  const sb = publicClient();
  const { data: settings } = await sb
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "login_banner_url",
      "login_company_name",
      "login_tagline",
      "login_description",
      "login_contact_email",
      "login_contact_phone",
      "login_website",
    ]);

  const s = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));

  const bannerUrl     = s.login_banner_url    || "";
  const companyName   = s.login_company_name  || "VeloTech";
  const tagline       = s.login_tagline       || "Smart Clinic Management";
  const description   = s.login_description   || "";
  const contactEmail  = s.login_contact_email || "";
  const contactPhone  = s.login_contact_phone || "";
  const website       = s.login_website       || "";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: "#f8f7f4",
    }}>
      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div style={{
        flex: "0 0 52%",
        background: "linear-gradient(145deg, #0A2342 0%, #0D3B66 60%, #1a5a8a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        {/* Gold accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 4,
          background: "linear-gradient(90deg, #C9A84C, #e8c96d, #C9A84C)",
        }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
          {/* Company name */}
          <div style={{ marginBottom: "2.5rem" }}>
            <p style={{
              fontSize: "0.75rem", fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "#C9A84C", marginBottom: "0.5rem",
            }}>
              {companyName}
            </p>
            <h1 style={{
              fontSize: "2.6rem", fontWeight: 800,
              color: "#ffffff", lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}>
              {tagline}
            </h1>
            <div style={{
              width: 48, height: 3, marginTop: "1rem",
              background: "linear-gradient(90deg, #C9A84C, transparent)",
              borderRadius: 2,
            }} />
          </div>

          {/* Banner image */}
          {bannerUrl && (
            <div style={{
              width: "100%",
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: "2rem",
              boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#fff",
            }}>
              <img
                src={bannerUrl}
                alt="MedFlow"
                style={{ width: "100%", display: "block", objectFit: "contain" }}
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <p style={{
              fontSize: "0.95rem", lineHeight: 1.75,
              color: "rgba(255,255,255,0.75)",
              marginBottom: "2.5rem",
            }}>
              {description}
            </p>
          )}

          {/* Contact info */}
          {(contactEmail || contactPhone || website) && (
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "1.5rem",
              display: "flex", flexDirection: "column", gap: "0.6rem",
            }}>
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  color: "rgba(255,255,255,0.6)", fontSize: "0.83rem",
                  textDecoration: "none",
                }}>
                  <svg style={{width:15,height:15,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  color: "rgba(255,255,255,0.6)", fontSize: "0.83rem",
                  textDecoration: "none",
                }}>
                  <svg style={{width:15,height:15,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  {contactPhone}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  color: "rgba(255,255,255,0.6)", fontSize: "0.83rem",
                  textDecoration: "none",
                }}>
                  <svg style={{width:15,height:15,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
                  </svg>
                  {website.replace("https://", "")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Login form ───────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        background: "#ffffff",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* MedFlow wordmark */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontSize: "1.75rem", fontWeight: 800,
              color: "#0A2342", letterSpacing: "-0.02em",
              marginBottom: "0.4rem",
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#9CA3AF" }}>
              Sign in to your MedFlow account
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
