"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addExpense, deleteExpense, upsertStaffSalary } from "@/lib/actions/finance";

const EXPENSE_CATEGORIES = [
  "Electricity","Water","Rent","Salaries","Medical Supplies","Medications Stock",
  "Equipment Maintenance","Cleaning Services","Stationery & Office","Internet & Phone",
  "Insurance","Marketing","Software & IT","Lab & Tests","Other",
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Expense = { id: string; expense_date: string; category: string; description: string | null; amount: number; notes: string | null };
type StaffMember = { id: string; full_name: string; role: string };
type SalaryEntry = { name: string; role: string; salary: number };
type MonthlyPoint = { month: string; revenue: number; expenses: number; profit: number };
type UnclaimedEntry = { id: string; name: string; amount: number; count: number; earliestDate: string; latestDate: string };

function fmt(n: number, currency: string) { return `${n.toFixed(2)} ${currency}`; }

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div className="h-2 rounded-full bg-neutral-100 mt-1"><div className={`h-2 rounded-full ${color}`} style={{ width:`${pct}%` }} /></div>;
}

function StatCard({ label, value, sub, color="text-neutral-900", highlight }: { label: string; value: string; sub?: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white"}`}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-neutral-600 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}


function CustomRangePicker({ fromDate, toDate, activeTab }: { fromDate: string; toDate: string; activeTab: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo]     = useState(toDate);
  const [open, setOpen] = useState(false);

  function apply() {
    if (!from || !to) return;
    router.push(`/admin/finance?tab=${activeTab}&from=${from}&to=${to}`);
    setOpen(false);
  }

  return (
    <div className="relative flex items-center gap-2">
      <span className="text-xs text-neutral-500 font-medium">{fromDate} → {toDate}</span>
      <button onClick={() => setOpen(o => !o)}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
        Custom range
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg space-y-3 w-64">
          <p className="text-xs font-semibold text-neutral-700">Select date range</p>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[10px] text-neutral-500">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-neutral-500">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={apply}
              className="flex-1 rounded-md bg-neutral-900 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
              Apply
            </button>
            <button onClick={() => setOpen(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinanceDashboard({
  currency, fromDate, toDate, period, tab,
  cashTotal, hospitalPaid, insurancePaid, totalRevenue,
  hospOutstanding, insOutstanding, hospWrittenOff, insWrittenOff, methodBreakdown,
  expenses, totalExpenses, expByCategory, totalSalaries, totalCosts, netProfit,
  monthlyTrend,
  staff, latestSalaries, clinicId,
  unclaimedInsurance, unclaimedHospital, totalUnclaimed,
}: {
  currency: string; fromDate: string; toDate: string; period: string; tab: string;
  cashTotal: number; hospitalPaid: number; insurancePaid: number; totalRevenue: number;
  hospOutstanding: number; insOutstanding: number; hospWrittenOff: number; insWrittenOff: number; methodBreakdown: Record<string, number>;
  expenses: Expense[]; totalExpenses: number; expByCategory: Record<string, number>;
  totalSalaries: number; totalCosts: number; netProfit: number;
  monthlyTrend: MonthlyPoint[];
  staff: StaffMember[]; latestSalaries: SalaryEntry[]; clinicId: string;
  unclaimedInsurance: UnclaimedEntry[]; unclaimedHospital: UnclaimedEntry[]; totalUnclaimed: number;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab);
  const [error, setError] = useState<string | null>(null);

  // Expense form
  const [expDate, setExpDate]     = useState(toDate);
  const [expCat, setExpCat]       = useState(EXPENSE_CATEGORIES[0]);
  const [expDesc, setExpDesc]     = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes]   = useState("");
  const [addingExp, setAddingExp] = useState(false);

  // Salary form
  const [salUserId, setSalUserId]   = useState(staff[0]?.id ?? "");
  const [salAmount, setSalAmount]   = useState("");
  const [salFrom, setSalFrom]       = useState(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`);
  const [savingSal, setSavingSal]   = useState(false);

  // Period selector
  const PERIODS = [{ key:"week",label:"7 days"},{ key:"month",label:"This month"},{ key:"year",label:"This year"}];
  const TABS = [
    { id:"overview",  label:"Overview" },
    { id:"revenue",   label:"Revenue" },
    { id:"expenses",  label:"Expenses" },
    { id:"salaries",  label:"Staff & Salaries" },
    { id:"reports",   label:"Reports" },
    { id:"unclaimed",  label:"Unclaimed Revenue 🔴" },
  ];

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expAmount || parseFloat(expAmount) <= 0) { setError("Enter a valid amount."); return; }
    setAddingExp(true); setError(null);
    const result = await addExpense({ expenseDate: expDate, category: expCat, description: expDesc || undefined, amount: parseFloat(expAmount), notes: expNotes || undefined });
    setAddingExp(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setExpDesc(""); setExpAmount(""); setExpNotes("");
    router.refresh();
  }

  async function handleSaveSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!salAmount || parseFloat(salAmount) <= 0) { setError("Enter a valid salary."); return; }
    setSavingSal(true); setError(null);
    const result = await upsertStaffSalary({ userId: salUserId, monthlySalary: parseFloat(salAmount), effectiveFrom: salFrom });
    setSavingSal(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setSalAmount("");
    router.refresh();
  }

  const maxBar = Math.max(...monthlyTrend.map(m => Math.max(m.revenue, m.expenses)), 1);

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <Link key={p.key} href={`/admin/finance?tab=${activeTab}&period=${p.key}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${period === p.key ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
              {p.label}
            </Link>
          ))}
        </div>
        <CustomRangePicker fromDate={fromDate} toDate={toDate} activeTab={activeTab} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total Revenue" value={fmt(totalRevenue, currency)} color="text-green-700" />
            <StatCard label="Total Costs"   value={fmt(totalCosts, currency)}   color="text-red-600" />
            <StatCard label="Net Profit"    value={fmt(netProfit, currency)}    color={netProfit >= 0 ? "text-emerald-700" : "text-red-700"} highlight={netProfit < 0} />
            <div className={`rounded-xl border p-4 shadow-sm ${(hospOutstanding + insOutstanding + totalUnclaimed) > 0 ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"}`}>
              <p className={`text-xl font-bold ${(hospOutstanding + insOutstanding) > 0 ? "text-amber-700" : "text-neutral-400"}`}>
                {fmt(hospOutstanding + insOutstanding, currency)}
              </p>
              <p className="text-xs font-medium text-neutral-700 mt-0.5">Outstanding Claims</p>
              <p className="text-[10px] text-neutral-400">Claimed but not yet paid</p>
              {totalUnclaimed > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-xs font-bold text-red-600">{fmt(totalUnclaimed, currency)}</p>
                  <p className="text-[10px] text-red-500">+ Not yet invoiced</p>
                </div>
              )}
            </div>
          </div>

          {/* Debug info — remove after confirming numbers */}
          <details className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-500">
            <summary className="cursor-pointer font-medium">Debug: raw claim data</summary>
            <div className="mt-2 space-y-1 font-mono">
              <div>hospOutstanding: {hospOutstanding.toFixed(2)}</div>
              <div>insOutstanding: {insOutstanding.toFixed(2)}</div>
              <div>hospWrittenOff: {hospWrittenOff.toFixed(2)}</div>
              <div>insWrittenOff: {insWrittenOff.toFixed(2)}</div>
              <div>totalUnclaimed: {totalUnclaimed.toFixed(2)}</div>
              <div>cashTotal: {cashTotal.toFixed(2)}</div>
              <div>hospitalPaid: {hospitalPaid.toFixed(2)}</div>
              <div>insurancePaid: {insurancePaid.toFixed(2)}</div>
            </div>
          </details>

          {/* Revenue breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-3">Revenue Sources</p>
              {[
                { label:"Cash / Card",  value: cashTotal,     color:"bg-emerald-400" },
                { label:"Hospital Claims Paid", value: hospitalPaid,  color:"bg-blue-400" },
                { label:"Insurance Claims Paid", value: insurancePaid, color:"bg-violet-400" },
              ].map(r => (
                <div key={r.label} className="mb-3">
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>{r.label}</span>
                    <span className="font-medium">{r.value.toFixed(2)} {currency}</span>
                  </div>
                  <MiniBar value={r.value} max={totalRevenue || 1} color={r.color} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-3">Cost Breakdown</p>
              {[
                { label:"Operating Expenses", value: totalExpenses, color:"bg-orange-400" },
                { label:"Staff Salaries",     value: totalSalaries, color:"bg-red-400" },
              ].map(r => (
                <div key={r.label} className="mb-3">
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>{r.label}</span>
                    <span className="font-medium">{r.value.toFixed(2)} {currency}</span>
                  </div>
                  <MiniBar value={r.value} max={totalCosts || 1} color={r.color} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-3">Claims Status</p>
              {[
                { label:"Hospital — outstanding", value: hospOutstanding, color:"bg-amber-400", textColor:"text-amber-700" },
                { label:"Insurance — outstanding", value: insOutstanding, color:"bg-orange-400", textColor:"text-orange-700" },
              ].map(r => (
                <div key={r.label} className="mb-3">
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>{r.label}</span>
                    <span className={`font-medium ${r.textColor}`}>{r.value.toFixed(2)} {currency}</span>
                  </div>
                  <MiniBar value={r.value} max={(hospOutstanding + insOutstanding + hospWrittenOff + insWrittenOff) || 1} color={r.color} />
                </div>
              ))}
              <div className="mt-3 border-t border-neutral-100 pt-3 text-xs font-bold text-amber-700">
                Outstanding: {fmt(hospOutstanding + insOutstanding, currency)}
              </div>
              {(hospWrittenOff + insWrittenOff) > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-neutral-100">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Closed at partial (written off)</span>
                    <span className="font-medium">{fmt(hospWrittenOff + insWrittenOff, currency)}</span>
                  </div>
                  <p className="text-[10px] text-neutral-300 mt-0.5">Doctor closed — no longer requested</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly trend chart */}
          {monthlyTrend.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Monthly Trend (last 12 months)</p>
              <div className="flex items-end gap-2 h-32">
                {monthlyTrend.map(m => {
                  const [, mon] = m.month.split("-");
                  const rh = Math.round((m.revenue  / maxBar) * 100);
                  const eh = Math.round((m.expenses / maxBar) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex gap-0.5 items-end" style={{ height:"112px" }}>
                        <div className="flex-1 rounded-t bg-green-400 transition-all" style={{ height:`${rh}%`, minHeight:"2px" }} title={`Revenue: ${m.revenue.toFixed(2)}`} />
                        <div className="flex-1 rounded-t bg-red-400 transition-all"   style={{ height:`${eh}%`, minHeight:"2px" }} title={`Expenses: ${m.expenses.toFixed(2)}`} />
                      </div>
                      <span className="text-[9px] text-neutral-400">{MONTHS_SHORT[parseInt(mon)-1]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 text-[10px] text-neutral-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400 inline-block"/>{`Revenue`}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block"/>{`Expenses`}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {activeTab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cash & Card Collected" value={fmt(cashTotal, currency)} color="text-green-700" />
            <StatCard label="Hospital Claims Received" value={fmt(hospitalPaid, currency)} color="text-blue-700" />
            <StatCard label="Insurance Claims Received" value={fmt(insurancePaid, currency)} color="text-violet-700" />
          </div>

          {/* Payment methods */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Cash Payments by Method</p>
            {Object.keys(methodBreakdown).length === 0
              ? <p className="text-xs text-neutral-400">No payments in this period.</p>
              : Object.entries(methodBreakdown).map(([method, amt]) => (
                <div key={method} className="mb-2">
                  <div className="flex justify-between text-xs text-neutral-700">
                    <span className="capitalize">{method}</span>
                    <span className="font-medium">{fmt(amt, currency)}</span>
                  </div>
                  <MiniBar value={amt} max={cashTotal || 1} color="bg-emerald-400" />
                </div>
              ))}
          </div>

          {/* Outstanding */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Outstanding (All Time)</p>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xl font-bold text-amber-800">{fmt(hospOutstanding, currency)}</p><p className="text-xs text-amber-600">Hospital claims</p></div>
              <div><p className="text-xl font-bold text-amber-800">{fmt(insOutstanding, currency)}</p><p className="text-xs text-amber-600">Insurance claims</p></div>
            </div>
            <p className="mt-3 text-sm font-bold text-amber-900 border-t border-amber-200 pt-3">
              Total outstanding: {fmt(hospOutstanding + insOutstanding, currency)}
            </p>
            {(hospWrittenOff + insWrittenOff) > 0 && (
              <div className="mt-3 border-t border-dashed border-amber-200 pt-3">
                <p className="text-xs text-amber-700 font-semibold mb-1">Closed at partial — written off</p>
                <div className="grid grid-cols-2 gap-3 text-xs text-amber-600">
                  {hospWrittenOff > 0 && <div>Hospital: <strong>{fmt(hospWrittenOff, currency)}</strong></div>}
                  {insWrittenOff  > 0 && <div>Insurance: <strong>{fmt(insWrittenOff, currency)}</strong></div>}
                </div>
                <p className="text-[10px] text-amber-500 mt-2">
                  These amounts were claimed but doctor closed them — no longer being pursued.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Expenses" value={fmt(totalExpenses, currency)} color="text-red-600" />
            <StatCard label="Total Salaries" value={fmt(totalSalaries, currency)} color="text-orange-600" sub="Based on active salaries" />
            <StatCard label="Total Costs" value={fmt(totalCosts, currency)} color="text-neutral-800" />
          </div>

          {/* Category breakdown */}
          {Object.keys(expByCategory).length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Expenses by Category</p>
              {Object.entries(expByCategory).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
                <div key={cat} className="mb-2">
                  <div className="flex justify-between text-xs text-neutral-700">
                    <span>{cat}</span><span className="font-medium">{fmt(amt, currency)}</span>
                  </div>
                  <MiniBar value={amt} max={totalExpenses || 1} color="bg-orange-400" />
                </div>
              ))}
            </div>
          )}

          {/* Add expense form */}
          <form onSubmit={handleAddExpense} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-neutral-900">+ Add Expense</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Date *</label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Category *</label>
                <select value={expCat} onChange={e => setExpCat(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Amount ({currency}) *</label>
                <input type="number" min="0" step="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} required
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-neutral-600">Description</label>
                <input value={expDesc} onChange={e => setExpDesc(e.target.value)}
                  placeholder="e.g. Monthly electricity bill — EDCO"
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Notes</label>
                <input value={expNotes} onChange={e => setExpNotes(e.target.value)}
                  placeholder="Optional reference number etc."
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={addingExp}
              className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingExp ? "Adding..." : "+ Add Expense"}
            </button>
          </form>

          {/* Expenses list */}
          {expenses.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-neutral-500">Date</th>
                  <th className="px-3 py-2 text-xs font-medium text-neutral-500">Category</th>
                  <th className="px-3 py-2 text-xs font-medium text-neutral-500">Description</th>
                  <th className="px-3 py-2 text-xs font-medium text-neutral-500 text-right">Amount</th>
                  <th className="px-3 py-2" />
                </tr></thead>
                <tbody className="divide-y divide-neutral-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 text-xs text-neutral-600">{e.expense_date}</td>
                      <td className="px-3 py-2 text-xs font-medium text-neutral-800">{e.category}</td>
                      <td className="px-3 py-2 text-xs text-neutral-500">{e.description ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-medium text-red-600">{e.amount.toFixed(2)} {currency}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={async () => { if (confirm("Delete this expense?")) { await deleteExpense(e.id); router.refresh(); } }}
                          className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-neutral-200 bg-neutral-50">
                  <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-neutral-700 text-right">Total</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-red-700">{fmt(totalExpenses, currency)}</td>
                  <td />
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SALARIES TAB ── */}
      {activeTab === "salaries" && (
        <div className="space-y-4">
          {/* Current salaries */}
          {latestSalaries.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3">
                <p className="text-sm font-medium text-neutral-900">Current Monthly Salaries</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Staff Member</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Role</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-right">Monthly Salary</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-50">
                  {latestSalaries.map(s => (
                    <tr key={s.name} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs capitalize text-neutral-500">{s.role}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-neutral-800">{fmt(s.salary, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-neutral-200 bg-neutral-50">
                  <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-right">Total monthly payroll</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-orange-700">{fmt(latestSalaries.reduce((s,x) => s+x.salary, 0), currency)}</td>
                </tr></tfoot>
              </table>
            </div>
          )}

          {/* Assign / update salary */}
          <form onSubmit={handleSaveSalary} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-neutral-900">Assign / Update Salary</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Staff Member *</label>
                <select value={salUserId} onChange={e => setSalUserId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Monthly Salary ({currency}) *</label>
                <input type="number" min="0" step="0.01" value={salAmount} onChange={e => setSalAmount(e.target.value)} required
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Effective From *</label>
                <input type="date" value={salFrom} onChange={e => setSalFrom(e.target.value)} required
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={savingSal}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {savingSal ? "Saving..." : "Save Salary"}
            </button>
          </form>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* P&L Summary */}
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-semibold text-neutral-900">Profit &amp; Loss — {fromDate} to {toDate}</p>
              <a href={`/print/finance-report?from=${fromDate}&to=${toDate}&currency=${currency}`}
                target="_blank" rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                Print Report
              </a>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-neutral-100">
                    <td colSpan={2} className="py-2 text-xs font-bold uppercase tracking-wide text-neutral-500">INCOME</td>
                  </tr>
                  {[
                    ["Cash & Card Payments", cashTotal],
                    ["Hospital Claims Received", hospitalPaid],
                    ["Insurance Claims Received", insurancePaid],
                  ].map(([label, val]) => (
                    <tr key={label as string} className="border-b border-neutral-50">
                      <td className="py-2 pl-4 text-neutral-700">{label as string}</td>
                      <td className="py-2 text-right font-mono text-green-700 font-medium">{(val as number).toFixed(2)} {currency}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-neutral-200 bg-green-50">
                    <td className="py-2 pl-2 font-bold text-neutral-900">Total Revenue</td>
                    <td className="py-2 text-right font-mono font-bold text-green-800">{fmt(totalRevenue, currency)}</td>
                  </tr>
                  <tr className="border-b border-neutral-100 mt-2">
                    <td colSpan={2} className="py-2 text-xs font-bold uppercase tracking-wide text-neutral-500 pt-4">EXPENSES</td>
                  </tr>
                  {Object.entries(expByCategory).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
                    <tr key={cat} className="border-b border-neutral-50">
                      <td className="py-2 pl-4 text-neutral-700">{cat}</td>
                      <td className="py-2 text-right font-mono text-red-600">{amt.toFixed(2)} {currency}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-neutral-50">
                    <td className="py-2 pl-4 text-neutral-700">Staff Salaries</td>
                    <td className="py-2 text-right font-mono text-red-600">{totalSalaries.toFixed(2)} {currency}</td>
                  </tr>
                  <tr className="border-b border-neutral-200 bg-red-50">
                    <td className="py-2 pl-2 font-bold text-neutral-900">Total Costs</td>
                    <td className="py-2 text-right font-mono font-bold text-red-800">{fmt(totalCosts, currency)}</td>
                  </tr>
                  <tr className={`${netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                    <td className="py-3 pl-2 text-base font-bold">Net {netProfit >= 0 ? "Profit" : "Loss"}</td>
                    <td className={`py-3 text-right font-mono text-lg font-bold ${netProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      {netProfit >= 0 ? "+" : ""}{fmt(netProfit, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pl-2 text-xs text-neutral-500">Outstanding (uncollected)</td>
                    <td className="py-2 text-right font-mono text-xs text-amber-700">{fmt(hospOutstanding + insOutstanding, currency)}</td>
                  </tr>
                  {(hospWrittenOff + insWrittenOff) > 0 && (
                    <tr>
                      <td className="py-2 pl-2 text-xs text-neutral-400">Closed at partial — written off</td>
                      <td className="py-2 text-right font-mono text-xs text-neutral-400">{fmt(hospWrittenOff + insWrittenOff, currency)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax estimate */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-neutral-900">Tax Estimate</p>
            <p className="text-xs text-neutral-500 mb-3">Taxable income = Revenue − Allowable expenses. Consult your accountant for the exact rate.</p>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-600">Gross Revenue</td>
                  <td className="text-right font-mono font-medium">{fmt(totalRevenue, currency)}</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-600">Deductible Expenses</td>
                  <td className="text-right font-mono text-red-600">−{fmt(totalCosts, currency)}</td>
                </tr>
                <tr className="border-b border-neutral-200 font-bold">
                  <td className="py-2">Taxable Net Profit</td>
                  <td className={`text-right font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(netProfit, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monthly detail table */}
          {monthlyTrend.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 px-4 py-3">
                <p className="text-sm font-medium text-neutral-900">Monthly Breakdown</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-neutral-500">Month</th>
                  <th className="px-4 py-2 text-xs font-medium text-neutral-500 text-right">Revenue</th>
                  <th className="px-4 py-2 text-xs font-medium text-neutral-500 text-right">Expenses</th>
                  <th className="px-4 py-2 text-xs font-medium text-neutral-500 text-right">Profit / Loss</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-50">
                  {monthlyTrend.map(m => {
                    const [y, mon] = m.month.split("-");
                    return (
                      <tr key={m.month} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 font-medium text-neutral-800">{MONTHS_SHORT[parseInt(mon)-1]} {y}</td>
                        <td className="px-4 py-2 text-right font-mono text-green-700">{m.revenue.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-mono text-red-600">{m.expenses.toFixed(2)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${m.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {m.profit >= 0 ? "+" : ""}{m.profit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── UNCLAIMED REVENUE TAB ── */}
      {activeTab === "unclaimed" && (
        <div className="space-y-5">
          <div className={`rounded-xl border p-4 shadow-sm ${totalUnclaimed > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <p className={`text-2xl font-bold ${totalUnclaimed > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(totalUnclaimed, currency)}</p>
            <p className="text-sm font-medium text-neutral-700 mt-0.5">{totalUnclaimed > 0 ? "Total unclaimed revenue — ready to generate claims" : "All revenue is claimed ✓"}</p>
          </div>

          {unclaimedInsurance.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-semibold text-neutral-900">🏦 Insurance Companies — Unclaimed</p>
                <p className="text-xs text-neutral-400 mt-0.5">Finalized outpatient visits not yet included in any claim</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Insurance</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Period</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-center">Visits</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-right">Amount</th>
                  <th className="px-4 py-2.5"></th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-50">
                  {unclaimedInsurance.map(e => (
                    <tr key={e.id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{e.name}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{e.earliestDate} → {e.latestDate}</td>
                      <td className="px-4 py-3 text-center"><span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">{e.count}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{fmt(e.amount, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/secretary/insurance-claims`} className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
                          Generate Claim →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-neutral-200 bg-neutral-50">
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-right text-neutral-600">Total unclaimed (insurance)</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">{fmt(unclaimedInsurance.reduce((s, e) => s + e.amount, 0), currency)}</td>
                  <td />
                </tr></tfoot>
              </table>
            </div>
          )}

          {unclaimedHospital.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-semibold text-neutral-900">🏨 Hospitals — Unclaimed</p>
                <p className="text-xs text-neutral-400 mt-0.5">Completed inpatient visits not yet included in any claim</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Hospital</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Period</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-center">Visits</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-right">Amount</th>
                  <th className="px-4 py-2.5"></th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-50">
                  {unclaimedHospital.map(e => (
                    <tr key={e.id} className="hover:bg-blue-50/30">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{e.name}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{e.earliestDate} → {e.latestDate}</td>
                      <td className="px-4 py-3 text-center"><span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">{e.count}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{fmt(e.amount, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/doctor/claims`} className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
                          Generate Claim →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-neutral-200 bg-neutral-50">
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-right text-neutral-600">Total unclaimed (hospitals)</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">{fmt(unclaimedHospital.reduce((s, e) => s + e.amount, 0), currency)}</td>
                  <td />
                </tr></tfoot>
              </table>
            </div>
          )}

          {unclaimedInsurance.length === 0 && unclaimedHospital.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-medium text-neutral-700">All revenue has been claimed</p>
              <p className="text-xs text-neutral-400 mt-1">No outstanding unclaimed visits found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}