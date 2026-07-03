"use client";

import { useState } from "react";
import { submitBookingRequest } from "@/lib/actions/booking-request";

type R = Record<string, unknown>;
interface Props { clinic: R; page: R; services: R[]; doctors: R[]; testimonials: R[]; slug: string; }

function t(page: R, keyEn: string, keyAr: string, lang: string): string {
  return (lang === "ar" ? page[keyAr] as string : page[keyEn] as string) || (page[keyEn] as string) || (page[keyAr] as string) || "";
}

function BookingFormModern({ slug, lang }: { slug: string; lang: string }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [date, setDate] = useState(""); const [period, setPeriod] = useState<"morning"|"afternoon">("morning");
  const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false); const [err, setErr] = useState("");
  const ar = lang === "ar"; const dir = ar ? "rtl" : "ltr";
  const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" }); })();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr("");
    const r = await submitBookingRequest({ clinicSlug: slug, fullName: name, phone, preferredDate: date, period, notes: notes || undefined });
    setLoading(false);
    if (!r.success) { setErr(r.error ?? "Error"); return; }
    setDone(true);
  }

  const inp = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-sm";
  if (done) return (
    <div className="text-center py-10" dir={dir}>
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-3xl mb-4">✓</div>
      <h3 className="text-xl font-bold text-neutral-900 mb-2">{ar ? "تم إرسال طلبك!" : "Request Sent!"}</h3>
      <p className="text-neutral-500 text-sm">{ar ? "سنتصل بك لتأكيد الموعد" : "We'll call to confirm your appointment."}</p>
      <button onClick={() => { setDone(false); setName(""); setPhone(""); setDate(""); setNotes(""); }} className="mt-6 text-indigo-600 text-sm underline">{ar ? "حجز موعد آخر" : "Book another"}</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4" dir={dir}>
      {err && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
      <input required value={name} onChange={e => setName(e.target.value)} placeholder={ar ? "الاسم الكامل" : "Full name"} className={inp} />
      <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={ar ? "رقم الهاتف" : "Phone number"} className={inp} />
      <div className="relative">
        <input required type="date" min={minDate} value={date} onChange={e => setDate(e.target.value)} className={inp} style={date ? { color: "transparent" } : undefined} />
        {date && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-800">{date.split("-").reverse().join("/")}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["morning","afternoon"] as const).map(p => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`rounded-xl py-3 text-sm font-medium border transition ${period===p ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "border-neutral-200 text-neutral-600 hover:border-indigo-300"}`}>
            {ar ? (p==="morning" ? "صباحاً" : "مساءً") : (p==="morning" ? "Morning" : "Afternoon")}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={ar ? "ملاحظات (اختياري)" : "Notes (optional)"} className={`${inp} resize-none`} />
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-lg shadow-indigo-200 transition">
        {loading ? "..." : ar ? "إرسال الطلب ←" : "Submit Request →"}
      </button>
    </form>
  );
}

export function TemplateModern({ clinic, page, services, doctors, testimonials, slug }: Props) {
  const [lang, setLang] = useState((page.default_lang as string) ?? "ar");
  const ar = lang === "ar"; const dir = ar ? "rtl" : "ltr";
  const clinicName = t({ ...page, en: clinic.name, ar: clinic.name_ar }, "hero_title_en", "hero_title_ar", lang) || (ar ? clinic.name_ar as string : clinic.name as string) || "";
  const tagline  = t(page, "tagline_en",       "tagline_ar",       lang);
  const subtitle = t(page, "hero_subtitle_en", "hero_subtitle_ar", lang);
  const about    = t(page, "about_en",         "about_ar",         lang);
  const address  = t(page, "address_en",       "address_ar",       lang) || clinic.address as string || "";
  const hours    = t(page, "hours_en",         "hours_ar",         lang);
  const hasSocial = page.social_instagram || page.social_facebook || page.social_youtube || page.social_twitter;

  return (
    <div dir={dir} className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {!!clinic.logo_url && <img src={String(clinic.logo_url ?? "")} alt="" className="h-10 w-10 rounded-xl object-cover shadow" />}
            <div>
              <p className="text-base font-bold text-neutral-900">{clinicName}</p>
              {tagline && <p className="text-xs text-indigo-600">{tagline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden md:flex gap-5 text-sm text-neutral-500">
              {[{href:"#about",en:"About",ar:"عنّا"},{href:"#services",en:"Services",ar:"خدماتنا"},{href:"#doctors",en:"Doctors",ar:"الأطباء"},{href:"#contact",en:"Contact",ar:"تواصل"}]
                .filter(item => {
                  if (item.href==="#services" && services.length===0) return false;
                  if (item.href==="#doctors"  && doctors.length===0)  return false;
                  return true;
                }).map(item => <a key={item.href} href={item.href} className="hover:text-indigo-600 transition">{ar?item.ar:item.en}</a>)}
            </div>
            <button onClick={() => setLang(ar?"en":"ar")} className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-indigo-400 hover:text-indigo-600 transition">
              {ar?"EN":"عربي"}
            </button>
            <a href="#book" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-100">
              {ar?"احجز موعداً":"Book Now"}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero — split layout */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50/50 py-20 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08),_transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
                  {ar?"رعاية طبية متخصصة":"Specialized Medical Care"}
                </span>
              </div>
              <h1 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-900 md:text-5xl">{clinicName}</h1>
              {tagline && <p className="mb-4 text-lg font-medium text-indigo-600">{tagline}</p>}
              {subtitle && <p className="mb-8 text-neutral-500 leading-relaxed">{subtitle}</p>}
              <div className="flex flex-wrap gap-3">
                <a href="#book" className="rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">
                  {ar?"احجز موعداً الآن":"Book an Appointment"}
                </a>
                <a href="#about" className="rounded-xl border border-neutral-200 px-7 py-3.5 text-sm text-neutral-700 hover:border-indigo-300 transition">
                  {ar?"تعرّف علينا":"About Us"}
                </a>
              </div>
              {!!(page.phone || clinic.phone) && (
                <div className="mt-10 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">📞</div>
                  <div>
                    <p className="text-xs text-neutral-400">{ar?"اتصل بنا":"Call Us"}</p>
                    <a href={`tel:${page.phone || clinic.phone}`} className="text-base font-bold text-neutral-900 hover:text-indigo-600">
                      {page.phone as string || clinic.phone as string}
                    </a>
                  </div>
                </div>
              )}
            </div>
            {/* Image */}
            {!!page.hero_image_url ? (
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-indigo-100/50" />
                <img src={page.hero_image_url as string} alt="" className="relative rounded-2xl object-cover w-full h-96 shadow-2xl" />
              </div>
            ) : page.about_image_url ? (
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-indigo-100/50" />
                <img src={page.about_image_url as string} alt="" className="relative rounded-2xl object-cover w-full h-96 shadow-2xl" />
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center rounded-2xl bg-indigo-100">
                <span className="text-8xl opacity-30">🏥</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      {about && (
        <section id="about" className="py-20 bg-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"من نحن":"About"}</p>
            <h2 className="mb-6 text-3xl font-extrabold text-neutral-900">{ar?`مرحباً بكم في ${clinicName}`:`Welcome to ${clinicName}`}</h2>
            <p className="text-neutral-500 leading-relaxed text-lg whitespace-pre-line">{about}</p>
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section id="services" className="py-20 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"خدماتنا":"Services"}</p>
              <h2 className="text-3xl font-extrabold text-neutral-900">{ar?"ماذا نقدّم":"What We Offer"}</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(s => (
                <div key={s.id as string} className="group rounded-2xl bg-white p-6 shadow-sm border border-transparent hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl group-hover:bg-indigo-100 transition">{s.icon as string || "⚕"}</div>
                  <h3 className="mb-2 font-bold text-neutral-900">{ar?s.name_ar as string:s.name_en as string}</h3>
                  {!!(ar?s.description_ar:s.description_en) && <p className="text-sm text-neutral-500 leading-relaxed">{String(ar?s.description_ar??s.description_en:s.description_en??s.description_ar)}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Doctors */}
      {doctors.length > 0 && (
        <section id="doctors" className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"فريقنا":"Our Team"}</p>
              <h2 className="text-3xl font-extrabold text-neutral-900">{ar?"تعرّف على أطبائنا":"Meet Our Doctors"}</h2>
            </div>
            <div className={`grid gap-6 ${doctors.length===1?"max-w-xs mx-auto":doctors.length===2?"sm:grid-cols-2 max-w-xl mx-auto":"sm:grid-cols-2 lg:grid-cols-3"}`}>
              {doctors.map(doc => (
                <div key={doc.id as string} className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition">
                  <div className="h-60 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
                    {doc.photo_url ? <img src={String(doc.photo_url ?? "")} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full items-center justify-center text-5xl opacity-20">👨‍⚕️</div>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-neutral-900">{ar?(doc.name_ar as string||doc.name_en as string):doc.name_en as string}</h3>
                    <p className="text-sm text-indigo-600 font-medium mt-1">{ar?(doc.title_ar as string||doc.title_en as string):doc.title_en as string}</p>
                    {!!(ar?doc.bio_ar:doc.bio_en) && <p className="mt-2 text-xs text-neutral-500 leading-relaxed line-clamp-3">{String(ar?doc.bio_ar??doc.bio_en:doc.bio_en??doc.bio_ar)}</p>}
                    {!!(doc.credentials) && (doc.credentials as string[]).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(doc.credentials as string[]).map((c,i)=><span key={i} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700 font-medium">{c}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* YouTube */}
      {!!page.youtube_video_id && (
        <section className="py-20 bg-neutral-50">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-6 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"شاهد":"Watch"}</p>
              {!!(page.youtube_title_en||page.youtube_title_ar) && <h2 className="text-2xl font-extrabold text-neutral-900">{ar?page.youtube_title_ar as string:page.youtube_title_en as string}</h2>}
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{paddingBottom:"56.25%"}}>
              <iframe src={`https://www.youtube.com/embed/${page.youtube_video_id}?rel=0`} className="absolute inset-0 h-full w-full" allowFullScreen />
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-indigo-600">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-200">{ar?"آراء مرضانا":"Reviews"}</p>
              <h2 className="text-3xl font-extrabold text-white">{ar?"ماذا يقول مرضانا":"What Patients Say"}</h2>
            </div>
            <div className={`grid gap-5 ${testimonials.length===1?"max-w-sm mx-auto":testimonials.length===2?"sm:grid-cols-2 max-w-2xl mx-auto":"sm:grid-cols-3"}`}>
              {testimonials.map(tm=>(
                <div key={tm.id as string} className="rounded-2xl bg-white/10 backdrop-blur p-6 border border-white/10">
                  <div className="mb-3 text-amber-400 text-lg">{"★".repeat(tm.rating as number??5)}</div>
                  <p className="text-white/80 text-sm italic mb-4">"{ar?(tm.text_ar as string||tm.text_en as string):(tm.text_en as string||tm.text_ar as string)}"</p>
                  <p className="text-xs font-bold text-white">{ar?(tm.patient_name_ar as string||tm.patient_name_en as string):(tm.patient_name_en as string||tm.patient_name_ar as string)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Booking + Contact */}
      <section id="book" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"احجز موعداً":"Book Now"}</p>
              <h2 className="mb-2 text-3xl font-extrabold text-neutral-900">{ar?"احجز زيارتك":"Book Your Visit"}</h2>
              <p className="mb-6 text-neutral-500 text-sm">{ar?"سنتصل بك لتأكيد الموعد":"We'll call you to confirm."}</p>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-8 shadow-sm">
                <BookingFormModern slug={slug} lang={lang} />
              </div>
            </div>
            <div id="contact">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">{ar?"تواصل معنا":"Contact"}</p>
              <h2 className="mb-6 text-3xl font-extrabold text-neutral-900">{ar?"كيف تصلنا":"Find Us"}</h2>
              <div className="space-y-4 mb-6">
                {address && <ContactRow icon="📍" label={ar?"العنوان":"Address"} value={address} />}
                {!!(page.phone||clinic.phone) && <ContactRow icon="📞" label={ar?"هاتف":"Phone"} value={page.phone as string||clinic.phone as string} href={`tel:${page.phone||clinic.phone}`} />}
                {!!page.whatsapp && <ContactRow icon="💬" label="WhatsApp" value={page.whatsapp as string} href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} />}
                {hours && <ContactRow icon="🕐" label={ar?"أوقات العمل":"Hours"} value={hours} />}
              </div>
              {!!hasSocial && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {[{k:"social_instagram",i:"📸",l:"Instagram"},{k:"social_facebook",i:"👤",l:"Facebook"},{k:"social_youtube",i:"▶️",l:"YouTube"},{k:"social_twitter",i:"🐦",l:"Twitter"},{k:"social_tiktok",i:"🎵",l:"TikTok"}].filter(s=>page[s.k]).map(s=>(
                    <a key={s.k} href={page[s.k] as string} target="_blank" className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-indigo-300 hover:text-indigo-600 transition">
                      {s.i} {s.l}
                    </a>
                  ))}
                </div>
              )}
              {!!page.maps_url && <div className="rounded-2xl overflow-hidden border border-neutral-100 h-52 shadow-sm"><iframe src={page.maps_url as string} className="h-full w-full" loading="lazy" allowFullScreen /></div>}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 bg-neutral-50 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!!clinic.logo_url && <img src={String(clinic.logo_url ?? "")} alt="" className="h-7 w-7 rounded-lg object-cover" />}
            <p className="text-sm font-semibold text-neutral-600">{clinicName}</p>
          </div>
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} {clinicName} · {ar?"جميع الحقوق محفوظة":"All rights reserved"}</p>
          <a href="#book" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">{ar?"احجز موعداً →":"Book Appointment →"}</a>
        </div>
      </footer>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon:string; label:string; value:string; href?:string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
        {href ? <a href={href} target={href.startsWith("http")?"_blank":undefined} className="text-sm text-neutral-700 font-medium hover:text-indigo-600">{value}</a>
               : <p className="text-sm text-neutral-700 font-medium">{value}</p>}
      </div>
    </div>
  );
}
