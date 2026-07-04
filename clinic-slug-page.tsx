import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TemplateProfessional } from "./template-professional";
import { TemplateModern } from "./template-modern";

export const dynamic = "force-dynamic";

function publicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface Props { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sb = publicClient();
  const { data: clinic } = await sb.from("clinics").select("name, name_ar").eq("slug", slug).single();
  return { title: clinic?.name ?? "Clinic" };
}

export default async function ClinicPublicPage({ params }: Props) {
  const { slug } = await params;
  const sb = publicClient();

  const { data: clinic } = await sb
    .from("clinics")
    .select("id, name, name_ar, slug, logo_url, address, phone, email, currency")
    .eq("slug", slug)
    .single();

  if (!clinic) notFound();

  const [
    { data: page },
    { data: services },
    { data: doctors },
    { data: testimonials },
    { data: customSections },
  ] = await Promise.all([
    sb.from("clinic_page").select("*").eq("clinic_id", clinic.id).single(),
    sb.from("clinic_services").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
    sb.from("clinic_doctors_public").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
    sb.from("clinic_testimonials").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
    sb.from("clinic_custom_sections").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
  ]);

  const data = {
    clinic,
    page: page ?? {},
    services: services ?? [],
    doctors: doctors ?? [],
    testimonials: testimonials ?? [],
    customSections: customSections ?? [],
    slug,
  };

  const template = (page?.template ?? "professional") as string;
  if (template === "modern") return <TemplateModern {...data} />;
  return <TemplateProfessional {...data} />;
}
