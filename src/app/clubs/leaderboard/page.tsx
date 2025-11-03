"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

// Club type
type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  rank: string; // Simulated rank for now
};

// 🔹 Reusable ClubCard
function ClubCard({
  club,
  status,
  onClick,
}: {
  club: Club;
  status?: "joined" | "requested" | "none";
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="p-4 bg-gray-100 rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
          👤
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{club.name}</h3>
          <p className="text-sm text-gray-600">{club.category || "Uncategorized"}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-semibold text-gray-500">{club.rank}</span>
        {status === "joined" && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded">Joined</span>
        )}
        {status === "requested" && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded">Requested</span>
        )}
      </div>
    </div>
  );
}

// 🔹 Club Modal
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
  if (!club) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        {/* Club details */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl">
            👤
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{club.name}</h2>
            <p className="text-sm text-gray-600">{club.category || "Uncategorized"}</p>
          </div>
        </div>

        <p className="text-gray-700 mb-4">{club.description || "No description provided."}</p>

        {/* Rank */}
        <p className="font-semibold text-indigo-600 mb-4">{club.rank}</p>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          {status === "joined" ? (
            <button
              onClick={() => (window.location.href = `/clubs/${club.id}`)}
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
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 🔹 Join Modal
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

// 🔹 Request Modal
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
          You’ve used all your chances. Would you like to send a request to join this club?
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

  // Filters
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Join logic state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentClubId, setCurrentClubId] = useState<string | null>(null);
  const [realPass, setRealPass] = useState<string | null>(null);
  const [triesLeft, setTriesLeft] = useState(3);
  const [error, setError] = useState("");

  // ✅ Fetch clubs
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, category, description")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching clubs:", error.message);
      setClubs([]);
    } else {
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

  // ✅ Open Join flow
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

  // ✅ Handle passcode submission
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

  // ✅ Handle request after fails
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

      {/* Club Modal */}
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

      {/* Join Modal */}
      {showJoinModal && (
        <JoinModal
          onClose={() => setShowJoinModal(false)}
          onSubmit={submitPasscode}
          error={error}
          triesLeft={triesLeft}
        />
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <RequestModal
          onClose={() => setShowRequestModal(false)}
          onRequest={handleRequest}
        />
      )}
    </div>
  );
}