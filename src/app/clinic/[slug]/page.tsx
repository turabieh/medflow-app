import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TemplateProfessional } from "./template-professional";
import { TemplateModern } from "./template-modern";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("name, name_ar").eq("slug", slug).single();
  const { data: page } = await supabase.from("clinic_page").select("seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, default_lang").eq("clinic_id",
    (await supabase.from("clinics").select("id").eq("slug", slug).single()).data?.id ?? ""
  ).single();

  return {
    title: page?.seo_title_en ?? clinic?.name ?? "Clinic",
    description: page?.seo_description_en ?? undefined,
    alternates: { languages: { ar: `?lang=ar`, en: `?lang=en` } },
  };
}

export default async function ClinicPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch clinic
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, name_ar, slug, logo_url, address, phone, email, currency")
    .eq("slug", slug)
    .single();

  if (!clinic) notFound();

  // Fetch all public page data in parallel
  const [
    { data: page },
    { data: services },
    { data: doctors },
    { data: testimonials },
  ] = await Promise.all([
    supabase.from("clinic_page").select("*").eq("clinic_id", clinic.id).single(),
    supabase.from("clinic_services").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
    supabase.from("clinic_doctors_public").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
    supabase.from("clinic_testimonials").select("*").eq("clinic_id", clinic.id).eq("is_active", true).order("sort_order"),
  ]);

  // Don't 404 if not published — just show the page (helps with previewing)
  const data = {
    clinic,
    page: page ?? {},
    services: services ?? [],
    doctors: doctors ?? [],
    testimonials: testimonials ?? [],
    slug,
  };

  const template = (page?.template ?? "professional") as string;

  if (template === "modern") return <TemplateModern {...data} />;
  return <TemplateProfessional {...data} />;
}
