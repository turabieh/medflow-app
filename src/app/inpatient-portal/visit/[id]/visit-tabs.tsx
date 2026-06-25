"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "patient" | "vitals" | "notes" | "rx" | "history";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id:"patient",  icon:"👤", label:"Patient"  },
  { id:"vitals",   icon:"❤️",  label:"Vitals"   },
  { id:"notes",    icon:"📝",  label:"Notes"    },
  { id:"rx",       icon:"💊",  label:"Rx"       },
  { id:"history",  icon:"📋",  label:"History"  },
];

type RxItem = { id: string; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null };
type MedCat = { id: string; name: string; common_dose: string | null; common_unit: string | null };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:"14px" }}>
      <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"6px" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px", color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"system-ui,-apple-system,sans-serif", boxSizing:"border-box", outline:"none" };
const taStyle:    React.CSSProperties = { ...inputStyle, resize:"none" };

export function MobileVisitTabs({ visitId, visit, patient, inpatient, prevVisits, medications: initMeds, medCatalog, clinicId, doctorId, patientId }: {
  visitId: string;
  visit: Record<string,unknown>;
  patient: Record<string,unknown> | null;
  inpatient: Record<string,unknown> | null;
  prevVisits: Record<string,unknown>[];
  medications: Record<string,unknown>[];
  medCatalog: Record<string,unknown>[];
  clinicId: string;
  doctorId: string;
  patientId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notes");

  // ── Vitals ────────────────────────────────────────────────────────────────
  const [bp,   setBp]   = useState((visit.blood_pressure    as string) ?? "");
  const [hr,   setHr]   = useState(visit.heart_rate   ? String(visit.heart_rate)   : "");
  const [temp, setTemp] = useState(visit.temperature  ? String(visit.temperature)  : "");
  const [o2,   setO2]   = useState(visit.oxygen_saturation ? String(visit.oxygen_saturation) : "");
  const [rr,   setRr]   = useState(visit.resp_rate    ? String(visit.resp_rate)    : "");
  const [wt,   setWt]   = useState(visit.weight_kg    ? String(visit.weight_kg)    : "");
  const [vitalsSaving, setVitalsSaving] = useState(false);
  const [vitalsSaved,  setVitalsSaved]  = useState(false);

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [subjective,   setSubjective]   = useState((visit.subjective        as string) ?? "");
  const [objective,    setObjective]    = useState((visit.objective         as string) ?? "");
  const [assessment,   setAssessment]   = useState((visit.assessment        as string) ?? "");
  const [plan,         setPlan]         = useState((visit.plan              as string) ?? "");
  const [keyPoints,    setKeyPoints]    = useState((visit.key_clinical_points as string) ?? "");
  const [notesSaving,  setNotesSaving]  = useState(false);
  const [notesSaved,   setNotesSaved]   = useState(false);

  // ── AI Diagnosis ──────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // ── Rx ───────────────────────────────────────────────────────────────────
  const [rxList, setRxList]     = useState<RxItem[]>(initMeds as RxItem[]);
  const [rxMode, setRxMode]     = useState<"catalog"|"manual">("catalog");
  const [selMedId, setSelMedId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [dose, setDose]         = useState("");
  const [unit, setUnit]         = useState("");
  const [freq, setFreq]         = useState("");
  const [dur, setDur]           = useState("");
  const [rxInstr, setRxInstr]   = useState("");
  const [addingRx, setAddingRx] = useState(false);

  async function saveVitals() {
    setVitalsSaving(true);
    const supabase = createClient();
    await supabase.from("visits").update({
      blood_pressure:    bp    || null,
      heart_rate:        hr    ? parseInt(hr)    : null,
      temperature:       temp  ? parseFloat(temp) : null,
      oxygen_saturation: o2   ? parseInt(o2)    : null,
      resp_rate:         rr   ? parseInt(rr)    : null,
      weight_kg:         wt   ? parseFloat(wt)  : null,
    }).eq("id", visitId);
    setVitalsSaving(false); setVitalsSaved(true);
    setTimeout(() => setVitalsSaved(false), 2000);
  }

  async function saveNotes() {
    setNotesSaving(true);
    const supabase = createClient();
    await supabase.from("visits").update({
      subjective:          subjective   || null,
      objective:           objective    || null,
      assessment:          assessment   || null,
      plan:                plan         || null,
      key_clinical_points: keyPoints    || null,
    }).eq("id", visitId);
    setNotesSaving(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    router.refresh();
  }

  async function getAiDiagnosis() {
    if (!subjective && !objective) return;
    setAiLoading(true); setAiSuggestion("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 500,
          messages: [{ role:"user", content:
            `You are a clinical decision support assistant. Based on the following patient information, suggest possible diagnoses (differential diagnosis list) with brief reasoning. Be concise and clinical.\n\nChief complaint / Subjective: ${subjective}\nObjective findings: ${objective}\nCurrent assessment: ${assessment}\n\nProvide 3-5 possible diagnoses ranked by likelihood. Format as a numbered list.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "No response";
      setAiSuggestion(text);
    } catch {
      setAiSuggestion("Could not get AI suggestion. Check connection.");
    }
    setAiLoading(false);
  }

  function handleCatalogSelect(id: string) {
    setSelMedId(id);
    const med = (medCatalog as MedCat[]).find(m => m.id === id);
    if (med) { setDose(med.common_dose ?? ""); setUnit(med.common_unit ?? ""); }
  }

  async function addRx() {
    const name = rxMode === "catalog"
      ? (medCatalog as MedCat[]).find(m => m.id === selMedId)?.name ?? ""
      : drugName.trim();
    if (!name) return;
    setAddingRx(true);
    const supabase = createClient();
    const { data: rx } = await supabase.from("prescriptions").insert({
      visit_id:        visitId,
      patient_id:      patientId,
      clinic_id:       clinicId,
      doctor_id:       doctorId,
      medication_id:   rxMode === "catalog" ? selMedId || null : null,
      medication_name: name,
      dose:            dose.trim() || null,
      unit:            unit.trim() || null,
      instructions:    (freq.trim() ? `${freq.trim()}. ` : "") + (rxInstr.trim() || ""),
      duration:        dur.trim() || null,
    }).select("id, medication_name, dose, unit, instructions, duration").single();
    setAddingRx(false);
    if (rx) {
      setRxList(prev => [...prev, rx as RxItem]);
      setSelMedId(""); setDrugName(""); setDose(""); setUnit(""); setFreq(""); setDur(""); setRxInstr("");
    }
  }

  async function deleteRx(id: string) {
    const supabase = createClient();
    await supabase.from("prescriptions").delete().eq("id", id);
    setRxList(prev => prev.filter(r => r.id !== id));
  }

  const ta = (val: string, set: (v:string)=>void, placeholder: string, rows=3) => (
    <textarea value={val} onChange={e => set(e.target.value)} placeholder={placeholder} rows={rows}
      style={taStyle} />
  );

  const inp = (val: string, set: (v:string)=>void, placeholder: string, type="text", extra?: React.CSSProperties) => (
    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
      style={{ ...inputStyle, ...extra }} />
  );

  const SaveBtn = ({ onClick, saving, saved, label }: { onClick:()=>void; saving:boolean; saved:boolean; label:string }) => (
    <button onClick={onClick} disabled={saving}
      style={{ width:"100%", background: saved ? "#166534" : "#3b82f6", color:"#fff", border:"none",
        borderRadius:"12px", padding:"15px", fontSize:"15px", fontWeight:"700", cursor:"pointer",
        fontFamily:"inherit", marginTop:"4px" }}>
      {saved ? "✓ Saved!" : saving ? "Saving..." : label}
    </button>
  );

  const insName = (() => {
    const ins = (patient as {insurance_companies?:{name:string}|{name:string}[]}|null)?.insurance_companies;
    return ins ? (Array.isArray(ins) ? ins[0]?.name : (ins as {name:string}).name) : null;
  })();

  const hosp = inpatient ? (Array.isArray((inpatient as {hospitals?:unknown}).hospitals)
    ? ((inpatient as {hospitals:{name:string}[]}).hospitals)[0]
    : (inpatient as {hospitals?:{name:string}}).hospitals) : null;

  return (
    <>
      {/* Content */}
      <div style={{ padding:"16px", paddingBottom:"80px" }}>

        {/* ── PATIENT ── */}
        {tab === "patient" && (
          <div>
            <div style={{ background:"#1e293b", borderRadius:"16px", padding:"16px", marginBottom:"12px" }}>
              <div style={{ fontSize:"19px", fontWeight:"800", marginBottom:"4px" }}>{(patient as {full_name?:string}|null)?.full_name}</div>
              {(patient as {full_name_ar?:string}|null)?.full_name_ar && (
                <div style={{ fontSize:"14px", color:"#64748b", direction:"rtl", marginBottom:"10px" }}>{(patient as {full_name_ar:string}).full_name_ar}</div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                {[
                  ["Phone",     (patient as {phone?:string}|null)?.phone],
                  ["Gender",    (patient as {gender?:string}|null)?.gender],
                  ["Blood",     (patient as {blood_type?:string}|null)?.blood_type],
                  ["Insurance", insName],
                  inpatient ? ["MRN",  (inpatient as {hospital_patient_id?:string}).hospital_patient_id] : null,
                  inpatient ? ["Room", (inpatient as {location?:string}).location]                       : null,
                  inpatient ? ["Hospital", hosp ? (hosp as {name:string}).name : null]                  : null,
                ].filter(r => r && r[1]).map((row, i) => row && (
                  <div key={i} style={{ background:"#0f172a", borderRadius:"10px", padding:"10px 12px" }}>
                    <div style={{ fontSize:"9px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"2px" }}>{row[0]}</div>
                    <div style={{ fontSize:"13px", fontWeight:"600" }}>{row[1]}</div>
                  </div>
                ))}
              </div>
            </div>

            {(patient as {allergies?:string}|null)?.allergies && (
              <div style={{ background:"#450a0a", border:"1.5px solid #dc2626", borderRadius:"12px", padding:"12px 14px" }}>
                <div style={{ fontSize:"10px", color:"#ef4444", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>⚠ Allergies</div>
                <div style={{ fontSize:"13px", color:"#fca5a5" }}>{(patient as {allergies:string}).allergies}</div>
              </div>
            )}
          </div>
        )}

        {/* ── VITALS ── */}
        {tab === "vitals" && (
          <div>
            <Field label="Blood Pressure">
              {inp(bp, setBp, "e.g. 120/80 mmHg")}
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {[
                { label:"Heart Rate (bpm)", val:hr, set:setHr, ph:"72" },
                { label:"Temperature (°C)", val:temp, set:setTemp, ph:"37.0" },
                { label:"O₂ Sat (%)",       val:o2,   set:setO2,   ph:"98" },
                { label:"Resp Rate (/min)", val:rr,   set:setRr,   ph:"16" },
                { label:"Weight (kg)",      val:wt,   set:setWt,   ph:"70" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>{f.label}</div>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ ...inputStyle, textAlign:"center", fontSize:"22px", fontFamily:"monospace", fontWeight:"700" }} />
                </div>
              ))}
            </div>
            <SaveBtn onClick={saveVitals} saving={vitalsSaving} saved={vitalsSaved} label="Save Vitals" />
          </div>
        )}

        {/* ── NOTES ── */}
        {tab === "notes" && (
          <div>
            <Field label="Chief Complaint / Subjective">{ta(subjective, setSubjective, "Patient's symptoms, complaints, duration...", 3)}</Field>
            <Field label="Objective — Examination Findings">{ta(objective, setObjective, "Clinical findings, signs, exam results...", 3)}</Field>

            <Field label="Assessment / Diagnosis">
              {ta(assessment, setAssessment, "Diagnosis, impression...", 2)}
              <button onClick={getAiDiagnosis} disabled={aiLoading || (!subjective && !objective)}
                style={{ marginTop:"8px", background: aiLoading ? "#334155" : "#7c3aed", color:"#fff", border:"none", borderRadius:"10px", padding:"10px 16px", fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
                {aiLoading ? "🤖 Getting AI suggestion..." : "🤖 Suggest Diagnosis (AI)"}
              </button>
              {aiSuggestion && (
                <div style={{ marginTop:"8px", background:"#1e1b4b", border:"1px solid #4f46e5", borderRadius:"10px", padding:"12px 14px" }}>
                  <div style={{ fontSize:"10px", color:"#818cf8", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>AI Suggestion</div>
                  <pre style={{ fontSize:"12px", color:"#c7d2fe", whiteSpace:"pre-wrap", margin:0, fontFamily:"system-ui" }}>{aiSuggestion}</pre>
                  <button onClick={() => setAssessment(prev => prev ? `${prev}\n\n${aiSuggestion}` : aiSuggestion)}
                    style={{ marginTop:"8px", background:"#4f46e5", color:"#fff", border:"none", borderRadius:"8px", padding:"8px 14px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                    ↓ Use this
                  </button>
                </div>
              )}
            </Field>

            <Field label="Plan / Treatment">{ta(plan, setPlan, "Treatment plan, medications to prescribe, referrals...", 3)}</Field>
            <Field label="Key Clinical Points">{ta(keyPoints, setKeyPoints, "Important flags, alerts, reminders for next visit...", 2)}</Field>
            <SaveBtn onClick={saveNotes} saving={notesSaving} saved={notesSaved} label="Save Clinical Notes" />
          </div>
        )}

        {/* ── PRESCRIPTIONS ── */}
        {tab === "rx" && (
          <div>
            {/* Existing */}
            {rxList.length > 0 && (
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>Current Prescriptions ({rxList.length})</div>
                {rxList.map(rx => (
                  <div key={rx.id} style={{ background:"#1e293b", borderRadius:"12px", padding:"12px 14px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700" }}>{rx.medication_name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", marginTop:"3px" }}>
                        {[rx.dose, rx.unit, rx.duration].filter(Boolean).join(" · ")}
                      </div>
                      {rx.instructions && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{rx.instructions}</div>}
                    </div>
                    <button onClick={() => deleteRx(rx.id)} style={{ background:"none", border:"none", color:"#ef4444", fontSize:"20px", cursor:"pointer", paddingLeft:"8px", flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add mode toggle */}
            <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>+ Add Medication</div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
              {(["catalog","manual"] as const).map(m => (
                <button key={m} onClick={() => setRxMode(m)}
                  style={{ flex:1, background: rxMode===m ? "#3b82f6" : "#1e293b", color: rxMode===m ? "#fff" : "#64748b",
                    border:`1.5px solid ${rxMode===m ? "#3b82f6" : "#334155"}`, borderRadius:"10px",
                    padding:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                  {m === "catalog" ? "📋 From List" : "✏️ Manual"}
                </button>
              ))}
            </div>

            <div style={{ background:"#1e293b", borderRadius:"14px", padding:"14px", display:"flex", flexDirection:"column", gap:"8px" }}>
              {rxMode === "catalog" ? (
                <select value={selMedId} onChange={e => handleCatalogSelect(e.target.value)} style={{ ...inputStyle, fontSize:"15px" }}>
                  <option value="">— Select medication —</option>
                  {(medCatalog as MedCat[]).map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.common_dose ? ` (${m.common_dose}${m.common_unit ?? ""})` : ""}</option>
                  ))}
                </select>
              ) : (
                <input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Medication name *"
                  style={{ ...inputStyle, fontSize:"15px" }} />
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                {inp(dose, setDose, "Dose (e.g. 500)")}
                {inp(unit, setUnit, "Unit (mg, ml...)")}
              </div>
              {inp(freq, setFreq, "Frequency (e.g. TDS, BD, OD)")}
              {inp(dur, setDur, "Duration (e.g. 5 days, 1 week)")}
              {inp(rxInstr, setRxInstr, "Instructions (e.g. after meals)")}
              <button onClick={addRx} disabled={addingRx || (rxMode==="catalog" ? !selMedId : !drugName.trim())}
                style={{ background: (rxMode==="catalog" ? !selMedId : !drugName.trim()) ? "#334155" : "#3b82f6",
                  color:"#fff", border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px",
                  fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
                {addingRx ? "Adding..." : "+ Add Medication"}
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div>
            {prevVisits.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 20px", color:"#475569" }}>
                <div style={{ fontSize:"40px", marginBottom:"8px" }}>📋</div>
                <div style={{ fontSize:"15px" }}>No previous visits</div>
              </div>
            ) : prevVisits.map(v => (
              <div key={(v as {id:string}).id} style={{ background:"#1e293b", borderRadius:"14px", padding:"14px", marginBottom:"10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                  <span style={{ fontSize:"14px", fontWeight:"700", textTransform:"capitalize", color:"#60a5fa" }}>
                    {((v as {visit_type?:string}).visit_type ?? "").replace(/_/g," ")}
                  </span>
                  <span style={{ fontSize:"12px", color:"#64748b" }}>{(v as {visit_date:string}).visit_date}</span>
                </div>
                {(v as {subjective?:string}).subjective && (
                  <div style={{ fontSize:"12px", color:"#94a3b8", marginBottom:"4px" }}>
                    <span style={{ color:"#3b82f6", fontWeight:"600" }}>S: </span>{(v as {subjective:string}).subjective.slice(0,120)}{(v as {subjective:string}).subjective.length > 120 ? "..." : ""}
                  </div>
                )}
                {(v as {assessment?:string}).assessment && (
                  <div style={{ fontSize:"12px", color:"#94a3b8", marginBottom:"4px" }}>
                    <span style={{ color:"#3b82f6", fontWeight:"600" }}>Dx: </span>{(v as {assessment:string}).assessment.slice(0,100)}
                  </div>
                )}
                {(v as {plan?:string}).plan && (
                  <div style={{ fontSize:"12px", color:"#64748b" }}>
                    <span style={{ color:"#475569", fontWeight:"600" }}>Plan: </span>{(v as {plan:string}).plan.slice(0,100)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:"480px", margin:"0 auto",
        background:"#1e293b", borderTop:"1px solid #334155", display:"flex",
        padding:"8px 0 max(8px, env(safe-area-inset-bottom))", zIndex:100 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, background:"none", border:"none", cursor:"pointer", padding:"4px 0",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
            <span style={{ fontSize:"18px" }}>{t.icon}</span>
            <span style={{ fontSize:"10px", fontFamily:"inherit", fontWeight: tab===t.id ? "700" : "400",
              color: tab===t.id ? "#3b82f6" : "#64748b" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
