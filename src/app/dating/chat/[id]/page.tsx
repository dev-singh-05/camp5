"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  getChatMessages,
  sendChatMessage,
  getRevealStatus,
  deleteMatch,
} from "@/utils/dating";
import { getMatchIcebreakerQuestion, type IcebreakerQuestion } from "@/utils/icebreaker";
import { MapPin, Briefcase, GraduationCap, Heart, Ruler, Wine, Cigarette, Baby, BookOpen, Sparkles } from "lucide-react";

/* ---------------------------
   Types & Helpers
   --------------------------- */

type Profile = {
  id: string;
  full_name?: string | null;
  gender?: string | null;
  year?: string | null;
  branch?: string | null;
  height?: string | null;
  profile_photo?: string | null;
  dating_description?: string | null;
  interests?: string[] | null;
  looking_for?: string | null;
  age?: number | null;
  location?: string | null;
  hometown?: string | null;
  work?: string | null;
  education?: string | null;
  exercise?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  kids?: string | null;
  religion?: string | null;
  gallery_photos?: string[] | null;
};

type ChatMessage = {
  id: string;
  match_id?: string;
  sender_id: string;
  message: string;
  created_at?: string | null;
};

type RevealStatus = {
  id?: string;
  match_id?: string;
  user1_reveal?: boolean;
  user2_reveal?: boolean;
  revealed_at?: string | null;
  created_at?: string | null;
};

