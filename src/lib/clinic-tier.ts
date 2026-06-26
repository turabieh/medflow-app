// Clinic tier feature gating
// Called from layouts/pages to check what the clinic's subscription includes

import { createClient } from "@/lib/supabase/server";

// Feature keys that map to app functionality
export type ClinicFeature =
  | "appointments"
  | "patients"
  | "reports"
  | "secretary_access"
  | "insurance_claims"
  | "inpatients"
  | "finance"
  | "data_backup"
  | "permissions"
  | "ai_diagnosis"
  | "ai_notes";

interface ClinicTier {
  tierKey: string;
  tierName: string;
  features: ClinicFeature[];
  isActive: boolean;
}

// Cache per request — avoids duplicate DB calls in same render
const cache = new Map<string, ClinicTier>();

export async function getClinicTier(clinicId: string): Promise<ClinicTier> {
  if (cache.has(clinicId)) return cache.get(clinicId)!;

  const supabase = await createClient();

  // Try clinic_subscriptions first (most accurate)
  const { data: sub } = await supabase
    .from("clinic_subscriptions")
    .select("tier_key, status, subscription_tiers(name, features)")
    .eq("clinic_id", clinicId)
    .single();

  if (sub) {
    const tierData = Array.isArray(sub.subscription_tiers)
      ? sub.subscription_tiers[0]
      : sub.subscription_tiers as { name: string; features: string[] } | null;

    const result: ClinicTier = {
      tierKey:  sub.tier_key,
      tierName: tierData?.name ?? sub.tier_key,
      features: (tierData?.features ?? []) as ClinicFeature[],
      isActive: ["active", "trial"].includes(sub.status),
    };
    cache.set(clinicId, result);
    return result;
  }

  // Fallback: read from clinics.tier column
  const { data: clinic } = await supabase
    .from("clinics").select("tier, is_active").eq("id", clinicId).single();

  const fallback: ClinicTier = {
    tierKey:  clinic?.tier ?? "basic",
    tierName: clinic?.tier ?? "Basic",
    features: getDefaultFeaturesForTier(clinic?.tier ?? "basic"),
    isActive: clinic?.is_active ?? true,
  };
  cache.set(clinicId, fallback);
  return fallback;
}

export function hasFeature(tier: ClinicTier, feature: ClinicFeature): boolean {
  if (!tier.isActive) return false;
  return tier.features.includes(feature);
}

// Fallback feature sets if subscription_tiers table not yet seeded
function getDefaultFeaturesForTier(tier: string): ClinicFeature[] {
  switch (tier) {
    case "ai":
    case "enterprise":
      return ["appointments","patients","reports","secretary_access","insurance_claims","inpatients","finance","data_backup","permissions","ai_diagnosis","ai_notes"];
    case "professional":
      return ["appointments","patients","reports","secretary_access","insurance_claims","inpatients","finance","data_backup","permissions"];
    case "basic":
    default:
      return ["appointments","patients","reports","secretary_access"];
  }
}
