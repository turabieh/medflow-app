import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FinanceDashboard } from "./finance-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; period?: string }>;
}) {
  const params = await searchParams;
  const tab    = params.tab    ?? "overview";
  const period = params.period ?? "month";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const clinicId = profile.clinic_id ?? "";
  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Date range
  let fromDate = params.from;
  let toDate   = params.to ?? todayStr;
  if (!fromDate) {
    if (period === "year")  fromDate = `${today.getFullYear()}-01-01`;
    else if (period === "week") fromDate = new Date(today.getTime() - 7 * 86400000).toISOString().split("T")[0];
    else fromDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`;
  }

  const { data: currSetting } = await supabase.from("clinic_settings").select("value")
    .eq("clinic_id", clinicId).eq("key", "currency").maybeSingle();
  const currency = currSetting?.value ?? "JOD";

  // ── REVENUE ──────────────────────────────────────────────────────────────
  // 1. Cash payments (outpatient)
  const { data: cashPayments } = await supabase
    .from("appointments")
    .select("appt_date, payment_amount, payment_method")
    .eq("clinic_id", clinicId)
    .eq("payment_confirmed", true)
    .gte("appt_date", fromDate).lte("appt_date", toDate);

  const cashTotal = (cashPayments ?? []).reduce((s, p) => s + (p.payment_amount ?? 0), 0);

  // 2. Hospital claim payments received
  const { data: hospitalClaims } = await supabase
    .from("hospital_claims")
    .select("from_date, to_date, total_claimed, total_paid, status, claim_number, is_followup, hospitals(name)")
    .eq("clinic_id", clinicId)
    .in("status", ["paid", "partial"])
    .gte("to_date", fromDate).lte("from_date", toDate);

  // Total paid = all payments received (original + follow-ups) within the period
  const hospitalPaid = (hospitalClaims ?? []).reduce((s, c) => s + (c.total_paid ?? 0), 0);

  // 3. Insurance claim payments received
  const { data: insuranceClaims } = await supabase
    .from("insurance_claims")
    .select("from_date, to_date, total_claimed, total_paid, status, claim_number, is_followup, insurance_companies(name)")
    .eq("clinic_id", clinicId)
    .in("status", ["paid", "partial"])
    .gte("to_date", fromDate).lte("from_date", toDate);

  const insurancePaid = (insuranceClaims ?? []).reduce((s, c) => s + (c.total_paid ?? 0), 0);

  // 4. Outstanding claims
  // Outstanding = original claimed − (original paid + all follow-up paid)
  const { data: allHospClaims } = await supabase
    .from("hospital_claims")
    .select("id, total_claimed, total_paid, status, is_followup, parent_claim_id")
    .eq("clinic_id", clinicId);

  const { data: allInsClaims } = await supabase
    .from("insurance_claims")
    .select("id, total_claimed, total_paid, status, is_followup, parent_claim_id")
    .eq("clinic_id", clinicId);

  function computeOutstanding(claims: { id: string; total_claimed: number; total_paid: number | null; status: string; is_followup: boolean; parent_claim_id: string | null }[]) {
    const originals = claims.filter(c => !c.is_followup);
    const followUps = claims.filter(c => c.is_followup);

    return originals.reduce((sum, orig) => {
      const origPaid = orig.total_paid ?? 0;
      // Sum all follow-up payments linked to this original
      const linkedFUs = followUps.filter(fu => fu.parent_claim_id === orig.id);
      const fuPaid    = linkedFUs.reduce((s, fu) => s + (fu.total_paid ?? 0), 0);
      // Outstanding on the original side
      const origOutstanding = Math.max(0, orig.total_claimed - origPaid - fuPaid);

      // Also add any outstanding on open follow-up claims
      // (follow-up was partially paid and still open)
      const fuOutstanding = linkedFUs.reduce((s, fu) => {
        if (fu.status === "paid") return s;
        return s + Math.max(0, (fu.total_claimed ?? 0) - (fu.total_paid ?? 0));
      }, 0);

      // If original is fully covered by origPaid + fuPaid, no outstanding
      // But if a follow-up is still partially paid, that remainder is outstanding
      const totalCovered = origPaid + fuPaid;
      if (totalCovered >= orig.total_claimed) {
        // Original fully paid — check if follow-up itself has uncollected balance
        return sum + fuOutstanding;
      }
      // Original not fully covered — outstanding is the gap
      return sum + origOutstanding;
    }, 0);
  }

  const hospOutstanding = computeOutstanding((allHospClaims ?? []) as { id: string; total_claimed: number; total_paid: number | null; status: string; is_followup: boolean; parent_claim_id: string | null }[]);
  const insOutstanding  = computeOutstanding((allInsClaims  ?? []) as { id: string; total_claimed: number; total_paid: number | null; status: string; is_followup: boolean; parent_claim_id: string | null }[]);

  const totalRevenue = cashTotal + hospitalPaid + insurancePaid;

  // ── EXPENSES ─────────────────────────────────────────────────────────────
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, category, description, amount, notes")
    .eq("clinic_id", clinicId)
    .gte("expense_date", fromDate).lte("expense_date", toDate)
    .order("expense_date", { ascending: false });

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);

  // Salary expenses for period (monthly salary × months in range)
  const { data: salaries } = await supabase
    .from("staff_salaries")
    .select("monthly_salary, effective_from, users(full_name, role)")
    .eq("clinic_id", clinicId)
    .lte("effective_from", toDate)
    .order("effective_from", { ascending: false });

  // Latest salary per user
  const latestSalaryMap = new Map<string, { name: string; role: string; salary: number }>();
  for (const s of salaries ?? []) {
    const u = Array.isArray(s.users) ? s.users[0] : s.users as { full_name: string; role: string } | null;
    if (!u) continue;
    const key = u.full_name;
    if (!latestSalaryMap.has(key)) latestSalaryMap.set(key, { name: u.full_name, role: u.role, salary: s.monthly_salary });
  }

  const from = new Date(fromDate);
  const to   = new Date(toDate);
  const months = Math.max(1, Math.round((to.getTime() - from.getTime()) / (30 * 86400000)));
  const totalSalaries = Array.from(latestSalaryMap.values()).reduce((s, v) => s + v.salary * months, 0);

  const totalCosts   = totalExpenses + totalSalaries;
  const netProfit    = totalRevenue - totalCosts;

  // ── By-category expense breakdown ────────────────────────────────────────
  const expByCategory: Record<string, number> = {};
  for (const e of expenses ?? []) {
    expByCategory[e.category] = (expByCategory[e.category] ?? 0) + e.amount;
  }

  // ── Monthly trend (last 12 months) ───────────────────────────────────────
  const { data: monthlyPayments } = await supabase
    .from("appointments").select("appt_date, payment_amount")
    .eq("clinic_id", clinicId).eq("payment_confirmed", true)
    .gte("appt_date", `${today.getFullYear()-1}-${String(today.getMonth()+1).padStart(2,"0")}-01`)
    .lte("appt_date", todayStr);

  const { data: monthlyExp } = await supabase
    .from("expenses").select("expense_date, amount")
    .eq("clinic_id", clinicId)
    .gte("expense_date", `${today.getFullYear()-1}-${String(today.getMonth()+1).padStart(2,"0")}-01`)
    .lte("expense_date", todayStr);

  const monthlyRevMap: Record<string, number> = {};
  const monthlyExpMap: Record<string, number> = {};
  for (const p of monthlyPayments ?? []) {
    const m = p.appt_date?.slice(0, 7) ?? "";
    if (m) monthlyRevMap[m] = (monthlyRevMap[m] ?? 0) + (p.payment_amount ?? 0);
  }
  for (const e of monthlyExp ?? []) {
    const m = e.expense_date?.slice(0, 7) ?? "";
    if (m) monthlyExpMap[m] = (monthlyExpMap[m] ?? 0) + (e.amount ?? 0);
  }
  const allMonths = [...new Set([...Object.keys(monthlyRevMap), ...Object.keys(monthlyExpMap)])].sort().slice(-12);
  const monthlyTrend = allMonths.map(m => ({
    month: m,
    revenue: monthlyRevMap[m] ?? 0,
    expenses: monthlyExpMap[m] ?? 0,
    profit: (monthlyRevMap[m] ?? 0) - (monthlyExpMap[m] ?? 0),
  }));

  // ── Staff for salary management ───────────────────────────────────────────
  const { data: staff } = await supabase
    .from("users").select("id, full_name, role")
    .eq("clinic_id", clinicId).in("role", ["doctor","secretary","admin"]).order("full_name");

  // ── Payment method breakdown ──────────────────────────────────────────────
  const methodBreakdown: Record<string, number> = {};
  for (const p of cashPayments ?? []) {
    const m = p.payment_method ?? "cash";
    methodBreakdown[m] = (methodBreakdown[m] ?? 0) + (p.payment_amount ?? 0);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Finance &amp; Reports</h1>
      <p className="mb-5 text-sm text-neutral-500">Full financial overview, expenses, and performance reports.</p>
      <FinanceDashboard
        currency={currency}
        fromDate={fromDate}
        toDate={toDate}
        period={period}
        tab={tab}
        // Revenue
        cashTotal={cashTotal}
        hospitalPaid={hospitalPaid}
        insurancePaid={insurancePaid}
        totalRevenue={totalRevenue}
        hospOutstanding={hospOutstanding}
        insOutstanding={insOutstanding}
        methodBreakdown={methodBreakdown}
        // Costs
        expenses={expenses ?? []}
        totalExpenses={totalExpenses}
        expByCategory={expByCategory}
        totalSalaries={totalSalaries}
        totalCosts={totalCosts}
        netProfit={netProfit}
        // Charts
        monthlyTrend={monthlyTrend}
        // Staff
        staff={staff ?? []}
        latestSalaries={Array.from(latestSalaryMap.values())}
        clinicId={clinicId}
      />
    </div>
  );
}
