"use client";
import { useState, useRef } from "react";

// ── Conditions ────────────────────────────────────────────────────────────────
const CONDITIONS: Record<string, {label:string;color:string;bg:string;border:string;overlay:string}> = {
  healthy: { label:"Healthy",  color:"#15803d", bg:"#f0fdf4", border:"#86efac", overlay:"transparent" },
  caries:  { label:"Caries",   color:"#b91c1c", bg:"#fef2f2", border:"#fca5a5", overlay:"rgba(220,38,38,0.42)" },
  filled:  { label:"Filled",   color:"#1d4ed8", bg:"#eff6ff", border:"#93c5fd", overlay:"rgba(37,99,235,0.42)" },
  crown:   { label:"Crown",    color:"#374151", bg:"#f9fafb", border:"#d1d5db", overlay:"rgba(107,114,128,0.45)" },
  rct:     { label:"RCT",      color:"#6d28d9", bg:"#f5f3ff", border:"#c4b5fd", overlay:"rgba(109,40,217,0.42)" },
  missing: { label:"Missing",  color:"#6b7280", bg:"#f1f5f9", border:"#94a3b8", overlay:"rgba(71,85,105,0.55)" },
  implant: { label:"Implant",  color:"#065f46", bg:"#ecfdf5", border:"#6ee7b7", overlay:"rgba(16,185,129,0.42)" },
  bridge:  { label:"Bridge",   color:"#c2410c", bg:"#fff7ed", border:"#fdba74", overlay:"rgba(234,88,12,0.42)" },
  planned: { label:"Planned",  color:"#92400e", bg:"#fffbeb", border:"#fcd34d", overlay:"rgba(234,179,8,0.48)" },
  pain:    { label:"Pain",     color:"#9f1239", bg:"#fff1f2", border:"#fda4af", overlay:"rgba(244,63,94,0.45)" },
};

// ── Precise tooth positions as % of image (1536×1024) ────────────────────────
// Measured from dark separator columns found via pixel analysis
// Adult positions — all in % of full image (1536×1024)
// SVG viewBox crops to show y=8.79% to 52.73% (crowns only, no long roots)
// Upper crown: y=10.25% h=17.29%   Lower crown: y=39.55% h=12.70%
const ADULT_POS: Record<number, {x:number;y:number;w:number;h:number;row:string}> = {
  18:{x:0.78, y:10.25, w:6.97, h:17.29, row:"upper"},
  17:{x:7.88, y:10.25, w:6.71, h:17.29, row:"upper"},
  16:{x:14.71,y:10.25, w:6.90, h:17.29, row:"upper"},
  15:{x:21.74,y:10.25, w:5.47, h:17.29, row:"upper"},
  14:{x:27.34,y:10.25, w:5.60, h:17.29, row:"upper"},
  13:{x:33.07,y:10.25, w:5.27, h:17.29, row:"upper"},
  12:{x:38.48,y:10.25, w:4.88, h:17.29, row:"upper"},
  11:{x:43.49,y:10.25, w:6.38, h:17.29, row:"upper"},
  21:{x:50.00,y:10.25, w:6.38, h:17.29, row:"upper"},
  22:{x:56.51,y:10.25, w:4.88, h:17.29, row:"upper"},
  23:{x:61.52,y:10.25, w:5.34, h:17.29, row:"upper"},
  24:{x:67.00,y:10.25, w:5.53, h:17.29, row:"upper"},
  25:{x:72.66,y:10.25, w:5.21, h:17.29, row:"upper"},
  26:{x:77.99,y:10.25, w:6.51, h:17.29, row:"upper"},
  27:{x:84.64,y:10.25, w:6.58, h:17.29, row:"upper"},
  28:{x:91.34,y:10.25, w:7.16, h:17.29, row:"upper"},
  48:{x:0.78, y:39.55, w:6.97, h:12.70, row:"lower"},
  47:{x:7.88, y:39.55, w:6.71, h:12.70, row:"lower"},
  46:{x:14.71,y:39.55, w:6.90, h:12.70, row:"lower"},
  45:{x:21.74,y:39.55, w:5.47, h:12.70, row:"lower"},
  44:{x:27.34,y:39.55, w:5.60, h:12.70, row:"lower"},
  43:{x:33.07,y:39.55, w:5.27, h:12.70, row:"lower"},
  42:{x:38.48,y:39.55, w:4.88, h:12.70, row:"lower"},
  41:{x:43.49,y:39.55, w:6.38, h:12.70, row:"lower"},
  31:{x:50.00,y:39.55, w:6.38, h:12.70, row:"lower"},
  32:{x:56.51,y:39.55, w:4.88, h:12.70, row:"lower"},
  33:{x:61.52,y:39.55, w:5.34, h:12.70, row:"lower"},
  34:{x:67.00,y:39.55, w:5.53, h:12.70, row:"lower"},
  35:{x:72.66,y:39.55, w:5.21, h:12.70, row:"lower"},
  36:{x:77.99,y:39.55, w:6.51, h:12.70, row:"lower"},
  37:{x:84.64,y:39.55, w:6.58, h:12.70, row:"lower"},
  38:{x:91.34,y:39.55, w:7.16, h:12.70, row:"lower"},
};

