"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const RL: Record<string,string> = {
  physician:"Physician",hospital:"Hospital",another_clinic:"Another Clinic",
  insurance:"Insurance Co.",existing_patient:"Existing Patient",
  friend_family:"Friend/Family",google_search:"Google Search",
  google_maps:"Google Maps",website:"Clinic Website",facebook:"Facebook",
  instagram:"Instagram",linkedin:"LinkedIn",youtube:"YouTube",tiktok:"TikTok",
  newspaper:"Newspaper",radio:"Radio",tv:"TV",walk_in:"Walk-in",other:"Other",
};
const RG: Record<string,string[]> = {
  "Digital":["google_search","google_maps","website","facebook","instagram","linkedin","youtube","tiktok"],
  "Word of Mouth":["physician","existing_patient","friend_family","another_clinic"],
  "Medical":["hospital","insurance"],
  "Traditional":["newspaper","radio","tv"],
  "Direct":["walk_in","other"],
};
function getAge(d:string|null){if(!d)return null;return Math.floor((Date.now()-new Date(d).getTime())/(365.25*24*3600*1000));}

function HBar({label,value,max,color,total}:{label:string;value:number;max:number;color:string;total:number}){
  const p=max>0?Math.round(value/max*100):0;
  const tp=total>0?Math.round(value/total*100):0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
      <div style={{width:130,textAlign:"right",fontSize:10,color:"#374151",fontWeight:500,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
      <div style={{flex:1,height:16,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.max(p,2)}%`,background:color,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:5}}>
          {p>=18&&<span style={{fontSize:9,fontWeight:700,color:"white"}}>{value}</span>}
        </div>
      </div>
      {p<18&&<span style={{fontSize:10,fontWeight:700,color:"#374151",width:18,textAlign:"right"}}>{value}</span>}
      <span style={{fontSize:10,color:"#94a3b8",width:30,textAlign:"right"}}>{tp}%</span>
    </div>
  );
}

export default function PatientAnalysisPrint(){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{
    (async()=>{
      const sb=createClient();
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;
      const {data:profile}=await sb.from("users").select("clinic_id").eq("id",user.id).single();
      const cid=profile?.clinic_id;
      const [p,a,c]=await Promise.all([
        sb.from("patients").select("id,gender,dob,referral_source,created_at").eq("clinic_id",cid),
        sb.from("appointments").select("id,appt_date,visit_type,status,patient_id,payment_method,visit_fee").eq("clinic_id",cid).in("status",["finalized","done"]),
        sb.from("clinics").select("name,currency,phone,address").eq("id",cid).single(),
      ]);
      setData({patients:p.data??[],appointments:a.data??[],clinic:c.data});
      setTimeout(()=>window.print(),1000);
    })();
  },[]);

  if(!data) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#64748b"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontSize:14}}>Preparing report...</div></div>
    </div>
  );

  const {patients,appointments,clinic}=data;
  const today=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const currency=clinic?.currency??"JOD";
  const total=patients.length;
  const totalV=appointments.length;
  const revenue=appointments.reduce((s:number,a:any)=>s+(a.visit_fee||0),0);
  const returning=new Set(appointments.filter((a:any)=>appointments.some((b:any)=>b.patient_id===a.patient_id&&b.appt_date<a.appt_date)).map((a:any)=>a.patient_id)).size;
  const gc=patients.reduce((a:any,p:any)=>{const g=p.gender||"unknown";a[g]=(a[g]||0)+1;return a;},{});
  const ag:Record<string,number>={"0–18":0,"19–35":0,"36–50":0,"51–65":0,"65+":0,"Unknown":0};
  patients.forEach((p:any)=>{const a=getAge(p.dob);if(a===null)ag["Unknown"]++;else if(a<=18)ag["0–18"]++;else if(a<=35)ag["19–35"]++;else if(a<=50)ag["36–50"]++;else if(a<=65)ag["51–65"]++;else ag["65+"]++;});
  const rc=patients.reduce((a:any,p:any)=>{const r=p.referral_source||"unknown";a[r]=(a[r]||0)+1;return a;},{});
  const refs=Object.entries(rc).filter(([k])=>k!=="unknown").sort(([,a]:any,[,b]:any)=>b-a) as [string,number][];
  const noRef=rc["unknown"]||0;
  const grps=Object.entries(RG).map(([g,ks])=>({g,c:ks.reduce((s,k)=>s+(rc[k]||0),0)})).sort((a,b)=>b.c-a.c);
  const vtc=appointments.reduce((a:any,v:any)=>{a[v.visit_type]=(a[v.visit_type]||0)+1;return a;},{});
  const pmc=appointments.reduce((a:any,v:any)=>{const m=v.payment_method||"cash";a[m]=(a[m]||0)+1;return a;},{});
  const monthly=Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(11-i));const k=d.toISOString().slice(0,7);return{l:d.toLocaleDateString("en",{month:"short",year:"2-digit"}),n:patients.filter((p:any)=>p.created_at.startsWith(k)).length};});
  const maxM=Math.max(...monthly.map(m=>m.n),1);
  const maxR=Math.max(...refs.map(([,v])=>v),1);
  const maxG=Math.max(...grps.map(g=>g.c),1);
  const maxA=Math.max(...Object.values(ag),1);
  const maxV=Math.max(...Object.values(vtc) as number[],1);
  const maxP=Math.max(...Object.values(pmc) as number[],1);
  const BC=["#6366f1","#0ea5e9","#8b5cf6","#10b981","#f97316","#ec4899","#14b8a6","#f59e0b","#ef4444","#06b6d4"];

  return(
    <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",color:"#0f172a",background:"white",margin:0,padding:0}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",color:"white",padding:"28px 40px 24px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,opacity:.6,marginBottom:6}}>Patient Analysis Report</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{clinic?.name}</div>
          <div style={{fontSize:11,opacity:.65}}>{clinic?.address}{clinic?.phone&&` · ${clinic.phone}`}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,opacity:.6,marginBottom:4}}>Generated</div>
          <div style={{fontSize:14,fontWeight:700}}>{today}</div>
          <div style={{fontSize:10,opacity:.6,marginTop:4}}>All patients · {total} records</div>
        </div>
      </div>

      <div style={{padding:"28px 40px"}}>
        {/* KPI cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
          {[{l:"Total Patients",v:total,c:"#6366f1",bg:"#eef2ff",b:"#c7d2fe"},{l:"Total Visits",v:totalV,c:"#10b981",bg:"#ecfdf5",b:"#6ee7b7"},{l:"Returning",v:returning,c:"#8b5cf6",bg:"#f5f3ff",b:"#c4b5fd"},{l:`Revenue (${currency})`,v:revenue.toFixed(0),c:"#f59e0b",bg:"#fffbeb",b:"#fde68a"}].map(x=>(
            <div key={x.l} style={{borderRadius:12,padding:"16px 18px",border:`1.5px solid ${x.b}`,background:x.bg}}>
              <div style={{fontSize:28,fontWeight:900,color:x.c,lineHeight:1}}>{x.v}</div>
              <div style={{fontSize:10,fontWeight:600,color:"#374151",marginTop:6}}>{x.l}</div>
            </div>
          ))}
        </div>

        {/* Monthly trend */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>📈 New Patients — Monthly Trend</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:70}}>
            {monthly.map((m,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                {m.n>0&&<div style={{fontSize:8,fontWeight:700,color:"#374151"}}>{m.n}</div>}
                <div style={{width:"100%",background:"#6366f1",borderRadius:"3px 3px 0 0",height:`${Math.max(m.n/maxM*60,3)}px`}}/>
                <div style={{fontSize:7,color:"#94a3b8",whiteSpace:"nowrap"}}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          {/* Referral sources */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>📣 Referral Sources</div>
            {noRef>0&&<div style={{fontSize:9,color:"#94a3b8",marginBottom:8}}>{noRef} without source</div>}
            {refs.length===0?<div style={{fontSize:11,color:"#94a3b8",padding:"16px 0",textAlign:"center"}}>No data yet</div>
              :refs.map(([k,v],i)=><HBar key={k} label={RL[k]||k} value={v} max={maxR} color={BC[i%BC.length]} total={total}/>)}
          </div>

          {/* Referral channels */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>🗂 Referral Channels</div>
            {grps.map(({g,c},i)=><HBar key={g} label={g} value={c} max={maxG} color={BC[i]} total={total}/>)}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
              {grps.filter(g=>g.c>0).map(({g,c})=>{
                const p=total>0?Math.round(c/total*100):0;
                return <div key={g} style={{background:"#f8fafc",borderRadius:8,padding:7,textAlign:"center",border:"1px solid #e2e8f0"}}><div style={{fontSize:16,fontWeight:900,color:"#0f172a"}}>{p}%</div><div style={{fontSize:8,color:"#64748b"}}>{g}</div></div>;
              })}
            </div>
          </div>

          {/* Gender */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>👥 Gender</div>
            {[{l:"Male",k:"male",c:"#3b82f6"},{l:"Female",k:"female",c:"#ec4899"},{l:"Unknown",k:"unknown",c:"#94a3b8"}].map(g=>{
              const cnt=gc[g.k]||0;const p=total>0?Math.round(cnt/total*100):0;
              return <div key={g.k} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{fontWeight:500,color:"#374151"}}>{g.l}</span><span style={{fontWeight:700,color:g.c}}>{cnt} ({p}%)</span></div><div style={{height:10,background:"#f1f5f9",borderRadius:10,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:g.c,borderRadius:10,minWidth:p>0?3:0}}/></div></div>;
            })}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
              {[{l:"Male",k:"male",c:"#3b82f6"},{l:"Female",k:"female",c:"#ec4899"},{l:"Unknown",k:"unknown",c:"#94a3b8"}].map(g=>(
                <div key={g.k} style={{background:"#f8fafc",borderRadius:8,padding:7,textAlign:"center",border:"1px solid #e2e8f0"}}><div style={{fontSize:18,fontWeight:900,color:g.c}}>{gc[g.k]||0}</div><div style={{fontSize:8,color:"#64748b"}}>{g.l}</div></div>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>🎂 Age Groups</div>
            {Object.entries(ag).map(([l,v],i)=><HBar key={l} label={l} value={v} max={maxA} color={BC[i]} total={total}/>)}
          </div>

          {/* Visit types */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>🩺 Visit Types</div>
            {Object.entries(vtc).sort(([,a]:any,[,b]:any)=>b-a).map(([t,v]:any,i)=><HBar key={t} label={t.charAt(0).toUpperCase()+t.slice(1)} value={v} max={maxV} color={BC[i]} total={totalV}/>)}
          </div>

          {/* Payment */}
          <div>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#64748b",marginBottom:10,paddingBottom:6,borderBottom:"1.5px solid #e2e8f0"}}>💳 Payment Methods</div>
            {Object.entries(pmc).sort(([,a]:any,[,b]:any)=>b-a).map(([m,v]:any,i)=><HBar key={m} label={m==="cash"?"Cash":m==="insurance"?"Insurance":m==="split"?"Split":m} value={v} max={maxP} color={BC[i]} total={totalV}/>)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{borderTop:"1px solid #e2e8f0",padding:"12px 40px",display:"flex",justifyContent:"space-between",fontSize:9,color:"#94a3b8",marginTop:16}}>
        <span>{clinic?.name} · Patient Analysis · {today}</span>
        <span>Generated by MedFlow — VeloTech</span>
      </div>

      <style>{`@media print{@page{size:A4;margin:0;}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}`}</style>
    </div>
  );
}
