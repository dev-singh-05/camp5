"use client";

// Performance optimization: Added useMemo, useRef, useCallback, and React.memo for expensive computations and debouncing
import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, TrendingUp, Search, Filter, X, Lock, ChevronRight, Crown, Zap } from "lucide-react";
// Performance optimization: Mobile detection to disable heavy animations
import { useIsMobile } from "@/hooks/useIsMobile";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
  total_xp: number;
  rank: number;
};

// Performance optimization: Extract helper functions outside component
const getRankGradient = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-500 to-orange-500";
    case 2: return "from-gray-400 to-gray-500";
    case 3: return "from-orange-600 to-orange-700";
    default: return "from-purple-500 to-pink-500";
  }
};

const getRankGlow = (rank: number) => {
  switch (rank) {
    case 1: return "shadow-yellow-500/50";
    case 2: return "shadow-gray-400/50";
    case 3: return "shadow-orange-500/50";
    default: return "shadow-purple-500/50";
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1: return "yellow";
    case 2: return "gray";
    case 3: return "orange";
    default: return "purple";
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

const getBorderClass = (rank: number) => {
  switch (rank) {
    case 1: return "border-yellow-500/50";
    case 2: return "border-gray-400/50";
    case 3: return "border-orange-500/50";
    default: return "border-purple-500/50";
  }
};

const getTextClass = (rank: number) => {
  switch (rank) {
    case 1: return "text-yellow-400";
    case 2: return "text-gray-400";
    case 3: return "text-orange-400";
    default: return "text-purple-400";
  }
};

const getBorderXPClass = (rank: number) => {
  switch (rank) {
    case 1: return "border-yellow-500/30";
    case 2: return "border-gray-400/30";
    case 3: return "border-orange-500/30";
    default: return "border-purple-500/30";
  }
};

// Performance optimization: Memoize TopClubCard to prevent unnecessary re-renders
const TopClubCard = memo(function TopClubCard({ club, rank, isMobile }: { club: Club; rank: number; isMobile: boolean }) {

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: rank * 0.1 }}
      className="relative group"
    >
      {/* Performance optimization: Disable infinite glow animation on mobile */}
      <motion.div
        animate={!isMobile ? {
          boxShadow: [
            `0 0 20px ${rank === 1 ? "rgba(234, 179, 8, 0.3)" : rank === 2 ? "rgba(156, 163, 175, 0.3)" : "rgba(249, 115, 22, 0.3)"}`,
            `0 0 40px ${rank === 1 ? "rgba(234, 179, 8, 0.5)" : rank === 2 ? "rgba(156, 163, 175, 0.5)" : "rgba(249, 115, 22, 0.5)"}`,
            `0 0 20px ${rank === 1 ? "rgba(234, 179, 8, 0.3)" : rank === 2 ? "rgba(156, 163, 175, 0.3)" : "rgba(249, 115, 22, 0.3)"}`,
          ],
        } : undefined}
        transition={!isMobile ? { duration: 2, repeat: Infinity } : undefined}
        className={`absolute inset-0 bg-gradient-to-br ${getRankGradient(rank)}/20 rounded-2xl blur-lg`}
      />
      <div className={`relative bg-black/40 backdrop-blur-xl rounded-2xl border-2 ${getBorderClass(rank)} p-3 md:p-4`}>
        {/* Horizontal Layout */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Rank Badge */}
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${getRankGradient(rank)} flex items-center justify-center shadow-lg ${getRankGlow(rank)} flex-shrink-0`}>
            {rank === 1 && <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />}
            {rank === 2 && <Medal className="w-5 h-5 md:w-6 md:h-6 text-white" />}
            {rank === 3 && <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          </div>

          {/* Club Avatar */}
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${getRankGradient(rank)} flex items-center justify-center text-xl md:text-2xl flex-shrink-0 overflow-hidden`}>
            {club.logo_url ? (
              <Image
                src={club.logo_url}
                alt={club.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            ) : (
              getCategoryIcon(club.category)
            )}
          </div>

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-bold text-white mb-0.5 line-clamp-1">
              {club.name}
            </h3>
            {club.category && (
              <p className="text-xs text-white/60 hidden md:block">{club.category}</p>
            )}
          </div>

          {/* XP Display */}
          <div className={`bg-gradient-to-r ${getRankGradient(rank)}/20 border ${getBorderXPClass(rank)} rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-center flex-shrink-0`}>
            <div className="flex items-center justify-center gap-1">
              <Zap className={`w-3 h-3 md:w-4 md:h-4 ${getTextClass(rank)}`} />
              <span className={`text-base md:text-xl font-bold ${getTextClass(rank)}`}>
                {club.total_xp}
              </span>
            </div>
            <span className="text-[10px] md:text-xs text-white/60">XP</span>
          </div>

          {/* Place Badge */}
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${getRankGradient(rank)}/30 border ${getBorderXPClass(rank)} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-sm md:text-base font-bold ${getTextClass(rank)}`}>#{rank}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Performance optimization: Extract helper functions outside component
const getCategoryColor = (cat: string | null) => {
  switch (cat?.toLowerCase()) {
    case "sports": return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
    case "arts": return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
    case "tech": return "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400";
    case "general": return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400";
    default: return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
  }
};

// Performance optimization: Memoize ClubCard to prevent unnecessary re-renders
const ClubCard = memo(function ClubCard({
  club,
  rank,
  status,
  onClick,
  isMobile,
}: {
  club: Club;
  rank: number;
  status?: "joined" | "requested" | "none";
  onClick: () => void;
  isMobile: boolean;
}) {

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      // Performance optimization: Disable hover on mobile
      whileHover={!isMobile ? { x: 4, scale: 1.01 } : undefined}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 hover:border-purple-500/30 transition-all">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-purple-300">#{rank}</span>
          </div>

          {/* Club Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
            {club.logo_url ? (
              <Image
                src={club.logo_url}
                alt={club.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            ) : (
              getCategoryIcon(club.category)
            )}
          </div>

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-purple-300 transition-colors">
              {club.name}
            </h3>
            {club.category && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getCategoryColor(club.category)} border font-medium`}>
                {club.category}
              </span>
            )}
          </div>

          {/* XP */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{club.total_xp}</span>
            </div>
            {status === "joined" && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full font-medium">
                Joined
              </span>
            )}
            {status === "requested" && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-full font-medium">
                Requested
              </span>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
});

