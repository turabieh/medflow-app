"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCHEDULE_SETTINGS,
  getAvailableSlotsForDoctor,
  isDateAllowed,
  slotLabel,
  type VisitType,
  type DoctorWorkingHours,
  type DoctorScheduleBlock,
} from "@/lib/scheduling/slots";
import { bookWalkInAppointment } from "@/lib/actions/appointments";

interface Doctor { id: string; full_name: string; }
interface Symptom { id: string; name: string; name_ar: string | null; }

export function NewAppointmentForm({
  clinicId,
  doctors,
  workingHours,
  blocks,
  symptoms,
  preloadedPatient,
}: {
  clinicId: string;
  doctors: Doctor[];
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
  symptoms: Symptom[];
  preloadedPatient: { id: string; full_name: string; phone: string } | null;
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlot("");
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

  const doctorDays = workingHours.filter((wh) => wh.doctorId === doctorId).map((wh) => wh.dayOfWeek);
  const effectiveSettings = doctorDays.length > 0
    ? { ...DEFAULT_SCHEDULE_SETTINGS, workingDays: doctorDays }
    : DEFAULT_SCHEDULE_SETTINGS;
  const dateCheck = apptDate ? isDateAllowed(apptDate, effectiveSettings) : { allowed: true };

  const availableSlots = useMemo(() => {
    if (!apptDate || !doctorId || !dateCheck.allowed) return [];
    return getAvailableSlotsForDoctor(doctorId, apptDate, visitType, workingHours, blocks, []);
  }, [doctorId, apptDate, visitType, workingHours, blocks, dateCheck.allowed]);

  function toggleSymptom(id: string) {
    setSymptomIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) { setError("Select a patient first."); return; }
    if (!doctorId) { setError("Select a doctor."); return; }
    if (!apptDate) { setError("Select a date."); return; }
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
    });
    setLoading(false);

    if (!result.success) { setError(result.error ?? "Could not book."); return; }
    router.push("/secretary/appointments");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Patient selection */}
      <div className="relative">
        <label className="mb-1 block text-xs text-neutral-600">Patient</label>
        {patientId && preloadedPatient ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <span>{preloadedPatient.full_name}</span>
            <button type="button" onClick={() => { setPatientId(""); setPatientSearch(""); }}
              className="text-xs text-neutral-400 hover:text-neutral-700">Change</button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => handlePatientSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            {searching && <p className="mt-1 text-xs text-neutral-400">Searching...</p>}
            {searchResults.length > 0 && !patientId && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
                {searchResults.map((p) => (
                  <button key={p.id} type="button"
                    onClick={() => { setPatientId(p.id); setPatientSearch(p.full_name); setSearchResults([]); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50">
                    <span>{p.full_name}</span>
                    <span className="font-mono text-xs text-neutral-400">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Doctor</label>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Visit type</label>
          <select value={visitType} onChange={(e) => setVisitType(e.target.value as VisitType)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="new">New patient (45 min)</option>
            <option value="followup">Follow-up (30 min)</option>
            <option value="review">Review (15 min)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Date</label>
          <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Time slot</label>
          {!apptDate ? (
            <p className="text-xs text-neutral-400 mt-2">Select a date first</p>
          ) : !dateCheck.allowed ? (
            <p className="text-xs text-red-600 mt-2">🚫 {dateCheck.reason}</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-xs text-red-600 mt-2">No free slots</p>
          ) : (
            <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">Select...</option>
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slotLabel(slot, visitType, DEFAULT_SCHEDULE_SETTINGS)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {symptoms.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Symptoms</label>
          <div className="grid grid-cols-3 gap-1.5 rounded-md border border-neutral-200 p-2">
            {symptoms.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-xs text-neutral-700">
                <input type="checkbox" checked={symptomIds.has(s.id)} onChange={() => toggleSymptom(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-neutral-600">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {loading ? "Booking..." : "Book appointment"}
      </button>
    </form>
  );
}
