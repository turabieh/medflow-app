import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in the browser (client components).
 * Uses the public anon key — safe to expose, since all access is
 * governed by Row Level Security policies tied to the logged-in user.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
