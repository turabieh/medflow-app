import { NextRequest, NextResponse } from "next/server";
import { getSASupabase } from "@/lib/superadmin-session";
import { cookies } from "next/headers";
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("sa_session")) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { clinicId, isActive } = await req.json();
  const sb = getSASupabase();
  await sb.from("clinics").update({ is_active: isActive }).eq("id", clinicId);
  await sb.from("clinic_subscriptions").update({ status: isActive ? "active" : "suspended", updated_at: new Date().toISOString() }).eq("clinic_id", clinicId);
  return NextResponse.json({ ok: true });
}
