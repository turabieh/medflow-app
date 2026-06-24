"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveVisitNotes, saveAINote, addManualSymptom, removeManualSymptom, markVisitDone } from "@/lib/actions/visits";
import { addInpatientProcedure, removeInpatientProcedure } from "@/lib/actions/inpatients";

interface Procedure { id: string; procedure_name: string; price: number; notes: string | null; procedure_id: string | null; }
interface CatalogProcedure { id: string; name: string; inpatient_price: number | null; }

export function InpatientVisitNotes({
  visitId, inpatientId, clinicId,
  existingNote, existingVoiceNotes, existingKeyPoints, existingAbstract,
  manualSymptoms: initialSymptoms,
  procedures: initialProcedures,
  proceduresCatalog,
  currency,
  visitStatus,
  patientName, hospitalName, visitDate, visitType,
}: {
  visitId: string; inpatientId: string; clinicId: string;
  existingNote: string; existingVoiceNotes: string; existingKeyPoints: string; existingAbstract: string;
  manualSymptoms: string[];
  procedures: Procedure[];
  proceduresCatalog: CatalogProcedure[];
  currency: string;
  visitStatus: string;
  patientName: string; hospitalName: string; visitDate: string; visitType: string;
}) {
  const router = useRouter();
  const isDone = visitStatus === "done" || visitStatus === "finalized";

  // Notes
  const [voiceNotes, setVoiceNotes]   = useState(existingVoiceNotes);
  const [keyPoints, setKeyPoints]     = useState(existingKeyPoints);
  const [clinicalNote, setClinicalNote] = useState(existingNote);
  const [abstract, setAbstract]       = useState(existingAbstract);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // Symptoms
  const [symptoms, setSymptoms]       = useState<string[]>(initialSymptoms);
  const [symptomInput, setSymptomInput] = useState("");

  // Procedures
  const [procedures, setProcedures]   = useState<Procedure[]>(initialProcedures);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [customProcName, setCustomProcName]   = useState("");
  const [customProcPrice, setCustomProcPrice] = useState("");
  const [addingProc, setAddingProc]           = useState(false);

  // AI
  const [generating, setGenerating]     = useState(false);
  const [generatingAbs, setGeneratingAbs] = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── Symptoms
  async function handleAddSymptom(e: React.FormEvent) {
    e.preventDefault();
    if (!symptomInput.trim()) return;
    await addManualSymptom(visitId, symptomInput.trim());
    setSymptoms(s => [...s, symptomInput.trim()]);
    setSymptomInput("");
  }

  async function handleRemoveSymptom(name: string) {
    await removeManualSymptom(visitId, name);
    setSymptoms(s => s.filter(x => x !== name));
  }

  // ── Procedures
  async function handleAddProcedure(e: React.FormEvent) {
    e.preventDefault();
    setAddingProc(true);
    const catalog = proceduresCatalog.find(p => p.id === selectedCatalog);
    const name  = catalog ? catalog.name : customProcName.trim();
    const price = catalog?.inpatient_price ?? parseFloat(customProcPrice || "0");
    if (!name) { setAddingProc(false); return; }
    const result = await addInpatientProcedure(visitId, clinicId, {
      procedureId: catalog?.id,
      procedureName: name,
      price,
    });
    setAddingProc(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setSelectedCatalog(""); setCustomProcName(""); setCustomProcPrice("");
    router.refresh();
  }

  async function handleRemoveProcedure(id: string) {
    await removeInpatientProcedure(id);
    setProcedures(p => p.filter(x => x.id !== id));
    router.refresh();
  }

  // ── Notes save
  async function handleSaveNotes() {
    setSaving(true);
    await saveVisitNotes(visitId, voiceNotes, keyPoints);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── AI generate
  async function buildContext() {
    return [
      `Patient: ${patientName}`,
      `Hospital: ${hospitalName}`,
      `Visit: ${visitType} on ${visitDate}`,
      symptoms.length ? `Symptoms: ${symptoms.join(", ")}` : "",
      procedures.length ? `Procedures: ${procedures.map(p => p.procedure_name).join(", ")}` : "",
      voiceNotes ? `Notes: ${voiceNotes}` : "",
      keyPoints ? `Key points: ${keyPoints}` : "",
    ].filter(Boolean).join("\n");
  }

  async function callAI(type: "clinical_note" | "abstract") {
    const context = await buildContext();
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context, specialty: "Inpatient" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "AI error");
    return (data.text ?? "").replace(/#{1,6}\s+/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();
  }

  async function handleGenerateNote() {
    setGenerating(true); setAiError(null);
    try { setClinicalNote(await callAI("clinical_note")); }
    catch (e) { setAiError(e instanceof Error ? e.message : "Failed."); }
    setGenerating(false);
  }

  async function handleGenerateAbstract() {
    setGeneratingAbs(true); setAiError(null);
    try { setAbstract(await callAI("abstract")); }
    catch (e) { setAiError(e instanceof Error ? e.message : "Failed."); }
    setGeneratingAbs(false);
  }

  async function handleSaveAll() {
    setSaving(true);
    await saveVisitNotes(visitId, voiceNotes, keyPoints);
    await saveAINote(visitId, clinicalNote, abstract || undefined);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleMarkDone() {
    await markVisitDone(visitId, "");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Symptoms */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-900">Presenting Symptoms / Complaints</h3>
        </div>
        <div className="p-4 space-y-3">
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map(s => (
                <span key={s} className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {s}
                  {!isDone && <button type="button" onClick={() => handleRemoveSymptom(s)} className="ml-1 hover:text-red-900">&times;</button>}
                </span>
              ))}
            </div>
          )}
          {!isDone && (
            <form onSubmit={handleAddSymptom} className="flex gap-2">
              <input value={symptomInput} onChange={e => setSymptomInput(e.target.value)}
                placeholder="Type symptom and press Add..."
                className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
              <button type="submit" disabled={!symptomInput.trim()}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                Add
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3 flex justify-between items-center">
          <h3 className="text-sm font-medium text-neutral-900">Clinical Notes</h3>
          {!isDone && (
            <button onClick={handleSaveNotes} disabled={saving}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save notes"}
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Voice / Dictation Notes</label>
            <textarea value={voiceNotes} onChange={e => setVoiceNotes(e.target.value)}
              rows={3} disabled={isDone}
              placeholder="Speak or type notes here..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Key Clinical Points</label>
            <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
              rows={2} disabled={isDone}
              placeholder="Impression, assessment, plan..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-50" />
          </div>
        </div>
      </section>

      {/* Procedures */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-900">Procedures Done</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Will appear on the claim and hospital report</p>
        </div>
        <div className="p-4 space-y-3">
          {procedures.length > 0 && (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                {procedures.map(p => (
                  <tr key={p.id}>
                    <td className="py-2 font-medium text-neutral-900">{p.procedure_name}</td>
                    <td className="py-2 text-right font-mono text-neutral-700">{p.price.toFixed(2)} {currency}</td>
                    {!isDone && (
                      <td className="py-2 pl-3 text-right">
                        <button onClick={() => handleRemoveProcedure(p.id)}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="border-t border-neutral-200">
                  <td className="py-2 font-bold text-neutral-900">Total procedures</td>
                  <td className="py-2 text-right font-bold font-mono">
                    {procedures.reduce((s, p) => s + p.price, 0).toFixed(2)} {currency}
                  </td>
                  {!isDone && <td />}
                </tr>
              </tbody>
            </table>
          )}
          {!isDone && (
            <form onSubmit={handleAddProcedure} className="rounded-md border border-dashed border-neutral-300 p-3 space-y-2">
              <p className="text-xs font-medium text-neutral-600">Add procedure</p>
              {proceduresCatalog.length > 0 && (
                <select value={selectedCatalog} onChange={e => setSelectedCatalog(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="">— From catalog —</option>
                  {proceduresCatalog.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.inpatient_price ? ` (${p.inpatient_price} ${currency})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {!selectedCatalog && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={customProcName} onChange={e => setCustomProcName(e.target.value)}
                    placeholder="Procedure name"
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                  <input type="number" min="0" step="0.01" value={customProcPrice}
                    onChange={e => setCustomProcPrice(e.target.value)}
                    placeholder={`Price (${currency})`}
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                </div>
              )}
              <button type="submit" disabled={addingProc || (!selectedCatalog && !customProcName.trim())}
                className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {addingProc ? "Adding..." : "+ Add procedure"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* AI Note */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-900">Clinical Note (for hospital)</h3>
        </div>
        <div className="p-4 space-y-3">
          {aiError && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</div>}
          <div className="flex gap-2">
            <button onClick={handleGenerateNote} disabled={generating || isDone}
              className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {generating ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Generating...</> : "Generate with AI"}
            </button>
          </div>
          <textarea value={clinicalNote} onChange={e => setClinicalNote(e.target.value)}
            rows={10} disabled={isDone}
            placeholder="SOAP note will appear here after generation, or type directly..."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed disabled:bg-neutral-50" />
        </div>
      </section>

      {/* Bilingual summary */}
      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-900">Patient Summary (EN + AR)</h3>
        </div>
        <div className="p-4 space-y-3">
          <button onClick={handleGenerateAbstract} disabled={generatingAbs || isDone}
            className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">
            {generatingAbs ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Generating...</> : "Generate bilingual summary"}
          </button>
          {abstract && (
            <textarea value={abstract} onChange={e => setAbstract(e.target.value)}
              rows={7} disabled={isDone}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm leading-relaxed disabled:bg-neutral-50" />
          )}
        </div>
      </section>

      {/* Bottom actions */}
      {!isDone && (
        <div className="flex gap-3 pb-4">
          <button onClick={handleSaveAll} disabled={saving}
            className="flex-1 rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save All"}
          </button>
          <button onClick={handleMarkDone}
            className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            Mark Done
          </button>
          <a href={`/print/inpatient-visit?visitId=${visitId}&inpatientId=${inpatientId}&currency=${currency}`}
            target="_blank" rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
            Print
          </a>
        </div>
      )}
    </div>
  );
}
