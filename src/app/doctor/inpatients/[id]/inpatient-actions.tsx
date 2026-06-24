"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInpatientVisit, dischargeInpatient, updateInpatientLocation } from "@/lib/actions/inpatients";

export function InpatientActions({
  inpatientId,
  status,
  today,
  existingVisitDates,
  location: initialLocation,
  hospitalName,
  patientName,
  visits,
  totalFee,
  currency,
  feePerVisit,
  admissionDate,
  hospitalId,
  clinicId,
}: {
  inpatientId: string;
  status: string;
  today: string;
  existingVisitDates: string[];
  location: string;
  hospitalName: string;
  patientName: string;
  visits: number;
  totalFee: number;
  currency: string;
  feePerVisit: number | null;
  admissionDate: string;
  hospitalId: string;
  clinicId: string;
}) {
  const router = useRouter();
  const [visitDate, setVisitDate] = useState(today);
  const [addingVisit, setAddingVisit] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [editingLocation, setEditingLocation] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(today);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [discharging, setDischarging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayAlreadyHasVisit = existingVisitDates.includes(visitDate);

  async function handleAddVisit() {
    setAddingVisit(true); setError(null);
    const result = await createInpatientVisit(inpatientId, visitDate);
    setAddingVisit(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.push(`/doctor/visit/${result.visitId}`);
  }

  async function handleSaveLocation() {
    await updateInpatientLocation(inpatientId, location);
    setEditingLocation(false);
    router.refresh();
  }

  async function handleDischarge(e: React.FormEvent) {
    e.preventDefault();
    setDischarging(true); setError(null);
    const result = await dischargeInpatient(inpatientId, dischargeDate, dischargeNotes);
    setDischarging(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {/* Add today's visit */}
        {status === "active" && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              max={today}
              className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs" />
            <button onClick={handleAddVisit} disabled={addingVisit || todayAlreadyHasVisit}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {addingVisit ? "Opening..." : todayAlreadyHasVisit ? "Visit exists" : "+ Add Visit"}
            </button>
            {todayAlreadyHasVisit && (
              <p className="text-xs text-blue-600">A visit already exists for this date.</p>
            )}
          </div>
        )}

        {/* Update location */}
        {status === "active" && (
          editingLocation ? (
            <div className="flex items-center gap-2">
              <input value={location} onChange={e => setLocation(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                placeholder="Room / Floor / Unit" />
              <button onClick={handleSaveLocation} className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs text-white">Save</button>
              <button onClick={() => setEditingLocation(false)} className="text-xs text-neutral-500">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingLocation(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
              Update location
            </button>
          )
        )}

        {/* Claim */}
        <a
          href={`/print/inpatient-claim?inpatientId=${inpatientId}&hospitalName=${encodeURIComponent(hospitalName)}&patientName=${encodeURIComponent(patientName)}&from=${admissionDate}&to=${today}&feePerVisit=${feePerVisit ?? 0}&currency=${currency}`}
          target="_blank" rel="noreferrer"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
          🧾 Generate Claim ({visits} visits · {totalFee.toFixed(2)} {currency})
        </a>

        {/* Discharge */}
        {status === "active" && (
          <button onClick={() => setShowDischarge(!showDischarge)}
            className="rounded-md border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50">
            Discharge Patient
          </button>
        )}
      </div>

      {showDischarge && (
        <form onSubmit={handleDischarge}
          className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-orange-900">Discharge {patientName}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-orange-700">Discharge Date *</label>
              <input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} required
                max={today}
                className="w-full rounded-md border border-orange-200 bg-white px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-orange-700">Discharge Notes</label>
            <textarea value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} rows={2}
              placeholder="Condition at discharge, follow-up instructions..."
              className="w-full rounded-md border border-orange-200 bg-white px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={discharging}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {discharging ? "Discharging..." : "Confirm Discharge"}
            </button>
            <button type="button" onClick={() => setShowDischarge(false)}
              className="rounded-md border border-orange-200 px-3 py-2 text-sm text-orange-700">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
