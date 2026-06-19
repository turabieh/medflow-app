import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // This query is governed by RLS — it will ONLY return the row for
  // this user's own clinic, proving tenant isolation works end to end.
  const { data: profile, error } = await supabase
    .from("users")
    .select("full_name, role, clinic_id, clinics(name, name_ar, tier)")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-medium">Could not load profile</p>
          <p className="mt-1 text-red-600">{error?.message ?? "No matching user row found."}</p>
        </div>
      </div>
    );
  }

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">Phase 0 verification</h1>
        <p className="mb-6 text-sm text-neutral-500">
          If you see real data below, the full chain works: Next.js → Supabase Auth → RLS → Postgres.
        </p>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Signed in as</dt>
            <dd className="font-medium text-neutral-900">{profile.full_name}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Role</dt>
            <dd className="font-medium text-neutral-900">{profile.role}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Clinic</dt>
            <dd className="font-medium text-neutral-900">{clinic?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Tier</dt>
            <dd className="font-medium capitalize text-neutral-900">{clinic?.tier ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
