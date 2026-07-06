import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSASession } from "@/lib/superadmin-session";

export async function POST(req: NextRequest) {
  const session = await getSASession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { base64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.base64) return NextResponse.json({ error: "No image" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ext = body.mimeType === "image/png" ? "png" : "jpg";
  const filename = `login-banner-${Date.now()}.${ext}`;
  const buffer = Buffer.from(body.base64, "base64");

  const { error } = await supabase.storage
    .from("clinic-assets")
    .upload(`app/${filename}`, buffer, { contentType: body.mimeType ?? "image/jpeg", upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("clinic-assets")
    .getPublicUrl(`app/${filename}`);

  return NextResponse.json({ url: publicUrl });
}
