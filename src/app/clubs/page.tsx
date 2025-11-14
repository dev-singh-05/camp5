"use client";

import "./page.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import AdBanner from "@/components/ads";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Filter, Plus, X, Star, Lock, ChevronRight } from "lucide-react";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
};

// ClubCard with glassmorphic design
function ClubCard({
  club,
  rank,
  status,
  onClick,
}: {
  club: Club;
  rank?: number;
  status?: "joined" | "requested" | "join";
  onClick: () => void;
}) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group relative"
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 20px rgba(168, 85, 247, 0.2)",
            "0 0 30px rgba(168, 85, 247, 0.3)",
            "0 0 20px rgba(168, 85, 247, 0.2)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg"
      />
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
}

export default function ClubsPage() {
  const router = useRouter();
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

  const filteredClubs = clubs.filter((c) => {
    const matchesCategory =
      filter === "all" || c.category?.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
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

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
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
          <div className="md:hidden flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold text-white lowercase"
            >
              clubs
            </motion.h1>

            <Link
              href="/clubs/leaderboard"
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-medium text-white text-sm lowercase"
            >
              leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">
        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="search clubs..."
                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all text-sm md:text-base"
                  />
                </div>

                {/* Filter - Desktop only */}
                <div className="hidden md:block relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
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

              {/* Mobile: My Clubs, Count, Menu Icon Row */}
              <div className="md:hidden flex items-center justify-between mt-3 text-sm">
                <Link
                  href="/clubs/my"
                  className="text-indigo-400 font-medium lowercase hover:text-indigo-300 transition-colors"
                >
                  my clubs
                </Link>

                <span className="text-white/60 lowercase text-xs">
                  showing <span className="text-purple-400 font-semibold">{filteredClubs.length}</span> clubs
                </span>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  className="text-purple-400 font-medium lowercase hover:text-purple-300 transition-colors"
                >
                  create club
                </motion.button>
              </div>

              {/* Desktop: Results Count */}
              <div className="hidden md:flex mt-4 items-center justify-between text-sm">
                <span className="text-white/60 lowercase">
                  showing <span className="text-purple-400 font-semibold">{filteredClubs.length}</span> clubs
                </span>
                {(search || filter !== "all") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className="text-purple-400 hover:text-purple-300 transition-colors lowercase"
                  >
                    clear filters
                  </button>
                )}
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
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
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
                onClick={() => {
                  setSelectedClub(club);
                  setSelectedRank(i + 1);
                }}
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
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <AdBanner placement="clubs_page" />
          </div>
        </motion.div>
      </main>

      {/* Floating Create Button - hidden on mobile */}
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

      {/* Club Details Modal */}
      <AnimatePresence>
        {selectedClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedClub(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                {/* Back Button - top left */}
                <button
                  onClick={() => setSelectedClub(null)}
                  className="mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all text-sm lowercase"
                >
                  back
                </button>

                {/* Top section with avatar and info */}
                <div className="flex items-start gap-4 md:gap-6 mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 overflow-hidden border-2 border-white/10">
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
                  <div className="flex-1 min-w-0 pt-2">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2 break-words lowercase">{selectedClub.name}</h2>
                    {selectedClub.category && (
                      <div className="text-base text-white/70 mb-1 lowercase">{selectedClub.category}</div>
                    )}
                    {selectedRank && (
                      <div className="text-sm text-white/60 lowercase">
                        rank <span className="text-purple-400 font-semibold">#{selectedRank}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description section */}
                <div className="mb-8">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 lowercase">description</h3>
                  <p className="text-white/60 leading-relaxed text-sm md:text-base">
                    {selectedClub.description || "No description provided."}
                  </p>
                </div>

                {/* Buttons section */}
                <div className="flex gap-3 justify-center">
                  {joinedClubIds.includes(selectedClub.id) ? (
                    <button
                      onClick={() => router.push(`/clubs/${selectedClub.id}`)}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all lowercase"
                    >
                      enter club
                    </button>
                  ) : requestedClubIds.includes(selectedClub.id) ? (
                    <div className="px-8 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl font-semibold text-yellow-400 text-center lowercase">
                      request pending
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
                        }}
                        className="px-8 py-3 bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 rounded-xl font-medium text-yellow-400 transition-all lowercase"
                      >
                        request
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