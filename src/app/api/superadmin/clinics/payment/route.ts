import { NextRequest, NextResponse } from "next/server";
import { getSASupabase } from "@/lib/superadmin-session";
import { cookies } from "next/headers";
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("sa_session")) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { clinicId, amount, paymentDate, periodFrom, periodTo, method, reference, notes } = await req.json();
  const sb = getSASupabase();
  await sb.from("clinic_payments").insert({ clinic_id: clinicId, amount, payment_date: paymentDate, period_from: periodFrom, period_to: periodTo, method, reference: reference || null, notes: notes || null });
  await sb.from("clinic_subscriptions").update({ status: "active", current_period_end: periodTo, updated_at: new Date().toISOString() }).eq("clinic_id", clinicId);
  return NextResponse.json({ ok: true });
}
