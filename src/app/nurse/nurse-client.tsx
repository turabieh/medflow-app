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

type Step = "search" | "confirm" | "procedure" | "done";

export function NursePage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loadingProcs, setLoadingProcs] = useState(true);

  const [step, setStep]           = useState<Step>("search");
  const [mrn, setMrn]             = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patient, setPatient]     = useState<any>(null);
  const [inpatientId, setInpatientId] = useState<string | null>(null);
  const [clinicId, setClinicId]   = useState("");

  // Unregistered patient
  const [isUnregistered, setIsUnregistered]   = useState(false);
  const [unregName, setUnregName]             = useState("");
  const [unregLocation, setUnregLocation]     = useState("");

  const [selectedProc, setSelectedProc]   = useState<Procedure | null>(null);
  const [startDate, setStartDate]         = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime]         = useState(new Date().toTimeString().slice(0, 5));
  const [procNotes, setProcNotes]         = useState("");
  const [nurseName, setNurseName]         = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [lastSaved, setLastSaved]         = useState<string | null>(null);

  // Load procedures client-side using anon key
  useEffect(() => {
    const supabase = createClient();
    supabase.from("nurse_procedures_catalog")
      .select("id, name, name_ar, category, notes, clinic_id")
      .eq("is_active", true)
      .order("category").order("name")
      .then(({ data }) => {
        setProcedures(data ?? []);
        setLoadingProcs(false);
      });
  }, []);

  const filteredProcs = procedures.filter(p => !clinicId || p.clinic_id === clinicId);
  const categories    = [...new Set(filteredProcs.map(p => p.category))];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!mrn.trim()) return;
    setSearching(true); setSearchError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("inpatients")
      .select("id, clinic_id, location, status, hospital_patient_id, patients(full_name, full_name_ar, dob, blood_type), hospitals(name)")
      .ilike("hospital_patient_id", mrn.trim())
      .maybeSingle();

    setSearching(false);

    if (!data) {
      // Patient not found — offer to record without registration
      setSearchError(null);
      setIsUnregistered(true);
      setClinicId(""); // will use first available clinic procedures
      setStep("confirm");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pt   = Array.isArray(data.patients) ? data.patients[0] : data.patients as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hosp = Array.isArray(data.hospitals) ? data.hospitals[0] : data.hospitals as any;
    setPatient({ ...pt, hospitalName: hosp?.name, location: data.location, status: data.status });
    setInpatientId(data.id);
    setClinicId(data.clinic_id);
    setIsUnregistered(false);
    setStep("confirm");
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProc) return;
    setSaving(true); setSaveError(null);

    const startedAt = new Date(`${startDate}T${startTime}`).toISOString();
    const supabase  = createClient();

    const record = {
      clinic_id:        clinicId || selectedProc.clinic_id,
      inpatient_id:     inpatientId ?? undefined,
      procedure_id:     selectedProc.id,
      procedure_name:   selectedProc.name,
      category:         selectedProc.category,
      started_at:       startedAt,
      notes:            procNotes || null,
      recorded_by_name: nurseName || null,
      // For unregistered: store name/location in notes
      ...(isUnregistered ? {
        notes: [
          `UNREGISTERED PATIENT: ${unregName}`,
          unregLocation ? `Location: ${unregLocation}` : "",
          `MRN: ${mrn}`,
          procNotes ? `Notes: ${procNotes}` : "",
        ].filter(Boolean).join(" | "),
        inpatient_id: undefined,
      } : {}),
    };

    // Use insert directly with anon key — RLS allows public insert
    const { error } = await supabase.from("nurse_procedure_records").insert(record);

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setLastSaved(selectedProc.name);
    setStep("done");
  }

  function reset() {
    setStep("search"); setMrn(""); setPatient(null); setSelectedProc(null);
    setProcNotes(""); setSaveError(null); setLastSaved(null);
    setInpatientId(null); setClinicId(""); setIsUnregistered(false);
    setUnregName(""); setUnregLocation(""); setSearchError(null);
  }

  function recordAnother() {
    setSelectedProc(null); setProcNotes(""); setSaveError(null);
    setStartTime(new Date().toTimeString().slice(0, 5));
    setStep("procedure");
  }

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const btn = (onClick: () => void, label: string, primary = true) => (
    <button onClick={onClick} style={{
      flex: 1, background: primary ? "#1e293b" : "#fff",
      color: primary ? "#fff" : "#64748b",
      border: primary ? "none" : "2px solid #e2e8f0",
      borderRadius: "14px", padding: "16px", fontSize: "16px",
      fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "2px solid #e2e8f0", borderRadius: "12px",
    padding: "14px 16px", fontSize: "15px", boxSizing: "border-box",
    fontFamily: "inherit", outline: "none", background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px", color: "#64748b", display: "block",
    marginBottom: "6px", fontWeight: "600",
  };

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: "16px",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", color:"#fff", padding:"18px 20px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"18px", fontWeight:"800" }}>🏥 Nurse Portal</div>
            <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"1px" }}>Inpatient Procedure Recording</div>
          </div>
          {step !== "search" && (
            <button onClick={reset} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", borderRadius:"8px", padding:"8px 14px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
              ← New
            </button>
          )}
        </div>
        {/* Progress */}
        <div style={{ display:"flex", gap:"4px", marginTop:"14px" }}>
          {(["search","confirm","procedure","done"] as Step[]).map((s, i) => (
            <div key={s} style={{ flex:1, height:"3px", borderRadius:"2px", background: ["search","confirm","procedure","done"].indexOf(step) >= i ? "#38bdf8" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"20px 16px 40px" }}>

        {/* ── STEP 1: Search ── */}
        {step === "search" && (
          <div>
            <div style={card}>
              <div style={{ fontSize:"17px", fontWeight:"700", color:"#1e293b", marginBottom:"4px" }}>Find Patient</div>
              <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Enter the hospital MRN / Patient ID</div>
              <form onSubmit={handleSearch}>
                <input value={mrn} onChange={e => setMrn(e.target.value.toUpperCase())}
                  placeholder="e.g. AH5253" autoFocus autoCapitalize="characters"
                  style={{ ...inputStyle, fontSize:"24px", fontFamily:"monospace", fontWeight:"700", textAlign:"center", letterSpacing:"3px", marginBottom:"14px" }}
                />
                {searchError && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 14px", marginBottom:"14px", color:"#dc2626", fontSize:"13px" }}>
                    ⚠ {searchError}
                  </div>
                )}
                <button type="submit" disabled={searching || !mrn.trim()} style={{
                  width:"100%", background: searching || !mrn.trim() ? "#94a3b8" : "#1e293b",
                  color:"#fff", border:"none", borderRadius:"14px", padding:"18px",
                  fontSize:"17px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit",
                }}>
                  {searching ? "Searching..." : "Find Patient →"}
                </button>
              </form>
            </div>
            <div style={{ textAlign:"center", fontSize:"12px", color:"#94a3b8" }}>
              Patient not registered? You&apos;ll be able to record manually.
            </div>
          </div>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === "confirm" && (
          <div>
            {isUnregistered ? (
              // Unregistered patient
              <div style={card}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"18px" }}>
                  <div style={{ width:"48px", height:"48px", background:"#fff7ed", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", flexShrink:0 }}>⚠️</div>
                  <div>
                    <div style={{ fontSize:"15px", fontWeight:"700", color:"#1e293b" }}>Patient Not Found</div>
                    <div style={{ fontSize:"13px", color:"#64748b" }}>MRN <strong>{mrn}</strong> not in system</div>
                  </div>
                </div>
                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"10px", padding:"12px 14px", marginBottom:"16px", fontSize:"13px", color:"#92400e" }}>
                  You can still record the procedure. Enter patient details and the doctor will link this record later.
                </div>
                <div style={{ marginBottom:"12px" }}>
                  <label style={labelStyle}>Patient Name *</label>
                  <input value={unregName} onChange={e => setUnregName(e.target.value)} required
                    placeholder="e.g. Ahmad Samer" style={inputStyle} />
                </div>
                <div style={{ marginBottom:"4px" }}>
                  <label style={labelStyle}>Room / Location</label>
                  <input value={unregLocation} onChange={e => setUnregLocation(e.target.value)}
                    placeholder="e.g. Room 304, 3rd Floor" style={inputStyle} />
                </div>
              </div>
            ) : (
              // Registered patient card
              <div style={card}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                  <div style={{ width:"52px", height:"52px", background:"#e0f2fe", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", flexShrink:0 }}>👤</div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ fontSize:"18px", fontWeight:"800", color:"#1e293b" }}>{patient?.full_name}</span>
                      {patient?.status === "discharged" && <span style={{ fontSize:"11px", background:"#fef3c7", color:"#92400e", borderRadius:"6px", padding:"2px 8px", fontWeight:"600" }}>Discharged</span>}
                    </div>
                    {patient?.full_name_ar && <div style={{ fontSize:"13px", color:"#64748b", direction:"rtl" }}>{patient.full_name_ar}</div>}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {[
                    ["MRN", mrn],
                    age !== null ? ["Age", `${age} yrs`] : null,
                    ["Room", patient?.location],
                    patient?.blood_type ? ["Blood", patient.blood_type] : null,
                    ["Hospital", patient?.hospitalName],
                  ].filter(Boolean).map((row, i) => row && (
                    <div key={i} style={{ background:"#f8fafc", borderRadius:"10px", padding:"10px 12px" }}>
                      <div style={{ fontSize:"10px", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"3px" }}>{row[0]}</div>
                      <div style={{ fontSize:"14px", fontWeight:"700", color:"#1e293b" }}>{row[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:"12px" }}>
              {btn(reset, "← Back", false)}
              <button
                onClick={() => { if (isUnregistered && !unregName.trim()) return; setStep("procedure"); }}
                disabled={isUnregistered && !unregName.trim()}
                style={{ flex:1, background: (isUnregistered && !unregName.trim()) ? "#94a3b8" : "#1e293b", color:"#fff", border:"none", borderRadius:"14px", padding:"16px", fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Select & record ── */}
        {step === "procedure" && (
          <div>
            {/* Mini patient bar */}
            <div style={{ background:"#1e293b", color:"#fff", borderRadius:"14px", padding:"12px 16px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"15px", fontWeight:"700" }}>
                  {isUnregistered ? unregName : patient?.full_name}
                  {isUnregistered && <span style={{ marginLeft:"8px", fontSize:"10px", background:"#f59e0b", color:"#fff", borderRadius:"4px", padding:"1px 6px" }}>Unregistered</span>}
                </div>
                <div style={{ fontSize:"11px", color:"#94a3b8" }}>
                  MRN: {mrn}{isUnregistered ? ` · ${unregLocation}` : ` · ${patient?.location}`}
                </div>
              </div>
            </div>

            {/* Nurse name */}
            <div style={card}>
              <label style={labelStyle}>Your Name (optional)</label>
              <input value={nurseName} onChange={e => setNurseName(e.target.value)}
                placeholder="Nurse name" style={inputStyle} />
            </div>

            {/* Procedure list */}
            <div style={card}>
              <div style={{ fontSize:"16px", fontWeight:"700", color:"#1e293b", marginBottom:"16px" }}>Select Procedure</div>
              {loadingProcs ? (
                <div style={{ textAlign:"center", color:"#94a3b8", padding:"24px" }}>Loading procedures...</div>
              ) : filteredProcs.length === 0 ? (
                <div style={{ textAlign:"center", color:"#94a3b8", padding:"24px", fontSize:"14px" }}>
                  No procedures found. Ask admin to add procedures.
                </div>
              ) : categories.map(cat => (
                <div key={cat} style={{ marginBottom:"18px" }}>
                  <div style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", marginBottom:"8px" }}>
                    {CAT_LABELS[cat] ?? cat}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {filteredProcs.filter(p => p.category === cat).map(proc => {
                      const c = CAT_COLORS[proc.category] ?? CAT_COLORS.other;
                      const sel = selectedProc?.id === proc.id;
                      return (
                        <button key={proc.id} onClick={() => setSelectedProc(sel ? null : proc)} style={{
                          background: sel ? "#1e293b" : c.bg,
                          color: sel ? "#fff" : c.text,
                          border: sel ? "2px solid #1e293b" : "2px solid transparent",
                          borderRadius:"12px", padding:"14px 16px", textAlign:"left",
                          cursor:"pointer", width:"100%", fontFamily:"inherit",
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
                    <label style={labelStyle}>Notes</label>
                    <textarea value={procNotes} onChange={e => setProcNotes(e.target.value)} rows={2}
                      placeholder="Optional notes about this procedure..."
                      style={{ ...inputStyle, resize:"none" } as React.CSSProperties} />
                  </div>
                </div>
                {saveError && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 14px", marginBottom:"12px", color:"#dc2626", fontSize:"13px" }}>
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

        {/* ── STEP 4: Success ── */}
        {step === "done" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ ...card, padding:"40px 24px" }}>
              <div style={{ fontSize:"64px", marginBottom:"16px" }}>✅</div>
              <div style={{ fontSize:"22px", fontWeight:"800", color:"#1e293b", marginBottom:"8px" }}>Recorded!</div>
              <div style={{ fontSize:"16px", color:"#475569", marginBottom:"4px" }}>{lastSaved}</div>
              <div style={{ fontSize:"14px", color:"#94a3b8" }}>
                for {isUnregistered ? unregName : patient?.full_name}
                {isUnregistered && <div style={{ marginTop:"6px", fontSize:"12px", color:"#f59e0b" }}>⚠ Unregistered — doctor will link this record</div>}
              </div>
            </div>
            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={recordAnother} style={{ flex:1, background:"#1e293b", color:"#fff", border:"none", borderRadius:"14px", padding:"18px", fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
                + Another Procedure
              </button>
              <button onClick={reset} style={{ flex:1, background:"#fff", color:"#64748b", border:"2px solid #e2e8f0", borderRadius:"14px", padding:"18px", fontSize:"16px", fontWeight:"600", cursor:"pointer" }}>
                New Patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
