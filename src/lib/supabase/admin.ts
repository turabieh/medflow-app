import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the service_role key — BYPASSES Row Level Security.
 *
 * Use ONLY for trusted server-side operations that must cross tenant
 * boundaries, such as:
 *   - Creating a new clinic during onboarding (Phase 4)
 *   - Toggling feature_flags based on subscription tier changes
 *   - Internal admin/super-admin tooling
 *
 * NEVER import this into a client component. NEVER expose
 * SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
