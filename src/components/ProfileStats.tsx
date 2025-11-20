import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, Link as LinkIcon, Clock, Sparkles } from "lucide-react";
// OPTIMIZATION: Import mobile detection hook
import { useIsMobile } from "@/hooks/useIsMobile";

interface ProfileStatsProps {
  user: any;
  getAvatar: (user: any) => string;
  currentUserId: string | null;
  connectionStatus: "none" | "requested" | "friends";
  onConnect: () => void;
  onRate: () => void;
  onOpenRating?: () => void;
}

function ProfileStats({
  user,
  getAvatar,
  currentUserId,
  connectionStatus,
  onConnect,
  onRate,
  onOpenRating
}: ProfileStatsProps) {
  // OPTIMIZATION: Mobile detection hook - disables expensive animations on mobile
  const isMobile = useIsMobile();

  const [stats, setStats] = useState<any>(null);
  const [hasRated, setHasRated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if user has rated this profile
  useEffect(() => {
    setHasRated(false);
    setIsUnlocked(false);
    
    async function checkRating() {
      if (!currentUserId || !user.id) return;
      
      const { data, error } = await supabase
        .from("ratings")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", user.id)
        .single();

      if (!error && data) {
        setHasRated(true);
        setIsUnlocked(true);
      }
    }
    checkRating();
  }, [currentUserId, user.id]);

  // Fetch stats
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
    }
    fetchData();
  }, [user.id]);

  // Determine lock state
  const showLock = !isUnlocked;
  const needsConnection = connectionStatus === "none" || connectionStatus === "requested";
  const needsRating = connectionStatus === "friends" && !hasRated;

  const StatBar = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group"
    >
      <div className="flex justify-between items-center text-xs text-white/70 mb-2">
        <span className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          {label}
        </span>
        <motion.span 
          className="font-bold text-white"
          whileHover={{ scale: 1.1 }}
        >
          {isUnlocked ? `${value?.toFixed(1) || 0}/5` : "?/5"}
        </motion.span>
      </div>
      <div className="relative w-full h-3 bg-white/10 backdrop-blur-xl rounded-full overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isUnlocked ? `${(value || 0) * 20}%` : "50%" }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full relative overflow-hidden"
        >
          {/* OPTIMIZATION: Disable shimmer animation on mobile - it's expensive and not critical */}
          {!isMobile && (
            <motion.div
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10"
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="relative"
        >
          <img
            src={getAvatar(user)}
            alt={user.full_name}
            className="w-20 h-20 rounded-full ring-4 ring-purple-500/30"
          />
          {isUnlocked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </motion.div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{user.full_name}</h2>
          {stats && isUnlocked ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-sm"
            >
              <span className="flex items-center gap-1 text-yellow-400">
                ⭐
                <span className="font-bold">
                  {stats.avg_overall_xp?.toFixed(1) || 0}
                </span>
                <span className="text-white/50">/100 XP</span>
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1 text-cyan-400">
                💬
                <span className="font-semibold">{stats.total_ratings || 0}</span>
                <span className="text-white/50">Ratings</span>
              </span>
            </motion.div>
          ) : (
            <p className="text-white/40 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Locked Profile Stats
            </p>
          )}
        </div>
      </motion.div>

      {/* Attribute bars with lock overlay */}
      <div className="relative mb-6">
        {stats && (
          <div className={`space-y-4 ${showLock ? 'filter blur-md' : ''}`}>
            <StatBar label="Confidence" value={stats.avg_confidence} icon="💪" />
            <StatBar label="Humbleness" value={stats.avg_humbleness} icon="🙏" />
            <StatBar label="Friendliness" value={stats.avg_friendliness} icon="😊" />
            <StatBar label="Intelligence" value={stats.avg_intelligence} icon="🧠" />
            <StatBar label="Communication" value={stats.avg_communication} icon="💬" />
          </div>
        )}

        {/* Lock Overlay */}
        <AnimatePresence>
          {showLock && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md rounded-xl border border-white/10"
            >
              <div className="text-center p-6 max-w-xs">
                <motion.div
                  // OPTIMIZATION: Disable lock icon animation on mobile - reduces CPU usage
                  animate={!isMobile ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🔒
                </motion.div>
                
                {needsConnection && (
                  <>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Connect to Unlock
                    </h3>
                    <p className="text-sm text-white/60 mb-4">
                      Send a connection request to view this profile's ratings and attributes.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onConnect}
                      className={`px-6 py-2 rounded-xl font-semibold shadow-lg transition ${
                        connectionStatus === "requested"
                          ? "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                          : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-green-500/50"
                      }`}
                    >
                      {connectionStatus === "requested" ? (
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Request Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          Connect Now
                        </span>
                      )}
                    </motion.button>
                  </>
                )}
                
                {needsRating && (
                  <>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Rate to Unlock
                    </h3>
                    <p className="text-sm text-white/60 mb-4">
                      Submit a rating for {user.full_name?.split(' ')[0]} to view their detailed attributes and scores.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (onOpenRating) {
                          onOpenRating();
                        }
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/50 transition flex items-center gap-2 mx-auto"
                    >
                      <Star className="w-4 h-4" />
                      Rate Now
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ProfileStats;