"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  getChatMessages,
  sendChatMessage,
  getRevealStatus,
  requestReveal,
  deleteMatch,
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

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [datingCategory, setDatingCategory] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 🔹 Initial load
  useEffect(() => {
    async function init() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        setUser(auth?.user ?? null);

        // messages
        const msgs = await getChatMessages(matchId);
        setMessages(msgs || []);

        // reveal status
        const status = await getRevealStatus(matchId);
        setRevealStatus(status || null);

        // Fetch dating_category + partner info for this chat
        const { data: matchData, error: matchErr } = await supabase
          .from("dating_matches")
          .select("dating_category, user1_id, user2_id")
          .eq("id", matchId)
          .single();

        console.log("Match data from DB:", matchData);
        console.log("Dating category:", matchData?.dating_category);

        if (!matchErr && matchData) {
          setDatingCategory(matchData.dating_category);

          // Find partner ID
          const otherId =
            matchData.user1_id === auth?.user?.id
              ? matchData.user2_id
              : matchData.user1_id;

          // Fetch current user's gender
          if (auth?.user?.id) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("gender")
              .eq("id", auth.user.id)
              .single();
            console.log("Current user gender:", userProfile?.gender);
            if (userProfile) {
              setUserGender(userProfile.gender);
            }
          }

          if (otherId) {
            const { data: partner, error: partnerErr } = await supabase
              .from("profiles")
              .select(
                "id, full_name, gender, year, branch, height, profile_photo, dating_description, interests"
              )
              .eq("id", otherId)
              .single();

            if (!partnerErr && partner) {
              setPartnerProfile(partner);
            } else {
              console.warn("Error fetching partner profile:", partnerErr);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error("Init error:", err.message);
        } else {
          console.error("Init unknown error:", err);
        }
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    }
    init();
  }, [matchId]);

  // 🔹 Realtime new messages
  useEffect(() => {
    if (!matchId) return;

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

  // 🔹 Realtime reveal status subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
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
          setRevealStatus(payload.new);
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
          setRevealStatus(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // 🔹 Send a new message
  async function handleSendMessage() {
    try {
      if (!newMessage.trim() || !user) return;
      await sendChatMessage(matchId, user.id, newMessage);
      setNewMessage("");
    } catch (err) {
      if (err instanceof Error) {
        console.error("Send message error:", err.message);
        alert("Failed to send message: " + err.message);
      } else {
        console.error("Send message unknown error:", err);
        alert("Failed to send message.");
      }
    }
  }

  // 🔹 Reveal identity
  async function handleReveal() {
    try {
      if (!user) {
        console.warn("No authenticated user for reveal");
        alert("Please log in to reveal identity.");
        return;
      }

      console.log("Requesting reveal for match:", matchId, "user:", user.id);

      // Fetch match info first
      const { data: match, error: matchErr } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (matchErr || !match) {
        alert("Error: Could not find match details");
        return;
      }

      // Check or create reveal record
      const { data: existing } = await supabase
        .from("dating_reveals")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase
          .from("dating_reveals")
          .insert([{ match_id: matchId }]);
        if (insertErr) {
          console.error("Error creating reveal record:", insertErr);
          alert("Error initializing reveal. Please try again.");
          return;
        }
      }

      // Determine which user field to update
      const fieldToUpdate =
        user.id === match.user1_id ? "user1_reveal" : "user2_reveal";

      // Update the reveal status
      const { data: result, error: updateErr } = await supabase
        .from("dating_reveals")
        .update({ [fieldToUpdate]: true })
        .eq("match_id", matchId)
        .select("user1_reveal, user2_reveal")
        .single();

      if (updateErr) {
        console.error("Error updating reveal:", updateErr);
        alert("Failed to reveal identity. Please try again.");
        return;
      }

      console.log("Reveal status updated:", result);
      setRevealStatus(result);

      // If both revealed, fetch full profiles to show
      if (result?.user1_reveal && result?.user2_reveal) {
        try {
          const { data: users, error: profileErr } = await supabase
            .from("profiles")
            .select(
              "id, full_name, profile_photo, dating_description, interests, year, height, looking_for"
            )
            .in("id", [match.user1_id, match.user2_id]);

          if (profileErr) {
            console.error("Error fetching profiles:", profileErr);
          } else {
            console.log("Fetched profiles:", users);
            setProfiles(users || []);
          }
        } catch (errFetch) {
          console.error("Error during profiles fetch:", errFetch);
        }
      } else {
        alert("Reveal request sent! Waiting for your match to reveal their identity...");
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error("Unexpected error in handleReveal:", err.message);
        alert("Something went wrong: " + err.message);
      } else {
        console.error("Unknown error in handleReveal:", err);
        alert("Something went wrong. Please try again.");
      }
    }
  }

  // 🔹 Delete chat
  async function handleDeleteChat() {
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await deleteMatch(matchId);
      console.log("✅ Chat fully deleted:", matchId);
      router.push(`/dating?deletedId=${matchId}`);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error deleting chat:", err.message);
      } else {
        console.error("Error deleting chat (unknown):", err);
      }
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

  // Helper function to determine lock status
  const getProfileLockStatus = () => {
    const category = datingCategory?.toLowerCase() || "";
    
    console.log("Category:", category);
    console.log("User gender:", userGender);

    // Fully locked: serious, for fun & flirty
    if (category === "serious" || category === "fun") {
      console.log("Result: LOCKED");
      return { locked: true, femaleOnly: false };
    }

    // Partially locked (female only): mystery
    if (category === "mystery") {
      const isFemaleUser = userGender?.toLowerCase() === "female";
      console.log("Mystery mode - isFemaleUser:", isFemaleUser);
      return { locked: !isFemaleUser, femaleOnly: true };
    }

    // Fully unlocked: casual, friends
    console.log("Result: UNLOCKED");
    return { locked: false, femaleOnly: false };
  };

  const { locked, femaleOnly } = getProfileLockStatus();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 to-purple-100">
      {/* Header */}
      <header className="px-6 py-4 bg-white shadow flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Mystery Chat</h1>
        <div className="flex gap-3">
          {/* View Profile Button */}
          <button
            onClick={() => {
              if (!locked) {
                setShowProfileModal(true);
              }
            }}
            disabled={locked}
            title={
              locked
                ? femaleOnly
                  ? "Only female users can view this profile"
                  : "Profile locked - reveal identity to unlock"
                : "View your match's profile"
            }
            className={`px-4 py-2 rounded-lg font-medium transition ${
              locked
                ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60"
                : "bg-pink-500 text-white hover:bg-pink-600 active:scale-95"
            }`}
          >
            {locked ? "View Profile (Locked)" : "View Profile"}
          </button>

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
            ? "Both identities revealed!"
            : "Waiting for both users to reveal..."}
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && partnerProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-96 max-w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Partner's Profile
            </h2>

            {/* Profile Image */}
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-3 shadow">
              {locked ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-gray-500 italic">
                  Hidden
                </div>
              ) : (
                <img
                  src={
                    partnerProfile.profile_photo ||
                    "/images/avatar-placeholder.png"
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Info Section */}
            {locked ? (
              <div>
                <p className="text-gray-600 mb-4 italic">
                  Profile locked - Name & photo hidden
                </p>

                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  {partnerProfile.gender && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                      {partnerProfile.gender}
                    </span>
                  )}
                  {partnerProfile.branch && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {partnerProfile.branch}
                    </span>
                  )}
                  {partnerProfile.year && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {partnerProfile.year}
                    </span>
                  )}
                  {partnerProfile.height && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {partnerProfile.height}
                    </span>
                  )}
                </div>

                {partnerProfile.dating_description && (
                  <p className="text-gray-700 italic mb-3 px-2">
                    "{partnerProfile.dating_description}"
                  </p>
                )}

                {partnerProfile.interests?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-2 mb-3">
                    {partnerProfile.interests.map((i: string) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold text-lg text-gray-800">
                  {partnerProfile.full_name || "Name Hidden"}
                </p>
                <p className="text-gray-600 text-sm mb-2">
                  {partnerProfile.gender && `${partnerProfile.gender}`}{" "}
                  {partnerProfile.year && `• ${partnerProfile.year}`}{" "}
                  {partnerProfile.branch && `• ${partnerProfile.branch}`}{" "}
                  {partnerProfile.height && `• ${partnerProfile.height}`}
                </p>

                {partnerProfile.dating_description && (
                  <p className="text-gray-700 italic mb-3 px-2">
                    "{partnerProfile.dating_description}"
                  </p>
                )}

                {partnerProfile.interests?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-2 mb-3">
                    {partnerProfile.interests.map((i: string) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowProfileModal(false)}
              className="px-4 py-2 mt-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}