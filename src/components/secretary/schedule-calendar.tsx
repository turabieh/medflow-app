"use client";

import { useState } from "react";
import { todayJordan, to12h } from "@/lib/client-timezone";
import type { DoctorWorkingHours, DoctorScheduleBlock } from "@/lib/scheduling/slots";

interface Doctor     { id: string; full_name: string; }
interface Technician { id: string; full_name: string; }
interface Appointment {
  id: string;
  appt_date: string;
  start_time: string | null;
  status: string;
  visit_type: string;
  doctor_id: string | null;
  technician_id?: string | null;
  patientName: string;
  procedureName?: string;
  isInpatient?: boolean;
  isTechProcedure?: boolean;
  hospitalName?: string;
  location?: string;
}
interface Block {
  id: string; doctorId: string; blockDate: string;
  startTime: string | null; endTime: string | null; reason: string;
}

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_DOT: Record<string,string> = {
  booked:          "bg-purple-400",
  confirmed:       "bg-blue-400",
  arrived:         "bg-emerald-400",
  with_doctor:     "bg-indigo-400",
  done:            "bg-orange-300",
  finalized:       "bg-neutral-300",
  no_show:         "bg-red-300",
  cancelled:       "bg-neutral-200",
  inpatient_visit: "bg-blue-600",
  scheduled:       "bg-teal-400",
  in_progress:     "bg-amber-400",
};

function getWeekDates(dateStr: string): Date[] {
  // Parse as Jordan midnight to avoid UTC day-of-week shifting
  // e.g. "2026-06-26T00:00:00+03:00" = Jordan midnight
  const [y, m, d] = dateStr.split("-").map(Number);
  // Create date at noon UTC to safely get the correct Jordan weekday
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // Get day-of-week in Jordan timezone
  const dayName = date.toLocaleDateString("en-US", { timeZone: "Asia/Amman", weekday: "short" });
  const dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const day = dayMap[dayName] ?? 0;
  // Monday-based week
  const mondayOffset = (day + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    return new Date(Date.UTC(y, m - 1, d - mondayOffset + i, 12, 0, 0));
  });
}

function ds(d: Date) { return d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }); }

