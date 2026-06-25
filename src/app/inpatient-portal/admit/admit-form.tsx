"use client";

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
    if (!selectedPatient) { setError("Please select a patient."); return; }
    if (!hospitalId)       { setError("Please select a hospital."); return; }
    if (!mrn.trim())       { setError("Please enter the hospital MRN."); return; }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: ip, error: ie } = await supabase
        .from("inpatients")
        .insert({
          clinic_id:           clinicId,
          doctor_id:           doctorId,
          patient_id:          selectedPatient.id,
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

      {/* Patient search */}
      <div>
        <label style={labelStyle}>Patient *</label>
        {selectedPatient ? (
          <div style={{ background: "#0f172a", border: "1.5px solid #3b82f6", borderRadius: "12px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9" }}>{selectedPatient.full_name}</div>
            <button
              type="button"
              onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
              style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer", padding: "0 0 0 8px" }}>
              ✕
            </button>
          </div>
        ) : (
          <div>
            <input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              placeholder="Type patient name to search..."
              autoComplete="off"
              style={{ ...inputStyle, marginBottom: patientSearch ? "6px" : "0" }}
            />
            {patientSearch.length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "12px 14px", fontSize: "13px", color: "#64748b" }}>No patients found</div>
                ) : filtered.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                    style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid #1e293b", padding: "12px 14px", textAlign: "left", cursor: "pointer", color: "#f1f5f9", fontFamily: "inherit" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>{p.full_name}</div>
                    {p.full_name_ar && <div style={{ fontSize: "12px", color: "#64748b", direction: "rtl" }}>{p.full_name_ar}</div>}
                  </button>
                ))}
              </div>
            )}
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
        <input
          type="date"
          value={admitDate}
          onChange={e => setAdmitDate(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      <div style={{ fontSize:"11px", color:"#475569", marginBottom:"8px", fontFamily:"monospace" }}>
        Debug: patient={selectedPatient ? `✓ ${selectedPatient.full_name}` : "✗ none"} | mrn={mrn || "✗ empty"} | saving={String(saving)}
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
