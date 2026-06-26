import { NextRequest, NextResponse } from "next/server";
import { getSASupabase } from "@/lib/superadmin-session";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("sa_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clinic, admin, tierKey } = await req.json();

  if (!clinic.name || !clinic.slug || !admin.email || !admin.password || !admin.fullName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sb = getSASupabase();

  // 1. Create the clinic
  const { data: newClinic, error: clinicErr } = await sb
    .from("clinics")
    .insert({
      name:         clinic.name,
      name_ar:      clinic.nameAr || null,
      slug:         clinic.slug,
      email:        clinic.email || null,
      phone:        clinic.phone || null,
      address:      clinic.address || null,
      currency:     clinic.currency ?? "JOD",
      tier:         tierKey ?? "basic",
      is_active:    true,
    })
    .select("id").single();

  if (clinicErr || !newClinic) {
    return NextResponse.json({
      error: clinicErr?.message?.includes("slug")
        ? "This URL slug is already taken. Choose a different one."
        : (clinicErr?.message ?? "Failed to create clinic")
    }, { status: 400 });
  }

  const clinicId = newClinic.id;

  // 2. Create Supabase Auth user for the admin
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email:             admin.email,
    password:          admin.password,
    email_confirm:     true,  // auto-confirm so they can login immediately
    user_metadata:     { full_name: admin.fullName },
  });

  if (authErr || !authData.user) {
    // Rollback clinic
    await sb.from("clinics").delete().eq("id", clinicId);
    return NextResponse.json({
      error: authErr?.message?.includes("already registered")
        ? "This email is already registered in the system."
        : (authErr?.message ?? "Failed to create admin user")
    }, { status: 400 });
  }

  const userId = authData.user.id;

  // 3. Create the admin profile in users table
  const { error: profileErr } = await sb.from("users").insert({
    id:        userId,
    clinic_id: clinicId,
    full_name: admin.fullName,
    email:     admin.email,
    role:      "admin",
    is_active: true,
  });

  if (profileErr) {
    // Rollback both
    await sb.auth.admin.deleteUser(userId);
    await sb.from("clinics").delete().eq("id", clinicId);
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  // 4. Create subscription record
  const tierData = await sb.from("subscription_tiers")
    .select("price_monthly").eq("key", tierKey).single();
  const price = tierData.data?.price_monthly ?? 49;
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  await sb.from("clinic_subscriptions").insert({
    clinic_id:            clinicId,
    tier_key:             tierKey ?? "basic",
    status:               "trial",
    trial_ends_at:        nextMonth,
    current_period_start: today,
    current_period_end:   nextMonth,
    monthly_price:        price,
  });

  // 5. Log it
  await sb.from("clinic_activity_log").insert({
    clinic_id:  clinicId,
    action:     "created",
    details:    { admin_email: admin.email, tier: tierKey },
  });

  return NextResponse.json({ ok: true, clinicId });
}
