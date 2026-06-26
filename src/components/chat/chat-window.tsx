"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface StaffMember { id: string; full_name: string; role: string; }

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  users?: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
}

const QUICK_TASKS = [
  "Please check insurance coverage",
  "Book follow-up appointment",
  "Call patient to confirm",
  "Send lab results to patient",
  "Check if prescription is ready",
  "Reschedule today's appointment",
];

const ROLE_COLORS: Record<string, string> = {
  doctor:    "#1d4ed8",
  secretary: "#166534",
  admin:     "#6d28d9",
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function ChatWindow({ currentUserId, currentUserName, currentUserRole, clinicId, staff, initialMessages }: {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  clinicId: string;
  staff: StaffMember[];
  initialMessages: Record<string, unknown>[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages as unknown as Message[]);
  const [text, setText]         = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(staff[0]?.id ?? null);
  const [sending, setSending]   = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [unread, setUnread]     = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`chat:${clinicId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `clinic_id=eq.${clinicId}`,
      }, async (payload) => {
        const msg = payload.new as Message;
        // Fetch sender name
        const { data: sender } = await supabase
          .from("users").select("full_name, role").eq("id", msg.sender_id).single();
        const enriched = { ...msg, users: sender };
        setMessages(prev => {
          if (prev.find(m => m.id === enriched.id)) return prev;
          return [...prev, enriched];
        });
        // Mark as unread if from someone else
        if (msg.sender_id !== currentUserId) {
          setUnread(prev => new Set([...prev, msg.sender_id]));
          // Mark as read
          supabase.from("chat_messages")
            .update({ is_read: true })
            .eq("id", msg.id)
            .eq("recipient_id", currentUserId)
            .then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, currentUserId]);

  async function sendMessage(msgText: string) {
    const trimmed = msgText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("chat_messages").insert({
      clinic_id:    clinicId,
      sender_id:    currentUserId,
      recipient_id: recipientId,
      message:      trimmed,
    });
    setSending(false);
    setText("");
    setShowQuick(false);
    inputRef.current?.focus();
  }

  const recipient = staff.find(s => s.id === recipientId);
  const senderName = (msg: Message): string => {
    const u = Array.isArray(msg.users) ? msg.users[0] : msg.users;
    return u?.full_name ?? "Unknown";
  };
  const senderRole = (msg: Message): string => {
    const u = Array.isArray(msg.users) ? msg.users[0] : msg.users;
    return u?.role ?? "";
  };

  // Filter messages for this conversation
  const filtered = messages.filter(m => {
    if (!recipientId) return true; // all messages
    return (
      (m.sender_id === currentUserId && m.recipient_id === recipientId) ||
      (m.sender_id === recipientId && m.recipient_id === currentUserId) ||
      (m.recipient_id === null) // broadcast
    );
  });

  // Unread count per staff member
  const unreadByStaff = (staffId: string) =>
    messages.filter(m => m.sender_id === staffId && m.recipient_id === currentUserId && !m.is_read).length;

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 180px)", minHeight: "500px" }}>
      {/* ── Sidebar: staff list ── */}
      <div className="w-48 flex-shrink-0 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="border-b border-neutral-100 px-3 py-2.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Team</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* All / broadcast */}
          <button
            onClick={() => setRecipientId(null)}
            className={`w-full px-3 py-2.5 text-left hover:bg-neutral-50 border-b border-neutral-50 ${!recipientId ? "bg-blue-50" : ""}`}>
            <p className={`text-sm font-medium ${!recipientId ? "text-blue-700" : "text-neutral-800"}`}>Everyone</p>
            <p className="text-[10px] text-neutral-400">Clinic broadcast</p>
          </button>

          {staff.map(s => {
            const count = unreadByStaff(s.id);
            const isActive = recipientId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setRecipientId(s.id); setUnread(prev => { const n = new Set(prev); n.delete(s.id); return n; }); }}
                className={`w-full px-3 py-2.5 text-left hover:bg-neutral-50 border-b border-neutral-50 ${isActive ? "bg-blue-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-neutral-800"}`}>
                    {s.full_name.split(" ")[0]}
                  </p>
                  {count > 0 && (
                    <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0">
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 capitalize">{s.role}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <p className="text-sm font-semibold text-neutral-900">
              {recipient ? `${recipient.full_name}` : "Everyone"}
            </p>
            {recipient && (
              <span className="text-[10px] capitalize rounded-full px-2 py-0.5 font-medium"
                style={{ background: `${ROLE_COLORS[recipient.role]}20`, color: ROLE_COLORS[recipient.role] }}>
                {recipient.role}
              </span>
            )}
          </div>
          <button onClick={() => setShowQuick(s => !s)}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50">
            ⚡ Quick Tasks
          </button>
        </div>

        {/* Quick task picker */}
        {showQuick && (
          <div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2 flex flex-wrap gap-1.5">
            {QUICK_TASKS.map(task => (
              <button key={task} onClick={() => sendMessage(task)}
                className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                {task}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
              <span className="text-3xl">💬</span>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}
          {filtered.map(msg => {
            const isMe = msg.sender_id === currentUserId;
            const name = isMe ? currentUserName : senderName(msg);
            const role = isMe ? currentUserRole : senderRole(msg);
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div style={{ maxWidth: "75%" }}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold" style={{ color: ROLE_COLORS[role] ?? "#64748b" }}>
                        {name}
                      </span>
                      <span className="text-[10px] text-neutral-400 capitalize">{role}</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    isMe
                      ? "bg-neutral-900 text-white rounded-br-sm"
                      : "bg-neutral-100 text-neutral-900 rounded-bl-sm"
                  }`}>
                    {msg.message}
                  </div>
                  <div className={`text-[10px] text-neutral-400 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                    {formatTime(msg.created_at)}
                    {isMe && msg.is_read && <span className="ml-1 text-blue-400">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-neutral-100 px-3 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(text); } }}
              placeholder={`Message ${recipient?.full_name ?? "everyone"}...`}
              className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 focus:bg-white transition-colors"
            />
            <button
              onClick={() => sendMessage(text)}
              disabled={!text.trim() || sending}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors">
              {sending ? "..." : "Send"}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-neutral-400">Enter to send · ⚡ for quick tasks</p>
        </div>
      </div>
    </div>
  );
}
