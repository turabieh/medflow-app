"use client";

import "./clinic-page.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { submitBookingRequest } from "@/lib/actions/booking-request";

type R = Record<string, unknown>;
interface Props { clinic: R; page: R; services: R[]; doctors: R[]; testimonials: R[]; customSections?: R[]; slug: string; }

function tx(page: R, en: string, ar: string, lang: string): string {
  return (lang==="ar" ? page[ar] as string : page[en] as string) || (page[en] as string) || (page[ar] as string) || "";
}

// ── Calm palette ──────────────────────────────────────────────
const C = {
  bg:         "#F4F2F8",   // lavender-tinted page bg
  surface:    "#FFFFFF",
  surfaceAlt: "#EEE9F5",   // slightly deeper lavender card
  primary:    "#6B5EA8",   // dusty purple
  primaryDark:"#4E4480",
  accent:     "#9B8EC4",   // soft lavender accent
  accentLight:"#D6CFE8",   // very light lavender
  text:       "#2D2A3E",   // near-black with purple tint
  textMid:    "#6B6880",
  textLight:  "#A09CB8",
  border:     "#DDD8EE",
  gold:       "#B8A06A",   // muted gold for stars / highlights
  gradHero:   "linear-gradient(135deg, #2D2A3E 0%, #4E4480 60%, #6B5EA8 100%)",
};

const SI: Record<string,React.ReactNode> = {
  instagram:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  youtube:  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  twitter:  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
};

