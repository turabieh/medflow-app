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

const ROLE_COLOR: Record<string,string> = {
  doctor:"#1d4ed8", secretary:"#166534", admin:"#6d28d9",
};

function fmt(ts: string) {
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
    : d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.01);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    master.connect(ctx.destination);
    [[523.25, 0], [783.99, 0.07]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.5, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc.connect(g); g.connect(master);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + 0.9);
    });
  } catch { /* blocked */ }
}

// ── Chat popup window ──────────────────────────────────────────────────────
function ChatPopup({ peer, currentUserId, currentUserName, currentUserRole, clinicId, quickTasks, onClose, index, isDoctor }: {
  peer: StaffMember; currentUserId: string; currentUserName: string;
  currentUserRole: string; clinicId: string; quickTasks: QuickTask[];
  onClose: () => void; index: number; isDoctor: boolean;
}) {
  const [msgs, setMsgs]           = useState<Message[]>([]);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const supabase  = createClient();

  const right = 16 + index * 324;

  useEffect(() => {
    supabase.from("chat_messages")
      .select("id, sender_id, recipient_id, message, is_read, created_at, users!chat_messages_sender_id_fkey(full_name, role)")
      .eq("clinic_id", clinicId)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true }).limit(80)
      .then(({ data }) => {
        setMsgs((data ?? []).map((m: Record<string,unknown>) => {
          const u = Array.isArray(m.users) ? (m.users as {full_name:string;role:string}[])[0] : m.users as {full_name:string;role:string}|null;
          return { ...m as unknown as Message, senderName: u?.full_name, senderRole: u?.role };
        }));
        setLoaded(true);
        supabase.from("chat_messages").update({is_read:true})
          .eq("recipient_id", currentUserId).eq("sender_id", peer.id).eq("is_read", false).then(()=>{});
      });

    const ch = supabase.channel(`popup:${currentUserId}:${peer.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages", filter:`clinic_id=eq.${clinicId}` }, async (payload) => {
        const msg = payload.new as Message;
        const ok = (msg.sender_id === currentUserId && msg.recipient_id === peer.id) ||
                   (msg.sender_id === peer.id && msg.recipient_id === currentUserId);
        if (!ok) return;
        const { data: u } = await supabase.from("users").select("full_name,role").eq("id",msg.sender_id).single();
        setMsgs(prev => prev.find(m=>m.id===msg.id) ? prev : [...prev, {...msg, senderName:u?.full_name, senderRole:u?.role}]);
        if (msg.sender_id === peer.id) supabase.from("chat_messages").update({is_read:true}).eq("id",msg.id).then(()=>{});
      })
      .on("postgres_changes", { event:"DELETE", schema:"public", table:"chat_messages", filter:`clinic_id=eq.${clinicId}` }, (payload) => {
        setMsgs(prev => prev.filter(m => m.id !== (payload.old as {id:string}).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (loaded) bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loaded]);

  async function send(msg: string) {
    const t = msg.trim(); if (!t || sending) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      clinic_id: clinicId, sender_id: currentUserId, recipient_id: peer.id, message: t,
    });
    setSending(false); setText(""); setShowTasks(false);
    inputRef.current?.focus();
  }

  async function deleteMsg(id: string) {
    setDeleting(id);
    await supabase.from("chat_messages").delete().eq("id", id);
    setMsgs(prev => prev.filter(m => m.id !== id));
    setDeleting(null);
  }

  async function clearAll() {
    if (!confirm(`Clear all messages with ${peer.full_name}?`)) return;
    await supabase.from("chat_messages").delete()
      .eq("clinic_id", clinicId)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${currentUserId})`);
    setMsgs([]);
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
        <div style={{ width:"30px", height:"30px", borderRadius:"50%", background: ROLE_COLOR[peer.role]+"30",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"800",
          color: ROLE_COLOR[peer.role], flexShrink:0 }}>
          {peer.full_name.charAt(0)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"13px", fontWeight:"700", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {peer.full_name}
          </div>
          <div style={{ fontSize:"10px", textTransform:"capitalize", color: ROLE_COLOR[peer.role] }}>{peer.role}</div>
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          {isDoctor && msgs.length > 0 && (
            <button onClick={clearAll} title="Clear all messages"
              style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#94a3b8", borderRadius:"6px", padding:"4px 8px", fontSize:"11px", cursor:"pointer" }}>
              Clear
            </button>
          )}
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:"18px", cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", maxHeight:"280px", minHeight:"200px", background:"#f8fafc" }}>
        {msgs.length === 0 && loaded && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8", fontSize:"12px" }}>Start the conversation</div>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === currentUserId;
          const isHovered = deleting === m.id;
          return (
            <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: isMe?"flex-end":"flex-start", marginBottom:"8px" }}>
              {!isMe && (
                <div style={{ fontSize:"10px", color: ROLE_COLOR[m.senderRole ?? ""] ?? "#64748b", fontWeight:"700", marginBottom:"2px" }}>
                  {m.senderName}
                </div>
              )}
              <div style={{ display:"flex", alignItems:"flex-end", gap:"4px", flexDirection: isMe?"row-reverse":"row" }}>
                <div style={{
                  background: isMe ? "#1a1a1a" : "#fff",
                  color: isMe ? "#fff" : "#1a1a1a",
                  borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding:"8px 12px", fontSize:"13px", maxWidth:"220px",
                  border: isMe ? "none" : "1px solid #e2e8f0",
                  wordBreak:"break-word",
                  opacity: isHovered ? 0.5 : 1,
                }}>{m.message}</div>
                {/* Doctor-only delete button */}
                {isDoctor && (
                  <button onClick={() => deleteMsg(m.id)} title="Delete"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1", fontSize:"12px", padding:"2px", opacity:0, transition:"opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity="1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity="0")}>
                    ✕
                  </button>
                )}
              </div>
              <div style={{ fontSize:"9px", color:"#94a3b8", marginTop:"2px" }}>
                {fmt(m.created_at)}{isMe && m.is_read && <span style={{marginLeft:"4px",color:"#3b82f6"}}>✓✓</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick tasks */}
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
        <button onClick={() => send(text)} disabled={!text.trim()||sending}
          style={{ background:"#1a1a1a", color:"#fff", border:"none", borderRadius:"8px", padding:"7px 12px", fontSize:"13px", fontWeight:"700", cursor:"pointer", opacity:!text.trim()||sending?0.4:1, flexShrink:0 }}>
          →
        </button>
      </div>
    </div>
  );
}

