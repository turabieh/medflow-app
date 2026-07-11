"use client";
import { useState } from "react";

const CONDITIONS: Record<string, {label:string; color:string; bg:string; border:string}> = {
  healthy: { label:"Healthy",  color:"#15803d", bg:"#f0fdf4", border:"#86efac" },
  caries:  { label:"Caries",   color:"#b91c1c", bg:"#fef2f2", border:"#fca5a5" },
  filled:  { label:"Filled",   color:"#1d4ed8", bg:"#eff6ff", border:"#93c5fd" },
  crown:   { label:"Crown",    color:"#374151", bg:"#f9fafb", border:"#d1d5db" },
  rct:     { label:"RCT",      color:"#6d28d9", bg:"#f5f3ff", border:"#c4b5fd" },
  missing: { label:"Missing",  color:"#374151", bg:"#f1f5f9", border:"#cbd5e1" },
  implant: { label:"Implant",  color:"#065f46", bg:"#ecfdf5", border:"#6ee7b7" },
  bridge:  { label:"Bridge",   color:"#c2410c", bg:"#fff7ed", border:"#fdba74" },
  planned: { label:"Planned",  color:"#92400e", bg:"#fffbeb", border:"#fcd34d" },
  pain:    { label:"Pain",     color:"#9f1239", bg:"#fff1f2", border:"#fda4af" },
};

const ADULT_UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const ADULT_LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const PEDO_UPPER  = [55,54,53,52,51,61,62,63,64,65];
const PEDO_LOWER  = [85,84,83,82,81,71,72,73,74,75];

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
  "Stainless steel crown","Extraction (simple)","Surgical extraction",
  "Implant placement","Implant abutment","Implant crown",
  "Scaling and polishing","Deep scaling","Subgingival curettage",
  "Veneer preparation","Veneer fitting","Bleaching session",
  "Bridge preparation","Bridge fitting","Space maintainer",
  "Pulpotomy (pediatric)","Pulpectomy (pediatric)","Orthodontic review",
];

interface ToothRecord {
  condition: string;
  notes: string;
  history: { date:string; proc:string; fee?:string; lab?:string; shade?:string; condition?:string }[];
}

// ── Single tooth card ─────────────────────────────────────────────────────────
function ToothCard({
  number, isPedo, condition, onClick,
}: {
  number: number; isPedo: boolean; condition: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const c = CONDITIONS[condition] || CONDITIONS.healthy;
  const imgSrc = isPedo ? `/teeth/pedo_${number}.png` : `/teeth/adult_${number}.png`;
  const isMissing = condition === "missing";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Tooth ${number} — ${c.label}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        padding: "3px 2px",
        borderRadius: 8,
        border: `1.5px solid ${hovered ? c.border : condition !== "healthy" ? c.border : "transparent"}`,
        background: condition !== "healthy" ? c.bg : hovered ? "#f0f9ff" : "transparent",
        transition: "all 0.12s ease",
        position: "relative",
        transform: hovered ? "scale(1.08)" : "scale(1)",
      }}>

      {/* Condition color bar at top */}
      {condition !== "healthy" && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 3, borderRadius: "7px 7px 0 0",
          background: c.color,
        }}/>
      )}

      {/* Tooth image */}
      <div style={{
        position: "relative",
        opacity: isMissing ? 0.25 : 1,
        filter: condition === "healthy" ? "none" :
                condition === "missing" ? "grayscale(100%)" :
                `drop-shadow(0 0 3px ${c.color}88)`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={`Tooth ${number}`}
          style={{
            width: isPedo ? 44 : 38,
            height: isPedo ? 68 : 78,
            objectFit: "contain",
            display: "block",
          }}
        />
        {/* Color tint overlay for conditions */}
        {condition !== "healthy" && condition !== "missing" && (
          <div style={{
            position: "absolute", inset: 0,
            background: c.bg,
            opacity: 0.35,
            mixBlendMode: "multiply",
            borderRadius: 2,
          }}/>
        )}
        {/* X for missing */}
        {isMissing && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#64748b",
          }}>✕</div>
        )}
      </div>

      {/* Tooth number */}
      <span style={{
        fontSize: 9, fontWeight: 700,
        color: condition !== "healthy" ? c.color : "#94a3b8",
        marginTop: 2, lineHeight: 1,
      }}>{number}</span>

      {/* Condition dot */}
      {condition !== "healthy" && (
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: c.color, marginTop: 2, flexShrink: 0,
        }}/>
      )}
    </div>
  );
}

