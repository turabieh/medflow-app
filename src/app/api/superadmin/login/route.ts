import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Use service role to access super_admins table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: admin } = await supabase
    .from("super_admins")
    .select("id, email, full_name, password_hash, is_active")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin || !admin.is_active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Update last login
  await supabase.from("super_admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  // Create session cookie
  const session = Buffer.from(JSON.stringify({
    id: admin.id,
    email: admin.email,
    name: admin.full_name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  })).toString("base64");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sa_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
