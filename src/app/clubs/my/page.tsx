"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Club = {
  id: string;
  name: string;
  category: string | null;
};

export default function MyClubsPage() {
  const router = useRouter();
  const [joinedClubs, setJoinedClubs] = useState<Club[]>([]);
  const [requestedClubs, setRequestedClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state for creating a club
  const [showModal, setShowModal] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubCategory, setClubCategory] = useState("");
  const [clubPasscode, setClubPasscode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyClubs() {
      setLoading(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        router.push("/login");
        return;
      }
      const userId = userData.user.id;

      // Joined clubs
      const { data: joined } = await supabase
        .from("club_members")
        .select("club_id, clubs(id, name, category)")
        .eq("user_id", userId);

      if (joined) {
        const list = joined.map((r: any) => r.clubs) as Club[];
        setJoinedClubs(list);
      }

      // Requested clubs
      const { data: requested } = await supabase
        .from("club_requests")
        .select("club_id, status, clubs(id, name, category)")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (requested) {
        const list = requested.map((r: any) => r.clubs) as Club[];
        setRequestedClubs(list);
      }

      setLoading(false);
    }

    fetchMyClubs();
  }, [router]);

  // Create a club
  async function handleCreateClub() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (!clubName.trim()) {
      setFormError("Club name is required.");
      return;
    }

    if (!clubCategory) {
      setFormError("Please select a category.");
      return;
    }

    const { error } = await supabase.from("clubs").insert([
      {
        name: clubName.trim(),
        category: clubCategory,
        passcode: clubPasscode || null,
        created_by: userData.user.id,
      },
    ]);

    if (error) {
      setFormError(error.message);
    } else {
      setShowModal(false);
      setClubName("");
      setClubCategory("");
      setClubPasscode("");
      setFormError(null);
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-white">
        <p className="text-gray-700">Loading your clubs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-white p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Clubs</h1>

      {/* Joined Clubs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-indigo-700 mb-4">Joined Clubs</h2>
        {joinedClubs.length === 0 ? (
          <p className="text-gray-600">You haven't joined any clubs yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {joinedClubs.map((club) => (
              <Link
                href={`/clubs/${club.id}`}
                key={club.id}
                className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold text-gray-800">{club.name}</h3>
                <p className="text-sm text-gray-500">{club.category || "General"}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-orange-600 mb-4">Pending Requests</h2>
        {requestedClubs.length === 0 ? (
          <p className="text-gray-600">You don't have any pending requests.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {requestedClubs.map((club) => (
              <div
                key={club.id}
                className="p-6 bg-gray-100 border border-gray-300 rounded-xl shadow-inner"
              >
                <h3 className="text-lg font-bold text-gray-800">{club.name}</h3>
                <p className="text-sm text-gray-500">{club.category || "General"}</p>
                <p className="mt-2 text-sm text-orange-600 font-medium">
                  ⏳ Waiting for approval
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Browse All Clubs + Plus Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-indigo-700">Browse All Clubs</h2>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white text-2xl flex items-center justify-center hover:bg-indigo-700"
        >
          +
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Create a New Club</h2>

            <input
              type="text"
              placeholder="Club Name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded"
            />

            <select
              value={clubCategory}
              onChange={(e) => setClubCategory(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded"
            >
              <option value="">Select Category</option>
              <option value="Sports">Sports</option>
              <option value="Arts">Arts</option>
              <option value="Tech">Tech</option>
              <option value="General">General</option>
            </select>

            <input
              type="password"
              placeholder="Club Passcode (optional)"
              value={clubPasscode}
              onChange={(e) => setClubPasscode(e.target.value)}
              className="w-full mb-6 px-4 py-2 border rounded"
            />

            {formError && <p className="text-red-600 mb-4">{formError}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClub}
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
