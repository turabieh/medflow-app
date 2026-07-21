"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Appt {
  id: string; patientName: string; method: string;
  amount: number; visitFee: number; insuranceClaim: number;
}
interface SplitPayment { appointment_id: string; method: string; amount: number; reference_number: string | null; }

export default function DailyReportClient({
  targetDate, today, currency, clinicId, userName,
  appts, splitPayments, reconActualCash, reconNotes, reconConfirmedAt,
}: {
  targetDate: string; today: string; currency: string; clinicId: string; userName: string;
  appts: Appt[]; splitPayments: SplitPayment[];
  reconActualCash: number | null; reconNotes: string; reconConfirmedAt: string | null;
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(targetDate);
  const [actualCash, setActualCash] = useState(reconActualCash !== null ? String(reconActualCash) : "");
  const [notes, setNotes] = useState(reconNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!reconConfirmedAt);
  const [showDetails, setShowDetails] = useState(false);

  // Build payment breakdown
  // For each appointment, use split payments if they exist, else use the single method
  const splitMap = new Map<string, SplitPayment[]>();
  for (const sp of splitPayments) {
    if (!splitMap.has(sp.appointment_id)) splitMap.set(sp.appointment_id, []);
    splitMap.get(sp.appointment_id)!.push(sp);
  }

  const methodTotals: Record<string, number> = { cash:0, card:0, cliq:0, insurance:0, other:0 };
  const methodRows: Record<string, {patientName:string; amount:number; ref?:string}[]> = {
    cash:[], card:[], cliq:[], insurance:[], other:[],
  };

  for (const a of appts) {
    const splits = splitMap.get(a.id);
    if (splits && splits.length > 0) {
      for (const sp of splits) {
        const m = sp.method in methodTotals ? sp.method : "other";
        methodTotals[m] += sp.amount;
        methodRows[m].push({ patientName: a.patientName, amount: sp.amount, ref: sp.reference_number ?? undefined });
      }
    } else {
      const m = a.method in methodTotals ? a.method : "other";
      if (m === "insurance") {
        methodTotals.insurance += a.insuranceClaim;
        methodRows.insurance.push({ patientName: a.patientName, amount: a.insuranceClaim });
      } else {
        methodTotals[m] += a.amount;
        methodRows[m].push({ patientName: a.patientName, amount: a.amount });
      }
    }
  }

  const totalCollected = methodTotals.cash + methodTotals.card + methodTotals.cliq + methodTotals.other;
  const cashDiff = actualCash ? parseFloat(actualCash) - methodTotals.cash : null;

  async function saveReconciliation() {
    setSaving(true);
    const sb = createClient();
    await sb.from("daily_reconciliation").upsert({
      clinic_id: clinicId,
      recon_date: targetDate,
      actual_cash: actualCash ? parseFloat(actualCash) : null,
      notes: notes || null,
      confirmed_at: new Date().toISOString(),
    }, { onConflict: "clinic_id,recon_date" });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  const METHODS = [
    { key:"cash",      label:"💵 Cash",      color:"bg-emerald-50 border-emerald-200", text:"text-emerald-800", needsConfirm: true },
    { key:"card",      label:"💳 Card",      color:"bg-blue-50 border-blue-200",       text:"text-blue-800",    needsConfirm: false },
    { key:"cliq",      label:"📱 CliQ",      color:"bg-violet-50 border-violet-200",   text:"text-violet-800",  needsConfirm: false },
    { key:"insurance", label:"🏥 Insurance", color:"bg-amber-50 border-amber-200",     text:"text-amber-800",   needsConfirm: false },
    { key:"other",     label:"Other",        color:"bg-neutral-50 border-neutral-200", text:"text-neutral-800", needsConfirm: false },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Daily Report</h1>
          <p className="text-sm text-neutral-500 mt-0.5">End of day payment reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); router.push(`?date=${e.target.value}`); }}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"/>
          <button onClick={() => window.open(`/print/daily-report?date=${targetDate}`, "_blank")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
            🖨 Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METHODS.filter(m => methodTotals[m.key] > 0 || m.key === "cash").map(m => (
          <div key={m.key} className={`rounded-xl border-2 ${m.color} p-4`}>
            <p className={`text-xl font-black ${m.text}`}>{methodTotals[m.key].toFixed(2)}</p>
            <p className="text-xs font-semibold text-neutral-600 mt-1">{m.label}</p>
            <p className="text-[10px] text-neutral-400">{methodRows[m.key].length} payment{methodRows[m.key].length!==1?"s":""}</p>
          </div>
        ))}
      </div>

      {/* Total collected */}
      <div className="rounded-xl border-2 border-neutral-900 bg-neutral-900 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Total Collected (excl. insurance)</p>
          <p className="text-3xl font-black text-white mt-1">{totalCollected.toFixed(2)} {currency}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">{appts.length} payments</p>
          <p className="text-xs text-neutral-400">{targetDate}</p>
        </div>
      </div>

      {/* Detail toggle */}
      <button onClick={() => setShowDetails(o=>!o)}
        className="text-xs font-medium text-neutral-500 hover:text-neutral-700 underline">
        {showDetails ? "Hide" : "Show"} payment details per patient
      </button>

      {/* Per-method detail */}
      {showDetails && METHODS.filter(m=>methodRows[m.key].length>0).map(m=>(
        <div key={m.key} className={`rounded-xl border-2 ${m.color} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-opacity-50 flex justify-between items-center">
            <p className={`text-sm font-bold ${m.text}`}>{m.label}</p>
            <p className={`text-sm font-black ${m.text}`}>{methodTotals[m.key].toFixed(2)} {currency}</p>
          </div>
          <div className="divide-y divide-opacity-30">
            {methodRows[m.key].map((r,i)=>(
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm text-neutral-800">{r.patientName}</p>
                  {r.ref && <p className="text-xs text-neutral-500">Ref: {r.ref}</p>}
                </div>
                <p className="text-sm font-mono font-semibold text-neutral-800">{r.amount.toFixed(2)} {currency}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Cash reconciliation */}
      <div className={`rounded-xl border-2 p-5 space-y-4 ${saved?"border-emerald-300 bg-emerald-50":"border-neutral-200 bg-white"}`}>
        <div>
          <p className="text-sm font-bold text-neutral-900">💵 Cash Reconciliation</p>
          <p className="text-xs text-neutral-500 mt-0.5">Count your cash drawer and enter the actual amount</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Expected cash</label>
            <p className="text-2xl font-black text-emerald-700">{methodTotals.cash.toFixed(2)} {currency}</p>
          </div>
          <div className="text-neutral-300 text-2xl font-light">vs</div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Actual cash in drawer</label>
            <input type="number" step="0.01" min="0" value={actualCash}
              onChange={e=>{ setActualCash(e.target.value); setSaved(false); }}
              placeholder="Enter amount..."
              className="rounded-lg border-2 border-neutral-300 px-3 py-2 text-xl font-bold w-36 outline-none focus:border-emerald-500"/>
          </div>
          {cashDiff !== null && (
            <div className={`rounded-lg px-3 py-2 ${Math.abs(cashDiff)<0.01?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>
              <p className="text-xs font-semibold">{Math.abs(cashDiff)<0.01?"✓ Balanced":cashDiff>0?"↑ Over":"↓ Short"}</p>
              <p className="text-lg font-black">{Math.abs(cashDiff).toFixed(2)} {currency}</p>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600 block mb-1">Notes (optional)</label>
          <input value={notes} onChange={e=>{setNotes(e.target.value);setSaved(false);}}
            placeholder="Any notes about today's payments..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"/>
        </div>
        <button onClick={saveReconciliation} disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-all ${saved?"bg-emerald-600":"bg-neutral-900 hover:bg-neutral-800"} disabled:opacity-50`}>
          {saving?"Saving...":(saved?"✓ Reconciliation Saved":"Save Reconciliation")}
        </button>
        {reconConfirmedAt && (
          <p className="text-xs text-neutral-400">Last saved: {new Date(reconConfirmedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
