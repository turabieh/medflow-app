"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function FloatingChatButton({ userId, chatHref }: { userId: string; chatHref: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Initial unread count
    supabase.from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0));

    // Real-time updates
    const channel = supabase.channel(`unread:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `recipient_id=eq.${userId}`,
      }, () => setUnread(n => n + 1))
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `recipient_id=eq.${userId}`,
      }, () => {
        // Re-fetch on read
        supabase.from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("is_read", false)
          .then(({ count }) => setUnread(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Link href={chatHref}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "52px",
        height: "52px",
        background: "#1a1a1a",
        borderRadius: "50%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        textDecoration: "none",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      title="Team Chat"
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: "22px" }}>💬</span>
      {unread > 0 && (
        <span style={{
          position: "absolute",
          top: "-2px",
          right: "-2px",
          background: "#ef4444",
          color: "#fff",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          fontSize: "11px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #fff",
          fontFamily: "system-ui",
        }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
