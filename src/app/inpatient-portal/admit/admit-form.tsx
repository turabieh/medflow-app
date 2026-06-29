"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PortalAdmitForm({
  hospitals,
  patients,
  doctorId,
  clinicId,
}: {
  hospitals: { id: string; name: string }[];
  patients: { id: string; full_name: string; full_name_ar: string | null; dob: string | null }[];
  doctorId: string;
  clinicId: string;
}) {
  const router = useRouter();
  const [patientSearch, setPatientSearch]     = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [hospitalId, setHospitalId]           = useState(hospitals[0]?.id ?? "");
  const [mrn, setMrn]                         = useState("");
  const [location, setLocation]               = useState("");
  const [admitDate, setAdmitDate]             = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const filtered = patients
    .filter(p =>
      p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.full_name_ar ?? "").includes(patientSearch)
    )
    .slice(0, 8);

  async function handleAdmit() {
    if (!patientSearch.trim()) { setError("Please enter a patient name."); return; }
    if (!hospitalId)            { setError("Please select a hospital."); return; }
    if (!mrn.trim())            { setError("Please enter the hospital MRN."); return; }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Use existing patient or create new one
      let patientId = selectedPatient?.id ?? null;

      if (!patientId) {
        // Create new patient record
        const { data: newPt, error: ptErr } = await supabase
          .from("patients")
          .insert({
            clinic_id: clinicId,
            full_name: patientSearch.trim(),
            phone:     "—",  // placeholder — doctor can update later
          })
          .select("id")
          .single();

        if (ptErr || !newPt) {
          setError(`Could not create patient: ${ptErr?.message ?? "unknown error"}`);
          setSaving(false);
          return;
        }
        patientId = newPt.id;
      }

      const { data: ip, error: ie } = await supabase
        .from("inpatients")
        .insert({
          clinic_id:           clinicId,
          doctor_id:           doctorId,
          patient_id:          patientId,
          hospital_id:         hospitalId,
          hospital_patient_id: mrn.trim().toUpperCase(),
          location:            location.trim() || null,
          admission_date:      admitDate,
          status:              "active",
        })
        .select("id")
        .single();

      if (ie) {
        setError(`Database error: ${ie.message}`);
        setSaving(false);
        return;
      }

      if (!ip?.id) {
        setError("Admitted but no ID returned. Please check the patients list.");
        setSaving(false);
        return;
      }

      router.push(`/inpatient-portal/patients/${ip.id}`);
      router.refresh();

    } catch (err) {
      setSaving(false);
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0f172a",
    border: "1.5px solid #334155",
    borderRadius: "12px",
    color: "#f1f5f9",
    padding: "14px 16px",
    fontSize: "15px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {error && (
        <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"10px", padding:"12px 14px", color:"#fca5a5", fontSize:"13px", lineHeight:"1.5" }}>
          ⚠ {error}
        </div>
      )}

      {/* Patient — search existing or enter new name */}
      <div>
        <label style={labelStyle}>Patient Name *</label>
        <input
          value={patientSearch}
          onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
          placeholder="Type patient name..."
          autoComplete="off"
          style={inputStyle}
        />
        {/* Dropdown for existing matches */}
        {patientSearch.length > 1 && filtered.length > 0 && !selectedPatient && (
          <div style={{ background:"#0f172a", border:"1px solid #3b82f6", borderRadius:"10px", overflow:"hidden", marginTop:"4px" }}>
            <div style={{ padding:"6px 12px", fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", borderBottom:"1px solid #1e293b" }}>
              Existing patients — tap to select
            </div>
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); setSelectedPatient(p); setPatientSearch(p.full_name); }}
                style={{ width:"100%", background:"none", border:"none", borderBottom:"1px solid #1e293b", padding:"10px 14px", textAlign:"left", cursor:"pointer", color:"#f1f5f9", fontFamily:"inherit" }}>
                <div style={{ fontSize:"14px", fontWeight:"600" }}>{p.full_name}</div>
                {p.full_name_ar && <div style={{ fontSize:"12px", color:"#64748b", direction:"rtl" }}>{p.full_name_ar}</div>}
              </button>
            ))}
          </div>
        )}
        {/* Hint when no match */}
        {patientSearch.length > 1 && filtered.length === 0 && (
          <div style={{ padding:"8px 12px", fontSize:"12px", color:"#64748b", marginTop:"4px" }}>
            New patient — will be registered on admit
          </div>
        )}
        {selectedPatient && (
          <div style={{ padding:"6px 12px", fontSize:"12px", color:"#22c55e", marginTop:"4px" }}>
            ✓ Existing patient selected
          </div>
        )}
      </div>

      {/* Hospital */}
      <div>
        <label style={labelStyle}>Hospital *</label>
        <select value={hospitalId} onChange={e => setHospitalId(e.target.value)} style={{ ...inputStyle }}>
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {/* MRN */}
      <div>
        <label style={labelStyle}>Hospital Patient ID / MRN *</label>
        <input
          value={mrn}
          onChange={e => setMrn(e.target.value.toUpperCase())}
          placeholder="e.g. AH5253"
          autoCapitalize="characters"
          style={{ ...inputStyle, fontSize: "22px", fontFamily: "monospace", fontWeight: "700", textAlign: "center", letterSpacing: "3px" }}
        />
      </div>

      {/* Room */}
      <div>
        <label style={labelStyle}>Room / Location</label>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Room 204, Floor 2"
          style={inputStyle}
        />
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle}>Admission Date *</label>
        <JordanDateInput value={admitDate} onChange={setAdmitDate} required
          style={inputStyle} />
      </div>

      <div style={{ fontSize:"11px", color:"#475569", marginBottom:"8px", fontFamily:"monospace" }}>
        Debug: name="{patientSearch}" | existing={selectedPatient ? "✓" : "new"} | mrn={mrn || "✗"} | saving={String(saving)}
      </div>

      <button
        type="button"
        onClick={handleAdmit}
        style={{
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "14px",
          padding: "18px",
          fontSize: "17px",
          fontWeight: "700",
          cursor: "pointer",
          fontFamily: "inherit",
          marginTop: "4px",
          opacity: (saving || !selectedPatient || !mrn.trim()) ? 0.5 : 1,
        }}>
        {saving ? "Admitting..." : "✓ Admit Patient"}
      </button>
    </div>
  );
}
