"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffMember, deactivateStaffMember, reactivateStaffMember, updateStaffMember, deleteStaffMember } from "@/lib/actions/staff";

interface StaffMember { id: string; full_name: string; role: string; email: string|null; specialty: string|null; is_active: boolean; }

export function StaffManager({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [fullName,setFullName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [role,setRole]=useState<"doctor"|"secretary"|"nurse"|"admin">("secretary"); const [specialty,setSpecialty]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    const r = await createStaffMember({ fullName, email, password, role, specialty: role==="doctor"?specialty:undefined });
    setLoading(false);
    if (!r.success) { setError(r.error??'Error'); return; }
    setShowForm(false); setFullName(""); setEmail(""); setPassword(""); setSpecialty(""); router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Staff</h2>
        <button onClick={()=>setShowForm(!showForm)} className="text-xs font-medium text-neutral-700 underline hover:text-neutral-900">{showForm?"Cancel":"+ Add staff member"}</button>
      </div>
      {showForm&&(
        <form onSubmit={handleCreate} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {error&&<div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Full name</label><input required value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Role</label><select value={role} onChange={e=>setRole(e.target.value as typeof role)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"><option value="secretary">Secretary</option><option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="admin">Admin</option></select></div>
          </div>
          {role==="doctor"&&<div><label className="mb-1 block text-xs text-neutral-600">Specialty</label><input value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="e.g. Neurology" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs text-neutral-600">Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
            <div><label className="mb-1 block text-xs text-neutral-600">Temporary password</label><input type="text" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 chars" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/></div>
          </div>
          <button type="submit" disabled={loading} className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">{loading?"Creating...":"Create staff member"}</button>
        </form>
      )}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {initialStaff.length===0?<p className="p-4 text-sm text-neutral-500">No staff members yet.</p>:(
          <ul className="divide-y divide-neutral-100">
            {initialStaff.map(member=>(
              <StaffRow key={member.id} member={member}
                editing={editing===member.id}
                onEdit={()=>setEditing(editing===member.id?null:member.id)}
                onSave={async(data)=>{ const r=await updateStaffMember(member.id,data); if(r.success){setEditing(null);router.refresh();}else setError(r.error??'Error'); }}
                onToggle={async()=>{ const action=member.is_active?deactivateStaffMember:reactivateStaffMember; await action(member.id); router.refresh(); }}
                onDelete={async()=>{
                  if (!confirm(`Delete ${member.full_name}? This removes their login and all access. This cannot be undone.`)) return;
                  const r = await deleteStaffMember(member.id);
                  if (r.success) router.refresh();
                  else alert(r.error ?? "Delete failed");
                }} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StaffRow({member,editing,onEdit,onSave,onToggle,onDelete}:{member:StaffMember;editing:boolean;onEdit:()=>void;onSave:(d:{fullName:string;role:string;specialty?:string})=>Promise<void>;onToggle:()=>void;onDelete:()=>Promise<void>;}) {
  const [name,setName]=useState(member.full_name); const [role,setRole]=useState(member.role); const [spec,setSpec]=useState(member.specialty??''); const [saving,setSaving]=useState(false);
  return (
    <li className="px-4 py-2.5">
      {editing?(
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>
            <select value={role} onChange={e=>setRole(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"><option value="secretary">Secretary</option><option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="admin">Admin</option></select>
          </div>
          {role==="doctor"&&<input value={spec} onChange={e=>setSpec(e.target.value)} placeholder="Specialty" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"/>}
          <div className="flex gap-2">
            <button onClick={async()=>{setSaving(true);await onSave({fullName:name,role,specialty:spec||undefined});setSaving(false);}} disabled={saving} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            <button onClick={onEdit} className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600">Cancel</button>
          </div>
        </div>
      ):(
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${member.is_active?"text-neutral-900":"text-neutral-400"}`}>{member.full_name}{!member.is_active&&<span className="ml-2 text-xs">(inactive)</span>}</p>
            <p className="text-xs text-neutral-500">{member.role}{member.specialty&&` · ${member.specialty}`}{member.email&&` · ${member.email}`}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-xs text-blue-600 underline hover:text-blue-800">Edit</button>
            <button onClick={onToggle} className="text-xs text-neutral-500 underline hover:text-neutral-700">{member.is_active?"Deactivate":"Reactivate"}</button>
            <button onClick={onDelete} className="text-xs text-red-500 underline hover:text-red-700">Delete</button>
          </div>
        </div>
      )}
    </li>
  );
}
