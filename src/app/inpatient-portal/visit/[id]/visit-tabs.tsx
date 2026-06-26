"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "patient"|"symptoms"|"vitals"|"labs"|"notes"|"rx"|"diagnosis"|"history";

const TABS = [
  { id:"patient"  as Tab, icon:"👤", label:"Patient"   },
  { id:"symptoms" as Tab, icon:"🤒", label:"Symptoms"  },
  { id:"vitals"   as Tab, icon:"❤️",  label:"Vitals"    },
  { id:"labs"     as Tab, icon:"🔬", label:"Labs"      },
  { id:"notes"    as Tab, icon:"📝", label:"Notes"     },
  { id:"rx"       as Tab, icon:"💊", label:"Rx"        },
  { id:"diagnosis"as Tab, icon:"🤖", label:"Diagnosis" },
  { id:"history"  as Tab, icon:"📋", label:"History"   },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string,any>;

const s: Record<string,React.CSSProperties> = {
  input:   { width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px", color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"system-ui,-apple-system,sans-serif", boxSizing:"border-box", outline:"none" },
  label:   { fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", display:"block", marginBottom:"6px" } as React.CSSProperties,
  card:    { background:"#1e293b", borderRadius:"14px", padding:"14px 16px", marginBottom:"10px" },
  saveBtn: { width:"100%", border:"none", borderRadius:"12px", padding:"15px", fontSize:"15px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginTop:"8px" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom:"14px" }}><label style={s.label}>{label}</label>{children}</div>;
}

function SaveBtn({ onClick, saving, saved, label }: { onClick:()=>void; saving:boolean; saved:boolean; label:string }) {
  return (
    <button onClick={onClick} disabled={saving} style={{ ...s.saveBtn, background: saved ? "#166534" : "#3b82f6", color:"#fff" }}>
      {saved ? "✓ Saved!" : saving ? "Saving..." : label}
    </button>
  );
}

export function MobileVisitTabs({ visitId, visit, patient, inpatient, symptomsCatalog, checkedSymptomIds: initSymptomIds, labs: initLabs, prescriptions: initRx, medsCatalog, diagnoses: initDx, prevVisits, clinicId, doctorId, patientId }: {
  visitId: string; visit: R; patient: R|null; inpatient: R|null;
  symptomsCatalog: R[]; checkedSymptomIds: string[];
  labs: R[]; prescriptions: R[]; medsCatalog: R[]; diagnoses: R[];
  prevVisits: R[]; clinicId: string; doctorId: string; patientId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notes");

  // ── Symptoms ──
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(initSymptomIds));
  const [manualSymptom, setManualSymptom] = useState("");
  const [manualSymptoms, setManualSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState("");
  const [symptomsSaving, setSymptomsSaving] = useState(false);
  const [symptomsSaved,  setSymptomsSaved]  = useState(false);

  // ── Vitals ──
  const [bp,   setBp]   = useState((visit.blood_pressure as string) ?? "");
  const [hr,   setHr]   = useState(visit.heart_rate     ? String(visit.heart_rate)     : "");
  const [temp, setTemp] = useState(visit.temperature    ? String(visit.temperature)    : "");
  const [o2,   setO2]   = useState(visit.oxygen_saturation ? String(visit.oxygen_saturation) : "");
  const [rr,   setRr]   = useState(visit.resp_rate      ? String(visit.resp_rate)      : "");
  const [wt,   setWt]   = useState(visit.weight_kg      ? String(visit.weight_kg)      : "");
  const [ht,   setHt]   = useState(visit.height_cm      ? String(visit.height_cm)      : "");
  const [vSaving, setVSaving] = useState(false);
  const [vSaved,  setVSaved]  = useState(false);

  // ── Labs ──
  const [labs, setLabs]         = useState<R[]>(initLabs);
  const [labType, setLabType]   = useState<"lab"|"imaging"|"other">("lab");
  const [labName, setLabName]   = useState("");
  const [labDate, setLabDate]   = useState("");
  const [labFindings, setLabFindings] = useState("");
  const [addingLab, setAddingLab]     = useState(false);

  // ── Notes ──
  const [subjective, setSubjective] = useState((visit.subjective as string) ?? "");
  const [objective,  setObjective]  = useState((visit.objective  as string) ?? "");
  const [plan,       setPlan]       = useState((visit.plan       as string) ?? "");
  const [keyPoints,  setKeyPoints]  = useState((visit.key_clinical_points as string) ?? "");
  const [voiceNotes, setVoiceNotes] = useState((visit.voice_notes as string) ?? "");
  const [nSaving, setNSaving] = useState(false);
  const [nSaved,  setNSaved]  = useState(false);

  // ── Rx ──
  const [rxList, setRxList]     = useState<R[]>(initRx);
  const [rxMode, setRxMode]     = useState<"catalog"|"manual">("catalog");
  const [selMedId, setSelMedId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [dose, setDose]         = useState("");
  const [unit, setUnit]         = useState("");
  const [freq, setFreq]         = useState("");
  const [dur,  setDur]          = useState("");
  const [rxInstr, setRxInstr]   = useState("");
  const [addingRx, setAddingRx] = useState(false);
  const [rxSearch, setRxSearch] = useState("");

  // ── Diagnosis ──
  const [dxList, setDxList]         = useState<R[]>(initDx);
  const [dxDesc, setDxDesc]         = useState("");
  const [dxCode, setDxCode]         = useState("");
  const [dxPrimary, setDxPrimary]   = useState(false);
  const [addingDx, setAddingDx]     = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResult, setAiResult]     = useState("");

  const supabase = () => createClient();

  // ── Save Symptoms ──
  async function saveSymptoms() {
    setSymptomsSaving(true);
    const sb = supabase();
    await sb.from("visit_symptoms").delete().eq("visit_id", visitId);
    if (checkedIds.size > 0) {
      await sb.from("visit_symptoms").insert([...checkedIds].map(id => ({ visit_id: visitId, symptom_id: id })));
    }
    if (manualSymptoms.length > 0 || manualSymptom) {
      const all = [...manualSymptoms, manualSymptom].filter(Boolean).join("; ");
      await sb.from("visits").update({ subjective: all }).eq("id", visitId);
    }
    setSymptomsSaving(false); setSymptomsSaved(true);
    setTimeout(() => setSymptomsSaved(false), 2000);
    router.refresh();
  }

  // ── Save Vitals ──
  async function saveVitals() {
    setVSaving(true);
    await supabase().from("visits").update({
      blood_pressure:    bp    || null,
      heart_rate:        hr    ? parseInt(hr)    : null,
      temperature:       temp  ? parseFloat(temp) : null,
      oxygen_saturation: o2   ? parseInt(o2)    : null,
      resp_rate:         rr   ? parseInt(rr)    : null,
      weight_kg:         wt   ? parseFloat(wt)  : null,
      height_cm:         ht   ? parseFloat(ht)  : null,
    }).eq("id", visitId);
    setVSaving(false); setVSaved(true);
    setTimeout(() => setVSaved(false), 2000);
  }

  // ── Add Lab ──
  async function addLab() {
    if (!labName.trim()) return;
    setAddingLab(true);
    const { data: lab } = await supabase().from("visit_labs").insert({
      visit_id: visitId, clinic_id: clinicId,
      type: labType, name: labName.trim(),
      lab_date: labDate || null, findings: labFindings || null,
    }).select("id, type, name, lab_date, findings, link_url").single();
    setAddingLab(false);
    if (lab) { setLabs(prev => [...prev, lab]); setLabName(""); setLabFindings(""); setLabDate(""); }
  }

  async function deleteLab(id: string) {
    await supabase().from("visit_labs").delete().eq("id", id);
    setLabs(prev => prev.filter(l => l.id !== id));
  }

  // ── Save Notes ──
  async function saveNotes() {
    setNSaving(true);
    await supabase().from("visits").update({
      subjective:          subjective  || null,
      objective:           objective   || null,
      plan:                plan        || null,
      key_clinical_points: keyPoints   || null,
      voice_notes:         voiceNotes  || null,
    }).eq("id", visitId);
    setNSaving(false); setNSaved(true);
    setTimeout(() => setNSaved(false), 2000);
    router.refresh();
  }

  // ── Add Rx ──
  function handleMedCatalogSelect(id: string) {
    setSelMedId(id);
    const m = medsCatalog.find(x => x.id === id);
    if (m) { setDose(m.default_dose ?? ""); setUnit(m.default_unit ?? ""); }
  }

  async function addRx() {
    const name = rxMode === "catalog"
      ? (medsCatalog.find(m => m.id === selMedId)?.name ?? "")
      : drugName.trim();
    if (!name) return;
    setAddingRx(true);
    const instructions = [freq.trim(), rxInstr.trim()].filter(Boolean).join(". ");
    const { data: rx } = await supabase().from("prescriptions").insert({
      visit_id: visitId, patient_id: patientId, clinic_id: clinicId, doctor_id: doctorId,
      medication_id:   rxMode === "catalog" ? selMedId || null : null,
      medication_name: name,
      dose: dose || null, unit: unit || null,
      instructions: instructions || null,
      duration: dur || null,
    }).select("id, medication_id, medication_name, dose, unit, instructions, duration").single();
    setAddingRx(false);
    if (rx) {
      setRxList(prev => [...prev, rx]);
      setSelMedId(""); setDrugName(""); setDose(""); setUnit(""); setFreq(""); setDur(""); setRxInstr(""); setRxSearch("");
    }
  }

  async function deleteRx(id: string) {
    await supabase().from("prescriptions").delete().eq("id", id);
    setRxList(prev => prev.filter(r => r.id !== id));
  }

  // ── Diagnosis ──
  async function addDiagnosis() {
    if (!dxDesc.trim()) return;
    setAddingDx(true);
    const { data: dx } = await supabase().from("visit_diagnoses").insert({
      visit_id: visitId, clinic_id: clinicId,
      icd_code: dxCode || null, description: dxDesc.trim(), is_primary: dxPrimary,
    }).select("id, icd_code, description, is_primary").single();
    setAddingDx(false);
    if (dx) { setDxList(prev => [...prev, dx]); setDxDesc(""); setDxCode(""); setDxPrimary(false); }
  }

  async function deleteDx(id: string) {
    await supabase().from("visit_diagnoses").delete().eq("id", id);
    setDxList(prev => prev.filter(d => d.id !== id));
  }

  async function getAiDiagnosis() {
    const context = [subjective, objective, visit.assessment].filter(Boolean).join("\n");
    if (!context) return;
    setAiLoading(true); setAiResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:600,
          messages:[{ role:"user", content:
            `You are a clinical decision support tool for a neurologist. Based on the following information, provide a differential diagnosis list (3-5 options, most likely first) with brief clinical reasoning for each.\n\nChief complaint: ${subjective}\nObjective findings: ${objective}\nContext: ${visit.assessment ?? ""}\n\nRespond with a numbered list. Be concise and clinically focused.`
          }]
        })
      });
      const data = await res.json();
      setAiResult(data.content?.[0]?.text ?? "No response");
    } catch { setAiResult("Could not reach AI service."); }
    setAiLoading(false);
  }

  function useAiResult() {
    if (aiResult) { setDxDesc(aiResult.split("\n")[0]?.replace(/^1\.\s*/,"") ?? ""); }
  }

  // ── Helpers ──
  const ins = patient?.insurance_companies;
  const insName = ins ? (Array.isArray(ins) ? ins[0]?.name : ins?.name) : null;
  const hosp = inpatient?.hospitals;
  const hospName = hosp ? (Array.isArray(hosp) ? hosp[0]?.name : hosp?.name) : null;
  const filteredSymptoms = symptomsCatalog.filter(s =>
    !symptomSearch || s.name.toLowerCase().includes(symptomSearch.toLowerCase()) || (s.name_ar ?? "").includes(symptomSearch)
  );
  const filteredMeds = rxSearch
    ? medsCatalog.filter(m => m.name.toLowerCase().includes(rxSearch.toLowerCase()))
    : medsCatalog;

  const CAT_COLORS: R = { general:"#1e40af", neurological:"#6d28d9", cardiovascular:"#b91c1c", respiratory:"#065f46", gastrointestinal:"#92400e", other:"#374151" };

  return (
    <>
      <div style={{ paddingBottom:"72px" }}>

        {/* ── PATIENT INFO ── */}
        {tab === "patient" && (
          <PatientEditPanel
            patient={patient}
            patientId={patientId}
            inpatient={inpatient}
            insName={insName}
            hospName={hospName}
          />
        )}

        {/* ── SYMPTOMS ── */}
        {tab === "symptoms" && (
          <div style={{ padding:"16px" }}>
            <Field label="Search Symptoms">
              <input value={symptomSearch} onChange={e => setSymptomSearch(e.target.value)}
                placeholder="Search symptom name..." style={s.input} />
            </Field>

            {/* Grouped by category */}
            {[...new Set(filteredSymptoms.map(s => s.category || "general"))].map(cat => (
              <div key={cat} style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", marginBottom:"6px", paddingLeft:"2px" }}>{cat}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {filteredSymptoms.filter(sym => (sym.category || "general") === cat).map(sym => {
                    const checked = checkedIds.has(sym.id);
                    return (
                      <button key={sym.id}
                        onClick={() => setCheckedIds(prev => { const n = new Set(prev); if (n.has(sym.id)) n.delete(sym.id); else n.add(sym.id); return n; })}
                        style={{ background: checked ? "#3b82f6" : "#1e293b", color: checked ? "#fff" : "#94a3b8",
                          border: `1.5px solid ${checked ? "#3b82f6" : "#334155"}`, borderRadius:"20px",
                          padding:"6px 12px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                        {sym.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Manual entry */}
            <Field label="Add Manual Symptom">
              <div style={{ display:"flex", gap:"8px" }}>
                <input value={manualSymptom} onChange={e => setManualSymptom(e.target.value)}
                  placeholder="Type symptom..." style={{ ...s.input, flex:1 }}
                  onKeyDown={e => { if (e.key==="Enter" && manualSymptom.trim()) { setManualSymptoms(p=>[...p,manualSymptom.trim()]); setManualSymptom(""); } }} />
                <button onClick={() => { if (manualSymptom.trim()) { setManualSymptoms(p=>[...p,manualSymptom.trim()]); setManualSymptom(""); } }}
                  style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:"10px", padding:"12px 16px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>+</button>
              </div>
              {manualSymptoms.map((ms, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"6px", background:"#1e293b", borderRadius:"8px", padding:"8px 12px" }}>
                  <span style={{ fontSize:"13px" }}>{ms}</span>
                  <button onClick={() => setManualSymptoms(p => p.filter((_,j) => j!==i))}
                    style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:"16px" }}>✕</button>
                </div>
              ))}
            </Field>

            <div style={{ background:"#1e293b", borderRadius:"10px", padding:"10px 14px", marginBottom:"8px", fontSize:"12px", color:"#64748b" }}>
              {checkedIds.size} catalog + {manualSymptoms.length} manual selected
            </div>
            <SaveBtn onClick={saveSymptoms} saving={symptomsSaving} saved={symptomsSaved} label="Save Symptoms" />
          </div>
        )}

        {/* ── VITALS ── */}
        {tab === "vitals" && (
          <div style={{ padding:"16px" }}>
            <Field label="Blood Pressure">
              <input value={bp} onChange={e => setBp(e.target.value)} placeholder="e.g. 120/80 mmHg" style={s.input} />
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {[
                { label:"Heart Rate (bpm)",  val:hr,   set:setHr,   ph:"72"  },
                { label:"Temperature (°C)",  val:temp, set:setTemp, ph:"37.0"},
                { label:"O₂ Saturation (%)", val:o2,   set:setO2,   ph:"98"  },
                { label:"Resp Rate (/min)",  val:rr,   set:setRr,   ph:"16"  },
                { label:"Weight (kg)",       val:wt,   set:setWt,   ph:"70"  },
                { label:"Height (cm)",       val:ht,   set:setHt,   ph:"170" },
              ].map(f => (
                <div key={f.label}>
                  <label style={s.label}>{f.label}</label>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ ...s.input, textAlign:"center", fontSize:"22px", fontFamily:"monospace", fontWeight:"700" }} />
                </div>
              ))}
            </div>
            <SaveBtn onClick={saveVitals} saving={vSaving} saved={vSaved} label="Save Vitals" />
          </div>
        )}

        {/* ── LABS & IMAGING ── */}
        {tab === "labs" && (
          <div style={{ padding:"16px" }}>
            {labs.map(lab => (
              <div key={lab.id} style={{ ...s.card, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"4px" }}>
                    <span style={{ fontSize:"14px", fontWeight:"700" }}>{lab.name}</span>
                    <span style={{ background: lab.type==="imaging" ? "#1d4ed8" : "#166534", color:"#fff", fontSize:"10px", fontWeight:"700", borderRadius:"8px", padding:"2px 8px", textTransform:"capitalize" }}>{lab.type}</span>
                  </div>
                  {lab.lab_date && <div style={{ fontSize:"11px", color:"#64748b" }}>{lab.lab_date}</div>}
                  {lab.findings && <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"4px" }}>{lab.findings}</div>}
                </div>
                <button onClick={() => deleteLab(lab.id)} style={{ background:"none", border:"none", color:"#ef4444", fontSize:"18px", cursor:"pointer", flexShrink:0 }}>✕</button>
              </div>
            ))}

            <div style={s.card}>
              <label style={s.label}>+ Add Lab / Imaging</label>
              <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
                {(["lab","imaging","other"] as const).map(t => (
                  <button key={t} onClick={() => setLabType(t)}
                    style={{ flex:1, background: labType===t ? "#3b82f6" : "#0f172a", color: labType===t ? "#fff" : "#64748b",
                      border:`1.5px solid ${labType===t?"#3b82f6":"#334155"}`, borderRadius:"8px", padding:"8px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="Name (e.g. CBC, MRI Brain)" style={s.input} />
                <input type="date" value={labDate} onChange={e => setLabDate(e.target.value)} style={s.input} />
                <textarea value={labFindings} onChange={e => setLabFindings(e.target.value)} placeholder="Findings / results (optional)" rows={2}
                  style={{ ...s.input, resize:"none" }} />
                <button onClick={addLab} disabled={addingLab || !labName.trim()}
                  style={{ ...s.saveBtn, background: !labName.trim() ? "#334155" : "#3b82f6", color:"#fff", marginTop:0 }}>
                  {addingLab ? "Adding..." : "+ Add"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLINICAL NOTES ── */}
        {tab === "notes" && (
          <div style={{ padding:"16px" }}>
            <Field label="🎤 Voice Notes">
              <textarea value={voiceNotes} onChange={e => setVoiceNotes(e.target.value)}
                placeholder="Speak or type quick notes from bedside..." rows={5}
                style={{ ...s.input, resize:"none", fontSize:"15px", lineHeight:"1.6" }} />
            </Field>
            <Field label="📌 Key Clinical Points">
              <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
                placeholder="Important flags, alerts, reminders for next session..." rows={4}
                style={{ ...s.input, resize:"none", fontSize:"15px", lineHeight:"1.6" }} />
            </Field>
            <SaveBtn onClick={saveNotes} saving={nSaving} saved={nSaved} label="Save Notes" />
          </div>
        )}

        {/* ── PRESCRIPTIONS ── */}
        {tab === "rx" && (
          <div style={{ padding:"16px" }}>
            {rxList.length > 0 && (
              <div style={{ marginBottom:"16px" }}>
                <label style={s.label}>Current Prescriptions ({rxList.length})</label>
                {rxList.map(rx => (
                  <div key={rx.id} style={{ ...s.card, display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700" }}>{rx.medication_name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", marginTop:"3px" }}>
                        {[rx.dose, rx.unit, rx.duration].filter(Boolean).join(" · ")}
                      </div>
                      {rx.instructions && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{rx.instructions}</div>}
                    </div>
                    <button onClick={() => deleteRx(rx.id)} style={{ background:"none", border:"none", color:"#ef4444", fontSize:"20px", cursor:"pointer", flexShrink:0, marginLeft:"8px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
              {(["catalog","manual"] as const).map(m => (
                <button key={m} onClick={() => setRxMode(m)}
                  style={{ flex:1, background: rxMode===m?"#3b82f6":"#1e293b", color: rxMode===m?"#fff":"#64748b",
                    border:`1.5px solid ${rxMode===m?"#3b82f6":"#334155"}`, borderRadius:"10px", padding:"10px",
                    fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                  {m === "catalog" ? "📋 From List" : "✏️ Manual"}
                </button>
              ))}
            </div>

            <div style={s.card}>
              {rxMode === "catalog" ? (<>
                <input value={rxSearch} onChange={e => setRxSearch(e.target.value)} placeholder="Search medication..." style={{ ...s.input, marginBottom:"8px" }} />
                <select value={selMedId} onChange={e => handleMedCatalogSelect(e.target.value)} style={{ ...s.input, marginBottom:"8px" }}>
                  <option value="">— Select medication —</option>
                  {filteredMeds.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.default_dose ? ` (${m.default_dose}${m.default_unit ?? ""})` : ""}</option>
                  ))}
                </select>
              </>) : (
                <input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Medication name *" style={{ ...s.input, marginBottom:"8px" }} />
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"8px" }}>
                <input value={dose} onChange={e => setDose(e.target.value)} placeholder="Dose" style={s.input} />
                <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (mg, ml...)" style={s.input} />
              </div>
              <input value={freq} onChange={e => setFreq(e.target.value)} placeholder="Frequency (TDS, BD, OD...)" style={{ ...s.input, marginBottom:"8px" }} />
              <input value={dur}  onChange={e => setDur(e.target.value)}  placeholder="Duration (e.g. 7 days)" style={{ ...s.input, marginBottom:"8px" }} />
              <input value={rxInstr} onChange={e => setRxInstr(e.target.value)} placeholder="Instructions (after meals...)" style={{ ...s.input, marginBottom:"8px" }} />
              <button onClick={addRx} disabled={addingRx || (rxMode==="catalog" ? !selMedId : !drugName.trim())}
                style={{ ...s.saveBtn, background: (rxMode==="catalog" ? !selMedId : !drugName.trim()) ? "#334155" : "#3b82f6", color:"#fff", marginTop:0 }}>
                {addingRx ? "Adding..." : "+ Add Medication"}
              </button>
            </div>
          </div>
        )}

        {/* ── DIAGNOSIS ── */}
        {tab === "diagnosis" && (
          <div style={{ padding:"16px" }}>
            {dxList.length > 0 && (
              <div style={{ marginBottom:"16px" }}>
                <label style={s.label}>Diagnoses</label>
                {dxList.map(dx => (
                  <div key={dx.id} style={{ ...s.card, display:"flex", justifyContent:"space-between" }}>
                    <div>
                      {dx.is_primary && <span style={{ fontSize:"10px", background:"#1d4ed8", color:"#fff", borderRadius:"8px", padding:"2px 8px", fontWeight:"700", marginBottom:"4px", display:"inline-block" }}>PRIMARY</span>}
                      <div style={{ fontSize:"14px", fontWeight:"600", marginTop: dx.is_primary ? "4px" : 0 }}>{dx.description}</div>
                      {dx.icd_code && <div style={{ fontSize:"11px", color:"#64748b", fontFamily:"monospace", marginTop:"2px" }}>ICD: {dx.icd_code}</div>}
                    </div>
                    <button onClick={() => deleteDx(dx.id)} style={{ background:"none", border:"none", color:"#ef4444", fontSize:"18px", cursor:"pointer", flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* AI suggestion */}
            <div style={s.card}>
              <label style={s.label}>🤖 AI Diagnosis Suggestion</label>
              <div style={{ fontSize:"12px", color:"#64748b", marginBottom:"10px" }}>Based on symptoms & notes entered</div>
              <button onClick={getAiDiagnosis} disabled={aiLoading}
                style={{ width:"100%", background: aiLoading ? "#334155" : "#7c3aed", color:"#fff", border:"none", borderRadius:"10px", padding:"12px", fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginBottom: aiResult ? "10px" : 0 }}>
                {aiLoading ? "🤖 Analyzing..." : "🤖 Get AI Differential Diagnosis"}
              </button>
              {aiResult && (
                <div style={{ background:"#1e1b4b", border:"1px solid #4f46e5", borderRadius:"10px", padding:"12px" }}>
                  <pre style={{ fontSize:"12px", color:"#c7d2fe", whiteSpace:"pre-wrap", margin:0, fontFamily:"system-ui" }}>{aiResult}</pre>
                  <button onClick={useAiResult}
                    style={{ marginTop:"8px", background:"#4f46e5", color:"#fff", border:"none", borderRadius:"8px", padding:"8px 14px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                    ↓ Use first suggestion
                  </button>
                </div>
              )}
            </div>

            {/* Add diagnosis */}
            <div style={s.card}>
              <label style={s.label}>+ Add Diagnosis</label>
              <textarea value={dxDesc} onChange={e => setDxDesc(e.target.value)} placeholder="Diagnosis description..." rows={2}
                style={{ ...s.input, resize:"none", marginBottom:"8px" }} />
              <div style={{ display:"flex", gap:"8px", marginBottom:"8px" }}>
                <input value={dxCode} onChange={e => setDxCode(e.target.value)} placeholder="ICD-10 code (optional)" style={{ ...s.input, flex:1 }} />
                <button onClick={() => setDxPrimary(p => !p)}
                  style={{ background: dxPrimary ? "#1d4ed8" : "#0f172a", color: dxPrimary ? "#fff" : "#64748b", border:`1.5px solid ${dxPrimary?"#1d4ed8":"#334155"}`, borderRadius:"10px", padding:"10px 14px", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  {dxPrimary ? "✓ Primary" : "Primary?"}
                </button>
              </div>
              <button onClick={addDiagnosis} disabled={addingDx || !dxDesc.trim()}
                style={{ ...s.saveBtn, background: !dxDesc.trim() ? "#334155" : "#3b82f6", color:"#fff", marginTop:0 }}>
                {addingDx ? "Adding..." : "+ Add Diagnosis"}
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <HistoryPanel prevVisits={prevVisits} />
        )}
      </div>

      {/* Scrollable tab bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:"480px", margin:"0 auto",
        background:"#1e293b", borderTop:"1px solid #334155", zIndex:100,
        display:"flex", overflowX:"auto", padding:"8px 4px max(8px,env(safe-area-inset-bottom))" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:"0 0 auto", background:"none", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"2px",
              padding:"4px 10px", minWidth:"56px" }}>
            <span style={{ fontSize:"18px" }}>{t.icon}</span>
            <span style={{ fontSize:"9px", fontFamily:"inherit", fontWeight: tab===t.id?"700":"400",
              color: tab===t.id?"#3b82f6":"#64748b", whiteSpace:"nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ── Patient Edit Panel ────────────────────────────────────────────────────────
function PatientEditPanel({ patient, patientId, inpatient, insName, hospName }: {
  patient: R | null; patientId: string;
  inpatient: R | null; insName: string | null; hospName: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [fullName,    setFullName]    = useState((patient?.full_name    as string) ?? "");
  const [fullNameAr,  setFullNameAr]  = useState((patient?.full_name_ar as string) ?? "");
  const [phone,       setPhone]       = useState((patient?.phone        as string) ?? "");
  const [dob,         setDob]         = useState((patient?.dob          as string) ?? "");
  const [gender,      setGender]      = useState((patient?.gender       as string) ?? "");
  const [bloodType,   setBloodType]   = useState((patient?.blood_type   as string) ?? "");
  const [allergies,   setAllergies]   = useState((patient?.allergies    as string) ?? "");
  const [policyNum,   setPolicyNum]   = useState((patient?.insurance_policy_number as string) ?? "");

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function savePatient() {
    setSaving(true); setError(null);
    const sb = createClient();
    const { error: ue } = await sb.from("patients").update({
      full_name:               fullName.trim()    || null,
      full_name_ar:            fullNameAr.trim()  || null,
      phone:                   phone.trim()       || "—",
      dob:                     dob                || null,
      gender:                  gender             || null,
      blood_type:              bloodType          || null,
      allergies:               allergies.trim()   || null,
      insurance_policy_number: policyNum.trim()   || null,
    }).eq("id", patientId);
    setSaving(false);
    if (ue) { setError(ue.message); return; }
    setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  const inp = (label: string, val: string, set: (v:string)=>void, opts?: { placeholder?:string; dir?:string; type?:string }) => (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"1.5px", display:"block", marginBottom:"6px" }}>{label}</label>
      <input type={opts?.type ?? "text"} value={val} onChange={e => set(e.target.value)}
        placeholder={opts?.placeholder ?? ""}
        dir={opts?.dir}
        style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px",
          color:"#f1f5f9", padding:"13px 14px", fontSize:"15px", fontFamily:"system-ui,-apple-system,sans-serif",
          boxSizing:"border-box" as const, outline:"none" }} />
    </div>
  );

  return (
    <div style={{ padding:"16px" }}>
      {/* View mode */}
      {!editing ? (
        <>
          <div style={{ background:"#1e293b", borderRadius:"14px", padding:"16px", marginBottom:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
              <div>
                <div style={{ fontSize:"19px", fontWeight:"800" }}>{patient?.full_name}</div>
                {patient?.full_name_ar && <div style={{ fontSize:"14px", color:"#64748b", direction:"rtl", marginTop:"2px" }}>{patient.full_name_ar as string}</div>}
              </div>
              <button onClick={() => setEditing(true)}
                style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:"10px", padding:"8px 14px", fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                ✏️ Edit
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {[
                ["Phone",     patient?.phone],
                ["Gender",    patient?.gender],
                ["Blood Type",patient?.blood_type],
                ["DOB",       patient?.dob],
                ["Insurance", insName],
                ["Policy #",  patient?.insurance_policy_number],
                inpatient ? ["MRN",      (inpatient as R).hospital_patient_id] : null,
                inpatient ? ["Room",     (inpatient as R).location]            : null,
                inpatient ? ["Hospital", hospName]                             : null,
              ].filter(r => r && r[1]).map((row, i) => (
                <div key={i} style={{ background:"#0f172a", borderRadius:"10px", padding:"10px 12px" }}>
                  <div style={{ fontSize:"9px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"2px" }}>{row![0]}</div>
                  <div style={{ fontSize:"13px", fontWeight:"600" }}>{String(row![1])}</div>
                </div>
              ))}
            </div>
          </div>

          {patient?.allergies && (
            <div style={{ background:"#450a0a", border:"1.5px solid #dc2626", borderRadius:"12px", padding:"12px 14px" }}>
              <div style={{ fontSize:"10px", color:"#ef4444", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>⚠ Allergies</div>
              <div style={{ fontSize:"13px", color:"#fca5a5" }}>{patient.allergies as string}</div>
            </div>
          )}

          {saved && (
            <div style={{ marginTop:"10px", background:"#166534", borderRadius:"10px", padding:"10px 14px", fontSize:"13px", color:"#86efac", textAlign:"center" }}>
              ✓ Patient information saved
            </div>
          )}
        </>
      ) : (
        /* Edit mode */
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>Edit Patient Info</div>
            <button onClick={() => setEditing(false)}
              style={{ background:"none", border:"none", color:"#64748b", fontSize:"20px", cursor:"pointer" }}>✕</button>
          </div>

          {error && <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"10px", padding:"10px 14px", color:"#fca5a5", fontSize:"13px", marginBottom:"12px" }}>⚠ {error}</div>}

          {inp("Full Name (EN)",   fullName,   setFullName,   { placeholder:"Patient full name" })}
          {inp("Full Name (AR)",   fullNameAr, setFullNameAr, { placeholder:"الاسم الكامل", dir:"rtl" })}
          {inp("Phone Number",     phone,      setPhone,      { placeholder:"+962 7x xxx xxxx", type:"tel" })}
          {inp("Date of Birth",    dob,        setDob,        { type:"date" })}

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"1.5px", display:"block", marginBottom:"6px" }}>Gender</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {["male","female"].map(g => (
                <button key={g} onClick={() => setGender(g)}
                  style={{ background: gender===g ? "#3b82f6" : "#0f172a", color: gender===g ? "#fff" : "#64748b",
                    border:`1.5px solid ${gender===g?"#3b82f6":"#334155"}`, borderRadius:"10px", padding:"12px",
                    fontSize:"14px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" as const }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"1.5px", display:"block", marginBottom:"6px" }}>Blood Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"6px" }}>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bt => (
                <button key={bt} onClick={() => setBloodType(bt)}
                  style={{ background: bloodType===bt ? "#dc2626" : "#0f172a", color: bloodType===bt ? "#fff" : "#64748b",
                    border:`1.5px solid ${bloodType===bt?"#dc2626":"#334155"}`, borderRadius:"10px", padding:"10px 4px",
                    fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
                  {bt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:"#ef4444", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"1.5px", display:"block", marginBottom:"6px" }}>⚠ Allergies</label>
            <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2}
              placeholder="List any known allergies..."
              style={{ width:"100%", background:"#0f172a", border:"1.5px solid #7f1d1d", borderRadius:"10px", color:"#fca5a5", padding:"12px 14px", fontSize:"14px", fontFamily:"inherit", resize:"none", boxSizing:"border-box" as const }} />
          </div>

          {inp("Insurance Policy #", policyNum, setPolicyNum, { placeholder:"Policy number" })}

          <button onClick={savePatient} disabled={saving}
            style={{ width:"100%", background: saving ? "#334155" : "#3b82f6", color:"#fff", border:"none",
              borderRadius:"12px", padding:"16px", fontSize:"16px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginTop:"4px" }}>
            {saving ? "Saving..." : "✓ Save Patient Info"}
          </button>
        </div>
      )}
    </div>
  );
}


// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ prevVisits }: { prevVisits: R[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (prevVisits.length === 0) return (
    <div style={{ padding:"16px", textAlign:"center", paddingTop:"48px", color:"#475569" }}>
      <div style={{ fontSize:"40px", marginBottom:"8px" }}>📋</div>
      <div style={{ fontSize:"15px" }}>No previous visits</div>
    </div>
  );

  return (
    <div style={{ padding:"16px" }}>
      {prevVisits.map(v => {
        const isOpen = expanded === v.id;
        // Build the complete note — same as clinic portal
        const parts: string[] = [];
        if (v.final_note)   parts.push(v.final_note);
        else {
          if (v.subjective)  parts.push(`S: ${v.subjective}`);
          if (v.objective)   parts.push(`O: ${v.objective}`);
          if (v.assessment)  parts.push(`A: ${v.assessment}`);
          if (v.plan)        parts.push(`P: ${v.plan}`);
        }
        if (v.key_clinical_points) parts.push(`Key Points: ${v.key_clinical_points}`);
        if (v.voice_notes)         parts.push(`Notes: ${v.voice_notes}`);
        const fullNote = parts.join("\n\n") || "No notes recorded for this visit.";

        return (
          <div key={v.id} style={{ background:"#1e293b", borderRadius:"14px", marginBottom:"10px", overflow:"hidden" }}>
            {/* Header row — always visible */}
            <button
              onClick={() => setExpanded(isOpen ? null : v.id)}
              style={{ width:"100%", background:"none", border:"none", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", fontFamily:"inherit" }}>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:"14px", fontWeight:"700", color:"#60a5fa", textTransform:"capitalize" }}>
                  {(v.visit_type ?? "").replace(/_/g," ")}
                </div>
                <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{v.visit_date}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                {v.assessment && (
                  <div style={{ fontSize:"11px", color:"#94a3b8", maxWidth:"120px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {String(v.assessment).slice(0, 40)}
                  </div>
                )}
                <span style={{ color:"#475569", fontSize:"16px", flexShrink:0 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Expanded — full note */}
            {isOpen && (
              <div style={{ borderTop:"1px solid #334155", padding:"14px 16px" }}>
                <pre style={{ fontSize:"13px", color:"#e2e8f0", whiteSpace:"pre-wrap", margin:0, fontFamily:"system-ui,-apple-system,sans-serif", lineHeight:"1.7" }}>
                  {fullNote}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
