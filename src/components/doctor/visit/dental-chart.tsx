"use client";
import { useState, useRef } from "react";

const CONDITIONS = {
  healthy:  { label:"Healthy",  color:"#16a34a", bg:"rgba(34,197,94,0.0)",   ring:"#22c55e" },
  caries:   { label:"Caries",   color:"#dc2626", bg:"rgba(239,68,68,0.45)",   ring:"#ef4444" },
  filled:   { label:"Filled",   color:"#2563eb", bg:"rgba(59,130,246,0.45)",  ring:"#3b82f6" },
  crown:    { label:"Crown",    color:"#6b7280", bg:"rgba(156,163,175,0.5)",  ring:"#9ca3af" },
  rct:      { label:"RCT",      color:"#7c3aed", bg:"rgba(139,92,246,0.45)", ring:"#a78bfa" },
  missing:  { label:"Missing",  color:"#374151", bg:"rgba(31,41,55,0.7)",    ring:"#6b7280" },
  implant:  { label:"Implant",  color:"#059669", bg:"rgba(16,185,129,0.4)",  ring:"#34d399" },
  bridge:   { label:"Bridge",   color:"#ea580c", bg:"rgba(249,115,22,0.45)", ring:"#fb923c" },
  planned:  { label:"Planned",  color:"#d97706", bg:"rgba(234,179,8,0.4)",   ring:"#fbbf24" },
  pain:     { label:"Pain",     color:"#be123c", bg:"rgba(244,63,94,0.45)",  ring:"#fb7185" },
};

// Adult FDI positions as % of image width/height (1536x560 usable area)
// Row 1: teeth 18→28 (upper), Row 2: teeth 48→38 (lower)
const ADULT_POSITIONS = {
  // Upper jaw (row 1) - y from 0 to ~52% of image height
  18:{x:0.5,  y:1,  w:5.8, h:27, row:"upper"},
  17:{x:6.8,  y:1,  w:5.8, h:27, row:"upper"},
  16:{x:13.0, y:1,  w:6.2, h:27, row:"upper"},
  15:{x:19.6, y:1,  w:5.5, h:27, row:"upper"},
  14:{x:25.4, y:1,  w:5.5, h:27, row:"upper"},
  13:{x:31.0, y:1,  w:5.2, h:30, row:"upper"},
  12:{x:36.4, y:1,  w:5.0, h:28, row:"upper"},
  11:{x:41.6, y:1,  w:5.8, h:28, row:"upper"},
  21:{x:47.6, y:1,  w:5.8, h:28, row:"upper"},
  22:{x:53.4, y:1,  w:5.0, h:28, row:"upper"},
  23:{x:58.6, y:1,  w:5.2, h:30, row:"upper"},
  24:{x:63.8, y:1,  w:5.5, h:27, row:"upper"},
  25:{x:69.6, y:1,  w:5.5, h:27, row:"upper"},
  26:{x:75.2, y:1,  w:6.2, h:27, row:"upper"},
  27:{x:81.6, y:1,  w:5.8, h:27, row:"upper"},
  28:{x:87.8, y:1,  w:6.0, h:27, row:"upper"},
  // Lower jaw (row 2) - y from ~53% to 100%
  48:{x:0.5,  y:54, w:5.8, h:27, row:"lower"},
  47:{x:6.8,  y:54, w:5.8, h:27, row:"lower"},
  46:{x:13.0, y:54, w:6.2, h:27, row:"lower"},
  45:{x:19.6, y:54, w:5.5, h:27, row:"lower"},
  44:{x:25.4, y:54, w:5.5, h:27, row:"lower"},
  43:{x:31.0, y:54, w:5.2, h:30, row:"lower"},
  42:{x:36.4, y:54, w:5.0, h:28, row:"lower"},
  41:{x:41.6, y:54, w:5.8, h:28, row:"lower"},
  31:{x:47.6, y:54, w:5.8, h:28, row:"lower"},
  32:{x:53.4, y:54, w:5.0, h:28, row:"lower"},
  33:{x:58.6, y:54, w:5.2, h:30, row:"lower"},
  34:{x:63.8, y:54, w:5.5, h:27, row:"lower"},
  35:{x:69.6, y:54, w:5.5, h:27, row:"lower"},
  36:{x:75.2, y:54, w:6.2, h:27, row:"lower"},
  37:{x:81.6, y:54, w:5.8, h:27, row:"lower"},
  38:{x:87.8, y:54, w:6.0, h:27, row:"lower"},
};

