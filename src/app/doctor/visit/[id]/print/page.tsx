"use client";

// This must be a client component - print pages cannot use <html> in server components
// The layout bypass didn't work due to Next.js caching, so we render as a normal page
// with @media print CSS to hide everything except the report content.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VisitPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const visitId = params.id as string;
  const type = searchParams.get("type") ?? "note";

  const [data, setData] = useState<{
    visit: Record<string, unknown>;
    patient: Record<string, unknown> | null;
    doctor: Record<string, unknown> | null;
    clinic: Record<string, unknown> | null;
    prescriptions: Record<string, unknown>[];
    diagnoses: Record<string, unknown>[];
    labs: Record<string, unknown>[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: visit } = await supabase
        .from("visits")
        .select("id, visit_date, visit_type, voice_notes, key_clinical_points, clinical_note, patient_summary, heart_rate, blood_pressure, temperature, oxygen_saturation, resp_rate, weight_kg, height_cm, appointment_id, patient_id, doctor_id")
        .eq("id", visitId)
        .single();

      if (!visit) { setLoading(false); return; }

      const [{ data: patient }, { data: doctor }, { data: clinic }, { data: prescriptions }, { data: diagnoses }, { data: labs }] = await Promise.all([
        supabase.from("patients").select("full_name, full_name_ar, dob, gender, blood_type, allergies, phone").eq("id", visit.patient_id as string).single(),
        supabase.from("users").select("full_name, specialty, signature_url").eq("id", visit.doctor_id as string).single(),
        supabase.from("clinics").select("name, name_ar, tagline, tagline_ar, logo_url, phone, phone2, email, website, address, address_ar").limit(1).single(),
        supabase.from("prescriptions").select("medication_name, dose, unit, instructions, duration").eq("visit_id", visitId),
        supabase.from("visit_diagnoses").select("icd_code, description, is_primary").eq("visit_id", visitId),
        supabase.from("visit_labs").select("type, name, lab_date, findings").eq("visit_id", visitId),
      ]);

      setData({ visit, patient, doctor, clinic, prescriptions: prescriptions ?? [], diagnoses: diagnoses ?? [], labs: labs ?? [] });
      setLoading(false);
    }
    load();
  }, [visitId]);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Arial,sans-serif",fontSize:"14px",color:"#666"}}>
      Loading report...
    </div>
  );

  if (!data) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Arial,sans-serif",fontSize:"14px",color:"#c00"}}>
      Visit not found.
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { visit, patient, doctor, clinic, prescriptions, diagnoses, labs } = data as any;
  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const age = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob as string).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  const titles: Record<string, string> = { note: "Clinical Note", prescription: "Prescription", summary: "Patient Summary" };

  function parseSoap(text: string) {
    const secs = [{ key: "SUBJECTIVE", label: "S — Subjective" }, { key: "OBJECTIVE", label: "O — Objective" }, { key: "ASSESSMENT", label: "A — Assessment" }, { key: "PLAN", label: "P — Plan" }];
    return secs.flatMap((sec, idx) => {
      const start = text.indexOf(sec.key + ":");
      if (start === -1) return [];
      const nexts = secs.slice(idx + 1).map(s => text.indexOf(s.key + ":")).filter(p => p !== -1);
      const end = nexts.length ? Math.min(...nexts) : text.length;
      const content = text.slice(start + sec.key.length + 1, end).trim();
      return content ? [{ label: sec.label, text: content }] : [];
    });
  }

  const soapSections = visit.clinical_note ? parseSoap(visit.clinical_note as string) : [];

  const s: Record<string, React.CSSProperties> = {
    page: { maxWidth: "750px", margin: "0 auto", padding: "40px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#1a1a1a", background: "#fff" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1a1a1a", paddingBottom: "16px", marginBottom: "24px" },
    clinicName: { fontSize: "18px", fontWeight: "700" },
    docType: { fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#333" },
    docDate: { fontSize: "11px", color: "#888", marginTop: "6px" },
    strip: { background: "#f8f8f8", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" },
    fLabel: { fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#999", marginBottom: "2px" } as React.CSSProperties,
    fValue: { fontSize: "12px", fontWeight: "600", color: "#111" },
    secTitle: { fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#777", paddingBottom: "5px", borderBottom: "1px solid #e0e0e0", marginBottom: "10px" } as React.CSSProperties,
    sec: { marginBottom: "20px" },
    soapTag: { display: "inline-block", fontSize: "10px", fontWeight: "700", background: "#1a1a1a", color: "#fff", padding: "2px 8px", borderRadius: "3px", marginBottom: "6px", letterSpacing: "0.5px" } as React.CSSProperties,
    soapBody: { fontSize: "12px", lineHeight: "1.75", whiteSpace: "pre-wrap", color: "#222", paddingLeft: "4px" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } as React.CSSProperties,
    th: { background: "#f0f0f0", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", padding: "6px 10px", textAlign: "left", color: "#555", fontWeight: "600" } as React.CSSProperties,
    td: { padding: "7px 10px", borderBottom: "1px solid #f0f0f0" },
    footer: { marginTop: "50px", paddingTop: "16px", borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    sigLine: { width: "200px", borderTop: "1px solid #333", paddingTop: "4px", textAlign: "center" } as React.CSSProperties,
    allergyBadge: { background: "#fee2e2", color: "#991b1b", fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", marginRight: "4px", display: "inline-block" },
    vitGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px", marginBottom: "20px" },
    vitCard: { border: "1px solid #e8e8e8", borderRadius: "5px", padding: "8px 10px" },
    printBtn: { position: "fixed", top: "16px", right: "16px", background: "#1a1a1a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", zIndex: 100 } as React.CSSProperties,
  };

  return (
    <>
      <style>{`@page { margin: 12mm; size: A4; } @media print { .no-print { display:none!important; } body { background:#fff; margin:0; } nav, aside, header, [class*="sidebar"] { display:none!important; } }`}</style>
      <button className="no-print" style={s.printBtn} onClick={() => window.print()}>Print / Save PDF</button>

      <div style={s.page}>
        {/* Professional bilingual header */}
        <div style={{ marginBottom: "0" }}>
          {/* Top row: logo left | Arabic right */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid #ddd" }}>

            {/* LEFT: Logo + English */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              {(clinic?.logo_url as string) && (
                <img src={clinic.logo_url as string} alt="logo"
                  style={{ height: "72px", width: "72px", objectFit: "contain", flexShrink: 0, border: "1px solid #eee", borderRadius: "8px" }} />
              )}
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#111", lineHeight: "1.2" }}>
                  {(clinic?.name as string) ?? "Clinic"}
                </div>
                {(clinic?.tagline as string) && (
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{clinic.tagline as string}</div>
                )}
                <div style={{ marginTop: "5px", fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
                  {(clinic?.address as string) && <div>{clinic.address as string}</div>}
                  {(clinic?.phone as string) && <div>T: {clinic.phone as string}{(clinic?.phone2 as string) ? `  |  ${clinic.phone2 as string}` : ""}</div>}
                  {(clinic?.email as string) && <div>{clinic.email as string}</div>}
                  {(clinic?.website as string) && <div>{clinic.website as string}</div>}
                </div>
              </div>
            </div>

            {/* RIGHT: Arabic */}
            <div style={{ textAlign: "right", direction: "rtl" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#111", lineHeight: "1.2" }}>
                {(clinic?.name_ar as string) || ""}
              </div>
              {(clinic?.tagline_ar as string) && (
                <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{clinic.tagline_ar as string}</div>
              )}
              <div style={{ marginTop: "5px", fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
                {(clinic?.address_ar as string) && <div>{clinic.address_ar as string}</div>}
                {(clinic?.phone as string) && <div>{clinic.phone as string}{(clinic?.phone2 as string) ? `  |  ${clinic.phone2 as string}` : ""}</div>}
                {(clinic?.email as string) && <div>{clinic.email as string}</div>}
              </div>
            </div>
          </div>

          {/* Document title bar */}
          <div style={{ background: "#1a1a1a", color: "#fff", padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2.5px" }}>
              {titles[type] ?? "Report"}
            </div>
            <div style={{ fontSize: "11px", color: "#ccc" }}>{printDate}</div>
          </div>
        </div>

        {/* Patient strip */}
        <div style={s.strip}>
          <div><div style={s.fLabel}>Patient</div><div style={s.fValue}>{patient?.full_name as string}</div></div>
          {age !== null && <div><div style={s.fLabel}>Age</div><div style={s.fValue}>{age} yrs</div></div>}
          <div><div style={s.fLabel}>Gender</div><div style={{ ...s.fValue, textTransform: "capitalize" }}>{(patient?.gender as string) ?? "—"}</div></div>
          <div><div style={s.fLabel}>Blood type</div><div style={{ ...s.fValue, color: "#dc2626" }}>{(patient?.blood_type as string) ?? "—"}</div></div>
          {(patient?.allergies as string) && (
            <div style={{ gridColumn: "1/-1", borderTop: "1px solid #e8e8e8", paddingTop: "8px", marginTop: "4px" }}>
              <span style={{ ...s.fLabel, marginBottom: 0, marginRight: "8px" }}>Allergies:</span>
              {(patient.allergies as string).split(",").map((a: string) => <span key={a} style={s.allergyBadge}>{a.trim()}</span>)}
            </div>
          )}
        </div>

        {/* Visit info */}
        <div style={s.sec}>
          <div style={s.secTitle}>Visit</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
            <div><div style={s.fLabel}>Date</div><div style={s.fValue}>{(visit.visit_date as string) ?? printDate}</div></div>
            <div><div style={s.fLabel}>Type</div><div style={{ ...s.fValue, textTransform: "capitalize" }}>{visit.visit_type as string}</div></div>
            <div><div style={s.fLabel}>Physician</div><div style={s.fValue}>{(doctor?.full_name as string) ?? "—"}</div></div>
            {(doctor?.specialty as string) && <div><div style={s.fLabel}>Specialty</div><div style={s.fValue}>{(doctor as Record<string,unknown>)?.specialty as string}</div></div>}
          </div>
        </div>

        {/* Vitals */}
        {(visit.heart_rate || visit.blood_pressure || visit.temperature || visit.oxygen_saturation) && (
          <div style={s.sec}>
            <div style={s.secTitle}>Vitals</div>
            <div style={s.vitGrid}>
              {Boolean(visit.heart_rate) && <div style={s.vitCard}><div style={{ fontSize: "9px", color: "#999" }}>Heart rate</div><div style={{ fontSize: "14px", fontWeight: "700" }}>{String(visit.heart_rate)} <span style={{ fontSize: "9px", color: "#aaa" }}>bpm</span></div></div>}
              {Boolean(visit.blood_pressure) && <div style={s.vitCard}><div style={{ fontSize: "9px", color: "#999" }}>Blood pressure</div><div style={{ fontSize: "14px", fontWeight: "700" }}>{String(visit.blood_pressure)}</div></div>}
              {Boolean(visit.temperature) && <div style={s.vitCard}><div style={{ fontSize: "9px", color: "#999" }}>Temperature</div><div style={{ fontSize: "14px", fontWeight: "700" }}>{String(visit.temperature)}<span style={{ fontSize: "9px", color: "#aaa" }}>°C</span></div></div>}
              {Boolean(visit.oxygen_saturation) && <div style={s.vitCard}><div style={{ fontSize: "9px", color: "#999" }}>O₂ sat</div><div style={{ fontSize: "14px", fontWeight: "700" }}>{String(visit.oxygen_saturation)}<span style={{ fontSize: "9px", color: "#aaa" }}>%</span></div></div>}
              {Boolean(visit.resp_rate) && <div style={s.vitCard}><div style={{ fontSize: "9px", color: "#999" }}>Resp. rate</div><div style={{ fontSize: "14px", fontWeight: "700" }}>{String(visit.resp_rate)}<span style={{ fontSize: "9px", color: "#aaa" }}>/min</span></div></div>}
            </div>
          </div>
        )}

        {/* Diagnoses */}
        {diagnoses.length > 0 && (
          <div style={s.sec}>
            <div style={s.secTitle}>Diagnosis</div>
            {diagnoses.map((d: any, i: number) => (
              <div key={i} style={{ padding: "5px 0", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                {(d.icd_code as string) && <span style={{ fontFamily: "monospace", fontSize: "11px", background: "#f0f0f0", padding: "1px 6px", borderRadius: "3px" }}>{d.icd_code as string}</span>}
                <span>{d.description as string}</span>
                {d.is_primary && <span style={{ fontSize: "9px", fontWeight: "700", background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: "8px" }}>Primary</span>}
              </div>
            ))}
          </div>
        )}

        {/* Clinical Note */}
        {type === "note" && (visit.clinical_note || visit.voice_notes) && (
          <div style={s.sec}>
            <div style={s.secTitle}>Clinical Note</div>
            {soapSections.length > 0 ? soapSections.map(sec => (
              <div key={sec.label} style={{ marginBottom: "14px" }}>
                <div style={s.soapTag}>{sec.label}</div>
                <div style={s.soapBody}>{sec.text}</div>
              </div>
            )) : (
              <div style={s.soapBody}>{(visit.clinical_note || visit.voice_notes) as string}</div>
            )}
            {(visit.key_clinical_points as string) && (
              <div style={{ marginTop: "12px" }}>
                <div style={s.soapTag}>Key Points</div>
                <div style={s.soapBody}>{visit.key_clinical_points as string}</div>
              </div>
            )}
          </div>
        )}

        {/* Medications */}
        {(type === "note" || type === "prescription") && prescriptions.length > 0 && (
          <div style={s.sec}>
            <div style={s.secTitle}>Medications</div>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Medication</th><th style={s.th}>Dose</th><th style={s.th}>Instructions</th><th style={s.th}>Duration</th></tr></thead>
              <tbody>{prescriptions.map((rx: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...s.td, fontWeight: "600" }}>{rx.medication_name as string}</td>
                  <td style={s.td}>{[(rx.dose as string), (rx.unit as string)].filter(Boolean).join(" ") || "—"}</td>
                  <td style={s.td}>{(rx.instructions as string) || "—"}</td>
                  <td style={s.td}>{(rx.duration as string) || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* Labs */}
        {type === "note" && labs.length > 0 && (
          <div style={s.sec}>
            <div style={s.secTitle}>Labs &amp; Imaging</div>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Type</th><th style={s.th}>Name</th><th style={s.th}>Date</th><th style={s.th}>Findings</th></tr></thead>
              <tbody>{labs.map((lab: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...s.td, textTransform: "capitalize" }}>{lab.type as string}</td>
                  <td style={{ ...s.td, fontWeight: "600" }}>{lab.name as string}</td>
                  <td style={s.td}>{(lab.lab_date as string) || "—"}</td>
                  <td style={s.td}>{(lab.findings as string) || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* Patient Summary */}
        {type === "summary" && (visit.patient_summary as string) && (() => {
          const text = visit.patient_summary as string;
          const arIdx = text.indexOf("ملخص بالعربية:");
          const en = (arIdx > -1 ? text.slice(0, arIdx) : text).replace(/English Summary:/i, "").trim();
          const ar = arIdx > -1 ? text.slice(arIdx + "ملخص بالعربية:".length).trim() : "";
          return (
            <>
              {en && <div style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "16px", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "8px" }}>English Summary</div>
                <div style={{ fontSize: "13px", lineHeight: "1.8" }}>{en}</div>
              </div>}
              {ar && <div style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "8px", textAlign: "right" }}>ملخص بالعربية</div>
                <div style={{ fontSize: "14px", lineHeight: "1.8", direction: "rtl", textAlign: "right" }}>{ar}</div>
              </div>}
            </>
          );
        })()}

        {/* Footer */}
        <div style={s.footer}>
          <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.6" }}>
            <div style={{ fontWeight: "600" }}>{clinic?.name as string}</div>
            {(clinic?.address as string) && <div>{(clinic as Record<string,unknown>)?.address as string}</div>}
            {(clinic?.phone as string) && <div>Tel: {(clinic as Record<string,unknown>)?.phone as string}</div>}
            <div style={{ marginTop: "4px", color: "#aaa" }}>Date: {printDate}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {(doctor?.signature_url as string) && (
              <img
                src={doctor.signature_url as string}
                alt="Signature"
                style={{ height: "56px", maxWidth: "200px", objectFit: "contain", display: "block", margin: "0 auto 0" }}
              />
            )}
            <div style={{ width: "220px", borderTop: "1px solid #222", paddingTop: "5px", marginTop: (doctor?.signature_url as string) ? "4px" : "48px" }}>
              <div style={{ fontWeight: "700", fontSize: "11px", color: "#222" }}>{doctor?.full_name as string}</div>
              {(doctor?.specialty as string) && (
                <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{(doctor as Record<string,unknown>)?.specialty as string}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
