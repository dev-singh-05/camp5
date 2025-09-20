"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type Club = {
  id: string;
  name: string;
  category: string | null;
  rank: string; // We'll simulate rank for now
};

export default function LeaderboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);

  // ✅ Fetch clubs
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, category")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching clubs:", error.message);
      setClubs([]);
    } else {
      // simulate ranks for now
      const withRanks = (data || []).map((c, i) => ({
        ...c,
        rank: `#${i + 1} Global`,
      }));
      setClubs(withRanks as Club[]);
    }

    // fetch user memberships & requests
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

  // ✅ Join logic (same as All Clubs page)
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

    const realPass = clubData?.passcode;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    if (!realPass) {
      await supabase.from("club_members").insert([
        { club_id: clubId, user_id: user.id },
      ]);
      setJoinedClubIds((prev) => [...prev, clubId]);
      return;
    }

    let tries = 3;
    while (tries > 0) {
      const pass = prompt(
        tries === 3
          ? "Enter club passcode (leave empty to request access):"
          : `Wrong passcode. ${tries} tries left:`
      );
      if (pass === null) return;
      if (pass === realPass) {
        await supabase.from("club_members").insert([
          { club_id: clubId, user_id: user.id },
        ]);
        setJoinedClubIds((prev) => [...prev, clubId]);
        alert("✅ Joined club!");
        return;
      }
      tries--;
    }

    await supabase.from("club_requests").insert([
      { club_id: clubId, user_id: user.id, status: "pending" },
    ]);
    setRequestedClubIds((prev) => [...prev, clubId]);
    alert("Request sent to club leader.");
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🏆 Club Leaderboard</h1>

      <div className="space-y-4">
        {clubs.length === 0 ? (
          <p className="text-gray-500">No clubs found.</p>
        ) : (
          clubs.map((club) => (
            <div
              key={club.id}
              className="flex items-center justify-between p-4 bg-gray-100 rounded-xl shadow hover:shadow-md transition"
            >
              {/* Left - Logo + Name */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                  👤
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {club.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {club.category || "Uncategorized"}
                  </p>
                </div>
              </div>

              {/* Right - Rank + Join Button */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">
                  {club.rank}
                </span>

                {joinedClubIds.includes(club.id) ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded">
                    Joined
                  </span>
                ) : requestedClubIds.includes(club.id) ? (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded">
                    Requested
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoin(club.id)}
                    className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}






