"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  total_xp: number;
  rank: number; // ✅ Added rank property
};

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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="p-4 bg-white rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-indigo-200"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center">
          {rank === 1 && <span className="text-4xl">🥇</span>}
          {rank === 2 && <span className="text-4xl">🥈</span>}
          {rank === 3 && <span className="text-4xl">🥉</span>}
          {rank > 3 && (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
              #{rank}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{club.name}</h3>
          <p className="text-sm text-gray-600">{club.category || "Uncategorized"}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-xl font-bold text-indigo-600">{club.total_xp} XP</span>
        {status === "joined" && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">Joined</span>
        )}
        {status === "requested" && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">Requested</span>
        )}
      </div>
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
            {club.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{club.name}</h2>
            <p className="text-sm text-gray-600">{club.category || "Uncategorized"}</p>
            <p className="text-sm text-indigo-600 font-semibold">Global Rank #{club.rank}</p>
          </div>
        </div>

        <p className="text-gray-700 mb-4">{club.description || "No description provided."}</p>

        <div className="bg-indigo-50 p-4 rounded-lg mb-4">
          <p className="text-2xl font-bold text-indigo-700 text-center">
            {club.total_xp} XP
          </p>
          <p className="text-sm text-gray-600 text-center">Total Club Experience</p>
        </div>

        <div className="flex justify-end gap-3">
          {status === "joined" ? (
            <button
              onClick={() => router.push(`/clubs/${club.id}`)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go Inside
            </button>
          ) : status === "requested" ? (
            <span className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded">Requested</span>
          ) : (
            <button
              onClick={onJoin}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Join Club
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-lg">
        <h3 className="text-xl font-bold mb-4">Enter Club Passcode</h3>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter passcode"
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <p className="text-sm text-gray-500 mb-4">{triesLeft} tries left</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(input)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestModal({
  onClose,
  onRequest,
}: {
  onClose: () => void;
  onRequest: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-lg">
        <h3 className="text-xl font-bold mb-4">Out of Tries</h3>
        <p className="mb-4">
          You've used all your chances. Would you like to send a request to join this club?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onRequest}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Request
          </button>
        </div>
      </div>
    </div>
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
    // Fetch clubs with XP from ledger
    const { data: xpData, error: xpError } = await supabase
      .from("club_xp_ledger")
      .select("club_id, total_xp, clubs(id, name, category, description)")
      .order("total_xp", { ascending: false });

    if (xpError) {
      console.error("Error fetching XP data:", xpError);
      return;
    }

    // Also fetch clubs without XP (new clubs)
    const { data: allClubs } = await supabase
      .from("clubs")
      .select("id, name, category, description");

    // ✅ Store original rank with each club
    const clubsWithXP = (xpData || []).map((item: any, index: number) => ({
      id: item.clubs.id,
      name: item.clubs.name,
      category: item.clubs.category,
      description: item.clubs.description,
      total_xp: item.total_xp,
      rank: index + 1, // ✅ Store the global rank
    }));

    // Add clubs without XP at the end
    const clubIdsWithXP = new Set(clubsWithXP.map(c => c.id));
    const clubsWithoutXP = (allClubs || [])
      .filter((c: any) => !clubIdsWithXP.has(c.id))
      .map((c: any, index: number) => ({
        ...c,
        total_xp: 0,
        rank: clubsWithXP.length + index + 1, // ✅ Continue ranking from last XP rank
      }));

    setClubs([...clubsWithXP, ...clubsWithoutXP]);

    // Fetch user memberships
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
      return;
    }

    setCurrentClubId(clubId);
    setRealPass(clubData.passcode);
    setTriesLeft(3);
    setError("");
    setShowJoinModal(true);
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

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🏆 Club Leaderboard</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clubs..."
          className="px-4 py-2 border rounded w-full md:w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          className="border px-3 py-2 rounded shadow-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="Sports">Sports</option>
          <option value="Arts">Arts</option>
          <option value="Tech">Tech</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Clubs list */}
      <div className="space-y-4">
        {clubs.length === 0 ? (
          <p className="text-gray-500">No clubs found.</p>
        ) : (
          clubs
            .filter((c) => {
              const matchesCategory =
                filter === "all" ||
                c.category?.toLowerCase() === filter.toLowerCase();
              const matchesSearch =
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.category?.toLowerCase().includes(search.toLowerCase());
              return matchesCategory && matchesSearch;
            })
            .map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                rank={club.rank} // ✅ Use stored global rank, not index
                status={
                  joinedClubIds.includes(club.id)
                    ? "joined"
                    : requestedClubIds.includes(club.id)
                    ? "requested"
                    : "none"
                }
                onClick={() => setSelectedClub(club)}
              />
            ))
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
}