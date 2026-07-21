"use client";
import { useState } from "react";
import { JordanDateInput } from "@/components/ui/jordan-date-input";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Patient {
  id: string; name: string; phone: string;
  hasInsurance: boolean; hasDob: boolean;
  hasLastName: boolean; hasGender: boolean;
  createdAt: string | null; badge: string;
}

interface ApptPatient extends Patient {
  appointmentId: string; status: string;
  visitType: string; startTime: string | null;
  doctorName: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  confirmed:  { label: "Confirmed",  color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  booked:     { label: "Booked",     color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200" },
  with_doctor:{ label: "With Doctor",color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  done:       { label: "Done",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  finalized:  { label: "Finalized",  color: "text-neutral-700", bg: "bg-neutral-50 border-neutral-200" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

function PatientRow({ p, showTime, showStatus }: {
  p: ApptPatient | Patient; showTime?: boolean; showStatus?: boolean;
}) {
  const appt = "appointmentId" in p ? p as ApptPatient : null;
  const s = appt ? (STATUS_LABEL[appt.status] ?? STATUS_LABEL.booked) : null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
          {p.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900 truncate">{p.name}</span>
            {!p.hasLastName && <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">⚠ No Last Name</span>}
            {!p.hasGender && <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">⚠ No Gender</span>}
            {!p.hasDob && <span className="text-[9px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">⚠ No DOB</span>}
            {p.hasInsurance && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">🏥 Ins</span>}
            {showStatus && s && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${s.bg} ${s.color}`}>{s.label}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {p.phone && <span className="text-xs text-neutral-400">{p.phone}</span>}
            {appt?.startTime && showTime && <span className="text-xs text-neutral-400">· {appt.startTime.slice(0,5)}</span>}
            {appt?.doctorName && <span className="text-xs text-neutral-400">· {appt.doctorName}</span>}
            {p.createdAt && <span className="text-xs text-neutral-400">· Added {timeAgo(p.createdAt)}</span>}
          </div>
        </div>
      </div>
      <Link href={`/secretary/patients/${p.id}`}
        className="ml-3 shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition">
        Open →
      </Link>
    </div>
  );
}

function Group({ title, icon, count, color, headerColor="bg-white border-neutral-200", children }: {
  title: string; icon: string; count: number; color: string; headerColor?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className={`border-2 rounded-xl overflow-hidden ${headerColor}`}>
      <button onClick={() => setOpen(o=>!o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 hover:opacity-90 transition text-left ${headerColor}`}>
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-neutral-800">{title}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{count}</span>
        </div>
        <span className={`text-xs text-neutral-400 transition-transform duration-200 ${open?"rotate-90":""}`}>▶</span>
      </button>
      {open && <div className="divide-y divide-neutral-100 border-t border-neutral-100">{children}</div>}
    </div>
  );
}

export function PatientQuickAccess({
  newPatients, todayAppointments, todayStr, patientDate,
}: {
  newPatients: Patient[];
  todayAppointments: ApptPatient[];
  todayStr: string;
  patientDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(patientDate);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<"time"|"alpha">("time");

  // Group appointments by status
  function sortPts<T extends {name:string; startTime?:string|null; createdAt?:string|null}>(arr: T[]) {
    return [...arr].sort((a,b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name);
      const ta = a.startTime ?? a.createdAt ?? "";
      const tb = b.startTime ?? b.createdAt ?? "";
      return ta.localeCompare(tb);
    });
  }
  const sortedNewPatients = sortPts(newPatients);
  const pending   = sortPts(todayAppointments.filter(a => a.status === "pending"));
  const booked    = sortPts(todayAppointments.filter(a => ["booked","confirmed"].includes(a.status)));
  const active    = sortPts(todayAppointments.filter(a => a.status === "with_doctor"));
  const done      = sortPts(todayAppointments.filter(a => ["done","finalized"].includes(a.status)));

  const totalCount = newPatients.length + todayAppointments.length;

  return (
    <div className="mb-5 rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition cursor-pointer"
        onClick={() => setOpen(o=>!o)}>
        <div className="flex items-center gap-3">
          <span className="text-base">👥</span>
          <div>
            <p className="text-sm font-bold text-neutral-900">Today's Patients</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {totalCount} patient{totalCount!==1?"s":""} · click to {open?"hide":"view"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div onClick={e=>e.stopPropagation()} className="shrink-0">
            <JordanDateInput value={date}
              onChange={v => { setDate(v); setOpen(true); if(v) router.push(`/secretary/dashboard?pdate=${v}`); }}
            />
          </div>
          <span className={`text-xs text-neutral-400 transition-transform duration-200 ${open?"rotate-90":""}`}>▶</span>
          <span className={`text-xs text-neutral-400 transition-transform duration-200 ${open?"rotate-90":""}`}>▶</span>
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="border-t border-neutral-100 p-3 space-y-2">
          {/* Sort toggle */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-400">{patientDate.split("-").reverse().join("/")} · {totalCount} patient{totalCount!==1?"s":""}</span>
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
              <button onClick={()=>setSort("time")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${sort==="time"?"bg-white shadow text-neutral-900":"text-neutral-500"}`}>
                ⏱ By Time
              </button>
              <button onClick={()=>setSort("alpha")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${sort==="alpha"?"bg-white shadow text-neutral-900":"text-neutral-500"}`}>
                A→Z
              </button>
            </div>
          </div>
          <Group title="New Registrations" icon="🆕" count={newPatients.length} color="bg-emerald-100 text-emerald-700" headerColor="bg-emerald-50 border-emerald-200">
            {sortedNewPatients.map(p => <PatientRow key={p.id} p={p}/>)}
          </Group>
          <Group title="Pending Call" icon="📋" count={pending.length} color="bg-amber-100 text-amber-700" headerColor="bg-amber-50 border-amber-200">
            {pending.map(p => <PatientRow key={p.id} p={p} showStatus/>)}
          </Group>
          <Group title="Booked / Confirmed" icon="📅" count={booked.length} color="bg-blue-100 text-blue-700" headerColor="bg-blue-50 border-blue-200">
            {booked.map(p => <PatientRow key={p.id} p={p} showTime showStatus/>)}
          </Group>
          <Group title="With Doctor" icon="🩺" count={active.length} color="bg-purple-100 text-purple-700" headerColor="bg-purple-50 border-purple-200">
            {active.map(p => <PatientRow key={p.id} p={p} showTime/>)}
          </Group>
          <Group title="Done / Finalized" icon="✅" count={done.length} color="bg-neutral-100 text-neutral-600" headerColor="bg-neutral-50 border-neutral-200">
            {done.map(p => <PatientRow key={p.id} p={p} showStatus/>)}
          </Group>
          {totalCount === 0 && (
            <p className="text-sm text-neutral-400 text-center py-6">No patients for {date.split("-").reverse().join("/")}</p>
          )}
        </div>
      )}
    </div>
  );
}
