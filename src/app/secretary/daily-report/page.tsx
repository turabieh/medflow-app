import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DailyReportClient from "./daily-report-client";

export const dynamic = "force-dynamic";

export default async function DailyReportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users")
    .select("clinic_id, full_name").eq("id", user.id).single();
  const clinicId = profile?.clinic_id ?? "";

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  const targetDate = date ?? today;

  const { data: currSetting } = await supabase.from("clinic_settings")
    .select("value").eq("clinic_id", clinicId).eq("key","currency").maybeSingle();
  const currency = currSetting?.value ?? "JOD";

  // Fetch all confirmed payments for the day
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, appt_date, payment_method, payment_amount, visit_fee, insurance_claim_amount, patient_id, patients(full_name)")
    .eq("clinic_id", clinicId)
    .eq("payment_confirmed", true)
    .eq("appt_date", targetDate)
    .order("appt_date");

  // Fetch split payment details
  const apptIds = (appts ?? []).map(a => a.id);
  const { data: splitPayments } = apptIds.length ? await supabase
    .from("appointment_payments")
    .select("appointment_id, method, amount, reference_number")
    .in("appointment_id", apptIds) : { data: [] };

  // Fetch existing reconciliation for this date
  const { data: recon } = await supabase
    .from("daily_reconciliation")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("recon_date", targetDate)
    .maybeSingle();

  return (
    <DailyReportClient
      targetDate={targetDate}
      today={today}
      currency={currency}
      clinicId={clinicId}
      userName={profile?.full_name ?? ""}
      appts={(appts ?? []).map(a => ({
        id: a.id,
        patientName: (Array.isArray(a.patients)?a.patients[0]:a.patients as any)?.full_name ?? "—",
        method: a.payment_method ?? "cash",
        amount: a.payment_amount ?? 0,
        visitFee: a.visit_fee ?? 0,
        insuranceClaim: a.insurance_claim_amount ?? 0,
      }))}
      splitPayments={splitPayments ?? []}
      reconActualCash={recon?.actual_cash ?? null}
      reconNotes={recon?.notes ?? ""}
      reconConfirmedAt={recon?.confirmed_at ?? null}
    />
  );
}
