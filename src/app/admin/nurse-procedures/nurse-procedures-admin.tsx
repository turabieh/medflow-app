"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addNurseProcedure, toggleNurseProcedure, deleteNurseProcedure } from "@/lib/actions/nurse-procedures";

interface Procedure { id: string; name: string; name_ar: string | null; category: string; notes: string | null; is_active: boolean; }
interface Category { key: string; label: string; color: string; }

export function NurseProceduresAdmin({
  clinicId, procedures: initial, categories,
}: {
  clinicId: string;
  procedures: Procedure[];
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName]     = useState("");
  const [nameAr, setNameAr] = useState("");
  const [cat, setCat]       = useState("general");
  const [notes, setNotes]   = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const grouped = categories.map(c => ({
    ...c,
    items: initial.filter(p => p.category === c.key),
  })).filter(c => c.items.length > 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setError(null);
    const r = await addNurseProcedure({ clinicId, name, nameAr: nameAr || undefined, category: cat, notes: notes || undefined });
    setAdding(false);
    if (!r.success) { setError(r.error ?? "Failed."); return; }
    setName(""); setNameAr(""); setNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Add Nurse Procedure</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Procedure Name (EN) *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. IV Line Insertion"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">اسم الإجراء (AR)</label>
            <input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl"
              placeholder="مثال: تركيب كانيولا"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Category *</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Note</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional instruction for nurses"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={adding}
          className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {adding ? "Adding..." : "+ Add Procedure"}
        </button>
      </form>

      {/* Grouped list */}
      {initial.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          No procedures yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.key} className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${g.color}`}>{g.label}</span>
              </div>
              <ul className="divide-y divide-neutral-50">
                {g.items.map(p => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className={`text-sm font-medium ${!p.is_active ? "text-neutral-400 line-through" : "text-neutral-900"}`}>{p.name}</p>
                      {p.name_ar && <p className="text-xs text-neutral-400" dir="rtl">{p.name_ar}</p>}
                      {p.notes && <p className="text-xs text-neutral-400 mt-0.5 italic">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={async () => { await toggleNurseProcedure(p.id, !p.is_active); router.refresh(); }}
                        className={`rounded-md border px-2.5 py-1 text-xs ${p.is_active ? "border-neutral-300 text-neutral-500 hover:bg-neutral-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={async () => { if (confirm(`Delete "${p.name}"?`)) { await deleteNurseProcedure(p.id); router.refresh(); } }}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
