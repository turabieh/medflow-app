// Server-side helper: allow admin OR user with specific permission
// Returns profile if authorized, redirects otherwise

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdminOrPermission(permission: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, clinic_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Admin always allowed
  if (profile.role === "admin") return profile;

  // Check explicit permission grant
  const { data: grant } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("clinic_id", profile.clinic_id)
    .eq("user_id", profile.id)
    .eq("permission", permission)
    .single();

  if (!grant) redirect("/secretary/dashboard");

  return profile;
}
