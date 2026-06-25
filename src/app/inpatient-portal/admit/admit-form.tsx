"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PortalAdmitForm({
  hospitals, patients, doctorId, clinicId,
}: {
  hospitals: { id: string; name: string }[];
  patients: { id: string; full_name: string; full_name_ar: string | null; dob: string | null }[];
  doctorId: string;
  clinicId: string;
}) {
  const router = useRouter();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [hospitalId, setHospitalId]   = useState(hospitals[0]?.id ?? "");
  const [mrn, setMrn]                 = useState("");
  const [location, setLocation]       = useState("");
  const [admitDate, setAdmitDate]     = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.full_name_ar ?? "").includes(patientSearch)
  ).slice(0, 8);

  async function handleAdmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !hospitalId || !mrn.trim()) { setError("Please fill all required fields."); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const { data: ip, error: ie } = await supabase.from("inpatients").insert({
      clinic_id:           clinicId,
      doctor_id:           doctorId,
      patient_id:          selectedPatient.id,
      hospital_id:         hospitalId,
      hospital_patient_id: mrn.trim().toUpperCase(),
      location:            location.trim() || null,
      admitted_at:         `${admitDate}T00:00:00`,
      status:              "active",
    }).select("id").single();
    setSaving(false);
    if (ie || !ip) { setError(ie?.message ?? "Failed to admit patient."); return; }
    router.push(`/inpatient-portal/patients/${ip.id}`);
  }

  return (
    <form onSubmit={handleAdmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {error && <div className="ip-error">⚠ {error}</div>}

      {/* Patient search */}
      <div>
        <label className="ip-label">Patient *</label>
        {selectedPatient ? (
          <div style={{ background:"#0f172a", border:"1.5px solid #3b82f6", borderRadius:"12px", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>{selectedPatient.full_name}</div>
            </div>
            <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
              style={{ background:"none", border:"none", color:"#64748b", fontSize:"16px", cursor:"pointer" }}>✕</button>
          </div>
        ) : (
          <div>
            <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
              placeholder="Search patient name..." className="ip-input" style={{ marginBottom:"6px" }} />
            {patientSearch && filtered.length > 0 && (
              <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:"10px", overflow:"hidden" }}>
                {filtered.map(p => (
                  <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(""); }}
                    style={{ width:"100%", background:"none", border:"none", borderBottom:"1px solid #1e293b", padding:"12px 14px", textAlign:"left", cursor:"pointer", color:"#f1f5f9", fontFamily:"inherit" }}>
                    <div style={{ fontSize:"14px", fontWeight:"600" }}>{p.full_name}</div>
                    {p.full_name_ar && <div style={{ fontSize:"12px", color:"#64748b", direction:"rtl" }}>{p.full_name_ar}</div>}
                  </button>
                ))}
              </div>
            )}
            {patientSearch && filtered.length === 0 && (
              <div style={{ fontSize:"13px", color:"#64748b", padding:"8px 4px" }}>No patients found</div>
            )}
          </div>
        )}
      </div>

      {/* Hospital */}
      <div>
        <label className="ip-label">Hospital *</label>
        <select value={hospitalId} onChange={e => setHospitalId(e.target.value)} className="ip-input">
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {/* MRN */}
      <div>
        <label className="ip-label">Hospital Patient ID / MRN *</label>
        <input value={mrn} onChange={e => setMrn(e.target.value.toUpperCase())} required
          placeholder="e.g. AH5253" className="ip-input"
          style={{ fontSize:"20px", fontFamily:"monospace", fontWeight:"700", textAlign:"center", letterSpacing:"3px" }} />
      </div>

      {/* Location */}
      <div>
        <label className="ip-label">Room / Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Room 204, Floor 2" className="ip-input" />
      </div>

      {/* Admit date */}
      <div>
        <label className="ip-label">Admission Date *</label>
        <input type="date" value={admitDate} onChange={e => setAdmitDate(e.target.value)} required className="ip-input" />
      </div>

      <button type="submit" disabled={saving || !selectedPatient}
        style={{ background: (!selectedPatient || saving) ? "#334155" : "#3b82f6", color:"#fff", border:"none", borderRadius:"14px", padding:"18px", fontSize:"17px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
        {saving ? "Admitting..." : "✓ Admit Patient"}
      </button>
    </form>
  );
}
