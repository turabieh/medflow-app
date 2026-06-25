"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const VISIT_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation", urgent: "Urgent Consultation",
  follow_up: "Follow-up", procedure: "Procedure", round: "Morning Round",
};

export default function InpatientVisitPrintPage() {
  const searchParams = useSearchParams();
  const visitId     = searchParams.get("visitId") ?? "";
  const inpatientId = searchParams.get("inpatientId") ?? "";
  const currency    = searchParams.get("currency") ?? "JOD";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title; document.title = " ";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!visitId) { setLoading(false); return; }
    async function load() {
      const supabase = createClient();
      const [{ data: visit }, { data: admission }, { data: clinic }, { data: procs }, { data: doctor }] = await Promise.all([
        supabase.from("visits").select("id, visit_date, visit_time, visit_type, visit_fee, visit_fee_type, status, clinical_note, voice_notes, key_clinical_points, patient_summary, subjective").eq("id", visitId).single(),
        supabase.from("inpatients").select("location, hospital_patient_id, diagnosis_summary, patients(full_name, full_name_ar, dob, gender, blood_type, allergies), hospitals(name, address, primary_phone)").eq("id", inpatientId).single(),
        supabase.from("clinics").select("name, name_ar, tagline, logo_url, address, phone, email").limit(1).single(),
        supabase.from("inpatient_visit_procedures").select("procedure_name, price, notes").eq("visit_id", visitId).order("created_at"),
        supabase.from("users").select("full_name, specialty, signature_url").eq("id", (await supabase.from("visits").select("doctor_id").eq("id", visitId).single()).data?.doctor_id ?? "").single(),
      ]);
      setData({ visit, admission, clinic, procs: procs ?? [], doctor });
      setLoading(false);
    }
    load();
  }, [visitId, inpatientId]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Loading...</div>;
  if (!data?.visit) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>Visit not found.</div>;

  const { visit, admission, clinic, procs, doctor } = data as any;
  const patient  = Array.isArray(admission?.patients)  ? admission?.patients[0]  : admission?.patients;
  const hospital = Array.isArray(admission?.hospitals) ? admission?.hospitals[0] : admission?.hospitals;
  const age = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  const visitLabel = VISIT_TYPE_LABELS[visit.visit_fee_type ?? visit.visit_type] ?? visit.visit_type;
  const proceduresTotal = procs.reduce((s: number, p: any) => s + (p.price ?? 0), 0);
  const visitTotal = (visit.visit_fee ?? 0) + proceduresTotal;

  // Parse SOAP
  function parseSoap(text: string) {
    return [
      { key: "SUBJECTIVE", label: "S — Subjective" },
      { key: "OBJECTIVE",  label: "O — Objective"  },
      { key: "ASSESSMENT", label: "A — Assessment"  },
      { key: "PLAN",       label: "P — Plan"        },
    ].flatMap((sec, idx, arr) => {
      const start = text.indexOf(sec.key + ":");
      if (start === -1) return [];
      const nexts = arr.slice(idx+1).map(s => text.indexOf(s.key+":")).filter(p => p !== -1);
      const end = nexts.length ? Math.min(...nexts) : text.length;
      const content = text.slice(start + sec.key.length + 1, end).trim();
      return content ? [{ label: sec.label, text: content }] : [];
    });
  }

  const soapSections = visit.clinical_note ? parseSoap(visit.clinical_note) : [];

  // Symptoms from subjective
  const symptoms = (visit.subjective ?? "").split("\n")
    .filter((l: string) => l.startsWith("[MANUAL_SYMPTOM:"))
    .map((l: string) => l.replace("[MANUAL_SYMPTOM:", "").replace("]", "").trim());

  const s = {
    page:    { maxWidth:"750px", margin:"0 auto", padding:"32px 40px", fontFamily:"Arial, sans-serif", fontSize:"12px", color:"#1a1a1a" } as React.CSSProperties,
    fLabel:  { fontSize:"9px", textTransform:"uppercase" as const, letterSpacing:"0.5px", color:"#999", marginBottom:"2px" },
    fValue:  { fontSize:"12px", fontWeight:"600" as const, color:"#111" },
    secTitle:{ fontSize:"9px", fontWeight:"700" as const, textTransform:"uppercase" as const, letterSpacing:"1.5px", color:"#777", paddingBottom:"5px", borderBottom:"1px solid #e0e0e0", marginBottom:"10px" },
    soapTag: { display:"inline-block" as const, fontSize:"10px", fontWeight:"700" as const, background:"#1a1a1a", color:"#fff", padding:"2px 8px", borderRadius:"3px", marginBottom:"6px" },
    soapBody:{ fontSize:"12px", lineHeight:"1.75", whiteSpace:"pre-wrap" as const, color:"#222", paddingLeft:"4px" },
    th:      { background:"#1a1a1a", color:"#fff", fontSize:"10px", textTransform:"uppercase" as const, padding:"6px 10px", textAlign:"left" as const, fontWeight:"600" as const },
    td:      { padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:"12px" },
    table:   { width:"100%", borderCollapse:"collapse" as const },
  };

  return (
    <>
            <style>{`
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; }
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #ccc !important; }
        }
      `}</style>
      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", zIndex:100, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
        <button onClick={() => window.print()} style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>Print / Save PDF</button>
        <span style={{ fontSize:"10px", color:"#888", background:"rgba(255,255,255,0.95)", padding:"2px 8px", borderRadius:"4px" }}>Enable "Background graphics" in print settings</span>
      </div>

      <div style={s.page}>
        {/* Header */}
        <div style={{ borderBottom:"3px solid #1a1a1a", marginBottom:"20px", paddingBottom:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
              {clinic?.logo_url && <img src={clinic.logo_url} alt="logo" style={{ height:"64px", width:"64px", objectFit:"contain", border:"1px solid #eee", borderRadius:"8px" }} />}
              <div>
                <div style={{ fontSize:"16px", fontWeight:"700" }}>{clinic?.name}</div>
                {clinic?.tagline && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{clinic.tagline}</div>}
                <div style={{ marginTop:"5px", fontSize:"10px", color:"#555", lineHeight:"1.6" }}>
                  {clinic?.address && <div>{clinic.address}</div>}
                  {clinic?.phone   && <div>T: {clinic.phone}</div>}
                  {clinic?.email   && <div>{clinic.email}</div>}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"14px", fontWeight:"700", color:"#333" }}>{clinic?.name_ar ?? ""}</div>
            </div>
          </div>
          <div style={{ background:"#1a1a1a", color:"#fff", padding:"6px 16px", marginTop:"14px", display:"flex", justifyContent:"space-between" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>Inpatient Visit Report</div>
            <div style={{ fontSize:"11px", color:"#ccc" }}>{visitLabel} · {visit.visit_date}{visit.visit_time ? ` at ${visit.visit_time.slice(0,5)}` : ""}</div>
          </div>
        </div>

        {/* Patient + Hospital */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px", marginBottom:"20px" }}>
          <div>
            <div style={s.secTitle}>Patient</div>
            <div style={{ fontSize:"14px", fontWeight:"700" }}>{patient?.full_name}</div>
            {patient?.full_name_ar && <div style={{ fontSize:"12px", color:"#666", direction:"rtl" }}>{patient.full_name_ar}</div>}
            <div style={{ marginTop:"6px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {age !== null && <div><div style={s.fLabel}>Age</div><div style={s.fValue}>{age} yrs</div></div>}
              {patient?.gender && <div><div style={s.fLabel}>Gender</div><div style={{ ...s.fValue, textTransform:"capitalize" }}>{patient.gender}</div></div>}
              {patient?.blood_type && <div><div style={s.fLabel}>Blood type</div><div style={{ ...s.fValue, color:"#dc2626" }}>{patient.blood_type}</div></div>}
              {admission?.hospital_patient_id && <div><div style={s.fLabel}>Hospital MRN</div><div style={{ ...s.fValue, fontFamily:"monospace" }}>{admission.hospital_patient_id}</div></div>}
            </div>
            {patient?.allergies && (
              <div style={{ marginTop:"8px" }}>
                <div style={s.fLabel}>Allergies</div>
                <div style={{ fontSize:"11px", color:"#dc2626", fontWeight:"600" }}>{patient.allergies}</div>
              </div>
            )}
          </div>
          <div>
            <div style={s.secTitle}>Hospital</div>
            <div style={{ fontSize:"13px", fontWeight:"700" }}>{hospital?.name}</div>
            {hospital?.address && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{hospital.address}</div>}
            {admission?.location && (
              <div style={{ marginTop:"8px" }}>
                <div style={s.fLabel}>Location</div>
                <div style={s.fValue}>{admission.location}</div>
              </div>
            )}
            {admission?.diagnosis_summary && (
              <div style={{ marginTop:"8px" }}>
                <div style={s.fLabel}>Admitting Diagnosis</div>
                <div style={s.fValue}>{admission.diagnosis_summary}</div>
              </div>
            )}
          </div>
        </div>

        {/* Symptoms */}
        {symptoms.length > 0 && (
          <div style={{ marginBottom:"20px" }}>
            <div style={s.secTitle}>Presenting Symptoms</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
              {symptoms.map((s2: string) => (
                <span key={s2} style={{ background:"#fee2e2", color:"#991b1b", fontSize:"11px", padding:"2px 10px", borderRadius:"10px", fontWeight:"500" }}>{s2}</span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Note */}
        {(visit.clinical_note || visit.voice_notes) && (
          <div style={{ marginBottom:"20px" }}>
            <div style={s.secTitle}>Clinical Note</div>
            {soapSections.length > 0 ? soapSections.map((sec: {label:string;text:string}) => (
              <div key={sec.label} style={{ marginBottom:"12px" }}>
                <div style={s.soapTag}>{sec.label}</div>
                <div style={s.soapBody}>{sec.text}</div>
              </div>
            )) : (
              <div style={s.soapBody}>{visit.clinical_note || visit.voice_notes}</div>
            )}
            {visit.key_clinical_points && (
              <div style={{ marginTop:"12px" }}>
                <div style={s.soapTag}>Key Points</div>
                <div style={s.soapBody}>{visit.key_clinical_points}</div>
              </div>
            )}
          </div>
        )}

        {/* Procedures */}
        {procs.length > 0 && (
          <div style={{ marginBottom:"20px" }}>
            <div style={s.secTitle}>Procedures Performed</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Procedure</th>
                <th style={s.th}>Notes</th>
                <th style={{ ...s.th, textAlign:"right" }}>Fee ({currency})</th>
              </tr></thead>
              <tbody>
                {procs.map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight:"600" }}>{p.procedure_name}</td>
                    <td style={s.td}>{p.notes || "—"}</td>
                    <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace" }}>{p.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Billing summary */}
        <div style={{ marginBottom:"20px", background:"#f8f8f8", border:"1px solid #e0e0e0", borderRadius:"6px", padding:"12px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px", fontSize:"12px" }}>
            <span>Visit fee</span>
            <span style={{ fontFamily:"monospace" }}>{(visit.visit_fee ?? 0).toFixed(2)} {currency}</span>
          </div>
          {proceduresTotal > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px", fontSize:"12px" }}>
              <span>Procedures total</span>
              <span style={{ fontFamily:"monospace" }}>{proceduresTotal.toFixed(2)} {currency}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #ddd", paddingTop:"6px", fontWeight:"700", fontSize:"14px" }}>
            <span>Total</span>
            <span style={{ fontFamily:"monospace" }}>{visitTotal.toFixed(2)} {currency}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop:"40px", paddingTop:"16px", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
            <div style={{ color:"#aaa", marginTop:"4px" }}>Date: {printDate}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            {doctor?.signature_url && (
              <img src={doctor.signature_url} alt="Signature"
                style={{ height:"56px", maxWidth:"200px", objectFit:"contain", display:"block", margin:"0 auto" }} />
            )}
            <div style={{ width:"220px", borderTop:"1px solid #222", paddingTop:"5px", marginTop: doctor?.signature_url ? "4px" : "48px" }}>
              <div style={{ fontWeight:"700", fontSize:"11px" }}>{doctor?.full_name}</div>
              {doctor?.specialty && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{doctor.specialty}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
