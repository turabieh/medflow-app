"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Variable {
  key: string; label: string; label_ar?: string;
  type: "text"|"number"|"select"|"boolean"; unit?: string; options?: string; required: boolean;
}

type R = Record<string, unknown>;

export function TechReportForm({ appointment, procedure, patient, existingReport, technicianId, clinicId, technicianName, viewerRole = "technician", backUrl = "/technician" }: {
  appointment: R;
  procedure: { id:string; name:string; name_ar:string|null; variables:Variable[]; price:number|null; category:string } | null;
  patient: { id:string; full_name:string; full_name_ar:string|null; dob:string|null; phone:string; gender:string|null; blood_type:string|null } | null;
  existingReport: R | null;
  technicianId: string;
  clinicId: string;
  technicianName: string;
  viewerRole?: string;
  backUrl?: string;
}) {
  const router = useRouter();
  // Report is always editable (technician can correct mistakes)
  const isFinalized = false;

  // Initialize values from existing report or empty
  const initValues: Record<string,string> = {};
  if (existingReport?.values) {
    const ev = existingReport.values as Record<string,unknown>;
    for (const k of Object.keys(ev)) initValues[k] = String(ev[k] ?? "");
  }

  const [values, setValues] = useState<Record<string,string>>(initValues);
  const [notes, setNotes]   = useState((existingReport?.notes as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [status, setStatus] = useState((appointment.status as string));

  const age = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25*86400000)) : null;
  const vars = procedure?.variables ?? [];

  async function save(finalize = false) {
    setSaving(true); setMsg("");
    const sb = createClient();

    // Validate required fields
    if (finalize) {
      for (const v of vars) {
        if (v.required && !values[v.key]?.trim()) {
          setMsg(`⚠ "${v.label}" is required.`);
          setSaving(false); return;
        }
      }
    }

    const reportPayload = {
      clinic_id:      clinicId,
      appointment_id: appointment.id as string,
      technician_id:  technicianId,
      patient_id:     patient?.id,
      procedure_id:   procedure?.id ?? null,
      values:         values,
      notes:          notes.trim() || null,
      status:         finalize ? "finalized" : "draft",
      finalized_at:   finalize ? new Date().toISOString() : null,
    };

    if (existingReport) {
      await sb.from("technician_reports").update(reportPayload).eq("id", existingReport.id as string);
    } else {
      await sb.from("technician_reports").insert(reportPayload);
    }

    // Update appointment status
    const apptStatus = finalize ? "done" : "in_progress";
    await sb.from("technician_appointments").update({ status: apptStatus, updated_at: new Date().toISOString() }).eq("id", appointment.id as string);
    setStatus(apptStatus);

    setSaving(false);
    setMsg(finalize ? "✓ Report finalized" : "✓ Draft saved");
    if (finalize) setTimeout(() => router.push("/technician"), 1200);
    else router.refresh();
  }

  const fieldStyle: React.CSSProperties = {
    width:"100%", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:"8px",
    color:"#0f172a", padding:"10px 14px", fontSize:"14px", fontFamily:"inherit",
    boxSizing:"border-box", outline:"none",
  };

  function renderField(v: Variable) {
    const val = values[v.key] ?? "";
    const set = (x:string) => setValues(prev => ({...prev, [v.key]:x}));

    if (v.type === "boolean") return (
      <div style={{ display:"flex", gap:"8px" }}>
        {["Yes","No"].map(opt => (
          <button key={opt} type="button" onClick={() => set(opt)} disabled={isFinalized}
            style={{ flex:1, background: val===opt ? "#0f172a" : "#f8fafc", color: val===opt ? "#fff" : "#475569",
              border:`1.5px solid ${val===opt?"#0f172a":"#e2e8f0"}`, borderRadius:"8px", padding:"10px",
              fontSize:"14px", fontWeight:"600", cursor: isFinalized?"default":"pointer", fontFamily:"inherit" }}>
            {opt}
          </button>
        ))}
      </div>
    );

    if (v.type === "select") {
      const opts = (v.options ?? "").split(",").map(o=>o.trim()).filter(Boolean);
      return (
        <select value={val} onChange={e => set(e.target.value)} disabled={isFinalized} style={fieldStyle}>
          <option value="">— Select —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    return (
      <input type={v.type === "number" ? "number" : "text"}
        value={val} onChange={e => set(e.target.value)} disabled={isFinalized}
        placeholder={v.unit ? `Value in ${v.unit}` : "Enter value"}
        style={fieldStyle} />
    );
  }

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
        <Link href={backUrl} style={{ color:"#94a3b8", textDecoration:"none", fontSize:"20px" }}>←</Link>
        <div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:"#0f172a" }}>{procedure?.name ?? "Procedure"}</div>
          <div style={{ fontSize:"12px", color:"#64748b" }}>
            {appointment.appt_date as string} at {(appointment.start_time as string)?.slice(0,5)}
            {" · "}
            <span style={{ color: status==="done" ? "#16a34a" : status==="in_progress" ? "#d97706" : "#3b82f6", fontWeight:"600", textTransform:"capitalize" }}>
              {status?.replace("_"," ")}
            </span>
            {procedure?.price && <span> · {procedure.price} JOD</span>}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"20px" }}>
        {/* Patient info */}
        <div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"16px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#94a3b8", margin:"0 0 12px" }}>Patient</h3>
            <div style={{ fontSize:"16px", fontWeight:"700", color:"#0f172a", marginBottom:"2px" }}>{patient?.full_name}</div>
            {patient?.full_name_ar && <div style={{ fontSize:"13px", color:"#94a3b8", direction:"rtl", marginBottom:"8px" }}>{patient.full_name_ar}</div>}
            {[
              ["Phone",      patient?.phone],
              ["Age",        age !== null ? `${age} years` : null],
              ["Gender",     patient?.gender],
              ["Blood Type", patient?.blood_type],
            ].filter(r => r[1]).map(([label, val]) => (
              <div key={label as string} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f8fafc" }}>
                <span style={{ fontSize:"12px", color:"#94a3b8" }}>{label}</span>
                <span style={{ fontSize:"12px", fontWeight:"600", color:"#0f172a" }}>{val as string}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Report form */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#94a3b8", margin:"0 0 16px" }}>
            {isFinalized ? "Report (Finalized)" : "Report Entry"}
          </h3>

          {msg && (
            <div style={{ background: msg.startsWith("⚠") ? "#fef2f2" : "#f0fdf4",
              border:`1px solid ${msg.startsWith("⚠")?"#fecaca":"#bbf7d0"}`,
              borderRadius:"8px", padding:"9px 14px", color: msg.startsWith("⚠")?"#991b1b":"#166534",
              fontSize:"13px", marginBottom:"16px" }}>
              {msg}
            </div>
          )}

          {/* Variables */}
          {vars.length > 0 ? (
            <div style={{ display:"grid", gridTemplateColumns: vars.length > 2 ? "1fr 1fr" : "1fr", gap:"14px", marginBottom:"16px" }}>
              {vars.map(v => (
                <div key={v.key}>
                  <label style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"6px" }}>
                    <span style={{ fontSize:"12px", fontWeight:"600", color:"#374151" }}>
                      {v.label}
                      {v.required && <span style={{ color:"#ef4444", marginLeft:"2px" }}>*</span>}
                    </span>
                    <div style={{ textAlign:"right" }}>
                      {v.unit && <span style={{ fontSize:"11px", color:"#94a3b8" }}>{v.unit}</span>}
                      {v.label_ar && <span style={{ fontSize:"11px", color:"#94a3b8", display:"block", direction:"rtl" }}>{v.label_ar}</span>}
                    </div>
                  </label>
                  {renderField(v)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background:"#f8fafc", borderRadius:"8px", padding:"16px", textAlign:"center", marginBottom:"16px", color:"#94a3b8", fontSize:"13px" }}>
              No variables defined for this procedure
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom:"16px" }}>
            <label style={{ display:"block", fontSize:"12px", fontWeight:"600", color:"#374151", marginBottom:"6px" }}>
              Clinical Notes
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isFinalized}
              rows={4} placeholder="Findings, observations, recommendations..."
              style={{ ...fieldStyle, resize:"none", lineHeight:"1.6" }} />
          </div>

          {/* Technician signature line */}
          <div style={{ padding:"10px 14px", background:"#f8fafc", borderRadius:"8px", marginBottom:"16px", fontSize:"12px", color:"#64748b" }}>
            Technician: <strong style={{ color:"#0f172a" }}>{technicianName}</strong>
          </div>

          {/* Actions */}
          {!isFinalized && (
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => save(false)} disabled={saving}
                style={{ flex:1, background:"#f1f5f9", color:"#475569", border:"none", borderRadius:"8px", padding:"11px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}>
                {saving ? "Saving..." : "💾 Save Draft"}
              </button>
              <button onClick={() => save(true)} disabled={saving}
                style={{ flex:2, background:"#0f172a", color:"#fff", border:"none", borderRadius:"8px", padding:"11px", fontSize:"13px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
                {saving ? "Finalizing..." : "✓ Finalize Report"}
              </button>
            </div>
          )}
          {isFinalized && (
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px", padding:"12px 16px", fontSize:"13px", color:"#166534", fontWeight:"600" }}>
              ✓ Previously finalized — {existingReport?.finalized_at ? new Date(existingReport.finalized_at as string).toLocaleString("en-GB", {timeZone:"Asia/Amman"}) : ""}. You can still edit and re-finalize.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
