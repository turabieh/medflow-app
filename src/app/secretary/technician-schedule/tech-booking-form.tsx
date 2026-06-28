"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bookTechAppointment } from "@/lib/actions/technician-appointments";

type T = { id:string; full_name:string; specialty:string|null };
type P = { id:string; name:string; price:number|null; duration_min:number };
type Pat = { id:string; full_name:string; phone:string };

export function TechBookingForm({ date, clinicId, technicians, procedures, patients }: {
  date: string; clinicId: string;
  technicians: T[]; procedures: P[]; patients: Pat[];
}) {
  const router = useRouter();
  const [patSearch, setPatSearch] = useState("");
  const [selPat, setSelPat]       = useState<Pat | null>(null);
  const [techId, setTechId]       = useState(technicians[0]?.id ?? "");
  const [procId, setProcId]       = useState(procedures[0]?.id ?? "");
  const [time, setTime]           = useState("09:00");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const filteredPats = patSearch.length > 1
    ? patients.filter(p => p.full_name.toLowerCase().includes(patSearch.toLowerCase()) || p.phone.includes(patSearch))
    : [];

  const selectedProc = procedures.find(p => p.id === procId);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selPat) { setError("Select a patient"); return; }
    if (!techId || !procId) { setError("Select technician and procedure"); return; }
    setSaving(true); setError("");

    const dur = selectedProc?.duration_min ?? 30;
    const [h,m] = time.split(":").map(Number);
    const endMin = h*60+m+dur;
    const endTime = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;

    const result = await bookTechAppointment({
      patientId:    selPat.id,
      technicianId: techId,
      procedureId:  procId,
      apptDate:     date,
      startTime:    time,
      endTime,
      notes:        notes || undefined,
    });

    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setSelPat(null); setPatSearch(""); setNotes(""); setTime("09:00");
    router.refresh();
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <form onSubmit={book} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-neutral-900">+ Book Appointment</h2>
      <p className="text-xs text-neutral-400 -mt-2">for {date}</p>

      {error && <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}

      {/* Patient */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Patient *</label>
        {selPat ? (
          <div className="flex items-center justify-between rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-neutral-900">{selPat.full_name}</p>
              <p className="text-xs text-neutral-500">{selPat.phone}</p>
            </div>
            <button type="button" onClick={() => { setSelPat(null); setPatSearch(""); }}
              className="ml-2 text-neutral-400 hover:text-neutral-600">✕</button>
          </div>
        ) : (
          <div>
            <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
              placeholder="Search patient..." className={inp} />
            {filteredPats.length > 0 && (
              <div className="mt-1 rounded-md border border-neutral-200 bg-white shadow-sm overflow-hidden max-h-40 overflow-y-auto">
                {filteredPats.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => { e.preventDefault(); setSelPat(p); setPatSearch(""); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 border-b border-neutral-50 last:border-0">
                    <span className="font-medium">{p.full_name}</span>
                    <span className="ml-2 text-xs text-neutral-400">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technician */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Technician *</label>
        <select value={techId} onChange={e => setTechId(e.target.value)} className={inp}>
          {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {/* Procedure */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Procedure *</label>
        <select value={procId} onChange={e => setProcId(e.target.value)} className={inp}>
          {procedures.map(p => <option key={p.id} value={p.id}>{p.name}{p.price?` · ${p.price} JOD`:""}</option>)}
        </select>
      </div>

      {/* Time */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Time *</label>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} required className={inp} />
        {selectedProc && <p className="mt-1 text-xs text-neutral-400">Duration: {selectedProc.duration_min} min</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} />
      </div>

      <button type="submit" disabled={saving}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? "Booking..." : "Book Appointment"}
      </button>
    </form>
  );
}
