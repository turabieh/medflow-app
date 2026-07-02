"use client";

import { useState } from "react";
import { submitBookingRequest } from "@/lib/actions/booking-request";

type R = Record<string, unknown>;
interface Props { clinic: R; page: R; services: R[]; doctors: R[]; testimonials: R[]; slug: string; }

function tx(page: R, en: string, ar: string, lang: string): string {
  return (lang === "ar" ? page[ar] as string : page[en] as string) || (page[en] as string) || (page[ar] as string) || "";
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  facebook:  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  youtube:   <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  twitter:   <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  linkedin:  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  tiktok:    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  whatsapp:  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
};

function Stars({ rating, count }: { rating?: number; count?: number }) {
  const r = rating ?? 5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({length:5}).map((_,i) => (
        <svg key={i} className={`h-4 w-4 ${i < Math.round(r) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {count !== undefined && <span className="ml-1.5 text-sm font-bold text-gray-800">{r.toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-gray-400 ml-0.5">({count})</span>}
    </span>
  );
}

function BookingPanel({ slug, lang }: { slug: string; lang: string }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [date, setDate] = useState(""); const [period, setPeriod] = useState<"morning"|"afternoon">("morning");
  const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false); const [err, setErr] = useState("");
  const ar = lang === "ar";
  const minDate = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toLocaleDateString("en-CA",{timeZone:"Asia/Amman"}); })();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr("");
    const r = await submitBookingRequest({ clinicSlug:slug, fullName:name, phone, preferredDate:date, period, notes:notes||undefined });
    setLoading(false);
    if (!r.success) { setErr(r.error??"Error"); return; }
    setDone(true);
  }
  const inp = "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400";

  if (done) return (
    <div className="py-6 text-center" dir={ar?"rtl":"ltr"}>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{ar?"تم إرسال طلبك!":"Request Sent!"}</h3>
      <p className="text-xs text-gray-500 mb-3">{ar?"سنتصل بك لتأكيد الموعد":"We'll call to confirm."}</p>
      <button onClick={()=>{setDone(false);setName("");setPhone("");setDate("");setNotes("");}} className="text-xs text-blue-600 underline">{ar?"حجز موعد آخر":"Book another"}</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3.5" dir={ar?"rtl":"ltr"}>
      {err && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{err}</div>}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{ar?"الاسم الكامل":"Full Name"}</label>
        <input required value={name} onChange={e=>setName(e.target.value)} placeholder={ar?"أحمد محمد":"Ahmad Mohammad"} className={inp}/>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{ar?"رقم الهاتف":"Phone"}</label>
        <input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+962 7x xxx xxxx" className={inp}/>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{ar?"التاريخ المفضل":"Preferred Date"}</label>
        <div className="relative">
          <input required type="date" min={minDate} value={date} onChange={e=>setDate(e.target.value)} className={inp} style={date?{color:"transparent"}:undefined}/>
          {date && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-800">{date.split("-").reverse().join("/")}</span>}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{ar?"الوقت المفضل":"Time"}</label>
        <div className="grid grid-cols-2 gap-2">
          {(["morning","afternoon"] as const).map(p => (
            <button key={p} type="button" onClick={()=>setPeriod(p)}
              className={`rounded-lg py-2.5 text-sm font-semibold border transition-all ${period===p?"bg-[#0D3B66] border-[#0D3B66] text-white shadow-sm":"border-gray-200 text-gray-500 hover:border-[#0D3B66]/30"}`}>
              {ar?(p==="morning"?"🌅 صباحاً":"🌆 مساءً"):(p==="morning"?"🌅 Morning":"🌆 Afternoon")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{ar?"ملاحظات (اختياري)":"Notes (optional)"}</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder={ar?"الأعراض أو أي معلومات...":"Symptoms or any info..."} className={`${inp} resize-none`}/>
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 transition-all shadow-lg shadow-emerald-200">
        {loading?(ar?"جاري الإرسال...":"Sending..."):(ar?"إرسال الطلب ←":"Book Appointment →")}
      </button>
      <p className="text-center text-xs text-gray-400">{ar?"سنتصل بك لتأكيد الموعد":"We'll call to confirm your slot"}</p>
    </form>
  );
}

export function TemplateProfessional({ clinic, page, services, doctors, testimonials, slug }: Props) {
  const [lang, setLang] = useState((page.default_lang as string)??"ar");
  const ar = lang==="ar"; const dir = ar?"rtl":"ltr";

  const clinicName = tx(page,"hero_title_en","hero_title_ar",lang)||(ar?clinic.name_ar as string:clinic.name as string)||"";
  const tagline    = tx(page,"tagline_en","tagline_ar",lang);
  const about      = tx(page,"about_en","about_ar",lang);
  const address    = tx(page,"address_en","address_ar",lang)||clinic.address as string||"";
  const hours      = tx(page,"hours_en","hours_ar",lang);
  const phone      = (page.phone||clinic.phone) as string||"";

  const socialLinks = [
    {key:"social_instagram",icon:"instagram",label:"Instagram",color:"hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50"},
    {key:"social_facebook", icon:"facebook", label:"Facebook", color:"hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"},
    {key:"social_youtube",  icon:"youtube",  label:"YouTube",  color:"hover:text-red-600 hover:border-red-200 hover:bg-red-50"},
    {key:"social_twitter",  icon:"twitter",  label:"X / Twitter",color:"hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100"},
    {key:"social_linkedin", icon:"linkedin", label:"LinkedIn", color:"hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"},
    {key:"social_tiktok",   icon:"tiktok",   label:"TikTok",   color:"hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100"},
  ].filter(s=>!!page[s.key]);

  const avgRating = testimonials.length ? testimonials.reduce((a,t)=>a+((t.rating as number)??5),0)/testimonials.length : null;
  const primaryDoc = doctors[0];

  const SectionTitle = ({children, accent="bg-[#0D3B66]"}: {children: React.ReactNode; accent?: string}) => (
    <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold text-gray-900">
      <span className={`inline-block h-5 w-1 flex-shrink-0 rounded-full ${accent}`} />
      {children}
    </h2>
  );

  return (
    <div dir={dir} className="min-h-screen bg-[#F7F9FC] font-sans antialiased">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {!!clinic.logo_url && <img src={clinic.logo_url as string} alt="" className="h-9 w-9 flex-shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"/>}
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#0D3B66]">{clinicName}</p>
              {tagline && <p className="truncate text-xs text-gray-400">{tagline}</p>}
            </div>
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-5 text-sm font-medium text-gray-500 md:flex">
            {about && <a href="#about" className="hover:text-[#0D3B66] transition">{ar?"عنّا":"About"}</a>}
            {services.length>0 && <a href="#services" className="hover:text-[#0D3B66] transition">{ar?"خدماتنا":"Services"}</a>}
            {doctors.length>1  && <a href="#doctors"  className="hover:text-[#0D3B66] transition">{ar?"الفريق":"Team"}</a>}
            {testimonials.length>0 && <a href="#reviews" className="hover:text-[#0D3B66] transition">{ar?"التقييمات":"Reviews"}</a>}
            <a href="#contact" className="hover:text-[#0D3B66] transition">{ar?"تواصل":"Contact"}</a>
          </nav>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button onClick={()=>setLang(ar?"en":"ar")}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:border-[#0D3B66] hover:text-[#0D3B66] transition">
              {ar?"EN":"عربي"}
            </button>
            <a href="#book" className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm">
              {ar?"احجز":"Book"}
            </a>
          </div>
        </div>
      </header>

      {/* HERO STRIP */}
      <div className="border-b border-blue-900/20 bg-gradient-to-br from-[#0D3B66] via-[#1055A0] to-[#0D3B66] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {/* Logo / clinic photo */}
              {!!page.hero_image_url
                ? <img src={String(page.hero_image_url??"")} alt="" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl flex-shrink-0"/>
                : primaryDoc?.photo_url
                  ? <img src={primaryDoc.photo_url as string} alt="" className="h-20 w-20 rounded-2xl object-cover object-top ring-4 ring-white/20 shadow-xl flex-shrink-0"/>
                  : clinic.logo_url
                    ? <img src={clinic.logo_url as string} alt="" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl flex-shrink-0"/>
                    : <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl ring-4 ring-white/20">🏥</div>
              }
              <div>
                {tagline && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{tagline}</span>
                  </div>
                )}
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{clinicName}</h1>
                {primaryDoc && (
                  <p className="mt-0.5 text-sm text-white/60 font-medium">
                    {ar?(primaryDoc.title_ar as string||primaryDoc.title_en as string):primaryDoc.title_en as string}
                  </p>
                )}
                {avgRating !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Stars rating={avgRating} count={testimonials.length}/>
                  </div>
                )}
              </div>
            </div>
            {/* Quick contact */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  {phone}
                </a>
              )}
              {hours && <span className="flex items-center gap-1.5"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{hours}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:items-start lg:gap-8">

        {/* LEFT CONTENT */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Primary doctor card */}
          {primaryDoc && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-6 p-6 sm:flex-row">
                {primaryDoc.photo_url
                  ? <img src={primaryDoc.photo_url as string} alt={ar?primaryDoc.name_ar as string:primaryDoc.name_en as string}
                      className="h-48 w-40 flex-shrink-0 rounded-xl object-cover object-top shadow-md sm:h-56 sm:w-44"/>
                  : <div className="flex h-48 w-40 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-6xl sm:h-56 sm:w-44">👨‍⚕️</div>
                }
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                    {ar?(primaryDoc.name_ar as string||primaryDoc.name_en as string):primaryDoc.name_en as string}
                  </h2>
                  {(ar?primaryDoc.title_ar:primaryDoc.title_en) && (
                    <p className="mt-1 text-sm font-bold uppercase tracking-wider text-[#0D3B66]">
                      {String(ar?primaryDoc.title_ar??primaryDoc.title_en:primaryDoc.title_en??primaryDoc.title_ar)}
                    </p>
                  )}
                  {(ar?primaryDoc.specialty_ar:primaryDoc.specialty_en) && (
                    <p className="text-sm text-gray-500">{String(ar?primaryDoc.specialty_ar??primaryDoc.specialty_en:primaryDoc.specialty_en??primaryDoc.specialty_ar)}</p>
                  )}
                  {((primaryDoc.credentials as string[])??[]).length>0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(primaryDoc.credentials as string[]).map((c,i)=>(
                        <span key={i} className="rounded-full border border-[#0D3B66]/20 bg-[#0D3B66]/5 px-3 py-0.5 text-xs font-bold text-[#0D3B66]">{c}</span>
                      ))}
                    </div>
                  )}
                  {/* Contact details */}
                  <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                    {address && <div className="flex items-start gap-2"><svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>{address}</span></div>}
                    {phone && <div className="flex items-center gap-2"><svg className="h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><a href={`tel:${phone}`} className="font-medium text-[#0D3B66] hover:underline">{phone}</a></div>}
                    {(page.email||clinic.email) && <div className="flex items-center gap-2"><svg className="h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><a href={`mailto:${page.email||clinic.email}`} className="text-[#0D3B66] hover:underline">{String(page.email??clinic.email??'')}</a></div>}
                    {hours && <div className="flex items-center gap-2"><svg className="h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>{hours}</span></div>}
                  </div>
                  {/* Social icons */}
                  {socialLinks.length>0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {socialLinks.map(s => (
                        <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer" title={s.label}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 transition-all ${s.color}`}>
                          {SOCIAL_ICONS[s.icon]}
                        </a>
                      ))}
                      {page.whatsapp && (
                        <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600">
                          {SOCIAL_ICONS.whatsapp}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {(ar?primaryDoc.bio_ar:primaryDoc.bio_en) && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                  <p className="text-sm leading-relaxed text-gray-600">{String(ar?primaryDoc.bio_ar??primaryDoc.bio_en:primaryDoc.bio_en??primaryDoc.bio_ar)}</p>
                </div>
              )}
            </div>
          )}

          {/* About */}
          {about && (
            <div id="about" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionTitle>{ar?"عن العيادة":"About the Clinic"}</SectionTitle>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{about}</p>
              {!!page.about_image_url && <img src={String(page.about_image_url??"")} alt="" className="mt-4 w-full rounded-xl object-cover max-h-56"/>}
            </div>
          )}

          {/* Services */}
          {services.length>0 && (
            <div id="services" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionTitle>{ar?"خدماتنا":"Our Services"}</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map(s => (
                  <div key={s.id as string} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-[#0D3B66]/20 hover:shadow-sm">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl shadow-sm">{s.icon as string||"⚕"}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ar?s.name_ar as string:s.name_en as string}</p>
                      {!!(ar?s.description_ar:s.description_en) && (
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{String(ar?s.description_ar??s.description_en:s.description_en??s.description_ar)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* More doctors */}
          {doctors.length>1 && (
            <div id="doctors" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionTitle>{ar?"فريقنا الطبي":"Medical Team"}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {doctors.slice(1).map(doc => (
                  <div key={doc.id as string} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    {doc.photo_url
                      ? <img src={doc.photo_url as string} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover object-top shadow-sm"/>
                      : <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[#0D3B66]/10 text-2xl">👨‍⚕️</div>
                    }
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{ar?(doc.name_ar as string||doc.name_en as string):doc.name_en as string}</p>
                      <p className="text-xs text-[#0D3B66] font-medium">{String(ar?doc.title_ar??doc.title_en:doc.title_en??doc.title_ar)}</p>
                      {!!(ar?doc.bio_ar:doc.bio_en) && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{String(ar?doc.bio_ar??doc.bio_en:doc.bio_en??doc.bio_ar)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* YouTube */}
          {!!page.youtube_video_id && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionTitle accent="bg-red-500">
                {ar ? String(page.youtube_title_ar??page.youtube_title_en??"فيديو") : String(page.youtube_title_en??page.youtube_title_ar??"Watch")}
              </SectionTitle>
              <div className="relative overflow-hidden rounded-xl bg-black" style={{paddingBottom:"56.25%"}}>
                <iframe
                  src={`https://www.youtube.com/embed/${String(page.youtube_video_id??"")}?rel=0&modestbranding=1`}
                  title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen className="absolute inset-0 h-full w-full"/>
              </div>
            </div>
          )}

          {/* Reviews */}
          {testimonials.length>0 && (
            <div id="reviews" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle accent="bg-amber-400">{ar?"آراء المرضى":"Patient Reviews"}</SectionTitle>
                {avgRating !== null && (
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className="text-3xl font-extrabold text-gray-900 leading-none">{avgRating.toFixed(1)}</p>
                      <Stars rating={avgRating}/>
                      <p className="text-[10px] text-gray-400">{testimonials.length} {ar?"تقييم":"reviews"}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map(tm => (
                  <div key={tm.id as string} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Stars rating={tm.rating as number??5}/>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 italic">"{ar?(tm.text_ar as string||tm.text_en as string):(tm.text_en as string||tm.text_ar as string)}"</p>
                    <p className="mt-2 text-xs font-bold text-gray-700">— {ar?(tm.patient_name_ar as string||tm.patient_name_en as string):(tm.patient_name_en as string||tm.patient_name_ar as string)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {!!page.maps_url && (
            <div id="contact" className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 bg-white px-6 py-4">
                <SectionTitle>{ar?"موقعنا":"Our Location"}</SectionTitle>
                {address && <p className="text-sm text-gray-500 -mt-2">{address}</p>}
              </div>
              <div className="h-64">
                <iframe src={String(page.maps_url??"")} className="h-full w-full" loading="lazy" allowFullScreen title="Map"/>
              </div>
            </div>
          )}

        </div>{/* end left col */}

        {/* STICKY BOOKING PANEL */}
        <div id="book" className="mt-5 w-full lg:mt-0 lg:w-[360px] lg:flex-shrink-0">
          <div className="lg:sticky lg:top-[73px] space-y-4">

            {/* Booking card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-gray-900">{ar?"احجز موعداً":"Book an Appointment"}</h2>
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    {ar?"اتصل":"Call"}
                  </a>
                )}
              </div>
              <BookingPanel slug={slug} lang={lang}/>
            </div>

            {/* Social links card */}
            {socialLinks.length>0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{ar?"تابعنا":"Follow Us"}</p>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(s => (
                    <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 transition-all ${s.color}`}>
                      {SOCIAL_ICONS[s.icon]}<span>{s.label}</span>
                    </a>
                  ))}
                  {page.whatsapp && (
                    <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600">
                      {SOCIAL_ICONS.whatsapp}<span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact quick card */}
            {(address||phone||hours) && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2.5 text-sm text-gray-600">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{ar?"معلومات التواصل":"Contact Info"}</p>
                {address && <div className="flex items-start gap-2.5"><svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span className="text-xs">{address}</span></div>}
                {phone  && <div className="flex items-center gap-2.5"><svg className="h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><a href={`tel:${phone}`} className="text-xs font-medium text-[#0D3B66] hover:underline">{phone}</a></div>}
                {hours  && <div className="flex items-center gap-2.5"><svg className="h-4 w-4 flex-shrink-0 text-[#0D3B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span className="text-xs">{hours}</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>{/* end two-column */}

      {/* FOOTER */}
      <footer className="mt-10 border-t border-gray-200 bg-white py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              {!!clinic.logo_url && <img src={clinic.logo_url as string} alt="" className="h-8 w-8 rounded-xl object-cover shadow-sm"/>}
              <div>
                <p className="text-sm font-extrabold text-gray-800">{clinicName}</p>
                {tagline && <p className="text-xs text-gray-400">{tagline}</p>}
              </div>
            </div>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} {clinicName}. {ar?"جميع الحقوق محفوظة.":"All rights reserved."}</p>
            <a href="#book" className="rounded-full border border-[#0D3B66] px-5 py-2 text-xs font-bold text-[#0D3B66] hover:bg-[#0D3B66] hover:text-white transition">
              {ar?"احجز موعداً ←":"Book Appointment →"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
