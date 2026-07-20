"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ReportType {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export default function ReportTypesClient({
  clinicId, reportTypes: initial,
}: { clinicId: string; reportTypes: ReportType[] }) {
  const router = useRouter();
  const [types, setTypes]     = useState<ReportType[]>(initial);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const sb = createClient();

  async function addType() {
    if (!newName.trim()) { setError("Name is required."); return; }
    if (types.some(t => t.name.toLowerCase() === newName.trim().toLowerCase())) {
      setError("This report type already exists."); return;
    }
    setLoading(true); setError(null);
    const maxOrder = Math.max(...types.map(t => t.sort_order), 0);
    const { data, error: e } = await sb.from("report_types").insert({
      clinic_id: clinicId,
      name: newName.trim(),
      sort_order: maxOrder + 1,
      is_active: true,
    }).select().single();
    setLoading(false);
    if (e) { setError(e.message); return; }
    setTypes(prev => [...prev, data]);
    setNewName("");
    showSuccess("Report type added.");
  }

  async function toggleActive(type: ReportType) {
    const { error: e } = await sb.from("report_types")
      .update({ is_active: !type.is_active }).eq("id", type.id);
    if (!e) {
      setTypes(prev => prev.map(t => t.id === type.id ? {...t, is_active: !t.is_active} : t));
      showSuccess("Updated.");
    }
  }

  async function deleteType(type: ReportType) {
    if (!confirm(`Delete "${type.name}"?`)) return;
    const { error: e } = await sb.from("report_types").delete().eq("id", type.id);
    if (!e) {
      setTypes(prev => prev.filter(t => t.id !== type.id));
      showSuccess("Deleted.");
    }
  }

  async function moveUp(i: number) {
    if (i === 0) return;
    const updated = [...types];
    [updated[i-1], updated[i]] = [updated[i], updated[i-1]];
    updated.forEach((t, idx) => t.sort_order = idx + 1);
    setTypes(updated);
    await Promise.all(updated.map(t =>
      sb.from("report_types").update({ sort_order: t.sort_order }).eq("id", t.id)
    ));
  }

  async function moveDown(i: number) {
    if (i === types.length - 1) return;
    const updated = [...types];
    [updated[i], updated[i+1]] = [updated[i+1], updated[i]];
    updated.forEach((t, idx) => t.sort_order = idx + 1);
    setTypes(updated);
    await Promise.all(updated.map(t =>
      sb.from("report_types").update({ sort_order: t.sort_order }).eq("id", t.id)
    ));
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  }

  const inp = "rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Report Types</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage the report types available when uploading attachments in patient visits.
        </p>
      </div>

      {error   && <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</div>}

      {/* Add new */}
      <div className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addType()}
          placeholder="e.g. EMG, Sleep Study..."
          className={`flex-1 ${inp}`}
        />
        <button onClick={addType} disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          Add
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {types.length === 0 && (
          <p className="text-sm text-neutral-400 py-8 text-center">No report types yet.</p>
        )}
        {types.map((type, i) => (
          <div key={type.id}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
              type.is_active ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50"
            }`}>
            {/* Order buttons */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(i)} disabled={i===0}
                className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-20 leading-none">▲</button>
              <button onClick={() => moveDown(i)} disabled={i===types.length-1}
                className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-20 leading-none">▼</button>
            </div>

            <span className="text-xs text-neutral-400 w-5 text-center font-mono">{i+1}</span>

            <span className={`flex-1 text-sm font-medium ${type.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
              {type.name}
            </span>

            {/* Active toggle */}
            <button onClick={() => toggleActive(type)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                type.is_active
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}>
              {type.is_active ? "Active" : "Hidden"}
            </button>

            {/* Delete */}
            <button onClick={() => deleteType(type)}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Hidden types won&apos;t appear in the upload form. Reorder using ▲▼ arrows.
      </p>
    </div>
  );
}
