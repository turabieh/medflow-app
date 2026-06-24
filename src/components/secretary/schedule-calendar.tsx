"use client";

import { useState } from "react";
import type { DoctorWorkingHours, DoctorScheduleBlock } from "@/lib/scheduling/slots";

interface Doctor { id: string; full_name: string; }
interface Appointment {
  id: string;
  appt_date: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  doctor_id: string | null;
  patientName: string;
  isInpatient?: boolean;
  hospitalName?: string;
  location?: string;
}
interface Block {
  id: string;
  doctorId: string;
  blockDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOT: Record<string, string> = {
  booked:           "bg-purple-400",
  confirmed:        "bg-blue-400",
  arrived:          "bg-emerald-400",
  with_doctor:      "bg-indigo-400",
  done:             "bg-orange-300",
  finalized:        "bg-neutral-300",
  no_show:          "bg-red-300",
  cancelled:        "bg-neutral-200",
  inpatient_visit:  "bg-blue-600",
};

function getWeekDates(dateStr: string): Date[] {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function ds(d: Date) {
  return d.toISOString().split("T")[0];
}

function DayCell({
  date,
  isToday,
  isWorking,
  isClosed,
  blocks,
  appointments,
  label,
}: {
  date: Date;
  isToday: boolean;
  isWorking: boolean;
  isClosed?: boolean;
  blocks: Block[];
  appointments: Appointment[];
  label?: string;
}) {
  const wholeDay = blocks.some((b) => !b.startTime);
  const timeBlocks = blocks.filter((b) => b.startTime);

  return (
    <div className={`min-h-[90px] rounded-lg border p-1.5 ${
      isToday ? "border-blue-300 bg-blue-50/30" :
      !isWorking || isClosed || wholeDay ? "border-red-200 bg-red-50/20" :
      "border-neutral-200 bg-white"
    }`}>
      <p className={`mb-1 text-center text-[11px] font-medium ${isToday ? "text-blue-700" : "text-neutral-500"}`}>
        {label ?? `${DAY_NAMES[date.getDay()]} ${date.getDate()}`}
      </p>

      {!isWorking ? (
        <p className="text-center text-[10px] text-neutral-400">Off</p>
      ) : wholeDay ? (
        <p className="text-center text-[10px] text-red-500 font-medium">
          Closed: {blocks.find((b) => !b.startTime)?.reason}
        </p>
      ) : (
        <>
          {timeBlocks.map((b) => (
            <div key={b.id} className="mb-0.5 truncate rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
              {b.startTime?.slice(0, 5)}–{b.endTime?.slice(0, 5)} {b.reason}
            </div>
          ))}
          {appointments.map((a) => (
            a.isInpatient ? (
              <div key={a.id} className="mb-0.5 truncate rounded bg-blue-100 border border-blue-300 px-1 py-0.5 text-[10px] text-blue-800">
                🏨 {a.start_time?.slice(0, 5)} {a.patientName} · {a.hospitalName}
              </div>
            ) : (
              <div key={a.id} className="mb-0.5 flex items-center gap-0.5">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_DOT[a.status] ?? "bg-neutral-300"}`} />
                <p className="truncate text-[10px] text-neutral-700">
                  {a.start_time?.slice(0, 5)} {a.patientName}
                </p>
              </div>
            )
          ))}
          {appointments.length === 0 && timeBlocks.length === 0 && (
            <p className="text-center text-[10px] text-neutral-300">— Free —</p>
          )}
        </>
      )}
    </div>
  );
}

export function ScheduleCalendar({
  doctors,
  workingHours,
  blocks,
  appointments,
  initialDate,
  initialView,
}: {
  doctors: Doctor[];
  workingHours: DoctorWorkingHours[];
  blocks: Block[];
  appointments: Appointment[];
  initialDate: string;
  initialView: "week" | "day";
}) {
  const [view, setView] = useState<"week" | "day">(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);

  const today = new Date().toISOString().split("T")[0];
  const weekDates = getWeekDates(currentDate);

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + (view === "week" ? 7 : 1) * dir);
    setCurrentDate(d.toISOString().split("T")[0]);
  }

  const viewDates = view === "week" ? weekDates : [new Date(currentDate + "T00:00:00")];

  function isWorking(doctorId: string, date: Date) {
    const dow = date.getDay();
    return workingHours.some((wh) => wh.doctorId === doctorId && wh.dayOfWeek === dow);
  }

  function getDayBlocks(doctorId: string, dateStr: string) {
    return blocks.filter((b) => b.doctorId === doctorId && b.blockDate === dateStr);
  }

  function getDayAppts(doctorId: string | null, dateStr: string) {
    return appointments.filter(
      (a) => (doctorId === null || a.doctor_id === doctorId) && a.appt_date === dateStr
    ).sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  }

  const dateRangeLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
    : new Date(currentDate + "T00:00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Prev
        </button>
        <button onClick={() => setCurrentDate(today)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Today
        </button>
        <button onClick={() => navigate(1)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
          Next
        </button>
        <div className="ml-2 flex overflow-hidden rounded-md border border-neutral-300">
          <button onClick={() => setView("week")}
            className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}>
            Week
          </button>
          <button onClick={() => setView("day")}
            className={`px-3 py-1.5 text-sm ${view === "day" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}>
            Day
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">{dateRangeLabel}</p>

      {/* Clinic-wide overview row */}
      <div className="mb-4 rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-800 px-3 py-2">
          <p className="text-xs font-medium text-white">Clinic Overview — All Doctors</p>
        </div>
        <div className={`grid gap-1 p-2 ${view === "week" ? "grid-cols-7" : "grid-cols-1 max-w-xs"}`}>
          {viewDates.map((date) => {
            const dateStr = ds(date);
            // Clinic is open if ANY doctor is working that day
            const anyWorking = doctors.some((doc) => isWorking(doc.id, date));
            const allAppts = getDayAppts(null, dateStr);
            const allBlocks = blocks.filter((b) => b.blockDate === dateStr);
            return (
              <DayCell
                key={dateStr}
                date={date}
                isToday={dateStr === today}
                isWorking={anyWorking}
                blocks={allBlocks}
                appointments={allAppts}
              />
            );
          })}
        </div>
      </div>

      {/* Per-doctor rows */}
      {doctors.map((doctor) => (
        <div key={doctor.id} className="mb-3 rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-700 px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white">{doctor.full_name}</p>
            <p className="text-[10px] text-neutral-400">Personal Schedule</p>
          </div>
          <div className={`grid gap-1 p-2 ${view === "week" ? "grid-cols-7" : "grid-cols-1 max-w-xs"}`}>
            {viewDates.map((date) => {
              const dateStr = ds(date);
              const docBlocks = getDayBlocks(doctor.id, dateStr);
              const docAppts = getDayAppts(doctor.id, dateStr);
              const working = isWorking(doctor.id, date);
              return (
                <DayCell
                  key={dateStr}
                  date={date}
                  isToday={dateStr === today}
                  isWorking={working}
                  blocks={docBlocks}
                  appointments={docAppts}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
