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
  appointmentId,
  voiceNotes,
  keyPoints,
  prescriptions,
  medsCatalog,
  diagnoses,
}: {
  visitId: string;
  appointmentId: string;
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
  const [icdSuggestions, setIcdSuggestions] = useState<{code:string;description:string}[]>([]);
  const [loadingIcd, setLoadingIcd] = useState(false);

  async function handleSuggestICD() {
    setLoadingIcd(true);
    setIcdSuggestions([]);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "icd_suggest", context: buildICDContext() }),
      });
      const data = await res.json();
      setIcdSuggestions(data.suggestions ?? []);
    } catch { /* silent */ }
    setLoadingIcd(false);
  }

  function buildICDContext() {
    return [
      voiceNotes ? `Doctor notes: ${voiceNotes}` : "",
      keyPoints ? `Key points: ${keyPoints}` : "",
      diagnoses.length ? `Current diagnoses: ${diagnoses.map(d=>d.description).join(", ")}` : "",
    ].filter(Boolean).join("\n");
  }

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
                    {d.icd_code && <span className="mr-2 font-mono text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{d.icd_code}</span>}
                    {d.description}
                    {d.is_primary && <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Primary</span>}
                  </p>
                  <button onClick={() => deleteDiagnosis(d.id, visitId).then(() => router.refresh())}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </li>
              ))}
            </ul>
          )}

          {/* AI ICD Suggestion */}
          <div className="mb-3 rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-800">AI Diagnosis Suggestions</p>
              <button onClick={handleSuggestICD} disabled={loadingIcd}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {loadingIcd ? <><span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent"/>Suggesting...</> : "Suggest ICD codes with AI"}
              </button>
            </div>
            {icdSuggestions.length > 0 && (
              <div className="space-y-1">
                {icdSuggestions.map((s) => (
                  <button key={s.code} type="button"
                    onClick={() => { setDiagCode(s.code); setDiagDesc(s.description); }}
                    className="w-full flex items-center gap-2 rounded-md bg-white border border-blue-200 px-2.5 py-1.5 text-left hover:bg-blue-50 transition-colors">
                    <span className="font-mono text-xs font-bold text-blue-700 shrink-0">{s.code}</span>
                    <span className="text-xs text-neutral-700">{s.description}</span>
                    <span className="ml-auto text-[10px] text-blue-500 shrink-0">Select →</span>
                  </button>
                ))}
              </div>
            )}
            {icdSuggestions.length === 0 && !loadingIcd && (
              <p className="text-xs text-blue-600">Click to get AI-suggested ICD-10 codes based on symptoms and notes.</p>
            )}
          </div>

          <form onSubmit={handleAddDiagnosis} className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3">
            <p className="text-xs font-medium text-neutral-600">Add diagnosis (from suggestion or manually):</p>
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

      {/* Insurance Procedures (pre-authorization) */}
      <InsuranceProceduresSection visitId={visitId} appointmentId={appointmentId} />
    </div>
  );
}

