"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

import { todayJordan } from "@/lib/client-timezone";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCHEDULE_SETTINGS,
  getAvailableSlotsForDoctor,
  getAllSlotsWithBookingCount,
  isDateAllowed,
  type VisitType,
  type DoctorWorkingHours,
  type DoctorScheduleBlock,
} from "@/lib/scheduling/slots";
import { bookWalkInAppointment } from "@/lib/actions/appointments";

function formatSlot(t: string) { const [h,m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; }

interface Doctor { id: string; full_name: string; }
interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface BookedSlot { doctorId: string; date: string; startTime: string; endTime: string; patientName: string; noAnswerFlag?: boolean; }

export function NewAppointmentForm({
  clinicId,
  doctors,
  workingHours,
  blocks,
  symptoms,
  preloadedPatient,
  bookedSlots = [],
  visitDurations = {},
}: {
  clinicId: string;
  doctors: Doctor[];
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
  symptoms: Symptom[];
  preloadedPatient: { id: string; full_name: string; phone: string } | null;
  bookedSlots?: BookedSlot[];
  visitDurations?: Record<string, number>;
}) {
  const router = useRouter();

  const [patientSearch, setPatientSearch] = useState(preloadedPatient?.full_name ?? "");
  const [patientId, setPatientId] = useState(preloadedPatient?.id ?? "");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [apptDate, setApptDate] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("new");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [symptomIds, setSymptomIds] = useState<Set<string>>(new Set());
  const [overbookMode, setOverbookMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlot("");
    setOverbookMode(false);
  }, [doctorId, apptDate, visitType]);

  async function handlePatientSearch(q: string) {
    setPatientSearch(q);
    setPatientId("");
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.patients ?? []);
    setSearching(false);
  }

  const doctorDays = workingHours.filter(wh => wh.doctorId === doctorId).map(wh => wh.dayOfWeek);
  const effectiveSettings = useMemo(() => {
    const base = doctorDays.length > 0
      ? { ...DEFAULT_SCHEDULE_SETTINGS, workingDays: doctorDays }
      : DEFAULT_SCHEDULE_SETTINGS;
    return Object.keys(visitDurations).length > 0 ? { ...base, visitDurations } : base;
  }, [doctorDays, visitDurations]);
  const dateCheck = apptDate ? isDateAllowed(apptDate, effectiveSettings) : { allowed: true };

  // Normal available slots
  const availableSlots = useMemo(() => {
    if (!apptDate || !doctorId || !dateCheck.allowed) return [];
    const existing = bookedSlots
      .filter(b => b.doctorId === doctorId && b.date === apptDate)
      .map(b => ({
        id: `${b.doctorId}-${b.date}-${b.startTime}`,
        start_time: b.startTime,
        end_time: b.endTime,
        visit_type: "follow_up" as VisitType,
        status: "booked",
        doctor_id: b.doctorId,
      }));
    return getAvailableSlotsForDoctor(doctorId, apptDate, visitType, workingHours, blocks, existing, undefined, effectiveSettings);
  }, [doctorId, apptDate, visitType, workingHours, blocks, dateCheck.allowed, bookedSlots, effectiveSettings]);

  // All slots with booking counts (for overbook mode)
  const allSlotsWithCount = useMemo(() => {
    if (!apptDate || !doctorId) return [];
    return getAllSlotsWithBookingCount(doctorId, apptDate, workingHours, bookedSlots);
  }, [doctorId, apptDate, workingHours, bookedSlots]);

  // Flagged slots: 3x no-answer — soft blocked, can be overbooked freely
  const flaggedSlots = useMemo(() => {
    if (!apptDate || !doctorId) return [] as BookedSlot[];
    return bookedSlots.filter(b => b.doctorId === doctorId && b.date === apptDate && b.noAnswerFlag);
  }, [bookedSlots, doctorId, apptDate]);

  const noAvailableSlots = availableSlots.length === 0 && flaggedSlots.length === 0 && apptDate && dateCheck.allowed;

  // Is the currently selected slot a conflict?
  const selectedSlotCount = useMemo(() => {
    if (!selectedSlot || !overbookMode) return 0;
    return allSlotsWithCount.find(s => s.time === selectedSlot)?.count ?? 0;
  }, [selectedSlot, overbookMode, allSlotsWithCount]);

  // Who is already booked at the selected slot?
  const conflictingPatients = useMemo(() => {
    if (!selectedSlot || !overbookMode || selectedSlotCount === 0) return [];
    return bookedSlots
      .filter(b => b.doctorId === doctorId && b.date === apptDate && b.startTime.slice(0, 5) === selectedSlot)
      .map(b => b.patientName);
  }, [selectedSlot, overbookMode, selectedSlotCount, bookedSlots, doctorId, apptDate]);

  function toggleSymptom(id: string) {
    setSymptomIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!patientId) { setError("Select a patient first."); return; }
    if (!doctorId)  { setError("Select a doctor."); return; }
    if (!apptDate)  { setError("Select a date."); return; }
    if (!selectedSlot) { setError("Select a time slot."); return; }

    setLoading(true);
    const result = await bookWalkInAppointment({
      clinicId,
      patientId,
      doctorId,
      apptDate,
      startTime: selectedSlot,
      visitType,
      secretaryNotes: notes,
      symptomIds: Array.from(symptomIds),
      isOverbooked: (overbookMode && selectedSlotCount > 0) || flaggedSlots.some(f => f.startTime === selectedSlot),
    });
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Could not book."); return; }
    router.push("/secretary/appointments");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Patient search */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Patient</label>
        <div className="relative">
          <input
            type="text"
            value={patientSearch}
            onChange={e => handlePatientSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {searching && <p className="mt-1 text-xs text-neutral-400">Searching...</p>}
          {searchResults.length > 0 && !patientId && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
              {searchResults.map(p => (
                <li key={p.id}>
                  <button type="button"
                    onClick={() => { setPatientId(p.id); setPatientSearch(p.full_name); setSearchResults([]); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
                    {p.full_name} <span className="text-xs text-neutral-400 font-mono">{p.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {patientId && <p className="mt-1 text-xs text-green-600">✓ Patient selected</p>}
      </div>

      {/* Doctor */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Doctor</label>
        <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>

      {/* Date + Visit type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Date</label>
          <JordanDateInput value={apptDate} onChange={setApptDate} min={todayJordan()}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Visit type</label>
          <select value={visitType} onChange={e => setVisitType(e.target.value as VisitType)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="new">New patient{visitDurations.new ? ` (${visitDurations.new} min)` : " (45 min)"}</option>
            <option value="follow_up">Follow-up{visitDurations.follow_up ? ` (${visitDurations.follow_up} min)` : " (30 min)"}</option>
            <option value="urgent">Urgent{visitDurations.urgent ? ` (${visitDurations.urgent} min)` : " (15 min)"}</option>
            <option value="consultation">Consultation{visitDurations.consultation ? ` (${visitDurations.consultation} min)` : " (30 min)"}</option>
          </select>
        </div>
      </div>

      {/* Time slot selection */}
      {apptDate && doctorId && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700">
              {overbookMode ? "All time slots (overbook mode)" : "Available time slots"}
            </label>
            {/* Show overbook toggle if: no slots available OR slots exist but secretary wants to override */}
            {apptDate && dateCheck.allowed && (
              <button
                type="button"
                onClick={() => { setOverbookMode(m => !m); setSelectedSlot(""); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  overbookMode
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                }`}
              >
                {overbookMode ? "✕ Cancel overbook" : "⚡ Overbook"}
              </button>
            )}
          </div>

          {!dateCheck.allowed && (
            <p className="text-xs text-red-500">Doctor does not work on this day.</p>
          )}

          {/* Normal mode */}
          {!overbookMode && dateCheck.allowed && (
            <>
              {availableSlots.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                  <p className="font-medium text-amber-800">No available slots on this date.</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Use <strong>⚡ Overbook</strong> to book this patient into an already-occupied slot.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Normal available slots */}
                  {availableSlots.map(slot => (
                    <button key={slot} type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        selectedSlot === slot
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                      }`}>
                      {formatSlot(slot)}
                    </button>
                  ))}
                  {/* Flagged slots (3× no-answer) — can be rebooked */}
                  {flaggedSlots.length > 0 && (
                    <div className="col-span-4 mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
                      <p className="mb-1 text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                        🚩 Flagged slots — patient did not answer 3×, can be overbooked
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {flaggedSlots.map(f => (
                          <button key={f.startTime} type="button"
                            onClick={() => { setSelectedSlot(f.startTime); }}
                            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                              selectedSlot === f.startTime
                                ? "border-red-700 bg-red-700 text-white"
                                : "border-red-300 bg-white text-red-700 hover:bg-red-100"
                            }`}>
                            {formatSlot(f.startTime)}
                            <span className="ml-1 opacity-70">🚩</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-red-400">
                        {flaggedSlots[0].patientName} — existing appointment will remain in system
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Overbook mode */}
          {overbookMode && dateCheck.allowed && (
            <>
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <strong>Overbook mode:</strong> Slots with 1 booking can be overbooked once. 
                Slots with 2 bookings are fully blocked.
              </div>
              {allSlotsWithCount.length === 0 ? (
                <p className="text-xs text-neutral-500">No working hours set for this doctor on this day.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {allSlotsWithCount.map(({ time, count }) => {
                    const fullyBooked = count >= 2;
                    const isSelected = selectedSlot === time;
                    const hasOne = count === 1;
                    return (
                      <button key={time} type="button"
                        disabled={fullyBooked}
                        onClick={() => setSelectedSlot(time)}
                        className={`relative rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                          fullyBooked
                            ? "border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed"
                            : isSelected
                            ? "border-amber-600 bg-amber-500 text-white"
                            : hasOne
                            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}>
                        {formatSlot(time)}
                        {count > 0 && !fullyBooked && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                            {count}
                          </span>
                        )}
                        {fullyBooked && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-400 text-[9px] font-bold text-white">
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Conflict warning for selected overbook slot */}
              {selectedSlot && selectedSlotCount > 0 && (
                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-medium">⚠ Overbooking {formatSlot(selectedSlot)}</p>
                  <p className="mt-0.5">Already booked: <strong>{conflictingPatients.join(", ")}</strong></p>
                  <p className="mt-0.5 text-amber-600">This appointment will be marked as overbooked for the doctor.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Symptoms */}
      {symptoms.filter(s => s.category === "basic").length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-700">Symptoms (optional)</label>
          <div className="grid grid-cols-2 gap-1.5">
            {symptoms.filter(s => s.category === "basic").map(s => (
              <label key={s.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input type="checkbox" checked={symptomIds.has(s.id)} onChange={() => toggleSymptom(s.id)}
                  className="accent-red-500" />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">Secretary notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Any notes for the doctor..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <button type="submit" disabled={loading || !selectedSlot}
        className={`w-full rounded-md py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
          overbookMode && selectedSlotCount > 0
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-neutral-900 hover:bg-neutral-800"
        }`}>
        {loading ? "Booking..." : overbookMode && selectedSlotCount > 0 ? "⚡ Confirm Overbook" : "Book Appointment"}
      </button>
    </form>
  );
}
