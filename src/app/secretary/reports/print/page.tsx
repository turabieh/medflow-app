"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AnyRecord = Record<string, unknown>;

const TITLES: Record<string, string> = {
  note:         "Clinical Note",
  prescription: "Prescription",
  summary:      "Patient Summary",
  invoice:      "Invoice",
  appointment:  "Appointment Confirmation",
};


// ── Invoice section component ────────────────────────────────────────────────
function InvoiceSection({ appointment, doctor, patient, insurance, visit, printDate, s }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appointment: any; doctor: any; patient: any; insurance: any; visit: any; printDate: string; s: any;
}) {
  const isPaid      = !!appointment.payment_confirmed;
  const isInsurance = appointment.payment_method === "insurance";
  // visit_fee is new field; fall back to payment_amount for old records
  const visitFee  = Number(appointment.visit_fee || appointment.payment_amount || 0);
  const cashPaid  = isInsurance
    ? Number(appointment.patient_cash_amount || 0)
    : Number(appointment.payment_amount || 0);
  const insClaim  = Number(appointment.insurance_claim_amount || 0);
  const patMethod = appointment.patient_payment_method || (!isInsurance ? appointment.payment_method : null);

  return (
    <div style={s.sec}>
      <div style={s.secTitle}>Invoice</div>

      {/* Visit fee table */}
      <table style={s.table}>
        <thead><tr>
          <th style={s.th}>Description</th>
          <th style={s.th}>Date</th>
          <th style={{ ...s.th, textAlign:"right" as const }}>Amount</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style={s.td}>Medical consultation — {doctor?.full_name ?? "Physician"}</td>
            <td style={s.td}>{appointment.appt_date ?? visit?.visit_date ?? printDate}</td>
            <td style={{ ...s.td, textAlign:"right" as const, fontWeight:"700", fontSize:"14px" }}>
              {visitFee > 0 ? visitFee.toFixed(2) : "—"}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ background:"#f8f8f8" }}>
            <td colSpan={2} style={{ ...s.td, fontWeight:"700", textAlign:"right" as const }}>Total Visit Fee</td>
            <td style={{ ...s.td, fontWeight:"800", fontSize:"15px", textAlign:"right" as const, color:"#111" }}>
              {visitFee > 0 ? visitFee.toFixed(2) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Payment breakdown */}
      <div style={{ marginTop:"14px", border:"1px solid #e0e0e0", borderRadius:"6px", overflow:"hidden" }}>
        <div style={{ background:"#f8f8f8", padding:"8px 14px", borderBottom:"1px solid #e0e0e0" }}>
          <span style={{ fontSize:"10px", fontWeight:"700" as const, textTransform:"uppercase" as const, letterSpacing:"1px", color:"#555" }}>
            Payment Details
          </span>
        </div>
        <div style={{ padding:"12px 14px" }}>
          {!isPaid ? (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"12px", color:"#666" }}>Payment status</span>
              <span style={{ fontWeight:"700", color:"#d97706", fontSize:"13px" }}>⏳ Payment Pending</span>
            </div>
          ) : isInsurance ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                <div>
                  <span style={{ fontSize:"12px", fontWeight:"600" as const }}>
                    Patient paid {patMethod ? `(${patMethod})` : ""}
                  </span>
                  <span style={{ fontSize:"10px", color:"#666", marginLeft:"6px" }}>collected today</span>
                </div>
                <span style={{ fontWeight:"700" as const, color:"#166534", fontSize:"13px" }}>
                  {cashPaid.toFixed(2)} ✓
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"8px", borderTop:"1px solid #f0f0f0", marginBottom:"8px" }}>
                <div>
                  <span style={{ fontSize:"12px", fontWeight:"600" as const }}>
                    Insurance claim {insurance ? `— ${insurance.name}` : ""}
                  </span>
                  <span style={{ fontSize:"10px", color:"#666", marginLeft:"6px" }}>to be claimed</span>
                </div>
                <span style={{ fontWeight:"700" as const, color:"#1d4ed8", fontSize:"13px" }}>
                  {insClaim.toFixed(2)}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"8px", borderTop:"2px solid #e0e0e0" }}>
                <span style={{ fontSize:"11px", fontWeight:"700" as const }}>Total Covered</span>
                <span style={{ fontSize:"12px", fontWeight:"800" as const }}>
                  {(cashPaid + insClaim).toFixed(2)} / {visitFee.toFixed(2)}
                </span>
              </div>
              {patient.insurance_policy_number && (
                <div style={{ fontSize:"10px", color:"#888", marginTop:"8px" }}>
                  Policy #: {patient.insurance_policy_number}
                </div>
              )}
            </>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:"12px", fontWeight:"600" as const, textTransform:"capitalize" as const }}>
                Paid by {appointment.payment_method ?? "—"}
              </span>
              <span style={{ fontWeight:"800" as const, color:"#166534", fontSize:"14px" }}>
                {cashPaid > 0 ? `${cashPaid.toFixed(2)} ✓` : "—"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SecretaryPrintPage() {
  const searchParams = useSearchParams();
  const type      = searchParams.get("type") ?? "note";
  const visitId   = searchParams.get("visitId") ?? "";
  const patientId = searchParams.get("patientId") ?? "";

  const [data, setData] = useState<{
    visit: AnyRecord | null;
    patient: AnyRecord | null;
    doctor: AnyRecord | null;
    clinic: AnyRecord | null;
    prescriptions: AnyRecord[];
    diagnoses: AnyRecord[];
    appointment: AnyRecord | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title;
    document.title = " ";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    async function load() {
      const supabase = createClient();
      const [{ data: patient }, { data: clinic }] = await Promise.all([
        supabase.from("patients").select("*, insurance_companies(name)").eq("id", patientId).single(),
        supabase.from("clinics").select("name, name_ar, tagline, tagline_ar, logo_url, phone, phone2, email, website, address, address_ar").limit(1).single(),
      ]);

      let visit: AnyRecord | null = null;
      let doctor: AnyRecord | null = null;
      let prescriptions: AnyRecord[] = [];
      let diagnoses: AnyRecord[] = [];
      let appointment: AnyRecord | null = null;

      if (visitId) {
        const { data: v } = await supabase
          .from("visits")
          .select("id, visit_date, visit_type, status, clinical_note, patient_summary, voice_notes, key_clinical_points, heart_rate, blood_pressure, temperature, oxygen_saturation, resp_rate, weight_kg, height_cm, doctor_id, appointment_id")
          .eq("id", visitId).single();
        visit = v ?? null;

        if (v?.doctor_id) {
          const { data: d } = await supabase.from("users").select("full_name, specialty, signature_url").eq("id", v.doctor_id as string).single();
          doctor = d ?? null;
        }
        const [{ data: rx }, { data: dx }] = await Promise.all([
          supabase.from("prescriptions").select("medication_name, dose, unit, instructions, duration").eq("visit_id", visitId),
          supabase.from("visit_diagnoses").select("icd_code, description, is_primary").eq("visit_id", visitId),
        ]);
        prescriptions = rx ?? [];
        diagnoses = dx ?? [];

        if (v?.appointment_id) {
          const { data: appt } = await supabase
            .from("appointments")
            .select("appt_date, appt_time, status, visit_fee, payment_amount, payment_method, patient_cash_amount, insurance_claim_amount, patient_payment_method")
            .eq("id", v.appointment_id as string).single();
          appointment = appt ?? null;
        }
      } else if (type === "appointment") {
        // Latest appointment if no visit
        const { data: appt } = await supabase
          .from("appointments")
          .select("appt_date, appt_time, status, visit_fee, payment_amount, payment_method, patient_cash_amount, insurance_claim_amount, patient_payment_method, doctor_id")
          .eq("patient_id", patientId)
          .order("appt_date", { ascending: false })
          .limit(1).single();
        appointment = appt ?? null;
        if (appt?.doctor_id) {
          const { data: d } = await supabase.from("users").select("full_name, specialty, signature_url").eq("id", appt.doctor_id as string).single();
          doctor = d ?? null;
        }
      }

      setData({ visit, patient: patient ?? null, doctor, clinic: clinic ?? null, prescriptions, diagnoses, appointment });
      setLoading(false);
    }
    load();
  }, [visitId, patientId, type]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"Arial,sans-serif", color:"#666" }}>
      Loading report...
    </div>
  );

  if (!data?.patient) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"Arial,sans-serif", color:"#c00" }}>
      Patient not found.
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { visit, patient, doctor, clinic, prescriptions, diagnoses, appointment } = data as any;

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  function parseSoap(text: string) {
    const secs = [
      { key: "SUBJECTIVE", label: "S — Subjective" },
      { key: "OBJECTIVE",  label: "O — Objective"  },
      { key: "ASSESSMENT", label: "A — Assessment"  },
      { key: "PLAN",       label: "P — Plan"        },
    ];
    return secs.flatMap((sec, idx) => {
      const start = text.indexOf(sec.key + ":");
      if (start === -1) return [];
      const nexts = secs.slice(idx+1).map(s => text.indexOf(s.key+":")).filter(p => p !== -1);
      const end = nexts.length ? Math.min(...nexts) : text.length;
      const content = text.slice(start + sec.key.length + 1, end).trim();
      return content ? [{ label: sec.label, text: content }] : [];
    });
  }

  const soapSections = visit?.clinical_note ? parseSoap(visit.clinical_note) : [];
  const insurance = Array.isArray(patient?.insurance_companies) ? patient.insurance_companies[0] : patient?.insurance_companies;

  const s = {
    page:      { maxWidth: "750px", margin: "0 auto", padding: "32px 40px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#1a1a1a", background: "#fff" } as React.CSSProperties,
    secTitle:  { fontSize: "9px", fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#777", paddingBottom: "5px", borderBottom: "1px solid #e0e0e0", marginBottom: "10px" },
    sec:       { marginBottom: "20px" } as React.CSSProperties,
    fLabel:    { fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#999", marginBottom: "2px" },
    fValue:    { fontSize: "12px", fontWeight: "600" as const, color: "#111" },
    soapTag:   { display: "inline-block" as const, fontSize: "10px", fontWeight: "700" as const, background: "#1a1a1a", color: "#fff", padding: "2px 8px", borderRadius: "3px", marginBottom: "6px" },
    soapBody:  { fontSize: "12px", lineHeight: "1.75", whiteSpace: "pre-wrap" as const, color: "#222", paddingLeft: "4px" },
    th:        { background: "#f0f0f0", fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.5px", padding: "6px 10px", textAlign: "left" as const, color: "#555", fontWeight: "600" as const },
    td:        { padding: "7px 10px", borderBottom: "1px solid #f0f0f0", fontSize: "12px" },
    table:     { width: "100%", borderCollapse: "collapse" as const },
  };

  return (
    <>
      <style>{`
        @page { margin: 0mm; size: A4; }
        @media print { .no-print { display:none!important; } body { background:#fff; } }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px", zIndex:100 }}>
        <button onClick={() => window.print()}
          style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
          Print / Save PDF
        </button>
        <span style={{ fontSize:"10px", color:"#888", background:"rgba(255,255,255,0.95)", padding:"2px 8px", borderRadius:"4px" }}>
          In print dialog: Margins = <strong>None</strong>, uncheck Headers &amp; Footers
        </span>
      </div>

      <div style={s.page}>
        {/* ── HEADER ── */}
        <div style={{ marginBottom: "0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:"12px", borderBottom:"1px solid #ddd" }}>
            {/* Left: logo + English */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
              {clinic?.logo_url && (
                <img src={clinic.logo_url} alt="logo"
                  style={{ height:"72px", width:"72px", objectFit:"contain", flexShrink:0, border:"1px solid #eee", borderRadius:"8px" }} />
              )}
              <div>
                <div style={{ fontSize:"15px", fontWeight:"700", color:"#111" }}>{clinic?.name ?? "Clinic"}</div>
                {clinic?.tagline && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{clinic.tagline}</div>}
                <div style={{ marginTop:"5px", fontSize:"10px", color:"#555", lineHeight:"1.6" }}>
                  {clinic?.address && <div>{clinic.address}</div>}
                  {clinic?.phone  && <div>T: {clinic.phone}{clinic?.phone2 ? `  |  ${clinic.phone2}` : ""}</div>}
                  {clinic?.email  && <div>{clinic.email}</div>}
                  {clinic?.website && <div>{clinic.website}</div>}
                </div>
              </div>
            </div>
            {/* Right: Arabic */}
            <div style={{ textAlign:"right", direction:"rtl" }}>
              <div style={{ fontSize:"15px", fontWeight:"700", color:"#111" }}>{clinic?.name_ar ?? ""}</div>
              {clinic?.tagline_ar && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{clinic.tagline_ar}</div>}
              <div style={{ marginTop:"5px", fontSize:"10px", color:"#555", lineHeight:"1.6" }}>
                {clinic?.address_ar && <div>{clinic.address_ar}</div>}
                {clinic?.phone     && <div>{clinic.phone}{clinic?.phone2 ? `  |  ${clinic.phone2}` : ""}</div>}
                {clinic?.email     && <div>{clinic.email}</div>}
              </div>
            </div>
          </div>
          {/* Title bar */}
          <div style={{ background:"#1a1a1a", color:"#fff", padding:"6px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2.5px" }}>{TITLES[type] ?? "Report"}</div>
            <div style={{ fontSize:"11px", color:"#ccc" }}>{printDate}</div>
          </div>
        </div>

        {/* ── PATIENT STRIP ── */}
        <div style={{ background:"#f8f8f8", border:"1px solid #e0e0e0", borderRadius:"6px", padding:"12px 16px", marginBottom:"20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px" }}>
            <div><div style={s.fLabel}>Patient</div><div style={s.fValue}>{patient.full_name}</div></div>
            {age !== null && <div><div style={s.fLabel}>Age</div><div style={s.fValue}>{age} yrs</div></div>}
            <div><div style={s.fLabel}>Gender</div><div style={{ ...s.fValue, textTransform:"capitalize" }}>{patient.gender ?? "—"}</div></div>
            <div><div style={s.fLabel}>Blood type</div><div style={{ ...s.fValue, color:"#dc2626" }}>{patient.blood_type ?? "—"}</div></div>
          </div>
          {patient.allergies && (
            <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #e8e8e8", display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={s.fLabel}>Allergies:</span>
              {patient.allergies.split(",").map((a: string) => (
                <span key={a} style={{ background:"#fee2e2", color:"#991b1b", fontSize:"10px", fontWeight:"600", padding:"2px 8px", borderRadius:"10px" }}>{a.trim()}</span>
              ))}
            </div>
          )}
          {insurance && (
            <div style={{ marginTop:"6px", fontSize:"10px", color:"#666" }}>
              Insurance: <strong>{insurance.name}</strong>
              {patient.insurance_policy_number && <span style={{ marginLeft:"6px", color:"#999" }}>{patient.insurance_policy_number}</span>}
            </div>
          )}
        </div>

        {/* ── VISIT INFO ── */}
        {visit && (
          <div style={s.sec}>
            <div style={s.secTitle}>Visit</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px" }}>
              <div><div style={s.fLabel}>Date</div><div style={s.fValue}>{visit.visit_date ?? printDate}</div></div>
              <div><div style={s.fLabel}>Type</div><div style={{ ...s.fValue, textTransform:"capitalize" }}>{visit.visit_type}</div></div>
              {doctor && <div><div style={s.fLabel}>Physician</div><div style={s.fValue}>{doctor.full_name}</div></div>}
              {doctor?.specialty && <div><div style={s.fLabel}>Specialty</div><div style={s.fValue}>{doctor.specialty}</div></div>}
            </div>
          </div>
        )}

        {/* ── VITALS ── */}
        {visit && (visit.heart_rate || visit.blood_pressure || visit.temperature || visit.oxygen_saturation) && (
          <div style={s.sec}>
            <div style={s.secTitle}>Vitals</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px" }}>
              {visit.heart_rate     && <div style={{ border:"1px solid #e8e8e8", borderRadius:"5px", padding:"8px 10px" }}><div style={{ fontSize:"9px", color:"#999" }}>Heart rate</div><div style={{ fontSize:"14px", fontWeight:"700" }}>{visit.heart_rate}<span style={{ fontSize:"9px", color:"#aaa" }}> bpm</span></div></div>}
              {visit.blood_pressure && <div style={{ border:"1px solid #e8e8e8", borderRadius:"5px", padding:"8px 10px" }}><div style={{ fontSize:"9px", color:"#999" }}>Blood pressure</div><div style={{ fontSize:"14px", fontWeight:"700" }}>{visit.blood_pressure}</div></div>}
              {visit.temperature    && <div style={{ border:"1px solid #e8e8e8", borderRadius:"5px", padding:"8px 10px" }}><div style={{ fontSize:"9px", color:"#999" }}>Temperature</div><div style={{ fontSize:"14px", fontWeight:"700" }}>{visit.temperature}<span style={{ fontSize:"9px", color:"#aaa" }}>°C</span></div></div>}
              {visit.oxygen_saturation && <div style={{ border:"1px solid #e8e8e8", borderRadius:"5px", padding:"8px 10px" }}><div style={{ fontSize:"9px", color:"#999" }}>O₂ sat</div><div style={{ fontSize:"14px", fontWeight:"700" }}>{visit.oxygen_saturation}<span style={{ fontSize:"9px", color:"#aaa" }}>%</span></div></div>}
              {visit.resp_rate      && <div style={{ border:"1px solid #e8e8e8", borderRadius:"5px", padding:"8px 10px" }}><div style={{ fontSize:"9px", color:"#999" }}>Resp. rate</div><div style={{ fontSize:"14px", fontWeight:"700" }}>{visit.resp_rate}<span style={{ fontSize:"9px", color:"#aaa" }}>/min</span></div></div>}
            </div>
          </div>
        )}

        {/* ── DIAGNOSIS ── */}
        {diagnoses.length > 0 && (type === "note" || type === "prescription" || type === "invoice") && (
          <div style={s.sec}>
            <div style={s.secTitle}>Diagnosis</div>
            {diagnoses.map((d: AnyRecord, i: number) => (
              <div key={i} style={{ padding:"5px 0", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:"8px", fontSize:"12px" }}>
                {Boolean(d.icd_code) && <span style={{ fontFamily:"monospace", fontSize:"11px", background:"#f0f0f0", padding:"1px 6px", borderRadius:"3px" }}>{d.icd_code as string}</span>}
                <span>{d.description as string}</span>
                {Boolean(d.is_primary) && <span style={{ fontSize:"9px", fontWeight:"700", background:"#dbeafe", color:"#1e40af", padding:"1px 6px", borderRadius:"8px" }}>Primary</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── CLINICAL NOTE (SOAP) ── */}
        {type === "note" && visit && (visit.clinical_note || visit.voice_notes) && (
          <div style={s.sec}>
            <div style={s.secTitle}>Clinical Note</div>
            {soapSections.length > 0 ? soapSections.map((sec: { label: string; text: string }) => (
              <div key={sec.label} style={{ marginBottom:"14px" }}>
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

        {/* ── PRESCRIPTION ── */}
        {(type === "note" || type === "prescription") && prescriptions.length > 0 && (
          <div style={s.sec}>
            <div style={s.secTitle}>Medications</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Medication</th>
                <th style={s.th}>Dose</th>
                <th style={s.th}>Instructions</th>
                <th style={s.th}>Duration</th>
              </tr></thead>
              <tbody>{prescriptions.map((rx: AnyRecord, i: number) => (
                <tr key={i}>
                  <td style={{ ...s.td, fontWeight:"600" }}>{rx.medication_name as string}</td>
                  <td style={s.td}>{[rx.dose, rx.unit].filter(Boolean).join(" ") || "—"}</td>
                  <td style={s.td}>{(rx.instructions as string) || "—"}</td>
                  <td style={s.td}>{(rx.duration as string) || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* ── PATIENT SUMMARY (bilingual) ── */}
        {type === "summary" && visit?.patient_summary && (() => {
          const text = visit.patient_summary as string;
          const arIdx = text.indexOf("ملخص بالعربية:");
          const en = (arIdx > -1 ? text.slice(0, arIdx) : text).replace(/English Summary:/i, "").trim();
          const ar = arIdx > -1 ? text.slice(arIdx + "ملخص بالعربية:".length).trim() : "";
          return (
            <>
              {en && <div style={{ border:"1px solid #e0e0e0", borderRadius:"6px", padding:"16px", marginBottom:"12px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", color:"#888", letterSpacing:"1px", marginBottom:"8px" }}>English Summary</div>
                <div style={{ fontSize:"13px", lineHeight:"1.8" }}>{en}</div>
              </div>}
              {ar && <div style={{ border:"1px solid #e0e0e0", borderRadius:"6px", padding:"16px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", color:"#888", letterSpacing:"1px", marginBottom:"8px", textAlign:"right" }}>ملخص بالعربية</div>
                <div style={{ fontSize:"14px", lineHeight:"1.8", direction:"rtl", textAlign:"right" }}>{ar}</div>
              </div>}
            </>
          );
        })()}

        {/* ── APPOINTMENT CONFIRMATION ── */}
        {type === "appointment" && appointment && (
          <div style={s.sec}>
            <div style={s.secTitle}>Appointment Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", padding:"16px", background:"#f8f8f8", borderRadius:"6px", border:"1px solid #e0e0e0" }}>
              <div><div style={s.fLabel}>Date</div><div style={{ ...s.fValue, fontSize:"14px" }}>{appointment.appt_date}</div></div>
              <div><div style={s.fLabel}>Time</div><div style={{ ...s.fValue, fontSize:"14px" }}>{appointment.appt_time ?? "—"}</div></div>
              <div><div style={s.fLabel}>Physician</div><div style={s.fValue}>{doctor?.full_name ?? "—"}</div></div>
            </div>
            <p style={{ marginTop:"16px", fontSize:"11px", color:"#666" }}>
              Please arrive 15 minutes before your scheduled appointment time. Bring this confirmation and any relevant medical records.
            </p>
            {clinic?.phone && (
              <p style={{ marginTop:"6px", fontSize:"11px", color:"#666" }}>
                For inquiries or rescheduling, please call: <strong>{clinic.phone}</strong>
              </p>
            )}
          </div>
        )}

                {/* ── INVOICE ── */}
        {type === "invoice" && appointment && (
          <InvoiceSection appointment={appointment} doctor={doctor} patient={patient} insurance={insurance} visit={visit} printDate={printDate} s={s} />
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop:"50px", paddingTop:"16px", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
            <div style={{ color:"#aaa", marginTop:"4px" }}>Date: {printDate}</div>
          </div>
          {doctor && (
            <div style={{ textAlign:"center" }}>
              {doctor.signature_url && (
                <img src={doctor.signature_url} alt="Signature"
                  style={{ height:"56px", maxWidth:"200px", objectFit:"contain", display:"block", margin:"0 auto" }} />
              )}
              <div style={{ width:"220px", borderTop:"1px solid #222", paddingTop:"5px", marginTop: doctor.signature_url ? "4px" : "48px" }}>
                <div style={{ fontWeight:"700", fontSize:"11px", color:"#222" }}>{doctor.full_name}</div>
                {doctor.specialty && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{doctor.specialty}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
