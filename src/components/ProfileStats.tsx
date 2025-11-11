// Add this enhanced ProfileStats component to replace the existing one in both files

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

interface ProfileStatsProps {
  user: any;
  getAvatar: (user: any) => string;
  currentUserId: string | null;
  connectionStatus: "none" | "requested" | "friends";
  onConnect: () => void;
  onRate: () => void;
  onOpenRating?: () => void; // Optional callback to open rating modal
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
  const [stats, setStats] = useState<any>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [hasRated, setHasRated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if user has rated this profile
// Check if user has rated this profile
useEffect(() => {
  // Reset states when user changes
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

  // Fetch stats and reviews
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
  }, [user.id]);

  // Determine lock state
  const showLock = !isUnlocked;
  const needsConnection = connectionStatus === "none" || connectionStatus === "requested";
  const needsRating = connectionStatus === "friends" && !hasRated;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 border-b pb-3">
        <img
          src={getAvatar(user)}
          alt={user.full_name}
          className="w-20 h-20 rounded-full ring-4 ring-indigo-100"
        />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
          {stats && isUnlocked ? (
            <p className="text-sm text-gray-600">
              ⭐{" "}
              <span className="font-semibold text-purple-600">
                {stats.avg_overall_xp?.toFixed(1) || 0}
              </span>
              /100 XP • 💬 {stats.total_ratings || 0} Ratings
            </p>
          ) : (
            <p className="text-gray-400 text-sm flex items-center gap-2">
              🔒 Locked Profile Stats
            </p>
          )}
        </div>
      </div>

      {/* Attribute bars with lock overlay */}
      <div className="relative">
        {stats && (
          <div className={`space-y-2 ${showLock ? 'filter blur-sm' : ''}`}>
            {[
              { label: "Confidence", key: "avg_confidence" },
              { label: "Humbleness", key: "avg_humbleness" },
              { label: "Friendliness", key: "avg_friendliness" },
              { label: "Intelligence", key: "avg_intelligence" },
              { label: "Communication", key: "avg_communication" },
            ].map(({ label, key }) => (
              <div key={key}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{label}</span>
                  <span className="font-medium">
                    {isUnlocked ? `${stats[key]?.toFixed(1) || 0}/5` : "?/5"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: isUnlocked ? `${(stats[key] || 0) * 20}%` : "50%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lock Overlay */}
        {showLock && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
            <div className="text-center p-6 max-w-xs">
              <div className="text-6xl mb-4">🔒</div>
              
              {needsConnection && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Connect to Unlock
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Send a connection request to view this profile's ratings and attributes.
                  </p>
                  <button
                    onClick={onConnect}
                    className={`px-6 py-2 rounded-lg font-medium shadow transition ${
                      connectionStatus === "requested"
                        ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {connectionStatus === "requested" ? "Request Sent ⏳" : "🔗 Connect Now"}
                  </button>
                </>
              )}
              
              {needsRating && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Rate to Unlock
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Submit a rating for {user.full_name?.split(' ')[0]} to view their detailed attributes and scores.
                  </p>
                  <button
                    onClick={() => {
                      if (onOpenRating) {
                        onOpenRating();
                      }
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow hover:opacity-90 transition"
                  >
                    ⭐ Rate Now
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Reviews - also locked */}
      <div className="mt-4 relative">
        <h3 className="font-semibold text-gray-900 mb-2 border-b pb-1">Recent Reviews</h3>
        
        <div className={showLock ? 'filter blur-sm' : ''}>
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

        {showLock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
            <p className="text-gray-500 text-xs">🔒 Locked</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileStats;