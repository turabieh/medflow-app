"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Template {
  id: string; title: string; default_priority: string;
  default_assignee_role: string | null; sort_order: number; is_active: boolean;
}

const ROLES = ["any","doctor","secretary","nurse","technician","admin"];
const PRIORITIES = ["high","normal","low"];
const PRIORITY_STYLE: Record<string,string> = {
  high:"bg-red-50 text-red-700 border-red-200",
  normal:"bg-amber-50 text-amber-700 border-amber-200",
  low:"bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function TodoTemplatesClient({ clinicId, templates: initial }:
  { clinicId: string; templates: Template[] }) {
  const router = useRouter();
  const sb = createClient();
  const [templates, setTemplates] = useState(initial);
  const [newTitle, setNewTitle]   = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newRole, setNewRole]     = useState("any");
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState<string|null>(null);

  async function add() {
    if (!newTitle.trim()) { setError("Title required"); return; }
    setAdding(true); setError(null);
    const maxOrder = Math.max(...templates.map(t=>t.sort_order), 0);
    const { data, error: e } = await sb.from("todo_templates").insert({
      clinic_id: clinicId, title: newTitle.trim(),
      default_priority: newPriority,
      default_assignee_role: newRole==="any"?null:newRole,
      sort_order: maxOrder+1, is_active: true,
    }).select().single();
    setAdding(false);
    if (e) { setError(e.message); return; }
    setTemplates(prev=>[...prev, data as Template]);
    setNewTitle(""); setNewPriority("normal"); setNewRole("any");
  }

  async function toggleActive(t: Template) {
    await sb.from("todo_templates").update({is_active:!t.is_active}).eq("id",t.id);
    setTemplates(prev=>prev.map(x=>x.id===t.id?{...x,is_active:!x.is_active}:x));
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    await sb.from("todo_templates").delete().eq("id",id);
    setTemplates(prev=>prev.filter(t=>t.id!==id));
  }

  async function moveUp(i: number) {
    if (i===0) return;
    const arr=[...templates];
    [arr[i-1],arr[i]]=[arr[i],arr[i-1]];
    arr.forEach((t,idx)=>t.sort_order=idx+1);
    setTemplates(arr);
    await Promise.all(arr.map(t=>sb.from("todo_templates").update({sort_order:t.sort_order}).eq("id",t.id)));
  }

  async function moveDown(i: number) {
    if (i===templates.length-1) return;
    const arr=[...templates];
    [arr[i],arr[i+1]]=[arr[i+1],arr[i]];
    arr.forEach((t,idx)=>t.sort_order=idx+1);
    setTemplates(arr);
    await Promise.all(arr.map(t=>sb.from("todo_templates").update({sort_order:t.sort_order}).eq("id",t.id)));
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Task Templates</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Predefined tasks that staff can quickly add to their to-do list with one click.
        </p>
      </div>

      {error && <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Add new */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Add New Template</p>
        <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="e.g. Call patient to confirm appointment..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"/>
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Default Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p=>(
                <button key={p} onClick={()=>setNewPriority(p)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border capitalize ${newPriority===p?PRIORITY_STYLE[p]:"bg-white text-neutral-400 border-neutral-200"}`}>
                  {p==="high"?"🔴":p==="normal"?"🟡":"🟢"} {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Default Assign To</label>
            <select value={newRole} onChange={e=>setNewRole(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none">
              {ROLES.map(r=><option key={r} value={r}>{r==="any"?"Anyone (manual select)":r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <button onClick={add} disabled={adding||!newTitle.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {adding?"Adding...":"Add Template"}
        </button>
      </div>

      {/* Template list */}
      <div className="space-y-2">
        {templates.length===0&&(
          <p className="text-sm text-neutral-400 text-center py-8">No templates yet. Add your first one above.</p>
        )}
        {templates.map((t,i)=>(
          <div key={t.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${t.is_active?"border-neutral-200 bg-white":"border-neutral-100 bg-neutral-50"}`}>
            <div className="flex flex-col gap-0.5">
              <button onClick={()=>moveUp(i)} disabled={i===0} className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-20">▲</button>
              <button onClick={()=>moveDown(i)} disabled={i===templates.length-1} className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-20">▼</button>
            </div>
            <span className="text-xs text-neutral-400 w-5 text-center font-mono">{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${t.is_active?"text-neutral-900":"text-neutral-400 line-through"}`}>{t.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${PRIORITY_STYLE[t.default_priority]??""}`}>
                  {t.default_priority==="high"?"🔴":t.default_priority==="normal"?"🟡":"🟢"} {t.default_priority}
                </span>
                {t.default_assignee_role&&(
                  <span className="text-[10px] text-neutral-400 capitalize">→ {t.default_assignee_role}</span>
                )}
              </div>
            </div>
            <button onClick={()=>toggleActive(t)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.is_active?"bg-emerald-100 text-emerald-700 hover:bg-emerald-200":"bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
              {t.is_active?"Active":"Hidden"}
            </button>
            <button onClick={()=>remove(t.id)}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
