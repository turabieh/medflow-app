"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { admitInpatient } from "@/lib/actions/inpatients";

export function PortalAdmitForm({
  hospitals, patients,
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

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.full_name_ar ?? "").includes(patientSearch)
  ).slice(0, 8);

  async function handleAdmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !hospitalId || !mrn.trim()) {
      setError("Please fill all required fields — patient, hospital, and MRN.");
      return;
    }
    setSaving(true); setError(null);

    const result = await admitInpatient({
      patientId:          selectedPatient.id,
      hospitalId,
      hospitalPatientId:  mrn.trim().toUpperCase(),
      location:           location.trim() || "",
      admissionDate:      admitDate,
    });

    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed to admit patient."); return; }
    router.push(`/inpatient-portal/patients/${result.inpatientId}`);
  }

  return (
    <form onSubmit={handleAdmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {error && (
        <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"8px",
          padding:"10px 14px", color:"#fca5a5", fontSize:"13px" }}>
          ⚠ {error}
        </div>
      )}

      {/* Patient search */}
      <div>
        <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>
          Patient *
        </label>
        {selectedPatient ? (
          <div style={{ background:"#0f172a", border:"1.5px solid #3b82f6", borderRadius:"12px",
            padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>{selectedPatient.full_name}</div>
            <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
              style={{ background:"none", border:"none", color:"#64748b", fontSize:"16px", cursor:"pointer" }}>✕</button>
          </div>
        ) : (
          <div>
            <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
              placeholder="Type to search patient name..."
              style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
                color:"#f1f5f9", padding:"14px 16px", fontSize:"15px", fontFamily:"system-ui",
                marginBottom:"6px", boxSizing:"border-box" }} />
            {patientSearch.length > 0 && (
              <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:"10px", overflow:"hidden" }}>
                {filtered.length === 0
                  ? <div style={{ padding:"12px 14px", fontSize:"13px", color:"#64748b" }}>No patients found</div>
                  : filtered.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                      style={{ width:"100%", background:"none", border:"none",
                        borderBottom:"1px solid #1e293b", padding:"12px 14px",
                        textAlign:"left", cursor:"pointer", color:"#f1f5f9", fontFamily:"inherit" }}>
                      <div style={{ fontSize:"14px", fontWeight:"600" }}>{p.full_name}</div>
                      {p.full_name_ar && <div style={{ fontSize:"12px", color:"#64748b", direction:"rtl" }}>{p.full_name_ar}</div>}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hospital */}
      <div>
        <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>Hospital *</label>
        <select value={hospitalId} onChange={e => setHospitalId(e.target.value)}
          style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
            color:"#f1f5f9", padding:"14px 16px", fontSize:"15px", fontFamily:"inherit", boxSizing:"border-box" }}>
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {/* MRN */}
      <div>
        <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>Hospital MRN *</label>
        <input value={mrn} onChange={e => setMrn(e.target.value.toUpperCase())} required
          placeholder="e.g. AH5253" autoCapitalize="characters"
          style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
            color:"#f1f5f9", padding:"14px 16px", fontSize:"22px", fontFamily:"monospace",
            fontWeight:"700", textAlign:"center", letterSpacing:"3px", boxSizing:"border-box" }} />
      </div>

      {/* Location */}
      <div>
        <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>Room / Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Room 204, Floor 2"
          style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
            color:"#f1f5f9", padding:"14px 16px", fontSize:"15px", fontFamily:"inherit", boxSizing:"border-box" }} />
      </div>

      {/* Admit date */}
      <div>
        <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>Admission Date *</label>
        <input type="date" value={admitDate} onChange={e => setAdmitDate(e.target.value)} required
          style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"12px",
            color:"#f1f5f9", padding:"14px 16px", fontSize:"15px", fontFamily:"inherit", boxSizing:"border-box" }} />
      </div>

      <button type="submit" disabled={saving || !selectedPatient || !mrn.trim()}
        style={{ background: (saving || !selectedPatient || !mrn.trim()) ? "#334155" : "#3b82f6",
          color:"#fff", border:"none", borderRadius:"14px", padding:"18px",
          fontSize:"17px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", marginTop:"4px" }}>
        {saving ? "Admitting..." : "✓ Admit Patient"}
      </button>
    </form>
  );
}
