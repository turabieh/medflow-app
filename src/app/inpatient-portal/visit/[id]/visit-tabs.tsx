"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "info" | "soap" | "vitals" | "rx" | "history";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id:"info",    label:"Patient",  icon:"👤" },
  { id:"soap",    label:"Notes",    icon:"📝" },
  { id:"vitals",  label:"Vitals",   icon:"❤️" },
  { id:"rx",      label:"Rx",       icon:"💊" },
  { id:"history", label:"History",  icon:"📋" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MobileVisitTabs({ visit, patient, inpatient, prevVisits, medications, clinicId, doctorId }: {
  visit: Record<string,unknown>;
  patient: Record<string,unknown> | null;
  inpatient: Record<string,unknown> | null;
  prevVisits: Record<string,unknown>[];
  medications: Record<string,unknown>[];
  clinicId: string;
  doctorId: string;
}) {
  const router = useRouter();
  const [tab, setTab]     = useState<Tab>("soap");
  const [isPending, startTransition] = useTransition();

  // SOAP
  const [subjective,  setSubjective]  = useState((visit.subjective  as string) ?? "");
  const [objective,   setObjective]   = useState((visit.objective   as string) ?? "");
  const [assessment,  setAssessment]  = useState((visit.assessment  as string) ?? "");
  const [plan,        setPlan]        = useState((visit.plan        as string) ?? "");
  const [finalNote,   setFinalNote]   = useState((visit.final_note  as string) ?? "");
  const [soapSaved,   setSoapSaved]   = useState(false);

  // Vitals
  const [bp,   setBp]   = useState((visit.blood_pressure    as string) ?? "");
  const [hr,   setHr]   = useState(String(visit.heart_rate  ?? ""));
  const [temp, setTemp] = useState(String(visit.temperature ?? ""));
  const [o2,   setO2]   = useState(String(visit.oxygen_saturation ?? ""));
  const [wt,   setWt]   = useState(String(visit.weight_kg   ?? ""));
  const [vitalsSaved, setVitalsSaved] = useState(false);

  // Rx
  const [rxList, setRxList]     = useState(medications);
  const [drug, setDrug]         = useState("");
  const [dose, setDose]         = useState("");
  const [freq, setFreq]         = useState("");
  const [dur, setDur]           = useState("");
  const [rxInstr, setRxInstr]   = useState("");
  const [addingRx, setAddingRx] = useState(false);

  async function saveSoap() {
    const supabase = createClient();
    await supabase.from("visits").update({
      subjective, objective, assessment, plan,
      final_note: finalNote || null,
      updated_at: new Date().toISOString(),
    }).eq("id", visit.id as string);
    setSoapSaved(true);
    setTimeout(() => setSoapSaved(false), 2000);
    startTransition(() => router.refresh());
  }

  async function saveVitals() {
    const supabase = createClient();
    await supabase.from("visits").update({
      blood_pressure:    bp || null,
      heart_rate:        hr ? parseInt(hr) : null,
      temperature:       temp ? parseFloat(temp) : null,
      oxygen_saturation: o2 ? parseInt(o2) : null,
      weight_kg:         wt ? parseFloat(wt) : null,
      updated_at:        new Date().toISOString(),
    }).eq("id", visit.id as string);
    setVitalsSaved(true);
    setTimeout(() => setVitalsSaved(false), 2000);
  }

  async function addRx() {
    if (!drug.trim()) return;
    setAddingRx(true);
    const supabase = createClient();
    const { data: rx } = await supabase.from("prescriptions").insert({
      visit_id:     visit.id,
      patient_id:   (patient as {id:string}|null)?.id,
      clinic_id:    clinicId,
      doctor_id:    doctorId,
      drug_name:    drug.trim(),
      dose:         dose.trim() || null,
      frequency:    freq.trim() || null,
      duration:     dur.trim() || null,
      instructions: rxInstr.trim() || null,
    }).select("id, drug_name, dose, frequency, duration, instructions").single();
    setAddingRx(false);
    if (rx) { setRxList(prev => [...prev, rx]); setDrug(""); setDose(""); setFreq(""); setDur(""); setRxInstr(""); }
  }

  async function deleteRx(id: string) {
    const supabase = createClient();
    await supabase.from("prescriptions").delete().eq("id", id);
    setRxList(prev => prev.filter(r => (r as {id:string}).id !== id));
  }

  const inp = (value: string, onChange: (v:string)=>void, placeholder: string, style?: React.CSSProperties) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px",
        color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"inherit",
        boxSizing:"border-box" as const, ...style }} />
  );

  const ta = (value: string, onChange: (v:string)=>void, placeholder: string, rows=4) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px",
        color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"inherit",
        resize:"none", boxSizing:"border-box" as const }} />
  );

  const saveBtn = (onClick: ()=>void, label: string, saved=false, pending=false) => (
    <button onClick={onClick} disabled={pending}
      style={{ width:"100%", background: saved ? "#166534" : "#3b82f6", color:"#fff",
        border:"none", borderRadius:"12px", padding:"14px", fontSize:"15px",
        fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginTop:"8px" }}>
      {saved ? "✓ Saved!" : pending ? "Saving..." : label}
    </button>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom:"16px" }}>
      <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>{title}</div>
      {children}
    </div>
  );

  const ins = (patient as {insurance_companies?: {name:string}|{name:string}[]}|null)?.insurance_companies;
  const insName = ins ? (Array.isArray(ins) ? ins[0]?.name : (ins as {name:string}).name) : null;

  return (
    <div style={{ paddingBottom:"70px" }}>
      {/* Tab content */}
      <div style={{ padding:"16px" }}>

        {/* ── PATIENT INFO ── */}
        {tab === "info" && (
          <div>
            {section("Patient Details", (
              <div style={{ background:"#1e293b", borderRadius:"14px", padding:"16px" }}>
                <div style={{ fontSize:"18px", fontWeight:"800", marginBottom:"4px" }}>{(patient as {full_name?:string}|null)?.full_name}</div>
                {(patient as {full_name_ar?:string}|null)?.full_name_ar && (
                  <div style={{ fontSize:"14px", color:"#64748b", direction:"rtl", marginBottom:"12px" }}>{(patient as {full_name_ar:string}).full_name_ar}</div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {[
                    ["Phone", (patient as {phone?:string}|null)?.phone],
                    ["Gender", (patient as {gender?:string}|null)?.gender],
                    ["Blood Type", (patient as {blood_type?:string}|null)?.blood_type],
                    ["Insurance", insName],
                    inpatient ? ["MRN", (inpatient as {hospital_patient_id?:string}).hospital_patient_id] : null,
                    inpatient ? ["Room", (inpatient as {location?:string}).location] : null,
                  ].filter(Boolean).map((row, i) => row && row[1] && (
                    <div key={i} style={{ background:"#0f172a", borderRadius:"10px", padding:"10px 12px" }}>
                      <div style={{ fontSize:"9px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px" }}>{row[0]}</div>
                      <div style={{ fontSize:"13px", fontWeight:"600", marginTop:"2px" }}>{row[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(patient as {allergies?:string}|null)?.allergies && section("⚠ Allergies", (
              <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"12px", padding:"12px 14px", color:"#fca5a5", fontSize:"13px" }}>
                {(patient as {allergies:string}).allergies}
              </div>
            ))}

          </div>
        )}

        {/* ── SOAP NOTES ── */}
        {tab === "soap" && (
          <div>
            {section("Subjective — Chief Complaint", ta(subjective, setSubjective, "Patient's symptoms, complaints, history...", 3))}
            {section("Objective — Findings", ta(objective, setObjective, "Examination findings, signs...", 3))}
            {section("Assessment — Diagnosis", ta(assessment, setAssessment, "Diagnosis, differential...", 3))}
            {section("Plan — Treatment", ta(plan, setPlan, "Treatment plan, referrals, follow-up...", 3))}
            {section("Final Note (optional)", ta(finalNote, setFinalNote, "Overall clinical note for records...", 3))}
            {saveBtn(saveSoap, "Save Clinical Notes", soapSaved, isPending)}
          </div>
        )}

        {/* ── VITALS ── */}
        {tab === "vitals" && (
          <div>
            {section("Blood Pressure", inp(bp, setBp, "e.g. 120/80"))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"16px" }}>
              <div>
                <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>Heart Rate (bpm)</div>
                {inp(hr, setHr, "72", { textAlign:"center", fontSize:"20px", fontFamily:"monospace" })}
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>Temp (°C)</div>
                {inp(temp, setTemp, "37.0", { textAlign:"center", fontSize:"20px", fontFamily:"monospace" })}
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>O₂ Sat (%)</div>
                {inp(o2, setO2, "98", { textAlign:"center", fontSize:"20px", fontFamily:"monospace" })}
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"8px" }}>Weight (kg)</div>
                {inp(wt, setWt, "70", { textAlign:"center", fontSize:"20px", fontFamily:"monospace" })}
              </div>
            </div>
            {saveBtn(saveVitals, "Save Vitals", vitalsSaved)}
          </div>
        )}

        {/* ── PRESCRIPTIONS ── */}
        {tab === "rx" && (
          <div>
            {/* Existing Rx */}
            {rxList.length > 0 && section("Current Prescriptions", (
              <div>
                {rxList.map(rx => (
                  <div key={(rx as {id:string}).id} style={{ background:"#1e293b", borderRadius:"12px", padding:"12px 14px", marginBottom:"8px", display:"flex", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:"15px", fontWeight:"700" }}>{(rx as {drug_name:string}).drug_name}</div>
                      <div style={{ fontSize:"12px", color:"#64748b", marginTop:"3px" }}>
                        {[(rx as {dose?:string}).dose, (rx as {frequency?:string}).frequency, (rx as {duration?:string}).duration].filter(Boolean).join(" · ")}
                      </div>
                      {(rx as {instructions?:string}).instructions && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{(rx as {instructions:string}).instructions}</div>}
                    </div>
                    <button onClick={() => deleteRx((rx as {id:string}).id)}
                      style={{ background:"none", border:"none", color:"#ef4444", fontSize:"18px", cursor:"pointer", flexShrink:0, marginLeft:"8px" }}>✕</button>
                  </div>
                ))}
              </div>
            ))}

            {/* Add Rx */}
            {section("+ Add Medication", (
              <div style={{ background:"#1e293b", borderRadius:"14px", padding:"14px", display:"flex", flexDirection:"column", gap:"8px" }}>
                {inp(drug, setDrug, "Drug name *")}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {inp(dose, setDose, "Dose (e.g. 500mg)")}
                  {inp(freq, setFreq, "Frequency (e.g. TDS)")}
                </div>
                {inp(dur, setDur, "Duration (e.g. 5 days)")}
                {inp(rxInstr, setRxInstr, "Instructions (e.g. after meals)")}
                <button onClick={addRx} disabled={addingRx || !drug.trim()}
                  style={{ background: !drug.trim() ? "#334155" : "#3b82f6", color:"#fff", border:"none",
                    borderRadius:"10px", padding:"12px", fontSize:"14px", fontWeight:"700",
                    cursor:"pointer", fontFamily:"inherit" }}>
                  {addingRx ? "Adding..." : "+ Add"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div>
            {prevVisits.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px", color:"#475569" }}>
                <div style={{ fontSize:"32px", marginBottom:"8px" }}>📋</div>
                <div>No previous visits</div>
              </div>
            ) : prevVisits.map(v => (
              <div key={(v as {id:string}).id} style={{ background:"#1e293b", borderRadius:"14px", padding:"14px", marginBottom:"10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                  <div style={{ fontSize:"14px", fontWeight:"700", textTransform:"capitalize" }}>
                    {((v as {visit_type?:string}).visit_type ?? "").replace("_"," ")}
                  </div>
                  <div style={{ fontSize:"12px", color:"#64748b" }}>{(v as {visit_date:string}).visit_date}</div>
                </div>
                {(v as {assessment?:string}).assessment && (
                  <div style={{ fontSize:"12px", color:"#94a3b8", marginBottom:"4px" }}>
                    <span style={{ color:"#3b82f6", fontWeight:"600" }}>Dx: </span>{(v as {assessment:string}).assessment}
                  </div>
                )}
                {(v as {final_note?:string}).final_note && (
                  <div style={{ fontSize:"11px", color:"#475569", borderTop:"1px solid #334155", paddingTop:"6px", marginTop:"6px" }}>
                    {(v as {final_note:string}).final_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1e293b",
        borderTop:"1px solid #334155", display:"flex", justifyContent:"space-around",
        padding:"8px 0 max(8px, env(safe-area-inset-bottom))", zIndex:100,
        maxWidth:"480px", margin:"0 auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:"none", border:"none", cursor:"pointer", flex:1,
              display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", padding:"4px 0" }}>
            <span style={{ fontSize:"18px" }}>{t.icon}</span>
            <span style={{ fontSize:"10px", color: tab === t.id ? "#3b82f6" : "#64748b",
              fontWeight: tab === t.id ? "700" : "400", fontFamily:"inherit" }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
