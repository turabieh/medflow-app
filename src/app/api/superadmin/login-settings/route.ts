import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSASession } from "@/lib/superadmin-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSASession();
    if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
    const body = await req.json();
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const keys = ["login_banner_url","login_company_name","login_tagline","login_description","login_contact_email","login_contact_phone","login_website"];
    const rows = keys.filter(k=>body[k]!==undefined).map(k=>({key:k,value:String(body[k]),updated_at:new Date().toISOString()}));
    if (rows.length > 0) {
      const { error } = await sb.from("app_settings").upsert(rows, { onConflict:"key" });
      if (error) return NextResponse.json({ error:error.message }, { status:500 });
    }
    return NextResponse.json({ ok:true });
  } catch(e) {
    return NextResponse.json({ error:String(e) }, { status:500 });
  }
}
