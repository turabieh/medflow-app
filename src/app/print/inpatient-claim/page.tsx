"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function InpatientClaimPage() {
  const searchParams = useSearchParams();
  const inpatientId  = searchParams.get("inpatientId") ?? "";
  const currency     = searchParams.get("currency") ?? "JOD";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title;
    document.title = " ";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!inpatientId) { setLoading(false); return; }
    async function load() {
      const supabase = createClient();
      const { data: admission } = await supabase
        .from("inpatients")
        .select(`
          id, admission_date, location, status, discharge_date,
          hospital_patient_id, diagnosis_summary, fee_per_visit,
          patients(full_name, full_name_ar, dob, gender, blood_type),
          hospitals(name, address, primary_phone),
          users!inpatients_doctor_id_fkey(full_name, specialty, signature_url)
        `)
        .eq("id", inpatientId).single();

      const { data: visits } = await supabase
        .from("visits")
        .select("id, visit_date, status, clinical_note")
        .eq("inpatient_id", inpatientId)
        .in("status", ["done", "finalized", "in_progress"])
        .order("visit_date", { ascending: true });

      const { data: clinic } = await supabase
        .from("clinics")
        .select("name, name_ar, tagline, logo_url, address, phone, phone2, email")
        .limit(1).single();

      setData({ admission, visits: visits ?? [], clinic });
      setLoading(false);
    }
    load();
  }, [inpatientId]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Loading claim...</div>;
  if (!data?.admission) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>Admission not found.</div>;

  const { admission, visits, clinic } = data;
  const patient  = Array.isArray(admission.patients)  ? admission.patients[0]  : admission.patients;
  const hospital = Array.isArray(admission.hospitals) ? admission.hospitals[0] : admission.hospitals;
  const doctor   = Array.isArray(admission.users)     ? admission.users[0]     : admission.users;

  const feePerVisit = admission.fee_per_visit ?? 0;
  const totalFee = visits.length * feePerVisit;

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const s = {
    page:     { maxWidth: "750px", margin: "0 auto", padding: "32px 40px", fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#1a1a1a" } as React.CSSProperties,
    fLabel:   { fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#999", marginBottom: "2px" },
    fValue:   { fontSize: "12px", fontWeight: "600" as const, color: "#111" },
    secTitle: { fontSize: "9px", fontWeight: "700" as const, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#777", paddingBottom: "5px", borderBottom: "1px solid #e0e0e0", marginBottom: "10px" },
    th:       { background: "#1a1a1a", color: "#fff", fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.5px", padding: "7px 10px", textAlign: "left" as const, fontWeight: "600" as const },
    td:       { padding: "7px 10px", borderBottom: "1px solid #f0f0f0", fontSize: "12px" },
    table:    { width: "100%", borderCollapse: "collapse" as const },
  };

  return (
    <>
      <style>{`
        @page { margin: 0mm; size: A4; }
        @media print { .no-print { display:none!important; } }
      `}</style>

      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px", zIndex:100 }}>
        <button onClick={() => window.print()}
          style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
          Print / Save PDF
        </button>
        <span style={{ fontSize:"10px", color:"#888", background:"rgba(255,255,255,0.95)", padding:"2px 8px", borderRadius:"4px" }}>
          Set Margins = None · Uncheck Headers &amp; Footers
        </span>
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
                  {clinic?.phone  && <div>T: {clinic.phone}</div>}
                  {clinic?.email  && <div>{clinic.email}</div>}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"18px", fontWeight:"800", color:"#1a1a1a", letterSpacing:"1px" }}>MEDICAL CLAIM</div>
              <div style={{ fontSize:"11px", color:"#888", marginTop:"4px" }}>Date: {printDate}</div>
              {admission.hospital_patient_id && (
                <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>MRN: <strong>{admission.hospital_patient_id}</strong></div>
              )}
            </div>
          </div>

          {/* Dark title bar */}
          <div style={{ background:"#1a1a1a", color:"#fff", padding:"6px 16px", marginTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>Inpatient Claim</div>
            <div style={{ fontSize:"11px", color:"#ccc" }}>{admission.admission_date} – {admission.discharge_date ?? "Present"}</div>
          </div>
        </div>

        {/* To: Hospital */}
        <div style={{ marginBottom:"20px" }}>
          <div style={s.secTitle}>Billed To</div>
          <div style={{ fontSize:"13px", fontWeight:"700" }}>{hospital?.name}</div>
          {hospital?.address && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{hospital.address}</div>}
          {hospital?.primary_phone && <div style={{ fontSize:"11px", color:"#666" }}>Tel: {hospital.primary_phone}</div>}
        </div>

        {/* Patient info */}
        <div style={{ marginBottom:"20px" }}>
          <div style={s.secTitle}>Patient</div>
          <div style={{ background:"#f8f8f8", border:"1px solid #e0e0e0", borderRadius:"6px", padding:"12px 16px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px" }}>
            <div><div style={s.fLabel}>Name</div><div style={s.fValue}>{patient?.full_name}</div></div>
            {age !== null && <div><div style={s.fLabel}>Age</div><div style={s.fValue}>{age} yrs</div></div>}
            <div><div style={s.fLabel}>Gender</div><div style={{ ...s.fValue, textTransform:"capitalize" }}>{patient?.gender ?? "—"}</div></div>
            <div><div style={s.fLabel}>Blood type</div><div style={{ ...s.fValue, color:"#dc2626" }}>{patient?.blood_type ?? "—"}</div></div>
            <div><div style={s.fLabel}>Admission</div><div style={s.fValue}>{admission.admission_date}</div></div>
            <div><div style={s.fLabel}>Location</div><div style={s.fValue}>{admission.location}</div></div>
            <div><div style={s.fLabel}>Diagnosis</div><div style={s.fValue}>{admission.diagnosis_summary || "—"}</div></div>
            {admission.discharge_date && <div><div style={s.fLabel}>Discharge</div><div style={s.fValue}>{admission.discharge_date}</div></div>}
          </div>
        </div>

        {/* Visits table */}
        <div style={{ marginBottom:"24px" }}>
          <div style={s.secTitle}>Visit Log</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Physician</th>
                <th style={s.th}>Type</th>
                <th style={{ ...s.th, textAlign:"right" }}>Fee ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v: {id: string; visit_date: string; status: string}, idx: number) => (
                <tr key={v.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...s.td, color:"#999", fontFamily:"monospace", fontSize:"11px" }}>{idx + 1}</td>
                  <td style={{ ...s.td, fontWeight:"600" }}>{v.visit_date}</td>
                  <td style={s.td}>{doctor?.full_name ?? "—"}</td>
                  <td style={s.td}>Inpatient Round</td>
                  <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace" }}>
                    {feePerVisit > 0 ? feePerVisit.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#f8f8f8" }}>
                <td colSpan={4} style={{ ...s.td, fontWeight:"700", textAlign:"right", paddingRight:"20px", fontSize:"13px" }}>
                  Total ({visits.length} visits)
                </td>
                <td style={{ ...s.td, textAlign:"right", fontWeight:"800", fontSize:"16px", color:"#111", fontFamily:"monospace" }}>
                  {totalFee > 0 ? `${totalFee.toFixed(2)} ${currency}` : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop:"40px", paddingTop:"16px", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
            <div style={{ color:"#aaa", marginTop:"4px" }}>Issued: {printDate}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            {doctor?.signature_url && (
              <img src={doctor.signature_url} alt="Signature"
                style={{ height:"56px", maxWidth:"200px", objectFit:"contain", display:"block", margin:"0 auto" }} />
            )}
            <div style={{ width:"220px", borderTop:"1px solid #222", paddingTop:"5px", marginTop: doctor?.signature_url ? "4px" : "48px" }}>
              <div style={{ fontWeight:"700", fontSize:"11px", color:"#222" }}>{doctor?.full_name}</div>
              {doctor?.specialty && <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{doctor.specialty}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
