"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dischargeInpatient, updateInpatientLocation } from "@/lib/actions/inpatients";
import { createInpatientVisitWithDetails } from "@/lib/actions/inpatients";

interface VisitType { key: string; label: string; }

export function InpatientActions({
  inpatientId,
  status,
  today,
  existingVisitDates,
  location: initialLocation,
  patientName,
  visits,
  totalFee,
  currency,
  visitTypes,
  defaultFeePerVisit,
  admissionDate,
}: {
  inpatientId: string;
  status: string;
  today: string;
  existingVisitDates: string[];
  location: string;
  patientName: string;
  visits: number;
  totalFee: number;
  currency: string;
  visitTypes: VisitType[];
  defaultFeePerVisit: number | null;
  admissionDate: string;
}) {
  const router = useRouter();

  // Add visit state
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitDate, setVisitDate] = useState(today);
  const [visitTime, setVisitTime] = useState("08:00");
  const [visitTypeKey, setVisitTypeKey] = useState("consultation");
  const [visitFee, setVisitFee] = useState(defaultFeePerVisit?.toString() ?? "");
  const [addingVisit, setAddingVisit] = useState(false);

  // Location edit
  const [location, setLocation] = useState(initialLocation);
  const [editingLocation, setEditingLocation] = useState(false);

  // Discharge
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(today);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [discharging, setDischarging] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    setAddingVisit(true); setError(null);
    const result = await createInpatientVisitWithDetails(inpatientId, {
      visitDate,
      visitTime,
      visitType: visitTypeKey,
      visitFee: visitFee ? parseFloat(visitFee) : undefined,
    });
    setAddingVisit(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    router.push(`/doctor/inpatients/${inpatientId}/visit/${result.visitId}`);
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

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {status === "active" && (
          <button onClick={() => setShowAddVisit(!showAddVisit)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              showAddVisit
                ? "bg-neutral-200 text-neutral-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}>
            {showAddVisit ? "Cancel" : "+ Add Visit"}
          </button>
        )}

        {status === "active" && (
          <button onClick={() => setEditingLocation(!editingLocation)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
            📍 Update location
          </button>
        )}

        {status === "active" && (
          <button onClick={() => setShowDischarge(!showDischarge)}
            className="rounded-md border border-orange-300 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50">
            Discharge
          </button>
        )}
      </div>

      {/* Add visit form */}
      {showAddVisit && (
        <form onSubmit={handleAddVisit}
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">Add Hospital Visit</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-blue-700">Date *</label>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} required
                max={today} min={admissionDate}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue-700">Time *</label>
              <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} required
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue-700">Visit Type *</label>
              <select value={visitTypeKey} onChange={e => setVisitTypeKey(e.target.value)}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm">
                {visitTypes.map(vt => (
                  <option key={vt.key} value={vt.key}>{vt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue-700">Visit Fee ({currency})</label>
              <input type="number" min="0" step="0.01" value={visitFee}
                onChange={e => setVisitFee(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={addingVisit}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {addingVisit ? "Creating..." : "Create Visit & Open Notes →"}
          </button>
        </form>
      )}

      {/* Location edit */}
      {editingLocation && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Room / Floor / Unit"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
          <button onClick={handleSaveLocation}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">Save</button>
          <button onClick={() => setEditingLocation(false)}
            className="text-xs text-neutral-500">Cancel</button>
        </div>
      )}

      {/* Discharge */}
      {showDischarge && (
        <form onSubmit={handleDischarge}
          className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <h3 className="text-sm font-medium text-orange-900">Discharge {patientName}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-orange-700">Discharge Date *</label>
              <input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} required
                min={admissionDate} max={today}
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
              className="rounded-md border border-orange-200 px-3 py-2 text-sm text-orange-700">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
