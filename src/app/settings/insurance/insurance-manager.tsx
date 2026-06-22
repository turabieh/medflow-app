"use client";
import { useState } from "react";
import { addInsuranceCompany, toggleInsuranceCompanyActive, updateInsuranceCompany } from "@/lib/actions/insurance";

interface Company { id: string; name: string; name_ar: string|null; portal_url: string|null; phone: string|null; email: string|null; notes: string|null; is_covered: boolean; is_active: boolean; }

export function InsuranceManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [name, setName] = useState(""); const [portalUrl, setPortalUrl] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [notes, setNotes] = useState(""); const [isCovered, setIsCovered] = useState(true);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string|null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const r = await addInsuranceCompany({ name, portalUrl: portalUrl||undefined, phone: phone||undefined, email: email||undefined, notes: notes||undefined, isCovered });
    setLoading(false);
    if (!r.success) { setError(r.error??'Error'); return; }
    setCompanies(prev=>[...prev,{id:crypto.randomUUID(),name:name.trim(),name_ar:null,portal_url:portalUrl||null,phone:phone||null,email:email||null,notes:notes||null,is_covered:isCovered,is_active:true}].sort((a,b)=>a.name.localeCompare(b.name)));
    setShowForm(false); setName(""); setPortalUrl(""); setPhone(""); setEmail(""); setNotes("");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Companies</h3>
        <button onClick={()=>setShowForm(!showForm)} className="text-xs font-medium text-neutral-700 underline">{showForm?"Cancel":"+ Add company"}</button>
      </div>
      {showForm&&(
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {error&&<div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Company name *</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jordan Insurance Company" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Portal / Website</label><input value={portalUrl} onChange={e=>setPortalUrl(e.target.value)} placeholder="https://..." className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          </div>
          <div><label className="mb-1 block text-xs text-neutral-600">Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. requires pre-auth" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          <label className="flex items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={isCovered} onChange={e=>setIsCovered(e.target.checked)}/>Clinic accepts this insurance</label>
          <button type="submit" disabled={loading} className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{loading?"Adding...":"+ Add Company"}</button>
        </form>
      )}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {companies.length===0?<p className="p-4 text-sm text-neutral-500">No companies yet.</p>:(
          <ul className="divide-y divide-neutral-100">
            {companies.map(c=>(
              <InsuranceRow key={c.id} company={c}
                editing={editing===c.id}
                onEdit={()=>setEditing(editing===c.id?null:c.id)}
                onSave={async(data)=>{ const r=await updateInsuranceCompany(c.id,data); if(r.success){setCompanies(prev=>prev.map(x=>x.id===c.id?{...x,...data,name_ar:null,portal_url:data.portalUrl??null,phone:data.phone??null,email:data.email??null,notes:data.notes??null}:x)); setEditing(null);} else setError(r.error??'Error'); }}
                onToggle={async()=>{ setCompanies(prev=>prev.map(x=>x.id===c.id?{...x,is_active:!c.is_active}:x)); await toggleInsuranceCompanyActive(c.id,!c.is_active); }} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InsuranceRow({company,editing,onEdit,onSave,onToggle}:{company:Company;editing:boolean;onEdit:()=>void;onSave:(d:{name:string;portalUrl?:string;phone?:string;email?:string;notes?:string;isCovered:boolean})=>Promise<void>;onToggle:()=>void;}) {
  const [name,setName]=useState(company.name); const [portal,setPortal]=useState(company.portal_url??''); const [phone,setPhone]=useState(company.phone??''); const [email,setEmail]=useState(company.email??''); const [notes,setNotes]=useState(company.notes??''); const [covered,setCovered]=useState(company.is_covered); const [saving,setSaving]=useState(false);
  return (
    <li className="px-4 py-2.5">
      {editing?(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Company name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <input value={portal} onChange={e=>setPortal(e.target.value)} placeholder="Portal URL" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          </div>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
          <label className="flex items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={covered} onChange={e=>setCovered(e.target.checked)}/>Clinic accepts this insurance</label>
          <div className="flex gap-2">
            <button onClick={async()=>{setSaving(true);await onSave({name,portalUrl:portal||undefined,phone:phone||undefined,email:email||undefined,notes:notes||undefined,isCovered:covered});setSaving(false);}} disabled={saving} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            <button onClick={onEdit} className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600">Cancel</button>
          </div>
        </div>
      ):(
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${company.is_active?"text-neutral-900":"text-neutral-400 line-through"}`}>{company.name} {!company.is_covered&&<span className="text-xs text-red-500">(not covered)</span>}</p>
            {company.notes&&<p className="text-xs text-neutral-400">{company.notes}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 underline hover:text-blue-800">Edit</button>
            <button onClick={onToggle} className="text-xs text-neutral-500 underline">{company.is_active?"Deactivate":"Activate"}</button>
          </div>
        </div>
      )}
    </li>
  );
}
