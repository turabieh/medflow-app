"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function InsuranceClaimPrintPage() {
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

      // Ensure session is active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData({ error: "Not authenticated. Please log in and try again." });
        setLoading(false);
        return;
      }

      const { data: claim, error: claimError } = await supabase
        .from("insurance_claims")
        .select("*, insurance_companies(name, address, phone, email, portal_url, notes)")
        .eq("id", claimId).single();

      if (!claim) {
        setData({ error: `Claim not found. ${claimError?.message ?? ""}` });
        setLoading(false);
        return;
      }

      let parentClaim = null;
      if (claim.is_followup && claim.parent_claim_id) {
        const { data: pc } = await supabase
          .from("insurance_claims")
          .select("claim_number, total_claimed, total_paid")
          .eq("id", claim.parent_claim_id).single();
        parentClaim = pc;
      }

      const { data: clinic } = await supabase
        .from("clinics").select("name, name_ar, tagline, logo_url, address, phone, email").limit(1).single();

      // Fetch clinic head doctor for signature
      const { data: headDoctors } = await supabase
        .from("users")
        .select("full_name, specialty, signature_url")
        .eq("clinic_id", claim.clinic_id)
        .eq("is_clinic_head", true)
        .eq("is_active", true)
        .limit(1);
      const headDoctor = headDoctors?.[0] ?? null;

      // Get patients with this insurance
      const { data: patients } = await supabase
        .from("patients").select("id, full_name, dob, gender, insurance_policy_number")
        .eq("clinic_id", claim.clinic_id)
        .eq("insurance_company_id", claim.insurance_company_id);

      const patientIds = (patients ?? []).map((p: { id: string }) => p.id);

      // Get visits/appointments in date range
      const { data: appts } = patientIds.length ? await supabase
        .from("appointments")
        .select("id, appt_date, start_time, visit_type, insurance_fee, payment_amount, patient_id")
        .in("patient_id", patientIds)
        .gte("appt_date", claim.from_date)
        .lte("appt_date", claim.to_date)
        .in("status", ["finalized", "done"])
        .order("appt_date") : { data: [] };

      // Only include visits where insurance owes money
      const filteredAppts = (appts ?? []).filter((a: {insurance_fee: number|null; payment_amount: number|null}) =>
        (a.insurance_fee ?? 0) > 0 || (a.payment_amount ?? 0) > 0
      );

      const apptIds = filteredAppts.map((a: { id: string }) => a.id);

      // Get approved procedures for these appointments
      let procs: { appointment_id: string; procedure_name: string; price: number; auth_number: string | null; auth_date: string | null; auth_status: string }[] = [];
      if (apptIds.length) {
        const { data: procsData } = await supabase
          .from("outpatient_procedure_claims")
          .select("appointment_id, procedure_name, price, auth_number, auth_date, auth_status")
          .in("appointment_id", apptIds);
        procs = procsData ?? [];
      }

      const procsByAppt = new Map<string, typeof procs[0][]>();
      for (const p of procs ?? []) {
        const arr = procsByAppt.get(p.appointment_id) ?? [];
        arr.push(p);
        procsByAppt.set(p.appointment_id, arr);
      }

      // Build rows only from filtered appointments
      const patientMap = new Map((patients ?? []).map((p: { id: string; full_name: string; dob: string | null; gender: string | null; insurance_policy_number: string | null }) => [p.id, p]));

      // Build rows
      let grandTotal = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];
      for (const a of filteredAppts) {
        const pt = patientMap.get(a.patient_id);
        const apptProcs = procsByAppt.get(a.id) ?? [];
        const visitFee = a.insurance_fee ?? a.payment_amount ?? 0;
        const procTotal = apptProcs.reduce((s: number, p: { price: number }) => s + (p.price ?? 0), 0);
        const rowTotal = visitFee + procTotal;
        grandTotal += rowTotal;
        rows.push({ a, pt, apptProcs, visitFee, procTotal, rowTotal });
      }

      // Only update total for original claims
      // For follow-up: use the stored total_claimed (the outstanding amount), not the sum of all visits
      if (claim.is_followup) {
        grandTotal = claim.total_claimed ?? 0;
      } else if (grandTotal > 0 && grandTotal !== claim.total_claimed) {
        await supabase.from("insurance_claims").update({ total_claimed: grandTotal }).eq("id", claimId);
      }

      setData({ claim, clinic, rows, grandTotal, parentClaim, headDoctor });
      setLoading(false);
    }
    load();
  }, [claimId]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Loading claim...</div>;
  if (data?.error) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00", flexDirection:"column" as const, gap:"8px" }}><div>Error loading claim</div><div style={{fontSize:"12px"}}>{data.error}</div></div>;
  if (!data?.claim) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>Claim not found.</div>;

  const { claim, clinic, rows, grandTotal, parentClaim, headDoctor } = data as { claim: any; clinic: any; rows: any[]; grandTotal: number; parentClaim: any; headDoctor: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insurance = Array.isArray(claim.insurance_companies) ? claim.insurance_companies[0] : claim.insurance_companies as any;

  const s = {
    page:  { maxWidth:"780px", margin:"0 auto", padding:"14mm 14mm 8mm 14mm", fontFamily:"Arial, sans-serif", fontSize:"12px", color:"#1a1a1a" } as React.CSSProperties,
    th:    { background:"#1a1a1a", color:"#fff", fontSize:"10px", textTransform:"uppercase" as const, letterSpacing:"0.5px", padding:"7px 10px", textAlign:"left" as const, fontWeight:"600" as const },
    thR:   { background:"#1a1a1a", color:"#fff", fontSize:"10px", textTransform:"uppercase" as const, letterSpacing:"0.5px", padding:"7px 10px", textAlign:"right" as const, fontWeight:"600" as const },
    td:    { padding:"7px 10px", borderBottom:"1px solid #f0f0f0", fontSize:"11px" },
    tdR:   { padding:"7px 10px", borderBottom:"1px solid #f0f0f0", fontSize:"11px", textAlign:"right" as const, fontFamily:"monospace" },
    table: { width:"100%", borderCollapse:"collapse" as const },
    fLbl:  { fontSize:"9px", textTransform:"uppercase" as const, color:"#999", letterSpacing:"0.5px", marginBottom:"2px" },
    fVal:  { fontSize:"12px", fontWeight:"600" as const },
  };

  return (
    <>
            <style>{`
        @page { size: A4; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          .no-print { display: none !important; }
          table.data-table th, table.data-table td { border: 1px solid #ccc !important; }
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
            <div style={{ display:"flex", gap:"12px" }}>
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
              <div style={{ fontSize:"22px", fontWeight:"800", color:"#111" }}>INSURANCE CLAIM</div>
              <div style={{ fontFamily:"monospace", fontSize:"14px", fontWeight:"700", color:"#555", marginTop:"4px" }}>{claim.claim_number}</div>
              <div style={{ fontSize:"11px", color:"#888", marginTop:"4px" }}>Issued: {printDate}</div>
            </div>
          </div>
          <div style={{ background:"#1a1a1a", color:"#fff", padding:"6px 16px", marginTop:"14px", display:"flex", justifyContent:"space-between" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>Outpatient Billing Claim</div>
            <div style={{ fontSize:"11px", color:"#ccc" }}>Period: {claim.from_date} — {claim.to_date}</div>
          </div>
        </div>

        {/* Follow-up context */}
        {claim.is_followup && claim.notes && (
          <div style={{ marginBottom:"20px", padding:"12px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"6px" }}>
            <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", color:"#92400e", marginBottom:"6px" }}>Follow-up Claim — Outstanding Balance</div>
            <p style={{ fontSize:"12px", color:"#78350f" }}>{claim.notes}</p>
          </div>
        )}

        {/* Billed to */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px", marginBottom:"20px" }}>
          <div>
            <div style={{ ...s.fLbl, marginBottom:"6px" }}>Billed To</div>
            <div style={{ fontSize:"14px", fontWeight:"700" }}>{insurance?.name}</div>
            {insurance?.address && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{insurance.address}</div>}
            {insurance?.phone   && <div style={{ fontSize:"11px", color:"#666" }}>Tel: {insurance.phone}</div>}
            {insurance?.email   && <div style={{ fontSize:"11px", color:"#666" }}>{insurance.email}</div>}
            {insurance?.portal_url && <div style={{ fontSize:"11px", color:"#3b82f6" }}>{insurance.portal_url}</div>}
          </div>
          <div>
            <div style={{ ...s.fLbl, marginBottom:"6px" }}>From Provider</div>
            <div style={{ fontSize:"14px", fontWeight:"700" }}>{clinic?.name}</div>
            {clinic?.address && <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>{clinic.address}</div>}
            {clinic?.phone   && <div style={{ fontSize:"11px", color:"#666" }}>Tel: {clinic.phone}</div>}
          </div>
        </div>

        {/* Visits table */}
        <div style={{ marginBottom:"24px" }}>
          {rows.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px", color:"#999", border:"1px dashed #ddd", borderRadius:"6px" }}>
              No finalized visits found for this insurance company in the selected period.
            </div>
          ) : (
            <table className="data-table" style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Patient</th>
                  <th style={s.th}>Policy #</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Visit Type</th>
                  <th style={s.th}>Procedures (Auth #)</th>
                  <th style={s.thR}>Visit Fee</th>
                  <th style={s.thR}>Proc. Fee</th>
                  <th style={s.thR}>Total</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ ...s.td, color:"#999", fontFamily:"monospace", fontSize:"10px" }}>{idx + 1}</td>
                    <td style={{ ...s.td, fontWeight:"600" }}>{row.pt?.full_name ?? "—"}</td>
                    <td style={{ ...s.td, fontFamily:"monospace", fontSize:"10px", color:"#666" }}>{row.pt?.insurance_policy_number ?? "—"}</td>
                    <td style={{ ...s.td, fontWeight:"500" }}>{row.a.appt_date}</td>
                    <td style={{ ...s.td, textTransform:"capitalize", color:"#555" }}>{row.a.visit_type?.replace("_"," ")}</td>
                    <td style={s.td}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {row.apptProcs.length > 0 ? row.apptProcs.map((p: any, i: number) => (
                        <div key={i} style={{ fontSize:"10px" }}>
                          {p.procedure_name}
                          {p.auth_number && <span style={{ color:"#16a34a", marginLeft:"4px" }}>✓ {p.auth_number}</span>}
                          {p.auth_status === "pending" && <span style={{ color:"#d97706", marginLeft:"4px" }}>⏳ pending</span>}
                          {p.auth_status === "rejected" && <span style={{ color:"#dc2626", marginLeft:"4px" }}>✗ rejected</span>}
                        </div>
                      )) : <span style={{ color:"#ccc" }}>—</span>}
                    </td>
                    <td style={s.tdR}>{row.visitFee > 0 ? row.visitFee.toFixed(2) : "—"}</td>
                    <td style={s.tdR}>{row.procTotal > 0 ? row.procTotal.toFixed(2) : "—"}</td>
                    <td style={{ ...s.tdR, fontWeight:"700" }}>{row.rowTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {claim.is_followup && parentClaim ? (
                  <>
                    <tr style={{ background:"#f8f8f8" }}>
                      <td colSpan={8} style={{ ...s.td, textAlign:"right", fontSize:"10px", color:"#555" }}>
                        Original Claim ({parentClaim.claim_number})
                      </td>
                      <td style={{ ...s.tdR, fontSize:"11px", color:"#555" }}>
                        {(parentClaim.total_claimed ?? 0).toFixed(2)} {currency}
                      </td>
                    </tr>
                    <tr style={{ background:"#f0fdf4" }}>
                      <td colSpan={8} style={{ ...s.td, textAlign:"right", fontSize:"10px", color:"#15803d" }}>
                        Previously Paid
                      </td>
                      <td style={{ ...s.tdR, fontSize:"11px", color:"#15803d" }}>
                        − {(parentClaim.total_paid ?? 0).toFixed(2)} {currency}
                      </td>
                    </tr>
                    <tr style={{ background:"#fef9c3" }}>
                      <td colSpan={8} style={{ ...s.td, fontWeight:"800", textAlign:"right", fontSize:"13px", color:"#92400e", borderTop:"2px solid #ca8a04" }}>
                        Outstanding Balance Due
                      </td>
                      <td style={{ ...s.tdR, fontWeight:"900", fontSize:"16px", color:"#92400e", borderTop:"2px solid #ca8a04" }}>
                        {grandTotal.toFixed(2)} {currency}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr style={{ background:"#f8f8f8" }}>
                    <td colSpan={8} style={{ ...s.td, fontWeight:"700", textAlign:"right", fontSize:"13px", paddingRight:"16px" }}>
                      Total Claimed ({rows.length} visits)
                    </td>
                    <td style={{ ...s.tdR, fontWeight:"800", fontSize:"16px", color:"#111" }}>
                      {grandTotal.toFixed(2)} {currency}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Notes */}
        {claim.notes && !claim.is_followup && (
          <div style={{ marginBottom:"20px", padding:"10px 14px", background:"#f8f8f8", borderRadius:"5px", fontSize:"11px", color:"#555" }}>
            <strong>Notes:</strong> {claim.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:"40px", paddingTop:"16px", borderTop:"1px solid #ddd", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div style={{ fontSize:"10px", color:"#666", lineHeight:"1.7" }}>
            <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
            {clinic?.address && <div>{clinic.address}</div>}
            {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
            <div style={{ color:"#aaa", marginTop:"4px" }}>Claim ref: <strong>{claim.claim_number}</strong> · {printDate}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:"220px", marginTop:"48px" }}>
              {headDoctor?.signature_url && (
                <img src={headDoctor.signature_url} alt="Signature"
                  style={{ height:"48px", maxWidth:"180px", objectFit:"contain", display:"block", margin:"0 auto 4px" }} />
              )}
              <div style={{ borderTop:"1px solid #333", paddingTop:"5px", marginTop: headDoctor?.signature_url ? "0" : "36px" }}>
                <div style={{ fontWeight:"700", fontSize:"11px" }}>
                  {headDoctor ? headDoctor.full_name : "Authorized Signature"}
                </div>
                {headDoctor?.specialty && (
                  <div style={{ fontSize:"10px", color:"#555", marginTop:"1px" }}>{headDoctor.specialty}</div>
                )}
                <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{clinic?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
