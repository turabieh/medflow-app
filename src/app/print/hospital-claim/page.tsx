"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function HospitalClaimPrintPage() {
  const searchParams = useSearchParams();
  const claimId  = searchParams.get("claimId") ?? "";
  const currency = searchParams.get("currency") ?? "JOD";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title; document.title = " ";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!claimId) { setLoading(false); return; }
    async function load() {
      const supabase = createClient();

      // Fetch claim
      const { data: claim } = await supabase
        .from("hospital_claims")
        .select("*, hospitals(name, address, primary_phone), users!hospital_claims_doctor_id_fkey(full_name, specialty, signature_url)")
        .eq("id", claimId).single();

      if (!claim) { setLoading(false); return; }

      // Fetch clinic
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name, name_ar, logo_url, address, phone, email, tagline")
        .limit(1).single();

      // Fetch all inpatient visits for this hospital in the date range
      const { data: inpatients } = await supabase
        .from("inpatients")
        .select("id, hospital_patient_id, location, patients(full_name, dob, gender)")
        .eq("hospital_id", claim.hospital_id)
        .eq("clinic_id", claim.clinic_id)
        .eq("doctor_id", claim.doctor_id);

      const inpatientIds = (inpatients ?? []).map((ip: { id: string }) => ip.id);

      // Fetch all visits in date range for these inpatients
      const { data: visits } = inpatientIds.length ? await supabase
        .from("visits")
        .select("id, visit_date, visit_time, visit_fee, visit_fee_type, inpatient_id")
        .in("inpatient_id", inpatientIds)
        .gte("visit_date", claim.from_date)
        .lte("visit_date", claim.to_date)
        .in("status", ["done", "finalized", "in_progress"])
        .order("visit_date", { ascending: true }) : { data: [] };

      // Fetch procedures for all these visits
      const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
      const { data: procedures } = visitIds.length ? await supabase
        .from("inpatient_visit_procedures")
        .select("visit_id, procedure_name, price")
        .in("visit_id", visitIds) : { data: [] };

      // Build inpatient map
      const ipMap = new Map((inpatients ?? []).map((ip: { id: string; hospital_patient_id: string | null; location: string; patients: unknown }) => [ip.id, ip]));

      // Group visits by inpatient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visitsByInpatient = new Map<string, any[]>();
      for (const v of visits ?? []) {
        const arr = visitsByInpatient.get(v.inpatient_id) ?? [];
        arr.push(v);
        visitsByInpatient.set(v.inpatient_id, arr);
      }

      // Build procedure map by visitId
      const procsByVisit = new Map<string, { procedure_name: string; price: number }[]>();
      for (const p of procedures ?? []) {
        const arr = procsByVisit.get(p.visit_id) ?? [];
        arr.push(p);
        procsByVisit.set(p.visit_id, arr);
      }

      // Calculate totals and update claim if needed
      let grandTotal = 0;
      const rows: {
        patientName: string;
        mrn: string;
        location: string;
        visitDate: string;
        visitTime: string;
        visitType: string;
        visitFee: number;
        procedures: { procedure_name: string; price: number }[];
        visitTotal: number;
      }[] = [];

      for (const [ipId, ipVisits] of visitsByInpatient.entries()) {
        const ip = ipMap.get(ipId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pt = Array.isArray(ip?.patients) ? ip?.patients[0] : ip?.patients as any;
        for (const v of ipVisits) {
          const procs = procsByVisit.get(v.id) ?? [];
          const procTotal = procs.reduce((s: number, p: { price: number }) => s + (p.price ?? 0), 0);
          const visitTotal = (v.visit_fee ?? 0) + procTotal;
          grandTotal += visitTotal;
          rows.push({
            patientName: pt?.full_name ?? "—",
            mrn:         ip?.hospital_patient_id ?? "—",
            location:    ip?.location ?? "—",
            visitDate:   v.visit_date ?? "—",
            visitTime:   v.visit_time ? v.visit_time.slice(0, 5) : "—",
            visitType:   v.visit_fee_type ?? v.visit_type ?? "Visit",
            visitFee:    v.visit_fee ?? 0,
            procedures:  procs,
            visitTotal,
          });
        }
      }

      // Update claim total in DB
      if (grandTotal > 0 && grandTotal !== claim.total_claimed) {
        await supabase.from("hospital_claims")
          .update({ total_claimed: grandTotal })
          .eq("id", claimId);
      }

      setData({ claim, clinic, rows, grandTotal });
      setLoading(false);
    }
    load();
  }, [claimId]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Loading claim...</div>;
  if (!data) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>Claim not found.</div>;

  const { claim, clinic, rows, grandTotal } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hospital = Array.isArray(claim.hospitals) ? claim.hospitals[0] : claim.hospitals as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doctor   = Array.isArray(claim.users) ? claim.users[0] : claim.users as any;

  const s = {
    page:    { maxWidth:"780px", margin:"0 auto", padding:"32px 40px", fontFamily:"Arial, sans-serif", fontSize:"12px", color:"#1a1a1a" } as React.CSSProperties,
    th:      { background:"#1a1a1a", color:"#fff", fontSize:"10px", textTransform:"uppercase" as const, letterSpacing:"0.5px", padding:"7px 10px", textAlign:"left" as const, fontWeight:"600" as const },
    thR:     { background:"#1a1a1a", color:"#fff", fontSize:"10px", textTransform:"uppercase" as const, letterSpacing:"0.5px", padding:"7px 10px", textAlign:"right" as const, fontWeight:"600" as const },
    td:      { padding:"7px 10px", borderBottom:"1px solid #f0f0f0", fontSize:"11px", verticalAlign:"top" as const },
    tdR:     { padding:"7px 10px", borderBottom:"1px solid #f0f0f0", fontSize:"11px", textAlign:"right" as const, fontFamily:"monospace", verticalAlign:"top" as const },
    table:   { width:"100%", borderCollapse:"collapse" as const },
    fLabel:  { fontSize:"9px", textTransform:"uppercase" as const, color:"#999", marginBottom:"2px", letterSpacing:"0.5px" },
    fValue:  { fontSize:"12px", fontWeight:"600" as const },
  };

  return (
    <>
      <style>{`@page{margin:0mm;size:A4;} @media print{.no-print{display:none!important;}}`}</style>
      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", zIndex:100, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
        <button onClick={() => window.print()} style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
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
              {clinic?.logo_url && (
                <img src={clinic.logo_url} alt="logo" style={{ height:"64px", width:"64px", objectFit:"contain", border:"1px solid #eee", borderRadius:"8px" }} />
              )}
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
              <div style={{ fontSize:"22px", fontWeight:"800", letterSpacing:"1px", color:"#111" }}>MEDICAL CLAIM</div>
              <div style={{ fontFamily:"monospace", fontSize:"14px", fontWeight:"700", color:"#555", marginTop:"4px" }}>{claim.claim_number}</div>
              <div style={{ fontSize:"11px", color:"#888", marginTop:"4px" }}>Issued: {printDate}</div>
            </div>
          </div>
          <div style={{ background:"#1a1a1a", color:"#fff", padding:"6px 16px", marginTop:"14px", display:"flex", justifyContent:"space-between" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>
              Inpatient Billing Claim
            </div>
            <div style={{ fontSize:"11px", color:"#ccc" }}>
              Period: {claim.from_date} — {claim.to_date}
            </div>
          </div>
        </div>

        {/* Billed to */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px", marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"9px", fontWeight:"700", textTransform:"uppercase", color:"#999", letterSpacing:"1px", marginBottom:"6px" }}>Billed To</div>
            <div style={{ fontSize:"14px", fontWeight:"700" }}>{hospital?.name}</div>
            {hospital?.address && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{hospital.address}</div>}
            {hospital?.primary_phone && <div style={{ fontSize:"11px", color:"#666" }}>Tel: {hospital.primary_phone}</div>}
          </div>
          <div>
            <div style={{ fontSize:"9px", fontWeight:"700", textTransform:"uppercase", color:"#999", letterSpacing:"1px", marginBottom:"6px" }}>From Physician</div>
            <div style={{ fontSize:"14px", fontWeight:"700" }}>{doctor?.full_name}</div>
            {doctor?.specialty && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{doctor.specialty}</div>}
            {clinic?.name && <div style={{ fontSize:"11px", color:"#666" }}>{clinic.name}</div>}
          </div>
        </div>

        {/* Visits table */}
        <div style={{ marginBottom:"24px" }}>
          {rows.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px", color:"#999", border:"1px dashed #ddd", borderRadius:"6px" }}>
              No inpatient visits found for this hospital in the selected date range.
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Patient</th>
                  <th style={s.th}>MRN</th>
                  <th style={s.th}>Location</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Time</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Procedures</th>
                  <th style={s.thR}>Visit Fee</th>
                  <th style={s.thR}>Proc. Fee</th>
                  <th style={s.thR}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: typeof rows[0], idx: number) => {
                  const procTotal = row.procedures.reduce((s: number, p: {price:number}) => s + p.price, 0);
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...s.td, color:"#999", fontFamily:"monospace", fontSize:"10px" }}>{idx + 1}</td>
                      <td style={{ ...s.td, fontWeight:"600" }}>{row.patientName}</td>
                      <td style={{ ...s.td, fontFamily:"monospace", fontSize:"10px", color:"#666" }}>{row.mrn}</td>
                      <td style={{ ...s.td, color:"#666" }}>{row.location}</td>
                      <td style={{ ...s.td, fontWeight:"500" }}>{row.visitDate}</td>
                      <td style={{ ...s.td, fontFamily:"monospace", fontSize:"10px" }}>{row.visitTime}</td>
                      <td style={{ ...s.td, textTransform:"capitalize", color:"#555" }}>{row.visitType.replace("_"," ")}</td>
                      <td style={s.td}>
                        {row.procedures.length > 0
                          ? row.procedures.map((p: {procedure_name:string;price:number}) => `${p.procedure_name} (${p.price.toFixed(2)})`).join(", ")
                          : <span style={{ color:"#ccc" }}>—</span>}
                      </td>
                      <td style={s.tdR}>{row.visitFee > 0 ? row.visitFee.toFixed(2) : "—"}</td>
                      <td style={s.tdR}>{procTotal > 0 ? procTotal.toFixed(2) : "—"}</td>
                      <td style={{ ...s.tdR, fontWeight:"700" }}>{row.visitTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f8f8f8" }}>
                  <td colSpan={10} style={{ ...s.td, fontWeight:"700", textAlign:"right", fontSize:"13px", paddingRight:"16px" }}>
                    Total Claimed ({rows.length} visits)
                  </td>
                  <td style={{ ...s.tdR, fontWeight:"800", fontSize:"16px", color:"#111" }}>
                    {grandTotal.toFixed(2)} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Claim note */}
        {claim.notes && (
          <div style={{ marginBottom:"20px", padding:"10px 14px", background:"#f8f8f8", borderRadius:"5px", border:"1px solid #e8e8e8", fontSize:"11px", color:"#555" }}>
            <strong>Notes:</strong> {claim.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:"40px", paddingTop:"16px", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
            <div style={{ color:"#aaa", marginTop:"4px" }}>Claim reference: <strong>{claim.claim_number}</strong></div>
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
