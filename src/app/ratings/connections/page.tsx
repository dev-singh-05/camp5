"use client";
import "../page.css";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import ProfileStats from "@/components/ProfileStats";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageSquare, Star, X, Search, TrendingUp, Sparkles } from "lucide-react";

type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  leaderboard_rank?: number | null;
  avg_confidence?: number | null;
  avg_humbleness?: number | null;
  avg_friendliness?: number | null;
  avg_intelligence?: number | null;
  avg_communication?: number | null;
  avg_overall_xp?: number | null;
  total_ratings?: number | null;
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

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  // Fetch accepted connections with real leaderboard ranks
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

      // Fetch all leaderboard users
      const { data: leaderboardData } = await supabase
        .from("profiles")
        .select("id, avg_overall_xp")
        .order("avg_overall_xp", { ascending: false });

      const leaderboard: { id: string; avg_overall_xp: number | null }[] = leaderboardData || [];

      // Fetch connected users' full data
      const { data: connectedProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, description, profile_photo, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings")
        .in("id", otherUserIds);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      // Attach leaderboard rank
      const rankedConnections = (connectedProfiles || []).map((profile: any) => {
        const index = leaderboard.findIndex((u) => u.id === profile.id);
        const rank = index >= 0 ? index + 1 : null;
        return { ...profile, leaderboard_rank: rank };
      });

      setProfiles(rankedConnections);
    }

    fetchConnections();
  }, [currentUserId]);

  // Avatar fallback
  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

  // Open chat
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

  // Send message
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

  // Filter connected profiles for rating modal
  const filteredConnections = profiles.filter((p) => {
    const name = (p.full_name || p.username || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Submit rating
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white relative overflow-x-hidden">
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

      {/* Mobile-First Layout */}
      <div className="relative z-10 pb-20">
        {/* Top Bar - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
            {/* Back Button */}
            <motion.button
              onClick={() => router.back()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all shadow-lg"
            >
              ← Back
            </motion.button>

            {/* Title */}
            <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              My Connections
            </h1>

            {/* Leaderboard Button */}
            <motion.button
              onClick={() => router.push("/ratings/leaderboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 text-white font-medium rounded-xl hover:border-cyan-500/50 shadow-lg transition-all"
            >
              <TrendingUp className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Connections List - Mobile Optimized */}
        <div className="px-4 pt-4 max-w-7xl mx-auto lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {profiles.length > 0 ? (
              profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedUser(profile);
                    setChatOpen(false);
                  }}
                  className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 hover:border-purple-500/30 cursor-pointer hover:bg-white/10 transition-all shadow-lg"
                >
                  {/* Avatar */}
                  <motion.img
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    src={getAvatar(profile)}
                    alt={profile.full_name}
                    className="w-14 h-14 rounded-full ring-2 ring-purple-500/30 shadow-lg"
                  />

                  {/* Name and Rank */}
                  <div className="flex-1">
                    <p className="font-semibold text-white text-base">
                      {profile.full_name || profile.username}
                    </p>
                    {profile.leaderboard_rank && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Rank #{profile.leaderboard_rank}
                      </span>
                    )}
                  </div>

                  {/* Indicator */}
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    className="text-white/40"
                  >
                    →
                  </motion.div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Users className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <p className="text-white/40 text-base">No connections yet</p>
                <p className="text-white/30 text-sm mt-2">Start connecting with people from the ratings page</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Bottom Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-xl py-4 text-center border-t border-white/10 z-30"
        >
          <p className="text-white/50 text-sm font-medium tracking-wide">
            My Connections
          </p>
        </motion.div>

        {/* Desktop Layout - Hidden on Mobile */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6 px-6 max-w-7xl mx-auto mt-6">
          {/* LEFT - Connections List (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {profiles.map((profile, index) => (
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
                    {profile.leaderboard_rank && (
                      <span className="text-xs text-yellow-400">
                        Rank #{profile.leaderboard_rank}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* RIGHT - Profile View (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl h-[600px] flex flex-col relative overflow-hidden"
          >
            {selectedUser ? (
              !chatOpen ? (
                <div className="relative overflow-y-auto h-full p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {/* Leaderboard Rank Badge */}
                  {selectedUser.leaderboard_rank && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 text-yellow-400 font-extrabold text-2xl rounded-bl-2xl px-4 py-2 shadow-lg z-10"
                    >
                      #{selectedUser.leaderboard_rank}
                    </motion.div>
                  )}

                  {/* Profile Stats */}
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
                  <div className="flex gap-3 mt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsModalOpen(selectedUser)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Add Rating
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openChat(selectedUser)}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2"
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
                    <img src={getAvatar(selectedUser)} alt="" className="w-10 h-10 rounded-full ring-2 ring-purple-500/30" />
                    <h2 className="font-semibold text-white">{selectedUser.full_name}</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-2 rounded-lg text-sm max-w-[70%] relative ${
                          msg.from_user_id === currentUserId
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
              <div className="flex items-center justify-center h-full">
                <p className="text-white/60">Select a connection to view details</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Profile Overlay Modal */}
      <AnimatePresence>
        {selectedUser && !chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 lg:hidden"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto relative"
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <div className="p-6">
                {/* User Profile Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center mb-6 pb-6 border-b border-white/10"
                >
                  <motion.img
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    src={getAvatar(selectedUser)}
                    alt={selectedUser.full_name}
                    className="w-24 h-24 rounded-full ring-4 ring-purple-500/30 shadow-lg mb-4"
                  />
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {selectedUser.full_name}
                  </h2>
                  <p className="text-white/60 text-sm mb-3">
                    {selectedUser.description || 'No bio available'}
                  </p>

                  {/* Leaderboard Rank */}
                  {selectedUser.leaderboard_rank && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 mb-3">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">
                        Rank #{selectedUser.leaderboard_rank}
                      </span>
                    </div>
                  )}

                  {/* XP and Ratings Summary */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">
                        {selectedUser.avg_overall_xp?.toFixed(1) || 0} XP
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-cyan-400 font-bold">
                        {selectedUser.total_ratings || 0} Ratings
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Attribute Bars */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Attributes
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Confidence", key: "avg_confidence", icon: "💪", color: "from-purple-500 to-pink-500" },
                      { label: "Humbleness", key: "avg_humbleness", icon: "🙏", color: "from-blue-500 to-cyan-500" },
                      { label: "Friendliness", key: "avg_friendliness", icon: "😊", color: "from-green-500 to-emerald-500" },
                      { label: "Intelligence", key: "avg_intelligence", icon: "🧠", color: "from-yellow-500 to-orange-500" },
                      { label: "Communication", key: "avg_communication", icon: "💬", color: "from-pink-500 to-rose-500" },
                    ].map((attr, index) => {
                      const value = (selectedUser as any)[attr.key] || 0;
                      return (
                        <motion.div
                          key={attr.label}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex justify-between items-center text-sm text-white/70 mb-2">
                            <span className="flex items-center gap-2">
                              <span>{attr.icon}</span>
                              {attr.label}
                            </span>
                            <span className="font-bold text-white">{value.toFixed(1)}/5</span>
                          </div>
                          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(value / 5) * 100}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                              className={`h-full bg-gradient-to-r ${attr.color} rounded-full`}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsModalOpen(selectedUser);
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3.5 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <Star className="w-5 h-5" />
                    Add Rating
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openChat(selectedUser)}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3.5 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Message
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Overlay Modal */}
      <AnimatePresence>
        {selectedUser && chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col relative"
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setChatOpen(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
              >
                <X className="w-5 h-5" />
              </motion.button>

              {/* Chat Header */}
              <div className="flex items-center gap-3 p-6 border-b border-white/10">
                <img
                  src={getAvatar(selectedUser)}
                  alt={selectedUser.full_name}
                  className="w-12 h-12 rounded-full ring-2 ring-purple-500/30"
                />
                <div>
                  <h2 className="font-semibold text-white text-lg">{selectedUser.full_name}</h2>
                  <p className="text-white/60 text-sm">Online</p>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.from_user_id === currentUserId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-sm max-w-[75%] ${
                        msg.from_user_id === currentUserId
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-white/10 backdrop-blur-xl text-white border border-white/10"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <span className="text-[10px] opacity-70 block mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 border border-white/10 bg-white/5 rounded-full px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Type a message..."
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all font-medium"
                  >
                    Send
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Rate {isModalOpen.full_name}
            </h2>

            {[
              { label: "Confidence", key: "confidence" },
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
    </div>
  );
}
