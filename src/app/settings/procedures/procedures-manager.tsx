"use client";

import { useState } from "react";
import { addProcedure, toggleProcedureActive } from "@/lib/actions/procedures";

interface Procedure {
  id: string;
  name: string;
  name_ar: string | null;
  category: string | null;
  outpatient_price: number;
  inpatient_price: number | null;
  duration_minutes: number | null;
  notes: string | null;
  is_active: boolean;
}

export function ProceduresManager({ initialProcedures }: { initialProcedures: Procedure[] }) {
  const [procedures, setProcedures] = useState(initialProcedures);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [outpatientPrice, setOutpatientPrice] = useState("0");
  const [inpatientPrice, setInpatientPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await addProcedure({
      name,
      category: category || undefined,
      outpatientPrice: parseFloat(outpatientPrice) || 0,
      inpatientPrice: inpatientPrice ? parseFloat(inpatientPrice) : undefined,
      durationMinutes: duration ? parseInt(duration, 10) : undefined,
      notes: notes || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not add procedure.");
      return;
    }

    setProcedures((prev) => [...prev, {
      id: crypto.randomUUID(), name: name.trim(), name_ar: null,
      category: category || null, outpatient_price: parseFloat(outpatientPrice) || 0,
      inpatient_price: inpatientPrice ? parseFloat(inpatientPrice) : null,
      duration_minutes: duration ? parseInt(duration, 10) : null,
      notes: notes || null, is_active: true,
    }]);

    setShowForm(false);
    setName(""); setCategory(""); setOutpatientPrice("0"); setInpatientPrice(""); setNotes("");
  }

  async function handleToggle(id: string, current: boolean) {
    setProcedures((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));
    await toggleProcedureActive(id, !current);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Procedures</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-xs font-medium text-neutral-700 underline hover:text-neutral-900">
          {showForm ? "Cancel" : "+ Add procedure"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Procedure name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. EEG"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Neurology"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Outpatient price (JOD)</label>
              <input type="number" step="0.01" min="0" required value={outpatientPrice}
                onChange={(e) => setOutpatientPrice(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Inpatient price (JOD)</label>
              <input type="number" step="0.01" min="0" value={inpatientPrice}
                onChange={(e) => setInpatientPrice(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Duration (min)</label>
              <input type="number" min="0" value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {loading ? "Adding..." : "Add procedure"}
          </button>
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {procedures.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No procedures added yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {procedures.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className={`text-sm ${p.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
                    {p.name} {p.category && <span className="text-xs text-neutral-400">· {p.category}</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {p.outpatient_price.toFixed(2)} JOD outpatient
                    {p.inpatient_price !== null && ` · ${p.inpatient_price.toFixed(2)} JOD inpatient`}
                    {p.duration_minutes && ` · ${p.duration_minutes} min`}
                  </p>
                </div>
                <button onClick={() => handleToggle(p.id, p.is_active)} className="text-xs text-neutral-500 underline hover:text-neutral-700">
                  {p.is_active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
