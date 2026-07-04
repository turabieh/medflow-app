"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageUploadButton } from "@/components/ui/image-upload-button";

type R = Record<string,unknown>;

const TABS = [
  { id:"general",      label:"🏥 General",    icon:"🏥" },
  { id:"hero",         label:"🖼 Hero",        icon:"🖼" },
  { id:"about",        label:"ℹ About",        icon:"ℹ" },
  { id:"services",     label:"⚕ Services",    icon:"⚕" },
  { id:"doctors",      label:"👨‍⚕️ Doctors",    icon:"👨‍⚕️" },
  { id:"social",       label:"📱 Social",      icon:"📱" },
  { id:"testimonials", label:"⭐ Reviews",     icon:"⭐" },
  { id:"sections",     label:"➕ Custom Sections", icon:"➕" },
  { id:"seo",          label:"🔍 SEO",         icon:"🔍" },
];

export function ClinicPageEditor({ clinicId, clinic, page: initialPage, services: initialServices, doctors: initialDoctors, testimonials: initialTestimonials, customSections: initialCustomSections }: {
  clinicId: string;
  clinic: R;
  page: R | null;
  services: R[];
  doctors: R[];
  testimonials: R[];
  customSections: R[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [page, setPage] = useState<R>(initialPage ?? { clinic_id: clinicId });
  const [services, setServices] = useState<R[]>(initialServices);
  const [doctors, setDoctors] = useState<R[]>(initialDoctors);
  const [testimonials, setTestimonials] = useState<R[]>(initialTestimonials);
  const [customSections, setCustomSections] = useState<R[]>(initialCustomSections ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, val: unknown) {
    setPage(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function savePage() {
    setSaving(true); setError(""); setSaved(false);
    const sb = createClient();
    const { error: e } = await sb.from("clinic_page").upsert({
      ...page, clinic_id: clinicId, updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id" });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSaved(true);
    router.refresh();
  }

  async function saveService(s: R, isNew: boolean) {
    const sb = createClient();
    if (isNew) {
      const { id: _sid, ...srest } = s as R & {id?: unknown}; void _sid;
      const { data, error } = await sb.from("clinic_services").insert({ ...srest, clinic_id: clinicId }).select("*").single();
      if (data) setServices(prev => [...prev, data as R]);
      else if (error) { alert("Save error: " + error.message); return; }
    } else {
      await sb.from("clinic_services").update(s).eq("id", s.id as string);
      setServices(prev => prev.map(x => x.id === s.id ? s : x));
    }
  }

  async function deleteService(id: string) {
    const sb = createClient();
    await sb.from("clinic_services").delete().eq("id", id);
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function saveDoctor(d: R, isNew: boolean) {
    const sb = createClient();
    if (isNew) {
      // Strip the fake "__new__" id before inserting
      const { id: _id, ...rest } = d;
      void _id;
      const { data, error } = await sb
        .from("clinic_doctors_public")
        .insert({ ...rest, clinic_id: clinicId })
        .select("*")
        .single();
      if (data) {
        setDoctors(prev => [...prev, data as R]);
      } else {
        console.error("saveDoctor insert error:", error?.message);
        alert("Could not save doctor: " + (error?.message ?? "Unknown error"));
      }
    } else {
      const { error } = await sb
        .from("clinic_doctors_public")
        .update(d)
        .eq("id", d.id as string);
      if (!error) {
        setDoctors(prev => prev.map(x => x.id === d.id ? { ...x, ...d } : x));
      } else {
        console.error("saveDoctor update error:", error.message);
        alert("Could not update doctor: " + error.message);
      }
    }
  }

  async function deleteDoctor(id: string) {
    const sb = createClient();
    await sb.from("clinic_doctors_public").delete().eq("id", id);
    setDoctors(prev => prev.filter(d => d.id !== id));
  }

  async function saveCustomSection(s: R, isNew: boolean) {
    const sb = createClient();
    if (isNew) {
      const { id: _id, ...rest } = s as R & { id?: unknown }; void _id;
      const { data, error } = await sb.from("clinic_custom_sections").insert({ ...rest, clinic_id: clinicId }).select("*").single();
      if (data) setCustomSections(prev => [...prev, data as R]);
      else if (error) alert("Save error: " + error.message);
    } else {
      const { error } = await sb.from("clinic_custom_sections").update(s).eq("id", s.id as string);
      if (!error) setCustomSections(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x));
      else alert("Update error: " + error.message);
    }
  }

  async function deleteCustomSection(id: string) {
    const sb = createClient();
    await sb.from("clinic_custom_sections").delete().eq("id", id);
    setCustomSections(prev => prev.filter(x => x.id !== id));
  }

  async function saveTestimonial(t: R, isNew: boolean) {
    const sb = createClient();
    if (isNew) {
      const { id: _tid, ...trest } = t; void _tid;
      const { data } = await sb.from("clinic_testimonials").insert({ ...trest, clinic_id: clinicId }).select("*").single();
      if (data) setTestimonials(prev => [...prev, data as R]);
    } else {
      await sb.from("clinic_testimonials").update(t).eq("id", t.id as string);
      setTestimonials(prev => prev.map(x => x.id === t.id ? t : x));
    }
  }

  const inp = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500";
  const ta  = `${inp} resize-none`;
  const lbl = "mb-1 block text-xs font-semibold text-neutral-600 uppercase tracking-wide";
  const row = "grid grid-cols-2 gap-4 mb-4";

  return (
    <div className="flex gap-6">
      {/* Tab sidebar */}
      <div className="w-44 flex-shrink-0">
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                tab === t.id ? "bg-neutral-900 text-white font-medium" : "text-neutral-600 hover:bg-neutral-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Publish toggle */}
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Status</p>
          <button onClick={() => set("is_published", !page.is_published)}
            className={`w-full rounded-md py-2 text-xs font-bold transition-colors ${
              page.is_published
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}>
            {page.is_published ? "✓ Published" : "○ Draft"}
          </button>
          <a href={`/clinic/${clinic.slug}`} target="_blank"
            className="mt-2 block text-center text-xs text-blue-600 hover:underline">
            Preview site →
          </a>
        </div>

        {/* Save */}
        <button onClick={savePage} disabled={saving}
          className="mt-3 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      {/* Editor panel */}
      <div className="flex-1 min-w-0">

        {/* ── GENERAL ── */}
        {tab === "general" && (
          <div className="space-y-4">
            <Section title="Clinic Identity">
              <div className={row}>
                <F lbl="Clinic Name (EN)" inp={<input value={page.hero_title_en as string ?? clinic.name as string ?? ""} onChange={e => set("hero_title_en", e.target.value)} className={inp} placeholder={clinic.name as string} />} />
                <F lbl="Clinic Name (AR)" inp={<input value={page.hero_title_ar as string ?? clinic.name_ar as string ?? ""} onChange={e => set("hero_title_ar", e.target.value)} className={inp} dir="rtl" placeholder={clinic.name_ar as string ?? ""} />} />
              </div>
              <div className={row}>
                <F lbl="Tagline (EN)" inp={<input value={String(page.tagline_en ?? "")} onChange={e => set("tagline_en", e.target.value)} className={inp} placeholder="Specialised Neurology Care" />} />
                <F lbl="Tagline (AR)" inp={<input value={String(page.tagline_ar ?? "")} onChange={e => set("tagline_ar", e.target.value)} className={inp} dir="rtl" placeholder="رعاية عصبية متخصصة" />} />
              </div>
              <div className={row}>
                <F lbl="Logo URL" inp={<input value={page.hero_image_url as string ?? clinic.logo_url as string ?? ""} onChange={e => set("hero_image_url", e.target.value)} className={inp} placeholder="https://..." />} />
                <F lbl="Template">
                  <select value={page.template as string ?? "professional"} onChange={e => set("template", e.target.value)} className={inp}>
                    <option value="professional">Professional (Navy + Gold)</option>
                    <option value="modern">Modern (Light + Indigo)</option>
                    <option value="minimal">Minimal (White + Black)</option>
                  </select>
                </F>
              </div>
              <div className={row}>
                <F lbl="Default Language">
                  <select value={page.default_lang as string ?? "ar"} onChange={e => set("default_lang", e.target.value)} className={inp}>
                    <option value="ar">Arabic (العربية)</option>
                    <option value="en">English</option>
                  </select>
                </F>
              </div>
              {/* Show/hide section titles toggle */}
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 mt-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Show Section Titles</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Show labels like "About Us", "Our Services", "Watch", "Book Appointment" on the page.
                    Off by default — sections are self-explanatory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => set("show_section_titles", !page.show_section_titles)}
                  className={`relative ml-4 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${page.show_section_titles ? "bg-neutral-900" : "bg-neutral-300"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${page.show_section_titles ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </Section>
            <Section title="Contact & Location">
              <div className={row}>
                <F lbl="Address (EN)" inp={<input value={page.address_en as string ?? clinic.address as string ?? ""} onChange={e => set("address_en", e.target.value)} className={inp} />} />
                <F lbl="Address (AR)" inp={<input value={String(page.address_ar ?? "")} onChange={e => set("address_ar", e.target.value)} className={inp} dir="rtl" />} />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <F lbl="Phone" inp={<input value={page.phone as string ?? clinic.phone as string ?? ""} onChange={e => set("phone", e.target.value)} className={inp} />} />
                <F lbl="WhatsApp" inp={<input value={String(page.whatsapp ?? "")} onChange={e => set("whatsapp", e.target.value)} className={inp} placeholder="+962..." />} />
                <F lbl="Email" inp={<input value={page.email as string ?? clinic.email as string ?? ""} onChange={e => set("email", e.target.value)} className={inp} />} />
              </div>
              <F lbl="Google Maps Embed URL">
                <input value={String(page.maps_url ?? "")} onChange={e => set("maps_url", e.target.value)} className={inp} placeholder="https://www.google.com/maps/embed?pb=..." />
              </F>
              <p className="mt-1 text-xs text-neutral-400">In Google Maps, click Share → Embed a map → Copy the src URL only</p>
              <div className={`${row} mt-3`}>
                <F lbl="Working Hours (EN)" inp={<input value={String(page.hours_en ?? "")} onChange={e => set("hours_en", e.target.value)} className={inp} placeholder="Sun–Thu 9am–5pm" />} />
                <F lbl="Working Hours (AR)" inp={<input value={String(page.hours_ar ?? "")} onChange={e => set("hours_ar", e.target.value)} className={inp} dir="rtl" placeholder="الأحد–الخميس ٩ص–٥م" />} />
              </div>
            </Section>
          </div>
        )}

        {/* ── HERO ── */}
        {tab === "hero" && (
          <Section title="Hero Section (Top of page)">
            <div className={row}>
              <F lbl="Main Headline (EN)" inp={<input value={String(page.hero_title_en ?? "")} onChange={e => set("hero_title_en", e.target.value)} className={inp} placeholder="Expert Neurological Care" />} />
              <F lbl="Main Headline (AR)" inp={<input value={String(page.hero_title_ar ?? "")} onChange={e => set("hero_title_ar", e.target.value)} className={inp} dir="rtl" placeholder="رعاية عصبية متخصصة" />} />
            </div>
            <div className={row}>
              <F lbl="Subtitle (EN)">
                <textarea value={String(page.hero_subtitle_en ?? "")} onChange={e => set("hero_subtitle_en", e.target.value)} rows={3} className={ta} placeholder="Your health is our priority..." />
              </F>
              <F lbl="Subtitle (AR)">
                <textarea value={String(page.hero_subtitle_ar ?? "")} onChange={e => set("hero_subtitle_ar", e.target.value)} rows={3} className={ta} dir="rtl" placeholder="صحتكم أولويتنا..." />
              </F>
            </div>
            <F lbl="Hero Background Image">
              <ImageUploadButton
                currentUrl={String(page.hero_image_url ?? "") || undefined}
                folder="hero"
                shape="landscape"
                label="Upload Hero Image"
                onUploaded={url => set("hero_image_url", url)}
              />
              <input value={String(page.hero_image_url ?? "")} onChange={e => set("hero_image_url", e.target.value)}
                className={`${inp} mt-2`} placeholder="or paste URL..." />
            </F>
          </Section>
        )}

        {/* ── ABOUT ── */}
        {tab === "about" && (
          <Section title="About Section">
            <div className={row}>
              <F lbl="About Text (EN)">
                <textarea value={String(page.about_en ?? "")} onChange={e => set("about_en", e.target.value)} rows={6} className={ta} placeholder="Write about your clinic..." />
              </F>
              <F lbl="About Text (AR)">
                <textarea value={String(page.about_ar ?? "")} onChange={e => set("about_ar", e.target.value)} rows={6} className={ta} dir="rtl" placeholder="اكتب عن عيادتك..." />
              </F>
            </div>
            <F lbl="About Section Image">
              <ImageUploadButton
                currentUrl={String(page.about_image_url ?? "") || undefined}
                folder="about"
                shape="portrait"
                label="Upload About Image"
                onUploaded={url => set("about_image_url", url)}
              />
              <input value={String(page.about_image_url ?? "")} onChange={e => set("about_image_url", e.target.value)}
                className={`${inp} mt-2`} placeholder="or paste URL..." />
            </F>
          </Section>
        )}

        {/* ── SERVICES ── */}
        {tab === "services" && (
          <div className="space-y-3">
            {services.map(s => (
              <ServiceCard key={s.id as string} service={s} onSave={d => saveService(d, false)} onDelete={() => deleteService(s.id as string)} />
            ))}
            <ServiceCard key="new" service={{ id:"__new__", clinic_id:clinicId, sort_order: services.length }} onSave={d => saveService(d, true)} isNew />
          </div>
        )}

        {/* ── DOCTORS ── */}
        {tab === "doctors" && (
          <div className="space-y-3">
            {doctors.map(d => (
              <DoctorCard key={d.id as string} doctor={d} onSave={dd => saveDoctor(dd, false)} onDelete={() => deleteDoctor(d.id as string)} />
            ))}
            <DoctorCard key="new" doctor={{ id:"__new__", clinic_id:clinicId, sort_order: doctors.length }} onSave={d => saveDoctor(d, true)} isNew />
          </div>
        )}

        {/* ── SOCIAL ── */}
        {tab === "social" && (
          <Section title="Social Media & YouTube">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key:"social_instagram", lbl:"Instagram URL", ph:"https://instagram.com/..." },
                { key:"social_facebook",  lbl:"Facebook URL",  ph:"https://facebook.com/..." },
                { key:"social_youtube",   lbl:"YouTube Channel URL", ph:"https://youtube.com/@..." },
                { key:"social_twitter",   lbl:"Twitter/X URL", ph:"https://x.com/..." },
                { key:"social_linkedin",  lbl:"LinkedIn URL",  ph:"https://linkedin.com/..." },
                { key:"social_tiktok",    lbl:"TikTok URL",    ph:"https://tiktok.com/@..." },
              ].map(f => (
                <F key={f.key} lbl={f.lbl}>
                  <input value={String(page[f.key] ?? "")} onChange={e => set(f.key, e.target.value)} className={inp} placeholder={f.ph} />
                </F>
              ))}
            </div>
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-800">YouTube Videos (up to 5 — appear randomly on the page)</h3>
              <p className="mb-3 text-xs text-neutral-400">Paste the full YouTube URL or just the video ID (e.g. dQw4w9WgXcQ)</p>
              <div className="space-y-2">
                {[0,1,2,3,4].map(i => {
                  const ids = (page.youtube_video_ids as string[]) ?? [];
                  const val = ids[i] ?? "";
                  const extractId = (raw: string) => {
                    const m = raw.match(/[?&]v=([^&#]+)/) || raw.match(/youtu\.be\/([^?&#]+)/) || raw.match(/embed\/([^?&#]+)/);
                    return m ? m[1] : raw.replace(/https?:\/\/[^/]*youtube[^/]*\/watch.*v=/,"").split(/[&#]/)[0] || raw;
                  };
                  return (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-neutral-400 w-4">{i+1}</span>
                      <input value={val} onChange={e => {
                        const raw = e.target.value.trim();
                        const id = raw.includes("youtube") || raw.includes("youtu.be") ? extractId(raw) : raw;
                        const arr = [...((page.youtube_video_ids as string[])??[])];
                        arr[i] = id;
                        set("youtube_video_ids", arr);
                        if (i===0) set("youtube_video_id", id);
                      }} className={inp} placeholder="https://youtube.com/watch?v=... or video ID" />
                      {val && <a href={`https://youtube.com/watch?v=${val}`} target="_blank" className="text-xs text-blue-500 hover:underline flex-shrink-0">▶ Preview</a>}
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ── TESTIMONIALS ── */}
        {tab === "sections" && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 mb-2">Add custom sections like "Success Stories", "Cases", "Our Equipment", etc. Each section appears between Reviews and the Booking form.</p>
            {customSections.map(s => (
              <CustomSectionCard key={s.id as string} section={s} onSave={d => saveCustomSection(d, false)} onDelete={() => deleteCustomSection(s.id as string)} />
            ))}
            <CustomSectionCard key="new" section={{ id: "__new__", clinic_id: clinicId, sort_order: customSections.length, image_side: "left" }} onSave={d => saveCustomSection(d, true)} isNew />
          </div>
        )}
        {tab === "testimonials" && (
          <div className="space-y-3">
            {testimonials.map(t => (
              <TestimonialCard key={t.id as string} t={t} onSave={d => saveTestimonial(d, false)} onDelete={async () => {
                const sb = createClient();
                await sb.from("clinic_testimonials").delete().eq("id", t.id as string);
                setTestimonials(prev => prev.filter(x => x.id !== t.id));
              }} />
            ))}
            <TestimonialCard key="new" t={{ id:"__new__", clinic_id:clinicId, rating:5, sort_order: testimonials.length }} onSave={d => saveTestimonial(d, true)} isNew />
          </div>
        )}

        {/* ── SEO ── */}
        {tab === "seo" && (
          <Section title="Search Engine Optimization">
            <div className={row}>
              <F lbl="Page Title (EN)" inp={<input value={String(page.seo_title_en ?? "")} onChange={e => set("seo_title_en", e.target.value)} className={inp} placeholder="Maali Neurology Clinic | Amman" />} />
              <F lbl="Page Title (AR)" inp={<input value={String(page.seo_title_ar ?? "")} onChange={e => set("seo_title_ar", e.target.value)} className={inp} dir="rtl" />} />
            </div>
            <div className={row}>
              <F lbl="Meta Description (EN)">
                <textarea value={String(page.seo_description_en ?? "")} onChange={e => set("seo_description_en", e.target.value)} rows={3} className={ta} placeholder="Leading neurology clinic in Amman..." maxLength={160} />
              </F>
              <F lbl="Meta Description (AR)">
                <textarea value={String(page.seo_description_ar ?? "")} onChange={e => set("seo_description_ar", e.target.value)} rows={3} className={ta} dir="rtl" maxLength={160} />
              </F>
            </div>
            <p className="text-xs text-neutral-400">Meta description should be under 160 characters. This appears in Google search results.</p>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

function F({ lbl, children, inp }: { lbl: string; children?: React.ReactNode; inp?: React.ReactNode })  {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-600 uppercase tracking-wide">{lbl}</label>
      {inp ?? children}
    </div>
  );
}

function CustomSectionCard({ section: init, onSave, onDelete, isNew }: { section: R; onSave: (d:R)=>void; onDelete?: ()=>void; isNew?: boolean }) {
  const [s, setS] = useState<R>(init);
  const [open, setOpen] = useState(isNew ?? false);
  const [saving, setSaving] = useState(false);
  const inp = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";
  const title = (s.title_en as string) || (s.title_ar as string) || "(untitled section)";

  if (!open) return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {s.image_url && <img src={s.image_url as string} alt="" className="h-10 w-14 rounded-lg object-cover flex-shrink-0" onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />}
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-neutral-400">{s.image_side === "none" ? "Text only" : `Image ${s.image_side}`}</p>
      </div>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
      {onDelete && <button onClick={onDelete} className="text-xs text-red-500 hover:underline ml-2">Delete</button>}
    </div>
  );

  async function handleSave() {
    setSaving(true);
    await onSave(s);
    setSaving(false);
    setOpen(false);
    if (isNew) setS(init);
  }

  return (
    <div className="rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">{isNew ? "➕ Add Custom Section" : "Edit Section"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (EN)</label>
          <input value={String(s.title_en ?? "")} onChange={e => setS({...s, title_en: e.target.value})} className={inp} placeholder="e.g. Success Stories" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (AR)</label>
          <input value={String(s.title_ar ?? "")} onChange={e => setS({...s, title_ar: e.target.value})} className={inp} dir="rtl" placeholder="مثال: قصص النجاح" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Content (EN)</label>
          <textarea value={String(s.body_en ?? "")} onChange={e => setS({...s, body_en: e.target.value})} rows={5} className={`${inp} resize-none`} placeholder="Write content in English..." /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Content (AR)</label>
          <textarea value={String(s.body_ar ?? "")} onChange={e => setS({...s, body_ar: e.target.value})} rows={5} className={`${inp} resize-none`} dir="rtl" placeholder="اكتب المحتوى بالعربية..." /></div>
      </div>
      <div>
        <label className="mb-2 block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Section Image (optional)</label>
        <ImageUploadButton currentUrl={String(s.image_url ?? "") || undefined} folder="sections" shape="landscape" label="Upload Image" onUploaded={url => setS({...s, image_url: url})} />
        <input value={String(s.image_url ?? "")} onChange={e => setS({...s, image_url: e.target.value})} className={`${inp} mt-2`} placeholder="or paste image URL..." />
      </div>
      <div>
        <label className="mb-2 block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Image Position</label>
        <div className="flex gap-2 flex-wrap">
          {([["left","◧ Image Left"],["right","◨ Image Right"],["top","⬆ Image Top"],["none","✎ Text Only"]] as const).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setS({...s, image_side: val})}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${s.image_side === val ? "bg-neutral-900 border-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-[10px] text-neutral-500">Sort order:</label>
        <input type="number" value={Number(s.sort_order ?? 0)} onChange={e => setS({...s, sort_order: parseInt(e.target.value)})} className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm" min={0} />
        <span className="text-[10px] text-neutral-400">(lower = appears first)</span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="rounded-md bg-neutral-900 px-5 py-1.5 text-xs text-white font-semibold disabled:opacity-60">
          {saving ? "Saving..." : isNew ? "Add Section" : "Save"}
        </button>
        <button onClick={() => { setOpen(false); if (isNew) setS(init); }} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">Cancel</button>
      </div>
    </div>
  );
}

function ServiceCard({ service: init, onSave, onDelete, isNew }: { service: R; onSave: (d:R)=>void; onDelete?: ()=>void; isNew?: boolean }) {
  const [s, setS] = useState<R>(init);
  const [open, setOpen] = useState(isNew ?? false);
  const inp = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";

  if (!open) return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xl">{s.icon as string ?? "⚕"}</span>
      <div className="flex-1"><p className="text-sm font-medium">{s.name_en as string || "(no name)"}</p><p className="text-xs text-neutral-400">{s.name_ar as string}</p></div>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
      {onDelete && <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>}
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">{isNew ? "+ Add Service" : "Edit Service"}</p>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Icon (emoji)</label><input value={((s.icon) as string) ?? ""} onChange={e => setS({...s, icon: e.target.value})} className={inp} placeholder="🧠" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (EN) *</label><input value={((s.name_en) as string) ?? ""} onChange={e => setS({...s, name_en: e.target.value})} className={inp} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (AR) *</label><input value={((s.name_ar) as string) ?? ""} onChange={e => setS({...s, name_ar: e.target.value})} className={inp} dir="rtl" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Description (EN)</label><textarea value={((s.description_en) as string) ?? ""} onChange={e => setS({...s, description_en: e.target.value})} rows={2} className={`${inp} resize-none`} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Description (AR)</label><textarea value={((s.description_ar) as string) ?? ""} onChange={e => setS({...s, description_ar: e.target.value})} rows={2} className={`${inp} resize-none`} dir="rtl" /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onSave(s); setOpen(false); if(isNew) setS(init); }}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs text-white font-semibold">Save</button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">Cancel</button>
      </div>
    </div>
  );
}

function DoctorCard({ doctor: init, onSave, onDelete, isNew }: { doctor: R; onSave: (d:R)=>void; onDelete?: ()=>void; isNew?: boolean }) {
  const [d, setD] = useState<R>(init);
  const [open, setOpen] = useState(isNew ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inp = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";

  // Get first non-empty photo for preview
  const previewPhoto = ((d.photo_urls as string[]) ?? []).find(Boolean) || (d.photo_url as string) || "";

  if (!open) return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {previewPhoto
        ? <img src={previewPhoto} alt="" className="h-10 w-10 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xl">👨‍⚕️</div>
      }
      <div className="flex-1">
        <p className="text-sm font-medium">{(d.name_en as string) || (d.name_ar as string) || "(no name)"}</p>
        <p className="text-xs text-neutral-400">{d.title_en as string}</p>
      </div>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
      {onDelete && <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>}
    </div>
  );

  async function handleSave() {
    if (!(d.name_en as string)?.trim() && !(d.name_ar as string)?.trim()) {
      alert("Please enter at least the doctor name."); return;
    }
    setSaving(true);
    // Clean photo_urls — remove empty strings
    const cleanPhotos = ((d.photo_urls as string[]) ?? []).filter(Boolean);
    const cleanYT     = ((d.youtube_ids as string[]) ?? []).filter(Boolean);
    const payload = {
      ...d,
      photo_urls:  cleanPhotos,
      youtube_ids: cleanYT,
      photo_url:   cleanPhotos[0] ?? (d.photo_url as string) ?? null,
    };
    await onSave(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (isNew) {
      // Reset form for next addition
      setD(init);
      setOpen(false);
    } else {
      setOpen(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">{isNew ? "+ Add Doctor" : "Edit Doctor Profile"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (EN) *</label><input value={String(d.name_en ?? "")} onChange={e => setD({...d, name_en: e.target.value})} className={inp} placeholder="Dr. Ahmad Hassan" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (AR)</label><input value={String(d.name_ar ?? "")} onChange={e => setD({...d, name_ar: e.target.value})} className={inp} dir="rtl" placeholder="د. أحمد حسن" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (EN)</label><input value={String(d.title_en ?? "")} onChange={e => setD({...d, title_en: e.target.value})} className={inp} placeholder="Consultant Neurologist" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (AR)</label><input value={String(d.title_ar ?? "")} onChange={e => setD({...d, title_ar: e.target.value})} className={inp} dir="rtl" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Specialty (EN)</label><input value={String(d.specialty_en ?? "")} onChange={e => setD({...d, specialty_en: e.target.value})} className={inp} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Specialty (AR)</label><input value={String(d.specialty_ar ?? "")} onChange={e => setD({...d, specialty_ar: e.target.value})} className={inp} dir="rtl" /></div>
      </div>

      {/* 5 Photos — upload or paste URL */}
      <div className="space-y-3">
        <label className="block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">
          Photos (up to 5)
        </label>
        <p className="text-[10px] text-neutral-400 -mt-2">First photo = main photo. Upload directly or paste a URL below.</p>
        {[0,1,2,3,4].map(i => {
          const urls = ((d.photo_urls as string[]) ?? []);
          const val  = urls[i] ?? "";
          return (
            <div key={i} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-[10px] font-semibold text-neutral-500 mb-2">Photo {i+1}{i===0?" (main)":""}</p>
              <ImageUploadButton
                currentUrl={val || undefined}
                folder="doctors"
                shape="portrait"
                label={`Upload Photo ${i+1}`}
                onUploaded={url => {
                  const arr = [...((d.photo_urls as string[]) ?? ["","","","",""])];
                  while (arr.length < 5) arr.push("");
                  arr[i] = url;
                  setD({...d, photo_urls: arr, photo_url: arr.filter(Boolean)[0] ?? ""});
                }}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-neutral-400">or paste URL:</span>
                <input
                  value={val}
                  onChange={e => {
                    const arr = [...((d.photo_urls as string[]) ?? ["","","","",""])];
                    while (arr.length < 5) arr.push("");
                    arr[i] = e.target.value;
                    setD({...d, photo_urls: arr, photo_url: arr.filter(Boolean)[0] ?? ""});
                  }}
                  className="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-400"
                  placeholder="https://..."
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5 YouTube Video IDs */}
      <div className="space-y-2">
        <label className="mb-1 block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">
          YouTube Videos (up to 5)
        </label>
        <p className="text-[10px] text-neutral-400">Paste full YouTube URL — ID extracted automatically</p>
        {[0,1,2,3,4].map(i => {
          const ids = ((d.youtube_ids as string[]) ?? []);
          const val = ids[i] ?? "";
          function extractId(raw: string): string {
            const m = raw.match(/[?&]v=([^&#]{6,15})/) || raw.match(/youtu\.be\/([^?&#]{6,15})/) || raw.match(/embed\/([^?&#]{6,15})/);
            return m ? m[1] : (raw.length >= 6 && raw.length <= 15 && !raw.includes("/") ? raw : raw);
          }
          return (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-[10px] text-neutral-400 w-4 flex-shrink-0">{i+1}</span>
              <input
                value={val}
                onChange={e => {
                  const raw = e.target.value.trim();
                  const id  = extractId(raw);
                  const arr = [...((d.youtube_ids as string[]) ?? ["","","","",""])];
                  while (arr.length < 5) arr.push("");
                  arr[i] = id;
                  setD({...d, youtube_ids: arr});
                }}
                className={inp}
                placeholder="https://youtube.com/watch?v=..."
              />
              {val && (
                <a href={`https://youtube.com/watch?v=${val}`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-blue-500 hover:underline flex-shrink-0 whitespace-nowrap">
                  ▶ Check
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Bio (EN)</label><textarea value={String(d.bio_en ?? "")} onChange={e => setD({...d, bio_en: e.target.value})} rows={3} className={`${inp} resize-none`} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Bio (AR)</label><textarea value={String(d.bio_ar ?? "")} onChange={e => setD({...d, bio_ar: e.target.value})} rows={3} className={`${inp} resize-none`} dir="rtl" /></div>
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={handleSave} disabled={saving}
          className="rounded-md bg-neutral-900 px-5 py-2 text-xs text-white font-semibold disabled:opacity-60">
          {saving ? "Saving..." : saved ? "✓ Saved" : isNew ? "Add Doctor" : "Save Changes"}
        </button>
        <button onClick={() => { setOpen(false); if (isNew) setD(init); }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">
          Cancel
        </button>
        {previewPhoto && (
          <img src={previewPhoto} alt="" className="h-8 w-8 rounded-full object-cover ml-auto border border-neutral-200"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>
    </div>
  );
}

function TestimonialCard({ t: init, onSave, onDelete, isNew }: { t: R; onSave: (d:R)=>void; onDelete?: ()=>void; isNew?: boolean }) {
  const [t, setT] = useState<R>(init);
  const [open, setOpen] = useState(isNew ?? false);
  const inp = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";

  if (!open) return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-amber-400">{"★".repeat(t.rating as number ?? 5)}</span>
      <div className="flex-1"><p className="text-sm font-medium">{t.patient_name_en as string || "(anonymous)"}</p><p className="text-xs text-neutral-400 truncate">{t.text_en as string}</p></div>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
      {onDelete && <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>}
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">{isNew ? "+ Add Review" : "Edit Review"}</p>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Patient Name (EN)</label><input value={((t.patient_name_en) as string) ?? ""} onChange={e => setT({...t, patient_name_en: e.target.value})} className={inp} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Patient Name (AR)</label><input value={((t.patient_name_ar) as string) ?? ""} onChange={e => setT({...t, patient_name_ar: e.target.value})} className={inp} dir="rtl" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Rating</label>
          <select value={t.rating as number ?? 5} onChange={e => setT({...t, rating: parseInt(e.target.value)})} className={inp}>
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{"★".repeat(n)} {n}/5</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Review (EN)</label><textarea value={((t.text_en) as string) ?? ""} onChange={e => setT({...t, text_en: e.target.value})} rows={3} className={`${inp} resize-none`} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Review (AR)</label><textarea value={((t.text_ar) as string) ?? ""} onChange={e => setT({...t, text_ar: e.target.value})} rows={3} className={`${inp} resize-none`} dir="rtl" /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onSave(t); setOpen(false); if(isNew) setT(init); }} className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs text-white font-semibold">Save</button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">Cancel</button>
      </div>
    </div>
  );
}