function extractYTId(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/[?&]v=([^&#]{11})/) || raw.match(/youtu\.be\/([^?&#]{11})/) || raw.match(/embed\/([^?&#]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw.trim())) return raw.trim();
  return raw.slice(-11);
}

function getAllVideoIds(page: R, doctors: R[]): string[] {
  const ids: string[] = [];
  ((page.youtube_video_ids as string[]) ?? []).forEach(id => { const c = extractYTId(id); if (c.length >= 10) ids.push(c); });
  if (!ids.length && page.youtube_video_id) { const c = extractYTId(page.youtube_video_id as string); if (c.length >= 10) ids.push(c); }
  doctors.forEach(doc => { ((doc.youtube_ids as string[]) ?? []).forEach(id => { const c = extractYTId(id); if (c.length >= 10 && !ids.includes(c)) ids.push(c); }); });
  return ids;
}

function useFadeIn() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }), { threshold: 0.12 });
    document.querySelectorAll(".fade-in").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function useNavScroll() {
  useEffect(() => {
    const handler = () => {
      const nav = document.querySelector(".calm-nav") as HTMLElement | null;
      const btn = document.getElementById("book-cta-desktop");
      if (!nav) return;
      if (window.scrollY > 60) { nav.classList.add("scrolled"); if (btn) btn.style.display = "block"; }
      else { nav.classList.remove("scrolled"); if (btn) btn.style.display = "none"; }
    };
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
}

// ── Doctor photo slider ───────────────────────────────────────
function DocPhotoSlider({ photos, name, title }: { photos: string[]; name: string; title?: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setActive(i => (i + 1) % photos.length), 4500);
    return () => clearInterval(t);
  }, [photos.length]);
  return (
    <div className="doc-photo-slider">
      <div className="doc-photo-frame">
        {photos.map((src, i) => (
          <img key={i} src={src} alt={name}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity: i===active?1:0, transition:"opacity 0.9s ease" }}
          />
        ))}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"55%",background:"linear-gradient(to top,rgba(45,42,62,0.85),transparent)",borderRadius:"0 0 1rem 1rem"}}/>
        <div style={{position:"absolute",bottom:"1rem",left:"1rem",right:"1rem"}}>
          <p style={{color:"#fff",fontWeight:700,fontSize:"0.95rem",margin:0}}>{name}</p>
          {title && <p style={{color:C.accentLight,fontSize:"0.78rem",margin:"2px 0 0"}}>{title}</p>}
        </div>
        {photos.length > 1 && (
          <div style={{position:"absolute",top:"0.7rem",right:"0.7rem",display:"flex",gap:4}}>
            {photos.map((_,i)=>( <div key={i} style={{width:6,height:6,borderRadius:"50%",background: i===active?"#fff":"rgba(255,255,255,0.4)",transition:"background 0.3s"}}/> ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <div style={{display:"flex",gap:2}}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 20 20" fill={i<=n?C.gold:"#DDD"} style={{width:14,height:14}}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

// ── Booking form ──────────────────────────────────────────────
function BookingForm({ slug, lang }: { slug: string; lang: string }) {
  const ar = lang==="ar";
  const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  const [date,setDate]=useState(""); const [period,setPeriod]=useState("");
  const [notes,setNotes]=useState(""); const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const minDate = new Date().toISOString().split("T")[0];

  if (done) return (
    <div style={{textAlign:"center",padding:"2rem 0"}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
        <svg viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth={2.5} style={{width:28,height:28}}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <p style={{fontWeight:700,color:C.text,fontSize:"1.05rem",marginBottom:"0.4rem"}}>{ar?"تم استلام طلبك!":"Request Received!"}</p>
      <p style={{color:C.textMid,fontSize:"0.85rem"}}>{ar?"سنتواصل معك قريباً لتأكيد الموعد.":"We'll contact you shortly to confirm."}</p>
    </div>
  );

  const periods = ar
    ? [{v:"morning",l:"صباحاً"},{v:"afternoon",l:"ظهراً"},{v:"evening",l:"مساءً"}]
    : [{v:"morning",l:"Morning"},{v:"afternoon",l:"Afternoon"},{v:"evening",l:"Evening"}];

  return (
    <form onSubmit={async e => {
      e.preventDefault(); setErr(""); setLoading(true);
      const r = await submitBookingRequest({ clinicSlug:slug, patientName:name, phone, preferredDate:date, preferredPeriod:period, notes });
      setLoading(false);
      if (r.success) setDone(true); else setErr(r.error??"Error");
    }}>
      {err && <p style={{color:"#e53e3e",fontSize:"0.82rem",marginBottom:"0.75rem"}}>{err}</p>}
      {[
        {label:ar?"الاسم الكامل":"Full Name",     val:name,   set:setName,  type:"text", ph:ar?"أحمد محمد":"Ahmad Mohammad"},
        {label:ar?"رقم الهاتف":"Phone Number",   val:phone,  set:setPhone, type:"tel",  ph:"+962 7x xxx xxxx"},
      ].map(f => (
        <div key={f.label} style={{marginBottom:"0.85rem"}}>
          <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:C.textMid,marginBottom:"0.3rem",letterSpacing:"0.04em"}}>{f.label}</label>
          <input required type={f.type} value={f.val} placeholder={f.ph}
            onChange={e=>f.set(e.target.value)}
            style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"0.65rem 0.9rem",fontSize:"0.9rem",outline:"none",background:"#fff",color:C.text,boxSizing:"border-box",transition:"border 0.2s"}}
            onFocus={e=>e.currentTarget.style.borderColor=C.primary}
            onBlur={e=>e.currentTarget.style.borderColor=C.border}
          />
        </div>
      ))}
      <div style={{marginBottom:"0.85rem"}}>
        <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:C.textMid,marginBottom:"0.3rem",letterSpacing:"0.04em"}}>{ar?"التاريخ المفضل":"Preferred Date"}</label>
        <input required type="date" min={minDate} value={date} onChange={e=>setDate(e.target.value)}
          style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"0.65rem 0.9rem",fontSize:"0.9rem",outline:"none",background:"#fff",color:date?C.text:"#aaa",boxSizing:"border-box"}}
          onFocus={e=>e.currentTarget.style.borderColor=C.primary}
          onBlur={e=>e.currentTarget.style.borderColor=C.border}
        />
      </div>
      <div style={{marginBottom:"0.85rem"}}>
        <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:C.textMid,marginBottom:"0.3rem",letterSpacing:"0.04em"}}>{ar?"الوقت":"Time"}</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {periods.map(p=>(
            <button key={p.v} type="button" onClick={()=>setPeriod(p.v)}
              style={{padding:"0.55rem 0",borderRadius:8,border:`1.5px solid ${period===p.v?C.primary:C.border}`,background:period===p.v?C.accentLight:"#fff",color:period===p.v?C.primaryDark:C.textMid,fontWeight:period===p.v?700:400,fontSize:"0.82rem",cursor:"pointer",transition:"all 0.2s"}}>
              {p.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:"1.25rem"}}>
        <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:C.textMid,marginBottom:"0.3rem",letterSpacing:"0.04em"}}>{ar?"ملاحظات (اختياري)":"Notes (optional)"}</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
          placeholder={ar?"الأعراض أو أي معلومات مفيدة...":"Symptoms or any helpful info..."}
          style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"0.65rem 0.9rem",fontSize:"0.9rem",outline:"none",resize:"none",background:"#fff",color:C.text,boxSizing:"border-box"}}
          onFocus={e=>e.currentTarget.style.borderColor=C.primary}
          onBlur={e=>e.currentTarget.style.borderColor=C.border}
        />
      </div>
      <button type="submit" disabled={loading}
        style={{width:"100%",background:loading?C.accent:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"0.85rem",fontSize:"0.95rem",fontWeight:700,cursor:loading?"not-allowed":"pointer",letterSpacing:"0.03em",transition:"background 0.2s"}}>
        {loading?(ar?"جاري الإرسال...":"Sending..."):(ar?"أرسل طلب الحجز":"Send Booking Request")}
      </button>
    </form>
  );
}

// ── Back to top ───────────────────────────────────────────────
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({top:0,behavior:"smooth"})}
      style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",width:44,height:44,borderRadius:"50%",background:C.primary,color:"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(107,94,168,0.35)",zIndex:100,transition:"opacity 0.3s"}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
    </button>
  );
}

