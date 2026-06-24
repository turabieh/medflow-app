"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addHospital, updateHospital, toggleHospital, deleteHospital } from "@/lib/actions/hospitals";

interface Hospital {
  id: string;
  name: string;
  address: string | null;
  primary_phone: string;
  secondary_phone: string | null;
  portal_link: string | null;
  is_active: boolean;
}

const EMPTY = { name: "", address: "", primary_phone: "", secondary_phone: "", portal_link: "" };

export function HospitalsManager({
  clinicId,
  hospitals: initial,
}: {
  clinicId: string;
  hospitals: Hospital[];
}) {
  const router = useRouter();
  const [hospitals, setHospitals] = useState(initial);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const result = await addHospital(clinicId, form);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setForm(EMPTY);
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true); setError(null);
    const result = await updateHospital(editId, editForm);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Failed."); return; }
    setEditId(null);
    router.refresh();
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleHospital(id, !active);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" permanently?`)) return;
    await deleteHospital(id);
    router.refresh();
  }

  function startEdit(h: Hospital) {
    setEditId(h.id);
    setEditForm({
      name: h.name,
      address: h.address ?? "",
      primary_phone: h.primary_phone,
      secondary_phone: h.secondary_phone ?? "",
      portal_link: h.portal_link ?? "",
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-neutral-900">Add Hospital</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Hospital Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Al-Khalidi Hospital"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Secondary Phone</label>
            <input value={form.secondary_phone} onChange={e => setForm(f => ({ ...f, secondary_phone: e.target.value }))}
              placeholder="+962 6 ..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="e.g. Amman, Jordan Gate"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Portal Link</label>
            <input type="url" value={form.portal_link} onChange={e => setForm(f => ({ ...f, portal_link: e.target.value }))}
              placeholder="https://hospital-portal.jo"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Primary Phone *</label>
            <input required value={form.primary_phone} onChange={e => setForm(f => ({ ...f, primary_phone: e.target.value }))}
              placeholder="+962 6 ..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full rounded-md bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
          {saving ? "Adding..." : "+ Add Hospital"}
        </button>
      </form>

      {/* Hospital list */}
      {hospitals.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-medium text-neutral-900">
              {hospitals.length} hospital{hospitals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {hospitals.map(h => (
              <li key={h.id} className="px-4 py-4">
                {editId === h.id ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-neutral-600">Name *</label>
                        <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-600">Secondary Phone</label>
                        <input value={editForm.secondary_phone} onChange={e => setEditForm(f => ({ ...f, secondary_phone: e.target.value }))}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-600">Address</label>
                        <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-600">Portal Link</label>
                        <input value={editForm.portal_link} onChange={e => setEditForm(f => ({ ...f, portal_link: e.target.value }))}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-600">Primary Phone *</label>
                        <input required value={editForm.primary_phone} onChange={e => setEditForm(f => ({ ...f, primary_phone: e.target.value }))}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving}
                        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditId(null)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{h.name}</p>
                        {!h.is_active && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">Inactive</span>
                        )}
                      </div>
                      {h.address && <p className="text-xs text-neutral-500 mt-0.5">📍 {h.address}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                        <span>📞 {h.primary_phone}</span>
                        {h.secondary_phone && <span>📞 {h.secondary_phone}</span>}
                        {h.portal_link && (
                          <a href={h.portal_link} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:underline">🌐 Portal</a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(h)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                        Edit
                      </button>
                      <button onClick={() => handleToggle(h.id, h.is_active)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                          h.is_active
                            ? "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                            : "border-green-300 text-green-700 hover:bg-green-50"
                        }`}>
                        {h.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(h.id, h.name)}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hospitals.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
          No hospitals added yet.
        </div>
      )}
    </div>
  );
}
