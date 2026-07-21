"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createInsuranceClaim,
  updateInsuranceClaimPayment,
  createInsuranceFollowUpClaim,
  closeInsuranceClaimAtPartial,
  deleteInsuranceClaim,
} from "@/lib/actions/insurance-claims";

interface InsuranceCompany { id: string; name: string; name_ar: string | null; phone: string | null; email: string | null; portal_url: string | null; }
interface Claim {
  id: string; claim_number: string; from_date: string; to_date: string;
  total_claimed: number; total_paid: number | null; paid_date: string | null;
  status: string; notes: string | null; created_at: string;
  insuranceName: string; is_followup: boolean; parent_claim_id: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  partial:   "bg-amber-100 text-amber-700",
  paid:      "bg-green-100 text-green-700",
  disputed:  "bg-red-100 text-red-700",
};

export function InsuranceClaimsManager({
  insuranceCompanies, claims: initialClaims, currency, clinicId, readyToClaim = [],
}: {
  insuranceCompanies: InsuranceCompany[];
  claims: Claim[];
  currency: string;
  clinicId: string;
  readyToClaim?: { id:string; name:string; amount:number; count:number; from:string; to:string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  // Pre-fill from "Generate Claim →" button on Finance page
  const preCompany  = params.get("company")  ?? "";
  const preFrom     = params.get("from")     ?? "";
  const preTo       = params.get("to")       ?? new Date().toISOString().split("T")[0];
  const preAmount   = params.get("amount")   ?? "";
  const preVisits   = params.get("visits")   ?? "";

  const [showNew, setShowNew] = useState(!!preCompany);
  const [insuranceId, setInsuranceId] = useState(
    preCompany && insuranceCompanies.find(c => c.id === preCompany) ? preCompany : (insuranceCompanies[0]?.id ?? "")
  );
  const [fromDate, setFromDate] = useState(preFrom);
  const [toDate, setToDate] = useState(preTo);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newClaimId, setNewClaimId] = useState<string | null>(null);
  const [newClaimNumber, setNewClaimNumber] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingPay, setSavingPay] = useState(false);
  const [followUpId, setFollowUpId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!insuranceId || !fromDate || !toDate) { setError("Fill all required fields."); return; }
    setCreating(true); setError(null);
    const result = await createInsuranceClaim({ insuranceCompanyId: insuranceId, fromDate, toDate, notes });
    setCreating(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setNewClaimId(result.claimId!);
    setNewClaimNumber(result.claimNumber!);
    setShowNew(false);
    router.refresh();
  }

  async function handleSavePayment(claimId: string) {
    setSavingPay(true);
    const result = await updateInsuranceClaimPayment(claimId, parseFloat(paidAmount), paidDate);
    setSavingPay(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setPayingId(null);
    router.refresh();
  }

  async function handleFollowUp(claimId: string) {
    const result = await createInsuranceFollowUpClaim(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setFollowUpId(null);
    setNewClaimId(result.claimId!);
    setNewClaimNumber(result.claimNumber!);
    router.refresh();
  }

  async function handleClose(claimId: string) {
    const result = await closeInsuranceClaimAtPartial(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.refresh();
  }

  async function handleDelete(claimId: string, claimNumber: string) {
    if (!confirm(`Delete claim ${claimNumber}? This cannot be undone.`)) return;
    const result = await deleteInsuranceClaim(claimId);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.refresh();
  }

  const originalClaims = initialClaims.filter(c => !c.is_followup);
  const totalClaimed  = originalClaims.reduce((s, c) => s + (c.total_claimed ?? 0), 0);
  const totalPaid     = initialClaims.reduce((s, c) => s + (c.total_paid ?? 0), 0);
  const outstanding   = Math.max(0, totalClaimed - totalPaid);

  // Group by insurance company for the summary
  const byInsurance = new Map<string, { name: string; claimed: number; paid: number }>();
  for (const c of initialClaims) {
    if (c.is_followup) continue;
    const entry = byInsurance.get(c.insuranceName) ?? { name: c.insuranceName, claimed: 0, paid: 0 };
    entry.claimed += c.total_claimed ?? 0;
    // Add all paid (including follow-ups) — we approximate here
    entry.paid += c.total_paid ?? 0;
    byInsurance.set(c.insuranceName, entry);
  }
  // Add follow-up payments to their parent's insurance
  for (const c of initialClaims) {
    if (!c.is_followup) continue;
    const entry = byInsurance.get(c.insuranceName);
    if (entry) entry.paid += c.total_paid ?? 0;
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total claimed", value: totalClaimed, color: "text-neutral-800" },
          { label: "Total received", value: totalPaid,   color: "text-green-700" },
          { label: "Outstanding",   value: outstanding,  color: outstanding > 0 ? "text-red-600" : "text-neutral-400" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value.toFixed(2)} {currency}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-insurance breakdown */}
      {byInsurance.size > 1 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">By Insurance Company</p>
          <div className="space-y-2">
            {Array.from(byInsurance.values()).map(ins => (
              <div key={ins.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-800">{ins.name}</span>
                <span className="text-xs text-neutral-500">
                  Claimed: <strong>{ins.claimed.toFixed(2)}</strong> · Paid: <strong className="text-green-700">{ins.paid.toFixed(2)}</strong> · Outstanding: <strong className="text-red-600">{Math.max(0, ins.claimed - ins.paid).toFixed(2)}</strong> {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Claim — smart section */}
      {readyToClaim.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-200 bg-emerald-100">
            <div>
              <p className="text-sm font-bold text-emerald-900">✅ Ready to Claim</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {readyToClaim.reduce((s,c)=>s+c.count,0)} visits · {readyToClaim.reduce((s,c)=>s+c.amount,0).toFixed(2)} {currency} total unclaimed
              </p>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Click a company to auto-fill the claim form</span>
          </div>
          <div className="divide-y divide-emerald-100">
            {readyToClaim.map(co => (
              <div key={co.id} className="flex items-center justify-between px-4 py-3 hover:bg-emerald-100 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-800">
                    {co.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">{co.name}</p>
                    <p className="text-xs text-emerald-600">
                      {co.count} visit{co.count!==1?"s":""} · {co.from} → {co.to}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-black text-emerald-800">{co.amount.toFixed(2)} {currency}</p>
                    <p className="text-[10px] text-emerald-600">to claim</p>
                  </div>
                  <button
                    onClick={() => {
                      setInsuranceId(co.id);
                      setFromDate(co.from);
                      setToDate(co.to);
                      setShowNew(true);
                      setTimeout(() => document.getElementById("new-claim-form")?.scrollIntoView({ behavior:"smooth" }), 100);
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition whitespace-nowrap">
                    Create Claim →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowNew(!showNew)}
          className={`rounded-md px-4 py-2 text-sm font-medium ${showNew ? "bg-neutral-200 text-neutral-700" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}>
          {showNew ? "Cancel" : "+ New Claim"}
        </button>
        {newClaimId && (
          <a href={`/print/insurance-claim?claimId=${newClaimId}&currency=${currency}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            🧾 Print Claim {newClaimNumber} →
          </a>
        )}
      </div>

      {/* New claim form */}
      {showNew && (
        <form id="new-claim-form" onSubmit={handleCreate}
          className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">New Insurance Claim</h2>
          {(preAmount || preVisits) && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              📋 From unclaimed revenue: <strong>{preVisits} visits</strong> totalling <strong>{preAmount} {currency}</strong> — dates pre-filled below
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-600">Insurance Company *</label>
              <select value={insuranceId} onChange={e => setInsuranceId(e.target.value)} required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {insuranceCompanies.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
              </select>
            </div>
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
            {creating ? "Creating..." : "Create Claim"}
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
                <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Insurance</th>
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
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-900">
                      {c.claim_number}
                      {c.is_followup && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">follow-up</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-neutral-800">{c.insuranceName}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{c.from_date} – {c.to_date}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium">{(c.total_claimed ?? 0).toFixed(2)} {currency}</td>
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
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <a href={`/print/insurance-claim?claimId=${c.id}&currency=${currency}`}
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
                            <button onClick={() => setFollowUpId(followUpId === c.id ? null : c.id)}
                              className="rounded-md border border-blue-300 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50">
                              Follow-up
                            </button>
                            <button onClick={() => handleClose(c.id)}
                              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50">
                              Close at {c.total_paid.toFixed(2)}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Payment row */}
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
                            {savingPay ? "Saving..." : "Save"}
                          </button>
                          <button onClick={() => setPayingId(null)} className="text-xs text-green-700">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Follow-up row */}
                  {followUpId === c.id && c.total_paid != null && (
                    <tr key={`${c.id}-fu`}>
                      <td colSpan={7} className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Follow-up Claim</p>
                            <p className="text-xs text-blue-600">
                              Claimed: {c.total_claimed.toFixed(2)} · Paid: {c.total_paid.toFixed(2)} · Outstanding: <strong>{Math.max(0, c.total_claimed - c.total_paid).toFixed(2)} {currency}</strong>
                            </p>
                          </div>
                          <button onClick={() => handleFollowUp(c.id)}
                            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                            Generate Follow-up for {Math.max(0, c.total_claimed - c.total_paid).toFixed(2)} {currency}
                          </button>
                          <button onClick={() => setFollowUpId(null)} className="text-xs text-blue-700">Cancel</button>
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
