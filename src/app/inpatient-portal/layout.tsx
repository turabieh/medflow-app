import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Inpatient Portal — MedFlow",
  description: "Doctor inpatient mobile portal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function InpatientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ip-root">
      <style>{`
        .ip-root { min-height: 100vh; background: #0f172a; font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; }
        .ip-root * { box-sizing: border-box; }
        .ip-card { background: #1e293b; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .ip-btn { width: 100%; border: none; border-radius: 12px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .ip-btn-primary { background: #3b82f6; color: #fff; }
        .ip-btn-secondary { background: #1e293b; color: #94a3b8; border: 1.5px solid #334155; }
        .ip-btn-green { background: #166534; color: #86efac; }
        .ip-btn-danger { background: #7f1d1d; color: #fca5a5; }
        .ip-input { width: 100%; background: #0f172a; border: 1.5px solid #334155; border-radius: 10px; color: #f1f5f9; padding: 14px 16px; font-size: 15px; font-family: inherit; outline: none; }
        .ip-input:focus { border-color: #3b82f6; }
        .ip-label { font-size: 12px; color: #64748b; display: block; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .ip-tag { display: inline-block; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
        .ip-section-title { font-size: 11px; color: #3b82f6; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px; }
        .ip-error { background: #450a0a; border: 1px solid #dc2626; border-radius: 8px; padding: 10px 14px; color: #fca5a5; font-size: 13px; margin-bottom: 12px; }
      `}</style>
      {children}
    </div>
  );
}
