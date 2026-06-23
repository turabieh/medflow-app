"use client";

import { useState } from "react";
import { addMedication, toggleMedicationActive, updateMedication } from "@/lib/actions/medications";
import { addSymptom, toggleSymptomActive, updateSymptom } from "@/lib/actions/symptoms";
import { BilingualInput } from "@/components/ui/bilingual-input";

interface Medication { id: string; name: string; name_ar: string | null; default_dose: string | null; default_unit: string | null; is_active: boolean; }
interface Symptom { id: string; name: string; name_ar: string | null; is_active: boolean; category: string; }
const UNITS = ["mg", "ml", "g", "mcg", "IU", "tablet", "capsule", "drop", "puff", "unit"];

export function MedicationsAndSymptomsManager({ initialMedications, initialSymptoms }: { initialMedications: Medication[]; initialSymptoms: Symptom[]; }) {
  const [tab, setTab] = useState<"medications" | "symptoms" | "advanced">("medications");
  const [medications, setMedications] = useState(initialMedications);
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [error, setError] = useState<string | null>(null);
  const [editingMed, setEditingMed] = useState<string | null>(null);
  const [editingSym, setEditingSym] = useState<string | null>(null);

  // Add med form
  const [medName, setMedName] = useState(""); const [medNameAr, setMedNameAr] = useState(""); const [medDose, setMedDose] = useState(""); const [medUnit, setMedUnit] = useState("mg"); const [addingMed, setAddingMed] = useState(false);
  // Add sym form
  const [symName, setSymName] = useState(""); const [symNameAr, setSymNameAr] = useState(""); const [addingSym, setAddingSym] = useState(false);

  async function handleAddMed(e: React.FormEvent) {
    e.preventDefault(); setAddingMed(true); setError(null);
    const r = await addMedication({ name: medName, nameAr: medNameAr || undefined, defaultDose: medDose || undefined, defaultUnit: medUnit });
    setAddingMed(false);
    if (!r.success) { setError(r.error ?? "Error"); return; }
    setMedications(prev => [...prev, { id: crypto.randomUUID(), name: medName.trim(), name_ar: medNameAr || null, default_dose: medDose || null, default_unit: medUnit, is_active: true }].sort((a,b)=>a.name.localeCompare(b.name)));
    setMedName(""); setMedNameAr(""); setMedDose("");
  }

  async function handleAddSym(e: React.FormEvent) {
    e.preventDefault(); setAddingSym(true); setError(null);
    const r = await addSymptom(symName, symNameAr || undefined, "basic");
    setAddingSym(false);
    if (!r.success) { setError(r.error ?? "Error"); return; }
    setSymptoms(prev => [...prev, { id: crypto.randomUUID(), name: symName.trim(), name_ar: symNameAr || null, is_active: true, category: "basic" }].sort((a,b)=>a.name.localeCompare(b.name)));
    setSymName(""); setSymNameAr("");
  }

  return (
    <div>
      <div className="mb-4 flex border-b border-neutral-200">
        {(["medications","symptoms","advanced"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab===t?"border-neutral-900 text-neutral-900":"border-transparent text-neutral-500 hover:text-neutral-700"}`}>
            {t === "advanced" ? "Advanced Symptoms" : t}
            {" "}({t==="medications"
              ? medications.filter(x=>x.is_active).length
              : symptoms.filter(x=>x.is_active && (t==="symptoms" ? x.category==="basic" : x.category==="advanced")).length
            } active)
          </button>
        ))}
      </div>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === "medications" && (
        <div>
          <form onSubmit={handleAddMed} className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-neutral-900">+ Add Medication</p>
            <div className="grid grid-cols-2 gap-3">
              <BilingualInput label="Medication name" required value={medName} onChange={e=>setMedName(e.target.value)} placeholder="e.g. Amoxicillin" />
              <BilingualInput label="Arabic name" value={medNameAr} onChange={e=>setMedNameAr(e.target.value)} placeholder="أموكسيسيلين" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs text-neutral-600">Default dose</label>
                <input type="text" value={medDose} onChange={e=>setMedDose(e.target.value)} placeholder="e.g. 500" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /></div>
              <div><label className="mb-1 block text-xs text-neutral-600">Unit</label>
                <select value={medUnit} onChange={e=>setMedUnit(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            </div>
            <button type="submit" disabled={addingMed} className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{addingMed?"Adding...":"+ Add"}</button>
          </form>
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            {medications.length===0?<p className="p-4 text-sm text-neutral-500">No medications yet.</p>:(
              <ul className="divide-y divide-neutral-100">
                {medications.map(m=>(
                  <MedRow key={m.id} med={m} editing={editingMed===m.id}
                    onEdit={()=>setEditingMed(editingMed===m.id?null:m.id)}
                    onSave={async(data)=>{ const r=await updateMedication(m.id,data); if(r.success){setMedications(prev=>prev.map(x=>x.id===m.id?{...x,...data,name_ar:data.nameAr??null,default_dose:data.defaultDose??null,default_unit:data.defaultUnit??null}:x)); setEditingMed(null);} else setError(r.error??'Error'); }}
                    onToggle={async()=>{ setMedications(prev=>prev.map(x=>x.id===m.id?{...x,is_active:!m.is_active}:x)); await toggleMedicationActive(m.id,!m.is_active); }} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "symptoms" && (
        <div>
          <form onSubmit={handleAddSym} className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-neutral-900">+ Add Basic Symptom</p>
            <div className="grid grid-cols-2 gap-3">
              <BilingualInput label="Symptom name" required value={symName} onChange={e=>setSymName(e.target.value)} placeholder="e.g. Headache" />
              <BilingualInput label="Arabic name" value={symNameAr} onChange={e=>setSymNameAr(e.target.value)} placeholder="صداع" />
            </div>
            <button type="submit" disabled={addingSym} className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{addingSym?"Adding...":"+ Add"}</button>
          </form>
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            {symptoms.filter(s=>s.category!=="advanced").length===0?<p className="p-4 text-sm text-neutral-500">No basic symptoms yet.</p>:(
              <ul className="divide-y divide-neutral-100">
                {symptoms.filter(s=>s.category!=="advanced").map(s=>(
                  <SymRow key={s.id} sym={s} editing={editingSym===s.id}
                    onEdit={()=>setEditingSym(editingSym===s.id?null:s.id)}
                    onSave={async(name,nameAr)=>{ const r=await updateSymptom(s.id,name,nameAr); if(r.success){setSymptoms(prev=>prev.map(x=>x.id===s.id?{...x,name,name_ar:nameAr??null}:x)); setEditingSym(null);} else setError(r.error??'Error'); }}
                    onToggle={async()=>{ setSymptoms(prev=>prev.map(x=>x.id===s.id?{...x,is_active:!s.is_active}:x)); await toggleSymptomActive(s.id,!s.is_active); }} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "advanced" && (
        <div>
          <form onSubmit={async(e)=>{ e.preventDefault(); setAddingSym(true); setError(null); const r=await addSymptom(symName,symNameAr||undefined,"advanced"); setAddingSym(false); if(!r.success){setError(r.error??'Error');return;} setSymptoms(prev=>[...prev,{id:crypto.randomUUID(),name:symName.trim(),name_ar:symNameAr||null,is_active:true,category:"advanced"}].sort((a,b)=>a.name.localeCompare(b.name))); setSymName(""); setSymNameAr(""); }}
            className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-neutral-900">+ Add Advanced Clinical Symptom</p>
            <p className="text-xs text-neutral-500">These appear in a separate section in the doctor&apos;s clinical tab.</p>
            <div className="grid grid-cols-2 gap-3">
              <BilingualInput label="Symptom name" required value={symName} onChange={e=>setSymName(e.target.value)} placeholder="e.g. Photophobia" />
              <BilingualInput label="Arabic name" value={symNameAr} onChange={e=>setSymNameAr(e.target.value)} placeholder="رهاب الضوء" />
            </div>
            <button type="submit" disabled={addingSym} className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{addingSym?"Adding...":"+ Add"}</button>
          </form>
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            {symptoms.filter(s=>s.category==="advanced").length===0?<p className="p-4 text-sm text-neutral-500">No advanced symptoms yet.</p>:(
              <ul className="divide-y divide-neutral-100">
                {symptoms.filter(s=>s.category==="advanced").map(s=>(
                  <SymRow key={s.id} sym={s} editing={editingSym===s.id}
                    onEdit={()=>setEditingSym(editingSym===s.id?null:s.id)}
                    onSave={async(name,nameAr)=>{ const r=await updateSymptom(s.id,name,nameAr); if(r.success){setSymptoms(prev=>prev.map(x=>x.id===s.id?{...x,name,name_ar:nameAr??null}:x)); setEditingSym(null);} else setError(r.error??'Error'); }}
                    onToggle={async()=>{ setSymptoms(prev=>prev.map(x=>x.id===s.id?{...x,is_active:!s.is_active}:x)); await toggleSymptomActive(s.id,!s.is_active); }} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MedRow({ med, editing, onEdit, onSave, onToggle }: { med: Medication; editing: boolean; onEdit: ()=>void; onSave: (d:{name:string;nameAr?:string;defaultDose?:string;defaultUnit?:string})=>Promise<void>; onToggle: ()=>void; }) {
  const [name,setName]=useState(med.name); const [nameAr,setNameAr]=useState(med.name_ar??''); const [dose,setDose]=useState(med.default_dose??''); const [unit,setUnit]=useState(med.default_unit??'mg'); const [saving,setSaving]=useState(false);
  return (
    <li className="px-4 py-2.5">
      {editing?(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <input value={nameAr} onChange={e=>setNameAr(e.target.value)} placeholder="Arabic name" dir="rtl" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={dose} onChange={e=>setDose(e.target.value)} placeholder="Dose" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <select value={unit} onChange={e=>setUnit(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
          </div>
          <div className="flex gap-2">
            <button onClick={async()=>{setSaving(true);await onSave({name,nameAr:nameAr||undefined,defaultDose:dose||undefined,defaultUnit:unit});setSaving(false);}} disabled={saving} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            <button onClick={onEdit} className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50">Cancel</button>
          </div>
        </div>
      ):(
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${med.is_active?"text-neutral-900":"text-neutral-400 line-through"}`}>{med.name}{med.name_ar&&<span className="ml-2 text-neutral-400" dir="rtl">{med.name_ar}</span>}</p>
            {(med.default_dose||med.default_unit)&&<p className="text-xs text-neutral-400">{med.default_dose} {med.default_unit}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 underline hover:text-blue-800">Edit</button>
            <button onClick={onToggle} className="text-xs text-neutral-500 underline hover:text-neutral-700">{med.is_active?"Deactivate":"Activate"}</button>
          </div>
        </div>
      )}
    </li>
  );
}

