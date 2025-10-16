"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

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
};

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");

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
        setProfiles(data || []);
        setFilteredProfiles(data || []);
      }
    }

    fetchLeaderboard();
  }, []);

  // ✅ Search filter
  useEffect(() => {
    const filtered = profiles.filter((p) =>
      (p.full_name || "").toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProfiles(filtered);
  }, [search, profiles]);

  const getAvatar = (user: Profile) =>
    user.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-6">
      {/* Title */}
      <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-8">
        🏆 LEADERBOARD
      </h1>

      {/* Search + Filter Row */}
      <div className="max-w-3xl mx-auto flex items-center gap-3 mb-8">
        <div className="flex-1 flex items-center bg-white rounded-lg shadow-sm border p-2">
          <span className="text-gray-500 mx-2">🔍</span>
          <input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-800 text-sm"
          />
        </div>
        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:opacity-90 transition">
          ⚙️ Filter
        </button>
      </div>

      {/* Leaderboard list */}
      <div className="max-w-3xl mx-auto space-y-4">
        {filteredProfiles.length > 0 ? (
          filteredProfiles.map((user, index) => {
            // 🎨 Different styles for Top 3
            let bgColor = "bg-white hover:bg-indigo-50";
            let rankColor = "text-indigo-600";
            let nameStyle = "font-semibold text-gray-900 text-base";
            let borderStyle = "border border-gray-100";
            let ringColor = "ring-indigo-100";

            if (index === 0) {
              bgColor = "bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-md hover:shadow-lg";
              rankColor = "text-yellow-600";
              nameStyle = "font-extrabold text-lg text-yellow-700";
              borderStyle = "border-yellow-200";
              ringColor = "ring-yellow-300";
            } else if (index === 1) {
              bgColor = "bg-gradient-to-r from-gray-100 to-gray-50 shadow hover:shadow-md";
              rankColor = "text-gray-600";
              nameStyle = "font-bold text-lg text-gray-700";
              borderStyle = "border-gray-200";
              ringColor = "ring-gray-300";
            } else if (index === 2) {
              bgColor = "bg-gradient-to-r from-orange-100 to-orange-50 shadow hover:shadow-md";
              rankColor = "text-orange-600";
              nameStyle = "font-bold text-lg text-orange-700";
              borderStyle = "border-orange-200";
              ringColor = "ring-orange-300";
            }

            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`flex items-center justify-between ${bgColor} cursor-pointer p-4 rounded-xl ${borderStyle} transition transform hover:scale-[1.01]`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank number on the left */}
                  <div className="w-12 text-center">
                    <p className={`text-2xl font-extrabold ${rankColor}`}>
                      #{index + 1}
                    </p>
                  </div>

                  {/* Profile photo + details */}
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(user)}
                      alt={user.full_name}
                      className={`w-12 h-12 rounded-full object-cover ring-2 ${ringColor}`}
                    />
                    <div>
                      <p className={nameStyle}>{user.full_name}</p>
                      <p className="text-xs text-gray-500">
                        Total Ratings: {user.total_ratings || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500 italic">
                    {user.branch || "—"}
                  </p>
                  <p className="font-semibold text-indigo-600 text-lg">
                    {user.avg_overall_xp?.toFixed(1) || 0} XP
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500 text-sm">
            No users yet with 3 or more ratings.
          </p>
        )}
      </div>

      {/* 🟢 Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[85vh]">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✖
            </button>

            <div className="flex items-center gap-6 mb-6 border-b pb-4">
              <img
                src={getAvatar(selectedUser)}
                alt={selectedUser.full_name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedUser.full_name}
                </h2>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <p>
                    ⭐ XP:{" "}
                    <span className="text-indigo-600 font-semibold">
                      {selectedUser.avg_overall_xp?.toFixed(1) || 0}
                    </span>{" "}
                    • 💬 {selectedUser.total_ratings || 0} Ratings
                  </p>
                  <p className="italic text-gray-500">
                    {selectedUser.branch || "—"}
                  </p>
                </div>
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
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span>{label}</span>
                    <span>
                      {Number(selectedUser[key as keyof Profile])?.toFixed(1) || 0}/5
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (Number(selectedUser[key as keyof Profile]) || 0) * 20
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}