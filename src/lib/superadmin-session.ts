import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface SASession { id: string; email: string; name: string; exp: number; }

export async function getSASession(): Promise<SASession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("sa_session")?.value;
  if (!raw) return null;
  try {
    const session = JSON.parse(Buffer.from(raw, "base64").toString()) as SASession;
    if (session.exp < Date.now()) return null;
    return session;
  } catch { return null; }
}

export async function requireSASession(): Promise<SASession> {
  const session = await getSASession();
  if (!session) redirect("/superadmin/login");
  return session;
}

// Service-role Supabase client for super admin (bypasses RLS)
export function getSASupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
