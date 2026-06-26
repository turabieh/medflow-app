"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PermissionDef } from "@/lib/permissions";

const ROLE_COLOR: Record<string, string> = {
  doctor:    "bg-blue-100 text-blue-700",
  secretary: "bg-emerald-100 text-emerald-700",
  nurse:     "bg-purple-100 text-purple-700",
};

interface Staff { id: string; full_name: string; role: string; is_active: boolean; }

export function PermissionsManager({
  staff, selectedUserId, selectedUser, currentGrants,
  permissions, groups, clinicId, adminId,
}: {
  staff: Staff[];
  selectedUserId: string | null;
  selectedUser: { id: string; full_name: string; role: string } | null;
  currentGrants: string[];
  permissions: PermissionDef[];
  groups: string[];
  clinicId: string;
  adminId: string;
}) {
  const router = useRouter();
  const [grants, setGrants]   = useState<Set<string>>(new Set(currentGrants));
  const [saving, setSaving]   = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  const filteredStaff = staff.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.role.includes(search)
  );

  async function toggle(permKey: string, currentlyGranted: boolean) {
    if (!selectedUserId) return;
    setSaving(permKey);
    const supabase = createClient();

    if (currentlyGranted) {
      // Revoke
      await supabase.from("user_permissions")
        .delete()
        .eq("clinic_id", clinicId)
        .eq("user_id", selectedUserId)
        .eq("permission", permKey);
      setGrants(prev => { const n = new Set(prev); n.delete(permKey); return n; });
    } else {
      // Grant
      await supabase.from("user_permissions")
        .upsert({
          clinic_id:  clinicId,
          user_id:    selectedUserId,
          permission: permKey,
          granted_by: adminId,
        }, { onConflict: "clinic_id,user_id,permission" });
      setGrants(prev => new Set([...prev, permKey]));
    }
    setSaving(null);
  }

  async function grantAll(group: string) {
    if (!selectedUserId) return;
    const supabase = createClient();
    const permsInGroup = permissions.filter(p => p.group === group && !p.defaultRoles.includes(selectedUser?.role ?? ""));
    for (const p of permsInGroup) {
      await supabase.from("user_permissions").upsert({
        clinic_id: clinicId, user_id: selectedUserId, permission: p.key, granted_by: adminId,
      }, { onConflict: "clinic_id,user_id,permission" });
      setGrants(prev => new Set([...prev, p.key]));
    }
  }

  async function revokeAll(group: string) {
    if (!selectedUserId) return;
    const supabase = createClient();
    const permsInGroup = permissions.filter(p => p.group === group && !p.defaultRoles.includes(selectedUser?.role ?? ""));
    for (const p of permsInGroup) {
      await supabase.from("user_permissions").delete()
        .eq("clinic_id", clinicId).eq("user_id", selectedUserId).eq("permission", p.key);
      setGrants(prev => { const n = new Set(prev); n.delete(p.key); return n; });
    }
  }

  const grantCount = [...grants].filter(g =>
    !permissions.find(p => p.key === g)?.defaultRoles.includes(selectedUser?.role ?? "")
  ).length;

  return (
    <div className="flex gap-6" style={{ minHeight: "600px" }}>

      {/* ── Staff list ── */}
      <div className="w-56 flex-shrink-0">
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Staff Members</p>
          </div>
          <div className="p-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter..."
              className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400 mb-2" />
          </div>
          <ul className="pb-2">
            {filteredStaff.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => router.push(`/admin/permissions?userId=${s.id}`)}
                  className={`w-full px-3 py-2.5 text-left transition-colors ${
                    selectedUserId === s.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50 text-neutral-800"
                  }`}>
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-medium truncate ${!s.is_active ? "line-through opacity-50" : ""}`}>
                      {s.full_name}
                    </p>
                    {!s.is_active && <span className="text-[9px] text-neutral-400">off</span>}
                  </div>
                  <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${
                    selectedUserId === s.id ? "bg-white/20 text-white" : (ROLE_COLOR[s.role] ?? "bg-neutral-100 text-neutral-500")
                  }`}>
                    {s.role}
                  </span>
                </button>
              </li>
            ))}
            {filteredStaff.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-neutral-400">No staff found</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Permissions panel ── */}
      <div className="flex-1 min-w-0">
        {!selectedUser ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12">
            <div className="text-center">
              <div className="text-3xl mb-3">👆</div>
              <p className="text-sm font-medium text-neutral-600">Select a staff member</p>
              <p className="text-xs text-neutral-400 mt-1">Choose from the list to manage their permissions</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected user header */}
            <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-neutral-900">{selectedUser.full_name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${ROLE_COLOR[selectedUser.role] ?? "bg-neutral-100 text-neutral-500"}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {grantCount} extra permission{grantCount !== 1 ? "s" : ""} granted beyond default role access
                </p>
              </div>
            </div>

            {/* Permissions by group */}
            {groups.map(group => {
              const groupPerms = permissions.filter(p => p.group === group);
              const anyGrantable = groupPerms.some(p => !p.defaultRoles.includes(selectedUser.role));

              return (
                <div key={group} className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{group}</h3>
                    {anyGrantable && (
                      <div className="flex gap-2">
                        <button onClick={() => grantAll(group)}
                          className="text-[11px] text-blue-600 hover:underline font-medium">Grant all</button>
                        <span className="text-neutral-300">·</span>
                        <button onClick={() => revokeAll(group)}
                          className="text-[11px] text-red-500 hover:underline font-medium">Revoke all</button>
                      </div>
                    )}
                  </div>
                  <ul className="divide-y divide-neutral-50">
                    {groupPerms.map(perm => {
                      const isDefault  = perm.defaultRoles.includes(selectedUser.role);
                      const isGranted  = isDefault || grants.has(perm.key);
                      const isSaving   = saving === perm.key;

                      return (
                        <li key={perm.key} className={`flex items-center gap-4 px-5 py-3.5 ${isDefault ? "opacity-60" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-neutral-900">{perm.label}</p>
                              {isDefault && (
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 font-medium">
                                  Default for {selectedUser.role}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-neutral-400">{perm.description}</p>
                          </div>

                          {/* Toggle */}
                          <button
                            onClick={() => !isDefault && toggle(perm.key, grants.has(perm.key))}
                            disabled={isDefault || isSaving}
                            title={isDefault ? `Default access for ${selectedUser.role} role` : isGranted ? "Click to revoke" : "Click to grant"}
                            className={`relative flex-shrink-0 h-6 w-11 rounded-full transition-colors focus:outline-none ${
                              isDefault ? "cursor-default" :
                              isSaving  ? "opacity-50 cursor-wait" :
                              "cursor-pointer"
                            } ${isGranted ? "bg-neutral-900" : "bg-neutral-200"}`}>
                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              isGranted ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
