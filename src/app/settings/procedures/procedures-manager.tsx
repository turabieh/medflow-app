"use client";
import { useState } from "react";
import { addProcedure, toggleProcedureActive, updateProcedure } from "@/lib/actions/procedures";

interface Procedure { id: string; name: string; name_ar: string|null; category: string|null; outpatient_price: number; inpatient_price: number|null; duration_minutes: number|null; notes: string|null; is_active: boolean; }

export function ProceduresManager({ initialProcedures }: { initialProcedures: Procedure[] }) {
  const [procedures, setProcedures] = useState(initialProcedures);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [name,setName]=useState(""); const [category,setCategory]=useState(""); const [outPrice,setOutPrice]=useState("0"); const [inPrice,setInPrice]=useState(""); const [duration,setDuration]=useState("30"); const [notes,setNotes]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const r = await addProcedure({ name, category: category||undefined, outpatientPrice: parseFloat(outPrice)||0, inpatientPrice: inPrice?parseFloat(inPrice):undefined, durationMinutes: duration?parseInt(duration):undefined, notes: notes||undefined });
    setLoading(false);
    if (!r.success) { setError(r.error??'Error'); return; }
    setProcedures(prev=>[...prev,{id:crypto.randomUUID(),name:name.trim(),name_ar:null,category:category||null,outpatient_price:parseFloat(outPrice)||0,inpatient_price:inPrice?parseFloat(inPrice):null,duration_minutes:duration?parseInt(duration):null,notes:notes||null,is_active:true}]);
    setShowForm(false); setName(""); setCategory(""); setOutPrice("0"); setInPrice(""); setNotes("");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Procedures</h3>
        <button onClick={()=>setShowForm(!showForm)} className="text-xs font-medium text-neutral-700 underline">{showForm?"Cancel":"+ Add procedure"}</button>
      </div>
      {showForm&&(
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {error&&<div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Procedure name *</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. EEG" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Category</label><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. Neurology" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Outpatient price</label><input type="number" step="0.01" min="0" value={outPrice} onChange={e=>setOutPrice(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Inpatient price</label><input type="number" step="0.01" min="0" value={inPrice} onChange={e=>setInPrice(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Duration (min)</label><input type="number" min="0" value={duration} onChange={e=>setDuration(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          </div>
          <div><label className="mb-1 block text-xs text-neutral-600">Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          <button type="submit" disabled={loading} className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{loading?"Adding...":"+ Add Procedure"}</button>
        </form>
      )}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {procedures.length===0?<p className="p-4 text-sm text-neutral-500">No procedures yet.</p>:(
          <ul className="divide-y divide-neutral-100">
            {procedures.map(p=>(
              <ProcedureRow key={p.id} proc={p}
                editing={editing===p.id}
                onEdit={()=>setEditing(editing===p.id?null:p.id)}
                onSave={async(data)=>{ const r=await updateProcedure(p.id,data); if(r.success){setProcedures(prev=>prev.map(x=>x.id===p.id?{...x,name:data.name,name_ar:null,category:data.category??null,outpatient_price:data.outpatientPrice,inpatient_price:data.inpatientPrice??null,duration_minutes:data.durationMinutes??null,notes:data.notes??null}:x)); setEditing(null);} else setError(r.error??'Error'); }}
                onToggle={async()=>{ setProcedures(prev=>prev.map(x=>x.id===p.id?{...x,is_active:!p.is_active}:x)); await toggleProcedureActive(p.id,!p.is_active); }} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProcedureRow({proc,editing,onEdit,onSave,onToggle}:{proc:Procedure;editing:boolean;onEdit:()=>void;onSave:(d:{name:string;category?:string;outpatientPrice:number;inpatientPrice?:number;durationMinutes?:number;notes?:string})=>Promise<void>;onToggle:()=>void;}) {
  const [name,setName]=useState(proc.name); const [cat,setCat]=useState(proc.category??''); const [out,setOut]=useState(String(proc.outpatient_price)); const [inp,setInp]=useState(proc.inpatient_price!=null?String(proc.inpatient_price):''); const [dur,setDur]=useState(proc.duration_minutes!=null?String(proc.duration_minutes):''); const [notes,setNotes]=useState(proc.notes??''); const [saving,setSaving]=useState(false);
  return (
    <li className="px-4 py-2.5">
      {editing?(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="Category" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="0.01" value={out} onChange={e=>setOut(e.target.value)} placeholder="Outpatient price" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <input type="number" step="0.01" value={inp} onChange={e=>setInp(e.target.value)} placeholder="Inpatient price" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <input type="number" value={dur} onChange={e=>setDur(e.target.value)} placeholder="Duration min" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          </div>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          <div className="flex gap-2">
            <button onClick={async()=>{setSaving(true);await onSave({name,category:cat||undefined,outpatientPrice:parseFloat(out)||0,inpatientPrice:inp?parseFloat(inp):undefined,durationMinutes:dur?parseInt(dur):undefined,notes:notes||undefined});setSaving(false);}} disabled={saving} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            <button onClick={onEdit} className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600">Cancel</button>
          </div>
        </div>
      ):(
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${proc.is_active?"text-neutral-900":"text-neutral-400 line-through"}`}>{proc.name}{proc.category&&<span className="ml-2 text-xs text-neutral-400">· {proc.category}</span>}</p>
            <p className="text-xs text-neutral-400">{proc.outpatient_price.toFixed(2)} outpatient{proc.inpatient_price!=null?` · ${proc.inpatient_price.toFixed(2)} inpatient`:''}{proc.duration_minutes?` · ${proc.duration_minutes}min`:''}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 underline hover:text-blue-800">Edit</button>
            <button onClick={onToggle} className="text-xs text-neutral-500 underline">{proc.is_active?"Deactivate":"Activate"}</button>
          </div>
        </div>
      )}
    </li>
  );
}
