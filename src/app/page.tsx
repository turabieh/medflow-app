import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export default async function RootPage() {
  // If request comes from the clinic's custom domain, show clinic page
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  if (host === "www.maalineurology.com" || host === "maalineurology.com") {
    redirect("/clinic/maali-neurology");
  }

  // Otherwise check auth and redirect to appropriate dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "secretary";

  if (role === "admin")      redirect("/admin/dashboard");
  if (role === "doctor")     redirect("/doctor/dashboard");
  if (role === "technician") redirect("/technician/dashboard");

  redirect("/secretary/dashboard");
}
