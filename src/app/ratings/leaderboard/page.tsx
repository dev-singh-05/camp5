"use client";
// OPTIMIZATION: Added useMemo and useCallback for performance
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Search, Filter, X } from "lucide-react";
// OPTIMIZATION: Import performance hooks
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDebounce } from "@/hooks/useDebounce";

type Profile = {
  id: string;
  full_name: string;
  profile_photo: string | null;
  branch: string | null;
  avg_confidence: number | null;
  avg_humbleness: number | null;
  avg_friendliness: number | null;
  avg_intelligence: number | null;
  avg_communication: number | null;
  avg_overall_xp: number | null;
  total_ratings: number | null;
  rank: number; // ✅ Added global rank
};

export default function LeaderboardPage() {
  // OPTIMIZATION: Mobile detection hook - disables expensive animations on mobile
  const isMobile = useIsMobile();

  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  // OPTIMIZATION: Debounce search to reduce re-renders
  const debouncedSearch = useDebounce(search, 300);

  // ✅ Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, profile_photo, branch, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings"
        )
        .gte("total_ratings", 3)
        .order("avg_overall_xp", { ascending: false });

      if (error) console.error("Leaderboard fetch error:", error);
      else {
        // ✅ Store global rank with each profile
        const profilesWithRank = (data || []).map((profile, index) => ({
          ...profile,
          rank: index + 1, // ✅ Assign global rank based on position
        }));
        setProfiles(profilesWithRank);
        setFilteredProfiles(profilesWithRank);
      }
    }

    fetchLeaderboard();
  }, []);

  // OPTIMIZATION: Use useMemo instead of useEffect for filtering
  // WHY: Reduces unnecessary state updates and re-renders. Uses debounced search to avoid filtering on every keystroke
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) =>
      (p.full_name || "").toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [profiles, debouncedSearch]);

  // OPTIMIZATION: Wrap in useCallback to prevent recreating on every render
  const getAvatar = useCallback((user: Profile) =>
    user.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white relative overflow-x-hidden">
      {/* Animated Background Elements */}
      {/* OPTIMIZATION: Only animate on desktop - mobile devices struggle with infinite blur animations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={!isMobile ? {
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          } : { opacity: 0.03 }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={!isMobile ? {
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          } : { opacity: 0.03 }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

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
            <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
              Leaderboard
            </h1>

            {/* Filter Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 text-white font-medium rounded-xl hover:border-purple-500/50 shadow-lg transition-all"
            >
              <Filter className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Search Bar - Mobile Optimized */}
        <div className="px-4 pt-4 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all shadow-lg mb-4"
          >
            <Search className="w-5 h-5 text-white/60 mr-2" />
            <input
              type="text"
              placeholder="Search profiles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white placeholder-white/40 text-base"
            />
          </motion.div>
        </div>

        {/* Leaderboard list - Mobile Optimized */}
        <div className="px-4 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((user, index) => {
                // ✅ Use stored rank instead of filtered index
                const rank = user.rank;

                // 🎨 Different styles for Top 3
                let bgColor = "bg-white/5 backdrop-blur-xl hover:bg-white/10";
                let rankColor = "text-cyan-400";
                let nameStyle = "font-semibold text-white text-base";
                let borderStyle = "border border-white/10";
                let ringColor = "ring-cyan-500/30";

                if (rank === 1) {
                  bgColor = "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl shadow-lg hover:shadow-yellow-500/50";
                  rankColor = "text-yellow-400";
                  nameStyle = "font-extrabold text-base sm:text-lg text-yellow-300";
                  borderStyle = "border-yellow-500/30";
                  ringColor = "ring-yellow-400";
                } else if (rank === 2) {
                  bgColor = "bg-gradient-to-r from-gray-400/20 to-gray-300/20 backdrop-blur-xl shadow-lg hover:shadow-gray-400/50";
                  rankColor = "text-gray-300";
                  nameStyle = "font-bold text-base sm:text-lg text-gray-200";
                  borderStyle = "border-gray-400/30";
                  ringColor = "ring-gray-400";
                } else if (rank === 3) {
                  bgColor = "bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-xl shadow-lg hover:shadow-orange-500/50";
                  rankColor = "text-orange-400";
                  nameStyle = "font-bold text-base sm:text-lg text-orange-300";
                  borderStyle = "border-orange-500/30";
                  ringColor = "ring-orange-400";
                }

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    // OPTIMIZATION: Disable scale animation on mobile for better performance
                    whileHover={!isMobile ? { scale: 1.02 } : undefined}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center ${bgColor} cursor-pointer p-4 rounded-2xl ${borderStyle} transition-all shadow-lg`}
                  >
                    {/* Rank number on the left */}
                    <div className="w-12 text-center flex-shrink-0">
                      <motion.p
                        // OPTIMIZATION: Disable scale animation on mobile
                        whileHover={!isMobile ? { scale: 1.2 } : undefined}
                        className={`text-2xl font-extrabold ${rankColor}`}
                      >
                        #{rank}
                      </motion.p>
                    </div>

                    {/* Profile photo + details */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 ml-2">
                      <motion.img
                        // OPTIMIZATION: Disable hover animation on mobile
                        whileHover={!isMobile ? { scale: 1.1, rotate: 5 } : undefined}
                        src={getAvatar(user)}
                        alt={user.full_name}
                        className={`w-12 h-12 rounded-full object-cover ring-2 ${ringColor} flex-shrink-0 shadow-lg`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`${nameStyle} truncate`}>{user.full_name}</p>
                        <p className="text-xs text-white/50 truncate">
                          {user.total_ratings || 0} ratings
                        </p>
                      </div>
                    </div>

                    {/* Branch and XP on the right */}
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-xs text-white/40 italic truncate max-w-[60px] sm:max-w-none">
                        {user.branch || "—"}
                      </p>
                      <p className="font-bold text-cyan-400 text-base sm:text-lg whitespace-nowrap">
                        {user.avg_overall_xp?.toFixed(1) || 0} XP
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p className="text-center text-white/40 text-sm py-8">
                No users found matching your search.
              </p>
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
            Ratings Leaderboard
          </p>
        </motion.div>
      </div>

      {/* 🟢 Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-2xl relative overflow-y-auto max-h-[85vh]"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-3 right-4 text-white/60 hover:text-white text-xl w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 border-b border-white/10 pb-4">
                <img
                  src={getAvatar(selectedUser)}
                  alt={selectedUser.full_name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-purple-500/30"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {selectedUser.full_name}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-center text-xs sm:text-sm text-white/60 mt-2">
                    <p className="flex flex-wrap items-center justify-center sm:justify-start gap-1">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4 inline text-yellow-400" />
                        Global Rank:{" "}
                        <span className="text-cyan-400 font-bold">
                          #{selectedUser.rank}
                        </span>
                      </span>
                      <span className="hidden sm:inline"> • </span>
                      <span className="flex items-center gap-1">
                        ⭐ XP:{" "}
                        <span className="text-cyan-400 font-semibold">
                          {selectedUser.avg_overall_xp?.toFixed(1) || 0}
                        </span>
                      </span>
                      <span className="hidden sm:inline"> • </span>
                      <span>💬 {selectedUser.total_ratings || 0} Ratings</span>
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm italic text-white/40 mt-1">
                    {selectedUser.branch || "—"}
                  </p>
                </div>
              </div>

              {/* Rating Bars */}
              <div className="space-y-3">
                {[
                  { label: "Confidence", key: "avg_confidence" },
                  { label: "Humbleness", key: "avg_humbleness" },
                  { label: "Friendliness", key: "avg_friendliness" },
                  { label: "Intelligence", key: "avg_intelligence" },
                  { label: "Communication", key: "avg_communication" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm text-white/80 mb-1">
                      <span>{label}</span>
                      <span>
                        {Number(selectedUser[key as keyof Profile])?.toFixed(1) || 0}/5
                      </span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(Number(selectedUser[key as keyof Profile]) || 0) * 20}%`,
                        }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}