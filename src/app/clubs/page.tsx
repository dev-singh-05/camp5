"use client";

import "./page.css";
// Performance optimization: Added useMemo, useCallback, and React.memo for expensive computations
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import AdBanner from "@/components/ads";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Filter, Plus, X, Star, Lock, ChevronRight, MoreVertical } from "lucide-react";
// Performance optimization: Mobile detection to disable heavy animations
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * MOBILE OPTIMIZATION NOTES:
 *
 * 🔄 Pull-to-Refresh: Ideal for clubs list refresh
 *    - Wrap the main clubs grid with PullToRefresh component
 *    - onRefresh should call fetchClubs() to refresh club list
 *    - Provides native feel when checking for new clubs
 *
 * 📱 Native Share: Add share functionality to clubs
 *    - In club details modal, add NativeShareButton to invite friends
 *    - Share club info: title={club.name}, text={club.description}, url
 *    - Example: <NativeShareButton title={club.name} text="Join my club!" />
 *
 * ⚡ Haptic Feedback: Enhance button feedback
 *    - "Join Now" button - use HapticButton with hapticType="success"
 *    - "Create Club" button - use hapticType="success"
 *    - Club card clicks - wrap in HapticButton with hapticType="light"
 *
 * 🌐 Network Status: Show offline indicator
 *    - Use useNetworkStatus() hook to detect offline state
 *    - Display banner when offline: "You're offline. Some features may not work."
 *    - Disable join/create actions when offline
 */

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
};

// Performance optimization: Extract helper functions outside component to prevent recreation on every render
const getCategoryColor = (cat: string | null) => {
  switch (cat?.toLowerCase()) {
    case "sports": return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
    case "arts": return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
    case "tech": return "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400";
    case "general": return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400";
    default: return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
  }
};

const getCategoryIcon = (cat: string | null) => {
  switch (cat?.toLowerCase()) {
    case "sports": return "⚽";
    case "arts": return "🎨";
    case "tech": return "💻";
    case "general": return "🌟";
    default: return "📁";
  }
};

