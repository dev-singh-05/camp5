"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  getChatMessages,
  sendChatMessage,
  getRevealStatus,
  requestReveal,
  deleteMatch, // ✅ cascade delete from utils/dating.ts
} from "@/utils/dating";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [revealStatus, setRevealStatus] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 🔹 Initial load
  useEffect(() => {
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth?.user);

      const msgs = await getChatMessages(matchId);
      setMessages(msgs || []);

      const status = await getRevealStatus(matchId);
      setRevealStatus(status);

      setLoading(false);
    }
    init();
  }, [matchId]);

  // 🔹 Realtime new messages
  useEffect(() => {
    const channel = supabase
      .channel("dating_chat_" + matchId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dating_chats",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // 🔹 Send a new message
  async function handleSendMessage() {
    if (!newMessage.trim() || !user) return;
    await sendChatMessage(matchId, user.id, newMessage);
    setNewMessage("");
  }

  // 🔹 Reveal identity
  async function handleReveal() {
    if (!user) return;
    const result = await requestReveal(matchId, user.id);
    setRevealStatus(result);

    if (result.user1_reveal && result.user2_reveal) {
      const { data, error } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (!error && data) {
        const { data: users } = await supabase
          .from("profiles")
          .select(
            "id, full_name, profile_photo, dating_description, interests, year, height, looking_for"
          )
          .in("id", [data.user1_id, data.user2_id]);

        setProfiles(users || []);
      }
    }
  }

  // 🔹 Delete chat
  async function handleDeleteChat() {
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await deleteMatch(matchId); // uses utils/dating.ts
      console.log("✅ Chat fully deleted:", matchId);

      // redirect with deletedId → dashboard removes it instantly
      router.push(`/dating?deletedId=${matchId}`);
    } catch (err) {
      console.error("❌ Error deleting chat:", err);
      alert("Failed to delete chat.");
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 to-purple-100">
      {/* Header */}
      <header className="px-6 py-4 bg-white shadow flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Mystery Chat</h1>
        <div className="flex gap-3">
          <button
            onClick={handleReveal}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Reveal Identity
          </button>
          <button
            onClick={handleDeleteChat}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Delete Chat
          </button>
        </div>
      </header>

      {/* Profiles if revealed */}
      {profiles.length > 0 && (
        <div className="bg-white shadow p-4 flex gap-6 justify-center">
          {profiles.map((p) => (
            <div key={p.id} className="text-center">
              <img
                src={p.profile_photo}
                alt={p.full_name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-2"
              />
              <p className="font-semibold">{p.full_name}</p>
              <p className="text-sm text-gray-600">
                {p.year} • {p.height}
              </p>
              <p className="text-sm italic text-gray-500">
                {p.dating_description}
              </p>
              <p className="text-xs mt-1 text-gray-700">
                Interests: {p.interests?.join(", ") || "None"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_id === user?.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg shadow text-white max-w-xs ${
                msg.sender_id === user?.id ? "bg-pink-500" : "bg-gray-600"
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="p-4 bg-white border-t flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type your message..."
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
        >
          Send
        </button>
      </footer>

      {/* Reveal status */}
      {revealStatus && (
        <div className="p-3 text-center text-sm text-gray-700 bg-yellow-100">
          {revealStatus.user1_reveal && revealStatus.user2_reveal
            ? "🎉 Both identities revealed!"
            : "Waiting for both users to reveal..."}
        </div>
      )}
    </div>
  );
}
