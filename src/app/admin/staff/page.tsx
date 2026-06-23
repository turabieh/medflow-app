import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminStaffPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const fromDate = params.from ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const toDate = params.to ?? today.toISOString().split("T")[0];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, role, is_active")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .in("role", ["secretary", "nurse", "doctor"])
    .eq("is_active", true)
    .order("role").order("full_name");

  // Appointments created by each staff member
  const { data: apptsByCreator } = await supabase
    .from("appointments")
    .select("created_by, status")
    .eq("clinic_id", profile?.clinic_id ?? "")
    .gte("appt_date", fromDate)
    .lte("appt_date", toDate);

  // Build stats per staff member
  const stats = (staff ?? []).map((member) => {
    const myAppts = (apptsByCreator ?? []).filter(a => a.created_by === member.id);
    return {
      id: member.id,
      name: member.full_name,
      role: member.role,
      total: myAppts.length,
      finalized: myAppts.filter(a => a.status === "finalized").length,
      cancelled: myAppts.filter(a => a.status === "cancelled").length,
      noShow: myAppts.filter(a => a.status === "no_show").length,
    };
  }).sort((a, b) => b.total - a.total);

  // Clinic-wide totals
  const allAppts = apptsByCreator ?? [];
  const totals = {
    total: allAppts.length,
    finalized: allAppts.filter(a => a.status === "finalized").length,
    cancelled: allAppts.filter(a => a.status === "cancelled").length,
    noShow: allAppts.filter(a => a.status === "no_show").length,
  };

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Staff Performance</h1>

      {/* Date filter */}
      <form method="GET" className="mb-6 flex items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">From</label>
          <input type="date" name="from" defaultValue={fromDate}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">To</label>
          <input type="date" name="to" defaultValue={toDate}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Refresh
        </button>
      </form>

      {/* Clinic totals */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Total appointments", value: totals.total, color: "text-neutral-800" },
          { label: "Finalized", value: totals.finalized, color: "text-emerald-700" },
          { label: "Cancelled", value: totals.cancelled, color: "text-red-600" },
          { label: "No-show", value: totals.noShow, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="text-[10px] text-neutral-400">{fromDate} – {toDate}</p>
          </div>
        ))}
      </div>

      {/* Per-staff table */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-sm font-medium text-neutral-900">Appointments created by staff member</p>
          <p className="text-xs text-neutral-400 mt-0.5">Counts appointments where this staff member was the creator</p>
        </div>
        {stats.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500 text-center">No data for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Staff member</th>
                <th className="px-4 py-2 text-xs font-medium text-neutral-500">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Total</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Finalized</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Cancelled</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">No-show</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">Success rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {stats.map(s => {
                const rate = s.total > 0 ? Math.round((s.finalized / s.total) * 100) : null;
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-neutral-900">{s.name}</td>
                    <td className="px-4 py-3 text-xs capitalize text-neutral-500">{s.role}</td>
                    <td className="px-4 py-3 text-right font-semibold">{s.total}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{s.finalized}</td>
                    <td className="px-4 py-3 text-right text-red-600">{s.cancelled}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{s.noShow}</td>
                    <td className="px-4 py-3 text-right">
                      {rate !== null ? (
                        <span className={`font-medium ${rate >= 70 ? "text-emerald-700" : rate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {rate}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