// Pedo: 10 teeth evenly spaced across image width
// Pedo positions — measured from pixel analysis of actual image
// Upper teeth: y=98 to 261 (9.57% to 25.49% of 1024px image)
// Lower teeth: y=366 to 560 (35.74% to 54.69%)
// yScale for visible area (top 54.69%) = 100/54.69 = 1.8286
const PEDO_POS: Record<number, {x:number;y:number;w:number;h:number;row:string}> = {
  // Upper primary row — precise column boundaries from separator analysis
  55:{x:0.0,  y:9.57, w:17.77, h:15.92, row:"upper"},
  54:{x:17.77,y:9.57, w:7.75,  h:15.92, row:"upper"},
  53:{x:25.52,y:9.57, w:7.49,  h:15.92, row:"upper"},
  52:{x:33.01,y:9.57, w:8.01,  h:15.92, row:"upper"},
  51:{x:41.02,y:9.57, w:7.94,  h:15.92, row:"upper"},
  61:{x:48.96,y:9.57, w:8.07,  h:15.92, row:"upper"},
  62:{x:57.03,y:9.57, w:7.94,  h:15.92, row:"upper"},
  63:{x:64.97,y:9.57, w:7.81,  h:15.92, row:"upper"},
  64:{x:72.78,y:9.57, w:8.20,  h:15.92, row:"upper"},
  65:{x:80.98,y:9.57, w:19.02, h:15.92, row:"upper"},
  // Lower primary row
  85:{x:0.0,  y:35.74, w:17.58, h:18.95, row:"lower"},
  84:{x:17.58,y:35.74, w:8.07,  h:18.95, row:"lower"},
  83:{x:25.65,y:35.74, w:7.55,  h:18.95, row:"lower"},
  82:{x:33.20,y:35.74, w:8.07,  h:18.95, row:"lower"},
  81:{x:41.27,y:35.74, w:8.01,  h:18.95, row:"lower"},
  71:{x:49.28,y:35.74, w:8.20,  h:18.95, row:"lower"},
  72:{x:57.49,y:35.74, w:8.14,  h:18.95, row:"lower"},
  73:{x:65.62,y:35.74, w:7.49,  h:18.95, row:"lower"},
  74:{x:73.11,y:35.74, w:7.94,  h:18.95, row:"lower"},
  75:{x:81.05,y:35.74, w:18.95, h:18.95, row:"lower"},
};

const TOOTH_NAMES: Record<number, string> = {
  11:"Upper right central incisor", 12:"Upper right lateral incisor", 13:"Upper right canine",
  14:"Upper right 1st premolar",    15:"Upper right 2nd premolar",
  16:"Upper right 1st molar",       17:"Upper right 2nd molar",       18:"Upper right wisdom",
  21:"Upper left central incisor",  22:"Upper left lateral incisor",  23:"Upper left canine",
  24:"Upper left 1st premolar",     25:"Upper left 2nd premolar",
  26:"Upper left 1st molar",        27:"Upper left 2nd molar",        28:"Upper left wisdom",
  31:"Lower left central incisor",  32:"Lower left lateral incisor",  33:"Lower left canine",
  34:"Lower left 1st premolar",     35:"Lower left 2nd premolar",
  36:"Lower left 1st molar",        37:"Lower left 2nd molar",        38:"Lower left wisdom",
  41:"Lower right central incisor", 42:"Lower right lateral incisor", 43:"Lower right canine",
  44:"Lower right 1st premolar",    45:"Lower right 2nd premolar",
  46:"Lower right 1st molar",       47:"Lower right 2nd molar",       48:"Lower right wisdom",
  51:"Upper left central (primary)",52:"Upper left lateral (primary)",53:"Upper left canine (primary)",
  54:"Upper left 1st molar (primary)",55:"Upper left 2nd molar (primary)",
  61:"Upper right central (primary)",62:"Upper right lateral (primary)",63:"Upper right canine (primary)",
  64:"Upper right 1st molar (primary)",65:"Upper right 2nd molar (primary)",
  71:"Lower left central (primary)",72:"Lower left lateral (primary)",73:"Lower left canine (primary)",
  74:"Lower left 1st molar (primary)",75:"Lower left 2nd molar (primary)",
  81:"Lower right central (primary)",82:"Lower right lateral (primary)",83:"Lower right canine (primary)",
  84:"Lower right 1st molar (primary)",85:"Lower right 2nd molar (primary)",
};

