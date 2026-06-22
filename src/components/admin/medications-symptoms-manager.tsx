"use client";

import { useState } from "react";
import { addMedication, toggleMedicationActive } from "@/lib/actions/medications";
import { addSymptom, toggleSymptomActive } from "@/lib/actions/symptoms";
import { BilingualInput } from "@/components/ui/bilingual-input";

interface Medication {
  id: string;
  name: string;
  name_ar: string | null;
  default_dose: string | null;
  default_unit: string | null;
  is_active: boolean;
}

interface Symptom {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
}

const UNITS = ["mg", "ml", "g", "mcg", "IU", "tablet", "capsule", "drop", "puff", "unit"];

export function MedicationsAndSymptomsManager({
  initialMedications,
  initialSymptoms,
}: {
  initialMedications: Medication[];
  initialSymptoms: Symptom[];
}) {
  const [tab, setTab] = useState<"medications" | "symptoms">("medications");
  const [medications, setMedications] = useState(initialMedications);
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [error, setError] = useState<string | null>(null);

  // Medication form state
  const [medName, setMedName] = useState("");
  const [medNameAr, setMedNameAr] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medUnit, setMedUnit] = useState("mg");
  const [addingMed, setAddingMed] = useState(false);

  // Symptom form state
  const [symName, setSymName] = useState("");
  const [symNameAr, setSymNameAr] = useState("");
  const [addingSym, setAddingSym] = useState(false);

  async function handleAddMedication(e: React.FormEvent) {
    e.preventDefault();
    setAddingMed(true);
    setError(null);
    const result = await addMedication({
      name: medName,
      nameAr: medNameAr || undefined,
      defaultDose: medDose || undefined,
      defaultUnit: medUnit,
    });
    setAddingMed(false);
    if (!result.success) { setError(result.error ?? "Could not add."); return; }
    setMedications((prev) => [...prev, {
      id: crypto.randomUUID(), name: medName.trim(), name_ar: medNameAr || null,
      default_dose: medDose || null, default_unit: medUnit, is_active: true,
    }].sort((a, b) => a.name.localeCompare(b.name)));
    setMedName(""); setMedNameAr(""); setMedDose("");
  }

  async function handleToggleMed(id: string, current: boolean) {
    setMedications((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !current } : m));
    await toggleMedicationActive(id, !current);
  }

  async function handleAddSymptom(e: React.FormEvent) {
    e.preventDefault();
    setAddingSym(true);
    setError(null);
    const result = await addSymptom(symName, symNameAr || undefined);
    setAddingSym(false);
    if (!result.success) { setError(result.error ?? "Could not add."); return; }
    setSymptoms((prev) => [...prev, {
      id: crypto.randomUUID(), name: symName.trim(), name_ar: symNameAr || null, is_active: true,
    }].sort((a, b) => a.name.localeCompare(b.name)));
    setSymName(""); setSymNameAr("");
  }

  async function handleToggleSym(id: string, current: boolean) {
    setSymptoms((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
    await toggleSymptomActive(id, !current);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex border-b border-neutral-200">
        <button
          onClick={() => setTab("medications")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "medications"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Medications ({medications.filter((m) => m.is_active).length} active)
        </button>
        <button
          onClick={() => setTab("symptoms")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "symptoms"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Symptoms ({symptoms.filter((s) => s.is_active).length} active)
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Medications tab */}
      {tab === "medications" && (
        <div>
          <form onSubmit={handleAddMedication}
            className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-neutral-900">+ Add Medication</p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <BilingualInput label="Medication name" required
                value={medName} onChange={(e) => setMedName(e.target.value)}
                placeholder="e.g. Amoxicillin" />
              <BilingualInput label="Arabic name (optional)"
                value={medNameAr} onChange={(e) => setMedNameAr(e.target.value)}
                placeholder="أموكسيسيلين" />
            </div>
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Default dose</label>
                <input type="text" value={medDose} onChange={(e) => setMedDose(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Unit</label>
                <select value={medUnit} onChange={(e) => setMedUnit(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={addingMed}
              className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingMed ? "Adding..." : "+ Add"}
            </button>
          </form>

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            {medications.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No medications added yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {medications.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className={`text-sm ${m.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
                        {m.name}
                        {m.name_ar && <span className="ml-2 text-neutral-400" dir="rtl">{m.name_ar}</span>}
                      </p>
                      {(m.default_dose || m.default_unit) && (
                        <p className="text-xs text-neutral-400">
                          Default: {m.default_dose} {m.default_unit}
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleToggleMed(m.id, m.is_active)}
                      className="text-xs text-neutral-500 underline hover:text-neutral-700">
                      {m.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Symptoms tab */}
      {tab === "symptoms" && (
        <div>
          <form onSubmit={handleAddSymptom}
            className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-neutral-900">+ Add Symptom</p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <BilingualInput label="Symptom name" required
                value={symName} onChange={(e) => setSymName(e.target.value)}
                placeholder="e.g. Headache" />
              <BilingualInput label="Arabic name (optional)"
                value={symNameAr} onChange={(e) => setSymNameAr(e.target.value)}
                placeholder="صداع" />
            </div>
            <button type="submit" disabled={addingSym}
              className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingSym ? "Adding..." : "+ Add"}
            </button>
          </form>

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            {symptoms.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No symptoms added yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {symptoms.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className={`text-sm ${s.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
                        {s.name}
                        {s.name_ar && <span className="ml-2 text-neutral-400">{s.name_ar}</span>}
                      </p>
                    </div>
                    <button onClick={() => handleToggleSym(s.id, s.is_active)}
                      className="text-xs text-neutral-500 underline hover:text-neutral-700">
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
