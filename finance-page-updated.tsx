import { createClient } from "@/lib/supabase/server";
import { FinanceDashboard } from "@/components/admin/finance-dashboard";
import { CashPaymentsTab } from "@/components/admin/cash-payments-tab";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "dashboard";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("clinic_id").eq("id", user?.id ?? "").single();
  const clinicId = profile?.clinic_id ?? "";

  const { data: currencySetting } = await supabase
    .from("clinic_settings")
    .select("value")
    .eq("clinic_id", clinicId)
    .eq("key", "currency")
    .maybeSingle();
  const currency = currencySetting?.value ?? "JOD";

  const today = new Date();
  const fromDate = params.from ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const toDate = params.to ?? today.toISOString().split("T")[0];

  // ── Cash payments ──────────────────────────────────────────────────────────
  const { data: cashAppts } = await supabase
    .from("appointments")
    .select("id, appt_date, payment_amount, payment_method, payment_confirmed, payment_confirmed_at, patient_id, users!appointments_doctor_id_fkey(full_name)")
    .eq("clinic_id", clinicId)
    .eq("payment_method", "cash")
    .eq("payment_confirmed", true)
    .gte("appt_date", fromDate)
    .lte("appt_date", toDate)
    .order("appt_date", { ascending: false });

  const cashPatientIds = [...new Set((cashAppts ?? []).map(a => a.patient_id))];
  const { data: cashPatients } = cashPatientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", cashPatientIds)
    : { data: [] };
  const cashPtMap = Object.fromEntries((cashPatients ?? []).map(p => [p.id, p.full_name]));

  const cashPayments = (cashAppts ?? []).map(a => ({
    id: a.id,
    appt_date: a.appt_date,
    payment_amount: a.payment_amount,
    payment_method: a.payment_method,
    payment_confirmed: a.payment_confirmed,
    payment_confirmed_at: a.payment_confirmed_at,
    patientName: cashPtMap[a.patient_id] ?? "Unknown",
    doctorName: Array.isArray(a.users)
      ? (a.users[0] as { full_name: string })?.full_name ?? "—"
      : (a.users as { full_name: string } | null)?.full_name ?? "—",
  }));

  // ── All confirmed payments (for FinanceDashboard) ──────────────────────────
  const { data: payments } = await supabase
    .from("appointments")
    .select("id, appt_date, payment_method, payment_amount, payment_confirmed_at, patient_id, users!appointments_doctor_id_fkey(full_name)")
    .eq("clinic_id", clinicId)
    .eq("payment_confirmed", true)
    .gte("appt_date", fromDate)
    .lte("appt_date", toDate)
    .order("appt_date", { ascending: false });

  const patientIds = [...new Set((payments ?? []).map(p => p.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const patientsById = Object.fromEntries((patients ?? []).map(p => [p.id, p.full_name]));

  const totalIncome = (payments ?? []).reduce((sum, p) => sum + (p.payment_amount ?? 0), 0);
  const paymentCount = (payments ?? []).length;

  const paymentsWithNames = (payments ?? []).map(p => ({
    ...p,
    patientName: patientsById[p.patient_id] ?? "Unknown",
    doctorName: Array.isArray(p.users)
      ? (p.users[0] as { full_name: string })?.full_name ?? "—"
      : (p.users as { full_name: string } | null)?.full_name ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">💰 Finance & Reports</h1>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 border-b border-neutral-200">
        {[
          { id: "dashboard", label: "📊 Dashboard" },
          { id: "cash",      label: "💵 Cash Payments" },
          { id: "claims",    label: "📋 Claims" },
        ].map(t => (
          <a key={t.id} href={`?tab=${t.id}&from=${fromDate}&to=${toDate}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}>
            {t.label}
          </a>
        ))}
      </div>

      {/* Tab content */}
      {tab === "cash" ? (
        <CashPaymentsTab
          initialPayments={cashPayments}
          fromDate={fromDate}
          toDate={toDate}
          currency={currency}
          clinicId={clinicId}
        />
      ) : (
        <FinanceDashboard
          currency={currency}
          fromDate={fromDate}
          toDate={toDate}
          totalIncome={totalIncome}
          paymentCount={paymentCount}
          payments={paymentsWithNames}
        />
      )}
    </div>
  );
}
