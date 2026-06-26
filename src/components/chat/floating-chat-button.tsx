"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface StaffMember { id: string; full_name: string; role: string; }
interface QuickTask   { id: string; label: string; category: string; }
interface Message {
  id: string; sender_id: string; recipient_id: string | null;
  message: string; is_read: boolean; created_at: string;
  senderName?: string; senderRole?: string;
}


// Soft gentle chime — two overlapping sine waves, like a soft notification bell
function playNotificationBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.01);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    master.connect(ctx.destination);

    // Two harmonics for warmth
    [[523.25, 0], [783.99, 0.06]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.5, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc.connect(g);
      g.connect(master);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + 0.9);
    });
  } catch { /* audio not available */ }
}

const ROLE_COLOR: Record<string,string> = {
  doctor:"#1d4ed8", secretary:"#166534", admin:"#6d28d9",
};

function fmt(ts: string) {
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
    : d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
}

// ── Single chat window ──────────────────────────────────────────────────────
function ChatPopup({
  peer, currentUserId, currentUserName, currentUserRole, clinicId,
  quickTasks, onClose, index,
}: {
  peer: StaffMember; currentUserId: string; currentUserName: string;
  currentUserRole: string; clinicId: string;
  quickTasks: QuickTask[]; onClose: () => void; index: number;
}) {
  const [msgs, setMsgs]         = useState<Message[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const supabase  = createClient();

  // right offset: first window 16px, second 340px, etc.
  const right = 16 + index * 324;

  useEffect(() => {
    // Load history
    supabase.from("chat_messages")
      .select("id, sender_id, recipient_id, message, is_read, created_at, users!chat_messages_sender_id_fkey(full_name, role)")
      .eq("clinic_id", clinicId)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true })
      .limit(60)
      .then(({ data }) => {
        setMsgs((data ?? []).map((m: Record<string,unknown>) => {
          const u = Array.isArray(m.users) ? (m.users as {full_name:string;role:string}[])[0] : m.users as {full_name:string;role:string}|null;
          return { ...m as unknown as Message, senderName: u?.full_name, senderRole: u?.role };
        }));
        setLoaded(true);
        // Mark as read
        supabase.from("chat_messages").update({is_read:true})
          .eq("recipient_id", currentUserId).eq("sender_id", peer.id).eq("is_read", false).then(()=>{});
      });

    // Realtime
    const ch = supabase.channel(`popup:${currentUserId}:${peer.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages",
        filter:`clinic_id=eq.${clinicId}` }, async (payload) => {
        const msg = payload.new as Message;
        const isRelevant =
          (msg.sender_id === currentUserId && msg.recipient_id === peer.id) ||
          (msg.sender_id === peer.id && msg.recipient_id === currentUserId);
        if (!isRelevant) return;
        const { data: u } = await supabase.from("users").select("full_name,role").eq("id",msg.sender_id).single();
        setMsgs(prev => prev.find(m=>m.id===msg.id) ? prev : [...prev, {...msg, senderName:u?.full_name, senderRole:u?.role}]);
        if (msg.sender_id === peer.id) {
          playNotificationBeep();
          supabase.from("chat_messages").update({is_read:true}).eq("id",msg.id).then(()=>{});
        }
      }).subscribe();

    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded) bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, loaded]);

  async function send(msg: string) {
    const t = msg.trim(); if (!t || sending) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      clinic_id: clinicId, sender_id: currentUserId,
      recipient_id: peer.id, message: t,
    });
    setSending(false); setText(""); setShowTasks(false);
    inputRef.current?.focus();
  }

  const grouped = [...new Set(quickTasks.map(t=>t.category))];

  return (
    <div style={{
      position:"fixed", bottom:"72px", right:`${right}px`, zIndex:1000,
      width:"308px", background:"#fff", borderRadius:"16px",
      boxShadow:"0 8px 40px rgba(0,0,0,0.18)", border:"1px solid #e2e8f0",
      display:"flex", flexDirection:"column", overflow:"hidden",
      fontFamily:"system-ui,-apple-system,sans-serif",
    }}>
      {/* Header */}
      <div style={{ background:"#1a1a1a", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#22c55e", flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"13px", fontWeight:"700", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {peer.full_name}
          </div>
          <div style={{ fontSize:"10px", color:"#94a3b8", textTransform:"capitalize" }}>{peer.role}</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:"18px", cursor:"pointer", lineHeight:1, padding:"0 0 0 4px" }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", maxHeight:"280px", minHeight:"200px", background:"#f8fafc" }}>
        {msgs.length === 0 && loaded && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8", fontSize:"12px" }}>
            Start the conversation
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: isMe?"flex-end":"flex-start", marginBottom:"8px" }}>
              {!isMe && (
                <div style={{ fontSize:"10px", color: ROLE_COLOR[m.senderRole ?? ""] ?? "#64748b", fontWeight:"700", marginBottom:"2px" }}>
                  {m.senderName}
                </div>
              )}
              <div style={{
                background: isMe ? "#1a1a1a" : "#fff",
                color: isMe ? "#fff" : "#1a1a1a",
                borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding:"8px 12px", fontSize:"13px", maxWidth:"85%",
                border: isMe ? "none" : "1px solid #e2e8f0",
                wordBreak:"break-word",
              }}>{m.message}</div>
              <div style={{ fontSize:"9px", color:"#94a3b8", marginTop:"2px" }}>
                {fmt(m.created_at)}{isMe && m.is_read && <span style={{marginLeft:"4px",color:"#3b82f6"}}>✓✓</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick tasks panel */}
      {showTasks && quickTasks.length > 0 && (
        <div style={{ background:"#f1f5f9", borderTop:"1px solid #e2e8f0", padding:"8px 10px", maxHeight:"160px", overflowY:"auto" }}>
          {grouped.map(cat => (
            <div key={cat} style={{ marginBottom:"6px" }}>
              <div style={{ fontSize:"9px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", marginBottom:"4px" }}>{cat}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                {quickTasks.filter(t=>t.category===cat).map(t => (
                  <button key={t.id} onClick={() => send(t.label)}
                    style={{ background:"#fff", border:"1px solid #cbd5e1", borderRadius:"20px", padding:"4px 10px", fontSize:"11px", color:"#374151", cursor:"pointer", fontFamily:"inherit" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:"8px 10px", borderTop:"1px solid #e2e8f0", background:"#fff", display:"flex", gap:"6px", flexShrink:0, alignItems:"center" }}>
        {quickTasks.length > 0 && (
          <button onClick={() => setShowTasks(s=>!s)}
            style={{ background: showTasks?"#1a1a1a":"#f1f5f9", color: showTasks?"#fff":"#64748b", border:"none", borderRadius:"8px", padding:"6px 8px", fontSize:"12px", cursor:"pointer", fontWeight:"600", flexShrink:0 }}>
            ⚡
          </button>
        )}
        <input ref={inputRef} value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
          placeholder="Message..."
          style={{ flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"7px 12px", fontSize:"13px", outline:"none", fontFamily:"inherit" }}
        />
        <button onClick={() => send(text)} disabled={!text.trim() || sending}
          style={{ background:"#1a1a1a", color:"#fff", border:"none", borderRadius:"8px", padding:"7px 12px", fontSize:"12px", fontWeight:"700", cursor:"pointer", opacity: !text.trim()||sending ? 0.4 : 1, flexShrink:0 }}>
          →
        </button>
      </div>
    </div>
  );
}

// ── Main floating widget ────────────────────────────────────────────────────
export function FloatingChatButton({ userId, clinicId, staff, quickTasks }: {
  userId: string; clinicId: string;
  staff: StaffMember[]; quickTasks: QuickTask[];
}) {
  const [openPeers, setOpenPeers] = useState<StaffMember[]>([]);
  const [showMenu, setShowMenu]   = useState(false);
  const [unread, setUnread]       = useState(0);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [lastSender, setLastSender] = useState<{name:string;role:string} | null>(null);
  const [lastSenderTimer, setLastSenderTimer] = useState<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Get current user info
    supabase.from("users").select("full_name, role").eq("id", userId).single()
      .then(({ data }) => { setCurrentUserName(data?.full_name ?? ""); setCurrentUserRole(data?.role ?? ""); });

    // Unread count
    const fetchUnread = () =>
      supabase.from("chat_messages").select("id", { count:"exact", head:true })
        .eq("recipient_id", userId).eq("is_read", false)
        .then(({ count }) => setUnread(count ?? 0));

    fetchUnread();

    const ch = supabase.channel(`fab:${userId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages",
        filter:`recipient_id=eq.${userId}` }, async (payload) => {
        const msg = payload.new as {sender_id:string};
        setUnread(n => n + 1);
        playNotificationBeep();
        // Fetch sender name to show on FAB
        const { data: sender } = await supabase.from("users")
          .select("full_name, role").eq("id", msg.sender_id).single();
        if (sender) {
          setLastSender({ name: sender.full_name.split(" ")[0], role: sender.role });
          setLastSenderTimer(prev => {
            if (prev) clearTimeout(prev);
            return setTimeout(() => setLastSender(null), 5000);
          });
        }
      })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"chat_messages",
        filter:`recipient_id=eq.${userId}` }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  function openChat(peer: StaffMember) {
    setOpenPeers(prev => prev.find(p=>p.id===peer.id) ? prev : [...prev, peer]);
    setShowMenu(false);
    // Reduce unread count optimistically
    setUnread(n => Math.max(0, n - 1));
  }

  function closeChat(peerId: string) {
    setOpenPeers(prev => prev.filter(p => p.id !== peerId));
  }

  return (
    <>
      {/* Open chat windows */}
      {openPeers.map((peer, i) => (
        <ChatPopup
          key={peer.id}
          peer={peer}
          currentUserId={userId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          clinicId={clinicId}
          quickTasks={quickTasks}
          onClose={() => closeChat(peer.id)}
          index={i}
        />
      ))}

      {/* Staff picker menu */}
      {showMenu && (
        <div style={{
          position:"fixed", bottom:"64px", right:"16px", zIndex:1001,
          background:"#fff", borderRadius:"14px", padding:"8px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.15)", border:"1px solid #e2e8f0",
          minWidth:"180px", fontFamily:"system-ui,-apple-system,sans-serif",
        }}>
          <div style={{ fontSize:"10px", color:"#94a3b8", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", padding:"4px 8px 8px" }}>
            Start conversation
          </div>
          {staff.map(s => {
            const isOpen = openPeers.some(p => p.id === s.id);
            return (
              <button key={s.id} onClick={() => openChat(s)}
                style={{ width:"100%", background: isOpen?"#f0fdf4":"none", border:"none", borderRadius:"10px", padding:"8px 10px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px", fontFamily:"inherit" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"50%", background: ROLE_COLOR[s.role]+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"700", color: ROLE_COLOR[s.role], flexShrink:0 }}>
                  {s.full_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1a1a" }}>{s.full_name}</div>
                  <div style={{ fontSize:"10px", color:"#64748b", textTransform:"capitalize" }}>{s.role}</div>
                </div>
                {isOpen && <div style={{ marginLeft:"auto", fontSize:"10px", color:"#22c55e", fontWeight:"700" }}>Open</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* FAB button */}
      {/* Sender name popup above FAB */}
      {lastSender && !showMenu && (
        <div style={{
          position:"fixed", bottom:"68px", right:"16px", zIndex:1002,
          background:"#1a1a1a", color:"#fff", borderRadius:"10px",
          padding:"6px 12px", fontSize:"12px", fontWeight:"600",
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)", whiteSpace:"nowrap",
          fontFamily:"system-ui,-apple-system,sans-serif",
          animation:"fadeInUp 0.2s ease",
        }}>
          <span style={{ color: ROLE_COLOR[lastSender.role] ?? "#94a3b8" }}>●</span>
          {" "}{lastSender.name} sent a message
          <div style={{
            position:"absolute", bottom:"-5px", right:"18px",
            width:"10px", height:"10px", background:"#1a1a1a",
            transform:"rotate(45deg)", borderRadius:"2px",
          }} />
        </div>
      )}

      <button
        onClick={() => { setShowMenu(s => !s); setLastSender(null); }}
        style={{
          position:"fixed", bottom:"16px", right:"16px", zIndex:1002,
          width:"44px", height:"44px", borderRadius:"50%",
          background:"#1a1a1a", border:"none", cursor:"pointer",
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"transform 0.15s",
        }}
        title="Team Chat"
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}
      >
        <span style={{ fontSize:"18px" }}>{showMenu ? "✕" : "💬"}</span>
        {unread > 0 && (
          <span style={{
            position:"absolute", top:"-3px", right:"-3px",
            background:"#ef4444", color:"#fff", borderRadius:"50%",
            width:"18px", height:"18px", fontSize:"10px", fontWeight:"700",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid #fff", fontFamily:"system-ui",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
