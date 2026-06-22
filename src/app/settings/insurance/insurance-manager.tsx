"use client";

import { useState } from "react";
import { addInsuranceCompany, toggleInsuranceCompanyActive } from "@/lib/actions/insurance";

interface Company {
  id: string;
  name: string;
  name_ar: string | null;
  portal_url: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_covered: boolean;
  is_active: boolean;
}

export function InsuranceManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isCovered, setIsCovered] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await addInsuranceCompany({
      name, portalUrl: portalUrl || undefined, phone: phone || undefined,
      email: email || undefined, notes: notes || undefined, isCovered,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not add company.");
      return;
    }

    setCompanies((prev) => [...prev, {
      id: crypto.randomUUID(), name: name.trim(), name_ar: null,
      portal_url: portalUrl || null, phone: phone || null, email: email || null,
      notes: notes || null, is_covered: isCovered, is_active: true,
    }].sort((a, b) => a.name.localeCompare(b.name)));

    setShowForm(false);
    setName(""); setPortalUrl(""); setPhone(""); setEmail(""); setNotes("");
  }

  async function handleToggle(id: string, current: boolean) {
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
    await toggleInsuranceCompanyActive(id, !current);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Companies</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-xs font-medium text-neutral-700 underline hover:text-neutral-900">
          {showForm ? "Cancel" : "+ Add company"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Company name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Insurance Company"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Portal / Website</label>
              <input type="url" value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. requires pre-auth for all procedures"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-700">
            <input type="checkbox" checked={isCovered} onChange={(e) => setIsCovered(e.target.checked)} />
            Clinic accepts this insurance
          </label>
          <button type="submit" disabled={loading}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {loading ? "Adding..." : "Add company"}
          </button>
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {companies.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No insurance companies added yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {companies.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className={`text-sm ${c.is_active ? "text-neutral-900" : "text-neutral-400 line-through"}`}>
                    {c.name} {!c.is_covered && <span className="text-xs text-red-500">(not covered)</span>}
                  </p>
                  {c.notes && <p className="text-xs text-neutral-500">{c.notes}</p>}
                </div>
                <button onClick={() => handleToggle(c.id, c.is_active)} className="text-xs text-neutral-500 underline hover:text-neutral-700">
                  {c.is_active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
