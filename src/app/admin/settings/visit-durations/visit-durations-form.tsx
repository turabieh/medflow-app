"use client";

import { useState } from "react";
import { saveVisitDurations } from "@/lib/actions/visit-durations";

export function VisitDurationsForm({
  clinicId,
  durations,
  visitTypes,
}: {
  clinicId: string;
  durations: Record<string, number>;
  visitTypes: { key: string; label: string; description: string }[];
}) {
  const [values, setValues] = useState<Record<string, number>>(durations);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    const result = await saveVisitDurations(clinicId, values);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed to save."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      {error  && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {saved  && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">✓ Saved</div>}

      {visitTypes.map(vt => (
        <div key={vt.key} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-900">{vt.label}</p>
            <p className="text-xs text-neutral-400">{vt.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              min={5}
              max={120}
              step={5}
              value={values[vt.key] ?? 30}
              onChange={e => setValues(v => ({ ...v, [vt.key]: parseInt(e.target.value) || 30 }))}
              className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-center"
            />
            <span className="text-xs text-neutral-500 w-8">min</span>
          </div>
        </div>
      ))}

      <div className="border-t border-neutral-100 pt-3 text-xs text-neutral-400">
        Slot interval is always 15 minutes. Duration is rounded up to the nearest 15-min block.
      </div>

      <button type="submit" disabled={saving}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {saving ? "Saving..." : "Save durations"}
      </button>
    </form>
  );
}
