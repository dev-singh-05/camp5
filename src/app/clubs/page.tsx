"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
};

// ClubCard
function ClubCard({
  club,
  rank,
  status,
  onClick,
}: {
  club: Club;
  rank?: number;
  status?: "joined" | "requested" | "join";
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-gray-100 rounded-xl shadow-md flex items-center justify-between hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
          👤
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{club.name}</h3>
          <p className="text-sm text-gray-600">{club.category || "Uncategorized"}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {rank !== undefined && (
          <span className="text-sm font-semibold text-gray-500">Rank #{rank}</span>
        )}
        {status === "joined" ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded">Joined</span>
        ) : status === "requested" ? (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded">Requested</span>
        ) : (
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded">Join</span>
        )}
      </div>
    </div>
  );
}

export default function ClubsPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);

  // Create modal states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [passcode, setPasscode] = useState("");
  const [description, setDescription] = useState("");

  // Club details modal states
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  // Passcode modal states
  const [showPassModal, setShowPassModal] = useState(false);
  const [enteredPass, setEnteredPass] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [joiningClub, setJoiningClub] = useState<Club | null>(null);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Fetch clubs
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, category, description")
      .order("name", { ascending: true });

    if (!error && data) setClubs(data as Club[]);

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

  // ✅ Handle Join with passcode flow
  const startJoin = async (club: Club) => {
    setJoiningClub(club);
    setTriesLeft(3);
    setEnteredPass("");
    setShowPassModal(true);
  };

  const handlePassSubmit = async () => {
    if (!joiningClub) return;

    const { data: clubData } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", joiningClub.id)
      .single();

    const realPass = clubData?.passcode;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    if (!realPass) {
      await supabase.from("club_members").insert([{ club_id: joiningClub.id, user_id: user.id }]);
      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      return;
    }

    if (enteredPass === realPass) {
      await supabase.from("club_members").insert([{ club_id: joiningClub.id, user_id: user.id }]);
      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      return;
    }

    if (triesLeft - 1 > 0) {
      setTriesLeft(triesLeft - 1);
      setEnteredPass("");
    } else {
      setShowPassModal(false);
      setShowRequestModal(true);
    }
  };

  const handleRequest = async () => {
    if (!joiningClub) return;
    const userRes = await supabase.auth.getUser();
    const user = userRes.data?.user;
    if (!user) return;

    await supabase.from("club_requests").insert([
      { club_id: joiningClub.id, user_id: user.id, status: "pending" },
    ]);
    setRequestedClubIds((prev) => [...prev, joiningClub.id]);
    setShowRequestModal(false);
  };

  // Create club logic
  const handleCreate = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  // Step 1: Insert club
  const { data: newClub, error: clubError } = await supabase
    .from("clubs")
    .insert([
      {
        name,
        category,
        passcode: passcode || null,
        description: description || null,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (clubError) {
    console.error("Error creating club:", clubError.message);
    return;
  }

  // Step 2: Add creator as admin in club_members
  if (newClub) {
    await supabase.from("club_members").insert([
      {
        club_id: newClub.id,
        user_id: user.id,
        role: "admin", // ✅ creator becomes admin
      },
    ]);
  }

  // Reset form + refresh clubs
  setName("");
  setCategory("");
  setPasscode("");
  setDescription("");
  setShowModal(false);
  fetchClubs();
};


  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Topbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-3">
          <Link href="/clubs/my" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">My Clubs</Link>
          <Link href="/clubs/leaderboard" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Leaderboard</Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
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
      </div>

      {/* Clubs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs
          .filter((c) => {
            const matchesCategory = filter === "all" || c.category?.toLowerCase() === filter.toLowerCase();
            const matchesSearch =
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.category?.toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
          })
          .map((club, i) => (
            <ClubCard
              key={club.id}
              club={club}
              rank={i + 1}
              status={
                joinedClubIds.includes(club.id)
                  ? "joined"
                  : requestedClubIds.includes(club.id)
                  ? "requested"
                  : "join"
              }
              onClick={() => {
                setSelectedClub(club);
                setSelectedRank(i + 1);
              }}
            />
          ))}
      </div>

      {/* Floating + button */}
<button
  onClick={() => setShowModal(true)}
  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white text-3xl shadow-lg flex items-center justify-center hover:scale-105"
>
  +
</button>

{/* Create Club Modal */}
{showModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
      <h3 className="text-xl font-bold mb-4">Create a New Club</h3>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Club Name"
        className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">Select Category</option>
        <option>Sports</option>
        <option>Arts</option>
        <option>Tech</option>
        <option>General</option>
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Club Description"
        className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        rows={3}
      />

      <input
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Passcode (optional)"
        className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowModal(false)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}


      {/* Club Details Modal */}
      {selectedClub && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setSelectedClub(null)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedClub.name}</h2>
                <p className="text-gray-600">{selectedClub.category || "Uncategorized"}</p>
              </div>
            </div>

            <p className="mb-4 text-gray-700">{selectedClub.description || "No description provided."}</p>

            <div className="flex justify-between items-center">
              {selectedRank && (
                <span className="text-sm font-semibold text-gray-500">Rank #{selectedRank}</span>
              )}
              {joinedClubIds.includes(selectedClub.id) ? (
                <button onClick={() => router.push(`/clubs/${selectedClub.id}`)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Go Inside</button>
              ) : requestedClubIds.includes(selectedClub.id) ? (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded">Requested</span>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => startJoin(selectedClub)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Join</button>
                  <button onClick={() => { setJoiningClub(selectedClub); setShowRequestModal(true); }} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Request</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {showPassModal && joiningClub && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Enter Passcode</h3>
            <input
              type="password"
              value={enteredPass}
              onChange={(e) => setEnteredPass(e.target.value)}
              placeholder="Enter passcode"
              className="w-full mb-3 p-2 border rounded"
            />
            <p className="text-sm text-gray-600 mb-3">Tries left: {triesLeft}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPassModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handlePassSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && joiningClub && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Request Access</h3>
            <p className="mb-4">You used all attempts. Do you want to send a request to join <b>{joiningClub.name}</b>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleRequest} className="px-4 py-2 bg-yellow-500 text-white rounded">Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}