// Performance optimization: Memoize ClubModal to prevent unnecessary re-renders
const ClubModal = memo(function ClubModal({
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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: <Crown className="w-5 h-5" />, color: "yellow", label: "Champion" };
    if (rank === 2) return { icon: <Medal className="w-5 h-5" />, color: "gray", label: "Runner-up" };
    if (rank === 3) return { icon: <Award className="w-5 h-5" />, color: "orange", label: "Bronze" };
    return { icon: <Trophy className="w-5 h-5" />, color: "purple", label: `Rank ${rank}` };
  };

  const rankBadge = getRankBadge(club.rank);

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
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
      >
        <div className="p-8">
          <div className="flex items-start gap-6 mb-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-${rankBadge.color}-500 to-${rankBadge.color}-600 flex items-center justify-center text-4xl flex-shrink-0 relative overflow-hidden`}>
              {club.logo_url ? (
                <Image
                  src={club.logo_url}
                  alt={club.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                getCategoryIcon(club.category)
              )}
              <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-${rankBadge.color}-500 to-${rankBadge.color}-600 border-2 border-slate-900 flex items-center justify-center`}>
                {rankBadge.icon}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{club.name}</h2>
              {club.category && (
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 font-medium mb-2">
                  {club.category}
                </span>
              )}
              <div className={`flex items-center gap-2 text-${rankBadge.color}-400 mt-2`}>
                {rankBadge.icon}
                <span className="text-sm font-semibold">{rankBadge.label}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Description</h3>
            <p className="text-white/60 leading-relaxed">
              {club.description || "No description provided."}
            </p>
          </div>

          {/* XP Stats */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="text-3xl font-bold text-yellow-400">{club.total_xp}</span>
            </div>
            <p className="text-sm text-white/60 text-center">Total Club Experience</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              Close
            </button>
            {status === "joined" ? (
              <button
                onClick={() => router.push(`/clubs/${club.id}`)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
              >
                Enter Club
              </button>
            ) : status === "requested" ? (
              <div className="flex-1 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl font-semibold text-yellow-400 text-center">
                Request Pending
              </div>
            ) : (
              <button
                onClick={onJoin}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Join Club
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// Performance optimization: Memoize JoinModal to prevent unnecessary re-renders
const JoinModal = memo(function JoinModal({
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
});

// Performance optimization: Memoize RequestModal to prevent unnecessary re-renders
const RequestModal = memo(function RequestModal({
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
});

export default function LeaderboardPage() {
  const router = useRouter();
  // Performance optimization: Detect mobile to disable heavy animations
  const isMobile = useIsMobile();
  // Performance optimization: Debounce timer for real-time subscription updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // Performance optimization: Debounce real-time subscription to prevent excessive re-renders
    // Without debounce, every single club XP update triggers a full refresh (lag spike)
    // With debounce, we batch multiple updates and only refresh once every 2 seconds
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
          console.log('✅ Club updated, debouncing leaderboard refresh');

          // Clear previous timer if it exists
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Set new timer - only refresh after 2 seconds of no updates
          debounceTimerRef.current = setTimeout(() => {
            console.log('🔄 Refreshing leaderboard after debounce');
            fetchClubs();
          }, 2000); // 2 second debounce
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      // Cleanup debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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

  // Performance optimization: useMemo prevents recalculating filtered clubs on every render
  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchesCategory =
        filter === "all" ||
        c.category?.toLowerCase() === filter.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [clubs, filter, search]);

  const topThree = useMemo(() => filteredClubs.slice(0, 3), [filteredClubs]);
  const restOfClubs = useMemo(() => filteredClubs.slice(3), [filteredClubs]);

  // Performance optimization: useCallback for event handlers to prevent breaking memoization
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilter("all");
  }, []);

  const handleClubClick = useCallback((club: Club) => {
    setSelectedClub(club);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Performance optimization: Disable infinite background animations on mobile */}
      {/* Reduced blur from blur-3xl to blur-xl for better performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={!isMobile ? {
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          } : { opacity: 0.03 }}
          transition={!isMobile ? { duration: 20, repeat: Infinity } : undefined}
          style={!isMobile ? { willChange: "transform, opacity" } : undefined}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-xl"
        />
        <motion.div
          animate={!isMobile ? {
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          } : { opacity: 0.03 }}
          transition={!isMobile ? { duration: 25, repeat: Infinity } : undefined}
          style={!isMobile ? { willChange: "transform, opacity" } : undefined}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-xl"
        />
      </div>

      {/* Header - Mobile First */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between md:justify-start gap-3 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
            >
              ←
            </motion.button>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 md:gap-3"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-white via-yellow-200 to-orange-200 bg-clip-text text-transparent">
                Club Leaderboard
              </h1>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Search & Filter - Mobile First */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-lg" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-3 md:p-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search clubs..."
                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all text-sm md:text-base"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
                  <select
                    value={filter}
                    onChange={handleFilterChange}
                    className="w-full md:min-w-[200px] pl-10 md:pl-12 pr-8 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none cursor-pointer transition-all text-sm md:text-base"
                  >
                    <option value="all">All Categories</option>
                    <option value="Sports">Sports</option>
                    <option value="Arts">Arts</option>
                    <option value="Tech">Tech</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 md:mt-4 flex items-center justify-between text-xs md:text-sm">
                <span className="text-white/60">
                  Showing <span className="text-yellow-400 font-semibold">{filteredClubs.length}</span> clubs
                </span>
                {(search || filter !== "all") && (
                  <button
                    onClick={handleClearFilters}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top 3 Champions - Horizontal Cards */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12"
          >
            <div className="relative group mb-6 md:mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-lg" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-4 md:p-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                  <h2 className="text-lg md:text-2xl font-bold text-white">Top Champions</h2>
                </div>
                <p className="text-center text-white/60 text-xs md:text-sm">Leading clubs by total XP</p>
              </div>
            </div>

            <div className="space-y-4 md:space-y-5">
              {topThree.map((club) => (
                <div key={club.id} onClick={() => handleClubClick(club)} className="cursor-pointer">
                  <TopClubCard club={club} rank={club.rank} isMobile={isMobile} />
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">All Clubs</h2>
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
                  onClick={() => handleClubClick(club)}
                  isMobile={isMobile}
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
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-lg" />
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