// ── FAB + staff picker ──────────────────────────────────────────────────────
export function FloatingChatButton({ userId, clinicId, staff, quickTasks, isDoctor }: {
  userId: string; clinicId: string;
  staff: StaffMember[]; quickTasks: QuickTask[]; isDoctor?: boolean;
}) {
  const [openPeers, setOpenPeers]   = useState<StaffMember[]>([]);
  const [showMenu, setShowMenu]     = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByPeer, setUnreadByPeer] = useState<Record<string,number>>({});
  const [lastSender, setLastSender] = useState<{name:string;role:string} | null>(null);
  const [senderTimer, setSenderTimer] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.from("users").select("full_name, role").eq("id", userId).single()
      .then(({ data }) => { setCurrentUserName(data?.full_name ?? ""); setCurrentUserRole(data?.role ?? ""); });

    // Load per-peer unread counts
    const fetchUnread = async () => {
      const { data } = await supabase.from("chat_messages")
        .select("sender_id")
        .eq("recipient_id", userId).eq("is_read", false);
      const counts: Record<string,number> = {};
      let total = 0;
      for (const m of data ?? []) {
        counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1;
        total++;
      }
      setUnreadByPeer(counts);
      setTotalUnread(total);
    };

    fetchUnread();

    const ch = supabase.channel(`fab:${userId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages",
        filter:`recipient_id=eq.${userId}` }, async (payload) => {
          const msg = payload.new as {sender_id:string};
          playChime();
          setUnreadByPeer(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id]??0)+1 }));
          setTotalUnread(n => n+1);
          const { data: u } = await supabase.from("users").select("full_name,role").eq("id",msg.sender_id).single();
          if (u) {
            setLastSender({ name: u.full_name.split(" ")[0], role: u.role });
            setSenderTimer(prev => { if (prev) clearTimeout(prev); return setTimeout(() => setLastSender(null), 5000); });
          }
        })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"chat_messages",
        filter:`recipient_id=eq.${userId}` }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  function openChat(peer: StaffMember) {
    setOpenPeers(prev => prev.find(p=>p.id===peer.id) ? prev : [...prev, peer]);
    // Clear unread for this peer
    setUnreadByPeer(prev => { const n = {...prev}; const count = n[peer.id]??0; delete n[peer.id]; setTotalUnread(t=>Math.max(0,t-count)); return n; });
    setShowMenu(false); setLastSender(null);
    if (senderTimer) clearTimeout(senderTimer);
  }

  function closeChat(peerId: string) { setOpenPeers(prev => prev.filter(p=>p.id!==peerId)); }

  return (
    <>
      {openPeers.map((peer, i) => (
        <ChatPopup key={peer.id} peer={peer}
          currentUserId={userId} currentUserName={currentUserName}
          currentUserRole={currentUserRole} clinicId={clinicId}
          quickTasks={quickTasks} onClose={() => closeChat(peer.id)}
          index={i} isDoctor={isDoctor ?? false} />
      ))}

      {/* Staff picker */}
      {showMenu && (
        <div style={{
          position:"fixed", bottom:"68px", right:"16px", zIndex:1001,
          background:"#fff", borderRadius:"16px", padding:"8px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.15)", border:"1px solid #e2e8f0",
          minWidth:"200px", fontFamily:"system-ui,-apple-system,sans-serif",
        }}>
          <div style={{ fontSize:"10px", color:"#94a3b8", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", padding:"4px 8px 8px" }}>
            Team
          </div>
          {staff.length === 0 && (
            <div style={{ padding:"12px 8px", fontSize:"12px", color:"#94a3b8" }}>No active team members</div>
          )}
          {staff.map(s => {
            const count   = unreadByPeer[s.id] ?? 0;
            const isOpen  = openPeers.some(p=>p.id===s.id);
            return (
              <button key={s.id} onClick={() => openChat(s)}
                style={{ width:"100%", background: isOpen?"#f0f9ff":"none", border:"none", borderRadius:"10px",
                  padding:"8px 10px", textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"10px", fontFamily:"inherit",
                  marginBottom:"2px" }}>
                {/* Avatar */}
                <div style={{ width:"34px", height:"34px", borderRadius:"50%", flexShrink:0,
                  background: ROLE_COLOR[s.role]+"20",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"14px", fontWeight:"800", color: ROLE_COLOR[s.role], position:"relative" }}>
                  {s.full_name.charAt(0)}
                  {/* Online dot */}
                  <div style={{ position:"absolute", bottom:0, right:0, width:"9px", height:"9px",
                    borderRadius:"50%", background:"#22c55e", border:"2px solid #fff" }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1a1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {s.full_name}
                  </div>
                  <div style={{ fontSize:"10px", color: ROLE_COLOR[s.role], textTransform:"capitalize" }}>{s.role}</div>
                </div>
                {/* Unread badge */}
                {count > 0 && (
                  <span style={{ background:"#ef4444", color:"#fff", borderRadius:"50%",
                    minWidth:"20px", height:"20px", fontSize:"11px", fontWeight:"700",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, padding:"0 3px" }}>
                    {count > 9 ? "9+" : count}
                  </span>
                )}
                {isOpen && !count && (
                  <span style={{ fontSize:"10px", color:"#22c55e", fontWeight:"700", flexShrink:0 }}>open</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Sender tooltip */}
      {lastSender && !showMenu && (
        <div style={{
          position:"fixed", bottom:"70px", right:"16px", zIndex:1002,
          background:"#1a1a1a", color:"#fff", borderRadius:"10px",
          padding:"7px 14px", fontSize:"12px", fontWeight:"600",
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)", whiteSpace:"nowrap",
          fontFamily:"system-ui,-apple-system,sans-serif",
        }}>
          <span style={{ color: ROLE_COLOR[lastSender.role] ?? "#94a3b8" }}>●</span>
          {" "}{lastSender.name} sent a message
          <div style={{ position:"absolute", bottom:"-5px", right:"18px", width:"10px", height:"10px",
            background:"#1a1a1a", transform:"rotate(45deg)", borderRadius:"2px" }} />
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { setShowMenu(s=>!s); setLastSender(null); }}
        style={{ position:"fixed", bottom:"16px", right:"16px", zIndex:1002,
          width:"44px", height:"44px", borderRadius:"50%",
          background:"#1a1a1a", border:"none", cursor:"pointer",
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"transform 0.15s" }}
        title="Team Chat"
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}
      >
        <span style={{ fontSize:"18px" }}>{showMenu ? "✕" : "💬"}</span>
        {totalUnread > 0 && (
          <span style={{ position:"absolute", top:"-3px", right:"-3px",
            background:"#ef4444", color:"#fff", borderRadius:"50%",
            width:"18px", height:"18px", fontSize:"10px", fontWeight:"700",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid #fff", fontFamily:"system-ui" }}>
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </>
  );
}
