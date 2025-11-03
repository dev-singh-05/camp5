"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

// Club type
type Club = { 
  id: string; 
  name: string; 
  category: string | null; 
  description?: string | null;
};

// 🔹 Reusable ClubCard
function ClubCard({
  club,
  rank,
  status,
  onClick,
}: {
  club: Club;
  rank?: number;
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
  const router = useRouter();
  if (!club) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close club modal"
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

        {/* Action buttons */}
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
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyClubs() {
  const router = useRouter();
  const [joined, setJoined] = useState<Club[]>([]);
  const [pending, setPending] = useState<Club[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Modal form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [passcode, setPasscode] = useState("");
  const [description, setDescription] = useState("");

  // Fetch clubs
  useEffect(() => {
    async function fetchData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      const userId = userData.user.id;

      const { data: joined } = await supabase
        .from("club_members")
        .select("clubs(id, name, category, description)")
        .eq("user_id", userId);
      if (joined) setJoined(joined.map((j: any) => j.clubs));

      const { data: req } = await supabase
        .from("club_requests")
        .select("clubs(id, name, category, description)")
        .eq("user_id", userId)
        .eq("status", "pending");
      if (req) setPending(req.map((r: any) => r.clubs));
    }
    fetchData();
  }, [router]);

  // create club
  async function createClub() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: newClub, error } = await supabase
      .from("clubs")
      .insert([
        {
          name,
          category,
          passcode: passcode || null,
          description: description || null,
          created_by: userData.user.id,
        },
      ])
      .select("id")  // ✅ get real DB ID
      .single();

    if (error || !newClub) {
      console.error("❌ Failed to create club:", error?.message);
      return;
    }

    console.log("📌 newClub created:", newClub);

    // ✅ redirect with the real club ID
    router.push(`/clubs/${newClub.id}`);

    // reset form
    setShowModal(false);
    setName("");
    setCategory("");
    setPasscode("");
    setDescription("");
  }

  // join logic
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
      window.location.reload();
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
        alert("✅ Joined club!");
        window.location.reload();
        return;
      }
      tries--;
    }

    await supabase.from("club_requests").insert([
      { club_id: clubId, user_id: user.id, status: "pending" },
    ]);
    alert("Request sent to club leader.");
    window.location.reload();
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 to-white relative">
      {/* Header with Back button on the left */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            aria-label="Go back"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">My Clubs</h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-md transition"
        >
          + Create Club
        </button>
      </div>

      {/* Joined Clubs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Joined Clubs</h2>
        {joined.length === 0 ? (
          <p className="text-gray-500">You haven’t joined any clubs yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {joined.map((c, i) => (
              <ClubCard
                key={c.id}
                club={c}
                rank={i + 1}
                status="joined"
                onClick={() => setSelectedClub(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Pending Requests</h2>
        {pending.length === 0 ? (
          <p className="text-gray-500">No pending requests.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {pending.map((c, i) => (
              <ClubCard
                key={c.id}
                club={c}
                rank={i + 1}
                status="requested"
                onClick={() => setSelectedClub(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating + button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white text-3xl shadow-lg flex items-center justify-center hover:scale-105"
        aria-label="Create club"
      >
        +
      </button>

      {/* Club Modal */}
      {selectedClub && (
        <ClubModal
          club={selectedClub}
          status={
            joined.find((j) => j.id === selectedClub.id)
              ? "joined"
              : pending.find((p) => p.id === selectedClub.id)
              ? "requested"
              : "none"
          }
          onClose={() => setSelectedClub(null)}
          onJoin={() => handleJoin(selectedClub.id)}
        />
      )}

      {/* Create Club Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 backdrop-blur-sm">
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
                onClick={createClub}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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