const PEDO_POSITIONS = {
  // Upper primary (row 1)
  55:{x:4.5,  y:1,  w:9.0, h:28, row:"upper"},
  54:{x:14.5, y:1,  w:8.5, h:28, row:"upper"},
  53:{x:23.5, y:1,  w:8.0, h:32, row:"upper"},
  52:{x:32.0, y:1,  w:7.5, h:28, row:"upper"},
  51:{x:39.5, y:1,  w:7.5, h:27, row:"upper"},
  61:{x:47.5, y:1,  w:7.5, h:27, row:"upper"},
  62:{x:55.0, y:1,  w:7.5, h:28, row:"upper"},
  63:{x:62.5, y:1,  w:8.0, h:32, row:"upper"},
  64:{x:71.0, y:1,  w:8.5, h:28, row:"upper"},
  65:{x:80.0, y:1,  w:9.0, h:28, row:"upper"},
  // Lower primary (row 2)
  85:{x:4.5,  y:54, w:9.0, h:28, row:"lower"},
  84:{x:14.5, y:54, w:8.5, h:28, row:"lower"},
  83:{x:23.5, y:54, w:8.0, h:32, row:"lower"},
  82:{x:32.0, y:54, w:7.5, h:28, row:"lower"},
  81:{x:39.5, y:54, w:7.5, h:27, row:"lower"},
  71:{x:47.5, y:54, w:7.5, h:27, row:"lower"},
  72:{x:55.0, y:54, w:7.5, h:28, row:"lower"},
  73:{x:62.5, y:54, w:8.0, h:32, row:"lower"},
  74:{x:71.0, y:54, w:8.5, h:28, row:"lower"},
  75:{x:80.0, y:54, w:9.0, h:28, row:"lower"},
};

const TOOTH_NAMES = {
  11:"UR Central",12:"UR Lateral",13:"UR Canine",14:"UR 1st Pre",15:"UR 2nd Pre",
  16:"UR 1st Molar",17:"UR 2nd Molar",18:"UR Wisdom",
  21:"UL Central",22:"UL Lateral",23:"UL Canine",24:"UL 1st Pre",25:"UL 2nd Pre",
  26:"UL 1st Molar",27:"UL 2nd Molar",28:"UL Wisdom",
  31:"LL Central",32:"LL Lateral",33:"LL Canine",34:"LL 1st Pre",35:"LL 2nd Pre",
  36:"LL 1st Molar",37:"LL 2nd Molar",38:"LL Wisdom",
  41:"LR Central",42:"LR Lateral",43:"LR Canine",44:"LR 1st Pre",45:"LR 2nd Pre",
  46:"LR 1st Molar",47:"LR 2nd Molar",48:"LR Wisdom",
  51:"UL Central (Primary)",52:"UL Lateral (Primary)",53:"UL Canine (Primary)",
  54:"UL 1st Molar (Primary)",55:"UL 2nd Molar (Primary)",
  61:"UR Central (Primary)",62:"UR Lateral (Primary)",63:"UR Canine (Primary)",
  64:"UR 1st Molar (Primary)",65:"UR 2nd Molar (Primary)",
  71:"LL Central (Primary)",72:"LL Lateral (Primary)",73:"LL Canine (Primary)",
  74:"LL 1st Molar (Primary)",75:"LL 2nd Molar (Primary)",
  81:"LR Central (Primary)",82:"LR Lateral (Primary)",83:"LR Canine (Primary)",
  84:"LR 1st Molar (Primary)",85:"LR 2nd Molar (Primary)",
};

const PROCS = [
  "Examination","Periapical X-ray","Bitewing X-ray","Panoramic X-ray",
  "Composite filling — class I","Composite filling — class II",
  "Composite filling — class III","Composite filling — class IV",
  "Amalgam filling","GIC filling","Temporary filling",
  "Root canal — session 1","Root canal — session 2","Root canal — final",
  "Crown preparation","Crown fit — zirconia","Crown fit — PFM","Crown fit — gold",
  "Stainless steel crown","Extraction (simple)","Surgical extraction",
  "Implant placement","Implant abutment","Implant crown",
  "Scaling and polishing","Deep scaling","Veneer preparation","Veneer fitting",
  "Bridge preparation","Bridge fitting","Bleaching session",
  "Pulpotomy (pediatric)","Pulpectomy (pediatric)",
  "Space maintainer","Orthodontic review",
];

