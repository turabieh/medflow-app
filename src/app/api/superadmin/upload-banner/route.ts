import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSASession } from "@/lib/superadmin-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSASession();
    if (!session) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
    const { base64, mimeType } = await req.json();
    if (!base64) return NextResponse.json({ error:"No image" }, { status:400 });
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const filename = `login-banner-${Date.now()}.${ext}`;
    const buffer = Buffer.from(base64, "base64");
    const { error } = await sb.storage.from("clinic-assets").upload(`app/${filename}`, buffer, { contentType: mimeType??"image/jpeg", upsert:true });
    if (error) return NextResponse.json({ error:error.message }, { status:500 });
    const { data:{ publicUrl } } = sb.storage.from("clinic-assets").getPublicUrl(`app/${filename}`);
    return NextResponse.json({ url:publicUrl });
  } catch(e) {
    return NextResponse.json({ error:String(e) }, { status:500 });
  }
}
