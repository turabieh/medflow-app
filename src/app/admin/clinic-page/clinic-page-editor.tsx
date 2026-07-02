"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type R = Record<string,unknown>;

const TABS = [
  { id:"general",      label:"🏥 General",    icon:"🏥" },
  { id:"hero",         label:"🖼 Hero",        icon:"🖼" },
  { id:"about",        label:"ℹ About",        icon:"ℹ" },
  { id:"services",     label:"⚕ Services",    icon:"⚕" },
  { id:"doctors",      label:"👨‍⚕️ Doctors",    icon:"👨‍⚕️" },
  { id:"social",       label:"📱 Social",      icon:"📱" },
  { id:"testimonials", label:"⭐ Reviews",     icon:"⭐" },
  { id:"seo",          label:"🔍 SEO",         icon:"🔍" },
];

export function ClinicPageEditor({ clinicId, clinic, page: initialPage, services: initialServices, doctors: initialDoctors, testimonials: initialTestimonials }: {
  clinicId: string;
  clinic: R;
  page: R | null;
  services: R[];
  doctors: R[];
  testimonials: R[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [page, setPage] = useState<R>(initialPage ?? { clinic_id: clinicId });
  const [services, setServices] = useState<R[]>(initialServices);
  const [doctors, setDoctors] = useState<R[]>(initialDoctors);
  const [testimonials, setTestimonials] = useState<R[]>(initialTestimonials);
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
      const { data } = await sb.from("clinic_services").insert({ ...s, clinic_id: clinicId }).select("id").single();
      if (data) setServices(prev => [...prev, { ...s, id: data.id }]);
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
      const { data } = await sb.from("clinic_doctors_public").insert({ ...d, clinic_id: clinicId }).select("id").single();
      if (data) setDoctors(prev => [...prev, { ...d, id: data.id }]);
    } else {
      await sb.from("clinic_doctors_public").update(d).eq("id", d.id as string);
      setDoctors(prev => prev.map(x => x.id === d.id ? d : x));
    }
  }

  async function deleteDoctor(id: string) {
    const sb = createClient();
    await sb.from("clinic_doctors_public").delete().eq("id", id);
    setDoctors(prev => prev.filter(d => d.id !== id));
  }

  async function saveTestimonial(t: R, isNew: boolean) {
    const sb = createClient();
    if (isNew) {
      const { data } = await sb.from("clinic_testimonials").insert({ ...t, clinic_id: clinicId }).select("id").single();
      if (data) setTestimonials(prev => [...prev, { ...t, id: data.id }]);
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
            <F lbl="Hero Background Image URL">
              <input value={String(page.hero_image_url ?? "")} onChange={e => set("hero_image_url", e.target.value)} className={inp} placeholder="https://..." />
            </F>
            {!!page.hero_image_url && (
              <img src={String(page.hero_image_url ?? "")} alt="Hero preview" className="mt-2 h-32 w-full rounded-lg object-cover" />
            )}
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
            <F lbl="About Section Image URL">
              <input value={String(page.about_image_url ?? "")} onChange={e => set("about_image_url", e.target.value)} className={inp} placeholder="https://... (clinic photo, team photo)" />
            </F>
            {!!page.about_image_url && (
              <img src={String(page.about_image_url ?? "")} alt="About preview" className="mt-2 h-40 w-full rounded-lg object-cover" />
            )}
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
  const inp = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";

  if (!open) return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {d.photo_url ? <img src={d.photo_url as string} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xl">👨‍⚕️</div>}
      <div className="flex-1"><p className="text-sm font-medium">{d.name_en as string || "(no name)"}</p><p className="text-xs text-neutral-400">{d.title_en as string}</p></div>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
      {onDelete && <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>}
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-900 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">{isNew ? "+ Add Doctor" : "Edit Doctor Profile"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (EN) *</label><input value={((d.name_en) as string) ?? ""} onChange={e => setD({...d, name_en: e.target.value})} className={inp} placeholder="Dr. Ahmad Hassan" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Name (AR)</label><input value={((d.name_ar) as string) ?? ""} onChange={e => setD({...d, name_ar: e.target.value})} className={inp} dir="rtl" placeholder="د. أحمد حسن" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (EN)</label><input value={((d.title_en) as string) ?? ""} onChange={e => setD({...d, title_en: e.target.value})} className={inp} placeholder="Consultant Neurologist" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Title (AR)</label><input value={((d.title_ar) as string) ?? ""} onChange={e => setD({...d, title_ar: e.target.value})} className={inp} dir="rtl" /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Specialty (EN)</label><input value={((d.specialty_en) as string) ?? ""} onChange={e => setD({...d, specialty_en: e.target.value})} className={inp} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Specialty (AR)</label><input value={((d.specialty_ar) as string) ?? ""} onChange={e => setD({...d, specialty_ar: e.target.value})} className={inp} dir="rtl" /></div>
      </div>
      {/* 5 Photo URLs */}
      <div className="space-y-2">
        <label className="mb-1 block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Photos (up to 5 — large professional photos)</label>
        {[0,1,2,3,4].map(i => {
          const urls = (d.photo_urls as string[]) ?? [];
          const val = urls[i] ?? "";
          return (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-[10px] text-neutral-400 w-4 flex-shrink-0">{i+1}</span>
              <input value={val} onChange={e => {
                const arr = [...((d.photo_urls as string[])??[])];
                arr[i] = e.target.value;
                setD({...d, photo_urls: arr, photo_url: arr[0]??""});
              }} className={inp} placeholder={i===0?"https://... (main photo)":"https://... (additional photo)"} />
              {val && <img src={val} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
            </div>
          );
        })}
      </div>
      {/* 5 YouTube Video IDs */}
      <div className="space-y-2">
        <label className="mb-1 block text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">YouTube Videos (up to 5 — paste full URL or video ID)</label>
        <p className="text-[10px] text-neutral-400">e.g. https://youtube.com/watch?v=ABC123 or just ABC123</p>
        {[0,1,2,3,4].map(i => {
          const ids = (d.youtube_ids as string[]) ?? [];
          const val = ids[i] ?? "";
          return (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-[10px] text-neutral-400 w-4 flex-shrink-0">{i+1}</span>
              <input value={val} onChange={e => {
                const raw = e.target.value.trim();
                const id = raw.match(/[?&]v=([^&#]+)/)?.[1] || raw.match(/youtu\.be\/([^?&#]+)/)?.[1] || raw.match(/embed\/([^?&#]+)/)?.[1] || raw.replace(/^https?:\/\//,"").replace(/^www\./,"").split(/[/?&#]/)[0] || raw;
                const arr = [...((d.youtube_ids as string[])??[])];
                arr[i] = id.length < 60 ? id : raw;
                setD({...d, youtube_ids: arr});
              }} className={inp} placeholder="Paste YouTube URL or video ID" />
              {val && <span className="text-[10px] text-emerald-600 flex-shrink-0 font-mono">{val.slice(0,12)}</span>}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-[10px] text-neutral-500">Bio (EN)</label><textarea value={((d.bio_en) as string) ?? ""} onChange={e => setD({...d, bio_en: e.target.value})} rows={3} className={`${inp} resize-none`} /></div>
        <div><label className="mb-1 block text-[10px] text-neutral-500">Bio (AR)</label><textarea value={((d.bio_ar) as string) ?? ""} onChange={e => setD({...d, bio_ar: e.target.value})} rows={3} className={`${inp} resize-none`} dir="rtl" /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onSave(d); setOpen(false); if(isNew) setD(init); }} className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs text-white font-semibold">Save</button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600">Cancel</button>
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
