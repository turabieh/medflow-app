import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";

export const dynamic = "force-dynamic";

export default async function SecretaryChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("id, full_name, clinic_id, role").eq("id", user.id).single();
  if (!profile || !["secretary","admin"].includes(profile.role ?? "")) redirect("/");

  const { data: staff } = await supabase
    .from("users").select("id, full_name, role")
    .eq("clinic_id", profile.clinic_id)
    .in("role", ["doctor", "admin"])
    .neq("id", profile.id)
    .order("full_name");

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, sender_id, recipient_id, message, is_read, created_at, users!chat_messages_sender_id_fkey(full_name, role)")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: true })
    .limit(100);

  await supabase.from("chat_messages")
    .update({ is_read: true })
    .eq("recipient_id", profile.id)
    .eq("is_read", false);

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium text-neutral-900">Chat</h1>
      <p className="mb-5 text-sm text-neutral-500">Real-time messaging with doctors</p>
      <ChatWindow
        currentUserId={profile.id}
        currentUserName={profile.full_name}
        currentUserRole={profile.role}
        clinicId={profile.clinic_id}
        staff={staff ?? []}
        initialMessages={(messages ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
