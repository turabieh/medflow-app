import { NextRequest, NextResponse } from "next/server";
import { getSASupabase } from "@/lib/superadmin-session";
import { cookies } from "next/headers";
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("sa_session")) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { clinicId, tierKey, status, monthlyPrice, currentPeriodEnd } = await req.json();
  const sb = getSASupabase();
  await sb.from("clinic_subscriptions").upsert({ clinic_id: clinicId, tier_key: tierKey, status, monthly_price: monthlyPrice, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() }, { onConflict: "clinic_id" });
  await sb.from("clinics").update({ tier: tierKey, is_active: !["suspended","cancelled"].includes(status) }).eq("id", clinicId);
  return NextResponse.json({ ok: true });
}
