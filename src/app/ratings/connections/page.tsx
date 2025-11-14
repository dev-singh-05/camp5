"use client";
import "../page.css";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import ProfileStats from "@/components/ProfileStats";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageSquare, Star, X, Search } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-6 relative overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto relative z-10">
        {/* 🔹 Back & Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="mb-4">
            <a
              href="#"
              role="button"
              aria-label="Go back"
              onClick={(e) => {
                e.preventDefault();
                router.back();
              }}
              className="btn btn-white btn-animated inline-block text-sm sm:text-base"
            >
              ← Back
            </a>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2 sm:gap-3">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            MY CONNECTIONS
          </h1>
        </motion.div>

        {/* 🔹 Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* LEFT: Connections list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 h-[400px] sm:h-[500px] lg:h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {profiles.length > 0 ? (
              profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  onClick={() => {
                    setSelectedUser(profile);
                    setChatOpen(false);
                  }}
                  className="flex items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10 hover:border-purple-500/30 cursor-pointer hover:bg-white/10 transition-all shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(profile)}
                      alt={profile.full_name}
                      className="w-12 h-12 rounded-full ring-2 ring-purple-500/30"
                    />
                    <div>
                      <p className="font-medium text-white">
                        {profile.full_name || profile.username}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-white/40 text-center">No connections yet</p>
            )}
          </motion.div>

          {/* RIGHT: Profile / Chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col relative p-3 sm:p-4 overflow-y-auto"
          >
            {selectedUser ? (
              !chatOpen ? (
                <div className="relative">
                  {/* 🏅 Leaderboard Rank Badge */}
                  {selectedUser.leaderboard_rank && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 text-yellow-400 font-extrabold text-lg sm:text-xl md:text-2xl rounded-bl-2xl px-3 sm:px-4 py-1 sm:py-2 shadow-lg"
                    >
                      #{selectedUser.leaderboard_rank}
                    </motion.div>
                  )}

                  {/* 🟢 Profile Stats */}
                  <ProfileStats
                    user={selectedUser}
                    getAvatar={getAvatar}
                    currentUserId={currentUserId}
                    connectionStatus="friends"
                    onConnect={() => {}}
                    onRate={() => {}}
                    onOpenRating={() => setIsModalOpen(selectedUser)}
                  />

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsModalOpen(selectedUser)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Star className="w-4 h-4" />
                      Add Rating
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openChat(selectedUser)}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </motion.button>
                  </div>
                </div>
              ) : (
                // Chat UI
                <div className="flex flex-col flex-1 h-full">
                  <div
                    className="flex items-center gap-3 p-4 border-b border-white/10 cursor-pointer hover:bg-white/5"
                    onClick={() => setChatOpen(false)}
                  >
                    <img
                      src={getAvatar(selectedUser)}
                      alt="profile"
                      className="w-10 h-10 rounded-full ring-2 ring-purple-500/30"
                    />
                    <h2 className="font-semibold text-white">
                      {selectedUser.full_name}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-2 rounded-lg text-sm max-w-[70%] relative ${msg.from_user_id === currentUserId
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-auto"
                            : "bg-white/10 backdrop-blur-xl text-white"
                          }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex p-3 border-t border-white/10">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 border border-white/10 bg-white/5 rounded-full px-3 py-2 text-sm text-white placeholder-white/40"
                      placeholder="Type a message..."
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all"
                    >
                      Send
                    </motion.button>
                  </div>
                </div>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center h-full"
              >
                <p className="text-white/60 m-auto">Select a connection to view details</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 🌟 Single User Rating Modal */}
      {isModalOpen && isModalOpen.id !== "global" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
      <a
        href="#"
        role="button"
        aria-label="Open rate modal"
        onClick={() => setIsModalOpen({ id: "global" } as any)}
        className="animated-button1 animated-button-fixed"
      >
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {/* You can keep or remove the text label; for the small circle I recommend showing just "+" */}
        +
      </a>

      {/* 🌍 Global Rating Modal */}
      {isModalOpen && isModalOpen.id === "global" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