// ── YouTube section ───────────────────────────────────────────
function YouTubeSection({ page, doctors, lang }: { page: R; doctors: R[]; lang: string }) {
  const ar = lang==="ar";
  const ids = getAllVideoIds(page, doctors);
  const [active, setActive] = useState(0);
  if (!ids.length) return null;
  return (
    <section style={{background:C.surfaceAlt,padding:"4rem 1.5rem"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div className="fade-in" style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,marginBottom:"0.5rem"}}>{ar?"محتوى تعليمي":"Educational Content"}</div>
          <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text}}>{ar?"شاهد واستفد":"Watch & Learn"}</h2>
        </div>
        <div className="fade-in fade-in-delay-2" style={{borderRadius:18,overflow:"hidden",boxShadow:"0 12px 40px rgba(107,94,168,0.15)"}}>
          <div style={{position:"relative",paddingTop:"56.25%",background:"#000"}}>
            <iframe src={`https://www.youtube.com/embed/${ids[active]}?rel=0`}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
          </div>
        </div>
        {ids.length > 1 && (
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:"1rem"}}>
            {ids.map((_,i)=>(
              <button key={i} onClick={()=>setActive(i)}
                style={{width: i===active?28:8,height:8,borderRadius:4,border:"none",background:i===active?C.primary:C.accentLight,cursor:"pointer",transition:"all 0.3s"}}/>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Service card ──────────────────────────────────────────────
function ServiceCard({ s, ar }: { s: R; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const name = ar ? (s.name_ar||s.name_en) as string : (s.name_en||s.name_ar) as string;
  const desc = ar ? (s.description_ar||s.description_en) as string : (s.description_en||s.description_ar) as string;
  const img  = s.image_url as string;
  return (
    <div onClick={()=>desc&&setOpen(o=>!o)}
      style={{background:"#fff",borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`,cursor:desc?"pointer":"default",transition:"transform 0.2s,box-shadow 0.2s",boxShadow:"0 2px 12px rgba(107,94,168,0.06)"}}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(107,94,168,0.14)";}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(0)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 12px rgba(107,94,168,0.06)";}}>
      {img && <div style={{height:140,overflow:"hidden"}}><img src={img} alt={name} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.4s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.05)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/></div>}
      <div style={{padding:"1rem 1.1rem 1.1rem",textAlign:ar?"right":"left"}}>
        <div style={{width:28,height:3,background:C.accent,borderRadius:2,marginBottom:"0.6rem",marginLeft:ar?"auto":"0"}}/>
        <p style={{fontWeight:700,fontSize:"0.9rem",color:C.text,marginBottom:"0.3rem"}}>{name}</p>
        {desc && (
          <p style={{fontSize:"0.78rem",color:C.textMid,lineHeight:1.6,display:open?"-webkit-box":"-webkit-box",WebkitLineClamp:open?undefined:2,WebkitBoxOrient:"vertical",overflow:open?"visible":"hidden"}}>
            {desc}
          </p>
        )}
        {desc && <p style={{fontSize:"0.7rem",color:C.accent,marginTop:"0.3rem",fontWeight:600}}>{open?(ar?"إخفاء ▲":"Show less ▲"):(ar?"اقرأ المزيد ▼":"Read more ▼")}</p>}
      </div>
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────
function ReviewCard({ tm, ar }: { tm: R; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const text = ar ? (tm.comment_ar||tm.comment_en) as string : (tm.comment_en||tm.comment_ar) as string;
  const name = ar ? (tm.patient_name_ar||tm.patient_name_en) as string : (tm.patient_name_en||tm.patient_name_ar) as string;
  const rating = (tm.rating as number) ?? 5;
  return (
    <div style={{background:"#fff",borderRadius:16,padding:"1.4rem",border:`1px solid ${C.border}`,boxShadow:"0 2px 12px rgba(107,94,168,0.06)",display:"flex",flexDirection:"column",gap:"0.75rem",textAlign:ar?"right":"left",direction:ar?"rtl":"ltr"}}>
      <Stars n={rating}/>
      <p style={{fontSize:"0.85rem",color:C.textMid,lineHeight:1.7,display:"-webkit-box",WebkitLineClamp:open?undefined:3,WebkitBoxOrient:"vertical",overflow:open?"visible":"hidden",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        {text}
        {!open && <span style={{color:C.accent,fontWeight:600,marginInlineStart:4}}>▼</span>}
      </p>
      <p style={{fontWeight:700,fontSize:"0.82rem",color:C.primary}}>{name}</p>
    </div>
  );
}

function TickerReviewCard({ tm, ar }: { tm: R; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const text = ar ? (tm.comment_ar||tm.comment_en) as string : (tm.comment_en||tm.comment_ar) as string;
  const name = ar ? (tm.patient_name_ar||tm.patient_name_en) as string : (tm.patient_name_en||tm.patient_name_ar) as string;
  return (
    <div onClick={()=>setOpen(o=>!o)}
      style={{background:"#fff",borderRadius:14,padding:"1rem 1.2rem",minWidth:280,maxWidth:320,border:`1px solid ${C.border}`,boxShadow:"0 2px 12px rgba(107,94,168,0.06)",cursor:"pointer",flexShrink:0,textAlign:ar?"right":"left",direction:ar?"rtl":"ltr"}}>
      <Stars n={(tm.rating as number)??5}/>
      <p style={{fontSize:"0.82rem",color:C.textMid,lineHeight:1.6,marginTop:"0.5rem",display:open?"block":"-webkit-box",WebkitLineClamp:open?undefined:3,WebkitBoxOrient:"vertical",overflow:open?"visible":"hidden"}}>{text}</p>
      <p style={{fontWeight:700,fontSize:"0.8rem",color:C.primary,marginTop:"0.5rem"}}>{name}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN TEMPLATE
// ══════════════════════════════════════════════════════════════
export function TemplateCalm({ clinic, page, services, doctors, testimonials, customSections = [], slug }: Props) {
  const [lang, setLang] = useState((page.default_lang as string)??"ar");
  const [menuOpen, setMenuOpen] = useState(false);

  const ar = lang==="ar"; const dir = ar?"rtl":"ltr";
  const clinicName = tx(page,"hero_title_en","hero_title_ar",lang)||(ar?clinic.name_ar as string:clinic.name as string)||"";
  const tagline    = tx(page,"tagline_en","tagline_ar",lang);
  const about      = tx(page,"about_en","about_ar",lang);
  const address    = tx(page,"address_en","address_ar",lang)||clinic.address as string||"";
  const hours      = tx(page,"hours_en","hours_ar",lang);
  const phone      = (page.phone||clinic.phone) as string||"";
  const email      = (page.email||clinic.email) as string||"";
  const showTitles = !!(page.show_section_titles);
  const mapEmbed   = page.map_embed_url as string||"";

  const slideItems: Array<{img:string;name:string;title:string;bio:string}> = [];
  doctors.forEach(doc => {
    const photos = ((doc.photo_urls as string[])??[]).filter(Boolean);
    const main   = (doc.photo_url as string)||"";
    const all    = photos.length>0?photos:(main?[main]:[]);
    all.slice(0,5).forEach(img => slideItems.push({
      img,
      name:  ar?(doc.name_ar as string||doc.name_en as string):doc.name_en as string||"",
      title: String((ar?(doc.title_ar??doc.title_en):(doc.title_en??doc.title_ar))??""),
      bio:   String((ar?(doc.bio_ar??doc.bio_en):(doc.bio_en??doc.bio_ar))??"").slice(0,180),
    }));
  });
  if (!slideItems.length) {
    if (page.hero_image_url) slideItems.push({img:page.hero_image_url as string,name:clinicName,title:tagline,bio:""});
    if (page.about_image_url) slideItems.push({img:page.about_image_url as string,name:clinicName,title:ar?"مرحباً بكم":"Welcome",bio:""});
  }

  useFadeIn();
  useNavScroll();

  const socialLinks = [
    {key:"social_instagram",icon:"instagram"},{key:"social_facebook",icon:"facebook"},
    {key:"social_youtube",icon:"youtube"},{key:"social_twitter",icon:"twitter"},
    {key:"social_linkedin",icon:"linkedin"},{key:"social_tiktok",icon:"tiktok"},
  ].filter(s=>!!page[s.key]);

  const avgRating = testimonials.length ? testimonials.reduce((a,t)=>a+((t.rating as number)??5),0)/testimonials.length : null;

  const PhoneIcon = () => <svg style={{width:16,height:16,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>;
  const MailIcon  = () => <svg style={{width:16,height:16,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
  const MapIcon   = () => <svg style={{width:16,height:16,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
  const ClockIcon = () => <svg style={{width:16,height:16,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;

  return (
    <div className="clinic-page" dir={dir} style={{background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <header className="calm-nav" style={{position:"sticky",top:0,zIndex:50,background:"rgba(244,242,248,0.9)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,transition:"box-shadow 0.3s"}}>
        <style>{`.calm-nav.scrolled{box-shadow:0 4px 24px rgba(107,94,168,0.12)}`}</style>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>

          {/* Logo */}
          <a href="#" style={{display:"flex",alignItems:"center",gap:"0.7rem",textDecoration:"none"}}>
            {!!clinic.logo_url && <img src={clinic.logo_url as string} alt="" style={{height:38,width:38,objectFit:"contain",borderRadius:8}}/>}
            <div>
              <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text,letterSpacing:"-0.02em"}}>{clinicName}</div>
              {tagline && <div style={{fontSize:"0.68rem",color:C.textLight,letterSpacing:"0.05em"}}>{tagline}</div>}
            </div>
          </a>

          {/* Desktop nav */}
          <ul style={{display:"flex",gap:"1.5rem",listStyle:"none",margin:0,padding:0}} className="clinic-nav-links">
            {about    && <li><a href="#about"    style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{ar?"عنّا":"About"}</a></li>}
            {services.length>0 && <li><a href="#services" style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{ar?"خدماتنا":"Services"}</a></li>}
            {doctors.length>0  && <li><a href="#about"    style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{ar?"فريقنا":"Team"}</a></li>}
            {customSections.map(sec => {
              const title = ar?(sec.title_ar as string||sec.title_en as string):(sec.title_en as string||sec.title_ar as string);
              return title?<li key={sec.id as string}><a href={`#section-${sec.id as string}`} style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{title}</a></li>:null;
            })}
            {testimonials.length>0 && <li><a href="#reviews" style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{ar?"التقييمات":"Reviews"}</a></li>}
            <li><a href="#contact" style={{fontSize:"0.82rem",color:C.textMid,textDecoration:"none",fontWeight:500}}>{ar?"تواصل معنا":"Contact"}</a></li>
          </ul>

          <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <button onClick={()=>setLang(ar?"en":"ar")}
              style={{padding:"0.35rem 0.8rem",borderRadius:20,border:`1.5px solid ${C.border}`,background:"transparent",color:C.textMid,fontSize:"0.75rem",fontWeight:600,cursor:"pointer"}}>
              {ar?"EN":"عربي"}
            </button>
            <button id="book-cta-desktop" onClick={()=>{const el=document.getElementById("book");if(el)el.scrollIntoView({behavior:"smooth"});}}
              style={{display:"none",padding:"0.4rem 1rem",borderRadius:20,border:"none",background:C.primary,color:"#fff",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
              {ar?"احجز الآن":"Book Now"}
            </button>
            <button onClick={()=>setMenuOpen(o=>!o)} className="hamburger-btn" aria-label="Menu"
              style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.text}}>
              {menuOpen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,padding:"1rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {[
              about&&{href:"#about",label:ar?"عنّا":"About"},
              services.length>0&&{href:"#services",label:ar?"خدماتنا":"Services"},
              doctors.length>0&&{href:"#about",label:ar?"فريقنا":"Team"},
              ...customSections.map(sec=>{const t=ar?(sec.title_ar as string||sec.title_en as string):(sec.title_en as string||sec.title_ar as string);return t?{href:`#section-${sec.id as string}`,label:t}:null;}),
              testimonials.length>0&&{href:"#reviews",label:ar?"التقييمات":"Reviews"},
              {href:"#contact",label:ar?"تواصل معنا":"Contact"},
              {href:"#book",label:ar?"احجز موعداً":"Book Now"},
            ].filter(Boolean).map((item,i) => item && (
              <a key={i} href={item.href} onClick={()=>setMenuOpen(false)}
                style={{fontSize:"0.9rem",color:C.text,textDecoration:"none",fontWeight:500,padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}>
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{background:C.gradHero,minHeight:"85vh",display:"flex",alignItems:"center",padding:"4rem 1.5rem",position:"relative",overflow:"hidden"}}>
        {/* subtle circle decoration */}
        <div style={{position:"absolute",top:"-20%",right:ar?"auto":"-10%",left:ar?"-10%":"auto",width:480,height:480,borderRadius:"50%",background:"rgba(155,142,196,0.12)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:ar?"auto":"20%",right:ar?"20%":"auto",width:320,height:320,borderRadius:"50%",background:"rgba(155,142,196,0.08)",pointerEvents:"none"}}/>

        <div style={{maxWidth:1100,margin:"0 auto",width:"100%",display:"grid",gridTemplateColumns:slideItems.length?"1fr 1fr":"1fr",gap:"3rem",alignItems:"center"}}>
          {/* Text */}
          <div className="fade-in" style={{textAlign:ar?"right":"left"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",background:"rgba(155,142,196,0.2)",borderRadius:20,padding:"0.3rem 0.9rem",marginBottom:"1.5rem"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.accentLight}}/>
              <span style={{fontSize:"0.72rem",fontWeight:700,color:C.accentLight,letterSpacing:"0.15em",textTransform:"uppercase"}}>{ar?"مرحباً بكم":"Welcome"}</span>
            </div>
            <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontWeight:900,color:"#fff",lineHeight:1.15,letterSpacing:"-0.03em",marginBottom:"1.2rem"}}>{clinicName}</h1>
            {tagline && <p style={{fontSize:"clamp(1rem,2vw,1.2rem)",color:"rgba(255,255,255,0.75)",marginBottom:"2rem",fontWeight:400,lineHeight:1.6}}>{tagline}</p>}
            {avgRating && (
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"2rem",flexDirection:ar?"row-reverse":"row"}}>
                <Stars n={Math.round(avgRating)}/>
                <span style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.7)",fontWeight:500}}>{avgRating.toFixed(1)} ({testimonials.length} {ar?"تقييم":"reviews"})</span>
              </div>
            )}
            <div style={{display:"flex",gap:"0.8rem",flexWrap:"wrap",flexDirection:ar?"row-reverse":"row"}}>
              <button onClick={()=>{const el=document.getElementById("book");if(el)el.scrollIntoView({behavior:"smooth"});}}
                style={{padding:"0.85rem 2rem",borderRadius:12,border:"none",background:C.accent,color:"#fff",fontSize:"0.95rem",fontWeight:700,cursor:"pointer",boxShadow:"0 8px 24px rgba(107,94,168,0.35)",transition:"transform 0.2s"}}
                onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-2px)")}
                onMouseLeave={e=>(e.currentTarget.style.transform="translateY(0)")}>
                {ar?"احجز موعدك الآن":"Book Your Appointment"}
              </button>
              {phone && (
                <a href={`tel:${phone}`} style={{padding:"0.85rem 1.5rem",borderRadius:12,border:"1.5px solid rgba(255,255,255,0.25)",color:"#fff",fontSize:"0.9rem",fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:"0.5rem",transition:"background 0.2s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.1)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <PhoneIcon/>{phone}
                </a>
              )}
            </div>
          </div>

          {/* Photo slider */}
          {slideItems.length > 0 && (
            <div className="fade-in fade-in-delay-2" style={{display:"flex",justifyContent:"center"}}>
              <div style={{width:"min(100%,380px)",aspectRatio:"3/4",borderRadius:"2rem",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.15)"}}>
                <DocPhotoSlider photos={slideItems.map(s=>s.img)} name={slideItems[0].name} title={slideItems[0].title}/>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────── */}
      {(about||doctors.length>0) && (
        <section id="about" style={{padding:"5rem 1.5rem",background:C.bg}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            {doctors.length>0 ? (
              <div style={{display:"grid",gridTemplateColumns:doctors.length===1?"1fr 1fr":"1fr 1fr",gap:"3rem",alignItems:"center"}}>
                {/* Text side */}
                <div className="fade-in" style={{textAlign:ar?"right":"left",order:ar?1:0}}>
                  {showTitles&&<div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,marginBottom:"0.5rem"}}>{ar?"من نحن":"About Us"}</div>}
                  <div style={{width:32,height:3,background:C.accent,borderRadius:2,marginBottom:"1rem",marginLeft:ar?"auto":"0"}}/>
                  <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text,marginBottom:"1.25rem",lineHeight:1.3}}>{ar?`مرحباً بكم في ${clinicName}`:`Welcome to ${clinicName}`}</h2>
                  {about && <p style={{color:C.textMid,lineHeight:1.85,fontSize:"0.95rem",textAlign:"justify",direction:ar?"rtl":"ltr"}}>{about}</p>}
                  {doctors.map(doc => {
                    const bio = ar?(doc.bio_ar||doc.bio_en) as string:(doc.bio_en||doc.bio_ar) as string;
                    const dname = ar?(doc.name_ar||doc.name_en) as string:doc.name_en as string||"";
                    const dtitle = String((ar?(doc.title_ar??doc.title_en):(doc.title_en??doc.title_ar))??"");
                    return bio?(
                      <div key={doc.id as string} style={{marginTop:"1.5rem"}}>
                        <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.accent,marginBottom:"0.3rem"}}>{ar?"عن الطبيب":"About The Doctor"}</div>
                        <p style={{fontWeight:700,color:C.text,marginBottom:"0.5rem"}}>{dname}{dtitle&&<span style={{fontWeight:400,color:C.textMid,fontSize:"0.85rem"}}> — {dtitle}</span>}</p>
                        <p style={{color:C.textMid,lineHeight:1.8,fontSize:"0.9rem",textAlign:"justify",direction:ar?"rtl":"ltr"}}>{bio}</p>
                      </div>
                    ):null;
                  })}
                </div>
                {/* Photo side */}
                <div className="fade-in fade-in-delay-2" style={{display:"flex",justifyContent:"center",order:ar?0:1}}>
                  {(() => {
                    const doc = doctors[0];
                    const photos = ((doc.photo_urls as string[])??[]).filter(Boolean);
                    const main = (doc.photo_url as string)||"";
                    const all = photos.length>0?photos:(main?[main]:[]);
                    const dname = ar?(doc.name_ar||doc.name_en) as string:doc.name_en as string||"";
                    const dtitle = String((ar?(doc.title_ar??doc.title_en):(doc.title_en??doc.title_ar))??"");
                    return all.length>0?(
                      <div style={{width:"min(100%,360px)",aspectRatio:"3/4",borderRadius:"2rem",overflow:"hidden",boxShadow:"0 16px 48px rgba(107,94,168,0.2)",border:`1px solid ${C.border}`}}>
                        <DocPhotoSlider photos={all} name={dname} title={dtitle}/>
                      </div>
                    ):null;
                  })()}
                </div>
              </div>
            ) : (
              <div className="fade-in" style={{maxWidth:680,margin:"0 auto",textAlign:ar?"right":"left"}}>
                {showTitles&&<div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,marginBottom:"0.5rem",textAlign:"center"}}>{ar?"من نحن":"About Us"}</div>}
                <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text,marginBottom:"1.25rem",textAlign:"center"}}>{ar?`مرحباً بكم في ${clinicName}`:`Welcome to ${clinicName}`}</h2>
                <p style={{color:C.textMid,lineHeight:1.9,fontSize:"0.95rem",textAlign:"justify",direction:ar?"rtl":"ltr"}}>{about}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SERVICES ────────────────────────────────────────── */}
      {services.length>0 && (
        <section id="services" style={{padding:"5rem 1.5rem",background:C.surfaceAlt}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div className="fade-in" style={{textAlign:"center",marginBottom:"3rem"}}>
              {showTitles&&<div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,marginBottom:"0.5rem"}}>{ar?"ما نقدمه":"What We Offer"}</div>}
              <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text}}>{ar?"خدماتنا":"Our Services"}</h2>
              <div style={{width:40,height:3,background:C.accent,borderRadius:2,margin:"0.75rem auto 0"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1.25rem"}}>
              {services.map((s,i)=>(
                <div key={s.id as string} className={`fade-in fade-in-delay-${Math.min(i,4)}`}>
                  <ServiceCard s={s} ar={ar}/>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REVIEWS ─────────────────────────────────────────── */}
      {testimonials.length>0 && (
        <section id="reviews" style={{padding:"5rem 1.5rem",background:C.bg}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div className="fade-in" style={{textAlign:"center",marginBottom:"2.5rem"}}>
              {showTitles&&<div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,marginBottom:"0.5rem"}}>{ar?"آراء المرضى":"Patient Reviews"}</div>}
              <h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text}}>{ar?"ماذا يقول مرضانا":"What Patients Say"}</h2>
              <div style={{width:40,height:3,background:C.accent,borderRadius:2,margin:"0.75rem auto 0"}}/>
            </div>

            {/* Desktop grid */}
            <div className="clinic-desktop-reviews">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.25rem"}}>
                {testimonials.map((tm,i)=>(
                  <div key={tm.id as string} className={`fade-in fade-in-delay-${Math.min(i,4)}`}>
                    <ReviewCard tm={tm} ar={ar}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile ticker */}
            <div className="clinic-mobile-reviews" style={{overflow:"hidden",position:"relative"}}>
              <style>{`
                @keyframes ticker-ltr { from{transform:translateX(-50%)} to{transform:translateX(0)} }
                @keyframes ticker-rtl { from{transform:translateX(0)} to{transform:translateX(-50%)} }
                .calm-ticker-track { display:flex; gap:1rem; width:max-content; }
                .calm-ticker-ltr { animation:ticker-ltr 28s linear infinite; }
                .calm-ticker-rtl { animation:ticker-rtl 28s linear infinite; }
                .calm-ticker-track:hover { animation-play-state:paused; }
              `}</style>
              <div className={`calm-ticker-track ${ar?"calm-ticker-rtl":"calm-ticker-ltr"}`}>
                {[...testimonials,...testimonials].map((tm,i)=>(
                  <TickerReviewCard key={i} tm={tm} ar={ar}/>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CUSTOM SECTIONS ─────────────────────────────────── */}
      {customSections.map((sec, idx) => {
        const title = ar?(sec.title_ar as string||sec.title_en as string):(sec.title_en as string||sec.title_ar as string);
        const body  = ar?(sec.body_ar as string||sec.body_en as string):(sec.body_en as string||sec.body_ar as string);
        const imgUrl   = sec.image_url as string;
        const imgSide  = (sec.image_position as string)||"right";
        const sectionBg = idx%2===0?C.surfaceAlt:C.bg;
        return (
          <section key={sec.id as string} id={`section-${sec.id as string}`} style={{padding:"5rem 1.5rem",background:sectionBg}}>
            <div style={{maxWidth:1100,margin:"0 auto"}}>
              <div style={{display:"grid",gridTemplateColumns:imgUrl&&imgSide!=="top"&&imgSide!=="none"?"1fr 1fr":"1fr",gap:"3rem",alignItems:"center"}}>
                {imgUrl&&imgSide==="top"&&<div style={{borderRadius:18,overflow:"hidden",boxShadow:`0 12px 40px rgba(107,94,168,0.15)`}}><img src={imgUrl} alt={title} style={{width:"100%",objectFit:"cover",maxHeight:340}}/></div>}
                <div className="fade-in" style={{textAlign:ar?"right":"left",order:imgSide==="left"?1:0}}>
                  <div style={{width:32,height:3,background:C.accent,borderRadius:2,marginBottom:"1rem",marginLeft:ar?"auto":"0"}}/>
                  {title&&<h2 style={{fontSize:"clamp(1.3rem,2.5vw,1.8rem)",fontWeight:800,color:C.text,marginBottom:"1rem"}}>{title}</h2>}
                  {body&&<p style={{color:C.textMid,lineHeight:1.85,fontSize:"0.95rem",textAlign:"justify",direction:ar?"rtl":"ltr",whiteSpace:"pre-wrap"}}>{body}</p>}
                </div>
                {imgUrl&&imgSide!=="top"&&imgSide!=="none"&&(
                  <div className="fade-in fade-in-delay-2" style={{order:imgSide==="left"?0:1,borderRadius:18,overflow:"hidden",boxShadow:`0 12px 40px rgba(107,94,168,0.15)`}}>
                    <img src={imgUrl} alt={title} style={{width:"100%",objectFit:"cover",maxHeight:420}}/>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* ── YOUTUBE ─────────────────────────────────────────── */}
      <YouTubeSection page={page} doctors={doctors} lang={lang}/>

      {/* ── BOOKING + CONTACT ───────────────────────────────── */}
      <section id="book" style={{padding:"5rem 1.5rem",background:C.surfaceAlt}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3rem",alignItems:"start"}}>

          {/* Contact info */}
          <div id="contact" className="fade-in" style={{textAlign:ar?"right":"left"}}>
            {showTitles&&<h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",fontWeight:800,color:C.text,marginBottom:"1.5rem"}}>{ar?"نحن هنا من أجلك":"We're Here for You"}</h2>}
            <div style={{width:32,height:3,background:C.accent,borderRadius:2,marginBottom:"1.5rem",marginLeft:ar?"auto":"0"}}/>

            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {phone&&(
                <a href={`tel:${phone}`} style={{display:"flex",alignItems:"center",gap:"0.75rem",color:C.text,textDecoration:"none",flexDirection:ar?"row-reverse":"row"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <PhoneIcon/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:C.textLight,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{ar?"هاتف":"Phone"}</div>
                    <div style={{fontWeight:600,fontSize:"0.9rem"}} dir="ltr">{phone}</div>
                  </div>
                </a>
              )}
              {email&&(
                <a href={`mailto:${email}`} style={{display:"flex",alignItems:"center",gap:"0.75rem",color:C.text,textDecoration:"none",flexDirection:ar?"row-reverse":"row"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <MailIcon/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:C.textLight,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{ar?"البريد":"Email"}</div>
                    <div style={{fontWeight:600,fontSize:"0.9rem"}}>{email}</div>
                  </div>
                </a>
              )}
              {address&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",flexDirection:ar?"row-reverse":"row"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                    <MapIcon/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:C.textLight,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{ar?"العنوان":"Address"}</div>
                    <div style={{fontWeight:500,fontSize:"0.88rem",color:C.textMid,lineHeight:1.5}}>{address}</div>
                  </div>
                </div>
              )}
              {hours&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",flexDirection:ar?"row-reverse":"row"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                    <ClockIcon/>
                  </div>
                  <div>
                    <div style={{fontSize:"0.7rem",color:C.textLight,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{ar?"أوقات العمل":"Working Hours"}</div>
                    <div style={{fontWeight:500,fontSize:"0.88rem",color:C.textMid,lineHeight:1.6,whiteSpace:"pre-line"}}>{hours}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social */}
            {socialLinks.length>0&&(
              <div style={{display:"flex",gap:"0.6rem",marginTop:"1.5rem",flexDirection:ar?"row-reverse":"row",flexWrap:"wrap"}}>
                {socialLinks.map(s=>(
                  <a key={s.key} href={page[s.key] as string} target="_blank" rel="noopener noreferrer"
                    style={{width:36,height:36,borderRadius:10,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary,textDecoration:"none",transition:"background 0.2s"}}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.primary)}
                    onMouseLeave={e=>(e.currentTarget.style.background=C.accentLight)}>
                    {SI[s.icon]}
                  </a>
                ))}
              </div>
            )}

            {/* Map */}
            {mapEmbed&&(
              <div style={{marginTop:"1.5rem",borderRadius:16,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 4px 16px rgba(107,94,168,0.1)"}}>
                <iframe src={mapEmbed} width="100%" height="200" style={{border:0,display:"block"}} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
              </div>
            )}
          </div>

          {/* Booking form */}
          <div className="fade-in fade-in-delay-2">
            <div style={{background:C.surface,borderRadius:20,padding:"2rem",boxShadow:"0 8px 32px rgba(107,94,168,0.1)",border:`1px solid ${C.border}`}}>
              <div style={{width:32,height:3,background:C.accent,borderRadius:2,marginBottom:"1rem",marginLeft:ar?"auto":"0"}}/>
              <h3 style={{fontWeight:800,fontSize:"1.1rem",color:C.text,marginBottom:"0.35rem",textAlign:ar?"right":"left"}}>{ar?"احجز موعدك":"Book Your Appointment"}</h3>
              <p style={{fontSize:"0.82rem",color:C.textMid,marginBottom:"1.5rem",textAlign:ar?"right":"left"}}>{ar?"أرسل طلبك وسنتواصل معك للتأكيد":"Send your request and we'll confirm shortly"}</p>
              <BookingForm slug={slug} lang={lang}/>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{background:C.text,color:"rgba(255,255,255,0.7)",padding:"2rem 1.5rem",textAlign:"center"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <p style={{fontWeight:700,color:"#fff",marginBottom:"0.3rem",fontSize:"0.9rem"}}>{clinicName}</p>
          {tagline&&<p style={{fontSize:"0.78rem",marginBottom:"0.75rem",color:C.accent}}>{tagline}</p>}
          <p style={{fontSize:"0.75rem"}}>© {new Date().getFullYear()} · {ar?"جميع الحقوق محفوظة":"All rights reserved"}</p>
        </div>
      </footer>

      <BackToTop/>
    </div>
  );
}
