"use client";
import { useState } from "react";
import { PendingList } from "./pending-list";
import type { DoctorWorkingHours, DoctorScheduleBlock, ExistingAppointmentForSlots } from "@/lib/scheduling/slots";

interface Props {
  items: any[];
  doctors: any[];
  symptomsCatalog: any[];
  appointmentsByDate: Record<string, ExistingAppointmentForSlots[]>;
  workingHours: DoctorWorkingHours[];
  blocks: DoctorScheduleBlock[];
}

export function PendingSection({ items, doctors, symptomsCatalog, appointmentsByDate, workingHours, blocks }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 hover:bg-neutral-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Pending calls</span>
          {items.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {items.length}
            </span>
          ) : (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">0</span>
          )}
        </div>
        <span className={`text-xs text-neutral-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▶</span>
      </button>

      {open && (
        <PendingList
          items={items}
          doctors={doctors}
          symptomsCatalog={symptomsCatalog}
          appointmentsByDate={appointmentsByDate}
          workingHours={workingHours}
          blocks={blocks}
        />
      )}
    </div>
  );
}
