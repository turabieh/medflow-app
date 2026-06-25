"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Doctor { id: string; name: string; specialty: string | null; }
interface Hospital { id: string; name: string; }
interface Patient {
  id: string; full_name: string; full_name_ar: string | null;
  dob: string | null; gender: string | null; blood_type: string | null;
}
interface Inpatient {
  id: string; hospital_patient_id: string; location: string | null;
  status: string; admitted_at: string;
  hospitals: Hospital | Hospital[] | null;
  patients: Patient | Patient[] | null;
}
interface Group { hospital: Hospital; patients: Inpatient[] | null; }

const VISIT_TYPES = [
  { key:"round",        label:"Morning Round" },
  { key:"followup",     label:"Follow-up" },
  { key:"consultation", label:"Consultation" },
  { key:"urgent",       label:"Urgent" },
  { key:"review",       label:"Review" },
];

function age(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
}

function pat(ip: Inpatient): Patient | null {
  return (Array.isArray(ip.patients) ? ip.patients[0] : ip.patients) ?? null;
}

export function InpatientPortalClient({ doctor, groups, visitedToday, today, clinicId }: {
  doctor: Doctor;
  groups: Group[];
  visitedToday: string[];
  today: string;
  clinicId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Inpatient | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitType, setVisitType] = useState("round");
  const [visitFee, setVisitFee] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedToday, setSavedToday] = useState(new Set(visitedToday));
  const [error, setError] = useState<string | null>(null);

  const totalPatients = groups.reduce((s, g) => s + (g.patients?.length ?? 0), 0);
  const visitedCount  = [...savedToday].length;

  async function handleSaveVisit() {
    if (!selected) return;
    setSaving(true); setError(null);
    const supabase = createClient();

    const { data: visit, error: ve } = await supabase.from("visits").insert({
      clinic_id:   clinicId,
      doctor_id:   doctor.id,
      patient_id:  pat(selected)?.id,
      inpatient_id: selected.id,
      visit_date:  today,
      visit_type:  visitType,
      visit_fee:   visitFee ? parseFloat(visitFee) : null,
      visit_context: "inpatient",
      status:      "done",
      symptoms:    visitNote || null,
    }).select("id").single();

    setSaving(false);
    if (ve || !visit) { setError(ve?.message ?? "Failed to save."); return; }

    setSavedToday(prev => new Set([...prev, selected.id]));
    setShowVisitForm(false);
    setVisitNote(""); setVisitFee(""); setVisitType("round");
    // Open full visit page for detailed notes
    router.push(`/doctor/visit/${visit.id}`);
  }

  const s = {
    card: { background:"#1e293b", borderRadius:"16px", padding:"16px", marginBottom:"12px" } as React.CSSProperties,
    pill: (color: string) => ({ background:color, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:"600", display:"inline-block" } as React.CSSProperties),
  };

  if (selected && showVisitForm) {
    const p = pat(selected);
    return (
      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"16px", fontFamily:"system-ui,sans-serif" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
          <button onClick={() => { setShowVisitForm(false); setSelected(null); }}
            style={{ background:"#334155", border:"none", color:"#94a3b8", borderRadius:"10px", padding:"8px 14px", fontSize:"14px", cursor:"pointer" }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>{p?.full_name}</div>
            <div style={{ fontSize:"11px", color:"#64748b" }}>{selected.location} · MRN: {selected.hospital_patient_id}</div>
          </div>
        </div>

        <div style={{ background:"#1e293b", borderRadius:"16px", padding:"20px", marginBottom:"16px" }}>
          <div style={{ fontSize:"13px", fontWeight:"700", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"16px" }}>
            New Visit — {today}
          </div>

          {/* Visit type */}
          <div style={{ marginBottom:"16px" }}>
            <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"8px" }}>Visit Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {VISIT_TYPES.map(vt => (
                <button key={vt.key} onClick={() => setVisitType(vt.key)}
                  style={{ background: visitType === vt.key ? "#3b82f6" : "#0f172a", color: visitType === vt.key ? "#fff" : "#94a3b8",
                    border: `1.5px solid ${visitType === vt.key ? "#3b82f6" : "#334155"}`, borderRadius:"10px",
                    padding:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }}>
                  {vt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visit fee */}
          <div style={{ marginBottom:"16px" }}>
            <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px" }}>Visit Fee (JOD)</label>
            <input type="number" value={visitFee} onChange={e => setVisitFee(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px",
                color:"#f1f5f9", padding:"12px 16px", fontSize:"18px", fontFamily:"monospace", boxSizing:"border-box" }} />
          </div>

          {/* Quick note */}
          <div style={{ marginBottom:"16px" }}>
            <label style={{ fontSize:"12px", color:"#64748b", display:"block", marginBottom:"6px" }}>Quick Note</label>
            <textarea value={visitNote} onChange={e => setVisitNote(e.target.value)} rows={3}
              placeholder="Brief note about this visit..."
              style={{ width:"100%", background:"#0f172a", border:"1.5px solid #334155", borderRadius:"10px",
                color:"#f1f5f9", padding:"12px 16px", fontSize:"14px", resize:"none", boxSizing:"border-box" }} />
          </div>

          {error && <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:"8px", padding:"10px", color:"#fca5a5", fontSize:"13px", marginBottom:"12px" }}>⚠ {error}</div>}

          <button onClick={handleSaveVisit} disabled={saving}
            style={{ width:"100%", background: saving ? "#334155" : "#3b82f6", color:"#fff", border:"none",
              borderRadius:"12px", padding:"18px", fontSize:"17px", fontWeight:"800", cursor:"pointer" }}>
            {saving ? "Saving..." : "✓ Save & Open Full Notes"}
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    const p = pat(selected);
    const a = age(p?.dob ?? null);
    const visited = savedToday.has(selected.id);
    return (
      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"16px", fontFamily:"system-ui,sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
          <button onClick={() => setSelected(null)}
            style={{ background:"#334155", border:"none", color:"#94a3b8", borderRadius:"10px", padding:"8px 14px", fontSize:"14px", cursor:"pointer" }}>
            ← List
          </button>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>Patient File</div>
        </div>

        {/* Patient card */}
        <div style={s.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
            <div>
              <div style={{ fontSize:"20px", fontWeight:"800", color:"#f1f5f9" }}>{p?.full_name}</div>
              {p?.full_name_ar && <div style={{ fontSize:"13px", color:"#64748b", direction:"rtl", marginTop:"2px" }}>{p.full_name_ar}</div>}
            </div>
            {visited
              ? <span style={s.pill("#166534")}>✓ Visited Today</span>
              : <span style={s.pill("#7c2d12")}>Not visited</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
            {[
              ["MRN", selected.hospital_patient_id],
              a !== null ? ["Age", `${a} yrs`] : null,
              p?.gender ? ["Gender", p.gender] : null,
              p?.blood_type ? ["Blood", p.blood_type] : null,
              ["Room", selected.location ?? "—"],
            ].filter(Boolean).map((row, i) => row && (
              <div key={i} style={{ background:"#0f172a", borderRadius:"10px", padding:"10px 12px" }}>
                <div style={{ fontSize:"10px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"3px" }}>{row[0]}</div>
                <div style={{ fontSize:"14px", fontWeight:"700", color:"#e2e8f0" }}>{row[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"16px" }}>
          <button onClick={() => setShowVisitForm(true)}
            style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:"14px", padding:"18px",
              fontSize:"16px", fontWeight:"700", cursor:"pointer" }}>
            + Record Today&apos;s Visit
          </button>
          <button onClick={() => router.push(`/doctor/inpatients/${selected.id}`)}
            style={{ background:"#1e293b", color:"#94a3b8", border:"1.5px solid #334155", borderRadius:"14px",
              padding:"16px", fontSize:"15px", fontWeight:"600", cursor:"pointer" }}>
            Open Full File →
          </button>
        </div>
      </div>
    );
  }

  // Patient list
  return (
    <div style={{ maxWidth:"480px", margin:"0 auto", padding:"16px", fontFamily:"system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#1e293b", borderRadius:"16px", padding:"16px 20px", marginBottom:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", color:"#475569", textTransform:"uppercase", letterSpacing:"1px" }}>Inpatient Portal</div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#f1f5f9", marginTop:"2px" }}>Dr. {doctor.name.replace(/^Dr\.?\s*/i,"")}</div>
            {doctor.specialty && <div style={{ fontSize:"12px", color:"#64748b", marginTop:"1px" }}>{doctor.specialty}</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"22px", fontWeight:"800", color:"#3b82f6" }}>{visitedCount}/{totalPatients}</div>
            <div style={{ fontSize:"10px", color:"#475569" }}>Visited today</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop:"12px", background:"#0f172a", borderRadius:"4px", height:"4px" }}>
          <div style={{ background:"#3b82f6", height:"4px", borderRadius:"4px",
            width: totalPatients > 0 ? `${(visitedCount/totalPatients)*100}%` : "0%" }} />
        </div>
      </div>

      {/* Today */}
      <div style={{ fontSize:"11px", color:"#475569", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"12px" }}>
        {new Date(today).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}
      </div>

      {groups.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#475569" }}>
          <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏥</div>
          <div style={{ fontSize:"16px", fontWeight:"600", color:"#64748b" }}>No active inpatients</div>
          <div style={{ fontSize:"13px", color:"#475569", marginTop:"6px" }}>All patients have been discharged.</div>
        </div>
      ) : groups.map(g => (
        <div key={g.hospital.id} style={{ marginBottom:"20px" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:"#3b82f6", textTransform:"uppercase",
            letterSpacing:"1px", marginBottom:"8px", paddingLeft:"4px" }}>
            🏨 {g.hospital.name}
          </div>
          {(g.patients ?? []).map(ip => {
            const p = pat(ip);
            const a = age(p?.dob ?? null);
            const visited = savedToday.has(ip.id);
            return (
              <button key={ip.id} onClick={() => setSelected(ip)}
                style={{ width:"100%", background:"#1e293b", border: visited ? "1.5px solid #166534" : "1.5px solid #334155",
                  borderRadius:"14px", padding:"14px 16px", textAlign:"left", cursor:"pointer",
                  marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>{p?.full_name}</div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"3px" }}>
                    {ip.location ?? "—"}
                    {a !== null && <span style={{ marginLeft:"8px" }}>{a} yrs</span>}
                    {p?.blood_type && <span style={{ marginLeft:"8px", color:"#ef4444" }}>{p.blood_type}</span>}
                    <span style={{ marginLeft:"8px", fontFamily:"monospace", color:"#475569" }}>{ip.hospital_patient_id}</span>
                  </div>
                </div>
                <div style={{ flexShrink:0, marginLeft:"12px" }}>
                  {visited
                    ? <span style={{ fontSize:"20px" }}>✅</span>
                    : <span style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:"8px",
                        padding:"6px 10px", fontSize:"12px", color:"#64748b" }}>Visit →</span>}
                </div>
              </button>
            );
          })}
        </div>
      ))}

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1e293b",
        borderTop:"1px solid #334155", padding:"12px 20px", display:"flex", justifyContent:"space-around",
        maxWidth:"480px", margin:"0 auto" }}>
        <button onClick={() => router.push("/doctor/dashboard")}
          style={{ background:"none", border:"none", color:"#475569", fontSize:"12px", cursor:"pointer", fontFamily:"system-ui" }}>
          🏠 Dashboard
        </button>
        <button onClick={() => router.refresh()}
          style={{ background:"none", border:"none", color:"#3b82f6", fontSize:"12px", cursor:"pointer", fontFamily:"system-ui" }}>
          🔄 Refresh
        </button>
        <button onClick={async () => { const s = createClient(); await s.auth.signOut(); router.push("/login"); }}
          style={{ background:"none", border:"none", color:"#475569", fontSize:"12px", cursor:"pointer", fontFamily:"system-ui" }}>
          ↩ Sign Out
        </button>
      </div>
      <div style={{ height:"64px" }} />
    </div>
  );
}