// ── Appointment item inside a day cell ──────────────────────────────────────
function ApptItem({ a }: { a: Appointment }) {
  if (a.isInpatient) return (
    <div className="mb-0.5 truncate rounded bg-blue-100 border border-blue-300 px-1 py-0.5 text-[10px] text-blue-800">
      🏨 {to12h(a.start_time)} {a.patientName} · {a.hospitalName}
    </div>
  );

  if (a.isTechProcedure) return (
    <div className="mb-0.5 truncate rounded bg-teal-50 border border-teal-300 px-1 py-0.5 text-[10px] text-teal-800 flex items-center gap-0.5">
      <span className="flex-shrink-0">🔬</span>
      <span className="truncate">{to12h(a.start_time)} {a.patientName} · {a.procedureName}</span>
    </div>
  );

  return (
    <div className="mb-0.5 flex items-center gap-0.5">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_DOT[a.status] ?? "bg-neutral-300"}`} />
      <p className="truncate text-[10px] text-neutral-700">
        {to12h(a.start_time)} {a.patientName}
      </p>
    </div>
  );
}

// ── Day cell ────────────────────────────────────────────────────────────────
function DayCell({ date, isToday, isWorking, isClosed, blocks, appointments, label }: {
  date: Date; isToday: boolean; isWorking: boolean; isClosed?: boolean;
  blocks: Block[]; appointments: Appointment[]; label?: string;
}) {
  const wholeDay  = blocks.some(b => !b.startTime);
  const timeBlocks = blocks.filter(b => b.startTime);

  return (
    <div className={`min-h-[90px] rounded-lg border p-1.5 ${
      isToday          ? "border-blue-300 bg-blue-50/30" :
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
          Closed: {blocks.find(b => !b.startTime)?.reason}
        </p>
      ) : (
        <>
          {timeBlocks.map(b => (
            <div key={b.id} className="mb-0.5 truncate rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
              {b.startTime?.slice(0,5)}–{b.endTime?.slice(0,5)} {b.reason}
            </div>
          ))}
          {appointments.map(a => <ApptItem key={a.id} a={a} />)}
          {appointments.length === 0 && timeBlocks.length === 0 && (
            <p className="text-center text-[10px] text-neutral-300">— Free —</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Day cell for technician (always "working", shows procedure name) ─────────
function TechDayCell({ date, isToday, appointments, label }: {
  date: Date; isToday: boolean; appointments: Appointment[]; label?: string;
}) {
  const techAppts = appointments.filter(a => a.isTechProcedure);
  return (
    <div className={`min-h-[90px] rounded-lg border p-1.5 ${
      isToday ? "border-blue-300 bg-blue-50/30" : "border-neutral-200 bg-white"
    }`}>
      <p className={`mb-1 text-center text-[11px] font-medium ${isToday ? "text-blue-700" : "text-neutral-500"}`}>
        {label ?? `${DAY_NAMES[date.getDay()]} ${date.getDate()}`}
      </p>
      {techAppts.length === 0 ? (
        <p className="text-center text-[10px] text-neutral-300">— Free —</p>
      ) : (
        techAppts.map(a => (
          <div key={a.id} className="mb-0.5 rounded bg-teal-50 border border-teal-200 px-1 py-0.5">
            <p className="text-[10px] font-semibold text-teal-700 truncate">
              🔬 {to12h(a.start_time)}
            </p>
            <p className="text-[10px] text-teal-600 truncate">{a.procedureName}</p>
            <p className="text-[9px] text-neutral-400 truncate">{a.patientName}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ── Main calendar ────────────────────────────────────────────────────────────
export function ScheduleCalendar({
  doctors, technicians = [], workingHours, blocks, appointments, initialDate, initialView,
}: {
  doctors: Doctor[]; technicians?: Technician[];
  workingHours: DoctorWorkingHours[]; blocks: Block[];
  appointments: Appointment[]; initialDate: string; initialView: "week"|"day";
}) {
  const [view, setView]           = useState<"week"|"day">(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const today = todayJordan();
  const weekDates  = getWeekDates(currentDate);
  const viewDates  = view === "week" ? weekDates : [new Date(currentDate + "T00:00:00")];

  function navigate(dir: -1|1) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + (view === "week" ? 7 : 1) * dir);
    setCurrentDate(d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }));
  }

  function isWorking(doctorId: string, date: Date) {
    const dow = date.getDay();
    return workingHours.some(wh => wh.doctorId === doctorId && wh.dayOfWeek === dow);
  }

  function getDayAppts(doctorId: string|null, techId: string|null, dateStr: string): Appointment[] {
    return appointments.filter(a => {
      if (a.appt_date !== dateStr) return false;
      if (techId !== null) return a.technician_id === techId && a.isTechProcedure;
      if (doctorId !== null) return a.doctor_id === doctorId && !a.isTechProcedure;
      return true; // clinic overview: all
    }).sort((a,b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  }

  const dateRangeLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("en",{month:"short",day:"numeric"})} – ${weekDates[6].toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}`
    : (() => { const [y,m,d] = currentDate.split("-").map(Number); return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString("en",{timeZone:"Asia/Amman",weekday:"long",day:"numeric",month:"long",year:"numeric"}); })();

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Prev</button>
        <button onClick={() => setCurrentDate(today)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Today</button>
        <button onClick={() => navigate(1)}  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Next</button>
        <label className="relative flex items-center gap-1.5 cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
          <span className="text-neutral-700 whitespace-nowrap">{currentDate.split("-").reverse().join("/")}</span>
          <span className="text-neutral-400">📅</span>
          <input type="date" value={currentDate} onChange={e=>{ if(e.target.value) setCurrentDate(e.target.value); }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"/>
        </label>
        <div className="ml-4 flex overflow-hidden rounded-md border border-neutral-300">
          <button onClick={() => setView("week")} className={`px-3 py-1.5 text-sm ${view==="week"?"bg-neutral-900 text-white":"hover:bg-neutral-50"}`}>Week</button>
          <button onClick={() => setView("day")}  className={`px-3 py-1.5 text-sm ${view==="day" ?"bg-neutral-900 text-white":"hover:bg-neutral-50"}`}>Day</button>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">{dateRangeLabel}</p>

      {/* ── Clinic Overview — All Doctors + Technicians ── */}
      <div className="mb-4 rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-800 px-3 py-2 flex items-center gap-3">
          <p className="text-xs font-medium text-white">Clinic Overview</p>
          <span className="text-[10px] text-neutral-400">All Doctors & Technicians</span>
          <span className="ml-auto text-[10px] text-neutral-500">
            🔵 Doctor  🔬 Procedure
          </span>
        </div>
        <div className={`grid gap-1 p-2 ${view==="week"?"grid-cols-7":"grid-cols-1 max-w-xs"}`}>
          {viewDates.map(date => {
            const dateStr   = ds(date);
            const anyWorking = doctors.some(doc => isWorking(doc.id, date));
            const allAppts  = getDayAppts(null, null, dateStr);
            const allBlocks = blocks.filter(b => b.blockDate === dateStr);
            return (
              <DayCell key={dateStr} date={date} isToday={dateStr===today}
                isWorking={anyWorking || technicians.length > 0}
                blocks={allBlocks} appointments={allAppts} />
            );
          })}
        </div>
      </div>

      {/* ── Per-Doctor rows (no tech procedures) ── */}
      {doctors.map(doctor => (
        <div key={doctor.id} className="mb-3 rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-700 px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white">👨‍⚕️ {doctor.full_name}</p>
            <p className="text-[10px] text-neutral-400">Doctor Schedule</p>
          </div>
          <div className={`grid gap-1 p-2 ${view==="week"?"grid-cols-7":"grid-cols-1 max-w-xs"}`}>
            {viewDates.map(date => {
              const dateStr  = ds(date);
              const docAppts = getDayAppts(doctor.id, null, dateStr);
              return (
                <DayCell key={dateStr} date={date} isToday={dateStr===today}
                  isWorking={isWorking(doctor.id, date)}
                  blocks={blocks.filter(b => b.doctorId===doctor.id && b.blockDate===dateStr)}
                  appointments={docAppts} />
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Per-Technician rows (procedures only) ── */}
      {technicians.map(tech => (
        <div key={tech.id} className="mb-3 rounded-lg border border-teal-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-teal-100 bg-teal-700 px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white">🔬 {tech.full_name}</p>
            <p className="text-[10px] text-teal-200">Technician Schedule</p>
          </div>
          <div className={`grid gap-1 p-2 ${view==="week"?"grid-cols-7":"grid-cols-1 max-w-xs"}`}>
            {viewDates.map(date => {
              const dateStr  = ds(date);
              const techAppts = getDayAppts(null, tech.id, dateStr);
              return (
                <TechDayCell key={dateStr} date={date} isToday={dateStr===today}
                  appointments={techAppts} />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
