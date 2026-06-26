import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { PermissionsManager } from "./permissions-manager";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: selectedUserId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  // All non-admin users in clinic (secretaries, nurses, doctors)
  const { data: staffList } = await supabase
    .from("users")
    .select("id, full_name, role, is_active")
    .eq("clinic_id", profile.clinic_id)
    .neq("role", "admin")
    .order("role").order("full_name");

  const staff = staffList ?? [];

  // If a user is selected, fetch their current grants
  let currentGrants: string[] = [];
  let selectedUser: { id: string; full_name: string; role: string } | null = null;

  if (selectedUserId) {
    selectedUser = staff.find(s => s.id === selectedUserId) ?? null;
    if (selectedUser) {
      const { data: grants } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("clinic_id", profile.clinic_id)
        .eq("user_id", selectedUserId);
      currentGrants = (grants ?? []).map(g => g.permission);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">User Permissions</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Grant or revoke access to specific pages and features for individual staff members.
      </p>
      <PermissionsManager
        staff={staff}
        selectedUserId={selectedUserId ?? null}
        selectedUser={selectedUser}
        currentGrants={currentGrants}
        permissions={PERMISSIONS}
        groups={PERMISSION_GROUPS}
        clinicId={profile.clinic_id}
        adminId={user.id}
      />
    </div>
  );
}
