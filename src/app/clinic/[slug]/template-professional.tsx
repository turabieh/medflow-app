"use client";

import { useState } from "react";
import { submitBookingRequest } from "@/lib/actions/booking-request";

type R = Record<string, unknown>;

interface Props {
  clinic: R; page: R; services: R[]; doctors: R[]; testimonials: R[]; slug: string;
}

// ── Language helpers ─────────────────────────────────────────
function t(obj: R, keyEn: string, keyAr: string, lang: string): string {
  return (lang === "ar" ? (obj[keyAr] as string) : (obj[keyEn] as string)) || (obj[keyEn] as string) || (obj[keyAr] as string) || "";
}

// ── Booking Form ─────────────────────────────────────────────
function BookingForm({ slug, lang }: { slug: string; lang: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState<"morning"|"afternoon">("morning");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const minDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr("");
    const r = await submitBookingRequest({ clinicSlug: slug, fullName: name, phone, preferredDate: date, period, notes: notes || undefined });
    setLoading(false);
    if (!r.success) { setErr(r.error ?? "Error"); return; }
    setDone(true);
  }

  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const inp = "w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/50 outline-none backdrop-blur-sm focus:border-amber-400 focus:bg-white/20 transition";

  if (done) return (
    <div className="text-center py-10" dir={dir}>
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-3xl mb-4">✓</div>
      <h3 className="text-xl font-bold text-white mb-2">{ar ? "تم إرسال طلبك" : "Request Sent!"}</h3>
      <p className="text-white/70 text-sm">{ar ? "سنتصل بك لتأكيد الموعد" : "We'll call you to confirm your appointment."}</p>
      <button onClick={() => { setDone(false); setName(""); setPhone(""); setDate(""); setNotes(""); }} className="mt-6 text-amber-400 text-sm underline">
        {ar ? "حجز موعد آخر" : "Book another"}
      </button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3" dir={dir}>
      {err && <div className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{err}</div>}
      <input required value={name} onChange={e => setName(e.target.value)}
        placeholder={ar ? "الاسم الكامل" : "Full name"} className={inp} />
      <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
        placeholder={ar ? "رقم الهاتف" : "Phone number"} className={inp} />
      <div className="relative">
        <input required type="date" min={minDate} value={date} onChange={e => setDate(e.target.value)}
          className={inp} style={date ? { color: "transparent" } : undefined} />
        {date && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white">
            {date.split("-").reverse().join("/")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["morning", "afternoon"] as const).map(p => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${period === p ? "bg-amber-400 text-neutral-900 font-bold" : "border border-white/20 text-white/70 hover:border-amber-400/50"}`}>
            {ar ? (p === "morning" ? "صباحاً" : "مساءً") : (p === "morning" ? "Morning" : "Afternoon")}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder={ar ? "ملاحظات (اختياري)" : "Notes (optional)"} className={`${inp} resize-none`} />
      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-amber-400 py-3.5 text-sm font-bold text-neutral-900 hover:bg-amber-300 disabled:opacity-60 transition">
        {loading ? "..." : ar ? "إرسال الطلب ←" : "Submit Request →"}
      </button>
    </form>
  );
}

// ── PROFESSIONAL TEMPLATE ────────────────────────────────────
export function TemplateProfessional({ clinic, page, services, doctors, testimonials, slug }: Props) {
  const defaultLang = (page.default_lang as string) ?? "ar";
  const [lang, setLang] = useState(defaultLang);
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";

  const clinicName = t({ en: clinic.name, ar: clinic.name_ar, ...page }, "hero_title_en", "hero_title_ar", lang) || (ar ? clinic.name_ar as string : clinic.name as string) || "";
  const tagline    = t(page, "tagline_en", "tagline_ar", lang);
  const subtitle   = t(page, "hero_subtitle_en", "hero_subtitle_ar", lang);
  const about      = t(page, "about_en", "about_ar", lang);
  const address    = t(page, "address_en", "address_ar", lang) || clinic.address as string || "";
  const hours      = t(page, "hours_en", "hours_ar", lang);

  const hasSocial = page.social_instagram || page.social_facebook || page.social_youtube || page.social_twitter;

  return (
    <div dir={dir} className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1829]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {clinic.logo_url && (
              <img src={clinic.logo_url as string} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-400/30" />
            )}
            <div>
              <p className="text-base font-bold text-white leading-tight">{clinicName}</p>
              {tagline && <p className="text-xs text-amber-400/80">{tagline}</p>}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Nav links */}
            <div className="hidden md:flex items-center gap-5 text-sm text-white/70">
              {[
                { href: "#about", en: "About", ar: "عنّا" },
                { href: "#services", en: "Services", ar: "خدماتنا" },
                { href: "#doctors", en: "Doctors", ar: "الأطباء" },
                { href: "#contact", en: "Contact", ar: "تواصل" },
              ].filter(item => {
                if (item.href === "#services" && services.length === 0) return false;
                if (item.href === "#doctors" && doctors.length === 0) return false;
                return true;
              }).map(item => (
                <a key={item.href} href={item.href} className="hover:text-amber-400 transition-colors">
                  {ar ? item.ar : item.en}
                </a>
              ))}
            </div>

            {/* Language toggle */}
            <button onClick={() => setLang(ar ? "en" : "ar")}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 hover:border-amber-400 hover:text-amber-400 transition">
              {ar ? "EN" : "عربي"}
            </button>

            <a href="#book"
              className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-neutral-900 hover:bg-amber-300 transition">
              {ar ? "احجز موعداً" : "Book Now"}
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#0B1829]">
        {/* Background */}
        {page.hero_image_url ? (
          <>
            <div className="absolute inset-0">
              <img src={page.hero_image_url as string} alt="" className="h-full w-full object-cover opacity-20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1829] via-[#0B1829]/90 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1829] via-[#0d2040] to-[#091522]">
            {/* Decorative circles */}
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-400/5" />
            <div className="absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-blue-400/5" />
          </div>
        )}

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
                {ar ? "عيادة متخصصة" : "Specialized Clinic"}
              </span>
            </div>

            <h1 className="mb-4 text-5xl font-extrabold leading-tight text-white md:text-6xl">
              {clinicName}
            </h1>

            {tagline && (
              <p className="mb-4 text-xl font-light text-amber-400">{tagline}</p>
            )}

            {subtitle && (
              <p className="mb-10 text-lg leading-relaxed text-white/60 max-w-xl">{subtitle}</p>
            )}

            <div className="flex flex-wrap gap-4">
              <a href="#book"
                className="rounded-full bg-amber-400 px-8 py-4 text-sm font-bold text-neutral-900 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20">
                {ar ? "احجز موعداً الآن" : "Book an Appointment"}
              </a>
              <a href="#about"
                className="rounded-full border border-white/20 px-8 py-4 text-sm text-white hover:border-amber-400/50 transition">
                {ar ? "تعرّف علينا" : "Learn More"}
              </a>
            </div>

            {/* Quick stats */}
            {(page.phone || clinic.phone) && (
              <div className="mt-12 flex flex-wrap gap-8">
                <div>
                  <p className="text-xs text-white/40 mb-1">{ar ? "تواصل معنا" : "Call Us"}</p>
                  <a href={`tel:${page.phone || clinic.phone}`} className="text-lg font-bold text-amber-400 hover:text-amber-300">
                    {page.phone as string || clinic.phone as string}
                  </a>
                </div>
                {hours && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">{ar ? "أوقات العمل" : "Working Hours"}</p>
                    <p className="text-sm font-medium text-white">{hours}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────── */}
      {about && (
        <section id="about" className="py-24 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className={`grid gap-12 items-center ${page.about_image_url ? "md:grid-cols-2" : "md:grid-cols-1 max-w-3xl mx-auto"}`}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2">
                  <div className="h-px w-8 bg-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                    {ar ? "من نحن" : "About Us"}
                  </span>
                </div>
                <h2 className="mb-6 text-3xl font-extrabold text-[#0B1829] md:text-4xl">
                  {ar ? `مرحباً بكم في ${clinicName}` : `Welcome to ${clinicName}`}
                </h2>
                <p className="text-neutral-600 leading-relaxed text-lg whitespace-pre-line">{about}</p>

                {/* Contact quick info */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {address && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 text-amber-500">📍</span>
                      <p className="text-sm text-neutral-600">{address}</p>
                    </div>
                  )}
                  {(page.phone || clinic.phone) && (
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 text-amber-500">📞</span>
                      <a href={`tel:${page.phone || clinic.phone}`} className="text-sm text-neutral-700 hover:text-amber-600">
                        {page.phone as string || clinic.phone as string}
                      </a>
                    </div>
                  )}
                  {(page.whatsapp) && (
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 text-emerald-500">💬</span>
                      <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank"
                        className="text-sm text-neutral-700 hover:text-emerald-600">
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {hours && (
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 text-amber-500">🕐</span>
                      <p className="text-sm text-neutral-600">{hours}</p>
                    </div>
                  )}
                </div>
              </div>
              {page.about_image_url && (
                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-amber-400/10" />
                  <img src={page.about_image_url as string} alt="About"
                    className="relative rounded-2xl object-cover w-full h-80 shadow-xl" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ──────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="py-24 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center">
              <div className="mb-3 inline-flex items-center gap-2">
                <div className="h-px w-8 bg-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  {ar ? "خدماتنا" : "Our Services"}
                </span>
                <div className="h-px w-8 bg-amber-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#0B1829] md:text-4xl">
                {ar ? "ماذا نقدّم" : "What We Offer"}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <div key={s.id as string}
                  className="group relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-300">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#0B1829] text-2xl group-hover:bg-amber-400 transition-colors duration-300">
                    {s.icon as string || "⚕"}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#0B1829]">
                    {ar ? s.name_ar as string : s.name_en as string}
                  </h3>
                  {(ar ? s.description_ar : s.description_en) && (
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      {ar ? s.description_ar as string : s.description_en as string}
                    </p>
                  )}
                  {/* Gold accent bottom bar */}
                  <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DOCTORS ───────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <section id="doctors" className="py-24 bg-[#0B1829]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center">
              <div className="mb-3 inline-flex items-center gap-2">
                <div className="h-px w-8 bg-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  {ar ? "فريقنا الطبي" : "Our Medical Team"}
                </span>
                <div className="h-px w-8 bg-amber-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">
                {ar ? "تعرّف على أطبائنا" : "Meet Our Doctors"}
              </h2>
            </div>

            <div className={`grid gap-8 ${doctors.length === 1 ? "max-w-sm mx-auto" : doctors.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {doctors.map(doc => (
                <div key={doc.id as string}
                  className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300">
                  {/* Photo */}
                  <div className="relative h-72 overflow-hidden bg-[#0d2040]">
                    {doc.photo_url ? (
                      <img src={doc.photo_url as string} alt={doc.name_en as string}
                        className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-6xl text-white/20">👨‍⚕️</div>
                    )}
                    {/* Gradient overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0B1829] to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-6 -mt-4 relative">
                    <h3 className="text-xl font-bold text-white">
                      {ar ? (doc.name_ar as string || doc.name_en as string) : doc.name_en as string}
                    </h3>
                    <p className="mt-1 text-amber-400 text-sm font-medium">
                      {ar ? (doc.title_ar as string || doc.title_en as string) : doc.title_en as string}
                    </p>
                    {(ar ? doc.specialty_ar : doc.specialty_en) && (
                      <p className="mt-1 text-white/50 text-xs">
                        {ar ? doc.specialty_ar as string : doc.specialty_en as string}
                      </p>
                    )}
                    {(ar ? doc.bio_ar : doc.bio_en) && (
                      <p className="mt-3 text-sm text-white/60 leading-relaxed line-clamp-3">
                        {ar ? doc.bio_ar as string : doc.bio_en as string}
                      </p>
                    )}
                    {/* Credentials */}
                    {doc.credentials && (doc.credentials as string[]).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(doc.credentials as string[]).map((c, i) => (
                          <span key={i} className="rounded-md bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-400 font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── YOUTUBE VIDEO ─────────────────────────────────────── */}
      {page.youtube_video_id && (
        <section className="py-24 bg-neutral-50">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2">
                <div className="h-px w-8 bg-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  {ar ? "شاهد" : "Watch"}
                </span>
                <div className="h-px w-8 bg-amber-400" />
              </div>
              {(page.youtube_title_en || page.youtube_title_ar) && (
                <h2 className="text-2xl font-extrabold text-[#0B1829]">
                  {ar ? page.youtube_title_ar as string : page.youtube_title_en as string}
                </h2>
              )}
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${page.youtube_video_id}?rel=0`}
                title="Clinic video"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-14 text-center">
              <div className="mb-3 inline-flex items-center gap-2">
                <div className="h-px w-8 bg-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  {ar ? "آراء مرضانا" : "Patient Reviews"}
                </span>
                <div className="h-px w-8 bg-amber-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#0B1829]">
                {ar ? "ماذا يقول مرضانا" : "What Our Patients Say"}
              </h2>
            </div>
            <div className={`grid gap-6 ${testimonials.length === 1 ? "max-w-md mx-auto" : testimonials.length === 2 ? "sm:grid-cols-2 max-w-3xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {testimonials.map(tm => (
                <div key={tm.id as string}
                  className="rounded-2xl border border-neutral-100 bg-neutral-50 p-8 shadow-sm">
                  <div className="mb-4 flex text-amber-400 text-xl">
                    {"★".repeat(tm.rating as number ?? 5)}
                  </div>
                  <p className="text-neutral-600 leading-relaxed text-sm italic mb-6">
                    "{ar ? (tm.text_ar as string || tm.text_en as string) : (tm.text_en as string || tm.text_ar as string)}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1829] text-white text-sm font-bold">
                      {((ar ? (tm.patient_name_ar as string) : (tm.patient_name_en as string)) || "P")[0]}
                    </div>
                    <p className="text-sm font-semibold text-[#0B1829]">
                      {ar ? (tm.patient_name_ar as string || tm.patient_name_en as string) : (tm.patient_name_en as string || tm.patient_name_ar as string)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BOOKING + MAP ─────────────────────────────────────── */}
      <section id="book" className="py-24 bg-gradient-to-br from-[#0B1829] via-[#0d2040] to-[#091522]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Booking form */}
            <div>
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2">
                  <div className="h-px w-8 bg-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    {ar ? "احجز موعداً" : "Book Appointment"}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {ar ? "هل أنت مستعد؟ احجز الآن" : "Ready? Book Your Visit"}
                </h2>
                <p className="mt-2 text-white/50 text-sm">
                  {ar ? "سنتصل بك لتأكيد الموعد" : "We'll call you to confirm your slot."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <BookingForm slug={slug} lang={lang} />
              </div>
            </div>

            {/* Contact + Map */}
            <div id="contact">
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2">
                  <div className="h-px w-8 bg-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    {ar ? "تواصل معنا" : "Contact Us"}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {ar ? "كيف تصلنا" : "Find Us"}
                </h2>
              </div>

              <div className="space-y-4 mb-8">
                {address && (
                  <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="mt-0.5 text-2xl">📍</span>
                    <div>
                      <p className="text-xs text-white/40 mb-1">{ar ? "العنوان" : "Address"}</p>
                      <p className="text-sm text-white">{address}</p>
                    </div>
                  </div>
                )}
                {(page.phone || clinic.phone) && (
                  <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="text-xs text-white/40 mb-1">{ar ? "هاتف" : "Phone"}</p>
                      <a href={`tel:${page.phone || clinic.phone}`} className="text-sm text-amber-400 hover:text-amber-300">
                        {page.phone as string || clinic.phone as string}
                      </a>
                    </div>
                  </div>
                )}
                {page.whatsapp && (
                  <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="text-xs text-white/40 mb-1">WhatsApp</p>
                      <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank"
                        className="text-sm text-emerald-400 hover:text-emerald-300">{page.whatsapp as string}</a>
                    </div>
                  </div>
                )}
                {hours && (
                  <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="text-2xl">🕐</span>
                    <div>
                      <p className="text-xs text-white/40 mb-1">{ar ? "أوقات العمل" : "Working Hours"}</p>
                      <p className="text-sm text-white">{hours}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Social links */}
              {hasSocial && (
                <div className="mb-6">
                  <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
                    {ar ? "تابعنا" : "Follow Us"}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key:"social_instagram", icon:"📸", label:"Instagram", color:"text-pink-400" },
                      { key:"social_facebook",  icon:"👤", label:"Facebook",  color:"text-blue-400" },
                      { key:"social_youtube",   icon:"▶️", label:"YouTube",   color:"text-red-400"  },
                      { key:"social_twitter",   icon:"🐦", label:"Twitter",   color:"text-sky-400"  },
                      { key:"social_tiktok",    icon:"🎵", label:"TikTok",    color:"text-white"    },
                    ].filter(s => page[s.key]).map(s => (
                      <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium hover:bg-white/10 transition ${s.color}`}>
                        <span>{s.icon}</span>{s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Map */}
              {page.maps_url && (
                <div className="rounded-xl overflow-hidden border border-white/10 h-52">
                  <iframe src={page.maps_url as string} className="h-full w-full" loading="lazy" allowFullScreen />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#071018] py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {clinic.logo_url && <img src={clinic.logo_url as string} alt="" className="h-8 w-8 rounded-full object-cover" />}
            <p className="text-sm font-semibold text-white/60">{clinicName}</p>
          </div>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} {clinicName} · {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}
          </p>
          <a href="#book"
            className="rounded-full bg-amber-400/10 border border-amber-400/20 px-5 py-2 text-xs text-amber-400 hover:bg-amber-400/20 transition">
            {ar ? "احجز موعداً" : "Book Appointment"}
          </a>
        </div>
      </footer>
    </div>
  );
}
