"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Payment {
  id: string;
  appt_date: string;
  payment_method: string | null;
  payment_amount: number | null;
  patientName: string;
  doctorName: string;
}

export function FinanceDashboard({
  currency,
  fromDate,
  toDate,
  totalIncome,
  paymentCount,
  payments,
}: {
  currency: string;
  fromDate: string;
  toDate: string;
  totalIncome: number;
  paymentCount: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);

  function handleRefresh() {
    router.push(`/admin/finance?from=${from}&to=${to}`);
  }

  const byMethod = payments.reduce((acc, p) => {
    const m = p.payment_method ?? "unknown";
    acc[m] = (acc[m] ?? 0) + (p.payment_amount ?? 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Date range filter */}
      <div className="mb-6 flex items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={handleRefresh}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-semibold text-emerald-700">{totalIncome.toFixed(2)} {currency}</p>
          <p className="text-xs text-neutral-500">Total Income</p>
          <p className="text-xs text-neutral-400">{paymentCount} payments</p>
        </div>
        {Object.entries(byMethod).map(([method, amount]) => (
          <div key={method} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xl font-semibold text-neutral-800">{amount.toFixed(2)} {currency}</p>
            <p className="text-xs text-neutral-500 capitalize">{method}</p>
          </div>
        ))}
      </div>

      {/* Payments table */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-sm font-medium text-neutral-900">Payment records</p>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">No payments recorded in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Date</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Patient</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Method</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-xs text-neutral-500">{p.appt_date}</td>
                  <td className="px-4 py-2 text-sm text-neutral-900">{p.patientName}</td>
                  <td className="px-4 py-2 text-xs capitalize text-neutral-600">{p.payment_method ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-neutral-900">
                    {p.payment_amount !== null ? `${p.payment_amount.toFixed(2)} ${currency}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td colSpan={3} className="px-4 py-2 text-right text-xs font-medium text-neutral-600">Total</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-emerald-700">
                  {totalIncome.toFixed(2)} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
