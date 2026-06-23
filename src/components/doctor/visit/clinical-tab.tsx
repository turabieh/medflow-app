"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveVisitSymptoms, addLab, deleteLab } from "@/lib/actions/visits";

interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface Lab { id: string; type: string; name: string; lab_date: string | null; findings: string | null; link_url: string | null; }

export function ClinicalTab({
  visitId,
  symptomsCatalog,
  preCheckedSymptomIds,
  checkedSymptomIds,
  labs,
}: {
  visitId: string;
  appointmentId: string;
  symptomsCatalog: Symptom[];
  preCheckedSymptomIds: string[];
  checkedSymptomIds: string[];
  labs: Lab[];
  prescriptions: unknown[];
  medsCatalog: unknown[];
  diagnoses: unknown[];
}) {
  const router = useRouter();

  const initialChecked = checkedSymptomIds.length > 0
    ? new Set(checkedSymptomIds)
    : new Set(preCheckedSymptomIds);
  const [checked, setChecked] = useState<Set<string>>(initialChecked);
  const [savingSymptoms, setSavingSymptoms] = useState(false);
  const [savedSymptoms, setSavedSymptoms] = useState(false);

  const categories = Array.from(new Set(symptomsCatalog.map((s) => s.category))).sort();

  async function handleSaveSymptoms() {
    setSavingSymptoms(true);
    await saveVisitSymptoms(visitId, Array.from(checked));
    setSavingSymptoms(false);
    setSavedSymptoms(true);
    setTimeout(() => setSavedSymptoms(false), 2000);
    router.refresh();
  }

  const [labType, setLabType] = useState<"lab" | "imaging" | "other">("lab");
  const [labName, setLabName] = useState("");
  const [labDate, setLabDate] = useState(new Date().toISOString().split("T")[0]);
  const [labFindings, setLabFindings] = useState("");
  const [labLink, setLabLink] = useState("");
  const [addingLab, setAddingLab] = useState(false);

  async function handleAddLab(e: React.FormEvent) {
    e.preventDefault();
    setAddingLab(true);
    await addLab(visitId, { type: labType, name: labName, labDate, findings: labFindings, linkUrl: labLink });
    setAddingLab(false);
    setLabName(""); setLabFindings(""); setLabLink("");
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Symptoms */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Symptoms</h2>
          <div className="flex items-center gap-3">
            {savedSymptoms && <span className="text-xs text-green-600">Saved.</span>}
            <button onClick={handleSaveSymptoms} disabled={savingSymptoms}
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {savingSymptoms ? "Saving..." : "Save symptoms"}
            </button>
          </div>
        </div>
        {preCheckedSymptomIds.length > 0 && (
          <div className="border-b border-neutral-100 bg-blue-50 px-4 py-2">
            <p className="text-xs text-blue-700">
              Pre-checked from booking: {symptomsCatalog.filter(s => preCheckedSymptomIds.includes(s.id)).map(s => s.name).join(", ")}
            </p>
          </div>
        )}
        <div className="p-4 space-y-4">
          {categories.length === 0 && (
            <p className="text-sm text-neutral-400">No symptoms in catalog. Add from Admin → Medications & Symptoms.</p>
          )}
          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 capitalize">
                {cat === "advanced" ? "Advanced Clinical Symptoms" : "Basic Symptoms"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {symptomsCatalog.filter(s => s.category === cat).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                    <input type="checkbox" checked={checked.has(s.id)} onChange={() => {
                      const next = new Set(checked);
                      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                      setChecked(next);
                    }} className="accent-red-500" />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Labs & Imaging */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Labs &amp; Imaging</h2>
        </div>
        <div className="p-4">
          {labs.length > 0 && (
            <ul className="mb-4 space-y-2">
              {labs.map((lab) => (
                <li key={lab.id} className="flex items-start justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {lab.name}
                      <span className="ml-2 text-xs text-neutral-400 capitalize">({lab.type})</span>
                      {lab.lab_date && <span className="ml-2 text-xs text-neutral-400">{lab.lab_date}</span>}
                    </p>
                    {lab.findings && <p className="text-xs text-neutral-500 mt-0.5">{lab.findings}</p>}
                    {lab.link_url && <a href={lab.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View results</a>}
                  </div>
                  <button onClick={() => deleteLab(lab.id, visitId).then(() => router.refresh())}
                    className="ml-3 flex-shrink-0 text-xs text-red-500 hover:text-red-700">Delete</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddLab} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <p className="text-xs font-medium text-neutral-600">+ Add Lab / Imaging</p>
            <div className="grid grid-cols-3 gap-2">
              <select value={labType} onChange={e => setLabType(e.target.value as typeof labType)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="lab">Lab</option>
                <option value="imaging">Imaging</option>
                <option value="other">Other</option>
              </select>
              <input value={labName} onChange={e => setLabName(e.target.value)} required
                placeholder="Name (e.g. CBC, MRI Brain)"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              <input type="date" value={labDate} onChange={e => setLabDate(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <textarea value={labFindings} onChange={e => setLabFindings(e.target.value)} rows={2}
              placeholder="Findings (optional)..."
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <input value={labLink} onChange={e => setLabLink(e.target.value)}
              placeholder="https://... (link to results, optional)"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <button type="submit" disabled={addingLab}
              className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingLab ? "Adding..." : "+ Add"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
