"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = ["general","insurance","appointment","labs","pharmacy","billing","admin","other"];

interface Task { id: string; label: string; category: string; sort_order: number; is_active: boolean; }

export function ChatTasksAdmin({ clinicId, tasks: init }: { clinicId: string; tasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks]   = useState<Task[]>(init);
  const [label, setLabel]   = useState("");
  const [cat, setCat]       = useState("general");
  const [adding, setAdding] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true); setError(null);
    const supabase = createClient();
    const { data, error: ie } = await supabase
      .from("chat_quick_tasks")
      .insert({ clinic_id: clinicId, label: label.trim(), category: cat, sort_order: tasks.length })
      .select("id, label, category, sort_order, is_active").single();
    setAdding(false);
    if (ie || !data) { setError(ie?.message ?? "Failed"); return; }
    setTasks(prev => [...prev, data]);
    setLabel("");
    router.refresh();
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("chat_quick_tasks").update({ is_active: active }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  }

  async function deleteTask(id: string) {
    const supabase = createClient();
    await supabase.from("chat_quick_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const grouped = CATEGORIES.map(c => ({
    cat: c, items: tasks.filter(t => t.category === c)
  })).filter(g => g.items.length > 0);

  return (
    <div className="max-w-xl space-y-5">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Add form */}
      <form onSubmit={addTask} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">+ Add Quick Task</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-neutral-600">Task Label *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} required
              placeholder="e.g. Check insurance for patient"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm capitalize">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={adding}
          className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {adding ? "Adding..." : "+ Add Task"}
        </button>
      </form>

      {/* Task list grouped by category */}
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          No tasks yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.cat} className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
                <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 capitalize">{g.cat}</span>
              </div>
              <ul className="divide-y divide-neutral-50">
                {g.items.map(t => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <p className={`text-sm flex-1 ${!t.is_active ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                      {t.label}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggle(t.id, !t.is_active)}
                        className={`rounded-md border px-2.5 py-1 text-xs ${t.is_active ? "border-neutral-300 text-neutral-500 hover:bg-neutral-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
                        {t.is_active ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => deleteTask(t.id)}
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
