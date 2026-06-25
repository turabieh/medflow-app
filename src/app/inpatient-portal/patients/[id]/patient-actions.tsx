"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const VISIT_TYPES = [
  { key: "followup",     label: "Round / Follow-up" },
  { key: "consultation", label: "Consultation"      },
  { key: "urgent",       label: "Urgent"            },
  { key: "review",       label: "Review"            },
  { key: "new",          label: "New Visit"         },
];

export function PortalPatientActions({
  inpatientId, patientId, doctorId, clinicId, todayVisitId, isActive,
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
  const router  = useRouter();
  const [panel, setPanel]         = useState<"none"|"visit"|"location"|"discharge">("none");
  const [visitType, setVisitType] = useState("round");
  const [visitFee, setVisitFee]   = useState("");
  const [location, setLocation]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const todayStr  = new Date().toISOString().split("T")[0];
  const [visitDate, setVisitDate] = useState(todayStr);
  const [visitTime, setVisitTime] = useState(new Date().toTimeString().slice(0, 5));

  async function saveVisit() {
    setSaving(true); setError(null);
    try {
      const supabase = createClient();
      const { data: visit, error: ve } = await supabase
        .from("visits")
        .insert({
          clinic_id:      clinicId,
          doctor_id:      doctorId,
          patient_id:     patientId,
          inpatient_id:   inpatientId,
          visit_date:     visitDate,
          visit_time:     visitTime,
          visit_type:     visitType,
          visit_fee:      visitFee ? parseFloat(visitFee) : null,
          visit_fee_type: visitType,
          visit_context:  "inpatient",
          status:         "in_progress",
        })
        .select("id")
        .single();

      if (ve || !visit) {
        setError(ve?.message ?? "Failed to create visit.");
        setSaving(false);
        return;
      }

      router.push(`/inpatient-portal/visit/${visit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setSaving(false);
    }
  }

  async function saveLocation() {
    if (!location.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error: ue } = await supabase
      .from("inpatients")
      .update({ location: location.trim() })
      .eq("id", inpatientId);
    setSaving(false);
    if (ue) { setError(ue.message); return; }
    setPanel("none");
    router.refresh();
  }

  async function handleDischarge() {
    setSaving(true);
    const supabase = createClient();
    const { error: de } = await supabase
      .from("inpatients")
      .update({ status: "discharged", discharge_date: todayStr })
      .eq("id", inpatientId);
    setSaving(false);
    if (de) { setError(de.message); return; }
    setPanel("none");
    router.refresh();
  }

  const btnStyle = (bg: string, color = "#fff", border?: string): React.CSSProperties => ({
    width: "100%", background: bg, color, border: border ?? "none",
    borderRadius: "14px", padding: "16px", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ marginBottom: "16px" }}>
      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #dc2626", borderRadius: "10px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px", marginBottom: "10px" }}>
          ⚠ {error}
        </div>
      )}

      {panel === "none" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isActive && !todayVisitId && (
            <button onClick={() => setPanel("visit")} style={btnStyle("#3b82f6")}>
              + Record Today&apos;s Visit
            </button>
          )}
          {todayVisitId && (
            <button onClick={() => router.push(`/inpatient-portal/visit/${todayVisitId}`)}
              style={btnStyle("#1d4ed8", "#93c5fd")}>
              Open Today&apos;s Visit Notes →
            </button>
          )}
          {isActive && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => setPanel("location")}
                style={{ background: "#1e293b", border: "1.5px solid #334155", color: "#94a3b8", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                📍 Update Room
              </button>
              <button onClick={() => setPanel("discharge")}
                style={{ background: "#1e293b", border: "1.5px solid #7f1d1d", color: "#fca5a5", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                🏠 Discharge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visit form */}
      {panel === "visit" && (
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>New Visit — {visitDate}</div>
            <button onClick={() => setPanel("none")} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
            <div>
              <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>Visit Date</div>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px", color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:"10px", color:"#3b82f6", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px" }}>Time</div>
              <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)}
                style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px", color:"#f1f5f9", padding:"12px 14px", fontSize:"14px", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px" }}>
            {VISIT_TYPES.map(vt => (
              <button key={vt.key} onClick={() => setVisitType(vt.key)}
                style={{ background: visitType === vt.key ? "#3b82f6" : "#0f172a", color: visitType === vt.key ? "#fff" : "#64748b", border: `1.5px solid ${visitType === vt.key ? "#3b82f6" : "#334155"}`, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                {vt.label}
              </button>
            ))}
          </div>

          <input
            type="number" value={visitFee} onChange={e => setVisitFee(e.target.value)}
            placeholder="Visit fee (JOD — optional)" min="0" step="0.01"
            style={{ width: "100%", background: "#0f172a", border: "1.5px solid #334155", borderRadius: "10px", color: "#f1f5f9", padding: "14px 16px", fontSize: "18px", fontFamily: "monospace", marginBottom: "12px", boxSizing: "border-box" }} />

          <button onClick={saveVisit} disabled={saving}
            style={{ width: "100%", background: saving ? "#334155" : "#3b82f6", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
            {saving ? "Creating..." : "✓ Start Visit & Open Notes"}
          </button>
        </div>
      )}

      {/* Location form */}
      {panel === "location" && (
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>Update Room / Location</div>
            <button onClick={() => setPanel("none")} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>✕</button>
          </div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Room 204, Floor 2"
            style={{ width: "100%", background: "#0f172a", border: "1.5px solid #334155", borderRadius: "10px", color: "#f1f5f9", padding: "14px 16px", fontSize: "15px", fontFamily: "inherit", marginBottom: "10px", boxSizing: "border-box" }} />
          <button onClick={saveLocation} disabled={saving}
            style={{ width: "100%", background: "#0f172a", border: "1.5px solid #3b82f6", color: "#3b82f6", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving..." : "Update Location"}
          </button>
        </div>
      )}

      {/* Discharge */}
      {panel === "discharge" && (
        <div style={{ background: "#1e293b", border: "1.5px solid #7f1d1d", borderRadius: "16px", padding: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5", marginBottom: "8px" }}>Confirm Discharge</div>
          <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "14px" }}>
            This will mark the patient as discharged today ({todayStr}).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button onClick={() => setPanel("none")}
              style={{ background: "#0f172a", border: "1.5px solid #334155", color: "#64748b", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleDischarge} disabled={saving}
              style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "..." : "Discharge"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
