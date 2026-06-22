"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveVisitSymptoms,
  addLab,
  deleteLab,
  addPrescription,
  deletePrescription,
  addDiagnosis,
  deleteDiagnosis,
} from "@/lib/actions/visits";

interface Symptom { id: string; name: string; name_ar: string | null; category: string; }
interface Lab { id: string; type: string; name: string; lab_date: string | null; findings: string | null; link_url: string | null; }
interface Prescription { id: string; medication_id: string | null; medication_name: string; dose: string | null; unit: string | null; instructions: string | null; duration: string | null; }
interface MedCatalog { id: string; name: string; default_dose: string | null; default_unit: string | null; }
interface Diagnosis { id: string; icd_code: string | null; description: string; is_primary: boolean; }

export function ClinicalTab({
  visitId,
  symptomsCatalog,
  preCheckedSymptomIds,
  checkedSymptomIds,
  labs,
  prescriptions,
  medsCatalog,
  diagnoses,
}: {
  visitId: string;
  appointmentId: string;
  symptomsCatalog: Symptom[];
  preCheckedSymptomIds: string[];
  checkedSymptomIds: string[];
  labs: Lab[];
  prescriptions: Prescription[];
  medsCatalog: MedCatalog[];
  diagnoses: Diagnosis[];
}) {
  const router = useRouter();

  // Symptoms state — start with whatever doctor already checked,
  // but pre-fill from booking if nothing checked yet
  const initialChecked = checkedSymptomIds.length > 0
    ? new Set(checkedSymptomIds)
    : new Set(preCheckedSymptomIds);
  const [checked, setChecked] = useState<Set<string>>(initialChecked);
  const [savingSymptoms, setSavingSymptoms] = useState(false);

  // Group symptoms by category
  const categories = Array.from(new Set(symptomsCatalog.map((s) => s.category))).sort();
  const byCat = (cat: string) => symptomsCatalog.filter((s) => s.category === cat);

  async function handleSaveSymptoms() {
    setSavingSymptoms(true);
    await saveVisitSymptoms(visitId, Array.from(checked));
    setSavingSymptoms(false);
    router.refresh();
  }

  // Lab form
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

      {/* Symptoms */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Symptoms</h2>
          <button onClick={handleSaveSymptoms} disabled={savingSymptoms}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {savingSymptoms ? "Saving..." : "Save symptoms"}
          </button>
        </div>
        {preCheckedSymptomIds.length > 0 && (
          <div className="border-b border-neutral-100 bg-blue-50 px-4 py-2">
            <p className="text-xs text-blue-700">
              Pre-checked from booking: {symptomsCatalog.filter((s) => preCheckedSymptomIds.includes(s.id)).map((s) => s.name).join(", ")}
            </p>
          </div>
        )}
        <div className="p-4 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 capitalize">
                {cat} symptoms
              </p>
              <div className="grid grid-cols-3 gap-2">
                {byCat(cat).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={checked.has(s.id)}
                      onChange={() => {
                        const next = new Set(checked);
                        next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                        setChecked(next);
                      }}
                      className="accent-red-500"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {symptomsCatalog.length === 0 && (
            <p className="text-sm text-neutral-400">No symptoms in catalog. Add some from Admin → Medications &amp; Symptoms.</p>
          )}
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
                    <p className="text-sm font-medium text-neutral-900">{lab.name}
                      <span className="ml-2 text-xs text-neutral-400 capitalize">({lab.type})</span>
                      {lab.lab_date && <span className="ml-2 text-xs text-neutral-400">{lab.lab_date}</span>}
                    </p>
                    {lab.findings && <p className="text-xs text-neutral-500">{lab.findings}</p>}
                    {lab.link_url && <a href={lab.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Link</a>}
                  </div>
                  <button onClick={() => { deleteLab(lab.id, visitId).then(() => router.refresh()); }}
                    className="ml-2 text-xs text-red-500 hover:text-red-700">Delete</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddLab} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <p className="text-xs font-medium text-neutral-600">+ Add Lab / Imaging</p>
            <div className="grid grid-cols-3 gap-2">
              <select value={labType} onChange={(e) => setLabType(e.target.value as typeof labType)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="lab">Lab</option>
                <option value="imaging">Imaging</option>
                <option value="other">Other</option>
              </select>
              <input value={labName} onChange={(e) => setLabName(e.target.value)} required placeholder="Name (e.g. CBC, MRI Brain)"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              <input type="date" value={labDate} onChange={(e) => setLabDate(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <textarea value={labFindings} onChange={(e) => setLabFindings(e.target.value)} rows={2} placeholder="Findings..."
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <input value={labLink} onChange={(e) => setLabLink(e.target.value)} placeholder="https://... (link to results)"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <button type="submit" disabled={addingLab}
              className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingLab ? "Adding..." : "+ Add"}
            </button>
          </form>
        </div>
      </section>

      {/* Medications */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Medications</h2>
        </div>
        <div className="p-4">
          {prescriptions.length > 0 && (
            <ul className="mb-4 space-y-1">
              {prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{rx.medication_name}</p>
                    <p className="text-xs text-neutral-500">
                      {[rx.dose, rx.unit].filter(Boolean).join(" ")}
                      {rx.instructions && ` · ${rx.instructions}`}
                      {rx.duration && ` · ${rx.duration}`}
                    </p>
                  </div>
                  <button onClick={() => { deletePrescription(rx.id, visitId).then(() => router.refresh()); }}
                    className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddMed} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="medmode" checked={medMode === "catalog"} onChange={() => setMedMode("catalog")} /> From catalog
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="medmode" checked={medMode === "manual"} onChange={() => setMedMode("manual")} /> Manual
              </label>
            </div>
            {medMode === "catalog" ? (
              <select value={medId} onChange={(e) => setMedId(e.target.value)} required
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="">Select medication...</option>
                {medsCatalog.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <input value={medName} onChange={(e) => setMedName(e.target.value)} required placeholder="Medication name"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            )}
            <div className="grid grid-cols-4 gap-2">
              <input value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Dose"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              <input value={medUnit} onChange={(e) => setMedUnit(e.target.value)} placeholder="Unit"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              <input value={medInstr} onChange={(e) => setMedInstr(e.target.value)} placeholder="Instructions"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              <input value={medDuration} onChange={(e) => setMedDuration(e.target.value)} placeholder="Duration"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <button type="submit" disabled={addingMed}
              className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {addingMed ? "Adding..." : "+ Add Medication"}
            </button>
          </form>
        </div>
      </section>

      {/* Diagnoses */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">Diagnosis</h2>
        </div>
        <div className="p-4">
          {diagnoses.length > 0 && (
            <ul className="mb-4 space-y-1">
              {diagnoses.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <p className="text-sm text-neutral-900">
                    {d.icd_code && <span className="mr-2 font-mono text-xs text-neutral-500">{d.icd_code}</span>}
                    {d.description}
                    {d.is_primary && <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Primary</span>}
                  </p>
                  <button onClick={() => { deleteDiagnosis(d.id, visitId).then(() => router.refresh()); }}
                    className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddDiagnosis} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <div className="grid grid-cols-4 gap-2">
              <input value={diagCode} onChange={(e) => setDiagCode(e.target.value)} placeholder="ICD code (optional)"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono" />
              <input value={diagDesc} onChange={(e) => setDiagDesc(e.target.value)} required placeholder="Diagnosis description"
                className="col-span-3 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-neutral-700">
                <input type="checkbox" checked={diagPrimary} onChange={(e) => setDiagPrimary(e.target.checked)} />
                Mark as primary diagnosis
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
