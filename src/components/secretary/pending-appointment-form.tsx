"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmBooking, logPendingCallAttempt } from "@/lib/actions/appointments";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { JordanDateInput } from "@/components/ui/jordan-date-input";
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
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    middle_name_ar: string | null;
    last_name_ar: string | null;
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

  const [firstName,    setFirstName]    = useState(patient.first_name ?? patient.full_name);
  const [middleName,   setMiddleName]   = useState(patient.middle_name ?? "");
  const [lastName,     setLastName]     = useState(patient.last_name ?? "");
  const [firstNameAr,  setFirstNameAr]  = useState(patient.first_name_ar ?? "");
  const [middleNameAr, setMiddleNameAr] = useState(patient.middle_name_ar ?? "");
  const [lastNameAr,   setLastNameAr]   = useState(patient.last_name_ar ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">(patient.gender ?? "");
  const [dob, setDob] = useState(patient.dob ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [mrn, setMrn] = useState((patient as {mrn?: string|null}).mrn ?? "");
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

  const [referralSource,       setReferralSource]       = useState((patient as any).referral_source ?? "");
  const [referralSourceDetail, setReferralSourceDetail] = useState((patient as any).referral_source_detail ?? "");
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
      firstName,
      middleName:   middleName  || null,
      lastName:     lastName    || null,
      firstNameAr:  firstNameAr || null,
      middleNameAr: middleNameAr|| null,
      lastNameAr:   lastNameAr  || null,
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
      referralSource: referralSource || null,
      referralSourceDetail: referralSourceDetail.trim() || null,
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

      {/* English name — 3 parts */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-neutral-700">Name (English)</p>
          {[firstName,middleName,lastName].filter(Boolean).join(" ") && (
            <span className="text-xs text-neutral-400">{[firstName,middleName,lastName].filter(Boolean).join(" ")}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">First Name *</label>
            <input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ahmad"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">Middle Name</label>
            <input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Mahmoud"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Hassan"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500" />
          </div>
        </div>
      </div>

      {/* Arabic name — 3 parts */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-neutral-700">الاسم (عربي)</p>
          {[firstNameAr,middleNameAr,lastNameAr].filter(Boolean).join(" ") && (
            <span className="text-xs text-neutral-400" dir="rtl">{[firstNameAr,middleNameAr,lastNameAr].filter(Boolean).join(" ")}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2" dir="rtl">
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">الاسم الأول *</label>
            <input value={firstNameAr} onChange={e => setFirstNameAr(e.target.value)} placeholder="أحمد"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">الاسم الأوسط</label>
            <input value={middleNameAr} onChange={e => setMiddleNameAr(e.target.value)} placeholder="محمود"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500 text-right">اسم العائلة</label>
            <input value={lastNameAr} onChange={e => setLastNameAr(e.target.value)} placeholder="حسن"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-right outline-none focus:border-neutral-500" />
          </div>
        </div>
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
          <JordanDateInput value={dob} onChange={setDob}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600 font-semibold">MRN <span className="font-normal text-neutral-400">(Medical Record #)</span></label>
          <input type="text" value={mrn} onChange={e => setMrn(e.target.value)}
            placeholder="MRN-001234"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono" />
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
          <JordanDateInput required value={apptDate} onChange={setApptDate}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
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


      {/* Referral Source */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-neutral-700">Referral Source</label>
        <div className="grid grid-cols-3 gap-1.5 rounded-md border border-neutral-200 bg-white p-2.5">
            <label key="physician" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="physician"
                checked={referralSource==="physician"}
                onChange={()=>{setReferralSource("physician");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Physician</span>
            </label>
            <label key="hospital" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="hospital"
                checked={referralSource==="hospital"}
                onChange={()=>{setReferralSource("hospital");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Hospital</span>
            </label>
            <label key="another_clinic" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="another_clinic"
                checked={referralSource==="another_clinic"}
                onChange={()=>{setReferralSource("another_clinic");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Another Clinic</span>
            </label>
            <label key="insurance" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="insurance"
                checked={referralSource==="insurance"}
                onChange={()=>{setReferralSource("insurance");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Insurance Company</span>
            </label>
            <label key="existing_patient" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="existing_patient"
                checked={referralSource==="existing_patient"}
                onChange={()=>{setReferralSource("existing_patient");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Existing Patient</span>
            </label>
            <label key="friend_family" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="friend_family"
                checked={referralSource==="friend_family"}
                onChange={()=>{setReferralSource("friend_family");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Friend / Family</span>
            </label>
            <label key="google_search" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="google_search"
                checked={referralSource==="google_search"}
                onChange={()=>{setReferralSource("google_search");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Google Search</span>
            </label>
            <label key="google_maps" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="google_maps"
                checked={referralSource==="google_maps"}
                onChange={()=>{setReferralSource("google_maps");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Google Maps</span>
            </label>
            <label key="website" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="website"
                checked={referralSource==="website"}
                onChange={()=>{setReferralSource("website");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Clinic Website</span>
            </label>
            <label key="facebook" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="facebook"
                checked={referralSource==="facebook"}
                onChange={()=>{setReferralSource("facebook");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Facebook</span>
            </label>
            <label key="instagram" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="instagram"
                checked={referralSource==="instagram"}
                onChange={()=>{setReferralSource("instagram");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Instagram</span>
            </label>
            <label key="linkedin" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="linkedin"
                checked={referralSource==="linkedin"}
                onChange={()=>{setReferralSource("linkedin");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">LinkedIn</span>
            </label>
            <label key="youtube" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="youtube"
                checked={referralSource==="youtube"}
                onChange={()=>{setReferralSource("youtube");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">YouTube</span>
            </label>
            <label key="tiktok" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="tiktok"
                checked={referralSource==="tiktok"}
                onChange={()=>{setReferralSource("tiktok");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">TikTok</span>
            </label>
            <label key="newspaper" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="newspaper"
                checked={referralSource==="newspaper"}
                onChange={()=>{setReferralSource("newspaper");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Newspaper</span>
            </label>
            <label key="radio" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="radio"
                checked={referralSource==="radio"}
                onChange={()=>{setReferralSource("radio");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Radio</span>
            </label>
            <label key="tv" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="tv"
                checked={referralSource==="tv"}
                onChange={()=>{setReferralSource("tv");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">TV</span>
            </label>
            <label key="walk_in" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="walk_in"
                checked={referralSource==="walk_in"}
                onChange={()=>{setReferralSource("walk_in");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Walk-in</span>
            </label>
            <label key="other" className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pRefSrc" value="other"
                checked={referralSource==="other"}
                onChange={()=>{setReferralSource("other");setReferralSourceDetail("");}}
                className="accent-neutral-800"/>
              <span className="text-xs text-neutral-700">Other</span>
            </label>
        </div>
        {["physician","hospital","another_clinic","insurance","existing_patient","other"].includes(referralSource) && (
          <input value={referralSourceDetail} onChange={e=>setReferralSourceDetail(e.target.value)}
            placeholder="Enter name..."
            className="mt-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none"/>
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
