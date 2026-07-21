"use client";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

function PrintContent() {
  const params = useSearchParams();
  const date   = params.get("date") ?? new Date().toISOString().slice(0,10);
  const [data, setData] = useState<any>(null);

  useEffect(()=>{
    (async()=>{
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: profile } = await sb.from("users").select("clinic_id, full_name").eq("id", user.id).single();
      const cid = (profile as any)?.clinic_id;
      const { data: currSetting } = await sb.from("clinic_settings").select("value").eq("clinic_id", cid).eq("key","currency").maybeSingle();
      const currency = (currSetting as any)?.value ?? "JOD";
      const { data: clinic } = await sb.from("clinics").select("name, logo_url, address, phone").eq("id", cid).single();
      const { data: appts } = await sb.from("appointments")
        .select("id, payment_method, payment_amount, visit_fee, insurance_claim_amount, patients(full_name)")
        .eq("clinic_id", cid).eq("payment_confirmed", true).eq("appt_date", date);
      const apptIds = (appts??[]).map((a:any)=>a.id);
      const { data: splits } = apptIds.length ? await sb.from("appointment_payments")
        .select("appointment_id, method, amount, reference_number").in("appointment_id", apptIds) : { data: [] };
      const { data: recon } = await sb.from("daily_reconciliation")
        .select("actual_cash, notes, confirmed_at").eq("clinic_id", cid).eq("recon_date", date).maybeSingle();
      setData({ clinic, currency, appts: appts??[], splits: splits??[], recon });
      setTimeout(()=>window.print(), 1000);
    })();
  },[]);

  if (!data) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#64748b"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>📊</div><p>Preparing daily report...</p></div>
    </div>
  );

  const { clinic, currency, appts, splits, recon } = data;
  const today = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const f = (n:number) => `${n.toFixed(2)} ${currency}`;

  // Build method totals
  const splitMap = new Map<string,any[]>();
  for (const sp of splits) {
    if (!splitMap.has(sp.appointment_id)) splitMap.set(sp.appointment_id,[]);
    splitMap.get(sp.appointment_id)!.push(sp);
  }
  const methodTotals: Record<string,number> = {cash:0,card:0,cliq:0,insurance:0,other:0};
  const methodRows: Record<string,{name:string;amount:number;ref?:string}[]> = {cash:[],card:[],cliq:[],insurance:[],other:[]};
  for (const a of appts) {
    const pt = Array.isArray(a.patients)?a.patients[0]:a.patients;
    const name = pt?.full_name ?? "—";
    const sps = splitMap.get(a.id);
    if (sps&&sps.length>0) {
      for (const sp of sps) {
        const m = sp.method in methodTotals?sp.method:"other";
        methodTotals[m]+=sp.amount;
        methodRows[m].push({name,amount:sp.amount,ref:sp.reference_number??undefined});
      }
    } else {
      const m = a.payment_method in methodTotals?a.payment_method:"other";
      if (m==="insurance") { methodTotals.insurance+=a.insurance_claim_amount??0; methodRows.insurance.push({name,amount:a.insurance_claim_amount??0}); }
      else { methodTotals[m]+=a.payment_amount??0; methodRows[m].push({name,amount:a.payment_amount??0}); }
    }
  }
  const totalCollected = methodTotals.cash+methodTotals.card+methodTotals.cliq+methodTotals.other;
  const cashDiff = recon?.actual_cash!=null ? recon.actual_cash - methodTotals.cash : null;

  const s = {
    page:{fontFamily:"'Segoe UI',Arial,sans-serif",color:"#0f172a",background:"white",margin:0,padding:0},
    header:{background:"linear-gradient(135deg,#0f172a,#1e3a5f)",color:"white",padding:"20px 32px",display:"flex" as const,justifyContent:"space-between" as const,alignItems:"center" as const},
    body:{padding:"24px 32px"},
    sec:{marginBottom:20},
    title:{fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:2,color:"#64748b",marginBottom:8,paddingBottom:5,borderBottom:"1.5px solid #e2e8f0"},
    tbl:{width:"100%",borderCollapse:"collapse" as const,fontSize:12},
    th:{padding:"7px 10px",background:"#f8fafc",borderBottom:"1.5px solid #e2e8f0",textAlign:"left" as const,fontSize:10,fontWeight:600,color:"#64748b"},
    thr:{padding:"7px 10px",background:"#f8fafc",borderBottom:"1.5px solid #e2e8f0",textAlign:"right" as const,fontSize:10,fontWeight:600,color:"#64748b"},
    td:{padding:"6px 10px",borderBottom:"1px solid #f1f5f9",color:"#374151"},
    tdr:{padding:"6px 10px",borderBottom:"1px solid #f1f5f9",color:"#374151",textAlign:"right" as const,fontFamily:"monospace"},
    card:{borderRadius:10,padding:"12px 16px",border:"1.5px solid"},
    footer:{borderTop:"1px solid #e2e8f0",padding:"10px 32px",display:"flex" as const,justifyContent:"space-between" as const,fontSize:9,color:"#94a3b8",marginTop:12},
  };

  const METHODS = [
    {key:"cash",  label:"💵 Cash",      bg:"#ecfdf5",b:"#6ee7b7",c:"#059669"},
    {key:"card",  label:"💳 Card",      bg:"#eff6ff",b:"#93c5fd",c:"#2563eb"},
    {key:"cliq",  label:"📱 CliQ",      bg:"#f5f3ff",b:"#c4b5fd",c:"#7c3aed"},
    {key:"insurance",label:"🏥 Insurance",bg:"#fffbeb",b:"#fcd34d",c:"#d97706"},
    {key:"other", label:"Other",        bg:"#f8fafc",b:"#e2e8f0",c:"#64748b"},
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {clinic?.logo_url&&<img src={clinic.logo_url} alt="logo" style={{height:44,width:44,objectFit:"contain",borderRadius:8,background:"white",padding:3}}/>}
          <div>
            <div style={{fontSize:10,opacity:.55,textTransform:"uppercase",letterSpacing:2,marginBottom:2}}>Daily Report</div>
            <div style={{fontSize:18,fontWeight:800}}>{clinic?.name}</div>
            {clinic?.address&&<div style={{fontSize:9,opacity:.55,marginTop:2}}>{clinic.address}</div>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:13,fontWeight:700}}>{date}</div>
          <div style={{fontSize:9,opacity:.55,marginTop:4}}>Printed {today}</div>
        </div>
      </div>

      <div style={s.body}>
        {/* Summary cards */}
        <div style={{...s.sec,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {METHODS.filter(m=>methodTotals[m.key]>0).map(m=>(
            <div key={m.key} style={{...s.card,background:m.bg,borderColor:m.b}}>
              <div style={{fontSize:18,fontWeight:900,color:m.c}}>{f(methodTotals[m.key])}</div>
              <div style={{fontSize:9,fontWeight:600,color:"#374151",marginTop:3}}>{m.label}</div>
              <div style={{fontSize:8,color:"#94a3b8"}}>{methodRows[m.key].length} payment{methodRows[m.key].length!==1?"s":""}</div>
            </div>
          ))}
          <div style={{...s.card,background:"#0f172a",borderColor:"#0f172a"}}>
            <div style={{fontSize:18,fontWeight:900,color:"white"}}>{f(totalCollected)}</div>
            <div style={{fontSize:9,fontWeight:600,color:"#94a3b8",marginTop:3}}>Total Collected</div>
            <div style={{fontSize:8,color:"#64748b"}}>{appts.length} payments</div>
          </div>
        </div>

        {/* Per method detail */}
        {METHODS.filter(m=>methodRows[m.key].length>0).map(m=>(
          <div key={m.key} style={s.sec}>
            <div style={s.title}>{m.label} — {f(methodTotals[m.key])}</div>
            <table style={s.tbl}>
              <thead><tr><th style={s.th}>Patient</th>{m.key==="cliq"&&<th style={s.th}>Ref #</th>}<th style={s.thr}>Amount</th></tr></thead>
              <tbody>
                {methodRows[m.key].map((r,i)=>(
                  <tr key={i}><td style={s.td}>{r.name}</td>{m.key==="cliq"&&<td style={s.td}>{r.ref??"—"}</td>}<td style={s.tdr}>{f(r.amount)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr style={{background:"#f8fafc",fontWeight:700}}>
                <td colSpan={m.key==="cliq"?2:1} style={s.td}>Total</td>
                <td style={s.tdr}>{f(methodTotals[m.key])}</td>
              </tr></tfoot>
            </table>
          </div>
        ))}

        {/* Cash reconciliation */}
        <div style={{...s.sec,border:"2px solid",borderColor:cashDiff!=null&&Math.abs(cashDiff)<0.01?"#6ee7b7":"#e2e8f0",borderRadius:10,padding:"16px"}}>
          <div style={s.title}>Cash Reconciliation</div>
          <table style={s.tbl}>
            <tbody>
              <tr><td style={s.td}>Expected Cash</td><td style={{...s.tdr,color:"#059669",fontWeight:700}}>{f(methodTotals.cash)}</td></tr>
              {recon?.actual_cash!=null&&(
                <tr><td style={s.td}>Actual Cash (counted)</td><td style={{...s.tdr,color:"#059669",fontWeight:700}}>{f(recon.actual_cash)}</td></tr>
              )}
              {cashDiff!=null&&(
                <tr style={{background:Math.abs(cashDiff)<0.01?"#ecfdf5":"#fef2f2"}}>
                  <td style={{...s.td,fontWeight:700}}>{Math.abs(cashDiff)<0.01?"✓ Balanced":cashDiff>0?"↑ Over":"↓ Short"}</td>
                  <td style={{...s.tdr,fontWeight:700,color:Math.abs(cashDiff)<0.01?"#059669":"#dc2626"}}>{f(Math.abs(cashDiff))}</td>
                </tr>
              )}
              {recon?.notes&&<tr><td style={s.td}>Notes</td><td style={s.tdr}>{recon.notes}</td></tr>}
            </tbody>
          </table>
          {!recon?.actual_cash&&<p style={{fontSize:9,color:"#94a3b8",marginTop:8}}>Cash not yet confirmed for this day.</p>}
        </div>
      </div>

      <div style={s.footer}>
        <span>{clinic?.name} · Daily Report · {date}</span>
        <span>Generated by MedFlow — VeloTech · {today}</span>
      </div>
      <style>{`@media print{@page{size:A4;margin:0}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
    </div>
  );
}

export default function DailyReportPrintPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>Preparing...</div>}>
      <PrintContent/>
    </Suspense>
  );
}
