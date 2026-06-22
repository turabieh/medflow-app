"use client";

import { useState } from "react";
import { addSymptom, toggleSymptomActive } from "@/lib/actions/symptoms";
import { BilingualInput } from "@/components/ui/bilingual-input";

interface Symptom {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
}

export function SymptomsManager({ initialSymptoms }: { initialSymptoms: Symptom[] }) {
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);

    const result = await addSymptom(name, nameAr || undefined);

    setAdding(false);

    if (!result.success) {
      setError(result.error ?? "Could not add symptom.");
      return;
    }

    // Re-fetch isn't strictly necessary since revalidatePath handles the
    // server view, but we update local state immediately so the form
    // feels responsive without waiting for a full page refresh.
    setSymptoms((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), name_ar: nameAr.trim() || null, is_active: true },
    ].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setNameAr("");
  }

  async function handleToggle(id: string, currentlyActive: boolean) {
    setSymptoms((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !currentlyActive } : s))
    );
    const result = await toggleSymptomActive(id, !currentlyActive);
    if (!result.success) {
      // revert on failure
      setSymptoms((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: currentlyActive } : s))
      );
      setError(result.error ?? "Could not update symptom.");
    }
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      >
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <BilingualInput
            label="Symptom name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Headache"
          />
          <BilingualInput
            label="Arabic name (optional)"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: صداع"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add symptom"}
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {symptoms.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">No symptoms added yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {symptoms.map((symptom) => (
              <li
                key={symptom.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div>
                  <span className={`text-sm ${symptom.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
                    {symptom.name}
                  </span>
                  {symptom.name_ar && (
                    <span className="ml-2 text-sm text-neutral-500">{symptom.name_ar}</span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(symptom.id, symptom.is_active)}
                  className="text-xs text-neutral-500 underline hover:text-neutral-700"
                >
                  {symptom.is_active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
