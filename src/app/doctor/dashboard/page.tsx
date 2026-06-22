import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id").eq("id", user.id).single();

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: stats } = await supabase
    .from("appointments")
    .select("status")
    .eq("doctor_id", profile?.id ?? "")
    .eq("appt_date", todayStr);

  const counts = (stats ?? []).reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-medium text-neutral-900">
        Today — {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
      </h1>

      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Waiting", value: counts.arrived ?? 0, color: "text-emerald-700" },
          { label: "With you", value: counts.with_doctor ?? 0, color: "text-indigo-700" },
          { label: "Done", value: counts.done ?? 0, color: "text-orange-700" },
          { label: "Total", value: Object.values(counts).reduce((s, v) => s + v, 0), color: "text-neutral-700" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center">
        <p className="text-sm text-neutral-500">
          Select a patient from the sidebar to open their visit.
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Patients appear here once the secretary marks them as arrived.
        </p>
      </div>
    </div>
  );
}
