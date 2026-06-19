import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use on the server (server components, route handlers,
 * server actions). Reads the user's session from cookies so RLS policies
 * apply correctly — this client acts AS the logged-in user, not as admin.
 *
 * Must be created fresh on every request (cookies() is request-scoped).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore if you
            // have middleware refreshing sessions (we add that next).
          }
        },
      },
    }
  );
}