function SymRow({ sym, editing, onEdit, onSave, onToggle }: { sym: Symptom; editing: boolean; onEdit: ()=>void; onSave: (name:string,nameAr?:string)=>Promise<void>; onToggle: ()=>void; }) {
  const [name,setName]=useState(sym.name); const [nameAr,setNameAr]=useState(sym.name_ar??''); const [saving,setSaving]=useState(false);
  return (
    <li className="px-4 py-2.5">
      {editing?(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            <input value={nameAr} onChange={e=>setNameAr(e.target.value)} placeholder="Arabic name" dir="rtl" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={async()=>{setSaving(true);await onSave(name,nameAr||undefined);setSaving(false);}} disabled={saving} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            <button onClick={onEdit} className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600">Cancel</button>
          </div>
        </div>
      ):(
        <div className="flex items-center justify-between">
          <p className={`text-sm ${sym.is_active?"text-neutral-900":"text-neutral-400 line-through"}`}>{sym.name}{sym.name_ar&&<span className="ml-2 text-neutral-400">{sym.name_ar}</span>}</p>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 underline hover:text-blue-800">Edit</button>
            <button onClick={onToggle} className="text-xs text-neutral-500 underline hover:text-neutral-700">{sym.is_active?"Deactivate":"Activate"}</button>
          </div>
        </div>
      )}
    </li>
  );
}
