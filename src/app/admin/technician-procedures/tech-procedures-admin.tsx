"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Variable {
  key: string;
  label: string;
  label_ar?: string;
  type: "text" | "number" | "select" | "boolean";
  unit?: string;
  options?: string;   // comma-separated for select
  required: boolean;
}

interface Procedure {
  id: string;
  name: string;
  name_ar: string | null;
  category: string;
  description: string | null;
  variables: Variable[];
  duration_min: number;
  price: number | null;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = ["general","radiology","laboratory","cardiology","neurology","ultrasound","endoscopy","other"];
const VAR_TYPES   = ["number","text","select","boolean"];

const empty: Omit<Procedure,"id"> = {
  name:"", name_ar:null, category:"general", description:null,
  variables:[], duration_min:30, price:null, is_active:true, sort_order:0,
};

export function TechProceduresAdmin({ clinicId, procedures: init }: { clinicId: string; procedures: Procedure[] }) {
  const router  = useRouter();
  const [procs, setProcs]   = useState<Procedure[]>(init);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Variable editor state
  const [varLabel, setVarLabel]   = useState("");
  const [varLabelAr, setVarLabelAr] = useState("");
  const [varType, setVarType]     = useState<Variable["type"]>("number");
  const [varUnit, setVarUnit]     = useState("");
  const [varOptions, setVarOptions] = useState("");
  const [varRequired, setVarRequired] = useState(true);

  function startNew() {
    setEditing({ ...empty, id:"__new__", variables:[] });
    setIsNew(true); setError("");
  }

  function startEdit(p: Procedure) {
    setEditing({ ...p, variables: p.variables ? [...p.variables] : [] });
    setIsNew(false); setError("");
  }

  function addVariable() {
    if (!varLabel.trim()) return;
    const key = varLabel.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const v: Variable = {
      key, label: varLabel.trim(), label_ar: varLabelAr.trim() || undefined,
      type: varType, unit: varUnit.trim() || undefined,
      options: varOptions.trim() || undefined, required: varRequired,
    };
    setEditing(prev => prev ? { ...prev, variables: [...prev.variables, v] } : null);
    setVarLabel(""); setVarLabelAr(""); setVarUnit(""); setVarOptions(""); setVarRequired(true);
  }

  function removeVariable(key: string) {
    setEditing(prev => prev ? { ...prev, variables: prev.variables.filter(v => v.key !== key) } : null);
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Procedure name is required."); return; }
    setSaving(true); setError("");

    const supabase = createClient();
    const payload = {
      clinic_id:    clinicId,
      name:         editing.name.trim(),
      name_ar:      editing.name_ar?.trim() || null,
      category:     editing.category,
      description:  editing.description?.trim() || null,
      variables:    editing.variables,
      duration_min: editing.duration_min,
      price:        editing.price ?? null,
      is_active:    editing.is_active,
      sort_order:   editing.sort_order,
    };

    if (isNew) {
      const { data, error: ie } = await supabase
        .from("technician_procedures").insert(payload).select("id").single();
      if (ie || !data) { setError(ie?.message ?? "Failed"); setSaving(false); return; }
      setProcs(prev => [...prev, { ...editing, id: data.id }]);
    } else {
      const { error: ue } = await supabase
        .from("technician_procedures").update(payload).eq("id", editing.id);
      if (ue) { setError(ue.message); setSaving(false); return; }
      setProcs(prev => prev.map(p => p.id === editing.id ? { ...editing } : p));
    }

    setSaving(false); setEditing(null);
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("technician_procedures").update({ is_active: active }).eq("id", id);
    setProcs(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
  }

  async function deleteProc(id: string) {
    if (!confirm("Delete this procedure?")) return;
    const supabase = createClient();
    await supabase.from("technician_procedures").delete().eq("id", id);
    setProcs(prev => prev.filter(p => p.id !== id));
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <div className="flex gap-6">
      {/* Left: procedure list */}
      <div className="w-72 flex-shrink-0 space-y-2">
        <button onClick={startNew}
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          + New Procedure
        </button>

        {procs.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
            No procedures yet
          </div>
        )}

        {[...new Set(procs.map(p => p.category))].map(cat => (
          <div key={cat}>
            <p className="px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{cat}</p>
            {procs.filter(p => p.category === cat).map(p => (
              <div key={p.id}
                onClick={() => startEdit(p)}
                className={`cursor-pointer rounded-lg border p-3 mb-1 ${
                  editing?.id === p.id
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${!p.is_active ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                    {p.name}
                  </p>
                  {p.price && <span className="text-xs text-neutral-500 font-mono">{p.price} JOD</span>}
                </div>
                <div className="mt-0.5 flex gap-2 text-[10px] text-neutral-400">
                  <span>{p.variables?.length ?? 0} variables</span>
                  <span>·</span>
                  <span>{p.duration_min} min</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Right: editor */}
      {editing ? (
        <div className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">{isNew ? "New Procedure" : "Edit Procedure"}</h2>
            <button onClick={() => setEditing(null)} className="text-neutral-400 hover:text-neutral-600 text-lg">✕</button>
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Name (EN) *</label>
              <input value={editing.name} onChange={e => setEditing({...editing, name:e.target.value})} placeholder="e.g. ECG" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Name (AR)</label>
              <input value={editing.name_ar ?? ""} onChange={e => setEditing({...editing, name_ar:e.target.value})} placeholder="رسم القلب" dir="rtl" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Category</label>
              <select value={editing.category} onChange={e => setEditing({...editing, category:e.target.value})} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Duration (minutes)</label>
              <input type="number" min="5" value={editing.duration_min} onChange={e => setEditing({...editing, duration_min:parseInt(e.target.value)||30})} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Procedure Fee (JOD)</label>
              <input type="number" min="0" step="0.01" value={editing.price ?? ""} onChange={e => setEditing({...editing, price: e.target.value ? parseFloat(e.target.value) : null})} placeholder="e.g. 25.00" className={inp} />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({...editing, is_active:e.target.checked})} className="h-4 w-4 rounded" />
                <span className="text-sm text-neutral-700">Active</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-500 uppercase tracking-wide">Description</label>
              <textarea value={editing.description ?? ""} onChange={e => setEditing({...editing, description:e.target.value})} rows={2} placeholder="Brief description of this procedure" className={`${inp} resize-none`} />
            </div>
          </div>

          {/* Variables */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Variables to Collect</h3>
            <p className="mb-3 text-xs text-neutral-500">Define what values the technician must enter when performing this procedure.</p>

            {/* Existing variables */}
            {editing.variables.length > 0 && (
              <div className="mb-4 space-y-2">
                {editing.variables.map((v, i) => (
                  <div key={v.key} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-neutral-800">{v.label}</span>
                      {v.label_ar && <span className="ml-2 text-xs text-neutral-400" dir="rtl">{v.label_ar}</span>}
                      <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-600 capitalize">{v.type}</span>
                      {v.unit && <span className="ml-1 text-xs text-neutral-400">({v.unit})</span>}
                      {v.required && <span className="ml-1 text-[10px] text-red-500">required</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {i > 0 && (
                        <button onClick={() => {
                          const vars = [...editing.variables];
                          [vars[i-1], vars[i]] = [vars[i], vars[i-1]];
                          setEditing({...editing, variables:vars});
                        }} className="text-neutral-400 hover:text-neutral-600 text-xs px-1">↑</button>
                      )}
                      <button onClick={() => removeVariable(v.key)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add variable form */}
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">+ Add Variable</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-neutral-500">Label (EN) *</label>
                  <input value={varLabel} onChange={e => setVarLabel(e.target.value)} placeholder="e.g. Heart Rate" className={inp} onKeyDown={e => e.key==="Enter" && addVariable()} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-neutral-500">Label (AR)</label>
                  <input value={varLabelAr} onChange={e => setVarLabelAr(e.target.value)} placeholder="معدل ضربات القلب" dir="rtl" className={inp} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-neutral-500">Type</label>
                  <select value={varType} onChange={e => setVarType(e.target.value as Variable["type"])} className={inp}>
                    {VAR_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-neutral-500">Unit (optional)</label>
                  <input value={varUnit} onChange={e => setVarUnit(e.target.value)} placeholder="bpm, mmHg, mg/dL..." className={inp} />
                </div>
                {varType === "select" && (
                  <div>
                    <label className="mb-1 block text-[10px] text-neutral-500">Options (comma separated)</label>
                    <input value={varOptions} onChange={e => setVarOptions(e.target.value)} placeholder="Normal,Abnormal,Borderline" className={inp} />
                  </div>
                )}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={varRequired} onChange={e => setVarRequired(e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-xs text-neutral-700">Required</span>
                  </label>
                </div>
              </div>
              <button onClick={addVariable} disabled={!varLabel.trim()}
                className="rounded-md border border-neutral-400 px-4 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
                + Add Variable
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving}
              className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
              {saving ? "Saving..." : isNew ? "Create Procedure" : "Save Changes"}
            </button>
            {!isNew && (
              <button onClick={() => toggleActive(editing.id, !editing.is_active)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                {editing.is_active ? "Deactivate" : "Activate"}
              </button>
            )}
            {!isNew && (
              <button onClick={() => deleteProc(editing.id)}
                className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12">
          <div className="text-center">
            <div className="text-3xl mb-3">🔬</div>
            <p className="text-sm font-medium text-neutral-600">Select a procedure to edit</p>
            <p className="text-xs text-neutral-400 mt-1">or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
