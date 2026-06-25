"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordNurseProcedure } from "@/lib/actions/nurse-procedures";

interface Procedure { id: string; name: string; name_ar: string | null; category: string; notes: string | null; clinic_id: string; }

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  general:    { bg: "bg-neutral-50",  text: "text-neutral-700",  border: "border-neutral-200" },
  monitoring: { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200"    },
  lab:        { bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200"  },
  setup:      { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200"   },
  medication: { bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200"     },
  other:      { bg: "bg-neutral-50",  text: "text-neutral-500",  border: "border-neutral-200" },
};

const CAT_LABELS: Record<string, string> = {
  general:"General", monitoring:"Monitoring", lab:"Lab", setup:"Setup", medication:"Medication", other:"Other"
};

type Step = "search" | "confirm" | "procedure" | "done";

export function NursePage({ procedures }: { procedures: Procedure[] }) {
  const [step, setStep]     = useState<Step>("search");
  const [mrn, setMrn]       = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patient, setPatient] = useState<any>(null);
  const [inpatientId, setInpatientId] = useState("");
  const [clinicId, setClinicId]       = useState("");

  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(new Date().toTimeString().slice(0, 5));
  const [procNotes, setProcNotes] = useState("");
  const [nurseName, setNurseName] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const filteredProcs = procedures.filter(p => !clinicId || p.clinic_id === clinicId);
  const categories    = [...new Set(filteredProcs.map(p => p.category))];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!mrn.trim()) return;
    setSearching(true); setSearchError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("inpatients")
      .select("id, clinic_id, location, status, patients(full_name, full_name_ar, dob, blood_type), hospitals(name)")
      .eq("hospital_patient_id", mrn.trim())
      .eq("status", "active")
      .single();

    setSearching(false);

    if (error || !data) {
      setSearchError("No active inpatient found with this hospital ID. Please check and try again.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pt   = Array.isArray(data.patients) ? data.patients[0] : data.patients as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hosp = Array.isArray(data.hospitals) ? data.hospitals[0] : data.hospitals as any;
    setPatient({ ...pt, hospitalName: hosp?.name, location: data.location });
    setInpatientId(data.id);
    setClinicId(data.clinic_id);
    setStep("confirm");
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProc) return;
    setSaving(true); setSaveError(null);

    const startedAt = new Date(`${startDate}T${startTime}`).toISOString();
    const result = await recordNurseProcedure({
      inpatientId,
      clinicId,
      procedureId:   selectedProc.id,
      procedureName: selectedProc.name,
      category:      selectedProc.category,
      startedAt,
      notes:         procNotes || undefined,
      recordedByName: nurseName || undefined,
    });

    setSaving(false);
    if (!result.success) { setSaveError(result.error ?? "Failed to record."); return; }
    setLastSaved(selectedProc.name);
    setStep("done");
  }

  function reset() {
    setStep("search"); setMrn(""); setPatient(null); setSelectedProc(null);
    setProcNotes(""); setSaveError(null); setLastSaved(null);
    setInpatientId(""); setClinicId("");
  }

  function recordAnother() {
    setSelectedProc(null); setProcNotes(""); setSaveError(null);
    setStartTime(new Date().toTimeString().slice(0, 5));
    setStep("procedure");
  }

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"16px 20px" }}>
        <div style={{ fontSize:"18px", fontWeight:"700" }}>🏥 Nurse Portal</div>
        <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"2px" }}>Inpatient Procedure Recording</div>
      </div>

      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"20px 16px" }}>

        {/* ── STEP 1: Search ── */}
        {step === "search" && (
          <div>
            <div style={{ background:"#fff", borderRadius:"16px", padding:"24px", boxShadow:"0 1px 8px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize:"16px", fontWeight:"700", color:"#1a1a2e", marginBottom:"6px" }}>Find Patient</div>
              <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Enter the hospital patient ID (MRN)</div>
              <form onSubmit={handleSearch}>
                <input
                  value={mrn}
                  onChange={e => setMrn(e.target.value)}
                  placeholder="Hospital Patient ID / MRN"
                  autoFocus
                  style={{ width:"100%", fontSize:"20px", fontFamily:"monospace", fontWeight:"600", border:"2px solid #e2e8f0", borderRadius:"12px", padding:"16px", marginBottom:"16px", boxSizing:"border-box", outline:"none", textAlign:"center", letterSpacing:"2px" }}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                {searchError && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", color:"#dc2626", fontSize:"14px" }}>
                    ⚠ {searchError}
                  </div>
                )}
                <button type="submit" disabled={searching || !mrn.trim()}
                  style={{ width:"100%", background: searching ? "#94a3b8" : "#1a1a2e", color:"#fff", border:"none", borderRadius:"12px", padding:"16px", fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
                  {searching ? "Searching..." : "Find Patient →"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 2: Confirm patient ── */}
        {step === "confirm" && patient && (
          <div>
            <div style={{ background:"#fff", borderRadius:"16px", padding:"24px", boxShadow:"0 1px 8px rgba(0,0,0,0.08)", marginBottom:"16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                <div style={{ width:"48px", height:"48px", background:"#e0f2fe", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>
                  👤
                </div>
                <div>
                  <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1a2e" }}>{patient.full_name}</div>
                  {patient.full_name_ar && <div style={{ fontSize:"14px", color:"#64748b", direction:"rtl" }}>{patient.full_name_ar}</div>}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                {[
                  ["MRN", mrn],
                  age !== null && ["Age", `${age} yrs`],
                  ["Location", patient.location],
                  patient.blood_type && ["Blood type", patient.blood_type],
                  ["Hospital", patient.hospitalName],
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} style={{ background:"#f8fafc", borderRadius:"10px", padding:"10px 12px" }}>
                    <div style={{ fontSize:"10px", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px" }}>{row[0]}</div>
                    <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a1a2e", marginTop:"2px" }}>{row[1]}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <button onClick={reset}
                style={{ background:"#fff", border:"2px solid #e2e8f0", borderRadius:"12px", padding:"14px", fontSize:"15px", fontWeight:"600", cursor:"pointer", color:"#64748b" }}>
                ← Back
              </button>
              <button onClick={() => setStep("procedure")}
                style={{ background:"#1a1a2e", color:"#fff", border:"none", borderRadius:"12px", padding:"14px", fontSize:"15px", fontWeight:"700", cursor:"pointer" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Select & record procedure ── */}
        {step === "procedure" && (
          <div>
            {/* Patient mini card */}
            <div style={{ background:"#1a1a2e", color:"#fff", borderRadius:"12px", padding:"12px 16px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"15px", fontWeight:"700" }}>{patient?.full_name}</div>
                <div style={{ fontSize:"12px", color:"#94a3b8" }}>{patient?.location} · MRN: {mrn}</div>
              </div>
              <button onClick={reset} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", color:"#fff", padding:"6px 10px", fontSize:"12px", cursor:"pointer" }}>Change</button>
            </div>

            {/* Nurse name */}
            <div style={{ background:"#fff", borderRadius:"12px", padding:"16px", marginBottom:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"8px" }}>Your Name (optional)</label>
              <input value={nurseName} onChange={e => setNurseName(e.target.value)}
                placeholder="Nurse name"
                style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:"10px", padding:"12px", fontSize:"15px", boxSizing:"border-box" }} />
            </div>

            {/* Procedure selection */}
            <div style={{ background:"#fff", borderRadius:"12px", padding:"16px", marginBottom:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a2e", marginBottom:"14px" }}>Select Procedure</div>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom:"16px" }}>
                  <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", marginBottom:"8px" }}>
                    {CAT_LABELS[cat] ?? cat}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {filteredProcs.filter(p => p.category === cat).map(proc => {
                      const c = CAT_COLORS[cat] ?? CAT_COLORS.other;
                      const isSelected = selectedProc?.id === proc.id;
                      return (
                        <button key={proc.id} onClick={() => setSelectedProc(proc)}
                          style={{
                            background: isSelected ? "#1a1a2e" : "#f8fafc",
                            color: isSelected ? "#fff" : "#1a1a2e",
                            border: isSelected ? "2px solid #1a1a2e" : "2px solid #e2e8f0",
                            borderRadius:"12px", padding:"14px 16px",
                            textAlign:"left", cursor:"pointer", width:"100%",
                            transition:"all 0.15s",
                          }}>
                          <div style={{ fontSize:"15px", fontWeight:"600" }}>{proc.name}</div>
                          {proc.name_ar && <div style={{ fontSize:"13px", opacity:0.7, direction:"rtl", marginTop:"2px" }}>{proc.name_ar}</div>}
                          {proc.notes && <div style={{ fontSize:"12px", opacity:0.6, marginTop:"4px" }}>{proc.notes}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredProcs.length === 0 && (
                <div style={{ textAlign:"center", color:"#94a3b8", padding:"24px", fontSize:"14px" }}>
                  No procedures available. Ask admin to add procedures.
                </div>
              )}
            </div>

            {/* Time + notes */}
            {selectedProc && (
              <form onSubmit={handleRecord}>
                <div style={{ background:"#fff", borderRadius:"12px", padding:"16px", marginBottom:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:"#1a1a2e", marginBottom:"12px" }}>
                    Record: {selectedProc.name}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                    <div>
                      <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px" }}>Date *</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                        style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:"10px", padding:"12px", fontSize:"15px", boxSizing:"border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px" }}>Start Time *</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
                        style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:"10px", padding:"12px", fontSize:"15px", boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px" }}>Notes</label>
                    <textarea value={procNotes} onChange={e => setProcNotes(e.target.value)} rows={2}
                      placeholder="Optional notes..."
                      style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:"10px", padding:"12px", fontSize:"14px", resize:"none", boxSizing:"border-box" }} />
                  </div>
                </div>

                {saveError && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px", marginBottom:"12px", color:"#dc2626", fontSize:"14px" }}>
                    ⚠ {saveError}
                  </div>
                )}

                <button type="submit" disabled={saving}
                  style={{ width:"100%", background: saving ? "#94a3b8" : "#16a34a", color:"#fff", border:"none", borderRadius:"12px", padding:"18px", fontSize:"17px", fontWeight:"700", cursor:"pointer" }}>
                  {saving ? "Saving..." : "✓ Record Procedure"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── STEP 4: Success ── */}
        {step === "done" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ background:"#fff", borderRadius:"16px", padding:"32px 24px", boxShadow:"0 1px 8px rgba(0,0,0,0.08)", marginBottom:"16px" }}>
              <div style={{ fontSize:"56px", marginBottom:"16px" }}>✅</div>
              <div style={{ fontSize:"20px", fontWeight:"700", color:"#1a1a2e", marginBottom:"8px" }}>Recorded!</div>
              <div style={{ fontSize:"15px", color:"#64748b", marginBottom:"4px" }}>{lastSaved}</div>
              <div style={{ fontSize:"13px", color:"#94a3b8" }}>for {patient?.full_name}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <button onClick={recordAnother}
                style={{ background:"#1a1a2e", color:"#fff", border:"none", borderRadius:"12px", padding:"16px", fontSize:"15px", fontWeight:"700", cursor:"pointer" }}>
                + Another
              </button>
              <button onClick={reset}
                style={{ background:"#fff", border:"2px solid #e2e8f0", borderRadius:"12px", padding:"16px", fontSize:"15px", fontWeight:"600", cursor:"pointer", color:"#64748b" }}>
                New Patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
