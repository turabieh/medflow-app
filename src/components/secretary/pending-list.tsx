"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingAppointmentForm } from "./pending-appointment-form";
import { archivePendingAppointment } from "@/lib/actions/appointments";
import type {
  VisitType,
  ExistingAppointmentForSlots,
  DoctorWorkingHours,
  DoctorScheduleBlock,
} from "@/lib/scheduling/slots";

interface PendingItem {
  appointment: {
    id: string;
    appt_date: string;
    visit_type: VisitType;
    period: "morning" | "afternoon" | "evening" | null;
    secretary_notes: string | null;
    pending_call_attempts: number;
    pending_is_cold: boolean;
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
}

interface Symptom {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
}

export function PendingList({
  items,
  doctors,
  symptomsCatalog,
  appointmentsByDate,
  workingHours,
  blocks,
}: {
  items: PendingItem[];
  doctors: Doctor[];
  symptomsCatalog: Symptom[];
  appointmentsByDate: Record<string, ExistingAppointmentForSlots[]>;
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  async function handleArchive(appointmentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Archive this request? It will be hidden from the pending list.")) return;
    const result = await archivePendingAppointment(appointmentId);
    if (result.success) {
      router.refresh();
    }
  }

  const warm = items.filter((i) => !i.appointment.pending_is_cold);
  const cold = items.filter((i) => i.appointment.pending_is_cold);
  const ordered = [...warm, ...cold];

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No pending requests right now.</p>;
  }

  return (
    <div className="space-y-2">
      {ordered.map(({ appointment, patient }) => (
        <div key={appointment.id}>
          <button
            onClick={() => setOpenId(openId === appointment.id ? null : appointment.id)}
            className={`w-full rounded-md border-l-4 bg-white px-4 py-2.5 text-left shadow-sm transition ${
              appointment.pending_is_cold ? "border-l-neutral-300" : "border-l-amber-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">{patient.full_name}</p>
                <p className="font-mono text-xs text-neutral-500">{patient.phone}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Preferred {appointment.period} · {appointment.pending_call_attempts} attempt
                  {appointment.pending_call_attempts === 1 ? "" : "s"}
                  {appointment.pending_is_cold && " · cold"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {appointment.pending_is_cold && (
                  <span
                    onClick={(e) => handleArchive(appointment.id, e)}
                    className="text-xs text-neutral-400 underline hover:text-neutral-600"
                  >
                    Archive
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {openId === appointment.id ? "Close ▲" : "Open ▼"}
                </span>
              </div>
            </div>
          </button>

          {openId === appointment.id && (
            <div className="mt-2">
              <PendingAppointmentForm
                appointment={appointment}
                patient={patient}
                doctors={doctors}
                symptomsCatalog={symptomsCatalog}
                existingSymptomIds={[]}
                existingAppointmentsOnDate={appointmentsByDate[appointment.appt_date] ?? []}
                workingHours={workingHours}
                blocks={blocks}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
