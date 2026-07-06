"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type CashPayment = {
  id: string;
  appt_date: string;
  payment_amount: number | null;
  payment_method: string | null;
  payment_confirmed: boolean;
  payment_confirmed_at: string | null;
  patientName: string;
  doctorName: string;
};

interface Props {
  initialPayments: CashPayment[];
  fromDate: string;
  toDate: string;
  currency: string;
  clinicId: string;
}

export function CashPaymentsTab({ initialPayments, fromDate: initFrom, toDate: initTo, currency, clinicId }: Props) {
  const [from, setFrom]         = useState(initFrom);
  const [to, setTo]             = useState(initTo);
  const [payments, setPayments] = useState<CashPayment[]>(initialPayments);
  const [loading, setLoading]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<string | null>(null);
  const [, startTransition]     = useTransition();

  const total = payments.reduce((s, p) => s + (p.payment_amount ?? 0), 0);

  async function fetchPayments(f: string, t: string) {
    setLoading(true);
    const sb = createClient();
    const { data: appts } = await sb
      .from("appointments")
      .select("id, appt_date, payment_amount, payment_method, payment_confirmed, payment_confirmed_at, patient_id, users!appointments_doctor_id_fkey(full_name)")
      .eq("clinic_id", clinicId)
      .eq("payment_method", "cash")
      .eq("payment_confirmed", true)
      .gte("appt_date", f)
      .lte("appt_date", t)
      .order("appt_date", { ascending: false });

    const patientIds = [...new Set((appts ?? []).map(a => a.patient_id))];
    const { data: pts } = patientIds.length
      ? await sb.from("patients").select("id, full_name").in("id", patientIds)
      : { data: [] };
    const ptMap = Object.fromEntries((pts ?? []).map(p => [p.id, p.full_name]));

    setPayments((appts ?? []).map(a => ({
      id: a.id,
      appt_date: a.appt_date,
      payment_amount: a.payment_amount,
      payment_method: a.payment_method,
      payment_confirmed: a.payment_confirmed,
      payment_confirmed_at: a.payment_confirmed_at,
      patientName: ptMap[a.patient_id] ?? "Unknown",
      doctorName: Array.isArray(a.users)
        ? (a.users[0] as { full_name: string })?.full_name ?? "—"
        : (a.users as { full_name: string } | null)?.full_name ?? "—",
    })));
    setLoading(false);
  }

  function startEdit(p: CashPayment) {
    setEditId(p.id);
    setEditAmount(String(p.payment_amount ?? ""));
  }

  async function saveEdit(id: string) {
    const newAmt = parseFloat(editAmount);
    if (isNaN(newAmt) || newAmt < 0) { alert("Invalid amount"); return; }
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("appointments")
      .update({ payment_amount: newAmt })
      .eq("id", id);
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    setPayments(prev => prev.map(p => p.id === id ? { ...p, payment_amount: newAmt } : p));
    setEditId(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div>
      {/* Date range filter */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        </div>
        <button
          onClick={() => fetchPayments(from, to)}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Loading..." : "Apply"}
        </button>
        {/* Quick ranges */}
        <div className="flex gap-2">
          {[
            { label: "Today", days: 0 },
            { label: "This week", days: 6 },
            { label: "This month", days: 29 },
          ].map(({ label, days }) => (
            <button key={label} type="button"
              onClick={() => {
                const t = new Date().toISOString().split("T")[0];
                const f = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
                setFrom(f); setTo(t);
                startTransition(() => fetchPayments(f, t));
              }}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-500 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="mb-5 flex gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Total Cash Collected</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{total.toFixed(2)} <span className="text-sm font-normal text-neutral-400">{currency}</span></p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Transactions</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{payments.length}</p>
        </div>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center text-neutral-400">
          No cash payments found for this period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Doctor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Amount ({currency})</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 text-neutral-600">{p.appt_date}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{p.patientName}</td>
                  <td className="px-4 py-3 text-neutral-500">{p.doctorName}</td>
                  <td className="px-4 py-3 text-right">
                    {editId === p.id ? (
                      <input
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        min={0}
                        step={0.01}
                        autoFocus
                        className="w-28 rounded-md border border-blue-400 px-2 py-1 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-300"
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(p.id); if (e.key === "Escape") setEditId(null); }}
                      />
                    ) : (
                      <span className={`font-semibold ${saved === p.id ? "text-green-600" : "text-neutral-900"}`}>
                        {saved === p.id ? "✓ " : ""}{(p.payment_amount ?? 0).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editId === p.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => saveEdit(p.id)}
                          disabled={saving}
                          className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-neutral-900">{total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-neutral-400">Only confirmed cash payments are shown. Use Edit to correct a wrong amount.</p>
    </div>
  );
}