// ── Tooth detail panel ────────────────────────────────────────────────────────
function ToothPanel({
  number, isPedo, teethData, onSave, onClose,
}: {
  number: number; isPedo: boolean;
  teethData: Record<number, ToothRecord>;
  onSave: (n:number, cond:string, notes:string, proc:string, fee:string, lab:string, shade:string) => void;
  onClose: () => void;
}) {
  const t = teethData[number] || {} as ToothRecord;
  const [cond, setCond]   = useState(t.condition || "healthy");
  const [notes, setNotes] = useState(t.notes || "");
  const [proc, setProc]   = useState("");
  const [fee, setFee]     = useState("");
  const [lab, setLab]     = useState("");
  const [shade, setShade] = useState("");
  const condObj = CONDITIONS[cond] || CONDITIONS.healthy;
  const needsLab = proc && (
    proc.toLowerCase().includes("crown") ||
    proc.toLowerCase().includes("bridge") ||
    proc.toLowerCase().includes("veneer") ||
    proc.toLowerCase().includes("implant crown")
  );
  const imgSrc = isPedo ? `/teeth/pedo_${number}.png` : `/teeth/adult_${number}.png`;

  return (
    <div
      style={{position:"fixed",inset:0,zIndex:200,display:"flex",background:"rgba(15,23,42,0.45)",backdropFilter:"blur(4px)"}}
      onClick={onClose}>
      <div
        style={{marginLeft:"auto",width:420,background:"#fff",display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"-4px 0 30px rgba(0,0,0,0.12)"}}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{background:"#f8fafc",padding:"20px",borderBottom:"1px solid #e2e8f0",borderTop:`4px solid ${condObj.color}`,flexShrink:0,position:"relative"}}>
          <button onClick={onClose}
            style={{position:"absolute",top:16,right:16,background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"#64748b",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>

          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            {/* Real tooth image in panel */}
            <div style={{flexShrink:0,background:"#f1f5f9",borderRadius:10,padding:6,border:"1px solid #e2e8f0"}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={`Tooth ${number}`}
                style={{width:56,height:72,objectFit:"contain",display:"block"}}/>
            </div>
            <div>
              <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8",margin:"0 0 4px"}}>Tooth</p>
              <p style={{fontSize:44,fontWeight:700,color:"#0f172a",lineHeight:1,margin:"0 0 4px"}}>{number}</p>
              <p style={{fontSize:12,color:"#64748b",margin:"0 0 8px"}}>{TOOTH_NAMES[number]||`Tooth ${number}`}</p>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:condObj.bg,borderRadius:20,padding:"4px 10px",border:`1.5px solid ${condObj.border}`}}>
                <div style={{width:8,height:8,borderRadius:2,background:condObj.color}}/>
                <span style={{fontSize:12,fontWeight:600,color:condObj.color}}>{condObj.label}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:18,display:"flex",flexDirection:"column",gap:14,flex:1}}>

          {/* Condition selector */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Set condition</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {Object.entries(CONDITIONS).map(([key,val]) => (
                <button key={key} onClick={() => setCond(key)}
                  style={{
                    display:"flex",alignItems:"center",gap:7,padding:"8px 10px",
                    borderRadius:8,border:`1.5px solid ${cond===key ? val.color : "#e2e8f0"}`,
                    background: cond===key ? val.bg : "#f8fafc",
                    cursor:"pointer",fontSize:12,
                    fontWeight: cond===key ? 600 : 400,
                    color: cond===key ? val.color : "#374151",
                    transition:"all 0.1s",
                  }}>
                  <div style={{width:10,height:10,borderRadius:2,background:val.color,flexShrink:0}}/>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Procedure */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Today&apos;s procedure</p>
            <select value={proc} onChange={e => setProc(e.target.value)}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,color:"#0f172a",background:"#fff",outline:"none",cursor:"pointer",boxSizing:"border-box"}}>
              <option value="">— Select procedure —</option>
              {PROCS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {proc && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <div>
                  <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Fee (JOD)</p>
                  <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
                {needsLab && (
                  <div>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>Shade</p>
                    <input type="text" value={shade} onChange={e => setShade(e.target.value)} placeholder="A2, B1..."
                      style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                )}
              </div>
            )}

            {needsLab && (
              <div style={{marginTop:8}}>
                <p style={{fontSize:10,color:"#d97706",fontWeight:600,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>🏭 Lab name</p>
                <input type="text" value={lab} onChange={e => setLab(e.target.value)} placeholder="Lab name..."
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #fcd34d",fontSize:13,outline:"none",background:"#fffbeb",boxSizing:"border-box"}}/>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 6px"}}>Clinical notes</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Probing depths, sensitivity, clinical findings..."
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>

          {/* History */}
          {t.history?.length > 0 && (
            <div>
              <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Tooth history</p>
              {t.history.map((h, i) => (
                <div key={i} style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",marginBottom:5,borderLeft:`3px solid ${CONDITIONS[h.condition||"healthy"]?.color||"#e2e8f0"}`}}>
                  <p style={{margin:"0 0 2px",fontSize:10,color:"#94a3b8",fontWeight:500}}>{h.date}</p>
                  <p style={{margin:0,fontSize:12,color:"#0f172a",fontWeight:500}}>{h.proc}</p>
                  {h.fee && <p style={{margin:"2px 0 0",fontSize:11,color:"#d97706"}}>{h.fee} JOD</p>}
                  {h.lab && <p style={{margin:"2px 0 0",fontSize:11,color:"#ea580c"}}>🏭 {h.lab} {h.shade && `· Shade ${h.shade}`}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{padding:"14px 18px",borderTop:"1px solid #e2e8f0",flexShrink:0}}>
          <button
            onClick={() => { onSave(number, cond, notes, proc, fee, lab, shade); onClose(); }}
            style={{width:"100%",background:"#0f172a",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
            Save tooth record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main chart ────────────────────────────────────────────────────────────────
export function DentalChartTab() {
  const [isPedo, setIsPedo]       = useState(false);
  const [selected, setSelected]   = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, ToothRecord>>({
    36: { condition:"caries",  notes:"Deep mesial caries", history:[{date:"12/01/2026",proc:"Periapical X-ray",condition:"caries"}] },
    11: { condition:"crown",   notes:"Zirconia crown 2023", history:[{date:"05/03/2023",proc:"Crown fit — zirconia",fee:"280",lab:"Advanced Dental Lab",shade:"A2",condition:"crown"}] },
    46: { condition:"rct",     notes:"RCT session 2 done", history:[{date:"20/11/2025",proc:"Root canal — session 1",condition:"rct"}] },
    18: { condition:"missing", notes:"Extracted 2024",     history:[{date:"10/06/2024",proc:"Extraction (simple)",condition:"missing"}] },
    21: { condition:"filled",  notes:"Composite class III",history:[{date:"14/08/2024",proc:"Composite filling — class III",fee:"60",condition:"filled"}] },
    14: { condition:"pain",    notes:"Cold sensitivity",   history:[] },
  });

  const upper = isPedo ? PEDO_UPPER : ADULT_UPPER;
  const lower = isPedo ? PEDO_LOWER : ADULT_LOWER;

  const counts = Object.values(teethData).reduce((a, t) => {
    if (t.condition && t.condition !== "healthy")
      a[t.condition] = (a[t.condition] || 0) + 1;
    return a;
  }, {} as Record<string, number>);

  function handleSave(n: number, cond: string, notes: string, proc: string, fee: string, lab: string, shade: string) {
    setTeethData(prev => ({
      ...prev,
      [n]: {
        condition: cond, notes,
        history: proc
          ? [{ date: new Date().toLocaleDateString("en-GB"), proc, fee, lab, shade, condition: cond }, ...(prev[n]?.history || [])]
          : (prev[n]?.history || []),
      }
    }));
  }

  return (
    <div style={{background:"#f8fafc",minHeight:"100%",padding:"16px 20px",fontFamily:"system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:600,color:"#0f172a",margin:"0 0 3px"}}>Dental chart</h2>
          <p style={{fontSize:12,color:"#64748b",margin:0}}>FDI notation · Click any tooth to record</p>
        </div>
        <div style={{display:"flex",gap:3,background:"#e2e8f0",borderRadius:9,padding:3}}>
          {([[false,"Adult (32)"],[true,"Pediatric (20)"]] as [boolean, string][]).map(([v,l]) => (
            <button key={String(v)} onClick={() => setIsPedo(v)}
              style={{background:isPedo===v?"#0f172a":"transparent",color:isPedo===v?"#fff":"#64748b",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
        {Object.entries(CONDITIONS).map(([key, val]) => (
          <div key={key} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:counts[key]?val.bg:"#ffffff",border:`1px solid ${counts[key]?val.border:"#e2e8f0"}`}}>
            <div style={{width:8,height:8,borderRadius:2,background:val.color}}/>
            <span style={{fontSize:11,fontWeight:counts[key]?600:400,color:counts[key]?val.color:"#64748b"}}>{val.label}</span>
            {counts[key] && <span style={{fontSize:10,fontWeight:700,background:val.color,color:"#fff",borderRadius:10,padding:"0 5px"}}>{counts[key]}</span>}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{background:"#ffffff",borderRadius:14,border:"1px solid #e2e8f0",padding:"16px 12px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>

        {/* Upper jaw label */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#cbd5e1"}}>← Patient&apos;s right</span>
          <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8"}}>Upper jaw — maxilla</span>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#cbd5e1"}}>Patient&apos;s left →</span>
        </div>

        {/* Upper teeth row */}
        <div style={{display:"flex",justifyContent:"center",gap:isPedo?3:1,flexWrap:"nowrap",overflow:"visible"}}>
          {upper.map(n => (
            <ToothCard key={n} number={n} isPedo={isPedo}
              condition={teethData[n]?.condition || "healthy"}
              onClick={() => setSelected(n)}/>
          ))}
        </div>

        {/* Gum divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"10px 0"}}>
          <div style={{flex:1,height:4,borderRadius:4,background:"linear-gradient(90deg,rgba(249,168,212,0.2),rgba(249,168,212,0.7),rgba(249,168,212,0.2))"}}/>
          <span style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:3,color:"#f472b6",opacity:.7,whiteSpace:"nowrap"}}>Gingival line</span>
          <div style={{flex:1,height:4,borderRadius:4,background:"linear-gradient(90deg,rgba(249,168,212,0.2),rgba(249,168,212,0.7),rgba(249,168,212,0.2))"}}/>
        </div>

        {/* Lower teeth row */}
        <div style={{display:"flex",justifyContent:"center",gap:isPedo?3:1,flexWrap:"nowrap",overflow:"visible"}}>
          {lower.map(n => (
            <ToothCard key={n} number={n} isPedo={isPedo}
              condition={teethData[n]?.condition || "healthy"}
              onClick={() => setSelected(n)}/>
          ))}
        </div>

        {/* Lower jaw label */}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#cbd5e1"}}>← Patient&apos;s right</span>
          <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#94a3b8"}}>Lower jaw — mandible</span>
          <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:2,color:"#cbd5e1"}}>Patient&apos;s left →</span>
        </div>
      </div>

      {/* Summary */}
      {Object.keys(counts).length > 0 && (
        <div style={{marginTop:12,background:"#ffffff",borderRadius:12,border:"1px solid #e2e8f0",padding:"12px 16px"}}>
          <p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94a3b8",margin:"0 0 8px"}}>Chart summary</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {Object.entries(counts).map(([key, count]) => {
              const affected = Object.entries(teethData).filter(([,t]) => t.condition===key).map(([n]) => n);
              return (
                <div key={key} style={{background:CONDITIONS[key].bg,border:`1.5px solid ${CONDITIONS[key].border}`,borderRadius:8,padding:"7px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <div style={{width:8,height:8,borderRadius:2,background:CONDITIONS[key].color}}/>
                    <span style={{fontSize:12,fontWeight:600,color:CONDITIONS[key].color}}>{count} · {CONDITIONS[key].label}</span>
                  </div>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>Teeth: {affected.join(", ")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{textAlign:"center",fontSize:11,color:"#cbd5e1",marginTop:10}}>
        Click any tooth to record condition, procedure, and clinical notes
      </p>

      {selected !== null && (
        <ToothPanel
          number={selected}
          isPedo={isPedo}
          teethData={teethData}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
