"use client";
import { JordanDateInput } from "@/components/ui/jordan-date-input";

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
import { rescheduleAppointment, cancelAppointment } from "@/lib/actions/appointments";

interface Doctor { id: string; full_name: string; }
interface BookedSlot { doctorId: string; date: string; startTime: string; endTime: string; patientName: string; }

interface AppointmentEditFormProps {
  appointment: {
    id: string;
    appt_date: string;
    start_time: string | null;
    status: string;
    visit_type: string;
    is_overbooked: boolean;
    secretary_notes: string | null;
    doctor_id: string | null;
  };
  patient: { id: string; full_name: string; full_name_ar: string | null; phone: string; };
  doctors: Doctor[];
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
  visitDurations?: Record<string, number>;
  bookedSlots?: BookedSlot[];
}

const LOCKED_STATUSES = ["with_doctor", "done", "finalized", "cancelled", "no_show"];

function formatSlot(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

export function AppointmentEditForm({
  appointment,
  patient,
  doctors,
  workingHours,
  blocks,
  visitDurations = {},
  bookedSlots = [],
}: AppointmentEditFormProps) {
  const router = useRouter();
  const isLocked = LOCKED_STATUSES.includes(appointment.status);

  const [doctorId, setDoctorId] = useState(appointment.doctor_id ?? doctors[0]?.id ?? "");
  const [apptDate, setApptDate] = useState(appointment.appt_date);
  const [visitType, setVisitType] = useState<VisitType>(appointment.visit_type as VisitType);
  const [selectedSlot, setSelectedSlot] = useState(appointment.start_time?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(appointment.secretary_notes ?? "");
  const [overbookMode, setOverbookMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlot("");
    setOverbookMode(false);
  }, [doctorId, apptDate, visitType]);

  const settings = useMemo(() => {
    const doctorDays = workingHours.filter(wh => wh.doctorId === doctorId).map(wh => wh.dayOfWeek);
    const base = doctorDays.length > 0
      ? { ...DEFAULT_SCHEDULE_SETTINGS, workingDays: doctorDays }
      : DEFAULT_SCHEDULE_SETTINGS;
    return Object.keys(visitDurations).length > 0
      ? { ...base, visitDurations }
      : base;
  }, [workingHours, doctorId, visitDurations]);

  const dateCheck = apptDate ? isDateAllowed(apptDate, settings) : { allowed: true };

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
    return getAvailableSlotsForDoctor(doctorId, apptDate, visitType, workingHours, blocks, existing, appointment.id, settings);
  }, [doctorId, apptDate, visitType, workingHours, blocks, appointment.id, dateCheck.allowed, bookedSlots, settings]);

  const allSlotsWithCount = useMemo(() => {
    if (!apptDate || !doctorId) return [];
    return getAllSlotsWithBookingCount(doctorId, apptDate, workingHours, bookedSlots);
  }, [doctorId, apptDate, workingHours, bookedSlots]);

  // Is the selected slot actually free? (count = 0 means free)
  const selectedSlotCount = useMemo(() => {
    if (!selectedSlot) return 0;
    return allSlotsWithCount.find(s => s.time === selectedSlot)?.count ?? 0;
  }, [selectedSlot, allSlotsWithCount]);

  const isThisOverbook = overbookMode && selectedSlotCount > 0;

  const conflictingPatients = useMemo(() => {
    if (!selectedSlot || !isThisOverbook) return [];
    return bookedSlots
      .filter(b => b.doctorId === doctorId && b.date === apptDate && b.startTime.slice(0, 5) === selectedSlot)
      .map(b => b.patientName);
  }, [selectedSlot, isThisOverbook, bookedSlots, doctorId, apptDate]);

  const noAvailableSlots = availableSlots.length === 0 && apptDate && dateCheck.allowed;

  // Duration label for visit type
  function durationLabel(vt: string) {
    const mins = visitDurations[vt];
    return mins ? ` (${mins} min)` : "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) { setError("Select a time slot."); return; }
    setLoading(true);
    setError(null);
    const result = await rescheduleAppointment(
      appointment.id, apptDate, selectedSlot, visitType, isThisOverbook
    );
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Could not save."); return; }
    setSuccess("Appointment updated.");
    setTimeout(() => router.push(`/secretary/appointments?date=${apptDate}`), 1000);
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await cancelAppointment(appointment.id, cancelReason);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Could not cancel."); return; }
    router.push(`/secretary/appointments?date=${appointment.appt_date}`);
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* Patient card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-neutral-900">{patient.full_name}</p>
        {patient.full_name_ar && <p className="text-xs text-neutral-400" dir="rtl">{patient.full_name_ar}</p>}
        <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
      </div>

      {isLocked ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This appointment is <strong>{appointment.status.replace(/_/g, " ")}</strong> and cannot be rescheduled.
        </div>
      ) : (
        <form onSubmit={handleSave} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">Reschedule</h2>
          {error   && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Doctor</label>
              <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Visit type</label>
              <select value={visitType} onChange={e => setVisitType(e.target.value as VisitType)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="new">New patient{durationLabel("new")}</option>
                <option value="follow_up">Follow-up{durationLabel("follow_up")}</option>
                <option value="urgent">Urgent{durationLabel("urgent")}</option>
                <option value="consultation">Consultation{durationLabel("consultation")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-600">Date</label>
            <JordanDateInput value={apptDate} onChange={setApptDate} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>

          {/* Time slots */}
          {apptDate && doctorId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700">
                  {overbookMode ? "All slots (overbook mode)" : "Available slots"}
                </label>
                {dateCheck.allowed && (
                  <button type="button"
                    onClick={() => { setOverbookMode(m => !m); setSelectedSlot(""); }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      overbookMode
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                    }`}>
                    {overbookMode ? "✕ Cancel overbook" : "⚡ Overbook"}
                  </button>
                )}
              </div>

              {!dateCheck.allowed && (
                <p className="text-xs text-red-500">Doctor does not work on this day.</p>
              )}

              {/* Normal slots */}
              {!overbookMode && dateCheck.allowed && (
                <>
                  {noAvailableSlots ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                      <p className="font-medium text-amber-800">No available slots on this date.</p>
                      <p className="mt-1 text-xs text-amber-700">Use <strong>⚡ Overbook</strong> to book into an occupied slot.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableSlots.map(slot => (
                        <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}
                          className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                            selectedSlot === slot
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                          }`}>
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Overbook slots */}
              {overbookMode && dateCheck.allowed && (
                <>
                  <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <strong>Overbook mode:</strong> Amber slots have 1 booking (can overbook once). Gray slots are full.
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {allSlotsWithCount.map(({ time, count }) => {
                      const full = count >= 2;
                      const isSelected = selectedSlot === time;
                      return (
                        <button key={time} type="button" disabled={full}
                          onClick={() => setSelectedSlot(time)}
                          className={`relative rounded-md border px-2 py-1.5 text-xs font-medium ${
                            full
                              ? "border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed"
                              : isSelected
                              ? "border-amber-600 bg-amber-500 text-white"
                              : count === 1
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                          }`}>
                          {formatSlot(time)}
                          {count > 0 && !full && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">{count}</span>
                          )}
                          {full && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-400 text-[9px] font-bold text-white">✕</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSlot && selectedSlotCount > 0 && (
                    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="font-medium">⚠ Overbooking {formatSlot(selectedSlot)}</p>
                      <p className="mt-0.5">Already booked: <strong>{conflictingPatients.join(", ")}</strong></p>
                    </div>
                  )}
                </>
              )}

              {/* Show if selected slot is free (clear overbook flag) */}
              {selectedSlot && !isThisOverbook && appointment.is_overbooked && (
                <p className="mt-1 text-xs text-green-600">✓ This slot is free — overbook flag will be removed.</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-neutral-600">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading || !selectedSlot}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                isThisOverbook ? "bg-amber-500 hover:bg-amber-600" : "bg-neutral-900 hover:bg-neutral-800"
              }`}>
              {loading ? "Saving..." : isThisOverbook ? "⚡ Confirm Overbook" : "Save changes"}
            </button>
            <button type="button" onClick={() => setShowCancel(!showCancel)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              Cancel appointment
            </button>
          </div>
        </form>
      )}

      {showCancel && !isLocked && (
        <form onSubmit={handleCancel} className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <h2 className="text-sm font-medium text-red-900">Cancel this appointment</h2>
          <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-md border border-red-300 bg-white px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? "Cancelling..." : "Confirm cancellation"}
            </button>
            <button type="button" onClick={() => setShowCancel(false)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-white">
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
