"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClaim, updateClaimPayment, closeClaimAtPartial, createFollowUpClaim, deleteClaim } from "@/lib/actions/claims";

interface Hospital { id: string; name: string; }
interface Claim {
  id: string;
  claim_number: string;
  from_date: string;
  to_date: string;
  total_claimed: number;
  total_paid: number | null;
  paid_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  hospitalName: string;
}

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  partial:   "bg-amber-100 text-amber-700",
  paid:      "bg-green-100 text-green-700",
  disputed:  "bg-red-100 text-red-700",
};

export function ClaimsManager({
  hospitals, claims: initialClaims, currency, doctorId, clinicId,
}: {
  hospitals: Hospital[];
  claims: Claim[];
  currency: string;
  doctorId: string;
  clinicId: string;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newClaimId, setNewClaimId] = useState<string | null>(null);
  const [newClaimNumber, setNewClaimNumber] = useState<string | null>(null);

  // Payment entry
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingPay, setSavingPay] = useState(false);
  const [followUpId, setFollowUpId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hospitalId || !fromDate || !toDate) { setError("Fill all required fields."); return; }
    setCreating(true); setError(null);

    // We create the claim with total_claimed = 0 initially
    // then open the print to see the total, which will be updated
    const result = await createClaim({
      hospitalId, fromDate, toDate, totalClaimed: 0, notes,
    });
    setCreating(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setNewClaimId(result.claimId!);
    setNewClaimNumber(result.claimNumber!);
    setShowNew(false);
    router.refresh();
  }

  async function handleSavePayment(claimId: string) {
    setSavingPay(true);
    const result = await updateClaimPayment(claimId, parseFloat(paidAmount), paidDate);
    setSavingPay(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setPayingId(null);
    router.refresh();
  }

  async function handleFollowUp(claimId: string) {
    const result = await createFollowUpClaim(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setFollowUpId(null);
    setNewClaimId(result.claimId!);
    setNewClaimNumber(result.claimNumber!);
    router.refresh();
  }

  async function handleClose(claimId: string) {
    const result = await closeClaimAtPartial(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setClosingId(null);
    router.refresh();
  }

  async function handleDelete(claimId: string, claimNumber: string) {
    if (!confirm(`Delete claim ${claimNumber}? This cannot be undone.`)) return;
    const result = await deleteClaim(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.refresh();
  }

  const totalClaimed = initialClaims.reduce((s, c) => s + (c.total_claimed ?? 0), 0);
  const totalPaid    = initialClaims.reduce((s, c) => s + (c.total_paid ?? 0), 0);
  const outstanding  = totalClaimed - totalPaid;

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total claimed", value: totalClaimed, color: "text-neutral-800" },
          { label: "Total received", value: totalPaid, color: "text-green-700" },
          { label: "Outstanding", value: outstanding, color: outstanding > 0 ? "text-red-600" : "text-neutral-400" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value.toFixed(2)} {currency}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New claim button */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowNew(!showNew)}
          className={`rounded-md px-4 py-2 text-sm font-medium ${showNew ? "bg-neutral-200 text-neutral-700" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}>
          {showNew ? "Cancel" : "+ New Claim"}
        </button>
        {newClaimId && (
          <a href={`/print/hospital-claim?claimId=${newClaimId}&doctorId=${doctorId}&currency=${currency}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            🧾 Print Claim {newClaimNumber} →
          </a>
        )}
      </div>

      {/* New claim form */}
      {showNew && (
        <form onSubmit={handleCreate}
          className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Generate New Claim</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Hospital *</label>
              <select value={hospitalId} onChange={e => setHospitalId(e.target.value)} required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div />
            <div>
              <label className="mb-1 block text-xs text-neutral-600">From Date *</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">To Date *</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-600">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Monthly claim for June 2026"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={creating}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {creating ? "Creating..." : "Create & Print Claim"}
          </button>
        </form>
      )}

      {/* Claims list */}
      {initialClaims.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          No claims yet. Create your first claim above.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Claim #</th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Hospital</th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Period</th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-right">Claimed</th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500 text-right">Paid</th>
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {initialClaims.map(c => (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-900">{c.claim_number}</td>
                    <td className="px-4 py-3 text-xs font-medium text-neutral-800">{c.hospitalName}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{c.from_date} – {c.to_date}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium text-neutral-800">
                      {(c.total_claimed ?? 0).toFixed(2)} {currency}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {c.total_paid != null
                        ? <span className="font-medium text-green-700">{c.total_paid.toFixed(2)} {currency}</span>
                        : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[c.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a href={`/print/hospital-claim?claimId=${c.id}&doctorId=${doctorId}&currency=${currency}`}
                          target="_blank" rel="noreferrer"
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                          Print
                        </a>
                        <button onClick={() => handleDelete(c.id, c.claim_number)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                          Delete
                        </button>
                        {c.status !== "paid" && (
                          <button onClick={() => { setPayingId(payingId === c.id ? null : c.id); setPaidAmount(""); }}
                            className="rounded-md border border-green-300 px-2.5 py-1 text-xs text-green-700 hover:bg-green-50">
                            Record Payment
                          </button>
                        )}
                        {c.status === "partial" && c.total_paid != null && (
                          <>
                            <button
                              onClick={() => setFollowUpId(followUpId === c.id ? null : c.id)}
                              className="rounded-md border border-blue-300 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50">
                              Follow-up Claim
                            </button>
                            <button
                              onClick={() => handleClose(c.id)}
                              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50">
                              Close at {c.total_paid.toFixed(2)}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {payingId === c.id && (
                    <tr key={`${c.id}-pay`}>
                      <td colSpan={7} className="px-4 py-3 bg-green-50 border-t border-green-100">
                        <div className="flex items-end gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-green-700">Amount Paid ({currency})</label>
                            <input type="number" min="0" step="0.01" value={paidAmount}
                              onChange={e => setPaidAmount(e.target.value)}
                              placeholder={`Max ${c.total_claimed}`}
                              className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm w-40" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-green-700">Payment Date</label>
                            <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                              className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm" />
                          </div>
                          <button onClick={() => handleSavePayment(c.id)} disabled={savingPay || !paidAmount}
                            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                            {savingPay ? "Saving..." : "Save Payment"}
                          </button>
                          <button onClick={() => setPayingId(null)}
                            className="text-xs text-green-700 hover:underline">Cancel</button>
                          {c.total_paid != null && (
                            <p className="text-xs text-green-600 ml-2">
                              Previously paid: {c.total_paid.toFixed(2)} {currency} on {c.paid_date}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {followUpId === c.id && c.total_paid != null && (
                    <tr key={`${c.id}-fu`}>
                      <td colSpan={7} className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Follow-up Claim</p>
                            <p className="text-xs text-blue-600">
                              Original: {c.total_claimed.toFixed(2)} {currency} · Paid: {c.total_paid.toFixed(2)} {currency} · Remaining: <strong>{Math.max(0, c.total_claimed - (c.total_paid ?? 0)).toFixed(2)} {currency}</strong>
                            </p>
                          </div>
                          <button
                            onClick={() => handleFollowUp(c.id)}
                            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                            Generate Follow-up for {(Math.max(0, c.total_claimed - (c.total_paid ?? 0))).toFixed(2)} {currency}
                          </button>
                          <button onClick={() => setFollowUpId(null)} className="text-xs text-blue-700 hover:underline">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
