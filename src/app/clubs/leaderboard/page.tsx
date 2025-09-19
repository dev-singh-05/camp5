"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

type Club = {
  id: string;
  name: string;
  category: string | null;
  logo_url?: string | null;
  member_count?: number;
};

export default function ClubLeaderboard() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      // Fetch clubs
      const { data: clubsData, error: clubsErr } = await supabase
        .from("clubs")
        .select("id, name, category, logo_url");
      if (clubsErr) {
        console.error("Error fetching clubs:", clubsErr.message);
        setLoading(false);
        return;
      }

      // Fetch members
      const { data: membersData, error: membersErr } = await supabase
        .from("club_members")
        .select("club_id");
      if (membersErr) {
        console.error("Error fetching members:", membersErr.message);
        setLoading(false);
        return;
      }

      // Count members per club
      const counts: Record<string, number> = {};
      membersData?.forEach((m) => {
        counts[m.club_id] = (counts[m.club_id] || 0) + 1;
      });

      // Attach counts
      const clubsWithCounts: Club[] =
        clubsData?.map((c) => ({
          ...c,
          member_count: counts[c.id] || 0,
        })) || [];

      // Sort by member count
      clubsWithCounts.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));

      setClubs(clubsWithCounts);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <p className="p-6">Loading leaderboard...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Club Leaderboard</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded bg-white shadow-sm"
        >
          <option value="all">All Categories</option>
          <option value="Sports">Sports</option>
          <option value="Arts">Arts</option>
          <option value="Tech">Tech</option>
          <option value="General">General</option>
        </select>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {clubs.length === 0 && (
          <p className="text-gray-600 text-center">
            🚀 No clubs yet. Create one to appear here!
          </p>
        )}

        {clubs
          .filter((c) => filter === "all" || c.category === filter)
          .map((club, idx) => {
            const globalRank = idx + 1;
            const categoryClubs = clubs.filter((c) => c.category === club.category);
            const categoryRank =
              categoryClubs.findIndex((c) => c.id === club.id) + 1;

            return (
              <div
                key={club.id}
                className="flex items-center justify-between p-6 bg-white rounded-xl shadow hover:shadow-lg transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {club.logo_url ? (
                      <img
                        src={club.logo_url}
                        alt={club.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-xl">🏆</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {club.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      #{globalRank} Global • #{categoryRank} in{" "}
                      {club.category || "General"} • {club.member_count || 0}{" "}
                      members
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/clubs/${club.id}`)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Join
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

