"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addPrescription,
  deletePrescription,
  addDiagnosis,
  deleteDiagnosis,
} from "@/lib/actions/visits";
import { saveVisitNotes } from "@/lib/actions/visits";

interface Prescription { id: string; medication_id: string | null; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface MedCatalog { id: string; name: string; default_dose: string | null; default_unit: string | null; }
interface Diagnosis { id: string; icd_code: string | null; description: string; is_primary: boolean; }

export function NotesTab({
  visitId,
  voiceNotes,
  keyPoints,
  prescriptions,
  medsCatalog,
  diagnoses,
}: {
  visitId: string;
  voiceNotes: string | null;
  keyPoints: string | null;
  prescriptions: Prescription[];
  medsCatalog: MedCatalog[];
  diagnoses: Diagnosis[];
}) {
  const router = useRouter();

  const [notes, setNotes] = useState(voiceNotes ?? "");
  const [points, setPoints] = useState(keyPoints ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotes(true);
    await saveVisitNotes(visitId, notes, points);
    setSavingNotes(false);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  }

  // Medication form
  const [medMode, setMedMode] = useState<"catalog" | "manual">("catalog");
  const [medId, setMedId] = useState("");
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medUnit, setMedUnit] = useState("");
  const [medInstr, setMedInstr] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [addingMed, setAddingMed] = useState(false);

  useEffect(() => {
    if (medMode === "catalog" && medId) {
      const found = medsCatalog.find((m) => m.id === medId);
      if (found) {
        setMedName(found.name);
        setMedDose(found.default_dose ?? "");
        setMedUnit(found.default_unit ?? "");
      }
    }
  }, [medId, medMode, medsCatalog]);

  async function handleAddMed(e: React.FormEvent) {
    e.preventDefault();
    setAddingMed(true);
    await addPrescription(visitId, {
      medicationId: medMode === "catalog" ? medId : undefined,
      medicationName: medName,
      dose: medDose,
      unit: medUnit,
      instructions: medInstr,
      duration: medDuration,
    });
    setAddingMed(false);
    setMedId(""); setMedName(""); setMedDose(""); setMedUnit(""); setMedInstr(""); setMedDuration("");
    router.refresh();
  }

  // Diagnosis form
  const [diagCode, setDiagCode] = useState("");
  const [diagDesc, setDiagDesc] = useState("");
  const [diagPrimary, setDiagPrimary] = useState(diagnoses.length === 0);
  const [addingDiag, setAddingDiag] = useState(false);

  async function handleAddDiagnosis(e: React.FormEvent) {
    e.preventDefault();
    setAddingDiag(true);
    await addDiagnosis(visitId, { icdCode: diagCode, description: diagDesc, isPrimary: diagPrimary });
    setAddingDiag(false);
    setDiagCode(""); setDiagDesc("");
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">

      {/* Notes */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Clinical Notes</h2>
        </div>
        <form onSubmit={handleSaveNotes} className="p-4 space-y-3">
          {savedNotes && <p className="text-xs text-green-600">Saved.</p>}
          <div>
            <label className="mb-1 block text-xs text-neutral-600">
              Voice notes <span className="text-neutral-400">(dictated — use Win+H on Windows, Fn+Fn on Mac)</span>
            </label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
              placeholder="Dictate or type clinical observations..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Key clinical points</label>
            <textarea value={points} onChange={e=>setPoints(e.target.value)} rows={3}
              placeholder="Key findings, decisions, follow-up instructions..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={savingNotes}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {savingNotes ? "Saving..." : "Save notes"}
          </button>
        </form>
      </section>

      {/* Medications */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Medications</h2>
        </div>
        <div className="p-4">
          {prescriptions.length > 0 && (
            <ul className="mb-4 divide-y divide-neutral-100">
              {prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{rx.medication_name}</p>
                    <p className="text-xs text-neutral-500">
                      {[rx.dose, rx.unit].filter(Boolean).join(" ")}
                      {rx.instructions && ` · ${rx.instructions}`}
                      {rx.duration && ` · ${rx.duration}`}
                    </p>
                  </div>
                  <button onClick={() => deletePrescription(rx.id, visitId).then(() => router.refresh())}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddMed} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="medmode" checked={medMode==="catalog"} onChange={()=>setMedMode("catalog")} /> From catalog
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="medmode" checked={medMode==="manual"} onChange={()=>setMedMode("manual")} /> Manual
              </label>
            </div>
            {medMode === "catalog" ? (
              <select value={medId} onChange={e=>setMedId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="">Select medication...</option>
                {medsCatalog.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <input value={medName} onChange={e=>setMedName(e.target.value)} required placeholder="Medication name"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            )}
            <div className="grid grid-cols-4 gap-2">
              <input value={medDose} onChange={e=>setMedDose(e.target.value)} placeholder="Dose" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
              <input value={medUnit} onChange={e=>setMedUnit(e.target.value)} placeholder="Unit" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
              <input value={medInstr} onChange={e=>setMedInstr(e.target.value)} placeholder="Instructions" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
              <input value={medDuration} onChange={e=>setMedDuration(e.target.value)} placeholder="Duration" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            </div>
            <button type="submit" disabled={addingMed}
              className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingMed ? "Adding..." : "+ Add Medication"}
            </button>
          </form>
        </div>
      </section>

      {/* Diagnosis */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Diagnosis</h2>
          <p className="text-xs text-neutral-400 mt-0.5">AI suggestions coming in next update. Enter manually for now.</p>
        </div>
        <div className="p-4">
          {diagnoses.length > 0 && (
            <ul className="mb-4 divide-y divide-neutral-100">
              {diagnoses.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <p className="text-sm text-neutral-900">
                    {d.icd_code && <span className="mr-2 font-mono text-xs text-neutral-400">{d.icd_code}</span>}
                    {d.description}
                    {d.is_primary && <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Primary</span>}
                  </p>
                  <button onClick={() => deleteDiagnosis(d.id, visitId).then(() => router.refresh())}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddDiagnosis} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <div className="grid grid-cols-4 gap-2">
              <input value={diagCode} onChange={e=>setDiagCode(e.target.value)} placeholder="ICD code (optional)"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono"/>
              <input value={diagDesc} onChange={e=>setDiagDesc(e.target.value)} required placeholder="Diagnosis description"
                className="col-span-3 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input type="checkbox" checked={diagPrimary} onChange={e=>setDiagPrimary(e.target.checked)}/> Primary diagnosis
              </label>
              <button type="submit" disabled={addingDiag}
                className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {addingDiag ? "Adding..." : "+ Add Diagnosis"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
