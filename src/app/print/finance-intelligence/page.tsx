"use client";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

function PrintContent() {
  const params = useSearchParams();
  const report = params.get("report") ?? "daily";
  const from   = params.get("from") ?? "";
  const to     = params.get("to") ?? "";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: profile } = await sb.from("users").select("clinic_id").eq("id", user.id).single();
      const cid = profile?.clinic_id;
      const { data: currSetting } = await sb.from("clinic_settings").select("value").eq("clinic_id", cid).eq("key","currency").maybeSingle();
      const currency = currSetting?.value ?? "JOD";

      const [{ data: clinic }, { data: appts }, { data: exps }, { data: inpVisits }, { data: doctors }, { data: salaries }] = await Promise.all([
        sb.from("clinics").select("name, name_ar, logo_url, address, phone, tagline").eq("id", cid).single(),
        sb.from("appointments").select("appt_date, visit_fee, payment_method, visit_type, doctor_id, payment_amount")
          .eq("clinic_id", cid).eq("payment_confirmed", true).gte("appt_date", from).lte("appt_date", to),
        sb.from("expenses").select("expense_date, category, amount")
          .eq("clinic_id", cid).gte("expense_date", from).lte("expense_date", to),
        sb.from("visits").select("visit_date, visit_fee, doctor_id")
          .eq("visit_context","inpatient").in("status",["done","finalized"])
          .gte("visit_date", from).lte("visit_date", to).not("visit_fee","is",null),
        sb.from("users").select("id, full_name").eq("clinic_id", cid).eq("role","doctor"),
        sb.from("staff_salaries").select("monthly_salary, users(full_name)").eq("clinic_id", cid).order("effective_from",{ascending:false}),
      ]);

      // Daily map
      const dailyMap: Record<string,{outpatient:number;inpatient:number;total:number;visits:number}> = {};
      for (const a of appts??[]) {
        const d=a.appt_date; if(!d) continue;
        if(!dailyMap[d]) dailyMap[d]={outpatient:0,inpatient:0,total:0,visits:0};
        dailyMap[d].outpatient+=a.visit_fee??a.payment_amount??0;
        dailyMap[d].total+=a.visit_fee??a.payment_amount??0;
        dailyMap[d].visits++;
      }
      for (const v of inpVisits??[]) {
        const d=v.visit_date; if(!d) continue;
        if(!dailyMap[d]) dailyMap[d]={outpatient:0,inpatient:0,total:0,visits:0};
        dailyMap[d].inpatient+=v.visit_fee??0;
        dailyMap[d].total+=v.visit_fee??0;
        dailyMap[d].visits++;
      }
      const dailyRevenue=Object.entries(dailyMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,d])=>({date,...d}));

      // Totals
      const cashTotal=(appts??[]).reduce((s,a)=>s+(a.visit_fee??a.payment_amount??0),0);
      const inpTotal=(inpVisits??[]).reduce((s,v)=>s+(v.visit_fee??0),0);
      const totalRevenue=cashTotal+inpTotal;
      const totalExpenses=(exps??[]).reduce((s,e)=>s+(e.amount??0),0);
      const salaryMap=new Map<string,number>();
      for (const s of salaries??[]) {
        const u=Array.isArray(s.users)?s.users[0]:s.users as any;
        if(u&&!salaryMap.has(u.full_name)) salaryMap.set(u.full_name,s.monthly_salary);
      }
      const totalSalaries=Array.from(salaryMap.values()).reduce((s,v)=>s+v,0);
      const totalCosts=totalExpenses+totalSalaries;
      const netProfit=totalRevenue-totalCosts;
      const expByCategory: Record<string,number>={};
      for (const e of exps??[]) expByCategory[e.category]=(expByCategory[e.category]??0)+e.amount;

      // Doctor revenue
      const docMap: Record<string,{name:string;outpatient:number;inpatient:number;visits:number}>={}; 
      for (const d of doctors??[]) docMap[d.id]={name:d.full_name,outpatient:0,inpatient:0,visits:0};
      for (const a of appts??[]) { if(a.doctor_id&&docMap[a.doctor_id]){docMap[a.doctor_id].outpatient+=a.visit_fee??a.payment_amount??0;docMap[a.doctor_id].visits++;}}
      for (const v of inpVisits??[]) { if(v.doctor_id&&docMap[v.doctor_id]){docMap[v.doctor_id].inpatient+=v.visit_fee??0;docMap[v.doctor_id].visits++;}}
      const doctorRevenue=Object.values(docMap).map(d=>({...d,total:d.outpatient+d.inpatient})).sort((a,b)=>b.total-a.total);

      // Visit type
      const visitTypeRevenue: Record<string,number>={};
      for (const a of appts??[]) { const t=a.visit_type??"outpatient"; visitTypeRevenue[t]=(visitTypeRevenue[t]??0)+(a.visit_fee??a.payment_amount??0); }

      // Monthly trend
      const mRevMap: Record<string,number>={};const mExpMap: Record<string,number>={};
      for (const a of appts??[]) { const m=a.appt_date?.slice(0,7)??""; if(m) mRevMap[m]=(mRevMap[m]??0)+(a.visit_fee??a.payment_amount??0); }
      for (const e of exps??[]) { const m=e.expense_date?.slice(0,7)??""; if(m) mExpMap[m]=(mExpMap[m]??0)+e.amount; }
      const allM=[...new Set([...Object.keys(mRevMap),...Object.keys(mExpMap)])].sort();
      const monthlyTrend=allM.map(m=>({month:m,revenue:mRevMap[m]??0,expenses:mExpMap[m]??0}));

      // Day of week
      const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const dowMap: Record<string,{total:number;count:number}>={};
      for (const d of dailyRevenue) { const dow=DAYS[new Date(d.date+"T12:00:00").getDay()]; if(!dowMap[dow])dowMap[dow]={total:0,count:0}; dowMap[dow].total+=d.total;dowMap[dow].count++; }
      const dowAvg=DAYS.map(d=>({day:d,avg:dowMap[d]?dowMap[d].total/dowMap[d].count:0}));

      setData({clinic,currency,dailyRevenue,cashTotal,inpTotal,totalRevenue,totalCosts,totalSalaries,netProfit,expByCategory,doctorRevenue,visitTypeRevenue,monthlyTrend,dowAvg});
      setTimeout(()=>window.print(),1200);
    })();
  },[]);

  if (!data) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#64748b"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📊</div><p style={{fontSize:14}}>Preparing report...</p></div>
    </div>
  );

  const {clinic,currency,dailyRevenue,cashTotal,inpTotal,totalRevenue,totalCosts,totalSalaries,netProfit,expByCategory,doctorRevenue,visitTypeRevenue,monthlyTrend,dowAvg}=data;
  const today=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const f=(n:number)=>`${n.toFixed(2)} ${currency}`;
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const TITLES: Record<string,string>={daily:"Daily Revenue Report",compare:"Period Comparison Report",income:"Income Breakdown Report",pl:"Profit & Loss Statement",tax:"Tax Estimate Report"};

  const s={
    page:{fontFamily:"'Segoe UI',Arial,sans-serif",color:"#0f172a",background:"white",margin:0,padding:0,fontSize:13},
    header:{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",color:"white",padding:"22px 36px",display:"flex" as const,justifyContent:"space-between" as const,alignItems:"center" as const},
    body:{padding:"28px 36px"},
    sec:{marginBottom:24,pageBreakInside:"avoid" as const},
    title:{fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:2,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"},
    tbl:{width:"100%",borderCollapse:"collapse" as const,fontSize:12},
    th:{padding:"8px 12px",background:"#f8fafc",borderBottom:"1.5px solid #e2e8f0",textAlign:"left" as const,fontSize:10,fontWeight:600,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:0.5},
    thr:{padding:"8px 12px",background:"#f8fafc",borderBottom:"1.5px solid #e2e8f0",textAlign:"right" as const,fontSize:10,fontWeight:600,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:0.5},
    td:{padding:"7px 12px",borderBottom:"1px solid #f1f5f9",color:"#374151"},
    tdr:{padding:"7px 12px",borderBottom:"1px solid #f1f5f9",color:"#374151",textAlign:"right" as const,fontFamily:"monospace"},
    card:{borderRadius:10,padding:"14px 18px",border:"1.5px solid"},
    footer:{borderTop:"1px solid #e2e8f0",padding:"10px 36px",display:"flex" as const,justifyContent:"space-between" as const,fontSize:9,color:"#94a3b8",marginTop:8},
  };

  function BarChart({data:bd,maxVal,labelKey,valueKey,color="#34d399",h=140}:{data:any[];maxVal:number;labelKey:string;valueKey:string;color?:string;h?:number}) {
    const W=680,PL=44,PR=8,PT=16,PB=26,ph=h-PT-PB,pw=W-PL-PR;
    const n=bd.length; const slot=pw/n; const bw=Math.max(6,Math.min(32,slot*0.6));
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${h}`} style={{display:"block"}}>
        {[0,0.25,0.5,0.75,1].map(p=>{
          const y=PT+ph*(1-p);
          return <g key={p}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#f1f5f9" strokeWidth={1}/><text x={PL-3} y={y+3} textAnchor="end" fontSize={8} fill="#94a3b8">{(maxVal*p).toFixed(0)}</text></g>;
        })}
        <line x1={PL} y1={PT+ph} x2={W-PR} y2={PT+ph} stroke="#e2e8f0" strokeWidth={1}/>
        {bd.map((d:any,i:number)=>{
          const cx=PL+slot*i+slot/2; const v=d[valueKey]??0;
          const bh=maxVal>0&&v>0?Math.max(v/maxVal*ph,3):0; const by=PT+ph-bh;
          return <g key={i}>
            {bh>0&&<rect x={cx-bw/2} y={by} width={bw} height={bh} fill={color} rx={2}/>}
            {v>0&&<text x={cx} y={bh>0?by-3:PT+ph-3} textAnchor="middle" fontSize={7} fill="#64748b">{v.toFixed(0)}</text>}
            <text x={cx} y={h-4} textAnchor="middle" fontSize={8} fill="#64748b">{d[labelKey]}</text>
          </g>;
        })}
      </svg>
    );
  }

  const KpiCards=({items}:{items:{l:string;v:string;c:string;bg:string;b:string}[]})=>(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,gap:12,marginBottom:20}}>
      {items.map(x=>(
        <div key={x.l} style={{...s.card,background:x.bg,borderColor:x.b}}>
          <div style={{fontSize:18,fontWeight:900,color:x.c}}>{x.v}</div>
          <div style={{fontSize:9,fontWeight:600,color:"#374151",marginTop:4}}>{x.l}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {clinic?.logo_url&&<img src={clinic.logo_url} alt="logo" style={{height:46,width:46,objectFit:"contain",borderRadius:8,background:"white",padding:3}}/>}
          <div>
            <div style={{fontSize:10,opacity:.55,textTransform:"uppercase",letterSpacing:2,marginBottom:3}}>{TITLES[report]}</div>
            <div style={{fontSize:19,fontWeight:800}}>{clinic?.name}</div>
            {clinic?.address&&<div style={{fontSize:9,opacity:.55,marginTop:2}}>{clinic.address}{clinic?.phone&&` · ${clinic.phone}`}</div>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,opacity:.55,marginBottom:3}}>Period</div>
          <div style={{fontSize:14,fontWeight:700}}>{from} → {to}</div>
          <div style={{fontSize:9,opacity:.55,marginTop:4}}>Printed {today}</div>
        </div>
      </div>

      <div style={s.body}>

        {report==="daily"&&(()=>{
          const maxD=Math.max(...dailyRevenue.map((d:any)=>d.total),1);
          const maxDow=Math.max(...dowAvg.map((d:any)=>d.avg),1);
          const activeDays=dailyRevenue.filter((d:any)=>d.total>0).length;
          return <>
            <KpiCards items={[
              {l:"Total Revenue",v:f(totalRevenue),c:"#059669",bg:"#ecfdf5",b:"#6ee7b7"},
              {l:"Total Visits",v:String(dailyRevenue.reduce((s:number,d:any)=>s+d.visits,0)),c:"#2563eb",bg:"#eff6ff",b:"#93c5fd"},
              {l:"Days with Income",v:String(activeDays),c:"#7c3aed",bg:"#f5f3ff",b:"#c4b5fd"},
              {l:"Avg Revenue / Day",v:activeDays>0?f(totalRevenue/activeDays):"—",c:"#d97706",bg:"#fffbeb",b:"#fcd34d"},
            ]}/>
            <div style={s.sec}><div style={s.title}>Daily Revenue Chart</div><BarChart data={dailyRevenue} maxVal={maxD} labelKey="date" valueKey="total" color="#34d399"/></div>
            <div style={s.sec}><div style={s.title}>Best Days of Week (Average Revenue)</div><BarChart data={dowAvg} maxVal={maxDow} labelKey="day" valueKey="avg" color="#818cf8" h={120}/></div>
            <div style={s.sec}>
              <div style={s.title}>Daily Detail</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Date</th><th style={s.th}>Day</th><th style={s.thr}>Outpatient</th><th style={s.thr}>Inpatient</th><th style={s.thr}>Total</th><th style={s.thr}>Visits</th><th style={s.thr}>Avg/Visit</th></tr></thead>
                <tbody>
                  {dailyRevenue.map((d:any,i:number)=>(
                    <tr key={i}><td style={s.td}>{d.date}</td><td style={s.td}>{DAYS[new Date(d.date+"T12:00:00").getDay()]}</td>
                      <td style={s.tdr}>{d.outpatient>0?d.outpatient.toFixed(2):"—"}</td>
                      <td style={s.tdr}>{d.inpatient>0?d.inpatient.toFixed(2):"—"}</td>
                      <td style={{...s.tdr,fontWeight:600,color:"#059669"}}>{d.total.toFixed(2)}</td>
                      <td style={s.tdr}>{d.visits}</td>
                      <td style={s.tdr}>{d.visits>0?(d.total/d.visits).toFixed(2):"—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{background:"#0f172a",color:"white"}}>
                  <td colSpan={2} style={{...s.td,color:"white",fontWeight:700}}>Total</td>
                  <td style={{...s.tdr,color:"#6ee7b7"}}>{dailyRevenue.reduce((s:number,d:any)=>s+d.outpatient,0).toFixed(2)}</td>
                  <td style={{...s.tdr,color:"#c4b5fd"}}>{dailyRevenue.reduce((s:number,d:any)=>s+d.inpatient,0).toFixed(2)}</td>
                  <td style={{...s.tdr,color:"#34d399",fontWeight:700}}>{f(totalRevenue)}</td>
                  <td style={{...s.tdr,color:"white"}}>{dailyRevenue.reduce((s:number,d:any)=>s+d.visits,0)}</td><td/>
                </tr></tfoot>
              </table>
            </div>
          </>;
        })()}

        {report==="compare"&&(()=>{
          const maxRev=Math.max(...monthlyTrend.map((m:any)=>m.revenue),1);
          return <>
            <KpiCards items={[
              {l:"Total Revenue",v:f(totalRevenue),c:"#059669",bg:"#ecfdf5",b:"#6ee7b7"},
              {l:"Total Expenses",v:f(totalCosts),c:"#dc2626",bg:"#fef2f2",b:"#fca5a5"},
              {l:"Net Profit",v:f(Math.abs(netProfit)),c:netProfit>=0?"#2563eb":"#d97706",bg:netProfit>=0?"#eff6ff":"#fffbeb",b:netProfit>=0?"#93c5fd":"#fcd34d"},
              {l:"Profit Margin",v:totalRevenue>0?`${Math.round(netProfit/totalRevenue*100)}%`:"—",c:"#7c3aed",bg:"#f5f3ff",b:"#c4b5fd"},
            ]}/>
            <div style={s.sec}><div style={s.title}>Monthly Revenue Trend</div><BarChart data={monthlyTrend} maxVal={maxRev} labelKey="month" valueKey="revenue" color="#34d399"/></div>
            <div style={s.sec}>
              <div style={s.title}>Monthly Breakdown</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Month</th><th style={s.thr}>Revenue</th><th style={s.thr}>Expenses</th><th style={s.thr}>Net</th><th style={s.thr}>Margin</th><th style={s.thr}>vs Prev</th></tr></thead>
                <tbody>
                  {monthlyTrend.map((m:any,i:number)=>{
                    const net=m.revenue-m.expenses;
                    const margin=m.revenue>0?Math.round(net/m.revenue*100):0;
                    const prev=monthlyTrend[i-1] as any;
                    const vsPrev=prev&&prev.revenue>0?Math.round((m.revenue-prev.revenue)/prev.revenue*100):null;
                    return <tr key={i}><td style={s.td}>{m.month}</td>
                      <td style={{...s.tdr,color:"#059669"}}>{m.revenue.toFixed(2)}</td>
                      <td style={{...s.tdr,color:"#dc2626"}}>{m.expenses.toFixed(2)}</td>
                      <td style={{...s.tdr,fontWeight:600,color:net>=0?"#2563eb":"#dc2626"}}>{net>=0?"+":""}{net.toFixed(2)}</td>
                      <td style={s.tdr}>{margin}%</td>
                      <td style={{...s.tdr,color:vsPrev!=null?(vsPrev>=0?"#059669":"#dc2626"):"#94a3b8"}}>{vsPrev!=null?`${vsPrev>=0?"↑":"↓"}${Math.abs(vsPrev)}%`:"—"}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </>;
        })()}

        {report==="income"&&(
          <>
            <KpiCards items={[
              {l:"Cash / Card",v:f(cashTotal),c:"#059669",bg:"#ecfdf5",b:"#6ee7b7"},
              {l:"Outpatient",v:f(cashTotal),c:"#0284c7",bg:"#f0f9ff",b:"#7dd3fc"},
              {l:"Inpatient",v:f(inpTotal),c:"#7c3aed",bg:"#f5f3ff",b:"#c4b5fd"},
            ]}/>
            {doctorRevenue.length>0&&<div style={s.sec}>
              <div style={s.title}>Revenue by Doctor</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Doctor</th><th style={s.thr}>Outpatient</th><th style={s.thr}>Inpatient</th><th style={s.thr}>Total</th><th style={s.thr}>Visits</th><th style={s.thr}>Avg/Visit</th></tr></thead>
                <tbody>{doctorRevenue.map((d:any,i:number)=>(
                  <tr key={i}><td style={s.td}>{d.name}</td>
                    <td style={s.tdr}>{f(d.outpatient)}</td><td style={s.tdr}>{f(d.inpatient)}</td>
                    <td style={{...s.tdr,fontWeight:600,color:"#059669"}}>{f(d.total)}</td>
                    <td style={s.tdr}>{d.visits}</td><td style={s.tdr}>{d.visits>0?f(d.total/d.visits):"—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
            {Object.keys(visitTypeRevenue).length>0&&<div style={s.sec}>
              <div style={s.title}>Revenue by Visit Type</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Type</th><th style={s.thr}>Amount</th><th style={s.thr}>% of Total</th></tr></thead>
                <tbody>{Object.entries(visitTypeRevenue).sort(([,a],[,b])=>b-a).map(([t,v])=>(
                  <tr key={t}><td style={{...s.td,textTransform:"capitalize"}}>{t}</td>
                    <td style={s.tdr}>{f(v as number)}</td>
                    <td style={s.tdr}>{totalRevenue>0?Math.round((v as number)/totalRevenue*100):0}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
          </>
        )}

        {report==="pl"&&(
          <div style={s.sec}>
            <div style={s.title}>Profit & Loss Statement</div>
            <table style={s.tbl}>
              <tbody>
                <tr><td colSpan={2} style={{...s.td,fontWeight:700,color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,paddingTop:12}}>INCOME</td></tr>
                {([["Cash & Card",cashTotal],["Inpatient Revenue",inpTotal]] as [string,number][]).map(([l,v])=>(
                  <tr key={l}><td style={{...s.td,paddingLeft:20}}>{l}</td><td style={{...s.tdr,color:"#059669"}}>{f(v)}</td></tr>
                ))}
                <tr style={{background:"#ecfdf5"}}><td style={{...s.td,fontWeight:700}}>Total Revenue</td><td style={{...s.tdr,fontWeight:700,color:"#059669"}}>{f(totalRevenue)}</td></tr>
                <tr><td colSpan={2} style={{...s.td,fontWeight:700,color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,paddingTop:12}}>EXPENSES</td></tr>
                {Object.entries(expByCategory).sort(([,a],[,b])=>b-a).map(([cat,amt])=>(
                  <tr key={cat}><td style={{...s.td,paddingLeft:20}}>{cat}</td><td style={{...s.tdr,color:"#dc2626"}}>{f(amt)}</td></tr>
                ))}
                <tr><td style={{...s.td,paddingLeft:20}}>Staff Salaries</td><td style={{...s.tdr,color:"#dc2626"}}>{f(totalSalaries)}</td></tr>
                <tr style={{background:"#fef2f2"}}><td style={{...s.td,fontWeight:700}}>Total Costs</td><td style={{...s.tdr,fontWeight:700,color:"#dc2626"}}>{f(totalCosts)}</td></tr>
                <tr style={{background:netProfit>=0?"#f0fdf4":"#fff7ed",borderTop:"2px solid #e2e8f0"}}>
                  <td style={{...s.td,fontSize:15,fontWeight:800}}>Net {netProfit>=0?"Profit":"Loss"}</td>
                  <td style={{...s.tdr,fontSize:16,fontWeight:800,color:netProfit>=0?"#059669":"#d97706"}}>{netProfit>=0?"+":"-"}{f(Math.abs(netProfit))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {report==="tax"&&(
          <>
            <div style={s.sec}>
              <div style={s.title}>Tax Calculation — {from} to {to}</div>
              <table style={s.tbl}>
                <tbody>
                  <tr><td style={s.td}>Gross Revenue</td><td style={{...s.tdr,color:"#059669"}}>{f(totalRevenue)}</td></tr>
                  <tr><td style={s.td}>Deductible Expenses</td><td style={{...s.tdr,color:"#dc2626"}}>−{f(totalCosts)}</td></tr>
                  <tr style={{background:"#f8fafc",fontWeight:700}}><td style={s.td}>Taxable Net Income</td><td style={{...s.tdr,color:netProfit>=0?"#059669":"#dc2626"}}>{f(netProfit)}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              {[14,20,28].map(rate=>(
                <div key={rate} style={{...s.card,background:"#f8fafc",borderColor:"#e2e8f0",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:6}}>At {rate}% tax rate</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#0f172a"}}>{f(Math.max(netProfit*rate/100,0))}</div>
                  <div style={{fontSize:9,color:"#94a3b8",marginTop:4}}>estimated tax</div>
                </div>
              ))}
            </div>
            <div style={s.sec}>
              <div style={s.title}>Deductible Expenses</div>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>Category</th><th style={s.thr}>Amount</th><th style={s.thr}>% of Revenue</th></tr></thead>
                <tbody>
                  {Object.entries(expByCategory).sort(([,a],[,b])=>b-a).map(([cat,amt])=>(
                    <tr key={cat}><td style={s.td}>{cat}</td><td style={s.tdr}>{f(amt)}</td><td style={s.tdr}>{totalRevenue>0?Math.round(amt/totalRevenue*100):0}%</td></tr>
                  ))}
                  <tr><td style={s.td}>Staff Salaries</td><td style={s.tdr}>{f(totalSalaries)}</td><td style={s.tdr}>{totalRevenue>0?Math.round(totalSalaries/totalRevenue*100):0}%</td></tr>
                  <tr style={{background:"#f8fafc",fontWeight:700}}><td style={s.td}>Total Deductible</td><td style={s.tdr}>{f(totalCosts)}</td><td style={s.tdr}>{totalRevenue>0?Math.round(totalCosts/totalRevenue*100):0}%</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{fontSize:9,color:"#94a3b8",marginTop:8}}>⚠ Estimate only. Consult a licensed accountant in Jordan for exact rates and compliance.</p>
          </>
        )}
      </div>

      <div style={s.footer}>
        <span>{clinic?.name} · {TITLES[report]} · {from} to {to}</span>
        <span>Generated by MedFlow — VeloTech · {today}</span>
      </div>
      <style>{`@media print{@page{size:A4;margin:0}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
    </div>
  );
}

export default function FinanceIntelligencePrintPage() {
  return (
    <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>Preparing...</div>}>
      <PrintContent/>
    </Suspense>
  );
}