// Performance optimization: Memoize ClubCard to prevent unnecessary re-renders
// This component is rendered in a loop, so memoization significantly improves performance
const ClubCard = memo(function ClubCard({
  club,
  rank,
  status,
  onClick,
  isMobile,
}: {
  club: Club;
  rank?: number;
  status?: "joined" | "requested" | "join";
  onClick: () => void;
  isMobile: boolean; // Performance: Control animations based on device
}) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // Performance optimization: Disable hover animations on mobile (touch devices don't have hover state)
      whileHover={!isMobile ? { y: -4, scale: 1.02 } : undefined}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group relative"
    >
      {/* Performance optimization: Disable infinite glow animation on mobile - saves significant CPU/GPU cycles */}
      {/* Reduced blur from blur-lg to blur-md for better performance */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-purple-500/50 transition-all overflow-hidden">
        {/* Rank Badge */}
        {rank !== undefined && (
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-purple-300">#{rank}</span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Club Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-full h-full object-cover"
              />
            ) : (
              getCategoryIcon(club.category)
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Club Name */}
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
              {club.name}
            </h3>

            {/* Category Badge */}
            {club.category && (
              <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(club.category)} border font-medium mb-3`}>
                {club.category}
              </span>
            )}

            {/* Description */}
            {club.description && (
              <p className="text-sm text-white/60 line-clamp-2 mb-3">
                {club.description}
              </p>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-between mt-4">
              {status === "joined" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm font-semibold text-green-400">Joined</span>
                </div>
              ) : status === "requested" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-sm font-semibold text-yellow-400">Requested</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl group-hover:bg-indigo-500/30 transition-all">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-400">Join</span>
                </div>
              )}

              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default function ClubsPage() {
  const router = useRouter();
  // Performance optimization: Detect mobile to disable heavy animations
  const isMobile = useIsMobile();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);

  // Create modal states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [passcode, setPasscode] = useState("");
  const [description, setDescription] = useState("");

  // Club details modal states
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  // Passcode modal states
  const [showPassModal, setShowPassModal] = useState(false);
  const [enteredPass, setEnteredPass] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [joiningClub, setJoiningClub] = useState<Club | null>(null);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Star menu state (mobile)
  const [showStarMenu, setShowStarMenu] = useState(false);

  // Fetch clubs
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, category, description, logo_url")
      .order("name", { ascending: true });

    if (!error && data) setClubs(data as Club[]);

    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    const { data: joined } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id);
    setJoinedClubIds((joined || []).map((j: any) => j.club_id));

    const { data: requested } = await supabase
      .from("club_requests")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("status", "pending");
    setRequestedClubIds((requested || []).map((r: any) => r.club_id));
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  // ✅ Handle Join with passcode flow
  const startJoin = async (club: Club) => {
    setJoiningClub(club);
    setTriesLeft(3);
    setEnteredPass("");
    setShowPassModal(true);
  };

  const handlePassSubmit = async () => {
    if (!joiningClub) return;

    const { data: clubData } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", joiningClub.id)
      .single();

    const realPass = clubData?.passcode;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    if (!realPass) {
      await supabase.from("club_members").insert([{ club_id: joiningClub.id, user_id: user.id }]);
      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      return;
    }

    if (enteredPass === realPass) {
      await supabase.from("club_members").insert([{ club_id: joiningClub.id, user_id: user.id }]);

      // Get user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send system message to club chat
      await supabase.from("messages").insert([{
        club_id: joiningClub.id,
        user_id: user.id,
        content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club via password`
      }]);

      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      return;
    }

    if (triesLeft - 1 > 0) {
      setTriesLeft(triesLeft - 1);
      setEnteredPass("");
    } else {
      setShowPassModal(false);
      setShowRequestModal(true);
    }
  };

  const handleRequest = async () => {
    if (!joiningClub) return;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    await supabase.from("club_requests").insert([
      { club_id: joiningClub.id, user_id: user.id, status: "pending" },
    ]);
    setRequestedClubIds((prev) => [...prev, joiningClub.id]);
    setShowRequestModal(false);
  };

  // Create club logic
  const handleCreate = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: newClub, error: clubError } = await supabase
      .from("clubs")
      .insert([
        {
          name,
          category,
          passcode: passcode || null,
          description: description || null,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (clubError) {
      console.error("Error creating club:", clubError.message);
      return;
    }

    if (newClub) {
      await supabase.from("club_members").insert([
        {
          club_id: newClub.id,
          user_id: user.id,
          role: "admin",
        },
      ]);
    }

    setName("");
    setCategory("");
    setPasscode("");
    setDescription("");
    setShowModal(false);
    fetchClubs();
  };

  // Performance optimization: useMemo prevents recalculating filtered clubs on every render
  // Only recalculates when clubs, filter, or search actually change
  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchesCategory =
        filter === "all" || c.category?.toLowerCase() === filter.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [clubs, filter, search]);

  // Performance optimization: useCallback for event handlers to prevent breaking ClubCard memoization
  const handleClubClick = useCallback((club: Club, rank: number) => {
    setSelectedClub(club);
    setSelectedRank(rank);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilter("all");
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Performance optimization: Simplified animations for better desktop performance */}
      {/* Desktop gets optimized smooth animations, mobile gets static gradients */}
      {/* Reduced blur from blur-3xl to blur-xl for better performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={!isMobile ? {
            scale: [1, 1.15, 1],
            opacity: [0.02, 0.04, 0.02],
          } : { opacity: 0.02 }}
          transition={!isMobile ? { duration: 25, repeat: Infinity, ease: "easeInOut" } : undefined}
          style={!isMobile ? { willChange: "transform, opacity" } : undefined}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/8 to-transparent rounded-full blur-xl"
        />
        <motion.div
          animate={!isMobile ? {
            scale: [1.15, 1, 1.15],
            opacity: [0.02, 0.04, 0.02],
          } : { opacity: 0.02 }}
          transition={!isMobile ? { duration: 30, repeat: Infinity, ease: "easeInOut" } : undefined}
          style={!isMobile ? { willChange: "transform, opacity" } : undefined}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/8 to-transparent rounded-full blur-xl"
        />
      </div>

      {/* Header - Mobile First */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                ←
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              >
                Campus Clubs
              </motion.h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/clubs/my"
                className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-500/50 rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
              >
                My Clubs
              </Link>
              <Link
                href="/clubs/leaderboard"
                className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/50 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all"
              >
                Leaderboard
              </Link>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                ←
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-bold text-white lowercase"
              >
                clubs
              </motion.h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/clubs/leaderboard"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl font-medium text-white text-sm text-center"
              >
                Leaderboard
              </Link>
              <Link
                href="/clubs/my"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl font-medium text-white text-sm text-center"
              >
                My Clubs
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        {/* Search & Filter Bar - Mobile First */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-lg" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="search clubs..."
                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all text-sm md:text-base"
                  />
                </div>

                {/* Filter - Desktop only */}
                <div className="hidden md:block relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <select
                    value={filter}
                    onChange={handleFilterChange}
                    className="pl-12 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none cursor-pointer min-w-[200px] transition-all"
                  >
                    <option value="all">All Categories</option>
                    <option value="Sports">Sports</option>
                    <option value="Arts">Arts</option>
                    <option value="Tech">Tech</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Results Count and Create Button */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-white/60">
                  Showing <span className="text-purple-400 font-semibold">{filteredClubs.length}</span> clubs
                </span>
                <div className="flex items-center gap-3">
                  {(search || filter !== "all") && (
                    <button
                      onClick={handleClearFilters}
                      className="text-purple-400 hover:text-purple-300 transition-colors lowercase"
                    >
                      clear filters
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl font-medium text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Club</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredClubs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-lg" />
                <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                  <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No clubs found</h3>
                  <p className="text-white/60 mb-6">
                    {search || filter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Be the first to create a club!"}
                  </p>
                  {!search && filter === "all" && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                    >
                      Create First Club
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            filteredClubs.map((club, i) => (
              <ClubCard
                key={club.id}
                club={club}
                rank={i + 1}
                status={
                  joinedClubIds.includes(club.id)
                    ? "joined"
                    : requestedClubIds.includes(club.id)
                      ? "requested"
                      : "join"
                }
                onClick={() => handleClubClick(club, i + 1)}
                isMobile={isMobile}
              />
            ))
          )}
        </div>

        {/* Ad Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl blur-lg" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <AdBanner placement="clubs_page" />
          </div>
        </motion.div>
      </main>

      {/* Floating Create Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowModal(true)}
        className="hidden md:flex fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl shadow-purple-500/50 items-center justify-center z-50 hover:shadow-purple-500/70 transition-all"
      >
        <Plus className="w-8 h-8 text-white" />
      </motion.button>

      {/* Create Club Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-white">Create New Club</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Club Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter club name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                  >
                    <option value="">Select Category</option>
                    <option>Sports</option>
                    <option>Arts</option>
                    <option>Tech</option>
                    <option>General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell members about your club..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Passcode (Optional)
                  </label>
                  <input
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    type="password"
                    placeholder="Leave empty for open club"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                  />
                  <p className="text-xs text-white/40 mt-2">Members will need this passcode to join</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!name || !category}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Club
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Club Details Modal - Toaster Style (60-75% height, centered) */}
      <AnimatePresence>
        {selectedClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 md:p-6"
            onClick={() => setSelectedClub(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
            >
              <div className="p-8">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden">
                    {selectedClub.logo_url ? (
                      <img
                        src={selectedClub.logo_url}
                        alt={selectedClub.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedClub.category === "Sports" ? "⚽" :
                      selectedClub.category === "Arts" ? "🎨" :
                      selectedClub.category === "Tech" ? "💻" :
                      selectedClub.category === "General" ? "🌟" : "📁"
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedClub.name}</h2>
                    {selectedClub.category && (
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 font-medium">
                        {selectedClub.category}
                      </span>
                    )}
                    {selectedRank && (
                      <div className="mt-2 text-sm text-white/60">
                        Rank <span className="text-purple-400 font-semibold">#{selectedRank}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/80 mb-2">Description</h3>
                  <p className="text-white/60 leading-relaxed">
                    {selectedClub.description || "No description provided."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedClub(null)}
                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Close
                  </button>
                  {joinedClubIds.includes(selectedClub.id) ? (
                    <button
                      onClick={() => router.push(`/clubs/${selectedClub.id}`)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                    >
                      enter club
                    </button>
                  ) : requestedClubIds.includes(selectedClub.id) ? (
                    <div className="flex-1 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl font-semibold text-yellow-400 text-center">
                      Request Pending
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startJoin(selectedClub)}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all lowercase"
                      >
                        join
                      </button>
                      <button
                        onClick={() => {
                          setJoiningClub(selectedClub);
                          setShowRequestModal(true);
                          setSelectedClub(null);
                        }}
                        className="px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 rounded-xl font-medium text-yellow-400 transition-all"
                      >
                        Request
                      </button>
                      <button
                        onClick={() => startJoin(selectedClub)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                      >
                        Join Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passcode Modal */}
      <AnimatePresence>
        {showPassModal && joiningClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10"
            >
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-2">Enter Passcode</h3>
                <p className="text-white/60 text-center mb-6">
                  Join <span className="text-purple-400 font-semibold">{joiningClub.name}</span>
                </p>

                <div className="mb-4">
                  <input
                    type="password"
                    value={enteredPass}
                    onChange={(e) => setEnteredPass(e.target.value)}
                    placeholder="Enter club passcode"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-center text-lg tracking-widest placeholder-white/40 transition-all"
                    onKeyPress={(e) => e.key === "Enter" && handlePassSubmit()}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-white/60">
                      Tries remaining: <span className={`font-semibold ${triesLeft === 1 ? "text-red-400" : "text-purple-400"}`}>{triesLeft}</span>
                    </span>
                    {triesLeft < 3 && (
                      <span className="text-xs text-red-400">Incorrect passcode</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPassModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePassSubmit}
                    disabled={!enteredPass}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && joiningClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10"
            >
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-yellow-400" />
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-2">Request Access</h3>
                <p className="text-white/60 text-center mb-6">
                  {triesLeft === 0 ? (
                    <>You've used all passcode attempts. </>
                  ) : (
                    <>Want to skip the passcode? </>
                  )}
                  Send a request to join <span className="text-purple-400 font-semibold">{joiningClub.name}</span>
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequest}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}