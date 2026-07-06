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
      "login_banner_url", "login_company_name", "login_tagline",
      "login_description", "login_contact_email", "login_contact_phone", "login_website",
    ]);

  const s = Object.fromEntries((settings ?? []).map(r => [r.key, r.value ?? ""]));

  const bannerUrl   = s.login_banner_url    || "";
  const companyName = s.login_company_name  || "VeloTech";
  const tagline     = s.login_tagline       || "Smart Clinic Management";
  const description = s.login_description   || "";
  const email       = s.login_contact_email || "";
  const phone       = s.login_contact_phone || "";
  const website     = s.login_website       || "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; }

        .login-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f8f7f4;
        }

        /* ── LEFT PANEL ── */
        .login-left {
          background: linear-gradient(150deg, #0A2342 0%, #0D3B66 55%, #1a5a8a 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0);
          background-size: 28px 28px;
        }

        .login-gold-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #C9A84C, #e8c96d, #C9A84C);
        }

        .login-left-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: center;
          gap: 2rem;
        }

        .login-company {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #C9A84C;
          margin-bottom: 0.5rem;
        }

        .login-tagline {
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .login-divider {
          width: 48px;
          height: 3px;
          background: linear-gradient(90deg, #C9A84C, transparent);
          border-radius: 2px;
          margin-top: 1rem;
        }

        .login-banner-img {
          width: 100%;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
          background: #fff;
        }

        .login-banner-img img {
          width: 100%;
          display: block;
          object-fit: contain;
        }

        .login-desc {
          font-size: 0.9rem;
          line-height: 1.8;
          color: rgba(255,255,255,0.7);
        }

        .login-contact {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .login-contact a {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255,255,255,0.55);
          font-size: 0.8rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-contact a:hover { color: rgba(255,255,255,0.85); }

        /* ── RIGHT PANEL ── */
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: #ffffff;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
        }

        .login-card-header {
          margin-bottom: 2.5rem;
        }

        .login-card-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0A2342;
          letter-spacing: -0.02em;
          margin-bottom: 0.4rem;
        }

        .login-card-header p {
          font-size: 0.875rem;
          color: #9CA3AF;
        }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .login-wrap {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .login-left {
            padding: 2rem 1.5rem;
            min-height: auto;
          }

          .login-left-content {
            gap: 1.25rem;
          }

          .login-tagline {
            font-size: 1.6rem;
          }

          .login-banner-img {
            display: none;
          }

          .login-desc {
            display: none;
          }

          .login-contact {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.75rem 1.5rem;
            padding-top: 1rem;
          }

          .login-right {
            padding: 2.5rem 1.5rem;
            background: #f8f7f4;
          }

          .login-card {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="login-wrap">
        {/* LEFT */}
        <div className="login-left">
          <div className="login-gold-bar" />
          <div className="login-left-content">
            <div>
              <p className="login-company">{companyName}</p>
              <h1 className="login-tagline">{tagline}</h1>
              <div className="login-divider" />
            </div>

            {bannerUrl && (
              <div className="login-banner-img">
                <img src={bannerUrl} alt="MedFlow" />
              </div>
            )}

            {description && <p className="login-desc">{description}</p>}

            {(email || phone || website) && (
              <div className="login-contact">
                {email && (
                  <a href={`mailto:${email}`}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    {email}
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {phone}
                  </a>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                    {website.replace("https://", "")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-card-header">
              <h2>Welcome back</h2>
              <p>Sign in to your MedFlow account</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
