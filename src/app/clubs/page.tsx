"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Club = {
  id: string;
  name: string;
  category: string | null;
  passcode?: string | null;
};

export default function ClubsDashboard() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);

  // modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubCategory, setClubCategory] = useState("");
  const [clubPasscode, setClubPasscode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // passcode modal
  const [passcodeClub, setPasscodeClub] = useState<Club | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      // fetch clubs
      const { data: allClubs } = await supabase.from("clubs").select("id, name, category, passcode");
      if (allClubs) setClubs(allClubs);

      // joined
      const { data: joinedData } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", userData.user.id);
      if (joinedData) setJoined(joinedData.map((j: any) => j.club_id));

      // requested
      const { data: reqData } = await supabase
        .from("club_requests")
        .select("club_id")
        .eq("user_id", userData.user.id);
      if (reqData) setRequested(reqData.map((r: any) => r.club_id));
    }
    fetchData();
  }, [router]);

  async function handleCreateClub() {
    if (!userId) return;
    if (!clubName.trim()) {
      setCreateError("Club name required");
      return;
    }
    if (!clubCategory) {
      setCreateError("Category required");
      return;
    }

    const { error } = await supabase.from("clubs").insert([
      { name: clubName, category: clubCategory, passcode: clubPasscode || null, created_by: userId },
    ]);
    if (error) {
      setCreateError(error.message);
      return;
    }

    setShowCreateModal(false);
    setClubName("");
    setClubCategory("");
    setClubPasscode("");
    const { data: allClubs } = await supabase.from("clubs").select("id, name, category, passcode");
    if (allClubs) setClubs(allClubs);
  }

  async function joinClub(club: Club) {
    if (!userId) return;
    if (joined.includes(club.id)) {
      router.push(`/clubs/${club.id}`);
      return;
    }
    if (requested.includes(club.id)) {
      alert("Already requested.");
      return;
    }

    if (club.passcode) {
      setPasscodeClub(club);
      setPasscodeInput("");
      setAttemptsLeft(3);
      setPasscodeError(null);
      return;
    }

    await supabase.from("club_members").insert([{ club_id: club.id, user_id: userId }]);
    setJoined((prev) => [...prev, club.id]);
  }

  async function submitPasscode() {
    if (!userId || !passcodeClub) return;
    if (passcodeInput === passcodeClub.passcode) {
      await supabase.from("club_members").insert([{ club_id: passcodeClub.id, user_id: userId }]);
      setJoined((prev) => [...prev, passcodeClub.id]);
      setPasscodeClub(null);
      return;
    }
    const left = attemptsLeft - 1;
    setAttemptsLeft(left);
    if (left > 0) {
      setPasscodeError(`Wrong passcode. ${left} attempts left.`);
      return;
    }
    await supabase.from("club_requests").insert([{ club_id: passcodeClub.id, user_id: userId, status: "pending" }]);
    setRequested((prev) => [...prev, passcodeClub.id]);
    setPasscodeClub(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white p-6 relative">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-6 max-w-6xl mx-auto">
        <div className="flex gap-4">
          <Link href="/clubs/my">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded">My Clubs</button>
          </Link>
          <Link href="/clubs/leaderboard">
            <button className="px-4 py-2 bg-orange-500 text-white rounded">Leaderboard</button>
          </Link>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All Categories</option>
          <option value="Sports">Sports</option>
          <option value="Arts">Arts</option>
          <option value="Tech">Tech</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Clubs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {clubs
          .filter((c) => filter === "all" || c.category === filter)
          .map((club, idx) => {
            const joinedLabel = joined.includes(club.id)
              ? "Joined"
              : requested.includes(club.id)
              ? "Requested"
              : "Join";
            return (
              <div key={club.id} className="p-6 bg-white rounded shadow">
                <p className="text-sm text-indigo-500">Rank #{idx + 1}</p>
                <h2 className="font-bold text-xl">{club.name}</h2>
                <p className="text-sm text-gray-500">{club.category || "General"}</p>
                <button
                  onClick={() => joinClub(club)}
                  disabled={joinedLabel !== "Join"}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-400"
                >
                  {joinedLabel}
                </button>
              </div>
            );
          })}
      </div>

      {/* Floating + */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white text-3xl flex items-center justify-center shadow-lg"
      >
        +
      </button>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h3 className="font-bold mb-3">Create Club</h3>
            <input
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Name"
              className="w-full mb-3 p-2 border rounded"
            />
            <select
              value={clubCategory}
              onChange={(e) => setClubCategory(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            >
              <option value="">Select Category</option>
              <option>Sports</option>
              <option>Arts</option>
              <option>Tech</option>
              <option>General</option>
            </select>
            <input
              type="password"
              value={clubPasscode}
              onChange={(e) => setClubPasscode(e.target.value)}
              placeholder="Passcode (optional)"
              className="w-full mb-3 p-2 border rounded"
            />
            {createError && <p className="text-red-600">{createError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleCreateClub} className="px-3 py-1 bg-indigo-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Passcode modal */}
      {passcodeClub && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded w-full max-w-sm">
            <h3 className="font-bold mb-2">Enter Passcode</h3>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            />
            {passcodeError && <p className="text-red-600 mb-2">{passcodeError}</p>}
            <p className="text-sm text-gray-500 mb-3">Attempts left: {attemptsLeft}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPasscodeClub(null)} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
              <button onClick={submitPasscode} className="px-3 py-1 bg-indigo-600 text-white rounded">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}










