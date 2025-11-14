"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, TrendingUp, Search, Filter, X, Lock, ChevronRight, Crown, Zap } from "lucide-react";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
  total_xp: number;
  rank: number;
};

// Podium Component for Top 3
function PodiumCard({ club, rank }: { club: Club; rank: number }) {
  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return "h-48";
      case 2: return "h-40";
      case 3: return "h-32";
      default: return "h-32";
    }
  };

  const getPodiumGradient = (rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-500 to-orange-500";
      case 2: return "from-gray-400 to-gray-500";
      case 3: return "from-orange-600 to-orange-700";
      default: return "from-purple-500 to-pink-500";
    }
  };

  const getPodiumGlow = (rank: number) => {
    switch (rank) {
      case 1: return "shadow-yellow-500/50";
      case 2: return "shadow-gray-400/50";
      case 3: return "shadow-orange-500/50";
      default: return "shadow-purple-500/50";
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

  const getBorderColor = (rank: number) => {
    switch (rank) {
      case 1: return "border-yellow-500/50";
      case 2: return "border-gray-400/50";
      case 3: return "border-orange-500/50";
      default: return "border-purple-500/50";
    }
  };

  const getTextColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-400";
      case 2: return "text-gray-400";
      case 3: return "text-orange-400";
      default: return "text-purple-400";
    }
  };

  return (
    <>
      {/* Desktop View - Vertical Podium (unchanged) */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.1 }}
        className={`hidden md:flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
      >
        {/* Card */}
        <motion.div
          whileHover={{ y: -8, scale: 1.05 }}
          className="relative mb-4 cursor-pointer"
        >
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${rank === 1 ? "rgba(234, 179, 8, 0.3)" : rank === 2 ? "rgba(156, 163, 175, 0.3)" : "rgba(249, 115, 22, 0.3)"}`,
                `0 0 40px ${rank === 1 ? "rgba(234, 179, 8, 0.5)" : rank === 2 ? "rgba(156, 163, 175, 0.5)" : "rgba(249, 115, 22, 0.5)"}`,
                `0 0 20px ${rank === 1 ? "rgba(234, 179, 8, 0.3)" : rank === 2 ? "rgba(156, 163, 175, 0.3)" : "rgba(249, 115, 22, 0.3)"}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 bg-gradient-to-br ${getPodiumGradient(rank)}/20 rounded-2xl blur-lg`}
          />
          <div className={`relative bg-black/40 backdrop-blur-xl rounded-2xl border-2 ${getBorderColor(rank)} p-6 w-48`}>
            {/* Rank Badge */}
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br ${getPodiumGradient(rank)} flex items-center justify-center shadow-lg ${getPodiumGlow(rank)}`}>
              {rank === 1 && <Crown className="w-6 h-6 text-white" />}
              {rank === 2 && <Medal className="w-6 h-6 text-white" />}
              {rank === 3 && <Award className="w-6 h-6 text-white" />}
            </div>

            {/* Club Avatar */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getPodiumGradient(rank)} flex items-center justify-center text-4xl mx-auto mb-3 mt-4 overflow-hidden`}>
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

            {/* Club Name */}
            <h3 className="text-lg font-bold text-white text-center mb-1 line-clamp-1">
              {club.name}
            </h3>

            {/* Category */}
            {club.category && (
              <p className="text-xs text-white/60 text-center mb-3">{club.category}</p>
            )}

            {/* XP Display */}
            <div className={`bg-gradient-to-r ${getPodiumGradient(rank)}/20 border ${getBorderColor(rank)} rounded-xl p-3 text-center`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className={`w-4 h-4 ${getTextColor(rank)}`} />
                <span className={`text-2xl font-bold ${getTextColor(rank)}`}>
                  {club.total_xp}
                </span>
              </div>
              <span className="text-xs text-white/60">Total XP</span>
            </div>
          </div>
        </motion.div>

        {/* Podium Base */}
        <div className={`w-32 ${getPodiumHeight(rank)} bg-gradient-to-br ${getPodiumGradient(rank)}/30 backdrop-blur-sm border-2 ${getBorderColor(rank)} rounded-t-xl flex items-center justify-center transition-all`}>
          <span className={`text-4xl font-bold ${getTextColor(rank)}`}>
            #{rank}
          </span>
        </div>
      </motion.div>

      {/* Mobile View - Horizontal Card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rank * 0.1 }}
        className="md:hidden cursor-pointer group relative"
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 15px ${rank === 1 ? "rgba(234, 179, 8, 0.2)" : rank === 2 ? "rgba(156, 163, 175, 0.2)" : "rgba(249, 115, 22, 0.2)"}`,
              `0 0 25px ${rank === 1 ? "rgba(234, 179, 8, 0.4)" : rank === 2 ? "rgba(156, 163, 175, 0.4)" : "rgba(249, 115, 22, 0.4)"}`,
              `0 0 15px ${rank === 1 ? "rgba(234, 179, 8, 0.2)" : rank === 2 ? "rgba(156, 163, 175, 0.2)" : "rgba(249, 115, 22, 0.2)"}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 bg-gradient-to-br ${getPodiumGradient(rank)}/20 rounded-xl blur-md`}
        />
        <div className={`relative bg-black/40 backdrop-blur-xl rounded-xl border-2 ${getBorderColor(rank)} p-3 hover:border-opacity-80 transition-all ${rank === 1 ? 'shadow-lg shadow-yellow-500/20' : rank === 2 ? 'shadow-lg shadow-gray-400/20' : 'shadow-lg shadow-orange-500/20'}`}>
          <div className="flex items-center gap-3">
            {/* Rank Badge */}
            <div className={`w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${getPodiumGradient(rank)} flex items-center justify-center shadow-lg ${getPodiumGlow(rank)}`}>
              {rank === 1 && <Crown className="w-6 h-6 text-white" />}
              {rank === 2 && <Medal className="w-6 h-6 text-white" />}
              {rank === 3 && <Award className="w-6 h-6 text-white" />}
            </div>

            {/* Club Avatar */}
            <div className={`w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br ${getPodiumGradient(rank)} flex items-center justify-center text-2xl overflow-hidden`}>
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

            {/* Club Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-2xl font-bold ${getTextColor(rank)}`}>#{rank}</span>
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {club.name}
                </h3>
              </div>
              {club.category && (
                <p className="text-xs text-white/60 mb-1">{club.category}</p>
              )}
            </div>

            {/* XP Display */}
            <div className={`flex-shrink-0 px-3 py-2 bg-gradient-to-r ${getPodiumGradient(rank)}/20 border ${getBorderColor(rank)} rounded-lg`}>
              <div className="flex items-center gap-1">
                <Zap className={`w-4 h-4 ${getTextColor(rank)}`} />
                <span className={`text-lg font-bold ${getTextColor(rank)}`}>
                  {club.total_xp}
                </span>
              </div>
              <span className="text-[10px] text-white/60 text-center block">XP</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Regular Club Card (rank 4+)
function ClubCard({
  club,
  rank,
  status,
  onClick,
}: {
  club: Club;
  rank: number;
  status?: "joined" | "requested" | "none";
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-3 md:p-4 hover:border-purple-500/30 transition-all">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Rank */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm md:text-lg font-bold text-purple-300">#{rank}</span>
          </div>

          {/* Club Avatar */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl md:text-2xl flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
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

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-purple-300 transition-colors lowercase">
              {club.name}
            </h3>
            {club.category && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getCategoryColor(club.category)} border font-medium lowercase`}>
                {club.category}
              </span>
            )}
          </div>

          {/* XP - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{club.total_xp}</span>
            </div>
            {status === "joined" && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full font-medium lowercase">
                joined
              </span>
            )}
            {status === "requested" && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-full font-medium lowercase">
                requested
              </span>
            )}
          </div>

          {/* Mobile XP - Shown only on mobile */}
          <div className="md:hidden flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg flex-shrink-0">
            <span className="text-sm font-bold text-yellow-400 lowercase">xp</span>
            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-all" />
          </div>

          <ChevronRight className="hidden md:block w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}

// Club Detail Modal
function ClubModal({
  club,
  status,
  onClose,
  onJoin,
}: {
  club: Club | null;
  status?: "joined" | "requested" | "none";
  onClose: () => void;
  onJoin: () => void;
}) {
  const router = useRouter();
  if (!club) return null;

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all text-sm"
          >
            back
          </button>

          {/* Club Info */}
          <div className="flex items-start gap-4 md:gap-6 mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 overflow-hidden border-2 border-white/10">
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
            <div className="flex-1 min-w-0 pt-2">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">{club.name}</h2>
              {club.category && (
                <div className="text-base text-white/70 mb-1">{club.category}</div>
              )}
              <div className="text-sm text-white/60">
                <Trophy className="w-4 h-4 inline mr-1" />
                Rank <span className="text-purple-400 font-semibold">#{club.rank}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">Description</h3>
            <p className="text-white/60 leading-relaxed text-sm md:text-base">
              {club.description || "No description provided."}
            </p>
          </div>

          {/* XP Stats */}
          <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-600/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-7 h-7 text-yellow-400" />
              <span className="text-4xl font-bold text-yellow-400">{club.total_xp}</span>
            </div>
            <p className="text-base text-amber-200/80 text-center font-medium">Total Club Experience</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            {status === "joined" ? (
              <button
                onClick={() => router.push(`/clubs/${club.id}`)}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
              >
                Enter Club
              </button>
            ) : status === "requested" ? (
              <div className="px-8 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl font-semibold text-yellow-400 text-center">
                Request Pending
              </div>
            ) : (
              <button
                onClick={onJoin}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Join Club
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Passcode Modal
function JoinModal({
  onClose,
  onSubmit,
  error,
  triesLeft,
}: {
  onClose: () => void;
  onSubmit: (passcode: string) => void;
  error?: string;
  triesLeft: number;
}) {
  const [input, setInput] = useState("");

  return (
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

          <h3 className="text-xl font-bold text-white text-center mb-6">Enter Club Passcode</h3>

          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter passcode"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-center text-lg tracking-widest placeholder-white/40 transition-all mb-3"
            onKeyPress={(e) => e.key === "Enter" && onSubmit(input)}
          />

          {error && (
            <p className="text-red-400 text-sm text-center mb-3">{error}</p>
          )}

          <div className="flex items-center justify-center mb-6">
            <span className="text-sm text-white/60">
              Tries remaining: <span className={`font-semibold ${triesLeft === 1 ? "text-red-400" : "text-purple-400"}`}>{triesLeft}</span>
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(input)}
              disabled={!input}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Request Modal
function RequestModal({
  onClose,
  onRequest,
}: {
  onClose: () => void;
  onRequest: () => void;
}) {
  return (
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
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>

          <h3 className="text-xl font-bold text-white text-center mb-2">Out of Tries</h3>
          <p className="text-white/60 text-center mb-6">
            You've used all your attempts. Would you like to send a request to join this club?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onRequest}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
            >
              Send Request
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentClubId, setCurrentClubId] = useState<string | null>(null);
  const [realPass, setRealPass] = useState<string | null>(null);
  const [triesLeft, setTriesLeft] = useState(3);
  const [error, setError] = useState("");

  const fetchClubs = async () => {
    // ✅ SIMPLIFIED: Fetch clubs directly with total_xp
    const { data: clubsData, error: clubsError } = await supabase
      .from("clubs")
      .select("id, name, category, description, logo_url, total_xp")
      .order("total_xp", { ascending: false });

    if (clubsError) {
      console.error("Error fetching clubs:", clubsError);
      return;
    }

    // Add rank based on XP order
    const rankedClubs = (clubsData || []).map((club: any, index: number) => ({
      ...club,
      rank: index + 1,
    }));

    setClubs(rankedClubs);

    // Fetch user's joined and requested clubs
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
const subscription = supabase
    .channel('all-clubs-leaderboard')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'clubs'
      },
      (payload) => {
        console.log('✅ A club was updated, refreshing leaderboard');
        fetchClubs(); // Refresh when any club XP changes
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
  

  const handleJoin = async (clubId: string) => {
    const { data: clubData, error: clubErr } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", clubId)
      .single();

    if (clubErr) {
      console.error("Error fetching club passcode:", clubErr.message);
      return;
    }

    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    if (!clubData?.passcode) {
      await supabase.from("club_members").insert([
        { club_id: clubId, user_id: user.id },
      ]);
      setJoinedClubIds((prev) => [...prev, clubId]);
      setSelectedClub(null);
      return;
    }

    setCurrentClubId(clubId);
    setRealPass(clubData.passcode);
    setTriesLeft(3);
    setError("");
    setShowJoinModal(true);
    setSelectedClub(null);
  };

  const submitPasscode = async (pass: string) => {
    if (!currentClubId || !realPass) return;

    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    if (pass === realPass) {
      await supabase.from("club_members").insert([
        { club_id: currentClubId, user_id: user.id },
      ]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      await supabase.from("messages").insert([{
        club_id: currentClubId,
        user_id: user.id,
        content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club via password`
      }]);

      setJoinedClubIds((prev) => [...prev, currentClubId]);
      setShowJoinModal(false);
      return;
    }

    if (triesLeft > 1) {
      setTriesLeft(triesLeft - 1);
      setError("Wrong passcode, try again.");
    } else {
      setShowJoinModal(false);
      setShowRequestModal(true);
    }
  };

  const handleRequest = async () => {
    if (!currentClubId) return;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    await supabase.from("club_requests").insert([
      { club_id: currentClubId, user_id: user.id, status: "pending" },
    ]);
    setRequestedClubIds((prev) => [...prev, currentClubId]);
    setShowRequestModal(false);
  };

  const filteredClubs = clubs.filter((c) => {
    const matchesCategory =
      filter === "all" ||
      c.category?.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const topThree = filteredClubs.slice(0, 3);
  const restOfClubs = filteredClubs.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated Background */}
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

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent">
                  Club Leaderboard
                </h1>
              </motion.div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold text-white lowercase"
            >
              clubs leaderboard
            </motion.h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">
        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="search"
                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all text-sm md:text-base lowercase"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-white/40" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full md:w-auto pl-10 md:pl-12 pr-8 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none cursor-pointer md:min-w-[200px] transition-all text-sm md:text-base lowercase"
                  >
                    <option value="all">categories</option>
                    <option value="Sports">sports</option>
                    <option value="Arts">arts</option>
                    <option value="Tech">tech</option>
                    <option value="General">general</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 md:mt-4 flex items-center justify-between text-sm">
                <span className="text-white/60 lowercase text-xs md:text-sm">
                  showing <span className="text-yellow-400 font-semibold">{filteredClubs.length}</span> clubs
                </span>
                {(search || filter !== "all") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className="text-purple-400 hover:text-purple-300 transition-colors lowercase text-xs md:text-sm"
                  >
                    clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Podium - Top 3 */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="mb-6 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white lowercase">champions</h2>
            </div>

            {/* Desktop - Horizontal Layout with Podiums */}
            <div className="hidden md:flex items-end justify-center gap-8">
              {topThree.map((club) => (
                <div key={club.id} onClick={() => setSelectedClub(club)}>
                  <PodiumCard club={club} rank={club.rank} />
                </div>
              ))}
            </div>

            {/* Mobile - Vertical Stack of Horizontal Cards */}
            <div className="md:hidden space-y-3">
              {topThree.map((club) => (
                <div key={club.id} onClick={() => setSelectedClub(club)}>
                  <PodiumCard club={club} rank={club.rank} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rest of Clubs */}
        {restOfClubs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white lowercase">all clubs</h2>
            </div>

            <div className="space-y-3">
              {restOfClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  rank={club.rank}
                  status={
                    joinedClubIds.includes(club.id)
                      ? "joined"
                      : requestedClubIds.includes(club.id)
                        ? "requested"
                        : "none"
                  }
                  onClick={() => setSelectedClub(club)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {filteredClubs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
              <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No clubs found</h3>
              <p className="text-white/60">Try adjusting your search or filters</p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedClub && (
          <ClubModal
            club={selectedClub}
            status={
              joinedClubIds.includes(selectedClub.id)
                ? "joined"
                : requestedClubIds.includes(selectedClub.id)
                  ? "requested"
                  : "none"
            }
            onClose={() => setSelectedClub(null)}
            onJoin={() => handleJoin(selectedClub.id)}
          />
        )}

        {showJoinModal && (
          <JoinModal
            onClose={() => setShowJoinModal(false)}
            onSubmit={submitPasscode}
            error={error}
            triesLeft={triesLeft}
          />
        )}

        {showRequestModal && (
          <RequestModal
            onClose={() => setShowRequestModal(false)}
            onRequest={handleRequest}
          />
        )}
      </AnimatePresence>
    </div>
  );
}