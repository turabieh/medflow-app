"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = ["general","insurance","appointment","labs","pharmacy","billing","admin","other"];

interface Task { id: string; label: string; category: string; sort_order: number; is_active: boolean; }

export function DoctorQuickTasks({ clinicId, tasks: init }: { clinicId: string; tasks: Task[] }) {
  const router  = useRouter();
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
    setTasks(prev => [...prev, data as Task]);
    setLabel("");
    router.refresh();
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("chat_quick_tasks").update({ is_active: active }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const supabase = createClient();
    await supabase.from("chat_quick_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const active   = tasks.filter(t =>  t.is_active);
  const inactive = tasks.filter(t => !t.is_active);

  return (
    <div className="max-w-lg space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Active tasks — quick view */}
      {active.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
            <p className="text-xs font-semibold text-neutral-600">Active Tasks ({active.length})</p>
          </div>
          <ul className="divide-y divide-neutral-50">
            {active.map(t => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 capitalize flex-shrink-0">{t.category}</span>
                  <span className="text-sm text-neutral-900 truncate">{t.label}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggle(t.id, false)}
                    className="rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-50">
                    Hide
                  </button>
                  <button onClick={() => deleteTask(t.id)}
                    className="rounded-md border border-red-100 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-50">
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hidden tasks */}
      {inactive.length > 0 && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-100">
            <p className="text-xs font-medium text-neutral-400">Hidden ({inactive.length})</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {inactive.map(t => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2 gap-3">
                <span className="text-xs text-neutral-400 line-through truncate">{t.label}</span>
                <button onClick={() => toggle(t.id, true)}
                  className="rounded-md border border-green-200 px-2 py-0.5 text-[11px] text-green-700 hover:bg-green-50 flex-shrink-0">
                  Show
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={addTask} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-neutral-700">+ Add New Task</p>
        <div className="flex gap-2">
          <input value={label} onChange={e => setLabel(e.target.value)} required
            placeholder="e.g. Check if blood results are ready"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs capitalize w-28">
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <button type="submit" disabled={adding || !label.trim()}
          className="w-full rounded-md bg-neutral-900 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {adding ? "Adding..." : "+ Add Task"}
        </button>
      </form>
    </div>
  );
}
