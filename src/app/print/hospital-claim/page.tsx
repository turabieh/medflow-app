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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData({ error: "Not authenticated." }); setLoading(false); return; }

      const { data: claim, error: claimError } = await supabase
        .from("hospital_claims")
        .select("*, hospitals(name, address, primary_phone), users!hospital_claims_doctor_id_fkey(full_name, specialty, signature_url)")
        .eq("id", claimId).single();

      if (!claim) { setData({ error: `Claim not found. ${claimError?.message ?? ""}` }); setLoading(false); return; }

      // For follow-up: fetch parent claim to show original amount + paid breakdown
      let parentClaim = null;
      if (claim.is_followup && claim.parent_claim_id) {
        const { data: pc } = await supabase
          .from("hospital_claims")
          .select("claim_number, total_claimed, total_paid")
          .eq("id", claim.parent_claim_id).single();
        parentClaim = pc;
      }

      const { data: clinic } = await supabase
        .from("clinics").select("name, name_ar, tagline, logo_url, address, phone, email").limit(1).single();

      // For follow-up claims, still show all visits for reference but mark total as claim.total_claimed
      const { data: inpatients } = await supabase
        .from("inpatients")
        .select("id, hospital_patient_id, location, patients(full_name, dob, gender)")
        .eq("hospital_id", claim.hospital_id)
        .eq("clinic_id", claim.clinic_id)
        .eq("doctor_id", claim.doctor_id ?? "");

      const inpatientIds = (inpatients ?? []).map((ip: { id: string }) => ip.id);

      const { data: visits } = inpatientIds.length ? await supabase
        .from("visits")
        .select("id, visit_date, visit_time, visit_fee, visit_fee_type, inpatient_id")
        .in("inpatient_id", inpatientIds)
        .gte("visit_date", claim.from_date)
        .lte("visit_date", claim.to_date)
        .in("status", ["done", "finalized"])
        .not("visit_fee", "is", null)
        .gt("visit_fee", 0)
        .order("visit_date", { ascending: true }) : { data: [] };

      const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
      const { data: procedures } = visitIds.length ? await supabase
        .from("inpatient_visit_procedures").select("visit_id, procedure_name, price")
        .in("visit_id", visitIds) : { data: [] };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ipMap = new Map((inpatients ?? []).map((ip: any) => [ip.id, ip]));
      const procsByVisit = new Map<string, { procedure_name: string; price: number }[]>();
      for (const p of procedures ?? []) {
        const arr = procsByVisit.get(p.visit_id) ?? [];
        arr.push(p);
        procsByVisit.set(p.visit_id, arr);
      }

      let computedTotal = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];

      for (const v of visits ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ip = ipMap.get(v.inpatient_id) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pt = Array.isArray(ip?.patients) ? ip?.patients[0] : ip?.patients as any;
        const procs = procsByVisit.get(v.id) ?? [];
        const procTotal = procs.reduce((s: number, p: { price: number }) => s + (p.price ?? 0), 0);
        const visitTotal = (v.visit_fee ?? 0) + procTotal;
        computedTotal += visitTotal;
        rows.push({
          patientName: pt?.full_name ?? "—",
          mrn: ip?.hospital_patient_id ?? "—",
          location: ip?.location ?? "—",
          visitDate: v.visit_date ?? "—",
          visitTime: v.visit_time ? v.visit_time.slice(0, 5) : "—",
          visitType: v.visit_fee_type ?? "Visit",
          visitFee: v.visit_fee ?? 0,
          procedures: procs,
          visitTotal,
        });
      }

      // Only update total for original (non-followup) claims
      if (!claim.is_followup && computedTotal > 0 && computedTotal !== claim.total_claimed) {
        await supabase.from("hospital_claims").update({ total_claimed: computedTotal }).eq("id", claimId);
        claim.total_claimed = computedTotal;
      }

      // For follow-up: display claim.total_claimed (the outstanding), not the sum of all visits
      const displayTotal = claim.is_followup ? claim.total_claimed : computedTotal;

      setData({ claim, clinic, rows, displayTotal, parentClaim });
      setLoading(false);
    }
    load();
  }, [claimId]);

  const printDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#666" }}>Loading claim...</div>;
  if (data?.error) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00", flexDirection:"column" as const, gap:"8px" }}><div>Error</div><div style={{fontSize:"12px"}}>{data.error}</div></div>;
  if (!data?.claim) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Arial", color:"#c00" }}>Claim not found.</div>;

  const { claim, clinic, rows, displayTotal, parentClaim } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hospital = Array.isArray(claim.hospitals) ? claim.hospitals[0] : claim.hospitals as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doctor   = Array.isArray(claim.users)     ? claim.users[0]     : claim.users as any;

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

      {/* Print button */}
      <div className="no-print" style={{ position:"fixed", top:"12px", right:"12px", zIndex:100, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
        <button onClick={() => window.print()} style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"6px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
          Print / Save PDF
        </button>
        <span style={{ fontSize:"10px", color:"#555", background:"rgba(255,255,255,0.95)", padding:"3px 8px", borderRadius:"4px", border:"1px solid #ddd" }}>
          Enable "Background graphics" in print settings
        </span>
      </div>

      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"14mm 14mm 8mm 14mm", fontFamily:"Arial, sans-serif", fontSize:"11px", color:"#111", background:"#fff" }}>

        {/* ── Header ── */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"16px" }}>
          <tbody><tr>
            <td style={{ verticalAlign:"top", paddingRight:"12px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
                {clinic?.logo_url && <img src={clinic.logo_url} alt="logo" style={{ height:"52px", width:"52px", objectFit:"contain", border:"1px solid #e0e0e0", borderRadius:"6px" }} />}
                <div>
                  <div style={{ fontSize:"15px", fontWeight:"700", color:"#111" }}>{clinic?.name}</div>
                  {clinic?.tagline && <div style={{ fontSize:"9px", color:"#888", marginTop:"2px" }}>{clinic.tagline}</div>}
                  <div style={{ fontSize:"9px", color:"#555", marginTop:"4px", lineHeight:"1.6" }}>
                    {clinic?.address && <div>{clinic.address}</div>}
                    {clinic?.phone   && <div>T: {clinic.phone}</div>}
                    {clinic?.email   && <div>{clinic.email}</div>}
                  </div>
                </div>
              </div>
            </td>
            <td style={{ verticalAlign:"top", textAlign:"right" }}>
              <div style={{ fontSize:"20px", fontWeight:"800", color:"#111", letterSpacing:"0.5px" }}>MEDICAL CLAIM</div>
              <div style={{ fontFamily:"monospace", fontSize:"13px", fontWeight:"700", color:"#444", marginTop:"4px" }}>{claim.claim_number}</div>
              <div style={{ fontSize:"9px", color:"#888", marginTop:"4px" }}>Issued: {printDate}</div>
            </td>
          </tr></tbody>
        </table>

        {/* Dark bar */}
        <div style={{ background:"#1a1a1a", color:"#fff", padding:"5px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px", borderRadius:"2px" }}>
          <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"2px" }}>
            {claim.is_followup ? "Follow-up Claim" : "Inpatient Billing Claim"}
          </div>
          <div style={{ fontSize:"10px", color:"#ccc" }}>Period: {claim.from_date} — {claim.to_date}</div>
        </div>

        {/* Follow-up context */}
        {claim.is_followup && claim.notes && (
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"4px", padding:"10px 12px", marginBottom:"14px" }}>
            <div style={{ fontSize:"9px", fontWeight:"700", textTransform:"uppercase", color:"#92400e", marginBottom:"5px", letterSpacing:"1px" }}>Outstanding Balance — Follow-up Claim</div>
            <p style={{ fontSize:"10px", color:"#78350f", lineHeight:"1.6" }}>{claim.notes}</p>
          </div>
        )}

        {/* Billed to / From */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"14px" }}>
          <tbody><tr>
            <td style={{ width:"50%", padding:"10px 12px", verticalAlign:"top" }}>
              <div style={{ fontSize:"8px", fontWeight:"700", textTransform:"uppercase", color:"#999", letterSpacing:"1px", marginBottom:"5px" }}>Billed To</div>
              <div style={{ fontSize:"13px", fontWeight:"700" }}>{hospital?.name}</div>
              {hospital?.address && <div style={{ fontSize:"10px", color:"#555", marginTop:"3px" }}>{hospital.address}</div>}
              {hospital?.primary_phone && <div style={{ fontSize:"10px", color:"#555" }}>Tel: {hospital.primary_phone}</div>}
            </td>
            <td style={{ width:"50%", padding:"10px 12px", verticalAlign:"top" }}>
              <div style={{ fontSize:"8px", fontWeight:"700", textTransform:"uppercase", color:"#999", letterSpacing:"1px", marginBottom:"5px" }}>From Physician</div>
              <div style={{ fontSize:"13px", fontWeight:"700" }}>{doctor?.full_name}</div>
              {doctor?.specialty && <div style={{ fontSize:"10px", color:"#555", marginTop:"3px" }}>{doctor.specialty}</div>}
              {clinic?.name && <div style={{ fontSize:"10px", color:"#555" }}>{clinic.name}</div>}
            </td>
          </tr></tbody>
        </table>

        {/* Visit table */}
        <table className="data-table" style={{ width:"100%", borderCollapse:"collapse", marginBottom:"16px" }}>
          <thead>
            <tr style={{ background:"#1a1a1a", color:"#fff" }}>
              {["#","Patient","MRN","Location","Date","Time","Type","Procedures","Visit Fee","Proc. Fee","Total"].map((h,i) => (
                <th key={h} style={{ padding:"6px 7px", fontSize:"9px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.4px", textAlign: i >= 8 ? "right" : "left", border:"1px solid #333", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} style={{ padding:"20px", textAlign:"center", color:"#999", fontSize:"11px" }}>No visits found for this period.</td></tr>
            )}
            {rows.map((row: {patientName:string;mrn:string;location:string;visitDate:string;visitTime:string;visitType:string;visitFee:number;procedures:{procedure_name:string;price:number}[];visitTotal:number}, idx: number) => {
              const procTotal = row.procedures.reduce((s,p) => s + p.price, 0);
              const bg = idx % 2 === 0 ? "#fff" : "#f8f8f8";
              const td = { padding:"5px 7px", fontSize:"10px", background:bg, verticalAlign:"top" as const };
              const tdR = { ...td, textAlign:"right" as const, fontFamily:"monospace" };
              return (
                <tr key={idx}>
                  <td style={{ ...td, color:"#aaa", fontSize:"9px" }}>{idx+1}</td>
                  <td style={{ ...td, fontWeight:"600" }}>{row.patientName}</td>
                  <td style={{ ...td, fontFamily:"monospace", fontSize:"9px", color:"#555" }}>{row.mrn}</td>
                  <td style={{ ...td, fontSize:"9px" }}>{row.location}</td>
                  <td style={{ ...td, fontWeight:"500" }}>{row.visitDate}</td>
                  <td style={{ ...td, fontFamily:"monospace", fontSize:"9px" }}>{row.visitTime}</td>
                  <td style={{ ...td, textTransform:"capitalize", fontSize:"9px" }}>{row.visitType.replace("_"," ")}</td>
                  <td style={{ ...td, fontSize:"9px" }}>
                    {row.procedures.length > 0
                      ? row.procedures.map((p,i) => <div key={i}>{p.procedure_name} <span style={{color:"#888"}}>({p.price.toFixed(2)})</span></div>)
                      : <span style={{color:"#ccc"}}>—</span>}
                  </td>
                  <td style={tdR}>{row.visitFee > 0 ? row.visitFee.toFixed(2) : "—"}</td>
                  <td style={tdR}>{procTotal > 0 ? procTotal.toFixed(2) : "—"}</td>
                  <td style={{ ...tdR, fontWeight:"700" }}>{row.visitTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {claim.is_followup && parentClaim ? (
              <>
                <tr style={{ background:"#f8f8f8" }}>
                  <td colSpan={10} style={{ padding:"6px 10px", textAlign:"right", fontSize:"10px", color:"#555", border:"1px solid #ddd" }}>
                    Original Claim ({parentClaim.claim_number})
                  </td>
                  <td style={{ padding:"6px 10px", textAlign:"right", fontFamily:"monospace", fontSize:"11px", color:"#555", border:"1px solid #ddd" }}>
                    {(parentClaim.total_claimed ?? 0).toFixed(2)} {currency}
                  </td>
                </tr>
                <tr style={{ background:"#f0fdf4" }}>
                  <td colSpan={10} style={{ padding:"6px 10px", textAlign:"right", fontSize:"10px", color:"#15803d", border:"1px solid #ddd" }}>
                    Previously Paid
                  </td>
                  <td style={{ padding:"6px 10px", textAlign:"right", fontFamily:"monospace", fontSize:"11px", color:"#15803d", border:"1px solid #ddd" }}>
                    − {(parentClaim.total_paid ?? 0).toFixed(2)} {currency}
                  </td>
                </tr>
                <tr style={{ background:"#fef9c3", borderTop:"2px solid #ca8a04" }}>
                  <td colSpan={10} style={{ padding:"8px 10px", textAlign:"right", fontWeight:"800", fontSize:"13px", color:"#92400e", border:"1px solid #ca8a04" }}>
                    Outstanding Balance Due
                  </td>
                  <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:"900", fontSize:"16px", fontFamily:"monospace", color:"#92400e", border:"1px solid #ca8a04" }}>
                    {(displayTotal ?? 0).toFixed(2)} {currency}
                  </td>
                </tr>
              </>
            ) : (
              <tr style={{ background:"#f0f0f0" }}>
                <td colSpan={10} style={{ padding:"7px", textAlign:"right", fontWeight:"700", fontSize:"12px", border:"1px solid #ccc", paddingRight:"10px" }}>
                  {`Total Claimed (${rows.length} visit${rows.length !== 1 ? "s" : ""})`}
                </td>
                <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:"800", fontSize:"14px", fontFamily:"monospace", border:"1px solid #ccc", color:"#111" }}>
                  {(displayTotal ?? 0).toFixed(2)} {currency}
                </td>
              </tr>
            )}
          </tfoot>
        </table>

        {/* Notes */}
        {claim.notes && !claim.is_followup && (
          <div style={{ background:"#f8f8f8", border:"1px solid #e0e0e0", borderRadius:"3px", padding:"8px 12px", marginBottom:"14px", fontSize:"10px", color:"#555" }}>
            <strong>Notes:</strong> {claim.notes}
          </div>
        )}

        {/* Footer / Signature */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginTop:"28px" }}>
          <tbody><tr>
            <td style={{ verticalAlign:"bottom", fontSize:"9px", color:"#666", lineHeight:"1.7", paddingTop:"12px" }}>
              <div style={{ fontWeight:"600" }}>{clinic?.name}</div>
              {clinic?.address && <div>{clinic.address}</div>}
              {clinic?.phone   && <div>Tel: {clinic.phone}</div>}
              <div style={{ color:"#aaa", marginTop:"4px" }}>Claim ref: <strong>{claim.claim_number}</strong></div>
            </td>
            <td style={{ textAlign:"center", verticalAlign:"bottom", width:"220px", paddingTop:"12px" }}>
              {doctor?.signature_url && (
                <img src={doctor.signature_url} alt="Signature" style={{ height:"48px", maxWidth:"180px", objectFit:"contain", display:"block", margin:"0 auto" }} />
              )}
              <div style={{ borderTop:"1px solid #333", paddingTop:"4px", marginTop: doctor?.signature_url ? "4px" : "36px" }}>
                <div style={{ fontWeight:"700", fontSize:"10px" }}>{doctor?.full_name}</div>
                {doctor?.specialty && <div style={{ fontSize:"9px", color:"#888", marginTop:"1px" }}>{doctor.specialty}</div>}
              </div>
            </td>
          </tr></tbody>
        </table>
      </div>
    </>
  );
}
