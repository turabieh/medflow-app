import { NextRequest, NextResponse } from "next/server";
import { getSASupabase } from "@/lib/superadmin-session";
import { cookies } from "next/headers";
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("sa_session")) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { id, name, price_monthly, features, is_active } = await req.json();
  const sb = getSASupabase();
  await sb.from("subscription_tiers").update({ name, price_monthly, features, is_active }).eq("id", id);
  return NextResponse.json({ ok: true });
}
