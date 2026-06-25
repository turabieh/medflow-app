"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Procedure { id: string; name: string; name_ar: string | null; category: string; notes: string | null; clinic_id: string; }

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  general:    { bg: "#f1f5f9", text: "#475569" },
  monitoring: { bg: "#eff6ff", text: "#1d4ed8" },
  lab:        { bg: "#f5f3ff", text: "#6d28d9" },
  setup:      { bg: "#fffbeb", text: "#b45309" },
  medication: { bg: "#fef2f2", text: "#dc2626" },
  other:      { bg: "#f8fafc", text: "#94a3b8" },
};
const CAT_LABELS: Record<string, string> = {
  general:"General", monitoring:"Monitoring", lab:"Lab",
  setup:"Setup", medication:"Medication", other:"Other"
};

type Step = "enter" | "procedure" | "done";

export function NursePage() {
  const [procedures, setProcedures]   = useState<Procedure[]>([]);
  const [loadingProcs, setLoadingProcs] = useState(true);
  const [step, setStep]               = useState<Step>("enter");

  // Patient info — no DB lookup, purely what nurse types
  const [mrn, setMrn]                 = useState("");
  const [patientName, setPatientName] = useState("");
  const [location, setLocation]       = useState("");
  const [nurseName, setNurseName]     = useState("");

  // Procedure
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [startDate, setStartDate]       = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime]       = useState(new Date().toTimeString().slice(0, 5));
  const [procNotes, setProcNotes]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [lastSaved, setLastSaved]       = useState<string | null>(null);

  // Load procedures using anon key — public read policy on nurse_procedures_catalog
  useEffect(() => {
    const supabase = createClient();
    supabase.from("nurse_procedures_catalog")
      .select("id, name, name_ar, category, notes, clinic_id")
      .eq("is_active", true)
      .order("category").order("name")
      .then(({ data }) => { setProcedures(data ?? []); setLoadingProcs(false); });
  }, []);

  const categories = [...new Set(procedures.map(p => p.category))];

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProc) return;
    setSaving(true); setSaveError(null);

    const supabase   = createClient();
    const startedAt  = new Date(`${startDate}T${startTime}`).toISOString();

    // Store everything in the record — no inpatient_id needed
    // The notes field carries the MRN and patient name so doctor can link later
    const { error } = await supabase.from("nurse_procedure_records").insert({
      clinic_id:        selectedProc.clinic_id,
      inpatient_id:     null,   // doctor will link when they admit the patient
      procedure_id:     selectedProc.id,
      procedure_name:   selectedProc.name,
      category:         selectedProc.category,
      started_at:       startedAt,
      recorded_by_name: nurseName || null,
      notes: [
        `MRN: ${mrn.trim()}`,
        patientName.trim() ? `Patient: ${patientName.trim()}` : "",
        location.trim()    ? `Location: ${location.trim()}`   : "",
        procNotes.trim()   ? `Notes: ${procNotes.trim()}`     : "",
      ].filter(Boolean).join(" | "),
    });

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setLastSaved(selectedProc.name);
    setStep("done");
  }

  function recordAnother() {
    setSelectedProc(null); setProcNotes(""); setSaveError(null);
    setStartTime(new Date().toTimeString().slice(0, 5));
    setStep("procedure");
  }

  function newPatient() {
    setStep("enter"); setMrn(""); setPatientName(""); setLocation("");
    setSelectedProc(null); setProcNotes(""); setSaveError(null); setLastSaved(null);
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", border:"2px solid #e2e8f0", borderRadius:"12px",
    padding:"14px 16px", fontSize:"15px", boxSizing:"border-box",
    fontFamily:"inherit", outline:"none", background:"#fff",
  };
  const labelStyle: React.CSSProperties = {
    fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600",
  };
  const card: React.CSSProperties = {
    background:"#fff", borderRadius:"16px", padding:"20px",
    boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:"16px",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", color:"#fff", padding:"18px 20px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"18px", fontWeight:"800" }}>🏥 Nurse Portal</div>
            <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"1px" }}>Procedure Recording</div>
          </div>
          {step !== "enter" && (
            <button onClick={newPatient} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", borderRadius:"8px", padding:"8px 14px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
              ← New
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div style={{ display:"flex", gap:"4px", marginTop:"12px" }}>
          {(["enter","procedure","done"] as Step[]).map((s, i) => (
            <div key={s} style={{ flex:1, height:"3px", borderRadius:"2px",
              background: (["enter","procedure","done"].indexOf(step)) >= i ? "#38bdf8" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"20px 16px 40px" }}>

        {/* ── STEP 1: Patient info ── */}
        {step === "enter" && (
          <form onSubmit={e => { e.preventDefault(); setStep("procedure"); }}>
            <div style={card}>
              <div style={{ fontSize:"17px", fontWeight:"700", color:"#1e293b", marginBottom:"4px" }}>Patient Information</div>
              <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Enter the hospital patient ID and details</div>

              <div style={{ marginBottom:"14px" }}>
                <label style={labelStyle}>Hospital Patient ID / MRN *</label>
                <input value={mrn} onChange={e => setMrn(e.target.value.toUpperCase())}
                  placeholder="e.g. AH5253" required autoFocus autoCapitalize="characters"
                  style={{ ...inputStyle, fontSize:"22px", fontFamily:"monospace", fontWeight:"700", textAlign:"center", letterSpacing:"3px" }} />
              </div>

              <div style={{ marginBottom:"14px" }}>
                <label style={labelStyle}>Patient Name (optional)</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Ahmad Samer"
                  style={inputStyle} />
              </div>

              <div style={{ marginBottom:"14px" }}>
                <label style={labelStyle}>Room / Location (optional)</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Room 304, Floor 3"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Your Name (optional)</label>
                <input value={nurseName} onChange={e => setNurseName(e.target.value)}
                  placeholder="Nurse name"
                  style={inputStyle} />
              </div>
            </div>

            <button type="submit" disabled={!mrn.trim()} style={{
              width:"100%", background: !mrn.trim() ? "#94a3b8" : "#1e293b",
              color:"#fff", border:"none", borderRadius:"14px", padding:"18px",
              fontSize:"17px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit",
            }}>
              Select Procedure →
            </button>

            <div style={{ textAlign:"center", fontSize:"12px", color:"#94a3b8", marginTop:"12px" }}>
              No login required · Records linked to patient when doctor admits them
            </div>
          </form>
        )}

        {/* ── STEP 2: Select procedure + time ── */}
        {step === "procedure" && (
          <div>
            {/* Patient summary bar */}
            <div style={{ background:"#1e293b", color:"#fff", borderRadius:"14px", padding:"12px 16px", marginBottom:"16px" }}>
              <div style={{ fontSize:"15px", fontWeight:"700" }}>{patientName || "Patient"}</div>
              <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"2px" }}>
                MRN: <strong style={{ color:"#7dd3fc" }}>{mrn}</strong>
                {location && <span> · {location}</span>}
                {nurseName && <span> · Nurse: {nurseName}</span>}
              </div>
            </div>

            {/* Procedure selection */}
            <div style={card}>
              <div style={{ fontSize:"16px", fontWeight:"700", color:"#1e293b", marginBottom:"16px" }}>Select Procedure</div>
              {loadingProcs ? (
                <div style={{ textAlign:"center", color:"#94a3b8", padding:"24px", fontSize:"14px" }}>Loading...</div>
              ) : procedures.length === 0 ? (
                <div style={{ textAlign:"center", color:"#94a3b8", padding:"24px", fontSize:"14px" }}>
                  No procedures configured. Contact admin.
                </div>
              ) : categories.map(cat => (
                <div key={cat} style={{ marginBottom:"18px" }}>
                  <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", marginBottom:"8px" }}>
                    {CAT_LABELS[cat] ?? cat}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {procedures.filter(p => p.category === cat).map(proc => {
                      const c   = CAT_COLORS[proc.category] ?? CAT_COLORS.other;
                      const sel = selectedProc?.id === proc.id;
                      return (
                        <button key={proc.id} onClick={() => setSelectedProc(sel ? null : proc)} style={{
                          background: sel ? "#1e293b" : c.bg,
                          color: sel ? "#fff" : c.text,
                          border: `2px solid ${sel ? "#1e293b" : "transparent"}`,
                          borderRadius:"12px", padding:"14px 16px", textAlign:"left",
                          cursor:"pointer", width:"100%", fontFamily:"inherit",
                          transition:"all 0.1s",
                        }}>
                          <div style={{ fontSize:"15px", fontWeight:"600" }}>{proc.name}</div>
                          {proc.name_ar && <div style={{ fontSize:"12px", opacity:0.7, direction:"rtl", marginTop:"2px" }}>{proc.name_ar}</div>}
                          {proc.notes && <div style={{ fontSize:"12px", opacity:0.6, marginTop:"3px" }}>{proc.notes}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Time + notes + submit */}
            {selectedProc && (
              <form onSubmit={handleRecord}>
                <div style={card}>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:"#1e293b", marginBottom:"14px" }}>
                    ⏱ {selectedProc.name}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
                    <div>
                      <label style={labelStyle}>Date *</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Start Time *</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Notes (optional)</label>
                    <textarea value={procNotes} onChange={e => setProcNotes(e.target.value)} rows={2}
                      placeholder="Any notes about this procedure..."
                      style={{ ...inputStyle, resize:"none" } as React.CSSProperties} />
                  </div>
                </div>

                {saveError && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px", marginBottom:"12px", color:"#dc2626", fontSize:"13px" }}>
                    ⚠ {saveError}
                  </div>
                )}

                <button type="submit" disabled={saving} style={{
                  width:"100%", background: saving ? "#94a3b8" : "#16a34a",
                  color:"#fff", border:"none", borderRadius:"14px", padding:"20px",
                  fontSize:"18px", fontWeight:"800", cursor:"pointer", fontFamily:"inherit",
                }}>
                  {saving ? "Saving..." : "✓ Record Procedure"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === "done" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ ...card, padding:"40px 24px" }}>
              <div style={{ fontSize:"64px", marginBottom:"16px" }}>✅</div>
              <div style={{ fontSize:"22px", fontWeight:"800", color:"#1e293b", marginBottom:"8px" }}>Recorded!</div>
              <div style={{ fontSize:"16px", color:"#475569", marginBottom:"4px" }}>{lastSaved}</div>
              <div style={{ fontSize:"14px", color:"#94a3b8", marginBottom:"4px" }}>
                {patientName || "Patient"} · MRN: {mrn}
              </div>
              <div style={{ fontSize:"12px", color:"#cbd5e1", marginTop:"8px" }}>
                {new Date(`${startDate}T${startTime}`).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <button onClick={recordAnother} style={{ background:"#1e293b", color:"#fff", border:"none", borderRadius:"14px", padding:"18px", fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
                + Another
              </button>
              <button onClick={newPatient} style={{ background:"#fff", color:"#64748b", border:"2px solid #e2e8f0", borderRadius:"14px", padding:"18px", fontSize:"16px", fontWeight:"600", cursor:"pointer" }}>
                New Patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
