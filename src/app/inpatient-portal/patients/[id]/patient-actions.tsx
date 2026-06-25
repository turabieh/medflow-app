"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInpatientVisitWithDetails, dischargeInpatient, updateInpatientLocation } from "@/lib/actions/inpatients";

const VISIT_TYPES = [
  { key:"round",        label:"Round" },
  { key:"followup",     label:"Follow-up" },
  { key:"consultation", label:"Consultation" },
  { key:"urgent",       label:"Urgent" },
  { key:"review",       label:"Review" },
];

export function PortalPatientActions({
  inpatientId, todayVisitId, isActive,
}: {
  inpatientId: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  clinicId: string;
  todayVisitId?: string;
  isActive: boolean;
  hospitalPatientId: string;
}) {
  const router = useRouter();
  const [panel, setPanel]       = useState<"none"|"visit"|"location"|"discharge">("none");
  const [visitType, setVisitType] = useState("round");
  const [visitFee, setVisitFee]   = useState("");
  const [location, setLocation]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const today     = new Date().toISOString().split("T")[0];
  const visitTime = new Date().toTimeString().slice(0, 5);

  async function saveVisit() {
    setSaving(true); setError(null);
    const result = await createInpatientVisitWithDetails(inpatientId, {
      visitDate: today,
      visitTime,
      visitType,
      visitFee: visitFee ? parseFloat(visitFee) : undefined,
    });
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed to save visit."); return; }
    router.push(`/doctor/visit/${result.visitId}`);
  }

  async function saveLocation() {
    if (!location.trim()) return;
    setSaving(true);
    await updateInpatientLocation(inpatientId, location.trim());
    setSaving(false); setPanel("none"); router.refresh();
  }

  async function handleDischarge() {
    setSaving(true);
    await dischargeInpatient(inpatientId, new Date().toISOString().split("T")[0]);
    setSaving(false); setPanel("none"); router.refresh();
  }

  return (
    <div style={{ marginBottom:"16px" }}>
      {panel === "none" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {isActive && !todayVisitId && (
            <button onClick={() => setPanel("visit")}
              style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:"14px",
                padding:"18px", fontSize:"16px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
              + Record Today&apos;s Visit
            </button>
          )}
          {todayVisitId && (
            <button onClick={() => router.push(`/doctor/visit/${todayVisitId}`)}
              style={{ background:"#1d4ed8", color:"#93c5fd", border:"none", borderRadius:"14px",
                padding:"16px", fontSize:"15px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
              Open Today&apos;s Visit Notes →
            </button>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            {isActive && (
              <button onClick={() => setPanel("location")}
                style={{ background:"#1e293b", border:"1.5px solid #334155", color:"#94a3b8",
                  borderRadius:"12px", padding:"14px", fontSize:"14px", fontWeight:"600",
                  cursor:"pointer", fontFamily:"inherit" }}>
                📍 Update Room
              </button>
            )}
            {isActive && (
              <button onClick={() => setPanel("discharge")}
                style={{ background:"#1e293b", border:"1.5px solid #7f1d1d", color:"#fca5a5",
                  borderRadius:"12px", padding:"14px", fontSize:"14px", fontWeight:"600",
                  cursor:"pointer", fontFamily:"inherit" }}>
                🏠 Discharge
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visit form */}
      {panel === "visit" && (
        <div style={{ background:"#1e293b", borderRadius:"16px", padding:"16px", marginBottom:"4px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <div style={{ fontSize:"14px", fontWeight:"700", color:"#f1f5f9" }}>New Visit — {today}</div>
            <button onClick={() => setPanel("none")} style={{ background:"none", border:"none", color:"#64748b", fontSize:"18px", cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px", marginBottom:"12px" }}>
            {VISIT_TYPES.map(vt => (
              <button key={vt.key} onClick={() => setVisitType(vt.key)}
                style={{ background: visitType === vt.key ? "#3b82f6" : "#0f172a",
                  color: visitType === vt.key ? "#fff" : "#64748b",
                  border: `1.5px solid ${visitType === vt.key ? "#3b82f6" : "#334155"}`,
                  borderRadius:"10px", padding:"10px", fontSize:"13px", fontWeight:"600",
                  cursor:"pointer", fontFamily:"inherit" }}>
                {vt.label}
              </button>
            ))}
          </div>
          <input type="number" value={visitFee} onChange={e => setVisitFee(e.target.value)}
            placeholder="Visit fee (JOD)" min="0" step="0.01"
            style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155",
              borderRadius:"10px", color:"#f1f5f9", padding:"12px 16px", fontSize:"16px",
              fontFamily:"monospace", marginBottom:"10px", boxSizing:"border-box" }} />
          {error && (
            <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"8px",
              padding:"8px 12px", color:"#fca5a5", fontSize:"12px", marginBottom:"10px" }}>
              ⚠ {error}
            </div>
          )}
          <button onClick={saveVisit} disabled={saving}
            style={{ width:"100%", background: saving ? "#334155" : "#3b82f6", color:"#fff",
              border:"none", borderRadius:"12px", padding:"16px", fontSize:"16px",
              fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
            {saving ? "Creating visit..." : "✓ Save & Open Full Notes"}
          </button>
          <p style={{ fontSize:"11px", color:"#475569", textAlign:"center", marginTop:"8px" }}>
            Full SOAP notes, AI assistant, and prescriptions available after saving
          </p>
        </div>
      )}

      {/* Location form */}
      {panel === "location" && (
        <div style={{ background:"#1e293b", borderRadius:"16px", padding:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
            <div style={{ fontSize:"14px", fontWeight:"700", color:"#f1f5f9" }}>Update Room / Location</div>
            <button onClick={() => setPanel("none")} style={{ background:"none", border:"none", color:"#64748b", fontSize:"18px", cursor:"pointer" }}>✕</button>
          </div>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Room 204, Floor 2"
            style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155",
              borderRadius:"10px", color:"#f1f5f9", padding:"14px 16px", fontSize:"15px",
              fontFamily:"inherit", marginBottom:"10px", boxSizing:"border-box" }} />
          <button onClick={saveLocation} disabled={saving}
            style={{ width:"100%", background:"#0f172a", border:"1.5px solid #3b82f6",
              color:"#3b82f6", borderRadius:"12px", padding:"14px", fontSize:"15px",
              fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
            {saving ? "Saving..." : "Update Location"}
          </button>
        </div>
      )}

      {/* Discharge confirm */}
      {panel === "discharge" && (
        <div style={{ background:"#1e293b", border:"1.5px solid #7f1d1d", borderRadius:"16px", padding:"16px" }}>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"#fca5a5", marginBottom:"8px" }}>Confirm Discharge</div>
          <div style={{ fontSize:"13px", color:"#94a3b8", marginBottom:"14px" }}>
            This will mark the patient as discharged today ({today}).
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            <button onClick={() => setPanel("none")}
              style={{ background:"#0f172a", border:"1.5px solid #334155", color:"#64748b",
                borderRadius:"10px", padding:"14px", fontSize:"14px", fontWeight:"600",
                cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={handleDischarge} disabled={saving}
              style={{ background:"#7f1d1d", color:"#fca5a5", border:"none", borderRadius:"10px",
                padding:"14px", fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
              {saving ? "..." : "Discharge"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
