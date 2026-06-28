"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bookTechAppointment } from "@/lib/actions/technician-appointments";

type Tech  = { id:string; full_name:string };
type Proc  = { id:string; name:string; price:number|null; duration_min:number; category:string };
type Pat   = { id:string; full_name:string; phone:string };
type InsC  = { id:string; name:string };

function toMin(t:string) { const [h,m]=(t||"00:00").split(":").map(Number); return h*60+m; }
function toTime(m:number) { return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

export function TechBookingForm({ date, clinicId, technicians, procedures, patients, insuranceCompanies, existingAppts }: {
  date: string; clinicId: string;
  technicians: Tech[]; procedures: Proc[]; patients: Pat[];
  insuranceCompanies: InsC[];
  existingAppts: { start_time:string; end_time:string|null; technician_id:string; status:string }[];
}) {
  const router = useRouter();

  const [patSearch, setPatSearch] = useState("");
  const [selPat,    setSelPat]    = useState<Pat | null>(null);
  const [techId,    setTechId]    = useState(technicians[0]?.id ?? "");
  const [procId,    setProcId]    = useState(procedures[0]?.id ?? "");
  const [selTime,   setSelTime]   = useState("");
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  // Payment
  const [payMethod, setPayMethod] = useState<"cash"|"card"|"insurance">("cash");
  const [insId,     setInsId]     = useState("");
  const [insAuth,   setInsAuth]   = useState<"pending"|"approved"|"rejected">("pending");
  const [insAuthNum,setInsAuthNum]= useState("");

  const filteredPats = patSearch.length > 1
    ? patients.filter(p => p.full_name.toLowerCase().includes(patSearch.toLowerCase()) || p.phone.includes(patSearch))
    : [];

  const selectedProc = procedures.find(p => p.id === procId);
  const durationMin  = selectedProc?.duration_min ?? 30;

  // Generate available slots for selected technician
  const availableSlots = (() => {
    const START = 8 * 60;   // 08:00
    const END   = 17 * 60;  // 17:00
    const slots: string[] = [];

    // Build occupied ranges for this technician on this date
    const occupied = existingAppts
      .filter(a => a.technician_id === techId && !["cancelled","no_show"].includes(a.status))
      .map(a => ({
        start: toMin(a.start_time?.slice(0,5) ?? "00:00"),
        end:   a.end_time ? toMin(a.end_time.slice(0,5)) : toMin(a.start_time?.slice(0,5) ?? "00:00") + 30,
      }));

    for (let t = START; t + durationMin <= END; t += 15) {
      const slotEnd = t + durationMin;
      const free = occupied.every(o => slotEnd <= o.start || t >= o.end);
      if (free) slots.push(toTime(t));
    }
    return slots;
  })();

  // Reset time when technician or procedure changes
  useEffect(() => { setSelTime(""); }, [techId, procId]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selPat)  { setError("Select a patient"); return; }
    if (!procId)  { setError("Select a procedure"); return; }
    if (!selTime) { setError("Select a time slot"); return; }
    setSaving(true); setError("");

    const endTime = toTime(toMin(selTime) + durationMin);

    const result = await bookTechAppointment({
      patientId:         selPat.id,
      technicianId:      techId,
      procedureId:       procId,
      apptDate:          date,
      startTime:         selTime,
      endTime,
      notes:             notes || undefined,
      paymentMethod:     payMethod,
      insuranceCompanyId:payMethod === "insurance" ? insId || undefined : undefined,
      insuranceAuthStatus:payMethod === "insurance" ? insAuth : "not_required",
      insuranceAuthNumber:payMethod === "insurance" && insAuthNum ? insAuthNum : undefined,
      amountDue:         selectedProc?.price ?? undefined,
    });

    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setSelPat(null); setPatSearch(""); setNotes(""); setSelTime("");
    setInsId(""); setInsAuthNum(""); setInsAuth("pending");
    router.refresh();
  }

  const inp  = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";
  const lbl  = "mb-1 block text-xs font-semibold text-neutral-600 uppercase tracking-wide";

  return (
    <form onSubmit={book} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-neutral-900">+ Book Appointment</h2>
      <p className="text-xs text-neutral-400 -mt-2">{date}</p>

      {error && <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}

      {/* Patient */}
      <div>
        <label className={lbl}>Patient *</label>
        {selPat ? (
          <div className="flex items-center justify-between rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{selPat.full_name}</p>
              <p className="text-xs text-neutral-500">{selPat.phone}</p>
            </div>
            <button type="button" onClick={() => { setSelPat(null); setPatSearch(""); }} className="text-neutral-400 hover:text-neutral-600 ml-2">✕</button>
          </div>
        ) : (
          <div>
            <input value={patSearch} onChange={e => setPatSearch(e.target.value)} placeholder="Search patient..." className={inp} />
            {filteredPats.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-sm">
                {filteredPats.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => { e.preventDefault(); setSelPat(p); setPatSearch(""); }}
                    className="w-full border-b border-neutral-50 px-3 py-2 text-left text-sm hover:bg-neutral-50 last:border-0">
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
        <label className={lbl}>Technician *</label>
        <select value={techId} onChange={e => setTechId(e.target.value)} className={inp}>
          {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {/* Procedure */}
      <div>
        <label className={lbl}>Procedure *</label>
        <select value={procId} onChange={e => setProcId(e.target.value)} className={inp}>
          {procedures.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.price ? ` · ${p.price} JOD` : ""} · {p.duration_min} min
            </option>
          ))}
        </select>
        {selectedProc && (
          <p className="mt-1 text-[11px] text-neutral-400">Duration: {durationMin} min per session</p>
        )}
      </div>

      {/* Time slots */}
      <div>
        <label className={lbl}>Available Times *</label>
        {availableSlots.length === 0 ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            No available slots for this technician on {date}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {availableSlots.map(slot => (
              <button key={slot} type="button" onClick={() => setSelTime(slot)}
                className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  selTime === slot
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                }`}>
                {slot}
              </button>
            ))}
          </div>
        )}
        {selTime && (
          <p className="mt-1.5 text-xs text-neutral-500">
            {selTime} → {toTime(toMin(selTime) + durationMin)} ({durationMin} min)
          </p>
        )}
      </div>

      {/* Payment */}
      <div>
        <label className={lbl}>Payment</label>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {(["cash","card","insurance"] as const).map(m => (
            <button key={m} type="button" onClick={() => setPayMethod(m)}
              className={`rounded-md border py-2 text-xs font-semibold capitalize transition-colors ${
                payMethod === m ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}>
              {m === "cash" ? "💵 Cash" : m === "card" ? "💳 Card" : "🏥 Insurance"}
            </button>
          ))}
        </div>
        {payMethod === "insurance" && (
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-neutral-500 uppercase">Insurance Company</label>
              <select value={insId} onChange={e => setInsId(e.target.value)} className={inp}>
                <option value="">— Select —</option>
                {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-neutral-500 uppercase">Authorization Status</label>
              <div className="grid grid-cols-3 gap-1">
                {(["pending","approved","rejected"] as const).map(s => (
                  <button key={s} type="button" onClick={() => setInsAuth(s)}
                    className={`rounded-md border py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                      insAuth === s
                        ? s==="approved" ? "border-green-600 bg-green-600 text-white"
                        : s==="rejected" ? "border-red-500 bg-red-500 text-white"
                        : "border-amber-500 bg-amber-500 text-white"
                        : "border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                    }`}>
                    {s === "approved" ? "✓" : s === "rejected" ? "✗" : "⏳"} {s}
                  </button>
                ))}
              </div>
            </div>
            {insAuth === "approved" && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-neutral-500 uppercase">Auth Number</label>
                <input value={insAuthNum} onChange={e => setInsAuthNum(e.target.value)}
                  placeholder="Authorization / referral number" className={inp} />
              </div>
            )}
          </div>
        )}
        {selectedProc?.price && (
          <p className="mt-1.5 text-xs text-neutral-500">Procedure fee: <strong>{selectedProc.price} JOD</strong></p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={lbl}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Any notes..." className={`${inp} resize-none`} />
      </div>

      <button type="submit" disabled={saving || !selTime}
        className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? "Booking..." : "Book Appointment"}
      </button>
    </form>
  );
}
