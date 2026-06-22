import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const clinicId = profile?.clinic_id ?? "";

  const [
    { count: patientCount },
    { count: pendingCount },
    { count: todayCount },
    { data: staff },
  ] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_archived", false),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appt_date", new Date().toISOString().split("T")[0]).neq("status", "pending"),
    supabase.from("users").select("id, full_name, role, is_active").eq("clinic_id", clinicId).order("role"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Admin Dashboard</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total patients", value: patientCount ?? 0, color: "text-blue-700" },
          { label: "Pending requests", value: pendingCount ?? 0, color: "text-amber-700" },
          { label: "Today's appointments", value: todayCount ?? 0, color: "text-emerald-700" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-700">Staff</h2>
          <Link href="/admin/settings/users" className="text-xs text-neutral-500 underline hover:text-neutral-700">
            Manage →
          </Link>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <ul className="divide-y divide-neutral-100">
            {(staff ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <p className={`text-sm ${s.is_active ? "text-neutral-900" : "text-neutral-400"}`}>
                  {s.full_name} <span className="text-xs text-neutral-400">· {s.role}</span>
                </p>
                {!s.is_active && <span className="text-xs text-red-500">Inactive</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/finance" className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50">
          <p className="text-sm font-medium text-neutral-900">💰 Finance & Reports</p>
          <p className="mt-1 text-xs text-neutral-500">Income, expenses, daily and monthly reports.</p>
        </Link>
        <Link href="/admin/settings/clinic" className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50">
          <p className="text-sm font-medium text-neutral-900">⚙ Clinic Settings</p>
          <p className="mt-1 text-xs text-neutral-500">Logo, currency, clinic info and more.</p>
        </Link>
      </div>
    </div>
  );
}
