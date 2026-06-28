"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TechBookingForm } from "./tech-booking-form";
import { createClient } from "@/lib/supabase/client";

type Tech  = { id:string; full_name:string };
type Proc  = { id:string; name:string; price:number|null; duration_min:number; category:string };
type Pat   = { id:string; full_name:string; phone:string };
type InsC  = { id:string; name:string };

const STATUS_COLOR: Record<string,string> = {
  scheduled:"text-blue-600", in_progress:"text-amber-600",
  done:"text-green-600", cancelled:"text-neutral-400", no_show:"text-red-400",
};
const PAY_BADGE: Record<string,string> = { cash:"💵", card:"💳", insurance:"🏥" };

function toMin(t:string) { const [h,m]=(t||"00:00").split(":").map(Number); return h*60+m; }
function toTime(m:number) { return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

export function TechScheduleView({ date, today, clinicId, technicians, procedures, appointments, patients, insuranceCompanies }: {
  date: string; today: string; clinicId: string;
  technicians: Tech[]; procedures: Proc[]; appointments: any[];
  patients: Pat[]; insuranceCompanies: InsC[];
}) {
  const router  = useRouter();
  const [currentDate, setCurrentDate] = useState(date);

  // Reschedule modal state
  const [rescheduleAppt, setRescheduleAppt] = useState<any | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [savingRS, setSavingRS] = useState(false);
  const [rsMsg, setRsMsg]     = useState("");

  // Cancel
  const [cancelId, setCancelId] = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);

  function navigate(dir: -1|1) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + dir);
    const nd = d.toLocaleDateString("en-CA");
    setCurrentDate(nd);
    router.push(`?date=${nd}`);
  }

  async function cancelAppt(id: string) {
    setSaving(true);
    const sb = createClient();
    await sb.from("technician_appointments").update({ status: "cancelled" }).eq("id", id);
    setSaving(false);
    setCancelId(null);
    router.refresh();
  }

  async function reschedule() {
    if (!rescheduleAppt || !newDate || !newTime) return;
    setSavingRS(true); setRsMsg("");
    const sb = createClient();
    const proc = procedures.find(p => p.id === rescheduleAppt.procedure_id);
    const dur  = proc?.duration_min ?? 30;
    const endTime = toTime(toMin(newTime) + dur);
    const { error } = await sb.from("technician_appointments")
      .update({ appt_date: newDate, start_time: newTime, end_time: endTime, status: "scheduled", updated_at: new Date().toISOString() })
      .eq("id", rescheduleAppt.id);
    setSavingRS(false);
    if (error) { setRsMsg("Failed: " + error.message); return; }
    setRescheduleAppt(null);
    router.refresh();
  }

  // Available slots for reschedule modal
  const rescheduleSlots = (() => {
    if (!rescheduleAppt) return [];
    const proc = procedures.find(p => p.id === rescheduleAppt.procedure_id);
    const dur  = proc?.duration_min ?? 30;
    const occupied = appointments
      .filter(a => a.technician_id === rescheduleAppt.technician_id && a.id !== rescheduleAppt.id && !["cancelled","no_show"].includes(a.status) && a.appt_date === (newDate || currentDate))
      .map(a => ({ start: toMin(a.start_time?.slice(0,5)??"00:00"), end: a.end_time ? toMin(a.end_time.slice(0,5)) : toMin(a.start_time?.slice(0,5)??"00:00")+30 }));
    const slots: string[] = [];
    for (let t = 8*60; t + dur <= 17*60; t += 15) {
      if (occupied.every(o => t+dur <= o.start || t >= o.end)) slots.push(toTime(t));
    }
    return slots;
  })();

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-900">🔬 Tech Schedule</h1>
      </div>

      {/* Date nav */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">←</button>
        <span className="text-sm font-semibold text-neutral-800">
          {currentDate === today ? "Today — " : ""}{currentDate}
        </span>
        <button onClick={() => navigate(1)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">→</button>
        {currentDate !== today && (
          <button onClick={() => { setCurrentDate(today); router.push("?"); }} className="text-xs text-blue-600 hover:underline">Today</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Schedule list */}
        <div className="col-span-2">
          {appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-neutral-500">No technician appointments for {currentDate}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              {appointments.map((a, i) => {
                const p    = (Array.isArray(a.patients)?a.patients[0]:a.patients) as {full_name:string;phone:string}|null;
                const proc = (Array.isArray(a.technician_procedures)?a.technician_procedures[0]:a.technician_procedures) as {name:string;price:number|null}|null;
                const tech = (Array.isArray(a.users)?a.users[0]:a.users) as {full_name:string}|null;
                const pm   = a.payment_method as string|null;
                const ias  = a.insurance_auth_status as string|null;
                const active = ["scheduled","in_progress"].includes(a.status);

                return (
                  <div key={a.id} className={`flex items-center gap-4 px-4 py-3 ${i>0?"border-t border-neutral-100":""}`}>
                    {/* Time */}
                    <div className="w-16 flex-shrink-0 text-center">
                      <p className="font-mono text-sm font-bold text-neutral-800">{(a.start_time as string)?.slice(0,5)}</p>
                      {a.end_time && <p className="font-mono text-[10px] text-neutral-400">{(a.end_time as string)?.slice(0,5)}</p>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{p?.full_name}</p>
                      <p className="text-xs text-neutral-400">
                        {proc?.name}{proc?.price ? ` · ${proc.price} JOD` : ""} · {tech?.full_name}
                      </p>
                    </div>

                    {/* Payment */}
                    {pm && (
                      <span className="text-sm flex-shrink-0" title={pm}>
                        {PAY_BADGE[pm] ?? ""}
                        {pm === "insurance" && ias && (
                          <span className={`ml-1 text-[10px] font-bold ${ias==="approved"?"text-green-600":ias==="rejected"?"text-red-500":"text-amber-500"}`}>
                            {ias==="approved"?"✓":ias==="rejected"?"✗":"⏳"}
                          </span>
                        )}
                      </span>
                    )}

                    {/* Status */}
                    <span className={`text-xs font-semibold capitalize flex-shrink-0 ${STATUS_COLOR[a.status]}`}>
                      {(a.status as string).replace("_"," ")}
                    </span>

                    {/* Actions */}
                    {active && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setRescheduleAppt(a);
                            setNewDate(a.appt_date as string);
                            setNewTime((a.start_time as string)?.slice(0,5) ?? "");
                            setRsMsg("");
                          }}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                          Reschedule
                        </button>
                        <button
                          onClick={() => setCancelId(a.id as string)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking form */}
        <div>
          <TechBookingForm
            date={currentDate}
            clinicId={clinicId}
            technicians={technicians}
            procedures={procedures}
            patients={patients}
            insuranceCompanies={insuranceCompanies}
            existingAppts={appointments.map(a => ({
              start_time:    (a.start_time as string) ?? "00:00",
              end_time:      a.end_time as string|null,
              technician_id: a.technician_id as string,
              status:        a.status as string,
            }))}
          />
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Cancel Appointment?</h3>
            <p className="text-xs text-neutral-500 mb-5">This will mark the appointment as cancelled. The patient will need to be rebooked.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)} className="flex-1 rounded-md border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                Keep
              </button>
              <button onClick={() => cancelAppt(cancelId)} disabled={saving}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Reschedule Appointment</h3>
              <button onClick={() => setRescheduleAppt(null)} className="text-neutral-400 hover:text-neutral-600 text-lg">✕</button>
            </div>

            {/* Patient + procedure info */}
            <div className="rounded-lg bg-neutral-50 px-3 py-2 mb-4 text-xs text-neutral-600">
              {(() => {
                const p = (Array.isArray(rescheduleAppt.patients)?rescheduleAppt.patients[0]:rescheduleAppt.patients) as {full_name:string}|null;
                const proc = (Array.isArray(rescheduleAppt.technician_procedures)?rescheduleAppt.technician_procedures[0]:rescheduleAppt.technician_procedures) as {name:string}|null;
                return <><strong>{p?.full_name}</strong> · {proc?.name}</>;
              })()}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">New Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={inp} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">New Time</label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {rescheduleSlots.map(slot => (
                    <button key={slot} type="button" onClick={() => setNewTime(slot)}
                      className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${
                        newTime === slot
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                      }`}>
                      {slot}
                    </button>
                  ))}
                  {rescheduleSlots.length === 0 && (
                    <p className="col-span-4 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      No free slots on this date. Change the date above.
                    </p>
                  )}
                </div>
                {newTime && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    {newTime} → {toTime(toMin(newTime) + (procedures.find(p => p.id === rescheduleAppt.procedure_id)?.duration_min ?? 30))}
                  </p>
                )}
              </div>
            </div>

            {rsMsg && <p className="mt-2 text-xs text-red-500">{rsMsg}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setRescheduleAppt(null)} className="flex-1 rounded-md border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                Cancel
              </button>
              <button onClick={reschedule} disabled={savingRS || !newDate || !newTime}
                className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
                {savingRS ? "Saving..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
