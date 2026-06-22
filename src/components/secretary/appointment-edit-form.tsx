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
import { rescheduleAppointment, cancelAppointment } from "@/lib/actions/appointments";

interface Doctor { id: string; full_name: string; }

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
}

const LOCKED_STATUSES = ["with_doctor", "done", "finalized", "cancelled", "no_show"];

export function AppointmentEditForm({
  appointment,
  patient,
  doctors,
  workingHours,
  blocks,
}: AppointmentEditFormProps) {
  const router = useRouter();
  const isLocked = LOCKED_STATUSES.includes(appointment.status);

  const [doctorId, setDoctorId] = useState(appointment.doctor_id ?? doctors[0]?.id ?? "");
  const [apptDate, setApptDate] = useState(appointment.appt_date);
  const [visitType, setVisitType] = useState<VisitType>(appointment.visit_type as VisitType);
  const [selectedSlot, setSelectedSlot] = useState(appointment.start_time?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(appointment.secretary_notes ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const doctorDays = workingHours.filter((wh) => wh.doctorId === doctorId).map((wh) => wh.dayOfWeek);
  const effectiveSettings = doctorDays.length > 0
    ? { ...DEFAULT_SCHEDULE_SETTINGS, workingDays: doctorDays }
    : DEFAULT_SCHEDULE_SETTINGS;
  const dateCheck = apptDate ? isDateAllowed(apptDate, effectiveSettings) : { allowed: true };

  const availableSlots = useMemo(() => {
    if (!apptDate || !doctorId || !dateCheck.allowed) return [];
    return getAvailableSlotsForDoctor(doctorId, apptDate, visitType, workingHours, blocks, [], appointment.id);
  }, [doctorId, apptDate, visitType, workingHours, blocks, appointment.id, dateCheck.allowed]);

  useEffect(() => {
    setSelectedSlot("");
  }, [doctorId, apptDate, visitType]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) { setError("Select a time slot."); return; }
    setLoading(true);
    setError(null);
    const result = await rescheduleAppointment(appointment.id, apptDate, selectedSlot, visitType);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Could not save."); return; }
    setSuccess("Appointment updated successfully.");
    setTimeout(() => router.push(`/secretary/appointments?date=${apptDate}`), 1000);
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await cancelAppointment(appointment.id, cancelReason);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Could not cancel."); return; }
    router.push(`/secretary/appointments?date=${appointment.appt_date}`);
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* Patient info card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-neutral-900">{patient.full_name}</p>
        {patient.full_name_ar && <p className="text-xs text-neutral-400" dir="rtl">{patient.full_name_ar}</p>}
        <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
      </div>

      {isLocked ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This appointment is <strong>{appointment.status.replace(/_/g, " ")}</strong> and cannot be rescheduled or cancelled.
        </div>
      ) : (
        <form onSubmit={handleSave} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-medium text-neutral-900">Reschedule</h2>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

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
              {!dateCheck.allowed ? (
                <p className="mt-1 text-xs text-red-600">{dateCheck.reason}</p>
              ) : availableSlots.length === 0 ? (
                <p className="mt-1 text-xs text-neutral-400">No free slots</p>
              ) : (
                <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="">Select slot...</option>
                  {availableSlots.map((s) => (
                    <option key={s} value={s}>{slotLabel(s, visitType, DEFAULT_SCHEDULE_SETTINGS)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-600">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {loading ? "Saving..." : "Save changes"}
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
          <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
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
