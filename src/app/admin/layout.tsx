import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebarNav } from "@/components/admin/layout/sidebar";
import { SecretarySidebar } from "@/components/secretary/layout/sidebar";
import { FloatingChatButton } from "@/components/chat/floating-chat-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role, clinic_id, clinics(name, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch permissions for this user
  const { data: grants } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("clinic_id", profile.clinic_id)
    .eq("user_id", profile.id);
  const grantedPermissions = (grants ?? []).map((g: { permission: string }) => g.permission);

  // Allow admin, OR any user with at least one permission grant
  if (profile.role !== "admin") {
    if (grantedPermissions.length === 0) redirect("/secretary/dashboard");
  }

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;

  const [chatStaff, chatTasks] = await Promise.all([
    supabase.from("users").select("id, full_name, role")
      .eq("clinic_id", profile.clinic_id)
      .in("role", ["doctor","secretary"]).neq("id", profile.id)
      .eq("is_active", true).order("full_name")
      .then(r => r.data ?? []),
    supabase.from("chat_quick_tasks").select("id, label, category")
      .eq("clinic_id", profile.clinic_id).eq("is_active", true).order("sort_order")
      .then(r => r.data ?? []),
  ]);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {profile.role === "admin" ? (
        <AdminSidebarNav
          clinicName={clinic?.name ?? "Clinic"}
          userName={profile.full_name}
          logoUrl={(clinic as { logo_url?: string | null } | null)?.logo_url}
        />
      ) : (
        <SecretarySidebar
          clinicName={clinic?.name ?? "Clinic"}
          userName={profile.full_name}
          userRole={profile.role}
          logoUrl={(clinic as { logo_url?: string | null } | null)?.logo_url}
          grantedPermissions={grantedPermissions}
        />
      )}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      <FloatingChatButton
        userId={profile.id}
        clinicId={profile.clinic_id}
        staff={chatStaff as {id:string;full_name:string;role:string}[]}
        quickTasks={chatTasks as {id:string;label:string;category:string}[]}
        isDoctor={true}
      />
    </div>
  );
}