const PROCS = [
  "Examination","Periapical X-ray","Bitewing X-ray","Panoramic X-ray",
  "Composite filling — class I","Composite filling — class II",
  "Composite filling — class III","Composite filling — class IV",
  "Amalgam filling","GIC filling","Temporary filling",
  "Root canal — session 1","Root canal — session 2","Root canal — final",
  "Crown preparation","Crown fit — zirconia","Crown fit — PFM","Crown fit — gold",
  "Stainless steel crown","Extraction (simple)","Surgical extraction","Bone graft",
  "Implant placement","Implant abutment","Implant crown",
  "Scaling and polishing","Deep scaling","Subgingival curettage",
  "Veneer preparation","Veneer fitting","Bleaching session",
  "Bridge preparation","Bridge fitting","Space maintainer",
  "Pulpotomy (pediatric)","Pulpectomy (pediatric)","Orthodontic review",
];

interface ToothRecord {
  condition: string;
  notes: string;
  history: {date:string;proc:string;fee?:string;lab?:string;shade?:string;condition?:string}[];
}

// ── Tooth Panel ───────────────────────────────────────────────────────────────
function ToothPanel({
  number, teethData, onSave, onClose,
}: {
  number: number;
  teethData: Record<number, ToothRecord>;
  onSave: (n:number, c:string, notes:string, proc:string, fee:string, lab:string, shade:string) => void;
  onClose: () => void;
}) {
  const t = teethData[number] || {} as ToothRecord;
  const [cond, setCond]   = useState(t.condition || "healthy");
  const [notes, setNotes] = useState(t.notes || "");
  const [proc, setProc]   = useState("");
  const [fee, setFee]     = useState("");
  const [lab, setLab]     = useState("");
  const [shade, setShade] = useState("");
  const co = CONDITIONS[cond] || CONDITIONS.healthy;
  const needsLab = proc && (proc.toLowerCase().includes("crown") || proc.toLowerCase().includes("bridge") || proc.toLowerCase().includes("veneer") || proc.toLowerCase().includes("implant crown"));

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"stretch",justifyContent:"flex-end",background:"rgba(2,6,23,0.5)",backdropFilter:"blur(6px)"}}
      onClick={onClose}>
      <div style={{width:400,background:"#ffffff",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,0.2)",animation:"slideIn 0.2s ease"}}
        onClick={e=>e.stopPropagation()}>

        <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>

        {/* Header */}
        <div style={{background:"#f8fafc",padding:"22px 20px 18px",borderBottom:"1px solid #e2e8f0",borderTop:`4px solid ${co.color}`,position:"relative",flexShrink:0}}>
          <button onClick={onClose}
            style={{position:"absolute",top:16,right:16,background:"#fff",border:"1px solid #e2e8f0",borderRadius:"50%",width:32,height:32,cursor:"pointer",color:"#64748b",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            ✕
          </button>

          <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8",margin:"0 0 4px"}}>Tooth</p>
          <p style={{fontSize:52,fontWeight:700,color:"#0f172a",lineHeight:1,margin:"0 0 5px"}}>{number}</p>
          <p style={{fontSize:13,color:"#64748b",margin:"0 0 12px"}}>{TOOTH_NAMES[number] || `Tooth ${number}`}</p>

          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:co.bg,borderRadius:20,padding:"5px 12px",border:`1.5px solid ${co.border}`}}>
            <div style={{width:9,height:9,borderRadius:2,background:co.color}}/>
            <span style={{fontSize:13,fontWeight:600,color:co.color}}>{co.label}</span>
          </div>
        </div>

        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:16,flex:1}}>

          {/* Condition */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Condition</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
              {Object.entries(CONDITIONS).map(([key,val])=>(
                <button key={key} onClick={()=>setCond(key)}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"9px 10px",borderRadius:8,border:`1.5px solid ${cond===key?val.color:"#e2e8f0"}`,background:cond===key?val.bg:"#f8fafc",cursor:"pointer",fontSize:13,fontWeight:cond===key?600:400,color:cond===key?val.color:"#374151",transition:"all 0.1s",textAlign:"left"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:val.color,flexShrink:0}}/>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Procedure */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Today&apos;s procedure</p>
            <select value={proc} onChange={e=>setProc(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,color:"#0f172a",background:"#fff",outline:"none",cursor:"pointer",boxSizing:"border-box"}}>
              <option value="">— Select procedure —</option>
              {PROCS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            {proc && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <div>
                  <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Fee (JOD)</p>
                  <input type="number" value={fee} onChange={e=>setFee(e.target.value)} placeholder="0.00"
                    style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
                {needsLab && (
                  <div>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Shade</p>
                    <input type="text" value={shade} onChange={e=>setShade(e.target.value)} placeholder="A2, B1..."
                      style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                )}
              </div>
            )}
            {needsLab && (
              <div style={{marginTop:8}}>
                <p style={{fontSize:10,color:"#d97706",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>🏭 Lab name</p>
                <input type="text" value={lab} onChange={e=>setLab(e.target.value)} placeholder="Lab name..."
                  style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #fcd34d",fontSize:13,outline:"none",background:"#fffbeb",boxSizing:"border-box"}}/>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Clinical notes</p>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Probing depths, sensitivity, clinical observations..."
              style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>

          {/* History */}
          {t.history?.length > 0 && (
            <div>
              <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>History</p>
              {t.history.map((h,i)=>(
                <div key={i} style={{background:"#f8fafc",borderRadius:8,padding:"9px 12px",marginBottom:5,borderLeft:`3px solid ${CONDITIONS[h.condition||"healthy"]?.color||"#e2e8f0"}`}}>
                  <p style={{margin:"0 0 2px",fontSize:10,color:"#94a3b8",fontWeight:500}}>{h.date}</p>
                  <p style={{margin:0,fontSize:13,color:"#0f172a",fontWeight:500}}>{h.proc}</p>
                  {h.fee && <p style={{margin:"2px 0 0",fontSize:11,color:"#d97706",fontWeight:500}}>{h.fee} JOD</p>}
                  {h.lab && <p style={{margin:"2px 0 0",fontSize:11,color:"#ea580c"}}>🏭 {h.lab}{h.shade && ` · Shade ${h.shade}`}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{padding:"14px 20px",borderTop:"1px solid #e2e8f0",flexShrink:0}}>
          <button onClick={()=>{onSave(number,cond,notes,proc,fee,lab,shade);onClose();}}
            style={{width:"100%",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:500,cursor:"pointer",letterSpacing:"0.3px"}}>
            Save tooth record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Chart ────────────────────────────────────────────────────────────────
export function DentalChartTab() {
  const [isPedo, setIsPedo]       = useState(false);
  const [selected, setSelected]   = useState<number|null>(null);
  const [hovered, setHovered]     = useState<number|null>(null);
  const [teethData, setTeethData] = useState<Record<number,ToothRecord>>({
    36:{condition:"caries", notes:"Deep mesial caries", history:[{date:"12/01/2026",proc:"Periapical X-ray",condition:"caries"}]},
    11:{condition:"crown",  notes:"Zirconia 2023",      history:[{date:"05/03/2023",proc:"Crown fit — zirconia",fee:"280",lab:"Advanced Lab",shade:"A2",condition:"crown"}]},
    46:{condition:"rct",    notes:"RCT in progress",    history:[{date:"20/11/2025",proc:"Root canal — session 1",condition:"rct"}]},
    18:{condition:"missing",notes:"Extracted 2024",     history:[{date:"10/06/2024",proc:"Extraction (simple)",condition:"missing"}]},
    21:{condition:"filled", notes:"Composite class III",history:[{date:"14/08/2024",proc:"Composite filling — class III",fee:"60",condition:"filled"}]},
    14:{condition:"pain",   notes:"Cold sensitivity",   history:[]},
  });

  const positions = isPedo ? PEDO_POS : ADULT_POS;

  // Image shows only top ~57% for adult (upper + lower teeth), crop occlusal views
  const imgStyle: React.CSSProperties = {
    width: "100%",
    display: "block",
    // Show only top 57% of adult image (upper+lower teeth, not occlusal views)
    // For pedo: top 50%
    objectFit: "cover",
    objectPosition: "top",
    aspectRatio: isPedo ? "1536/510" : "1536/585",
  };

  const counts = Object.values(teethData).reduce((a,t) => {
    if (t.condition && t.condition !== "healthy") a[t.condition] = (a[t.condition]||0)+1;
    return a;
  }, {} as Record<string,number>);

  function handleSave(n:number, cond:string, notes:string, proc:string, fee:string, lab:string, shade:string) {
    setTeethData(prev => ({
      ...prev,
      [n]: {
        condition: cond, notes,
        history: proc
          ? [{date: new Date().toLocaleDateString("en-GB"), proc, fee, lab, shade, condition:cond}, ...(prev[n]?.history||[])]
          : (prev[n]?.history||[]),
      }
    }));
  }

  return (
    <div style={{background:"#f8fafc",minHeight:"100%",padding:"16px 20px",fontFamily:"system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:600,color:"#0f172a",margin:"0 0 3px"}}>Dental chart</h2>
          <p style={{fontSize:12,color:"#64748b",margin:0}}>FDI notation · Click any tooth to record conditions and procedures</p>
        </div>
        <div style={{display:"flex",gap:3,background:"#e2e8f0",borderRadius:9,padding:3}}>
          {([[false,"Adult (32)"],[true,"Pediatric (20)"]] as [boolean,string][]).map(([v,l])=>(
            <button key={String(v)} onClick={()=>setIsPedo(v)}
              style={{background:isPedo===v?"#0f172a":"transparent",color:isPedo===v?"#fff":"#64748b",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
        {Object.entries(CONDITIONS).map(([key,val])=>(
          <div key={key}
            style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:counts[key]?val.bg:"#fff",border:`1px solid ${counts[key]?val.border:"#e2e8f0"}`}}>
            <div style={{width:8,height:8,borderRadius:2,background:val.color}}/>
            <span style={{fontSize:11,fontWeight:counts[key]?600:400,color:counts[key]?val.color:"#64748b"}}>{val.label}</span>
            {counts[key] && <span style={{fontSize:10,fontWeight:700,background:val.color,color:"#fff",borderRadius:10,padding:"0 5px"}}>{counts[key]}</span>}
          </div>
        ))}
      </div>

      {/* Chart container */}
      <div style={{background:"#111827",borderRadius:16,overflow:"hidden",border:"1px solid #1f2937",boxShadow:"0 4px 24px rgba(0,0,0,0.3)"}}>

        {/* Labels */}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px 4px",borderBottom:"1px solid #1f2937"}}>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#4b5563"}}>← Patient&apos;s right</span>
          <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#6b7280"}}>
            {isPedo ? "Primary dentition" : "Permanent dentition — FDI notation"}
          </span>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#4b5563"}}>Patient&apos;s left →</span>
        </div>

        {/* Image + SVG overlay — this is the magic */}
        <div style={{position:"relative",lineHeight:0}}>
          {/* The real professional tooth image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isPedo ? "/teeth-pedo.png" : "/teeth-adult.png"}
            alt={isPedo ? "Pediatric dental chart" : "Adult dental chart"}
            style={imgStyle}
          />

          {/* SVG overlay — transparent, sits exactly on top */}
          <svg
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",overflow:"visible"}}
            viewBox={isPedo ? "0 9.0 100 46.0" : "0 8.79 100 43.95"}
            preserveAspectRatio="none">

            {Object.entries(positions).map(([numStr, pos]) => {
              const n = parseInt(numStr);
              const t = teethData[n];
              const cond = t?.condition || "healthy";
              const co = CONDITIONS[cond] || CONDITIONS.healthy;
              const isHov = hovered === n;
              const isSel = selected === n;

              // viewBox handles the cropping — use raw image % coordinates
              const vy = pos.y;
              const vh = pos.h;

              return (
                <g key={n}>
                  {/* Condition color overlay on tooth */}
                  {cond !== "healthy" && cond !== "missing" && (
                    <rect
                      x={pos.x} y={vy} width={pos.w} height={vh}
                      fill={co.overlay}
                      rx="0.3"
                    />
                  )}
                  {/* Missing: use visible diagonal stripe pattern */}
                  {cond === "missing" && (
                    <g>
                      <rect x={pos.x} y={vy} width={pos.w} height={vh}
                        fill="rgba(100,116,139,0.5)" rx="0.3"/>
                      <line x1={pos.x} y1={vy} x2={pos.x+pos.w} y2={vy+vh} stroke="#94a3b8" strokeWidth="0.6" opacity="0.8"/>
                      <line x1={pos.x+pos.w} y1={vy} x2={pos.x} y2={vy+vh} stroke="#94a3b8" strokeWidth="0.6" opacity="0.8"/>
                      <circle cx={pos.x+pos.w/2} cy={vy+vh/2} r="1.5" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                    </g>
                  )}

                  {/* Hover highlight */}
                  {isHov && !isSel && (
                    <rect
                      x={pos.x+0.15} y={vy+0.15}
                      width={pos.w-0.3} height={vh-0.3}
                      fill="rgba(255,255,255,0.12)"
                      stroke="#ffffff"
                      strokeWidth="0.4"
                      rx="0.3"
                    />
                  )}

                  {/* Selected ring */}
                  {isSel && (
                    <rect
                      x={pos.x+0.1} y={vy+0.1}
                      width={pos.w-0.2} height={vh-0.2}
                      fill="rgba(255,255,255,0.08)"
                      stroke={co.color}
                      strokeWidth="0.6"
                      rx="0.3"
                      style={{filter:`drop-shadow(0 0 2px ${co.color})`}}
                    />
                  )}

                  {/* Condition dot — shows above number */}
                  {cond !== "healthy" && (
                    <circle
                      cx={pos.x + pos.w/2}
                      cy={pos.row === "upper" ? vy + vh - 3.5 : vy + 4.0}
                      r="1.0"
                      fill={co.color}
                      stroke="#fff"
                      strokeWidth="0.25"
                      style={{pointerEvents:"none"}}
                    />
                  )}

                  {/* Tooth number label */}
                  <text
                    x={pos.x + pos.w/2}
                    y={pos.row === "upper" ? vy + vh - 0.8 : vy + 2.2}
                    textAnchor="middle"
                    fontSize="1.6"
                    fontWeight="700"
                    fill={cond !== "healthy" ? co.color : "#94a3b8"}
                    style={{pointerEvents:"none", userSelect:"none"}}
                  >{n}</text>

                  {/* Invisible click/hover target */}
                  <rect
                    x={pos.x} y={vy} width={pos.w} height={vh}
                    fill="transparent"
                    style={{cursor:"pointer"}}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(n)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip bar */}
        <div style={{padding:"6px 16px",borderTop:"1px solid #1f2937",minHeight:32,display:"flex",alignItems:"center",gap:10}}>
          {hovered ? (
            <>
              <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Tooth {hovered}</span>
              <span style={{fontSize:12,color:"#6b7280"}}>—</span>
              <span style={{fontSize:12,color:"#9ca3af"}}>{TOOTH_NAMES[hovered]||""}</span>
              {teethData[hovered]?.condition && teethData[hovered].condition !== "healthy" && (
                <span style={{
                  marginLeft:6, fontSize:11, fontWeight:600,
                  color: CONDITIONS[teethData[hovered].condition]?.color,
                  background: CONDITIONS[teethData[hovered].condition]?.bg,
                  padding:"2px 8px", borderRadius:10,
                  border:`1px solid ${CONDITIONS[teethData[hovered].condition]?.border}`,
                }}>
                  {CONDITIONS[teethData[hovered].condition]?.label}
                </span>
              )}
              <span style={{marginLeft:"auto",fontSize:10,color:"#4b5563"}}>Click to open</span>
            </>
          ) : (
            <span style={{fontSize:11,color:"#4b5563"}}>Hover over a tooth to identify it · Click to record condition and procedure</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {Object.keys(counts).length > 0 && (
        <div style={{marginTop:14,background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 10px"}}>Chart summary</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {Object.entries(counts).map(([key,count]) => {
              const affected = Object.entries(teethData).filter(([,t])=>t.condition===key).map(([n])=>n);
              return (
                <div key={key} style={{background:CONDITIONS[key].bg,border:`1.5px solid ${CONDITIONS[key].border}`,borderRadius:10,padding:"8px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <div style={{width:9,height:9,borderRadius:2,background:CONDITIONS[key].color}}/>
                    <span style={{fontSize:13,fontWeight:600,color:CONDITIONS[key].color}}>{count} · {CONDITIONS[key].label}</span>
                  </div>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>Teeth: {affected.join(", ")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected !== null && (
        <ToothPanel
          number={selected}
          teethData={teethData}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
