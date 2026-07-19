"use client";
import { useMemo, useState } from "react";

interface Patient {
  id: string; gender: string | null; dob: string | null;
  address: string | null; referral_source: string | null;
  referral_source_detail: string | null; created_at: string;
}
interface Appointment {
  id: string; appt_date: string; visit_type: string; status: string;
  patient_id: string; payment_method: string | null; visit_fee: number | null;
}
const REFERRAL_LABELS: Record<string,string> = {
  physician:"Physician",hospital:"Hospital",another_clinic:"Another Clinic",
  insurance:"Insurance Company",existing_patient:"Existing Patient",
  friend_family:"Friend / Family",google_search:"Google Search",
  google_maps:"Google Maps",website:"Clinic Website",facebook:"Facebook",
  instagram:"Instagram",linkedin:"LinkedIn",youtube:"YouTube",tiktok:"TikTok",
  newspaper:"Newspaper",radio:"Radio",tv:"TV",walk_in:"Walk-in",other:"Other",
};
const REFERRAL_GROUPS: Record<string,string[]> = {
  "Digital":["google_search","google_maps","website","facebook","instagram","linkedin","youtube","tiktok"],
  "Word of Mouth":["physician","existing_patient","friend_family","another_clinic"],
  "Medical":["hospital","insurance"],
  "Traditional":["newspaper","radio","tv"],
  "Direct":["walk_in","other"],
};
function getAge(dob:string|null):number|null {
  if(!dob) return null;
  return Math.floor((Date.now()-new Date(dob).getTime())/(365.25*24*3600*1000));
}
function StatCard({label,value,sub,color="text-neutral-800",bg="bg-white",border="border-neutral-200"}:
  {label:string;value:string|number;sub?:string;color?:string;bg?:string;border?:string}) {
  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-5 shadow-sm`}>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-700">{label}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}
function Bar({label,value,max,color}:{label:string;value:number;max:number;color:string}) {
  const pct = max>0 ? Math.round(value/max*100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 text-right text-xs font-medium text-neutral-600 truncate">{label}</div>
      <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} flex items-center justify-end pr-2`}
          style={{width:`${Math.max(pct,3)}%`}}>
          {pct>=15 && <span className="text-[10px] font-bold text-white">{value}</span>}
        </div>
      </div>
      {pct<15 && <span className="text-xs font-bold text-neutral-600 w-6">{value}</span>}
      <span className="text-xs text-neutral-400 w-8 text-right">{pct}%</span>
    </div>
  );
}
export default function PatientAnalysisClient({patients,appointments,clinicName,currency}:
  {patients:Patient[];appointments:Appointment[];clinicName:string;currency:string}) {
  const [period,setPeriod] = useState<"month"|"quarter"|"half"|"year"|"all">("all");
  const now = new Date();
  const periodStart = useMemo(()=>{
    if(period==="all") return new Date("2000-01-01");
    const d=new Date(now);
    if(period==="month")   d.setMonth(d.getMonth()-1);
    if(period==="quarter") d.setMonth(d.getMonth()-3);
    if(period==="half")    d.setMonth(d.getMonth()-6);
    if(period==="year")    d.setFullYear(d.getFullYear()-1);
    return d;
  },[period]);
  const fp = useMemo(()=>patients.filter(p=>new Date(p.created_at)>=periodStart),[patients,periodStart]);
  const fa = useMemo(()=>appointments.filter(a=>new Date(a.appt_date)>=periodStart),[appointments,periodStart]);
  const totalPatients = fp.length;
  const totalVisits   = fa.length;
  const totalRevenue  = fa.reduce((s,a)=>s+(a.visit_fee||0),0);
  const returningCount = new Set(fa.filter(a=>appointments.some(b=>b.patient_id===a.patient_id&&b.appt_date<a.appt_date)).map(a=>a.patient_id)).size;
  const monthlyData = useMemo(()=>{
    const months=[];
    for(let i=11;i>=0;i--){
      const d=new Date(now); d.setMonth(d.getMonth()-i);
      const key=d.toISOString().slice(0,7);
      months.push({label:d.toLocaleDateString("en",{month:"short",year:"2-digit"}),count:patients.filter(p=>p.created_at.startsWith(key)).length});
    }
    return months;
  },[patients]);
  const maxMonthly=Math.max(...monthlyData.map(m=>m.count),1);
  const genderCounts=fp.reduce((a,p)=>{const g=p.gender||"unknown";a[g]=(a[g]||0)+1;return a;},{} as Record<string,number>);
  const ageGroups={"0–18":0,"19–35":0,"36–50":0,"51–65":0,"65+":0,"Unknown":0} as Record<string,number>;
  fp.forEach(p=>{const a=getAge(p.dob);if(a===null)ageGroups["Unknown"]++;else if(a<=18)ageGroups["0–18"]++;else if(a<=35)ageGroups["19–35"]++;else if(a<=50)ageGroups["36–50"]++;else if(a<=65)ageGroups["51–65"]++;else ageGroups["65+"]++;});
  const maxAge=Math.max(...Object.values(ageGroups),1);
  const refCounts=fp.reduce((a,p)=>{const r=p.referral_source||"unknown";a[r]=(a[r]||0)+1;return a;},{} as Record<string,number>);
  const sortedRefs=Object.entries(refCounts).filter(([k])=>k!=="unknown").sort(([,a],[,b])=>b-a);
  const maxRef=Math.max(...sortedRefs.map(([,v])=>v),1);
  const unknownRef=refCounts["unknown"]||0;
  const groupCounts=Object.entries(REFERRAL_GROUPS).map(([group,keys])=>({group,count:keys.reduce((s,k)=>s+(refCounts[k]||0),0)})).sort((a,b)=>b.count-a.count);
  const maxGroup=Math.max(...groupCounts.map(g=>g.count),1);
  const visitTypeCounts=fa.reduce((a,v)=>{a[v.visit_type]=(a[v.visit_type]||0)+1;return a;},{} as Record<string,number>);
  const maxVisit=Math.max(...Object.values(visitTypeCounts),1);
  const paymentCounts=fa.reduce((a,v)=>{const m=v.payment_method||"unknown";a[m]=(a[m]||0)+1;return a;},{} as Record<string,number>);
  const PERIOD_LABELS={month:"Last month",quarter:"Last 3 months",half:"Last 6 months",year:"Last year",all:"All time"};
  const C=["bg-indigo-500","bg-sky-500","bg-violet-500","bg-emerald-500","bg-orange-500","bg-pink-500","bg-teal-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Patient Analysis</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{clinicName} · {PERIOD_LABELS[period]}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
            {(["month","quarter","half","year","all"] as const).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${period===p?"bg-white shadow text-neutral-900":"text-neutral-500 hover:text-neutral-700"}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button onClick={()=>window.print()}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 print:hidden">
            🖨 Export PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <StatCard label="Total Patients"        value={totalPatients}            color="text-indigo-700"  bg="bg-indigo-50"  border="border-indigo-200"  sub={PERIOD_LABELS[period]}/>
        <StatCard label="Total Visits"          value={totalVisits}              color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" sub="completed"/>
        <StatCard label="Returning Patients"    value={returningCount}           color="text-violet-700"  bg="bg-violet-50"  border="border-violet-200"  sub="visited more than once"/>
        <StatCard label={`Revenue (${currency})`} value={totalRevenue.toFixed(0)} color="text-amber-700" bg="bg-amber-50"   border="border-amber-200"   sub="from completed visits"/>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">📈 New Patients — Monthly Trend (Last 12 Months)</h2>
          <div className="flex items-end gap-1.5 h-32">
            {monthlyData.map((m,i)=>(
              <div key={i} className="flex flex-col items-center flex-1 gap-1">
                {m.count>0&&<span className="text-[9px] font-bold text-neutral-600">{m.count}</span>}
                <div className="w-full rounded-t-md bg-indigo-500" style={{height:`${Math.max(m.count/maxMonthly*100,2)}%`,minHeight:4}}/>
                <span className="text-[8px] text-neutral-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-1">📣 Referral Sources</h2>
          {unknownRef>0&&<p className="text-xs text-neutral-400 mb-3">{unknownRef} without source recorded</p>}
          {sortedRefs.length===0
            ?<p className="text-sm text-neutral-400 py-8 text-center">No referral data yet</p>
            :<div className="space-y-2 mt-3">{sortedRefs.map(([key,count],i)=><Bar key={key} label={REFERRAL_LABELS[key]||key} value={count} max={maxRef} color={C[i%C.length]}/>)}</div>}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-3">🗂 Referral Channels</h2>
          <div className="space-y-2">{groupCounts.map(({group,count},i)=><Bar key={group} label={group} value={count} max={maxGroup} color={C[i]}/>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {groupCounts.filter(g=>g.count>0).map(({group,count})=>{
              const pct=totalPatients>0?Math.round(count/totalPatients*100):0;
              return <div key={group} className="rounded-xl bg-neutral-50 border border-neutral-100 p-2 text-center"><p className="text-lg font-black text-neutral-800">{pct}%</p><p className="text-[10px] text-neutral-500">{group}</p></div>;
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">👥 Gender Distribution</h2>
          <div className="space-y-3">
            {[{label:"Male",key:"male",color:"bg-blue-500",text:"text-blue-700"},{label:"Female",key:"female",color:"bg-pink-500",text:"text-pink-700"},{label:"Unknown",key:"unknown",color:"bg-neutral-300",text:"text-neutral-500"}].map(g=>{
              const count=genderCounts[g.key]||0;const pct=totalPatients>0?Math.round(count/totalPatients*100):0;
              return <div key={g.key}><div className="flex justify-between text-xs mb-1"><span className="font-medium text-neutral-700">{g.label}</span><span className={`font-bold ${g.text}`}>{count} ({pct}%)</span></div><div className="h-3 rounded-full bg-neutral-100"><div className={`h-3 rounded-full ${g.color}`} style={{width:`${pct}%`}}/></div></div>;
            })}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[{label:"Male",key:"male",color:"text-blue-700"},{label:"Female",key:"female",color:"text-pink-600"},{label:"Unknown",key:"unknown",color:"text-neutral-400"}].map(g=>(
              <div key={g.key} className="rounded-xl bg-neutral-50 p-3"><p className={`text-2xl font-black ${g.color}`}>{genderCounts[g.key]||0}</p><p className="text-[10px] text-neutral-500">{g.label}</p></div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">🎂 Age Distribution</h2>
          <div className="space-y-2">{Object.entries(ageGroups).map(([label,count],i)=><Bar key={label} label={label} value={count} max={maxAge} color={C[i]}/>)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">🩺 Visit Types</h2>
          <div className="space-y-2">{Object.entries(visitTypeCounts).sort(([,a],[,b])=>b-a).map(([type,count],i)=><Bar key={type} label={type.charAt(0).toUpperCase()+type.slice(1)} value={count} max={maxVisit} color={C[i]}/>)}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {Object.entries(visitTypeCounts).map(([type,count])=>{
              const pct=totalVisits>0?Math.round(count/totalVisits*100):0;
              return <div key={type} className="rounded-xl bg-neutral-50 p-3"><p className="text-2xl font-black text-neutral-800">{pct}%</p><p className="text-[10px] text-neutral-500 capitalize">{type}</p></div>;
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">💳 Payment Methods</h2>
          <div className="space-y-2">{Object.entries(paymentCounts).sort(([,a],[,b])=>b-a).map(([method,count],i)=><Bar key={method} label={method==="cash"?"Cash":method==="insurance"?"Insurance":method==="split"?"Split":method} value={count} max={Math.max(...Object.values(paymentCounts),1)} color={C[i]}/>)}</div>
        </div>
      </div>
      <style>{`@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:1cm;}}`}</style>
    </div>
  );
}
