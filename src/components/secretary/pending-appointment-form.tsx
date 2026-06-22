"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmBooking, logPendingCallAttempt } from "@/lib/actions/appointments";
import { BilingualInput } from "@/components/ui/bilingual-input";
import {
  DEFAULT_SCHEDULE_SETTINGS,
  getAvailableSlotsForDoctor,
  isDateAllowed,
  slotLabel,
  type VisitType,
  type ExistingAppointmentForSlots,
  type DoctorWorkingHours,
  type DoctorScheduleBlock,
} from "@/lib/scheduling/slots";

interface Symptom {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
}

interface PendingAppointmentFormProps {
  appointment: {
    id: string;
    appt_date: string;
    visit_type: VisitType;
    period: "morning" | "afternoon" | "evening" | null;
    secretary_notes: string | null;
  };
  patient: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    gender: "male" | "female" | null;
    dob: string | null;
    address: string | null;
    phone: string;
    phone2: string | null;
    phone2_relation: string | null;
  };
  doctors: Doctor[];
  symptomsCatalog: Symptom[];
  existingSymptomIds: string[];
  existingAppointmentsOnDate: ExistingAppointmentForSlots[];
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
}

export function PendingAppointmentForm({
  appointment,
  patient,
  doctors,
  symptomsCatalog,
  existingSymptomIds,
  existingAppointmentsOnDate,
  workingHours,
  blocks,
}: PendingAppointmentFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(patient.full_name);
  const [fullNameAr, setFullNameAr] = useState(patient.full_name_ar ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">(patient.gender ?? "");
  const [dob, setDob] = useState(patient.dob ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [phone, setPhone] = useState(patient.phone);
  const [phone2, setPhone2] = useState(patient.phone2 ?? "");
  const [phone2Relation, setPhone2Relation] = useState(patient.phone2_relation ?? "");

  const [doctorId, setDoctorId] = useState<string>(doctors[0]?.id ?? "");
  const [apptDate, setApptDate] = useState(appointment.appt_date);
  const [visitType, setVisitType] = useState<VisitType>(appointment.visit_type);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [allowOverbook, setAllowOverbook] = useState(false);
  const [notes, setNotes] = useState(appointment.secretary_notes ?? "");
  const [symptomIds, setSymptomIds] = useState<Set<string>>(new Set(existingSymptomIds));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateCheck = useMemo(() => {
    // Use the selected doctor's actual working days from their
    // doctor_working_hours rows, not the hardcoded default which
    // only knows about Sun-Thu.
    const doctorDays = workingHours
      .filter((wh) => wh.doctorId === doctorId)
      .map((wh) => wh.dayOfWeek);

    // If no working hours configured yet, fall back to default to avoid
    // blocking everything — but once configured, use the real schedule.
    const effectiveSettings =
      doctorDays.length > 0
        ? { ...DEFAULT_SCHEDULE_SETTINGS, workingDays: doctorDays }
        : DEFAULT_SCHEDULE_SETTINGS;

    return isDateAllowed(apptDate, effectiveSettings);
  }, [apptDate, doctorId, workingHours]);

  const doctorWorksThisDay = useMemo(() => {
    if (!doctorId || !apptDate) return true; // can't know yet, don't block prematurely
    const dow = new Date(apptDate + "T00:00:00").getDay();
    return workingHours.some((wh) => wh.doctorId === doctorId && wh.dayOfWeek === dow);
  }, [doctorId, apptDate, workingHours]);

  const availableSlots = useMemo(() => {
    if (!doctorId || !dateCheck.allowed || !doctorWorksThisDay) return [];
    return getAvailableSlotsForDoctor(
      doctorId,
      apptDate,
      visitType,
      workingHours,
      blocks,
      existingAppointmentsOnDate,
      appointment.id
    );
  }, [doctorId, apptDate, visitType, workingHours, blocks, existingAppointmentsOnDate, appointment.id, dateCheck.allowed, doctorWorksThisDay]);

  const noFreeSlots = availableSlots.length === 0;

  useEffect(() => {
    // Reset slot selection when doctor, visit type, or date changes,
    // since the available pool changes too.
    setSelectedSlot("");
    setAllowOverbook(false);
  }, [doctorId, visitType, apptDate]);

  function toggleSymptom(id: string) {
    setSymptomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSaveAndAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!doctorId) {
      setError("Select a doctor before saving.");
      return;
    }
    if (!selectedSlot && !allowOverbook) {
      setError("Select a time slot before saving.");
      return;
    }
    if (allowOverbook && !selectedSlot) {
      setError("Even when overbooking, pick the closest time slot for reference.");
      return;
    }

    setLoading(true);

    const result = await confirmBooking({
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId,
      fullName,
      fullNameAr: fullNameAr || undefined,
      gender: gender || undefined,
      dob: dob || undefined,
      address: address || undefined,
      phone,
      phone2: phone2 || undefined,
      phone2Relation: phone2Relation || undefined,
      apptDate,
      visitType,
      startTime: selectedSlot,
      isOverbooked: allowOverbook,
      secretaryNotes: notes,
      symptomIds: Array.from(symptomIds),
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not save.");
      return;
    }

    router.refresh();
  }

  async function handleNoAnswer() {
    setLoading(true);
    setError(null);
    const result = await logPendingCallAttempt(appointment.id, false);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Could not log call attempt.");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSaveAndAssign}
      className="rounded-lg border border-amber-200 bg-amber-50/40 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Confirm and assign slot</h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Pending — preferred {appointment.period}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <BilingualInput
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <BilingualInput
          label="Full name (Arabic, optional)"
          value={fullNameAr}
          onChange={(e) => setFullNameAr(e.target.value)}
        />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Phone</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Second phone</label>
          <input
            type="tel"
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Relation</label>
          <input
            type="text"
            value={phone2Relation}
            onChange={(e) => setPhone2Relation(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <BilingualInput
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Appointment date</label>
          <input
            type="date"
            required
            value={apptDate}
            onChange={(e) => setApptDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Visit type</label>
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value as VisitType)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="new">New patient (45 min)</option>
            <option value="followup">Follow-up (30 min)</option>
            <option value="review">Review (15 min)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Assign to doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {doctors.length === 0 && <option value="">No doctors available</option>}
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-neutral-600">Time slot</label>
        {!dateCheck.allowed ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            🚫 {dateCheck.reason}
          </p>
        ) : !doctorWorksThisDay ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            🚫 This doctor does not work on this day. Pick another date or doctor.
          </p>
        ) : noFreeSlots ? (
          <div>
            <p className="mb-2 text-xs text-red-600">No free slots for this date and visit type.</p>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={allowOverbook}
                onChange={(e) => setAllowOverbook(e.target.checked)}
              />
              Overbook (doctor must confirm)
            </label>
            {allowOverbook && (
              <input
                type="time"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            )}
          </div>
        ) : (
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select a slot...</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slotLabel(slot, visitType, DEFAULT_SCHEDULE_SETTINGS)}
              </option>
            ))}
          </select>
        )}
      </div>

      {symptomsCatalog.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs text-neutral-600">Symptoms</label>
          <div className="grid grid-cols-3 gap-1.5 rounded-md border border-neutral-200 bg-white p-2">
            {symptomsCatalog.map((symptom) => (
              <label key={symptom.id} className="flex items-center gap-1.5 text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={symptomIds.has(symptom.id)}
                  onChange={() => toggleSymptom(symptom.id)}
                />
                {symptom.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-xs text-neutral-600">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          placeholder="e.g. Bring previous lab reports"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save & assign"}
        </button>
        <button
          type="button"
          onClick={handleNoAnswer}
          disabled={loading}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          No answer
        </button>
      </div>
    </form>
  );
}