function isSameDay(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function tempId() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

/* ---------------------------
   Small UI components
   --------------------------- */

function Avatar({ src, name, size = 10 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gray-200 overflow-hidden shrink-0"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {src ? (
        <img src={src} alt={name || "avatar"} className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg font-semibold text-gray-500">?</span>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  showTail = true,
  timestamp,
  prettyTime,
  profilePhoto,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showTail?: boolean;
  timestamp?: string | null;
  prettyTime?: string;
  profilePhoto?: string | null;
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-2 rounded-2xl break-words inline-block ${
            isOwn ? "bg-pink-500 text-white rounded-br-xl" : "bg-white text-gray-800 rounded-bl-xl shadow"
          }`}
        >
          <div className="whitespace-pre-wrap">{msg.message}</div>
        </div>
        <div className={`mt-1 text-xs ${isOwn ? "text-right text-gray-200" : "text-left text-gray-500"}`}>
          {prettyTime ?? (timestamp ? formatTime(timestamp) : "")}
        </div>
      </div>
      {isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
    </div>
  );
}

/* ---------------------------
   Icebreaker Question Card
   --------------------------- */

function IcebreakerCard({ question }: { question: string }) {
  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Icebreaker Question 🎉</h3>
            <p className="text-white/95 text-base leading-relaxed">{question}</p>
            <p className="text-white/70 text-sm mt-3 italic">
              Answer this question to start your conversation!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   ChatPage
   --------------------------- */

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = (params?.id as string) || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [datingCategory, setDatingCategory] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [icebreakerQuestion, setIcebreakerQuestion] = useState<IcebreakerQuestion | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pendingMapRef = useRef<Record<string, boolean>>({});

  const scrollToBottom = (smooth = true) => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    } catch {}
  };

  const checkIfNearBottom = () => {
    const el = scrollableRef.current;
    if (!el) {
      setIsNearBottom(true);
      return;
    }
    const threshold = 150;
    const pos = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsNearBottom(pos < threshold);
  };

  /* ---------------------------
     Initial load
     --------------------------- */

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const { data: auth } = await supabase.auth.getUser();
        setUser(auth?.user ?? null);

        // Fetch messages
        try {
          const msgs = await getChatMessages(matchId);
          const sorted = (msgs || []).slice().sort((a: any, b: any) => {
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            return ta - tb;
          });
          setMessages(sorted);
        } catch (err) {
          console.error("Failed to fetch chat messages:", err);
        }

        // Fetch icebreaker question
        try {
          const question = await getMatchIcebreakerQuestion(matchId);
          setIcebreakerQuestion(question);
        } catch (err) {
          console.warn("Failed to fetch icebreaker question:", err);
        }

        // Fetch reveal status
        try {
          const rs: any = await getRevealStatus(matchId);
          setRevealStatus(rs || null);
        } catch (err) {
          console.warn("getRevealStatus failed:", err);
        }

        // Fetch match + partner info with ALL fields
        try {
          const { data: matchData, error: matchErr } = await supabase
            .from("dating_matches")
            .select("dating_category, user1_id, user2_id")
            .eq("id", matchId)
            .single();

          if (!matchErr && matchData) {
            setDatingCategory(matchData.dating_category);

            const otherId = matchData.user1_id === auth?.user?.id ? matchData.user2_id : matchData.user1_id;

            // Fetch current user's gender
            if (auth?.user?.id) {
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("gender")
                .eq("id", auth.user.id)
                .single();
              if (userProfile) setUserGender(userProfile.gender);
            }

            if (otherId) {
              // Fetch COMPLETE partner profile with all fields
              const { data: partner, error: partnerErr } = await supabase
                .from("profiles")
                .select(
                  "id, full_name, gender, year, branch, height, profile_photo, dating_description, interests, age, location, hometown, work, education, exercise, drinking, smoking, kids, religion, gallery_photos"
                )
                .eq("id", otherId)
                .single();

              if (!partnerErr && partner) {
                setPartnerProfile(partner);
              } else {
                console.warn("Error fetching partner profile:", partnerErr);
              }
            }
          } else if (matchErr) {
            console.warn("Error reading match record:", matchErr);
          }
        } catch (err) {
          console.warn("Error fetching match data:", err);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 200);
      }
    }

    if (matchId) init();
  }, [matchId]);

  /* ---------------------------
     Realtime subscriptions
     --------------------------- */

  useEffect(() => {
    if (!matchId) return;

    const msgChannel = supabase
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
          const newMsg = payload.new as unknown as ChatMessage;
          if (!newMsg || !newMsg.id || !newMsg.sender_id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const tempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.sender_id === newMsg.sender_id &&
                m.message.trim() === newMsg.message.trim()
            );

            if (tempIndex !== -1) {
              const copy = prev.slice();
              copy.splice(tempIndex, 1, newMsg);
              return copy;
            }

            return [...prev, newMsg];
          });

          if (isNearBottom) setTimeout(() => scrollToBottom(true), 80);
        }
      )
      .subscribe();

    const revealChannel = supabase
      .channel("dating_reveals_" + matchId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dating_reveals",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setRevealStatus(payload.new as RevealStatus);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dating_reveals",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setRevealStatus(payload.new as RevealStatus);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(revealChannel);
      } catch (err) {
        console.warn("Error removing supabase channels:", err);
      }
    };
  }, [matchId, isNearBottom]);

  /* ---------------------------
     Send message
     --------------------------- */

  async function handleSendMessage() {
    try {
      if (!newMessage.trim() || !user) return;
      setIsSending(true);

      const optimistic: ChatMessage = {
        id: tempId(),
        match_id: matchId,
        sender_id: user.id,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
      };

      pendingMapRef.current[optimistic.id] = true;

      setMessages((prev) => [...prev, optimistic]);
      setNewMessage("");
      setTimeout(() => inputRef.current?.focus(), 20);

      try {
        const res: any = await sendChatMessage(matchId, user.id, optimistic.message);
        if (res && res.id) {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === optimistic.id);
            if (idx !== -1) {
              const copy = prev.slice();
              copy.splice(idx, 1, res);
              return copy;
            }
            if (prev.some((m) => m.id === res.id)) return prev;
            return [...prev, res];
          });
        }
      } catch (err) {
        console.error("sendChatMessage failed:", err);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        alert("Failed to send message. Check connection and try again.");
      } finally {
        delete pendingMapRef.current[optimistic.id];
        setIsSending(false);
      }
    } catch (err) {
      setIsSending(false);
      console.error("Unexpected send error:", err);
      alert("Something went wrong sending the message.");
    }
  }

  /* ---------------------------
     Reveal identity
     --------------------------- */

  async function handleReveal() {
    try {
      if (!user) {
        alert("Please log in to reveal identity.");
        return;
      }

      const { data: match, error: matchErr } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (matchErr || !match) {
        console.error("Match fetch error:", matchErr);
        alert("Could not load match details.");
        return;
      }

      const { data: existing } = await supabase
        .from("dating_reveals")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from("dating_reveals").insert([{ match_id: matchId }]);
        if (insertErr) {
          console.error("Create reveal row error:", insertErr);
          alert("Could not initialize reveal. Try again.");
          return;
        }
      }

      const fieldToUpdate = user.id === match.user1_id ? "user1_reveal" : "user2_reveal";

      const { data: result, error: updateErr } = await supabase
        .from("dating_reveals")
        .update({ [fieldToUpdate]: true })
        .eq("match_id", matchId)
        .select("user1_reveal, user2_reveal")
        .single();

      if (updateErr) {
        console.error("Reveal update error:", updateErr);
        alert("Failed to reveal identity. Try again.");
        return;
      }

      setRevealStatus(result);

      if (result?.user1_reveal && result?.user2_reveal) {
        const { data: users, error: profileErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, profile_photo, dating_description, interests, year, height, looking_for, gender, branch, age, location, hometown, work, education, exercise, drinking, smoking, kids, religion, gallery_photos"
          )
          .in("id", [match.user1_id, match.user2_id]);

        if (profileErr) console.error("Profiles fetch error:", profileErr);
        setProfiles(users || []);
      } else {
        alert("Reveal request sent! Waiting for your match to reveal their identity...");
      }
    } catch (err) {
      console.error("Unexpected reveal error:", err);
      alert("Something went wrong. Try again.");
    }
  }

  /* ---------------------------
     Delete chat
     --------------------------- */

  async function handleDeleteChat() {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await deleteMatch(matchId);
      router.push(`/dating?deletedId=${matchId}`);
    } catch (err) {
      console.error("Delete chat error:", err);
      alert("Failed to delete chat.");
    }
  }

  /* ---------------------------
     Photo & Profile visibility
     --------------------------- */

  const getPhotoVisibility = () => {
    const category = datingCategory?.toLowerCase() || "";
    const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;

    if (category === "casual" || category === "friends") {
      return { showPhoto: true };
    }

    if (category === "serious" || category === "fun" || category === "mystery") {
      return { showPhoto: bothRevealed };
    }

    return { showPhoto: bothRevealed };
  };

  const { showPhoto } = getPhotoVisibility();

  const shouldShowRevealButton = () => {
    const category = datingCategory?.toLowerCase() || "";
    return category !== "casual" && category !== "friends";
  };

  const getProfileLockStatus = () => {
    const category = datingCategory?.toLowerCase() || "";

    if (category === "casual" || category === "friends") {
      return { locked: false };
    }

    if (category === "serious" || category === "fun" || category === "mystery") {
      const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;
      return { locked: !bothRevealed };
    }

    return { locked: true };
  };

  const { locked } = getProfileLockStatus();

  /* ---------------------------
     Render messages
     --------------------------- */

  function renderMessages() {
    const nodes: any[] = [];
    let lastDate: string | null = null;

    // Always show icebreaker question first if it exists
    if (icebreakerQuestion) {
      nodes.push(
        <div key="icebreaker-question" className="mb-6">
          <IcebreakerCard question={icebreakerQuestion.question} />
        </div>
      );
    }

    if (!messages || messages.length === 0) {
      return nodes.length > 0 ? nodes : null;
    }

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const next = messages[i + 1];
      const showTail = !next || next.sender_id !== m.sender_id;

      const showDateSeparator = !lastDate || !isSameDay(lastDate, m.created_at || null);
      if (showDateSeparator) {
        nodes.push(
          <div key={`d-${m.created_at || i}`} className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="px-3 text-sm text-gray-500">{formatDate(m.created_at)}</div>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        );
        lastDate = m.created_at || null;
      }

      const isOwn = m.sender_id === user?.id;
      nodes.push(
        <div key={m.id} className="mb-3">
          <MessageBubble
            msg={m}
            isOwn={isOwn}
            showTail={showTail}
            timestamp={m.created_at}
            prettyTime={m.created_at ? formatTime(m.created_at) : undefined}
            profilePhoto={isOwn ? undefined : showPhoto ? partnerProfile?.profile_photo : undefined}
          />
        </div>
      );
    }

    return nodes;
  }

  useEffect(() => {
    const el = scrollableRef.current;
    if (!el) return;
    const handler = () => checkIfNearBottom();
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      setTimeout(() => scrollToBottom(true), 120);
    }
  }, [messages, isNearBottom]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading chat...</p>
      </div>
    );
  }

  const hasMessages = messages && messages.length > 0;
  const showIcebreaker = icebreakerQuestion && !hasMessages;

  /* ---------------------------
     Final render
     --------------------------- */

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 to-purple-100">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 bg-white/90 backdrop-blur-sm border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back" className="p-2 rounded-lg hover:bg-gray-100" title="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <Avatar
              src={showPhoto ? partnerProfile?.profile_photo : undefined}
              name={partnerProfile?.full_name || undefined}
              size={10}
            />
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {locked ? "Mystery Match" : partnerProfile?.full_name || "Mystery Match"}
              </div>
              <div className="text-xs text-gray-500">
                {datingCategory ? `${datingCategory}` : "mystery chat"} • {revealStatus?.user1_reveal && revealStatus?.user2_reveal ? "Revealed" : "Hidden"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!locked) setShowProfileModal(true);
            }}
            disabled={locked}
            title={locked ? "Profile locked - reveal identities to unlock" : "View your match's profile"}
            className={`px-3 py-1 rounded-lg font-medium text-sm ${
              locked ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-pink-500 text-white hover:bg-pink-600"
            }`}
          >
            {locked ? "View Profile (Locked)" : "View Profile"}
          </button>

          {shouldShowRevealButton() && (
            <button onClick={handleReveal} className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
              Reveal Identity
            </button>
          )}

          <button onClick={handleDeleteChat} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
            Delete
          </button>
        </div>
      </header>

      {/* Reveal banner */}
      {shouldShowRevealButton() && revealStatus && (
        <div className="px-4 py-2 bg-yellow-100 text-yellow-900 text-sm text-center">
          {revealStatus.user1_reveal && revealStatus.user2_reveal ? "Both identities revealed!" : "Waiting for both users to reveal..."}
        </div>
      )}

      {/* Profiles when fully revealed */}
      {profiles.length > 0 && (
        <div className="bg-white shadow p-4 flex gap-6 justify-center overflow-x-auto">
          {profiles.map((p) => (
            <div key={p.id} className="text-center">
              <img src={p.profile_photo || "/images/avatar-placeholder.png"} alt={p.full_name || "Profile"} className="w-20 h-20 rounded-full object-cover mx-auto mb-2" />
              <p className="font-semibold">{p.full_name}</p>
              <p className="text-sm text-gray-600">{p.year} • {p.height}</p>
              <p className="text-sm italic text-gray-500 max-w-xs mt-1">{p.dating_description}</p>
              <p className="text-xs mt-1 text-gray-700">Interests: {(p.interests || []).join(", ") || "None"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <main ref={scrollableRef} className="flex-1 overflow-y-auto p-6 space-y-3" onScroll={() => checkIfNearBottom()} aria-live="polite">
        <div className="max-w-3xl mx-auto">
          {/* Show icebreaker question at the top if no messages yet */}
          {showIcebreaker && <IcebreakerCard question={icebreakerQuestion.question} />}
          
          {/* Show messages or empty state */}
          {hasMessages ? (
            renderMessages()
          ) : !showIcebreaker ? (
            <div className="text-center text-gray-500 mt-6">No messages yet — say hi 👋</div>
          ) : null}
        </div>
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 z-30 bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="chat-input" className="sr-only">Type your message</label>
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Type your message..."
              className="w-full border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`px-4 py-2 rounded-full text-white font-medium ${!newMessage.trim() || isSending ? "bg-gray-300" : "bg-pink-500 hover:bg-pink-600"}`}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </footer>

      {/* ENHANCED PROFILE MODAL with all fields */}
      {showProfileModal && partnerProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with Cover Photo Effect */}
            <div className="relative h-32 bg-gradient-to-r from-pink-400 to-purple-500 rounded-t-3xl">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Profile Photo */}
            <div className="relative -mt-16 mb-4 flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                {locked ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                    🔒
                  </div>
                ) : (
                  <img
                    src={partnerProfile.profile_photo || "/images/avatar-placeholder.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Name & Basic Info */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {locked ? "🔒 Profile Locked" : partnerProfile.full_name}
                </h2>
                {!locked && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    {partnerProfile.age && <span>{partnerProfile.age} years old</span>}
                    {partnerProfile.gender && <span>• {partnerProfile.gender}</span>}
                  </div>
                )}
              </div>

              {/* Dating Bio */}
              {partnerProfile.dating_description && (
                <div className="bg-pink-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700 italic leading-relaxed">
                      "{partnerProfile.dating_description}"
                    </p>
                  </div>
                </div>
              )}

              {/* Gallery Photos */}
              {!locked && partnerProfile.gallery_photos && partnerProfile.gallery_photos.filter((p: string) => p).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    Photos
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {partnerProfile.gallery_photos.filter((p: string) => p).map((photo: string, idx: number) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Education */}
                {(partnerProfile.branch || partnerProfile.year) && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <GraduationCap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Education</p>
                      <p className="text-gray-600">
                        {partnerProfile.branch && partnerProfile.branch}
                        {partnerProfile.year && ` • ${partnerProfile.year}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Work */}
                {partnerProfile.work && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Briefcase className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Work</p>
                      <p className="text-gray-600">{partnerProfile.work}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {partnerProfile.location && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Lives in</p>
                      <p className="text-gray-600">{partnerProfile.location}</p>
                    </div>
                  </div>
                )}

                {/* Hometown */}
                {partnerProfile.hometown && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">From</p>
                      <p className="text-gray-600">{partnerProfile.hometown}</p>
                    </div>
                  </div>
                )}

                {/* Height */}
                {partnerProfile.height && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Ruler className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Height</p>
                      <p className="text-gray-600">{partnerProfile.height}</p>
                    </div>
                  </div>
                )}

                {/* Religion */}
                {partnerProfile.religion && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <BookOpen className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Religion</p>
                      <p className="text-gray-600">{partnerProfile.religion}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lifestyle Section */}
              {(partnerProfile.exercise || partnerProfile.drinking || partnerProfile.smoking || partnerProfile.kids) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Lifestyle</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {partnerProfile.exercise && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="text-2xl">🏃</span>
                        <div>
                          <p className="text-xs text-gray-500">Exercise</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.exercise}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.drinking && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Wine className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-xs text-gray-500">Drinking</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.drinking}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.smoking && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Cigarette className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Smoking</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.smoking}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.kids && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Baby className="w-5 h-5 text-pink-500" />
                        <div>
                          <p className="text-xs text-gray-500">Kids</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.kids}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interests */}
              {partnerProfile.interests && partnerProfile.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {partnerProfile.interests.map((interest: string) => (
                      <span
                        key={interest}
                        className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}