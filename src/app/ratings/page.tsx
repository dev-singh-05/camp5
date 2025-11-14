"use client";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import AdBanner from "@/components/ads";
import ProfileStats from "@/components/ProfileStats";
import TokenPurchaseModal from "@/components/tokens/TokenPurchaseModal";
import RatingsAdPopup from "@/components/RatingsAdPopup";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Users, TrendingUp, MessageSquare, X, Star, Sparkles, Lock, Search } from "lucide-react";

// Import the token purchase modal


type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  leaderboard_rank?: number;
  avg_confidence?: number | null;
  avg_humbleness?: number | null;
  avg_friendliness?: number | null;
  avg_intelligence?: number | null;
  avg_communication?: number | null;
  avg_overall_xp?: number | null;
  total_ratings?: number | null;
};

type Request = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
};

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
};

type Rating = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  comment: string;
  created_at: string;
};

const TOKENS_TO_VIEW_STATS = 10;

export default function RatingsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState<Rating[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Token system states
  const [tokenBalance, setTokenBalance] = useState(0);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [hasRatedUser, setHasRatedUser] = useState<Set<string>>(new Set());

  // Modal states
  const [showTokenUnlockModal, setShowTokenUnlockModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [isProfileRatingModal, setIsProfileRatingModal] = useState(false);
  const [isGlobalRatingModal, setIsGlobalRatingModal] = useState(false);

  // Rating states
  const [comment, setComment] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [humbleness, setHumbleness] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [overallXP, setOverallXP] = useState(0);

  // Global rating states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [globalComment, setGlobalComment] = useState("");
  const [gConfidence, setGConfidence] = useState(0);
  const [gHumbleness, setGHumbleness] = useState(0);
  const [gFriendliness, setGFriendliness] = useState(0);
  const [gIntelligence, setGIntelligence] = useState(0);
  const [gCommunication, setGCommunication] = useState(0);
  const [gOverallXP, setGOverallXP] = useState(0);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<any>(null);

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

  // Fetch token balance
  useEffect(() => {
    if (!currentUserId) return;
    async function loadBalance() {
      const { data } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setTokenBalance(data?.balance || 0);
    }
    loadBalance();
  }, [currentUserId]);

  // Check if user has rated someone
  useEffect(() => {
    if (!currentUserId) return;
    async function checkRatings() {
      const { data } = await supabase
        .from("ratings")
        .select("to_user_id")
        .eq("from_user_id", currentUserId);
      
      if (data) {
        const ratedIds = new Set(data.map(r => r.to_user_id));
        setHasRatedUser(ratedIds);
      }
    }
    checkRatings();
  }, [currentUserId]);

  // Check unlocked stats
  useEffect(() => {
    if (!currentUserId) return;
    async function checkUnlocks() {
      const { data } = await supabase
        .from("stats_unlocks")
        .select("profile_id")
        .eq("user_id", currentUserId);
      
      if (data) {
        const unlockedIds = new Set(data.map(u => u.profile_id));
        setUnlockedStats(unlockedIds);
      }
    }
    checkUnlocks();
  }, [currentUserId]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, description, profile_photo, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings");
      if (error) return console.error("Profiles fetch error:", error);
      const withRank = (data || []).map((p: any, i: number) => ({
        ...p,
        leaderboard_rank: i + 1,
      }));
      setProfiles(withRank);
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    async function fetchRequests() {
      const { data, error } = await supabase
        .from("profile_requests")
        .select("*")
        .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);
      if (error) return console.error("Requests fetch error:", error);
      setRequests(data || []);
    }
    fetchRequests();
  }, [currentUserId]);

  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

  const getRequestStatus = (userId: string): "none" | "requested" | "friends" => {
    const req = requests.find(
      (r) =>
        (r.from_user_id === currentUserId && r.to_user_id === userId) ||
        (r.to_user_id === currentUserId && r.from_user_id === userId)
    );
    if (!req) return "none";
    if (req.status === "accepted") return "friends";
    return "requested";
  };

  const canViewStats = (userId: string): boolean => {
    return unlockedStats.has(userId) || hasRatedUser.has(userId);
  };

  const handleConnectToggle = async (toUserId: string) => {
    if (!currentUserId) {
      toast.error("Login required ❌");
      return;
    }

    const existing = requests.find(
      (r) => r.from_user_id === currentUserId && r.to_user_id === toUserId
    );

    if (existing) {
      const { error } = await supabase.from("profile_requests").delete().eq("id", existing.id);
      if (error) return toast.error("Cancel failed ❌");
      setRequests((prev) => prev.filter((r) => r.id !== existing.id));
      toast("Request removed ❌");
    } else {
      const { data, error } = await supabase
        .from("profile_requests")
        .insert([{ from_user_id: currentUserId, to_user_id: toUserId, status: "pending" }])
        .select()
        .single();

      if (error) return toast.error("Send failed ❌");
      setRequests((prev) => [...prev, data]);
      toast.success("Request sent ✅");
    }
  };

  async function fetchRecentReviews(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*, from_user_id")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
    if (!error && data) setRecentReviews(data);
  }

  const openChat = async (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(true);
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages:", error);
      } else {
        setMessages(data || []);
      }

      if (subscriptionRef.current) {
        try {
          await supabase.removeChannel(subscriptionRef.current);
        } catch (err) {
          console.warn("removeChannel error:", err);
        }
        subscriptionRef.current = null;
      }

      const channelKey = [currentUserId, user.id].sort().join("-");
      const channel = supabase
        .channel(`chat-${channelKey}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_messages" },
          (payload) => {
            const msg = payload.new as Message;
            if (
              (msg.from_user_id === currentUserId && msg.to_user_id === user.id) ||
              (msg.from_user_id === user.id && msg.to_user_id === currentUserId)
            ) {
              setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    } catch (e) {
      console.error("openChat error:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      from_user_id: currentUserId,
      to_user_id: selectedUser.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("user_messages")
        .insert([
          { from_user_id: currentUserId, to_user_id: selectedUser.id, content: optimisticMsg.content },
        ])
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error("Failed to send ❌");
        console.error("message insert error:", error);
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("handleSendMessage unexpected error:", e);
      toast.error("Failed to send ❌");
    }
  };

  const handleUnlockWithTokens = async () => {
    if (!currentUserId || !selectedUser) return;
    
    if (tokenBalance < TOKENS_TO_VIEW_STATS) {
      setShowTokenUnlockModal(false);
      setShowTokenPurchaseModal(true);
      return;
    }

    const newBalance = tokenBalance - TOKENS_TO_VIEW_STATS;
    await supabase
      .from("user_tokens")
      .update({ balance: newBalance })
      .eq("user_id", currentUserId);

    await supabase
      .from("token_transactions")
      .insert([{
        user_id: currentUserId,
        amount: -TOKENS_TO_VIEW_STATS,
        type: "spend",
        status: "completed",
        description: `Unlocked stats for ${selectedUser.full_name}`
      }]);

    await supabase
      .from("stats_unlocks")
      .insert([{
        user_id: currentUserId,
        profile_id: selectedUser.id,
        unlocked_via: "tokens"
      }]);

    setTokenBalance(newBalance);
    setUnlockedStats(prev => new Set(prev).add(selectedUser.id));
    setShowTokenUnlockModal(false);
    toast.success("Stats unlocked! 💎");
  };

  const handleSubmitRating = async (toUserId: string) => {
    if (!currentUserId || !comment.trim()) {
      toast.error("Please add a comment ❌");
      return;
    }

    try {
      const { error } = await supabase
        .from("ratings")
        .insert([{
          from_user_id: currentUserId,
          to_user_id: toUserId,
          comment: comment.trim(),
          confidence,
          humbleness,
          friendliness,
          intelligence,
          communication,
          overall_xp: overallXP
        }]);

      if (error) {
        toast.error(`Failed: ${error.message} ❌`);
        return;
      }

      toast.success("Rating submitted ✅");
      setIsProfileRatingModal(false);
      setShowTokenUnlockModal(false);
      setComment("");
      setConfidence(0);
      setHumbleness(0);
      setFriendliness(0);
      setIntelligence(0);
      setCommunication(0);
      setOverallXP(0);
      
      setHasRatedUser(prev => new Set(prev).add(toUserId));
      await fetchRecentReviews(toUserId);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error occurred ❌");
    }
  };

  const handleSubmitGlobalRating = async (toUserId: string) => {
    if (!currentUserId || !globalComment.trim()) {
      toast.error("Please add a comment ❌");
      return;
    }

    try {
      const { error } = await supabase
        .from("ratings")
        .insert([{
          from_user_id: currentUserId,
          to_user_id: toUserId,
          comment: globalComment.trim(),
          confidence: gConfidence,
          humbleness: gHumbleness,
          friendliness: gFriendliness,
          intelligence: gIntelligence,
          communication: gCommunication,
          overall_xp: gOverallXP
        }]);

      if (error) {
        toast.error(`Failed: ${error.message} ❌`);
        return;
      }

      toast.success("Rating submitted ✅");
      setGlobalComment("");
      setGConfidence(0);
      setGHumbleness(0);
      setGFriendliness(0);
      setGIntelligence(0);
      setGCommunication(0);
      setGOverallXP(0);
      setSearchQuery("");
      setSearchResults([]);
      setIsGlobalRatingModal(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error occurred ❌");
    }
  };

  useEffect(() => {
    async function searchProfiles() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${searchQuery}%`);

      if (error) {
        console.error("Search error:", error);
        return;
      }

      const filtered = (data || []).filter((p: any) => p.id !== currentUserId);
      setSearchResults(filtered);
    }
    searchProfiles();
  }, [searchQuery, currentUserId]);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.id !== currentUserId &&
      (p.full_name || p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleViewStats = (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(false);
    fetchRecentReviews(user.id);
    
    const status = getRequestStatus(user.id);
    if (status === "friends" && !canViewStats(user.id)) {
      setShowTokenUnlockModal(true);
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

      {/* Ratings Ad Popup - Shows once per session */}
      <RatingsAdPopup />

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

            {/* Leaderboard Button */}
            <motion.button
              onClick={() => router.push("/ratings/leaderboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 text-white font-medium rounded-xl hover:border-cyan-500/50 shadow-lg transition-all"
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Leaderboard
            </motion.button>
          </div>
        </motion.div>

        {/* Search Section */}
        <div className="px-4 pt-4 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            {/* Search Bar - Expandable on mobile */}
            <AnimatePresence>
              {searchExpanded ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex items-center bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all shadow-lg"
                >
                  <Search className="mr-2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    placeholder="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-white placeholder-white/40 text-base"
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchExpanded(false)}
                    className="ml-2 text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  {/* Compact Search Button - Mobile only */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchExpanded(true)}
                    className="sm:hidden flex items-center justify-center w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:border-purple-500/30 shadow-lg transition-all"
                  >
                    <Search className="w-5 h-5" />
                  </motion.button>

                  {/* Full Search Bar - Desktop */}
                  <div className="hidden sm:flex flex-1 items-center bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all shadow-lg">
                    <Search className="mr-2 w-4 h-4 text-white/60" />
                    <input
                      type="text"
                      placeholder="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-white placeholder-white/40 text-base"
                    />
                  </div>
                </>
              )}
            </AnimatePresence>

            {/* Filter Button - Hidden on mobile */}
            {!searchExpanded && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex px-4 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl text-white font-medium hover:border-purple-500/50 shadow-lg transition-all"
              >
                Filter
              </motion.button>
            )}

            {/* My Connections Button - Always visible with text */}
            {!searchExpanded && (
              <motion.button
                onClick={() => router.push("/ratings/connections")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 sm:px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl text-white font-medium hover:border-emerald-500/50 shadow-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm sm:text-base">My Connections</span>
              </motion.button>
            )}
          </motion.div>

          {/* Token Balance - Mobile Optimized */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTokenPurchaseModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 hover:border-yellow-500/50 rounded-2xl transition-all mb-4 shadow-lg"
          >
            <span className="flex items-center gap-2 text-yellow-400 font-semibold">
              <Coins className="w-5 h-5" />
              Your Tokens
            </span>
            <span className="text-2xl font-bold text-yellow-400">{tokenBalance}</span>
          </motion.button>
        </div>

        {/* User List - Mobile Optimized */}
        <div className="px-4 max-w-7xl mx-auto lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleViewStats(profile)}
                className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 hover:border-purple-500/30 cursor-pointer hover:bg-white/10 transition-all shadow-lg"
              >
                {/* Avatar */}
                <motion.img
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  src={getAvatar(profile)}
                  alt={profile.full_name}
                  className="w-14 h-14 rounded-full ring-2 ring-purple-500/30 shadow-lg"
                />

                {/* Name */}
                <div className="flex-1">
                  <p className="font-semibold text-white text-base">{profile.full_name}</p>
                  {getRequestStatus(profile.id) === "friends" && canViewStats(profile.id) && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Connected
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
            ))}
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
            Ratings Dashboard
          </p>
        </motion.div>

        {/* Desktop Layout - Hidden on Mobile */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6 px-6 max-w-7xl mx-auto mt-6">
          {/* LEFT - Profile List (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {filteredProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                onClick={() => handleViewStats(profile)}
                className="flex items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10 hover:border-purple-500/30 cursor-pointer hover:bg-white/10 transition-all shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatar(profile)}
                    alt={profile.full_name}
                    className="w-12 h-12 rounded-full ring-2 ring-purple-500/30"
                  />
                  <p className="font-medium text-white">{profile.full_name}</p>
                </div>
                {getRequestStatus(profile.id) === "friends" && canViewStats(profile.id) && (
                  <span className="text-green-400 text-lg">✓</span>
                )}
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
                <div className="p-4 overflow-y-auto">
                  {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) ? (
                    <>
                      <ProfileStats 
                        user={selectedUser} 
                        getAvatar={getAvatar}
                        currentUserId={currentUserId}
                        connectionStatus={getRequestStatus(selectedUser.id)}
                        onConnect={() => handleConnectToggle(selectedUser.id)}
                        onRate={() => {}}
                        onOpenRating={() => setIsProfileRatingModal(true)}
                      />
                      
                      {/* Reviews */}
                      <div className="mb-4 mt-4">
                        <h3 className="font-semibold text-white mb-2 border-b border-white/10 pb-1">Recent Reviews</h3>
                        {recentReviews.length > 0 ? (
                          recentReviews.map((r) => (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white/5 backdrop-blur-xl p-2 rounded-lg text-sm mb-2 border border-white/10 hover:border-white/20 transition-all"
                            >
                              <p className="text-white/80">{r.comment}</p>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-white/40 text-sm">No reviews yet</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsProfileRatingModal(true)}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all text-sm sm:text-base"
                        >
                          <Star className="w-4 h-4 inline mr-2" />
                          Add Rating
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openChat(selectedUser)}
                          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all text-sm sm:text-base"
                        >
                          <MessageSquare className="w-4 h-4 inline mr-2" />
                          Message
                        </motion.button>
                      </div>
                    </>
                  ) : getRequestStatus(selectedUser.id) === "friends" ? (
                    // Stats locked - show unlock options
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <img
                        src={getAvatar(selectedUser)}
                        alt={selectedUser.full_name}
                        className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-purple-500/30"
                      />
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedUser.full_name}</h2>
                      <p className="text-white/60 mb-6">{selectedUser.description || 'No bio available'}</p>

                      <div className="text-6xl mb-4">🔒</div>
                      <p className="text-white/60 mb-6">Stats are locked. Unlock to view their ratings!</p>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTokenUnlockModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                      >
                        🔓 Unlock Stats
                      </motion.button>
                    </motion.div>
                  ) : (
                    // Not connected
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <img
                        src={getAvatar(selectedUser)}
                        alt={selectedUser.full_name}
                        className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-cyan-500/30"
                      />
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedUser.full_name}</h2>
                      <p className="text-white/60 mb-6">{selectedUser.description || 'No bio available'}</p>

                      <div className="text-4xl mb-3">🤝</div>
                      <p className="text-white/60 mb-4">Connect first to unlock stats</p>

                      {getRequestStatus(selectedUser.id) === "requested" ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleConnectToggle(selectedUser.id)}
                          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
                        >
                          Request Sent ⏳ (Cancel)
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleConnectToggle(selectedUser.id)}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-green-500/50 transition-all"
                        >
                          + Connect
                        </motion.button>
                      )}
                    </motion.div>
                  )}
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
              // No profile selected
              <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <p className="text-white/60 text-base">👈 Select a profile to view details</p>
                </motion.div>

                <div className="w-full max-w-md">
                  <AdBanner placement="ratings_page" />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Profile Overlay Modal - Screen 2 - Mobile Only */}
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

                  {/* XP and Ratings Summary */}
                  {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-bold">
                          {(selectedUser as any).avg_overall_xp?.toFixed(1) || 0} XP
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 font-bold">
                          {(selectedUser as any).total_ratings || 0} Ratings
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/40">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Stats Locked</span>
                    </div>
                  )}
                </motion.div>

                {/* Attribute Bars */}
                {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) ? (
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
                ) : (
                  <div className="mb-6 p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <div className="text-4xl mb-3">🔒</div>
                    <p className="text-white/60 text-sm mb-4">
                      {getRequestStatus(selectedUser.id) === "friends"
                        ? "Rate them to unlock detailed attributes"
                        : "Connect first to unlock stats"}
                    </p>
                    {getRequestStatus(selectedUser.id) !== "friends" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleConnectToggle(selectedUser.id)}
                        className={`px-6 py-2 rounded-xl font-semibold shadow-lg transition ${
                          getRequestStatus(selectedUser.id) === "requested"
                            ? "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                            : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-green-500/50"
                        }`}
                      >
                        {getRequestStatus(selectedUser.id) === "requested" ? "Request Sent ⏳" : "+ Connect"}
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Recent Reviews */}
                {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) && (
                  <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      Recent Reviews
                    </h3>
                    <div className="space-y-2">
                      {recentReviews.length > 0 ? (
                        recentReviews.slice(0, 3).map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/5 backdrop-blur-xl p-3 rounded-xl text-sm border border-white/10"
                          >
                            <p className="text-white/80">{r.comment}</p>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-white/40 text-sm text-center py-2">No reviews yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {getRequestStatus(selectedUser.id) === "friends" && (
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsProfileRatingModal(true);
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
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Overlay Modal - Mobile Only */}
      <AnimatePresence>
        {selectedUser && chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 lg:hidden"
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

      {/* Token Unlock Modal */}
      <AnimatePresence>
        {showTokenUnlockModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-center mb-4 text-white">Unlock Stats</h2>
              <p className="text-center text-white/60 mb-6">
                Choose how to unlock <strong className="text-white">{selectedUser.full_name}'s</strong> profile stats
              </p>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUnlockWithTokens}
                  className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-between"
                >
                  <span>Use {TOKENS_TO_VIEW_STATS} Tokens</span>
                  <Coins className="w-5 h-5" />
                </motion.button>

                <div className="text-center text-white/40 text-sm">OR</div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowTokenUnlockModal(false);
                    setIsProfileRatingModal(true);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-between"
                >
                  <span>Rate Them (Free)</span>
                  <Star className="w-5 h-5" />
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowTokenUnlockModal(false)}
                className="w-full mt-4 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 border border-white/10 transition-all"
              >
                Cancel
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token Purchase Modal */}
      {showTokenPurchaseModal && currentUserId && (
        <TokenPurchaseModal 
          userId={currentUserId} 
          onClose={() => {
            setShowTokenPurchaseModal(false);
            // Refresh token balance after closing
            async function refreshBalance() {
              const { data } = await supabase
                .from("user_tokens")
                .select("balance")
                .eq("user_id", currentUserId)
                .maybeSingle();
              if (data) setTokenBalance(data.balance);
            }
            refreshBalance();
          }} 
        />
      )}

      {/* Profile Rating Modal */}
      {isProfileRatingModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Rate {selectedUser.full_name}
            </h2>
            {[
              ["Confidence", confidence, setConfidence],
              ["Humbleness", humbleness, setHumbleness],
              ["Friendliness", friendliness, setFriendliness],
              ["Intelligence", intelligence, setIntelligence],
              ["Communication", communication, setCommunication],
            ].map(([label, value, setter]: any) => (
              <div key={label} className="mb-3">
                <label className="flex justify-between text-sm text-gray-700">
                  <span>{label}</span>
                  <span>{value}/5</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={value}
                  onChange={(e) => setter(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            ))}

            <div className="mb-4">
              <label className="flex justify-between text-sm text-gray-700">
                <span>Overall XP</span>
                <span>{overallXP}/100</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={overallXP}
                onChange={(e) => setOverallXP(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            <textarea
              placeholder="Write your review..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm mb-4 bg-gray-50 focus:ring focus:ring-indigo-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsProfileRatingModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitRating(selectedUser.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Submit & Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Rating Modal */}
      {isGlobalRatingModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Wanna Rate Someone?
            </h2>
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4 text-gray-900 bg-gray-50 focus:ring focus:ring-indigo-200"
            />
            <div className="max-h-72 overflow-y-auto space-y-3">
              {searchResults.map((user) => {
                const status = getRequestStatus(user.id);
                const isFriend = status === "friends";

                return (
                  <div key={user.id} className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">{user.full_name}</p>

                    {isFriend ? (
                      <>
                        {[
                          ["Confidence", gConfidence, setGConfidence],
                          ["Humbleness", gHumbleness, setGHumbleness],
                          ["Friendliness", gFriendliness, setGFriendliness],
                          ["Intelligence", gIntelligence, setGIntelligence],
                          ["Communication", gCommunication, setGCommunication],
                        ].map(([label, value, setter]: any) => (
                          <div key={label} className="mb-2">
                            <label className="flex justify-between text-xs text-gray-700">
                              <span>{label}</span>
                              <span>{value}/5</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="5"
                              step="0.5"
                              value={value}
                              onChange={(e) => setter(parseFloat(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        ))}

                        <div className="mb-2">
                          <label className="flex justify-between text-xs text-gray-700">
                            <span>Overall XP</span>
                            <span>{gOverallXP}/100</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={gOverallXP}
                            onChange={(e) => setGOverallXP(parseInt(e.target.value))}
                            className="w-full accent-purple-600"
                          />
                        </div>

                        <textarea
                          placeholder="Leave a comment..."
                          value={globalComment}
                          onChange={(e) => setGlobalComment(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm mb-2"
                        />

                        <button
                          onClick={() => handleSubmitGlobalRating(user.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm"
                        >
                          Submit
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectToggle(user.id)}
                        className={`w-full px-4 py-2 rounded-lg shadow text-sm font-medium ${
                          status === "requested"
                            ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {status === "requested" ? "Request Sent ⏳ (Cancel)" : "+ Connect"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsGlobalRatingModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating + Button */}
      <a
        href="#"
        role="button"
        aria-label="Open rate modal"
        onClick={(e) => {
          e.preventDefault();
          setIsGlobalRatingModal(true);
        }}
        className="animated-button1 animated-button-fixed"
      >
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        +
      </a>
    </div>
  );
}