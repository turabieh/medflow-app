"use client";

import "./clinic-page.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { submitBookingRequest } from "@/lib/actions/booking-request";

type R = Record<string, unknown>;
interface Props { clinic: R; page: R; services: R[]; doctors: R[]; testimonials: R[]; customSections?: R[]; slug: string; }

function tx(page: R, en: string, ar: string, lang: string): string {
  return (lang==="ar" ? page[ar] as string : page[en] as string) || (page[en] as string) || (page[ar] as string) || "";
}

// SVG social icons
const SI: Record<string,React.ReactNode> = {
  instagram:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  youtube:  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  twitter:  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  tiktok:   <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
};


// Extract YouTube video ID from URL or plain ID
function extractYTId(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/[?&]v=([^&#]{11})/) ||
            raw.match(/youtu\.be\/([^?&#]{11})/) ||
            raw.match(/embed\/([^?&#]{11})/);
  if (m) return m[1];
  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw.trim())) return raw.trim();
  return raw.slice(-11); // fallback
}

// Get all valid YouTube IDs from page + all doctors
function getAllVideoIds(page: R, doctors: R[]): string[] {
  const ids: string[] = [];
  // From clinic page
  ((page.youtube_video_ids as string[]) ?? []).forEach(id => {
    const clean = extractYTId(id);
    if (clean.length >= 10) ids.push(clean);
  });
  if (!ids.length && page.youtube_video_id) {
    const clean = extractYTId(page.youtube_video_id as string);
    if (clean.length >= 10) ids.push(clean);
  }
  // From doctors
  doctors.forEach(doc => {
    ((doc.youtube_ids as string[]) ?? []).forEach(id => {
      const clean = extractYTId(id);
      if (clean.length >= 10 && !ids.includes(clean)) ids.push(clean);
    });
  });
  return ids;
}




// Photo slider — works on both desktop and mobile
function DocPhotoSlider({ photos, name, title }: { photos: string[]; name: string; title?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setActive(i => (i + 1) % photos.length), 4500);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className="doc-photo-slider">
      {/* Stack of images — all same size, fade between them */}
      <div className="doc-photo-frame">
        {photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={name}
            className={`doc-photo-img${i === active ? " active" : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ))}
        {/* Dark gradient at bottom */}
        <div className="doc-photo-gradient" />
        {/* Name overlay — visible on mobile, hidden on desktop */}
        <div className="doc-photo-overlay">
          <p className="doc-photo-name">{name}</p>
          {title && <p className="doc-photo-title">{title}</p>}
        </div>
        {/* Gold corner lines */}
        <div className="doc-corner doc-corner-tr" />
        <div className="doc-corner doc-corner-bl" />
        {/* Photo dots */}
        {photos.length > 1 && (
          <div className="doc-photo-dots">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`doc-photo-dot${i === active ? " active" : ""}`}
                aria-label={`Photo ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Back to top button
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return visible ? (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed", bottom: "2rem", right: "2rem", zIndex: 200,
        width: 44, height: 44, borderRadius: "50%",
        background: "#0A2342", color: "#fff", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: "1.1rem",
        boxShadow: "0 4px 20px rgba(10,35,66,0.25)",
        transition: "all 0.2s ease",
        opacity: visible ? 1 : 0,
      }}
      aria-label="Back to top"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#C9A84C"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0A2342"; }}
    >
      ↑
    </button>
  ) : null;
}

// YouTube section with random video picker
function YouTubeSection({ page, doctors, lang }: { page: R; doctors: R[]; lang: string }) {
  const ar = lang === "ar";
  const allIds = getAllVideoIds(page, doctors);
  const [activeIdx, setActiveIdx] = useState(0);
  
  // Shuffle once on mount
  const [shuffled, setShuffled] = useState<string[]>([]);
  useEffect(() => {
    const arr = [...allIds].sort(() => Math.random() - 0.5);
    setShuffled(arr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds.join(",")]);
  
  const videos = shuffled.length > 0 ? shuffled : allIds;
  if (videos.length === 0) return null;
  
  const activeId = videos[activeIdx] ?? "";

  return (
    <section className="youtube-section">
      <div className="youtube-inner">
        <div className="fade-in" style={{textAlign:"center"}}>
          <h2 className="section-heading" style={{textAlign: ar?"right":"center"}}>
            {ar
              ? String((page.youtube_title_ar ?? page.youtube_title_en) ?? (ar?"مقاطع مميزة":"Featured Videos"))
              : String((page.youtube_title_en ?? page.youtube_title_ar) ?? "Featured Videos")
            }
          </h2>
        </div>
        <div className="youtube-frame fade-in fade-in-delay-2">
          <iframe
            key={activeId}
            src={`https://www.youtube.com/embed/${activeId}?rel=0&modestbranding=1&color=white`}
            title="Clinic video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {/* Video selector dots — if more than 1 video */}
        {videos.length > 1 && (
          <div style={{display:"flex",justifyContent:"center",gap:"0.5rem",marginTop:"1.25rem",flexWrap:"wrap"}}>
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                style={{
                  width: activeIdx===i ? 28 : 8,
                  height: 8,
                  borderRadius: 100,
                  border: "none",
                  background: activeIdx===i ? "#C9A84C" : "#d0c9bc",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.3s ease",
                }}
                aria-label={`Video ${i+1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Star component
function Stars({ n }: { n: number }) {
  return (
    <div className="review-stars">
      {Array.from({length:5}).map((_,i) => (
        <svg key={i} style={{width:16,height:16,color:i<Math.round(n)?"#C9A84C":"#e0d9d0"}} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Booking form
function BookingForm({ slug, lang }: { slug: string; lang: string }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [date, setDate] = useState(""); const [period, setPeriod] = useState<"morning"|"afternoon">("morning");
  const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false); const [err, setErr] = useState("");
  const ar = lang==="ar";
  const minDate = (() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toLocaleDateString("en-CA",{timeZone:"Asia/Amman"}); })();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr("");
    const r = await submitBookingRequest({ clinicSlug:slug, fullName:name, phone, preferredDate:date, period, notes:notes||undefined });
    setLoading(false);
    if (!r.success) { setErr(r.error??"Error"); return; }
    setDone(true);
  }

  if (done) return (
    <div style={{textAlign:"center",padding:"2rem 0"}} dir={ar?"rtl":"ltr"}>
      <div style={{width:56,height:56,borderRadius:"50%",background:"#e8f5ee",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
        <svg style={{width:28,height:28,color:"#2D6A4F"}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
      </div>
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",fontWeight:700,color:"#0A2342",marginBottom:"0.4rem"}}>{ar?"تم إرسال طلبك!":"Request Received!"}</p>
      <p style={{fontSize:"0.82rem",color:"#6B7280",marginBottom:"1rem"}}>{ar?"سنتصل بك لتأكيد الموعد":"We'll call you to confirm."}</p>
      <button onClick={()=>{setDone(false);setName("");setPhone("");setDate("");setNotes("");}} style={{fontSize:"0.8rem",color:"#2D6A4F",textDecoration:"underline",background:"none",border:"none",cursor:"pointer"}}>{ar?"حجز موعد آخر":"Book another"}</button>
    </div>
  );

  return (
    <form onSubmit={submit} dir={ar?"rtl":"ltr"}>
      {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"0.6rem 0.9rem",fontSize:"0.8rem",color:"#dc2626",marginBottom:"1rem"}}>{err}</div>}
      <div className="form-field">
        <label className="form-label">{ar?"الاسم الكامل":"Full Name"}</label>
        <input required value={name} onChange={e=>setName(e.target.value)} placeholder={ar?"أحمد محمد":"Ahmad Mohammad"} className="form-input"/>
      </div>
      <div className="form-field">
        <label className="form-label">{ar?"رقم الهاتف":"Phone Number"}</label>
        <input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+962 7x xxx xxxx" className="form-input"/>
      </div>
      <div className="form-field">
        <label className="form-label">{ar?"التاريخ المفضل":"Preferred Date"}</label>
        <div style={{position:"relative"}}>
          <input required type="date" min={minDate} value={date} onChange={e=>setDate(e.target.value)} className="form-input" style={date?{color:"transparent"}:undefined}/>
          {date && <span style={{position:"absolute",left:ar?"auto":"1rem",right:ar?"1rem":"auto",top:"50%",transform:"translateY(-50%)",fontSize:"0.9rem",color:"#1a1a2e",pointerEvents:"none"}}>{date.split("-").reverse().join("/")}</span>}
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">{ar?"الوقت":"Time"}</label>
        <div className="period-grid">
          {(["morning","afternoon"] as const).map(p=>(
            <button key={p} type="button" onClick={()=>setPeriod(p)} className={`period-btn${period===p?" active":""}`}>
              {ar?(p==="morning"?"🌅 صباحاً":"🌆 مساءً"):(p==="morning"?"🌅 Morning":"🌆 Afternoon")}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">{ar?"ملاحظات (اختياري)":"Notes (optional)"}</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder={ar?"الأعراض أو أي معلومات مفيدة...":"Symptoms or any helpful info..."} className="form-input" style={{resize:"none"}}/>
      </div>
      <button type="submit" disabled={loading} className="submit-btn">
        {loading?(ar?"جاري الإرسال...":"Sending..."):(ar?"إرسال طلب الموعد →":"Book Appointment →")}
      </button>
      <p className="form-note">{ar?"سنتصل بك لتأكيد الموعد":"We'll call to confirm your slot"}</p>
    </form>
  );
}

// Scroll-triggered fade in hook
function useFadeIn() {
  useEffect(() => {
    const els = document.querySelectorAll(".fade-in");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// Navbar scroll effect
function useNavScroll() {
  useEffect(() => {
    const nav = document.querySelector(".clinic-nav");
    const handler = () => {
      if (window.scrollY > 40) nav?.classList.add("scrolled");
      else nav?.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
}


// Service card with tap-to-expand description on mobile
function ServiceCard({ s, ar, hasImg, idx }: { s: R; ar: boolean; hasImg: boolean; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const desc = String(ar ? s.description_ar ?? s.description_en : s.description_en ?? s.description_ar ?? "");

  return (
    <div
      className={`service-item-new fade-in fade-in-delay-${Math.min(idx+1,4)}`}
      onClick={() => setExpanded(e => !e)}
      style={{cursor: desc ? "pointer" : "default"}}
    >
      {/* Image */}
      <div className="service-img-wrap">
        {hasImg
          ? <img src={s.image_url as string} alt={ar ? s.name_ar as string : s.name_en as string}
              className="service-img"
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
              }}
            />
          : null
        }
        <div className="service-icon-fallback" style={hasImg ? {display:"none"} : {}}>
          <span style={{fontSize:"2rem"}}>{s.icon as string || "⚕"}</span>
        </div>
        <div className="service-img-overlay"/>
      </div>

      {/* Text */}
      <div className="service-card-body">
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.25rem"}}>
          <p className="service-name" style={{textAlign: ar?"right":"left"}}>{ar ? s.name_ar as string : s.name_en as string}</p>
          {desc && (
            <span style={{fontSize:"0.7rem",color:"#9CA3AF",flexShrink:0,marginTop:"0.1rem"}}>
              {expanded ? "▲" : "▼"}
            </span>
          )}
        </div>
        {desc && (
          <p className="service-desc" style={{
            textAlign: ar ? "right" : "left",
            direction: ar ? "rtl" : "ltr",
            // On mobile: clamp when collapsed, full when expanded
            display: "-webkit-box",
            WebkitLineClamp: expanded ? 999 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transition: "all 0.3s ease",
            marginTop: "0.35rem",
          }}>
            {desc}
          </p>
        )}
        {desc && !expanded && (
          <p style={{fontSize:"0.68rem",color:"#C9A84C",marginTop:"0.25rem",textAlign:ar?"right":"left"}}>
            {ar ? "اقرأ المزيد" : "Read more"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── MAIN TEMPLATE ────────────────────────────────────────────
export function TemplateProfessional({ clinic, page, services, doctors, testimonials, customSections = [], slug }: Props) {
  const [lang, setLang] = useState((page.default_lang as string)??"ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const ar = lang==="ar"; const dir = ar?"rtl":"ltr";
  const clinicName = tx(page,"hero_title_en","hero_title_ar",lang)||(ar?clinic.name_ar as string:clinic.name as string)||"";
  const tagline    = tx(page,"tagline_en","tagline_ar",lang);
  const about      = tx(page,"about_en","about_ar",lang);
  const address    = tx(page,"address_en","address_ar",lang)||clinic.address as string||"";
  const hours      = tx(page,"hours_en","hours_ar",lang);
  const phone      = (page.phone||clinic.phone) as string||"";
  const email      = (page.email||clinic.email) as string||"";
  const showTitles = !!(page.show_section_titles);

  // Collect all doctor photos (up to 5 per doctor, all doctors)
  const slideItems: Array<{img:string; name:string; title:string; bio:string}> = [];
  doctors.forEach(doc => {
    const photos = ((doc.photo_urls as string[]) ?? []).filter(Boolean);
    const mainPhoto = (doc.photo_url as string) || "";
    const allPhotos = photos.length > 0 ? photos : (mainPhoto ? [mainPhoto] : []);
    allPhotos.slice(0,5).forEach(img => {
      slideItems.push({
        img,
        name:  ar?(doc.name_ar as string||doc.name_en as string):doc.name_en as string||"",
        title: String((ar ? (doc.title_ar ?? doc.title_en) : (doc.title_en ?? doc.title_ar)) ?? ""),
        bio:   String((ar ? (doc.bio_ar ?? doc.bio_en) : (doc.bio_en ?? doc.bio_ar)) ?? "").slice(0,180),
      });
    });
  });
  // Add hero/about images if no doctor photos
  if (slideItems.length === 0) {
    if (page.hero_image_url) slideItems.push({ img: page.hero_image_url as string, name: clinicName, title: tagline, bio: "" });
    if (page.about_image_url) slideItems.push({ img: page.about_image_url as string, name: clinicName, title: ar?"مرحباً بكم":"Welcome", bio: "" });
  }

  useFadeIn();
  useNavScroll();

  const socialLinks = [
    {key:"social_instagram",icon:"instagram",label:"Instagram"},
    {key:"social_facebook", icon:"facebook", label:"Facebook"},
    {key:"social_youtube",  icon:"youtube",  label:"YouTube"},
    {key:"social_twitter",  icon:"twitter",  label:"X"},
    {key:"social_linkedin", icon:"linkedin", label:"LinkedIn"},
    {key:"social_tiktok",   icon:"tiktok",   label:"TikTok"},
  ].filter(s=>!!page[s.key]);

  const avgRating = testimonials.length
    ? testimonials.reduce((a,t)=>a+((t.rating as number)??5),0)/testimonials.length : null;

  const PhoneIcon = () => <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>;
  const MailIcon  = () => <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
  const MapIcon   = () => <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
  const ClockIcon = () => <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;

  return (
    <div className="clinic-page" dir={dir}>

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <header className="clinic-nav">
        <div className="clinic-nav-inner">
          <a href="#" className="clinic-logo-wrap">
            {!!clinic.logo_url && <img src={clinic.logo_url as string} alt="" className="clinic-logo-img"/>}
            <div>
              <div className="clinic-logo-name">{clinicName}</div>
              {tagline && <div className="clinic-logo-tag">{tagline}</div>}
            </div>
          </a>

          <ul className="clinic-nav-links">
            {about    && <li><a href="#about">{ar?"عنّا":"About"}</a></li>}
            {services.length>0 && <li><a href="#services">{ar?"خدماتنا":"Services"}</a></li>}
            {doctors.length>0  && <li><a href="#about">{ar?"فريقنا الطبي":"Our Team"}</a></li>}
            {customSections.map(sec => {
              const title = ar ? (sec.title_ar as string || sec.title_en as string) : (sec.title_en as string || sec.title_ar as string);
              const anchor = `#section-${sec.id as string}`;
              return title ? <li key={sec.id as string}><a href={anchor}>{title}</a></li> : null;
            })}
            {testimonials.length>0 && <li><a href="#reviews">{ar?"التقييمات":"Reviews"}</a></li>}
            <li><a href="#contact">{ar?"تواصل معنا":"Contact"}</a></li>
            <li><a href="#book">{ar?"احجز موعداً":"Book Now"}</a></li>
          </ul>

          <div className="clinic-nav-actions">
            <button onClick={()=>setLang(ar?"en":"ar")} className="lang-toggle">{ar?"EN":"عربي"}</button>
            <button onClick={() => { const el = document.getElementById("book"); if(el) el.scrollIntoView({behavior:"smooth"}); }} className="book-cta-nav" style={{display:"none"}} id="book-cta-desktop">{ar?"احجز الآن":"Book Now"}</button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="hamburger-btn"
              aria-label="Menu"
            >
              {menuOpen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="mobile-menu">
            {about    && <a href="#about"    className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{ar?"عنّا":"About Us"}</a>}
            {services.length>0 && <a href="#services" className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{ar?"خدماتنا":"Services"}</a>}
            {doctors.length>0  && <a href="#about"    className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{ar?"فريقنا الطبي":"Our Team"}</a>}
            {customSections.map(sec => {
              const title = ar ? (sec.title_ar as string || sec.title_en as string) : (sec.title_en as string || sec.title_ar as string);
              const anchor = `#section-${sec.id as string}`;
              return title ? <a key={sec.id as string} href={anchor} className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{title}</a> : null;
            })}
            {testimonials.length>0 && <a href="#reviews" className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{ar?"التقييمات":"Reviews"}</a>}
            <a href="#contact" className="mobile-menu-item" onClick={()=>setMenuOpen(false)}>{ar?"تواصل معنا":"Contact Us"}</a>
            <a href="#book" className="mobile-menu-item mobile-menu-book" onClick={()=>setMenuOpen(false)}>{ar?"احجز موعداً":"Book Appointment"}</a>
          </div>
        )}
      </header>

      {/* ── HERO IMAGE (if set) ────────────────────────────── */}
      {!!page.hero_image_url && (
        <div style={{
          position: "relative",
          width: "100%",
          height: "clamp(200px, 40vw, 420px)",
          overflow: "hidden",
          background: "#0A2342",
        }}>
          <img
            src={String(page.hero_image_url)}
            alt={clinicName}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 30%",
              opacity: 0.85,
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(10,35,66,0.7) 0%, rgba(10,35,66,0.1) 60%, transparent 100%)",
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "2rem 2rem 1.5rem",
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 700, color: "#fff",
              margin: "0 0 0.25rem",
              textShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>{clinicName}</h1>
            {tagline && <p style={{ fontSize: "0.9rem", color: "#C9A84C", fontWeight: 600, margin: 0 }}>{tagline}</p>}
          </div>
        </div>
      )}

      {/* ── ABOUT + DOCTOR PHOTOS (side by side) ─────────── */}
      {(about || doctors.length > 0) && (
        <section id="about" className="clinic-section">
          {doctors.map((doc, docIdx) => {
            const photos = ((doc.photo_urls as string[]) ?? []).filter(Boolean);
            if (photos.length === 0 && doc.photo_url) photos.push(doc.photo_url as string);
            const docName  = ar ? (doc.name_ar as string || doc.name_en as string) : doc.name_en as string || "";
            const docTitle = String(ar ? doc.title_ar ?? doc.title_en : doc.title_en ?? doc.title_ar ?? "");
            const docBio   = String(ar ? doc.bio_ar ?? doc.bio_en : doc.bio_en ?? doc.bio_ar ?? "");
            const docSpec  = String(ar ? doc.specialty_ar ?? doc.specialty_en : doc.specialty_en ?? doc.specialty_ar ?? "");
            const imgOnLeft = ar ? docIdx % 2 !== 0 : docIdx % 2 === 0;

            return (
              <div key={doc.id as string}
                style={{ marginBottom: docIdx < doctors.length - 1 ? "4rem" : 0 }}>

                {/* ── MOBILE LAYOUT: about text first, then photo+name ── */}
                {/* About text — shows first on mobile, hidden on desktop */}
                {docIdx === 0 && (about || true) && (
                  <div className="mobile-about-block">
                    {showTitles && (
                      <div className="section-eyebrow" style={{justifyContent: ar ? "flex-end" : "flex-start", flexDirection: ar ? "row-reverse" : "row"}}>
                        {ar ? "عن العيادة" : "About Us"}
                      </div>
                    )}
                    {about && (
                      <p className="section-body" style={{marginBottom: "1.5rem", textAlign: "justify", direction: ar ? "rtl" : "ltr"}}>{about}</p>
                    )}
                  </div>
                )}

                {/* ── DESKTOP + MOBILE photo+name row ── */}
                <div className={`fade-in doctor-row ${photos.length > 0 ? "doctor-row-2col" : "doctor-row-1col"}`}
                  style={{ direction: "ltr" }}>

                  {/* Photo */}
                  {photos.length > 0 && (
                    <div className="doctor-photo-col" style={{order: imgOnLeft ? 0 : 1}}>
                      <DocPhotoSlider photos={photos} name={docName} title={docTitle} />
                    </div>
                  )}

                  {/* Text — on desktop shows about+name, on mobile shows name only */}
                  <div className="doctor-text-col" style={{order: imgOnLeft ? 1 : 0, textAlign: ar ? "right" : "left"}}>
                    {/* About text — desktop only (hidden on mobile via CSS) */}
                    {docIdx === 0 && (
                      <div className="desktop-about-block">
                        {showTitles && (
                          <div className="section-eyebrow" style={{justifyContent: ar ? "flex-end" : "flex-start", flexDirection: ar ? "row-reverse" : "row"}}>
                            {ar ? "عن العيادة" : "About Us"}
                          </div>
                        )}
                        {about && (
                          <p className="section-body" style={{marginBottom: "1.5rem", textAlign: "justify"}}>{about}</p>
                        )}
                      </div>
                    )}
                    {/* Doctor name + details — always visible */}
                    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem",fontWeight:700,color:"#0A2342",marginBottom:"0.25rem"}}>{docName}</h2>
                    {docTitle && <p style={{fontSize:"0.85rem",fontWeight:700,color:"#C9A84C",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"0.5rem"}}>{docTitle}</p>}
                    {docSpec  && <p style={{fontSize:"0.85rem",color:"#6B7280",marginBottom:"0.75rem"}}>{docSpec}</p>}
                    {docBio   && <p style={{fontSize:"0.9rem",lineHeight:1.8,color:"#555",marginBottom:"1rem",textAlign:"justify"}}>{docBio}</p>}
                    {((doc.credentials as string[])??[]).length > 0 && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:"1rem",justifyContent:ar?"flex-end":"flex-start"}}>
                        {(doc.credentials as string[]).map((c,j) => (
                          <span key={j} style={{fontSize:"0.72rem",fontWeight:700,color:"#0A2342",background:"rgba(10,35,66,0.07)",borderRadius:100,padding:"3px 12px"}}>{c}</span>
                        ))}
                      </div>
                    )}
                    {docIdx === 0 && socialLinks.length > 0 && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",justifyContent:ar?"flex-end":"flex-start",marginTop:"0.5rem"}}>
                        {socialLinks.map(s => (
                          <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer"
                            style={{display:"flex",alignItems:"center",gap:5,padding:"0.35rem 0.8rem",borderRadius:100,border:"1px solid #e5e0d8",fontSize:"0.75rem",fontWeight:600,color:"#6B7280",textDecoration:"none"}}>
                            {SI[s.icon]}{s.label}
                          </a>
                        ))}
                        {!!page.whatsapp && (
                          <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                            style={{display:"flex",alignItems:"center",gap:5,padding:"0.35rem 0.8rem",borderRadius:100,border:"1px solid #e5e0d8",fontSize:"0.75rem",fontWeight:600,color:"#6B7280",textDecoration:"none"}}>
                            {SI.whatsapp} WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* About text only (no doctors) */}
          {doctors.length === 0 && about && (
            <div className="fade-in" style={{maxWidth:720,margin:"0 auto"}}>
              <div className="section-eyebrow">{ar?"من نحن":"About Us"}</div>
              <h2 className="section-heading">{ar?`مرحباً بكم في ${clinicName}`:`Welcome to ${clinicName}`}</h2>
              {!!page.about_image_url && (
                <img src={String(page.about_image_url)} alt="About"
                  style={{width:"100%",borderRadius:16,marginBottom:"1.5rem",objectFit:"cover",maxHeight:320,display:"block"}} />
              )}
              <p className="section-body">{about}</p>
            </div>
          )}

          {/* About image when there ARE doctors — show after last doctor */}
          {doctors.length > 0 && !!page.about_image_url && (
            <div className="fade-in" style={{marginTop:"3rem",textAlign:"center"}}>
              <img src={String(page.about_image_url)} alt="About the clinic"
                style={{width:"100%",maxWidth:680,borderRadius:16,objectFit:"cover",maxHeight:340,display:"block",margin:"0 auto",boxShadow:"0 8px 32px rgba(10,35,66,0.12)"}} />
            </div>
          )}
        </section>
      )}

      {/* ── SERVICES ──────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" style={{background:"#fff",padding:"3.5rem 1.5rem"}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div className="fade-in" style={{textAlign: ar?"right":"center", marginBottom:"2rem"}}>
              <h2 className="section-heading" style={{textAlign: ar?"right":"center", marginBottom:"0.4rem"}}>{ar?"خدماتنا":"Our Services"}</h2>
            </div>
            <div className="services-grid">
              {services.map((s,i) => {
                const hasImg = !!(s.image_url as string);
                return (
                  <ServiceCard key={s.id as string} s={s} ar={ar} hasImg={hasImg} idx={i} />
                );
              })
            </div>
          </div>
        </section>
      )}



      {/* ── YOUTUBE VIDEOS ──────────────────────────────── */}
      <YouTubeSection page={page} doctors={doctors} lang={lang} />

      {/* ── REVIEWS ───────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section id="reviews" style={{padding:"3.5rem 1.5rem",background:"#fff"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div className="fade-in" style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2.5rem"}}>
              <div>
                <h2 className="section-heading" style={{marginBottom:0}}>{ar?"ماذا يقول مرضانا":"What Patients Say"}</h2>
              </div>
              {avgRating !== null && (
                <div style={{textAlign:ar?"left":"right"}}>
                  <p style={{fontFamily:"'Playfair Display',serif",fontSize:"3rem",fontWeight:700,color:"#0A2342",lineHeight:1}}>{avgRating.toFixed(1)}</p>
                  <Stars n={avgRating}/>
                  <p style={{fontSize:"0.75rem",color:"#6B7280",marginTop:"0.3rem"}}>{testimonials.length} {ar?"تقييم":"reviews"}</p>
                </div>
              )}
            </div>
            {/* Desktop: grid */}
            <div className="reviews-grid reviews-grid-desktop">
              {testimonials.map((tm,i)=>(
                <div key={tm.id as string} className={`review-card fade-in fade-in-delay-${Math.min(i+1,4)}`}>
                  <Stars n={(tm.rating as number)??5}/>
                  <p className="review-quote">
                    {ar?(tm.text_ar as string||tm.text_en as string):(tm.text_en as string||tm.text_ar as string)}
                  </p>
                  <p className="review-author">
                    {ar?(tm.patient_name_ar as string||tm.patient_name_en as string):(tm.patient_name_en as string||tm.patient_name_ar as string)}
                  </p>
                </div>
              ))}
            </div>

            {/* Mobile: auto-scrolling ticker */}
            <div className="reviews-ticker-mobile">
              <div className="reviews-ticker-wrap">
                <div className={`reviews-ticker-track${ar ? " ticker-rtl" : ""}`}>
                  {[...testimonials, ...testimonials].map((tm, i) => (
                    <div key={i} className="review-ticker-card">
                      <div className="review-ticker-stars">
                        {Array.from({length: Math.round((tm.rating as number) ?? 5)}).map((_,j) => (
                          <svg key={j} style={{width:14,height:14}} fill="#C9A84C" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <p className="review-ticker-text">
                        {ar?(tm.text_ar as string||tm.text_en as string):(tm.text_en as string||tm.text_ar as string)}
                      </p>
                      <p className="review-ticker-author">
                        {ar?(tm.patient_name_ar as string||tm.patient_name_en as string):(tm.patient_name_en as string||tm.patient_name_ar as string)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CUSTOM SECTIONS ─────────────────────────────────── */}
      {customSections.map((sec, idx) => {
        const title   = ar ? (sec.title_ar as string || sec.title_en as string) : (sec.title_en as string || sec.title_ar as string);
        const body    = ar ? (sec.body_ar   as string || sec.body_en   as string) : (sec.body_en   as string || sec.body_ar   as string);
        const imgSide = (sec.image_side as string) || "left";
        const hasImg  = !!(sec.image_url as string);
        const bg      = idx % 2 === 0 ? "#fff" : "var(--cream)";

        return (
          <section key={sec.id as string} id={`section-${sec.id as string}`} style={{background: bg, padding:"3.5rem 1.5rem"}}>
            <div style={{maxWidth:1100, margin:"0 auto"}}>

              {/* Title */}
              {title && (
                <h2 style={{
                  fontFamily:"'Playfair Display',serif",
                  fontSize:"clamp(1.5rem,3vw,2.2rem)",
                  fontWeight:700, color:"#0A2342",
                  marginBottom:"1.75rem",
                  textAlign: ar ? "right" : "left",
                }}>
                  {title}
                </h2>
              )}

              {/* Image top layout */}
              {hasImg && imgSide === "top" && (
                <img src={sec.image_url as string} alt={title}
                  style={{width:"100%",maxHeight:380,objectFit:"cover",borderRadius:16,marginBottom:"1.75rem",boxShadow:"0 8px 32px rgba(10,35,66,0.1)"}}
                  onError={e=>{(e.target as HTMLImageElement).style.display="none";}}
                />
              )}

              {/* Text-only layout */}
              {(!hasImg || imgSide === "none" || imgSide === "top") && body && (
                <p style={{
                  fontSize:"1rem", lineHeight:1.85, color:"#555",
                  textAlign:"justify", direction: ar?"rtl":"ltr",
                  maxWidth: imgSide === "top" ? "100%" : 720,
                  margin: ar ? "0 0 0 auto" : "0 auto 0 0",
                  whiteSpace:"pre-line",
                }}>{body}</p>
              )}

              {/* Side-by-side layout (left / right) */}
              {hasImg && (imgSide === "left" || imgSide === "right") && (
                <div className="custom-section-side" style={{
                  display:"grid",
                  gridTemplateColumns:"1fr 1.3fr",
                  gap:"2rem",
                  alignItems:"center",
                  direction:"ltr",
                }}>
                  <div className="custom-section-img" style={{order: imgSide === "left" ? 0 : 1}}>
                    <img src={sec.image_url as string} alt={title}
                      style={{width:"100%",borderRadius:16,objectFit:"cover",aspectRatio:"4/3",boxShadow:"0 8px 32px rgba(10,35,66,0.12)",display:"block"}}
                      onError={e=>{(e.target as HTMLImageElement).style.display="none";}}
                    />
                  </div>
                  <div style={{order: imgSide === "left" ? 1 : 0, textAlign: ar?"right":"left"}}>
                    {body && (
                      <p style={{fontSize:"1rem",lineHeight:1.85,color:"#555",textAlign:"justify",direction:ar?"rtl":"ltr",whiteSpace:"pre-line"}}>{body}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

            {/* ── BOOKING + CONTACT ─────────────────────────────── */}
      <section id="book" className="booking-section">
        <div className="booking-inner">
          {/* Left: contact info */}
          <div id="contact" className="booking-info fade-in">
{showTitles && <h2 className="section-heading">{ar?"نحن هنا من أجلك":"We're Here for You"}</h2>}
            <p>{ar?"احجز موعدك الآن وسنتواصل معك لتأكيد الوقت المناسب. فريقنا الطبي المتخصص مستعد لخدمتك.":"Book your appointment now and we'll contact you to confirm the best time. Our specialist team is ready to serve you."}</p>
            <ul className="contact-list">
              {address && <li><MapIcon/><span>{address}</span></li>}
              {phone   && <li><PhoneIcon/><a href={`tel:${phone}`} dir="ltr" style={{unicodeBidi:"embed",direction:"ltr"}}>{phone}</a></li>}
              {email   && <li><MailIcon/><a href={`mailto:${email}`}>{email}</a></li>}
              {hours   && <li><ClockIcon/><span>{hours}</span></li>}
              {!!page.whatsapp && (
                <li>
                  {SI.whatsapp}
                  <a href={`https://wa.me/${(page.whatsapp as string).replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp: {page.whatsapp as string}
                  </a>
                </li>
              )}
            </ul>
            {socialLinks.length>0 && (
              <div className="social-row">
                {socialLinks.map(s=>(
                  <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer" className="social-pill">
                    {SI[s.icon]}{s.label}
                  </a>
                ))}
              </div>
            )}
            {!!page.maps_url && (
              <div className="map-frame" style={{marginTop:"2rem"}}>
                <iframe src={String(page.maps_url??"")} loading="lazy" allowFullScreen title="Map"/>
              </div>
            )}
          </div>

          {/* Right: booking form */}
          <div className="fade-in fade-in-delay-2">
            <div className="booking-form-card">
              <h3 className="booking-form-title">{ar?"طلب حجز موعد":"Request an Appointment"}</h3>
              <BookingForm slug={slug} lang={lang}/>
            </div>
          </div>
        </div>
      </section>

      {/* ── BACK TO TOP ───────────────────────────────────── */}
      <BackToTop/>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="clinic-footer">
        <div className="clinic-footer-inner">
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            {!!clinic.logo_url && <img src={clinic.logo_url as string} alt="" style={{width:36,height:36,borderRadius:10,objectFit:"cover"}}/>}
            <span className="footer-name">{clinicName}</span>
          </div>
          {tagline && <p style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.35)"}}>{tagline}</p>}
          <p className="footer-copy">© {new Date().getFullYear()} {clinicName}. {ar?"جميع الحقوق محفوظة.":"All rights reserved."}</p>
          <a href="#book" className="footer-book">{ar?"احجز موعداً ←":"Book Appointment →"}</a>
        </div>
      </footer>
    </div>
  );
}
