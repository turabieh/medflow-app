"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffMember, deactivateStaffMember, reactivateStaffMember } from "@/lib/actions/staff";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  specialty: string | null;
  is_active: boolean;
}

export function StaffManager({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"doctor" | "secretary" | "nurse" | "admin">("secretary");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createStaffMember({
      fullName,
      email,
      password,
      role,
      specialty: role === "doctor" ? specialty : undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Could not create staff member.");
      return;
    }

    setShowForm(false);
    setFullName("");
    setEmail("");
    setPassword("");
    setSpecialty("");
    router.refresh();
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const action = isActive ? deactivateStaffMember : reactivateStaffMember;
    const result = await action(userId);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Staff</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
        >
          {showForm ? "Cancel" : "+ Add staff member"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="secretary">Secretary</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {role === "doctor" && (
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Specialty</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Neurology"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Email (used to log in)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">Temporary password</label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create staff member"}
          </button>
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {initialStaff.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No staff members yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {initialStaff.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className={`text-sm ${member.is_active ? "text-neutral-900" : "text-neutral-400"}`}>
                    {member.full_name}
                    {!member.is_active && <span className="ml-2 text-xs">(inactive)</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {member.role}
                    {member.specialty && ` · ${member.specialty}`}
                    {member.email && ` · ${member.email}`}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleActive(member.id, member.is_active)}
                  className="text-xs text-neutral-500 underline hover:text-neutral-700"
                >
                  {member.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
