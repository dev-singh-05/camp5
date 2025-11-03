"use client";
import "../page.css";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  leaderboard_rank?: number | null;
};

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
};

export default function ConnectionsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [comment, setComment] = useState("");
  const [ratingValues, setRatingValues] = useState<{ [key: string]: any }>({});
  const [commentValues, setCommentValues] = useState<{ [key: string]: string }>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Back button handler: prefer history back, fall back to /ratings
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/ratings");
    }
  };

  // ✅ Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ✅ Get current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  // ✅ Fetch accepted connections with real leaderboard ranks
  useEffect(() => {
    if (!currentUserId) return;

    async function fetchConnections() {
      const { data: connections, error } = await supabase
        .from("profile_requests")
        .select("*")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);

      if (error) {
        console.error("Connections fetch error:", error);
        return;
      }

      const otherUserIds = connections.map((req: any) =>
        req.from_user_id === currentUserId ? req.to_user_id : req.from_user_id
      );

      if (otherUserIds.length === 0) {
        setProfiles([]);
        return;
      }

      // Step 2: Fetch all leaderboard users
      const { data: leaderboardData } = await supabase
        .from("profiles")
        .select("id, avg_overall_xp")
        .order("avg_overall_xp", { ascending: false });

      const leaderboard: { id: string; avg_overall_xp: number | null }[] = leaderboardData || [];

      // Step 3: Fetch connected users’ full data
      const { data: connectedProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherUserIds);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      // Step 4: Attach leaderboard rank
      const rankedConnections = (connectedProfiles || []).map((profile: any) => {
        const index = leaderboard.findIndex((u) => u.id === profile.id);
        const rank = index >= 0 ? index + 1 : null;
        return { ...profile, leaderboard_rank: rank };
      });

      setProfiles(rankedConnections);
    }

    fetchConnections();
  }, [currentUserId]);

  // ✅ Avatar fallback
  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

  // ✅ Open chat
  const openChat = async (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(true);

    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("user_messages")
      .select("*")
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (error) return console.error("Messages fetch error:", error);
    setMessages(data || []);

    supabase
      .channel("user-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.from_user_id === currentUserId && msg.to_user_id === user.id) ||
            (msg.from_user_id === user.id && msg.to_user_id === currentUserId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();
  };

  // ✅ Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedUser) return;

    const tempId = Date.now().toString();
    const tempMsg: Message = {
      id: tempId,
      from_user_id: currentUserId,
      to_user_id: selectedUser.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    const { error } = await supabase.from("user_messages").insert([
      { from_user_id: currentUserId, to_user_id: selectedUser.id, content: tempMsg.content },
    ]);

    if (error) {
      toast.error("Failed to send ❌");
      console.error("Send message error:", error);
    }
  };

  // ✅ Filter connected profiles for rating modal
  const filteredConnections = profiles.filter((p) => {
    const name = (p.full_name || p.username || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // ✅ Submit rating
  const handleSubmitDetailedRating = async (toUserId: string) => {
    if (!currentUserId) return;
    const ratings = ratingValues[toUserId] || {};
    const comment = commentValues[toUserId] || "";

    const overallXP =
      ((ratings.confidence || 0) +
        (ratings.humbleness || 0) +
        (ratings.friendliness || 0) +
        (ratings.intelligence || 0) +
        (ratings.communication || 0)) *
      4;

    const { error } = await supabase.from("ratings").insert([
      {
        from_user_id: currentUserId,
        to_user_id: toUserId,
        comment,
        confidence: ratings.confidence || 0,
        humbleness: ratings.humbleness || 0,
        friendliness: ratings.friendliness || 0,
        intelligence: ratings.intelligence || 0,
        communication: ratings.communication || 0,
        overall_xp: overallXP,
      },
    ]);

    if (error) {
      console.error("Insert rating error:", error);
      toast.error("Failed to submit ❌");
    } else {
      toast.success("Rating submitted ✅");
      setRatingValues((prev) => ({ ...prev, [toUserId]: {} }));
      setCommentValues((prev) => ({ ...prev, [toUserId]: "" }));
      setIsModalOpen(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* 🔹 Back & Title */}
        <div className="flex items-center justify-between mb-6 relative">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow flex items-center justify-center"
          >
            {/* Only a symbol — no text */}
            <span className="text-2xl select-none">←</span>
          </button>
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-bold text-gray-900">
            MY CONNECTIONS
          </h1>
        </div>

        {/* 🔹 Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Connections list */}
          <div className="space-y-3">
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => {
                    setSelectedUser(profile);
                    setChatOpen(false);
                  }}
                  className="flex items-center justify-between bg-white p-4 rounded-xl shadow cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(profile)}
                      alt={profile.full_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {profile.full_name || profile.username}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No connections yet</p>
            )}
          </div>

          {/* RIGHT: Profile / Chat */}
          <div className="bg-white rounded-xl shadow h-[500px] flex flex-col relative p-4 overflow-y-auto">
            {selectedUser ? (
              !chatOpen ? (
                <div className="relative">
                  {/* 🏅 Leaderboard Rank Badge */}
                  {selectedUser.leaderboard_rank && (
                    <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 font-extrabold text-2xl rounded-bl-2xl px-4 py-2 shadow-md">
                      #{selectedUser.leaderboard_rank}
                    </div>
                  )}

                  {/* 🟢 Profile Stats */}
                  <ProfileStats user={selectedUser} getAvatar={getAvatar} />

                  {/* Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setIsModalOpen(selectedUser)}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
                    >
                      + Add Rating
                    </button>
                    <button
                      onClick={() => openChat(selectedUser)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
                    >
                      Message
                    </button>
                  </div>
                </div>
              ) : (
                // Chat UI
                <div className="flex flex-col flex-1 h-full">
                  <div
                    className="flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => setChatOpen(false)}
                  >
                    <img
                      src={getAvatar(selectedUser)}
                      alt="profile"
                      className="w-10 h-10 rounded-full"
                    />
                    <h2 className="font-semibold text-gray-900">
                      {selectedUser.full_name}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-sm max-w-[70%] relative ${
                          msg.from_user_id === currentUserId
                            ? "bg-blue-500 text-white ml-auto"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex p-3 border-t">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 border rounded-full px-3 py-2 text-sm bg-gray-100 text-gray-900"
                      placeholder="Type a message..."
                    />
                    <button
                      onClick={handleSendMessage}
                      className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-gray-500 m-auto">Select a connection to view details</p>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 Single User Rating Modal */}
      {isModalOpen && isModalOpen.id !== "global" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Rate {isModalOpen.full_name}
            </h2>

            {[{ label: "Confidence", key: "confidence" },
              { label: "Humbleness", key: "humbleness" },
              { label: "Friendliness", key: "friendliness" },
              { label: "Intelligence", key: "intelligence" },
              { label: "Communication", key: "communication" },
            ].map(({ label, key }) => (
              <div key={key} className="mb-2">
                <label className="text-xs text-gray-600">{label}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={ratingValues[isModalOpen.id]?.[key] || 0}
                  onChange={(e) =>
                    setRatingValues((prev: any) => ({
                      ...prev,
                      [isModalOpen.id]: {
                        ...(prev[isModalOpen.id] || {}),
                        [key]: parseFloat(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
                <span className="text-xs text-gray-700">
                  {ratingValues[isModalOpen.id]?.[key] || 0}/5
                </span>
              </div>
            ))}

            <textarea
              placeholder="Leave a comment..."
              value={commentValues[isModalOpen.id] || ""}
              onChange={(e) =>
                setCommentValues((prev: any) => ({
                  ...prev,
                  [isModalOpen.id]: e.target.value,
                }))
              }
              className="w-full border rounded-lg p-2 text-sm mb-3"
            />

            <button
              onClick={() => handleSubmitDetailedRating(isModalOpen.id)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium mb-2"
            >
              Submit Rating
            </button>

            <button
              onClick={() => setIsModalOpen(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ➕ Floating Global Rating Button */}
      <button
        onClick={() => setIsModalOpen({ id: "global" } as any)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-2xl rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition"
      >
        +
      </button>

      {/* 🌍 Global Rating Modal */}
      {isModalOpen && isModalOpen.id === "global" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Wanna Rate Your Connections?
            </h2>

            <input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4 text-gray-900 bg-gray-50 focus:ring focus:ring-indigo-200"
            />

            <div className="max-h-72 overflow-y-auto space-y-3">
              {filteredConnections.map((user) => (
                <div key={user.id} className="p-3 border rounded-lg">
                  <p className="font-medium mb-2">{user.full_name}</p>

                  {[{ label: "Confidence", key: "confidence" },
                    { label: "Humbleness", key: "humbleness" },
                    { label: "Friendliness", key: "friendliness" },
                    { label: "Intelligence", key: "intelligence" },
                    { label: "Communication", key: "communication" },
                  ].map(({ label, key }) => (
                    <div key={key} className="mb-2">
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={ratingValues[user.id]?.[key] || 0}
                        onChange={(e) =>
                          setRatingValues((prev: any) => ({
                            ...prev,
                            [user.id]: {
                              ...(prev[user.id] || {}),
                              [key]: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                      <span className="text-xs text-gray-700">
                        {ratingValues[user.id]?.[key] || 0}/5
                      </span>
                    </div>
                  ))}

                  <textarea
                    placeholder="Leave a comment..."
                    value={commentValues[user.id] || ""}
                    onChange={(e) =>
                      setCommentValues((prev: any) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg p-2 text-sm mb-3"
                  />

                  <button
                    onClick={() => handleSubmitDetailedRating(user.id)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Submit Rating
                  </button>
                </div>
              ))}

              {filteredConnections.length === 0 && (
                <p className="text-center text-gray-500 text-sm">
                  No connections found.
                </p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsModalOpen(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileStats({ user, getAvatar }: any) {
  const [stats, setStats] = useState<any>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings"
        )
        .eq("id", user.id)
        .single();

      if (!error && data) setStats(data);

      const { data: reviews } = await supabase
        .from("ratings")
        .select("comment, created_at")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentReviews(reviews || []);
    }
    fetchData();
  }, [user]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-5 border-b pb-3">
        <img
          src={getAvatar(user)}
          alt={user.full_name}
          className="w-20 h-20 rounded-full ring-4 ring-indigo-100"
        />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
          {stats ? (
            <p className="text-sm text-gray-600">
              ⭐{" "}
              <span className="font-semibold text-purple-600">
                {stats.avg_overall_xp?.toFixed(1) || 0}
              </span>
              /100 XP • 💬 {stats.total_ratings || 0} Ratings
            </p>
          ) : (
            <p className="text-gray-400 text-sm">Loading stats...</p>
          )}
        </div>
      </div>

      {stats && (
        <div className="space-y-2">
          {[{ label: "Confidence", key: "avg_confidence" },
            { label: "Humbleness", key: "avg_humbleness" },
            { label: "Friendliness", key: "avg_friendliness" },
            { label: "Intelligence", key: "avg_intelligence" },
            { label: "Communication", key: "avg_communication" },
          ].map(({ label, key }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span className="font-medium">{stats[key]?.toFixed(1) || 0}/5</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(stats[key] || 0) * 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 mb-2 border-b pb-1">Recent Reviews</h3>
        {recentReviews.length > 0 ? (
          recentReviews.map((r, i) => (
            <div key={i} className="bg-gray-50 p-2 rounded-lg text-sm mb-2 border">
              <p className="text-gray-700">{r.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No reviews yet</p>
        )}
      </div>
    </div>
  );
}