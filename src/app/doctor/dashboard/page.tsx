import { todayClinic } from "@/lib/clinic-timezone";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  const { tab = "overview", period = "month" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id").eq("id", user.id).single();

  const doctorId  = profile?.id ?? "";
  const clinicId  = profile?.clinic_id ?? "";
  const todayStr  = todayClinic();
  const now       = new Date();

  // Date range based on period
  const fromDate = period === "week"
    ? new Date(Date.now() - 7 * 24 * 3600 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Amman" })
    : period === "year"
    ? `${now.getFullYear()}-01-01`
    : new Date(Date.now()).toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }).slice(0,7) + "-01";

  // ── Today stats
  const { data: todayAppts } = await supabase
    .from("appointments").select("status, visit_type")
    .eq("doctor_id", doctorId).eq("appt_date", todayStr);

  const todayCounts = (todayAppts ?? []).reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Period outpatient stats
  const { data: periodAppts } = await supabase
    .from("appointments")
    .select("appt_date, status, visit_type, patient_id, patients(gender, dob)")
    .eq("doctor_id", doctorId)
    .gte("appt_date", fromDate)
    .lte("appt_date", todayStr)
    .in("status", ["finalized", "done", "with_doctor", "arrived"]);

  // ── Active inpatients
  const { data: activeInpatients } = await supabase
    .from("inpatients")
    .select("id, admission_date, location, hospital_patient_id, patients(id, full_name, full_name_ar, dob, gender, blood_type, phone), hospitals(name)")
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .order("admission_date", { ascending: false });

  // ── All inpatients (for stats)
  const { data: allInpatients } = await supabase
    .from("inpatients")
    .select("id, status, admission_date, discharge_date, patients(gender, dob)")
    .eq("doctor_id", doctorId)
    .eq("clinic_id", clinicId)
    .gte("admission_date", fromDate);

  // ── All outpatients list (for patient list tab)
  const { data: outpatientList } = await supabase
    .from("appointments")
    .select("id, appt_date, visit_type, status, patient_id, patients(id, full_name, full_name_ar, dob, gender, phone)")
    .eq("doctor_id", doctorId)
    .gte("appt_date", fromDate)
    .lte("appt_date", todayStr)
    .in("status", ["finalized", "done"])
    .order("appt_date", { ascending: false });

  // ── Compute stats
  const totalOutpatients = (periodAppts ?? []).length;
  const totalInpatients  = (allInpatients ?? []).length;
  const activeCount      = (activeInpatients ?? []).length;
  const dischargedCount  = (allInpatients ?? []).filter(i => i.status === "discharged").length;

  // Gender breakdown (outpatients)
  const outGender = { male: 0, female: 0, unknown: 0 };
  const uniqueOutPatients = new Map<string, { gender: string | null; dob: string | null }>();
  for (const a of periodAppts ?? []) {
    const pt = Array.isArray(a.patients) ? a.patients[0] : a.patients as { gender: string | null; dob: string | null } | null;
    if (a.patient_id && !uniqueOutPatients.has(a.patient_id)) {
      uniqueOutPatients.set(a.patient_id, { gender: pt?.gender ?? null, dob: pt?.dob ?? null });
    }
  }
  for (const pt of uniqueOutPatients.values()) {
    if (pt.gender === "male") outGender.male++;
    else if (pt.gender === "female") outGender.female++;
    else outGender.unknown++;
  }

  // Gender breakdown (inpatients)
  const inGender = { male: 0, female: 0, unknown: 0 };
  for (const ip of allInpatients ?? []) {
    const pt = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as { gender: string | null } | null;
    if (pt?.gender === "male") inGender.male++;
    else if (pt?.gender === "female") inGender.female++;
    else inGender.unknown++;
  }

  // Visit type breakdown
  const visitTypeCounts: Record<string, number> = {};
  for (const a of periodAppts ?? []) {
    visitTypeCounts[a.visit_type] = (visitTypeCounts[a.visit_type] ?? 0) + 1;
  }

  // Monthly breakdown (outpatients)
  const monthCounts: Record<string, number> = {};
  for (const a of periodAppts ?? []) {
    const m = a.appt_date?.slice(0, 7) ?? "";
    if (m) monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  }
  const monthEntries = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b)).slice(-6);

  const PERIOD_LABELS: Record<string, string> = { week: "This week", month: "This month", year: "This year" };

  const TABS = [
    { id: "overview",    label: "Overview" },
    { id: "outpatients", label: "Outpatients" },
    { id: "inpatients",  label: "Inpatients" },
  ];

  function age(dob: string | null) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  function StatCard({ label, value, sub, color = "text-neutral-800" }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs font-medium text-neutral-700 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">
            {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
          <p className="text-sm text-neutral-500">Dr. {profile?.full_name}</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1.5">
          {["week", "month", "year"].map(p => (
            <Link key={p} href={`/doctor/dashboard?tab=${tab}&period=${p}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                period === p ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}>
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* Today's quick stats */}
      <div className="mb-5 grid grid-cols-5 gap-3">
        {[
          { label: "Waiting",  value: todayCounts.arrived ?? 0,     color: "text-emerald-700" },
          { label: "With you", value: todayCounts.with_doctor ?? 0, color: "text-indigo-700" },
          { label: "Done",     value: todayCounts.done ?? 0,        color: "text-orange-700" },
          { label: "Today total", value: Object.values(todayCounts).reduce((s,v) => s+v, 0), color: "text-neutral-800" },
          { label: "Active inpatients", value: activeCount, color: "text-blue-700" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 border-b border-neutral-200">
        {TABS.map(t => (
          <Link key={t.id} href={`/doctor/dashboard?tab=${t.id}&period=${period}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Period stats grid */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Outpatient visits"  value={totalOutpatients}  sub={PERIOD_LABELS[period]} color="text-neutral-800" />
            <StatCard label="Unique outpatients" value={uniqueOutPatients.size} sub={PERIOD_LABELS[period]} />
            <StatCard label="Inpatient admissions" value={totalInpatients} sub={PERIOD_LABELS[period]} color="text-blue-700" />
            <StatCard label="Discharged" value={dischargedCount} sub={PERIOD_LABELS[period]} color="text-neutral-500" />
          </div>

          {/* Gender breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Outpatients by Gender</h3>
              {[
                { label: "Male",    count: outGender.male,    color: "bg-blue-400" },
                { label: "Female",  count: outGender.female,  color: "bg-pink-400" },
                { label: "Unknown", count: outGender.unknown, color: "bg-neutral-300" },
              ].map(g => {
                const total = outGender.male + outGender.female + outGender.unknown || 1;
                const pct = Math.round((g.count / total) * 100);
                return (
                  <div key={g.label} className="mb-2">
                    <div className="flex justify-between text-xs text-neutral-600 mb-1">
                      <span>{g.label}</span>
                      <span className="font-medium">{g.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div className={`h-2 rounded-full ${g.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Inpatients by Gender</h3>
              {[
                { label: "Male",    count: inGender.male,    color: "bg-blue-400" },
                { label: "Female",  count: inGender.female,  color: "bg-pink-400" },
                { label: "Unknown", count: inGender.unknown, color: "bg-neutral-300" },
              ].map(g => {
                const total = inGender.male + inGender.female + inGender.unknown || 1;
                const pct = Math.round((g.count / total) * 100);
                return (
                  <div key={g.label} className="mb-2">
                    <div className="flex justify-between text-xs text-neutral-600 mb-1">
                      <span>{g.label}</span>
                      <span className="font-medium">{g.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div className={`h-2 rounded-full ${g.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visit types + Monthly trend side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Visit Types</h3>
              {Object.entries(visitTypeCounts).length === 0 ? (
                <p className="text-xs text-neutral-400">No data for this period.</p>
              ) : (
                Object.entries(visitTypeCounts).map(([type, count]) => {
                  const pct = Math.round((count / totalOutpatients) * 100);
                  return (
                    <div key={type} className="mb-2">
                      <div className="flex justify-between text-xs text-neutral-600 mb-1">
                        <span className="capitalize">{type.replace("_", " ")}</span>
                        <span className="font-medium">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100">
                        <div className="h-2 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Monthly Trend</h3>
              {monthEntries.length === 0 ? (
                <p className="text-xs text-neutral-400">No data for this period.</p>
              ) : (
                <div className="flex items-end gap-2 h-28">
                  {monthEntries.map(([month, count]) => {
                    const max = Math.max(...monthEntries.map(([,c]) => c));
                    const h = Math.round((count / max) * 100);
                    const [y, m] = month.split("-");
                    return (
                      <div key={month} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[10px] font-medium text-neutral-700">{count}</span>
                        <div className="w-full rounded-sm bg-red-500" style={{ height: `${h}%`, minHeight: "4px" }} />
                        <span className="text-[9px] text-neutral-400">{MONTHS[parseInt(m)-1]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OUTPATIENTS TAB ── */}
      {tab === "outpatients" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {(outpatientList ?? []).length} outpatient visits · {PERIOD_LABELS[period]}
            </p>
          </div>
          {(!outpatientList || outpatientList.length === 0) ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-400">
              No outpatient visits for this period.
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Patient</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Date</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Type</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Age</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Gender</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">Phone</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {(outpatientList ?? []).map(a => {
                    const pt = Array.isArray(a.patients) ? a.patients[0] : a.patients as { id: string; full_name: string; full_name_ar: string | null; dob: string | null; gender: string | null; phone: string } | null;
                    const ptAge = age(pt?.dob ?? null);
                    return (
                      <tr key={a.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-neutral-900">{pt?.full_name}</p>
                          {pt?.full_name_ar && <p className="text-[10px] text-neutral-400" dir="rtl">{pt.full_name_ar}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-neutral-600">{a.appt_date}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-600 capitalize">{a.visit_type?.replace("_"," ")}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-600">{ptAge !== null ? `${ptAge}y` : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-neutral-600 capitalize">{pt?.gender ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-neutral-500">{pt?.phone}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/doctor/patients/${pt?.id}`}
                            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                            View file →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── INPATIENTS TAB ── */}
      {tab === "inpatients" && (
        <div className="space-y-4">
          {/* Active */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-blue-700">
              Active Admissions ({activeCount})
            </h3>
            {activeCount === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
                No active inpatients.
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-blue-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Patient</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Hospital</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Location</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">MRN</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Admitted</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Age</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Gender</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-blue-700">Phone</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {(activeInpatients ?? []).map(ip => {
                      const pt = Array.isArray(ip.patients) ? ip.patients[0] : ip.patients as { id: string; full_name: string; full_name_ar: string | null; dob: string | null; gender: string | null; blood_type: string | null; phone: string } | null;
                      const hosp = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as { name: string } | null;
                      const ptAge = age(pt?.dob ?? null);
                      return (
                        <tr key={ip.id} className="hover:bg-blue-50/30">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-neutral-900">{pt?.full_name}</p>
                            {pt?.blood_type && <span className="text-[10px] font-semibold text-red-500">{pt.blood_type}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-neutral-600">{hosp?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-neutral-600">{ip.location}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-neutral-500">{ip.hospital_patient_id || "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-neutral-600">{ip.admission_date}</td>
                          <td className="px-4 py-2.5 text-xs text-neutral-600">{ptAge !== null ? `${ptAge}y` : "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-neutral-600 capitalize">{pt?.gender ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-neutral-500">{pt?.phone}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <Link href={`/doctor/inpatients/${ip.id}`}
                              className="rounded-md border border-blue-300 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50 mr-1">
                              Admission →
                            </Link>
                            <Link href={`/doctor/patients/${pt?.id}`}
                              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
                              File →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Period inpatient stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total admissions" value={totalInpatients} sub={PERIOD_LABELS[period]} color="text-blue-700" />
            <StatCard label="Currently active" value={activeCount} color="text-green-700" />
            <StatCard label="Discharged" value={dischargedCount} sub={PERIOD_LABELS[period]} color="text-neutral-600" />
          </div>

          {/* Gender */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Gender Distribution — Inpatients ({PERIOD_LABELS[period]})</h3>
            <div className="flex gap-6">
              {[
                { label: "Male",    count: inGender.male,    color: "text-blue-700" },
                { label: "Female",  count: inGender.female,  color: "text-pink-600" },
                { label: "Unknown", count: inGender.unknown, color: "text-neutral-400" },
              ].map(g => (
                <div key={g.label} className="text-center">
                  <p className={`text-2xl font-bold ${g.color}`}>{g.count}</p>
                  <p className="text-xs text-neutral-500">{g.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
