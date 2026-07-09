"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { markFinalized } from "@/lib/actions/appointments";

interface Appt {
  id: string;
  appt_date: string;
  start_time: string | null;
  visit_type: string;
  status: string;
  payment_confirmed: boolean | null;
  payment_method: string | null;
  patientName: string;
  patientId: string;
  phone: string;
  doctorName: string;
}

export default function UnfinalizedClient({
  appointments, currency,
}: { appointments: Appt[]; currency: string }) {
  const router = useRouter();
  const [search, setSearch]           = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [finalizing, setFinalizing]   = useState<string | null>(null);
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [done, setDone]               = useState<Set<string>>(new Set());

  const filtered = useMemo(() => appointments.filter(a => {
    if (done.has(a.id)) return false;
    if (search && !a.patientName.toLowerCase().includes(search.toLowerCase()) &&
        !a.phone.includes(search)) return false;
    if (dateFrom && a.appt_date < dateFrom) return false;
    if (dateTo   && a.appt_date > dateTo)   return false;
    return true;
  }), [appointments, search, dateFrom, dateTo, done]);

  const today = new Date().toISOString().split("T")[0];
  const pastDue = filtered.filter(a => a.appt_date < today);
  const todayList = filtered.filter(a => a.appt_date === today);

  async function handleFinalize(id: string) {
    setFinalizing(id);
    await markFinalized(id);
    setFinalizing(null);
    setConfirmId(null);
    setDone(prev => new Set([...prev, id]));
    router.refresh();
  }

  function Row({ a }: { a: Appt }) {
    const isPast = a.appt_date < today;
    return (
      <tr className={`hover:bg-neutral-50 ${isPast ? "bg-amber-50/40" : ""}`}>
        <td className="px-4 py-3">
          <p className="font-medium text-neutral-900 text-sm">{a.patientName}</p>
          <p className="text-xs text-neutral-400 font-mono">{a.phone}</p>
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600">
          <span className={isPast ? "font-semibold text-amber-700" : ""}>{a.appt_date}</span>
          {isPast && <span className="ml-1 text-[10px] text-amber-600">past</span>}
        </td>
        <td className="px-4 py-3 text-xs text-neutral-500">{a.start_time?.slice(0,5) ?? "—"}</td>
        <td className="px-4 py-3 text-xs capitalize text-neutral-600">{a.visit_type?.replace("_"," ")}</td>
        <td className="px-4 py-3 text-xs text-neutral-500">{a.doctorName}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            a.status === "with_doctor" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
          }`}>{a.status === "with_doctor" ? "With doctor" : "Done"}</span>
        </td>
        <td className="px-4 py-3">
          {a.payment_confirmed
            ? <span className="text-[10px] text-green-700 font-semibold">✓ Paid</span>
            : <span className="text-[10px] text-amber-600">Unpaid</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {confirmId === a.id ? (
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs text-neutral-600">Finalize?</span>
              <button disabled={finalizing === a.id} onClick={() => handleFinalize(a.id)}
                className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50">
                {finalizing === a.id ? "..." : "Yes"}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600">No</button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <a href={`/secretary/patients/${a.patientId}`}
                className="text-xs text-neutral-400 hover:text-neutral-600">Info</a>
              <button onClick={() => setConfirmId(a.id)}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                Finalize
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Unfinalized Visits</h1>
          <p className="text-sm text-neutral-500">{filtered.length} visit{filtered.length !== 1 ? "s" : ""} need finalizing</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search patient or phone…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none w-56" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none" />
        <span className="self-center text-neutral-400 text-sm">→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none" />
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-neutral-400 hover:text-neutral-600">Clear</button>
        )}
        <button onClick={() => { setDateFrom(today); setDateTo(today); }}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50">Today</button>
        <button onClick={() => { const w = new Date(Date.now()-7*86400000).toISOString().split("T")[0]; setDateFrom(w); setDateTo(today); }}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50">Last 7 days</button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center text-neutral-400">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium">All caught up! No unfinalized visits.</p>
        </div>
      ) : (
        <>
          {pastDue.length > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                ⚠ {pastDue.length} from previous days
              </span>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Doctor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {todayList.map(a => <Row key={a.id} a={a} />)}
                {pastDue.map(a => <Row key={a.id} a={a} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
