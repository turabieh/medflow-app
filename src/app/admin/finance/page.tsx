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

  type ClaimRow = { id: string; total_claimed: number; total_paid: number | null; status: string; is_followup: boolean | null; parent_claim_id: string | null };

  function computeClaimSummary(claims: ClaimRow[]) {
    // Treat null is_followup as false (original claim)
    const originals = claims.filter(c => !c.is_followup && !c.parent_claim_id);
    const followUps = claims.filter(c => c.is_followup || !!c.parent_claim_id);
    let outstanding = 0;
    let writtenOff  = 0;

    for (const orig of originals) {
      const origPaid  = orig.total_paid ?? 0;
      const linkedFUs = followUps.filter(fu => fu.parent_claim_id === orig.id);
      const fuPaid    = linkedFUs.reduce((s, fu) => s + (fu.total_paid ?? 0), 0);
      const totalPaid = origPaid + fuPaid;
      const gap       = Math.max(0, (orig.total_claimed ?? 0) - totalPaid);

      if (orig.status === "paid") {
        writtenOff += gap;
      } else {
        if (totalPaid >= (orig.total_claimed ?? 0)) {
          for (const fu of linkedFUs) {
            const fuGap = Math.max(0, (fu.total_claimed ?? 0) - (fu.total_paid ?? 0));
            if (fu.status === "paid") writtenOff  += fuGap;
            else                      outstanding += fuGap;
          }
        } else {
          outstanding += gap;
        }
      }
    }

    // Safety: if no originals found (old schema without is_followup column),
    // fall back to simple sum of all non-paid claims
    if (originals.length === 0 && claims.length > 0) {
      for (const c of claims) {
        const gap = Math.max(0, (c.total_claimed ?? 0) - (c.total_paid ?? 0));
        if (c.status === "paid") writtenOff += gap;
        else outstanding += gap;
      }
    }

    return { outstanding, writtenOff };
  }

  const hospSummary     = computeClaimSummary((allHospClaims ?? []) as ClaimRow[]);
  const insSummary      = computeClaimSummary((allInsClaims  ?? []) as ClaimRow[]);
  const hospOutstanding = hospSummary.outstanding;
  const insOutstanding  = insSummary.outstanding;
  const hospWrittenOff  = hospSummary.writtenOff;
  const insWrittenOff   = insSummary.writtenOff;

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

  // ── UNCLAIMED REVENUE ────────────────────────────────────────────────────
  // Get all appointment IDs already linked to an insurance claim
  const { data: claimedApptLinks } = await supabase
    .from("insurance_claim_appointments")
    .select("appointment_id, claim_id, insurance_claims(insurance_company_id)")
    .eq("insurance_claims.clinic_id", clinicId);

  const claimedApptIdSet = new Set((claimedApptLinks ?? []).map(l => l.appointment_id));

  // Get all insured patients
  const { data: insuredPatients } = await supabase
    .from("patients")
    .select("id, insurance_company_id, insurance_companies(id, name)")
    .eq("clinic_id", clinicId)
    .not("insurance_company_id", "is", null);

  type InsInfo = { id: string; name: string };
  const patientInsMap = new Map<string, InsInfo>();
  for (const p of insuredPatients ?? []) {
    const ins = Array.isArray(p.insurance_companies) ? p.insurance_companies[0] : p.insurance_companies as InsInfo | null;
    if (ins?.id) patientInsMap.set(p.id, ins);
  }
  const insuredPatientIds = Array.from(patientInsMap.keys());

  // All appointments for insured patients (any status)
  const { data: allInsPatientAppts } = insuredPatientIds.length ? await supabase
    .from("appointments")
    .select("id, appt_date, insurance_fee, patient_id, status")
    .eq("clinic_id", clinicId)
    .in("patient_id", insuredPatientIds) : { data: [] };

  const insAppts = (allInsPatientAppts ?? []).filter(a => ["finalized","done"].includes(a.status));

  // All outpatient procedures for this clinic
  const { data: allOutpatientProcs } = await supabase
    .from("outpatient_procedure_claims")
    .select("appointment_id, price, auth_status, clinic_id")
    .eq("clinic_id", clinicId)
    .neq("auth_status", "rejected");

  const apptIdsWithProcs = [...new Set((allOutpatientProcs ?? []).map(p => p.appointment_id))];

  // Fetch appointments that have procedures but might not be in insured patient list
  const extraApptIds = apptIdsWithProcs.filter(id => !(allInsPatientAppts ?? []).find(a => a.id === id));
  const { data: extraAppts } = extraApptIds.length ? await supabase
    .from("appointments")
    .select("id, appt_date, insurance_fee, patient_id, status, patients(id, insurance_company_id, insurance_companies(id, name))")
    .in("id", extraApptIds) : { data: [] };

  // Proc fee map
  const procFeeByAppt = new Map<string, number>();
  for (const p of allOutpatientProcs ?? []) {
    procFeeByAppt.set(p.appointment_id, (procFeeByAppt.get(p.appointment_id) ?? 0) + (p.price ?? 0));
  }

  // Insurance map — from insured patients list
  const apptInsMap = new Map<string, InsInfo>();
  for (const a of allInsPatientAppts ?? []) {
    const ins = patientInsMap.get(a.patient_id);
    if (ins) apptInsMap.set(a.id, ins);
  }
  // Also from extra appointments (proc-only)
  for (const a of extraAppts ?? []) {
    if (apptInsMap.has(a.id)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pt  = Array.isArray(a.patients) ? a.patients[0] : a.patients as any;
    const ins = pt?.insurance_companies ? (Array.isArray(pt.insurance_companies) ? pt.insurance_companies[0] : pt.insurance_companies) as InsInfo | null : null;
    if (ins?.id) apptInsMap.set(a.id, ins);
  }

  // All appointment dates
  const apptDateMap = new Map<string, { appt_date: string; insurance_fee: number | null }>();
  for (const a of allInsPatientAppts ?? []) apptDateMap.set(a.id, a);
  for (const a of extraAppts ?? []) { if (!apptDateMap.has(a.id)) apptDateMap.set(a.id, a); }

  // Build unclaimed — appointments with money that are NOT in claimedApptIdSet
  const allApptIds = new Set([...(allInsPatientAppts ?? []).map(a => a.id), ...apptIdsWithProcs]);
  const unclaimedInsMap = new Map<string, { id: string; name: string; amount: number; count: number; earliestDate: string; latestDate: string }>();

  for (const apptId of allApptIds) {
    if (claimedApptIdSet.has(apptId)) continue; // already in a claim

    const a   = apptDateMap.get(apptId);
    const ins = apptInsMap.get(apptId);
    if (!a || !ins || !a.appt_date) continue;

    const visitFee = a.insurance_fee ?? 0;
    const procFee  = procFeeByAppt.get(apptId) ?? 0;
    const total    = visitFee + procFee;
    if (total <= 0) continue;

    const entry = unclaimedInsMap.get(ins.id) ?? { id: ins.id, name: ins.name, amount: 0, count: 0, earliestDate: a.appt_date, latestDate: a.appt_date };
    entry.amount += total;
    entry.count++;
    if (a.appt_date < entry.earliestDate) entry.earliestDate = a.appt_date;
    if (a.appt_date > entry.latestDate)   entry.latestDate   = a.appt_date;
    unclaimedInsMap.set(ins.id, entry);
  }
  // Merge any duplicates by company name (safety net in case same company has different UUIDs)
  const mergedInsMap = new Map<string, { id: string; name: string; amount: number; count: number; earliestDate: string; latestDate: string }>();
  for (const entry of unclaimedInsMap.values()) {
    const key = entry.name.toLowerCase().trim();
    const existing = mergedInsMap.get(key);
    if (existing) {
      existing.amount += entry.amount;
      existing.count  += entry.count;
      if (entry.earliestDate < existing.earliestDate) existing.earliestDate = entry.earliestDate;
      if (entry.latestDate   > existing.latestDate)   existing.latestDate   = entry.latestDate;
    } else {
      mergedInsMap.set(key, { ...entry });
    }
  }
  const unclaimedInsurance = Array.from(mergedInsMap.values()).sort((a, b) => b.amount - a.amount);

  const debugData = {
    claimedApptIdSetSize: claimedApptIdSet.size,
    claimedApptIds: [...claimedApptIdSet].slice(0, 10),
    insuredPatientCount: insuredPatients?.length ?? 0,
    allInsPatientApptCount: allInsPatientAppts?.length ?? 0,
    insApptCount: insAppts.length,
    apptIdsWithProcsCount: apptIdsWithProcs.length,
    allOutpatientProcsCount: allOutpatientProcs?.length ?? 0,
    apptInsMapSize: apptInsMap.size,
    procApptDetails: apptIdsWithProcs.map(id => ({
      id,
      date: apptDateMap.get(id)?.appt_date,
      ins: apptInsMap.get(id),
      procFee: procFeeByAppt.get(id),
      isClaimed: claimedApptIdSet.has(id),
    })),
    unclaimedInsCount: unclaimedInsurance.length,
    unclaimedInsurance,
  };

    // Hospital: inpatient visits not yet in any claim
  const { data: allHospClaimsUnclaimed } = await supabase
    .from("hospital_claims")
    .select("hospital_id, from_date, to_date")
    .eq("clinic_id", clinicId)
    .eq("is_followup", false);

  const { data: inpatientsList } = await supabase
    .from("inpatients")
    .select("id, hospital_id, hospitals(id, name)")
    .eq("clinic_id", clinicId);

  const inpatientHospMap = new Map((inpatientsList ?? []).map(ip => [ip.id, ip]));

  const { data: hospVisits } = await supabase
    .from("visits")
    .select("id, visit_date, visit_fee, inpatient_id")
    .eq("visit_context", "inpatient")
    .in("status", ["done", "finalized"])
    .not("visit_fee", "is", null)
    .gt("visit_fee", 0);

  const unclaimedHospMap = new Map<string, { id: string; name: string; amount: number; count: number; earliestDate: string; latestDate: string }>();
  for (const v of hospVisits ?? []) {
    if (!v.inpatient_id || !v.visit_date) continue;
    const ip   = inpatientHospMap.get(v.inpatient_id);
    if (!ip?.hospital_id) continue;
    const hosp = Array.isArray(ip.hospitals) ? ip.hospitals[0] : ip.hospitals as { id: string; name: string } | null;
    if (!hosp) continue;
    const isClaimed = (allHospClaimsUnclaimed ?? []).some(c =>
      c.hospital_id === hosp.id &&
      v.visit_date >= c.from_date &&
      v.visit_date <= c.to_date
    );
    if (isClaimed) continue;
    const entry = unclaimedHospMap.get(hosp.id) ?? { id: hosp.id, name: hosp.name, amount: 0, count: 0, earliestDate: v.visit_date, latestDate: v.visit_date };
    entry.amount += v.visit_fee ?? 0;
    entry.count++;
    if (v.visit_date < entry.earliestDate) entry.earliestDate = v.visit_date;
    if (v.visit_date > entry.latestDate)   entry.latestDate   = v.visit_date;
    unclaimedHospMap.set(hosp.id, entry);
  }
  const unclaimedHospital = Array.from(unclaimedHospMap.values()).sort((a, b) => b.amount - a.amount);

  const totalUnclaimed = [...unclaimedInsurance, ...unclaimedHospital].reduce((s, x) => s + x.amount, 0);

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
        cashTotal={cashTotal}
        hospitalPaid={hospitalPaid}
        insurancePaid={insurancePaid}
        totalRevenue={totalRevenue}
        hospOutstanding={hospOutstanding}
        insOutstanding={insOutstanding}
        hospWrittenOff={hospWrittenOff}
        insWrittenOff={insWrittenOff}
        methodBreakdown={methodBreakdown}
        expenses={expenses ?? []}
        totalExpenses={totalExpenses}
        expByCategory={expByCategory}
        totalSalaries={totalSalaries}
        totalCosts={totalCosts}
        netProfit={netProfit}
        monthlyTrend={monthlyTrend}
        staff={staff ?? []}
        latestSalaries={Array.from(latestSalaryMap.values())}
        clinicId={clinicId}
        unclaimedInsurance={unclaimedInsurance}
        unclaimedHospital={unclaimedHospital}
        totalUnclaimed={totalUnclaimed}
        debugData={debugData}
      />
    </div>
  );
}