// ── Insurance Procedures sub-component ────────────────────────────────────────
function InsuranceProceduresSection({ visitId, appointmentId }: { visitId: string; appointmentId: string }) {
  const router = useRouter();
  const [procs, setProcs] = useState<{id:string;procedure_name:string;price:number;auth_number:string|null;auth_date:string|null;auth_status:string}[]>([]);
  const [catalog, setCatalog] = useState<{id:string;name:string;price:number|null}[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow]     = useState(false);

  // Form state
  const [mode, setMode]           = useState<"catalog"|"manual">("catalog");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [procName, setProcName]   = useState("");
  const [procPrice, setProcPrice] = useState("");
  const [authStatus, setAuthStatus] = useState<"pending"|"approved"|"rejected"|"not_required">("pending");
  const [authNum, setAuthNum]     = useState("");
  const [authDate, setAuthDate]   = useState("");
  const [adding, setAdding]       = useState(false);

  useEffect(() => {
    if (!show) { setLoaded(false); return; }
    if (loaded) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      Promise.all([
        supabase.from("outpatient_procedure_claims")
          .select("id, procedure_name, price, auth_number, auth_date, auth_status")
          .eq("visit_id", visitId)
          .order("created_at"),
        supabase.from("procedures_catalog")
          .select("id, name, price")
          .eq("is_active", true)
          .order("name"),
      ]).then(([procsRes, catRes]) => {
        setProcs(procsRes.data ?? []);
        setCatalog(catRes.data ?? []);
        setLoaded(true);
      });
    });
  }, [show, visitId, loaded]);

  // When catalog item selected, auto-fill price
  function handleCatalogSelect(id: string) {
    setSelectedCatId(id);
    const item = catalog.find(c => c.id === id);
    if (item?.price) setProcPrice(String(item.price));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name  = mode === "catalog" ? catalog.find(c => c.id === selectedCatId)?.name ?? "" : procName.trim();
    const price = parseFloat(procPrice || "0");
    if (!name) return;
    setAdding(true);
    const { saveOutpatientProcedure } = await import("@/lib/actions/insurance-claims");
    await saveOutpatientProcedure({
      visitId, appointmentId,
      procedureId:   mode === "catalog" ? selectedCatId || undefined : undefined,
      procedureName: name, price,
      authNumber: authNum || undefined, authDate: authDate || undefined, authStatus,
    });
    setAdding(false); setLoaded(false);
    setProcName(""); setProcPrice(""); setAuthNum(""); setAuthDate("");
    setSelectedCatId(""); setAuthStatus("pending");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const { deleteOutpatientProcedure } = await import("@/lib/actions/insurance-claims");
    await deleteOutpatientProcedure(id);
    setProcs(p => p.filter(x => x.id !== id));
  }

  const AUTH_LABELS: Record<string, string> = { pending:"⏳ Pending", approved:"✓ Approved", rejected:"✗ Rejected", not_required:"N/A" };
  const AUTH_COLORS: Record<string, string> = { pending:"text-amber-600", approved:"text-green-600", rejected:"text-red-600", not_required:"text-neutral-400" };

  const rejectedProcs = procs.filter(p => p.auth_status === "rejected");
  const approvedTotal = procs.filter(p => p.auth_status === "approved").reduce((s, p) => s + p.price, 0);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <button type="button" onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-900">Insurance Procedures &amp; Pre-Authorization</h2>
          {procs.length > 0 && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{procs.length}</span>}
          {rejectedProcs.length > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">⚠ {rejectedProcs.length} rejected</span>}
        </div>
        <span className="text-xs text-neutral-400">{show ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {show && (
        <div className="p-4 space-y-3">
          {/* Rejected warning */}
          {rejectedProcs.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-red-700 mb-1">⚠ Rejected procedures — collect from patient</p>
              <p className="text-[10px] text-red-600 mb-1.5">These were not approved by insurance. Charge the patient directly (cash/card):</p>
              <div className="space-y-1">
                {rejectedProcs.map(p => (
                  <div key={p.id} className="flex justify-between text-xs text-red-700">
                    <span>{p.procedure_name}</span>
                    <span className="font-mono font-semibold">{p.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-red-200 pt-1 mt-1 flex justify-between text-xs font-bold text-red-800">
                  <span>Total to collect from patient</span>
                  <span className="font-mono">{rejectedProcs.reduce((s, p) => s + p.price, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Procedures table */}
          {procs.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-100">
                <th className="py-1.5 pr-3">Procedure</th>
                <th className="py-1.5 pr-3 text-right">Price</th>
                <th className="py-1.5 pr-3">Auth #</th>
                <th className="py-1.5 pr-3">Status</th>
                <th />
              </tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {procs.map(p => (
                  <tr key={p.id} className={p.auth_status === "rejected" ? "bg-red-50/30" : ""}>
                    <td className="py-1.5 pr-3 font-medium">{p.procedure_name}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-xs">{p.price.toFixed(2)}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-neutral-600">{p.auth_number ?? "—"}</td>
                    <td className={`py-1.5 pr-3 text-xs font-medium ${AUTH_COLORS[p.auth_status] ?? ""}`}>{AUTH_LABELS[p.auth_status] ?? p.auth_status}</td>
                    <td><button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button></td>
                  </tr>
                ))}
              </tbody>
              {approvedTotal > 0 && (
                <tfoot><tr className="border-t border-neutral-200">
                  <td colSpan={4} className="py-1.5 text-xs font-semibold text-green-700 text-right">Approved total (billable to insurance)</td>
                  <td className="py-1.5 text-right font-mono text-xs font-bold text-green-700">{approvedTotal.toFixed(2)}</td>
                </tr></tfoot>
              )}
            </table>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="rounded-md border border-dashed border-neutral-300 p-3 space-y-2">
            <p className="text-xs font-medium text-neutral-600">+ Add Procedure</p>

            {/* Mode toggle */}
            <div className="flex gap-3 text-xs mb-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={mode === "catalog"} onChange={() => { setMode("catalog"); setProcName(""); }}/>
                From catalog
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={mode === "manual"} onChange={() => { setMode("manual"); setSelectedCatId(""); }}/>
                Enter manually
              </label>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {mode === "catalog" ? (
                <select value={selectedCatId} onChange={e => handleCatalogSelect(e.target.value)} required
                  className="col-span-2 rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
                  <option value="">— Select procedure —</option>
                  {catalog.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.price ? ` (${c.price})` : ""}</option>
                  ))}
                </select>
              ) : (
                <input value={procName} onChange={e => setProcName(e.target.value)} required
                  placeholder="Procedure name" className="col-span-2 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
              )}

              <input type="number" min="0" step="0.01" value={procPrice} onChange={e => setProcPrice(e.target.value)}
                placeholder="Price" className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />

              <select value={authStatus} onChange={e => setAuthStatus(e.target.value as typeof authStatus)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
                <option value="pending">⏳ Pending</option>
                <option value="approved">✓ Approved</option>
                <option value="rejected">✗ Rejected</option>
                <option value="not_required">N/A</option>
              </select>

              {authStatus === "approved" && (<>
                <input value={authNum} onChange={e => setAuthNum(e.target.value)}
                  placeholder="Auth / Referral #" className="col-span-2 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
                <input type="date" value={authDate} onChange={e => setAuthDate(e.target.value)}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
              </>)}
            </div>

            <button type="submit" disabled={adding || (mode === "catalog" && !selectedCatId) || (mode === "manual" && !procName.trim())}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {adding ? "Adding..." : "+ Add"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
