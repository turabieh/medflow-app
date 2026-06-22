import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "@/components/admin/staff-manager";

export async function AdminDashboard({ clinicId }: { clinicId: string }) {
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, role, email, specialty, is_active")
    .eq("clinic_id", clinicId)
    .order("role")
    .order("full_name");

  const { count: pendingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("is_archived", false);

  const { count: patientCount } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true });

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Total patients</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {patientCount ?? 0}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Pending requests</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {pendingCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Clinic settings
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/settings/symptoms"
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Symptoms checklist
          </Link>
          <Link
            href="/settings/schedules"
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Doctor schedules
          </Link>
          <Link
            href="/settings/insurance"
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Insurance companies
          </Link>
          <Link
            href="/settings/procedures"
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Procedures &amp; pricing
          </Link>
        </div>
      </div>

      <StaffManager initialStaff={staff ?? []} />
    </>
  );
}