// ── Tooth Panel ───────────────────────────────────────────────────────────────
function ToothPanel({ tooth, teethData, onSave, onClose }) {
  const t = teethData[tooth.number] || {};
  const [cond, setCond]   = useState(t.condition || "healthy");
  const [notes, setNotes] = useState(t.notes || "");
  const [proc, setProc]   = useState("");
  const [fee, setFee]     = useState("");
  const [lab, setLab]     = useState("");
  const [shade, setShade] = useState("");
  const condObj = CONDITIONS[cond] || CONDITIONS.healthy;
  const needsLab = proc && (proc.includes("crown")||proc.includes("Crown")||proc.includes("Bridge")||proc.includes("bridge")||proc.includes("Veneer")||proc.includes("veneer")||proc.includes("Implant")||proc.includes("implant"));

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",background:"rgba(15,23,42,0.5)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{marginLeft:"auto",width:400,background:"#ffffff",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"-4px 0 30px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{background:"#f8fafc",padding:"20px 20px 16px",borderBottom:"1px solid #e2e8f0",borderTop:`4px solid ${condObj.color}`,flexShrink:0,position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"#64748b",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8",margin:"0 0 4px"}}>Tooth</p>
          <p style={{fontSize:42,fontWeight:700,color:"#0f172a",lineHeight:1,margin:"0 0 4px"}}>{tooth.number}</p>
          <p style={{fontSize:12,color:"#64748b",margin:0}}>{TOOTH_NAMES[tooth.number]||`Tooth ${tooth.number}`}</p>
          <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:6,background:condObj.bg.replace("0.45","0.12").replace("0.5","0.12").replace("0.4","0.12").replace("0.7","0.12"),borderRadius:20,padding:"4px 12px",border:`1.5px solid ${condObj.ring}`}}>
            <div style={{width:8,height:8,borderRadius:2,background:condObj.color}}/>
            <span style={{fontSize:12,fontWeight:600,color:condObj.color}}>{condObj.label}</span>
          </div>
        </div>

        <div style={{padding:18,display:"flex",flexDirection:"column",gap:14,flex:1}}>
          {/* Condition */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Set condition</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {Object.entries(CONDITIONS).map(([key,val])=>(
                <button key={key} onClick={()=>setCond(key)}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${cond===key?val.color:"#e2e8f0"}`,background:cond===key?`${val.color}12`:"#f8fafc",cursor:"pointer",fontSize:12,fontWeight:cond===key?600:400,color:cond===key?val.color:"#374151",transition:"all 0.1s"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:val.color,flexShrink:0}}/>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Procedure */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Today's procedure</p>
            <select value={proc} onChange={e=>{setProc(e.target.value)}}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,color:"#0f172a",background:"#fff",outline:"none",cursor:"pointer",boxSizing:"border-box"}}>
              <option value="">— Select procedure —</option>
              {PROCS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            {proc && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <div>
                  <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Fee (JOD)</p>
                  <input type="number" value={fee} onChange={e=>setFee(e.target.value)} placeholder="0.00"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
                {needsLab && (
                  <div>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Shade</p>
                    <input type="text" value={shade} onChange={e=>setShade(e.target.value)} placeholder="A2, B1..."
                      style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                )}
              </div>
            )}
            {needsLab && (
              <div style={{marginTop:8}}>
                <p style={{fontSize:10,color:"#d97706",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>🏭 Lab name</p>
                <input type="text" value={lab} onChange={e=>setLab(e.target.value)} placeholder="Lab name..."
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #fcd34d",fontSize:13,outline:"none",background:"#fffbeb",boxSizing:"border-box"}}/>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Clinical notes</p>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Probing depths, sensitivity, findings..."
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>

          {/* History */}
          {t.history?.length > 0 && (
            <div>
              <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Tooth history</p>
              {t.history.map((h,i)=>(
                <div key={i} style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",marginBottom:5,borderLeft:`3px solid ${CONDITIONS[h.condition||"healthy"]?.color||"#e2e8f0"}`}}>
                  <p style={{margin:"0 0 2px",fontSize:10,color:"#94a3b8",fontWeight:500}}>{h.date}</p>
                  <p style={{margin:0,fontSize:12,color:"#0f172a",fontWeight:500}}>{h.proc}</p>
                  {h.fee && <p style={{margin:"2px 0 0",fontSize:11,color:"#d97706"}}>{h.fee} JOD</p>}
                  {h.lab && <p style={{margin:"2px 0 0",fontSize:11,color:"#ea580c"}}>🏭 {h.lab}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{padding:"14px 18px",borderTop:"1px solid #e2e8f0",flexShrink:0}}>
          <button onClick={()=>{onSave(tooth.number,cond,notes,proc,fee,lab,shade);onClose();}}
            style={{width:"100%",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
            Save tooth record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Chart ─────────────────────────────────────────────────────────────────
export function DentalChartTab() {
  const [isPedo, setIsPedo]     = useState(false);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered]   = useState(null);
  const [teethData, setTeethData] = useState({
    36:{condition:"caries",  notes:"Deep mesial caries",history:[{date:"12/01/2026",proc:"Periapical X-ray",condition:"caries"}]},
    11:{condition:"crown",   notes:"Zirconia 2023",     history:[{date:"05/03/2023",proc:"Crown fit — zirconia",fee:"280",lab:"Advanced Lab",shade:"A2",condition:"crown"}]},
    46:{condition:"rct",     notes:"RCT session 2",     history:[{date:"20/11/2025",proc:"Root canal — session 1",condition:"rct"}]},
    18:{condition:"missing", notes:"Extracted 2024",    history:[{date:"10/06/2024",proc:"Extraction (simple)",condition:"missing"}]},
    21:{condition:"filled",  notes:"Composite III",     history:[{date:"14/08/2024",proc:"Composite filling — class III",fee:"60",condition:"filled"}]},
    14:{condition:"pain",    notes:"Cold sensitivity",  history:[]},
  });

  const positions = isPedo ? PEDO_POSITIONS : ADULT_POSITIONS;
  const imgSrc = isPedo
    ? "/teeth-pedo.png"
    : "/teeth-adult.png";

  const counts = Object.values(teethData).reduce((a,t)=>{
    if(t.condition&&t.condition!=="healthy") a[t.condition]=(a[t.condition]||0)+1;
    return a;
  },{});

  function handleSave(n,cond,notes,proc,fee,lab,shade){
    setTeethData(prev=>({...prev,[n]:{condition:cond,notes,history:proc?[{date:new Date().toLocaleDateString("en-GB"),proc,fee,lab,shade,condition:cond},...(prev[n]?.history||[])]:(prev[n]?.history||[])}}));
  }

  return (
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f8fafc",minHeight:"100vh",padding:20}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:600,color:"#0f172a",margin:"0 0 4px"}}>Dental chart</h2>
          <p style={{fontSize:13,color:"#64748b",margin:0}}>FDI notation · Click any tooth to record conditions and procedures</p>
        </div>
        <div style={{display:"flex",gap:4,background:"#e2e8f0",borderRadius:10,padding:3}}>
          {[[false,"Adult (32)"],[true,"Pediatric (20)"]].map(([v,l])=>(
            <button key={String(v)} onClick={()=>setIsPedo(v)}
              style={{background:isPedo===v?"#0f172a":"transparent",color:isPedo===v?"#fff":"#64748b",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.2s"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
        {Object.entries(CONDITIONS).map(([key,val])=>(
          <div key={key} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:counts[key]?`${val.color}12`:"#ffffff",border:`1px solid ${counts[key]?val.color+"55":"#e2e8f0"}`}}>
            <div style={{width:8,height:8,borderRadius:2,background:val.color}}/>
            <span style={{fontSize:11,fontWeight:counts[key]?600:400,color:counts[key]?val.color:"#64748b"}}>{val.label}</span>
            {counts[key]&&<span style={{fontSize:10,fontWeight:700,background:val.color,color:"#fff",borderRadius:10,padding:"0 5px"}}>{counts[key]}</span>}
          </div>
        ))}
      </div>

      {/* Chart — real image with SVG overlay */}
      <div style={{background:"#ffffff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>

        {/* Jaw labels */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 6px",borderBottom:"1px solid #f1f5f9"}}>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8"}}>← Patient's right</span>
          <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#64748b"}}>
            {isPedo ? "Primary teeth" : "Permanent teeth"}
          </span>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8"}}>Patient's left →</span>
        </div>

        {/* Image + SVG overlay */}
        <div style={{position:"relative",width:"100%"}}>
          {/* Real tooth image - only show top half (upper + lower teeth rows, not occlusal views) */}
          <div style={{position:"relative",overflow:"hidden"}}>
            <img
              src={imgSrc}
              alt="Dental chart"
              style={{
                width:"100%",
                display:"block",
                objectFit:"cover",
                objectPosition:"top",
                height:"auto",
                maxHeight: 320,
              }}
            />
            {/* SVG clickable overlays positioned over each tooth */}
            <svg
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}}
              viewBox="0 0 100 100"
              preserveAspectRatio="none">
              {Object.entries(positions).map(([num, pos])=>{
                const n = parseInt(num);
                const t = teethData[n];
                const cond = t?.condition || "healthy";
                const c = CONDITIONS[cond] || CONDITIONS.healthy;
                const isHovered = hovered === n;
                const isSelected = selected?.number === n;

                return (
                  <g key={n}>
                    {/* Condition color overlay */}
                    {cond !== "healthy" && (
                      <rect
                        x={pos.x} y={pos.y}
                        width={pos.w} height={pos.h}
                        fill={c.bg}
                        rx="0.5"
                        style={{mixBlendMode:"multiply"}}
                      />
                    )}
                    {/* Hover/selected ring */}
                    {(isHovered || isSelected) && (
                      <rect
                        x={pos.x+0.2} y={pos.y+0.2}
                        width={pos.w-0.4} height={pos.h-0.4}
                        fill="none"
                        stroke={isSelected ? c.ring : "#0ea5e9"}
                        strokeWidth="0.6"
                        rx="0.5"
                      />
                    )}
                    {/* Condition badge dot */}
                    {cond !== "healthy" && cond !== "missing" && (
                      <circle
                        cx={pos.x + pos.w/2}
                        cy={pos.row==="upper" ? pos.y + pos.h - 3 : pos.y + 3}
                        r="1.8"
                        fill={c.color}
                      />
                    )}
                    {/* Invisible click target */}
                    <rect
                      x={pos.x} y={pos.y}
                      width={pos.w} height={pos.h}
                      fill="transparent"
                      style={{cursor:"pointer"}}
                      onMouseEnter={()=>setHovered(n)}
                      onMouseLeave={()=>setHovered(null)}
                      onClick={()=>setSelected({number:n})}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Tooth number row */}
        <div style={{display:"flex",justifyContent:"center",borderTop:"1px solid #f1f5f9",padding:"4px 0"}}>
          {hovered ? (
            <span style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>
              Tooth {hovered} — {TOOTH_NAMES[hovered]||""}
              {teethData[hovered]?.condition && teethData[hovered].condition !== "healthy" &&
                <span style={{marginLeft:8,fontSize:11,color:CONDITIONS[teethData[hovered].condition]?.color}}>
                  · {CONDITIONS[teethData[hovered].condition]?.label}
                </span>
              }
            </span>
          ) : (
            <span style={{fontSize:11,color:"#94a3b8"}}>Hover over a tooth to see its number</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {Object.keys(counts).length > 0 && (
        <div style={{marginTop:14,background:"#ffffff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 10px"}}>Chart summary</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {Object.entries(counts).map(([key,count])=>{
              const affected = Object.entries(teethData).filter(([,t])=>t.condition===key).map(([n])=>n);
              return (
                <div key={key} style={{background:`${CONDITIONS[key].color}10`,border:`1.5px solid ${CONDITIONS[key].ring}`,borderRadius:10,padding:"8px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <div style={{width:10,height:10,borderRadius:2,background:CONDITIONS[key].color}}/>
                    <span style={{fontSize:12,fontWeight:600,color:CONDITIONS[key].color}}>{count} · {CONDITIONS[key].label}</span>
                  </div>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>Teeth: {affected.join(", ")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{textAlign:"center",fontSize:11,color:"#94a3b8",marginTop:12}}>
        Click any tooth to record conditions, procedures, lab work and clinical notes
      </p>

      {selected && (
        <ToothPanel
          tooth={selected}
          teethData={teethData}
          onSave={handleSave}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  );
}
