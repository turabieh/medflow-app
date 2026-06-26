import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "@/components/admin/staff-manager";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, role, email, specialty, is_active, is_clinic_head")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .order("role").order("full_name");

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">User Management</h1>
      <StaffManager initialStaff={staff ?? []} />
    </div>
  );
}
