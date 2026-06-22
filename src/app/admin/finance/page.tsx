import { createClient } from "@/lib/supabase/server";
import { FinanceDashboard } from "@/components/admin/finance-dashboard";

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

  // Get currency setting
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

  // Fetch confirmed payments in range
  const { data: payments } = await supabase
    .from("appointments")
    .select("id, appt_date, payment_method, payment_amount, payment_confirmed_at, patient_id, users(full_name)")
    .eq("payment_confirmed", true)
    .gte("appt_date", fromDate)
    .lte("appt_date", toDate)
    .order("appt_date", { ascending: false });

  const patientIds = [...new Set((payments ?? []).map((p) => p.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const patientsById = Object.fromEntries((patients ?? []).map((p) => [p.id, p.full_name]));

  const totalIncome = (payments ?? []).reduce((sum, p) => sum + (p.payment_amount ?? 0), 0);
  const paymentCount = (payments ?? []).length;

  const paymentsWithNames = (payments ?? []).map((p) => ({
    ...p,
    patientName: patientsById[p.patient_id] ?? "Unknown",
    doctorName: Array.isArray(p.users) ? p.users[0]?.full_name : (p.users as { full_name: string } | null)?.full_name ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium text-neutral-900">💰 Finance &amp; Reports</h1>
      <FinanceDashboard
        currency={currency}
        fromDate={fromDate}
        toDate={toDate}
        totalIncome={totalIncome}
        paymentCount={paymentCount}
        payments={paymentsWithNames}
      />
    </div>
  );
}
