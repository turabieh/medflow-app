"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Patient   { id:string; full_name:string; phone:string; }
interface Procedure { id:string; name:string; duration_min:number; price:number|null; }

export default function NewTechAppointmentPage() {
  const router = useRouter();
  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [patSearch,  setPatSearch]  = useState("");
  const [selPatient, setSelPatient] = useState<Patient | null>(null);
  const [procId,     setProcId]     = useState("");
  const [date,       setDate]       = useState(new Date().toLocaleDateString("en-CA", { timeZone:"Asia/Amman" }));
  const [time,       setTime]       = useState("09:00");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("technician_procedures").select("id, name, duration_min, price")
      .eq("is_active", true).order("name")
      .then(r => setProcedures(r.data ?? []));
  }, []);

  useEffect(() => {
    if (patSearch.length < 2) { setPatients([]); return; }
    const sb = createClient();
    sb.from("patients").select("id, full_name, phone")
      .or(`full_name.ilike.%${patSearch}%,phone.ilike.%${patSearch}%`)
      .order("full_name").limit(10)
      .then(r => setPatients(r.data ?? []));
  }, [patSearch]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selPatient) { setError("Please select a patient."); return; }
    if (!procId)     { setError("Please select a procedure."); return; }
    setSaving(true); setError("");

    const sb = createClient();
    const { data: profile } = await sb.auth.getUser()
      .then(r => sb.from("users").select("id, clinic_id").eq("id", r.data.user?.id ?? "").single());

    const proc = procedures.find(p => p.id === procId);
    const [h, m] = time.split(":").map(Number);
    const endH = Math.floor((h * 60 + m + (proc?.duration_min ?? 30)) / 60);
    const endM = (h * 60 + m + (proc?.duration_min ?? 30)) % 60;
    const endTime = `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`;

    const { data: appt, error: ae } = await sb.from("technician_appointments").insert({
      clinic_id:      profile?.clinic_id,
      technician_id:  profile?.id,
      patient_id:     selPatient.id,
      procedure_id:   procId,
      appt_date:      date,
      start_time:     time,
      end_time:       endTime,
      status:         "scheduled",
      notes:          notes.trim() || null,
    }).select("id").single();

    setSaving(false);
    if (ae || !appt) { setError(ae?.message ?? "Failed to book."); return; }
    router.push(`/technician/appointments/${appt.id}`);
  }

  const inp = { style:{ width:"100%", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", color:"#0f172a", padding:"10px 14px", fontSize:"14px", fontFamily:"inherit", boxSizing:"border-box" as const, outline:"none" } };

  return (
    <div style={{ maxWidth:"520px", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <h1 style={{ fontSize:"18px", fontWeight:"700", color:"#0f172a", marginBottom:"6px" }}>Book Appointment</h1>
      <p style={{ fontSize:"13px", color:"#64748b", marginBottom:"24px" }}>Schedule a new technician procedure</p>

      <form onSubmit={book} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
        {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", color:"#991b1b", fontSize:"13px" }}>{error}</div>}

        {/* Patient */}
        <div>
          <label style={{ display:"block", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#475569", marginBottom:"6px" }}>Patient *</label>
          {selPatient ? (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:"8px", padding:"10px 14px" }}>
              <div>
                <div style={{ fontSize:"14px", fontWeight:"600", color:"#0f172a" }}>{selPatient.full_name}</div>
                <div style={{ fontSize:"12px", color:"#64748b" }}>{selPatient.phone}</div>
              </div>
              <button type="button" onClick={() => { setSelPatient(null); setPatSearch(""); }}
                style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"18px" }}>✕</button>
            </div>
          ) : (
            <div>
              <input value={patSearch} onChange={e => setPatSearch(e.target.value)} placeholder="Search by name or phone..." {...inp} />
              {patients.length > 0 && (
                <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", overflow:"hidden", marginTop:"4px", boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onMouseDown={e => { e.preventDefault(); setSelPatient(p); setPatSearch(""); }}
                      style={{ width:"100%", background:"none", border:"none", borderBottom:"1px solid #f1f5f9", padding:"10px 14px", textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:"#0f172a" }}>{p.full_name}</div>
                      <div style={{ fontSize:"11px", color:"#94a3b8" }}>{p.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Procedure */}
        <div>
          <label style={{ display:"block", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#475569", marginBottom:"6px" }}>Procedure *</label>
          <select value={procId} onChange={e => setProcId(e.target.value)} required {...inp}>
            <option value="">— Select procedure —</option>
            {procedures.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price} JOD` : ""} ({p.duration_min} min)</option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          <div>
            <label style={{ display:"block", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#475569", marginBottom:"6px" }}>Date *</label>
            <JordanDateInput value={date} onChange={setDate} required {...inp} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#475569", marginBottom:"6px" }}>Time *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required {...inp} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display:"block", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", color:"#475569", marginBottom:"6px" }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes for this appointment..." {...inp} style={{ ...inp.style, resize:"none" }} />
        </div>

        <button type="submit" disabled={saving}
          style={{ background: saving ? "#94a3b8" : "#0f172a", color:"#fff", border:"none", borderRadius:"8px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit" }}>
          {saving ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </div>
  );
}
