"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getMyMatches } from "@/utils/dating";
import { User } from "lucide-react";

type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  match_type: string;
};

export default function DatingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  async function fetchMatches() {
    try {
      const data = await getMyMatches();
      setMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    const deletedId = searchParams.get("deletedId");
    if (deletedId) {
      setMatches((prev) => prev.filter((m) => m.id !== deletedId));
      router.replace("/dating");
    }
  }, [searchParams, router]);

  // 🔍 check if user profile is complete
  async function checkProfileComplete() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return false;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, gender, interests, dating_description")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.gender || !profile.interests?.length || !profile.dating_description) {
      setShowProfileModal(true); // show modal instead of alert
      return false;
    }
    return true;
  }

// --- Create Random Match ---
async function handleRandomMatch() {
  setCreating(true);
  try {
    // ✅ Check profile completeness first
    const valid = await checkProfileComplete();
    if (!valid) return;

    // ✅ Fetch current user safely
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 🔹 Run Supabase RPC for random match
    const { data, error } = await supabase.rpc("random_match", {
      p_user_id: user.id,
    });

    if (error || !data) {
      alert("No match found right now. Try again later.");
      return;
    }

    router.push(`/dating/chat/${data}`);
  } catch (err) {
    console.error("Error creating random match:", err);
  } finally {
    setCreating(false);
  }
}

// --- Create Interest Match ---
async function handleInterestMatch() {
  setCreating(true);
  try {
    // ✅ Check profile completeness first
    const valid = await checkProfileComplete();
    if (!valid) return;

    // ✅ Fetch current user safely
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 🔹 Run Supabase RPC for interest match
    const { data, error } = await supabase.rpc("interest_match", {
      p_user_id: user.id,
    });

    if (error || !data) {
      alert("No interest-based match found right now.");
      return;
    }

    router.push(`/dating/chat/${data}`);
  } catch (err) {
    console.error("Error creating interest match:", err);
  } finally {
    setCreating(false);
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex flex-col">
      {/* Top bar */}
      <header className="flex justify-between items-center px-6 py-4 shadow bg-white">
        <h1 className="text-2xl font-bold text-gray-800">Blind Dating</h1>
        <Link
          href="/dating/dating-profiles"
          className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition shadow"
          title="Your dating profile"
        >
          <User className="w-5 h-5" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <button
            onClick={handleRandomMatch}
            disabled={creating}
            className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
              creating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {creating ? "Finding Match..." : "🎲 Random Match"}
          </button>

          <button
            onClick={handleInterestMatch}
            disabled={creating}
            className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
              creating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {creating ? "Finding Match..." : "💡 Interests Match"}
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Chats</h2>
        {loading ? (
          <p className="text-gray-600">Loading chats...</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-600">No chats yet. Start a match!</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                onClick={() => router.push(`/dating/chat/${match.id}`)}
                className="h-14 rounded-xl shadow bg-pink-400 hover:bg-pink-500 transition cursor-pointer flex items-center px-6 text-white font-medium"
              >
                {match.match_type === "random"
                  ? "🎲 Random Match"
                  : "💡 Interest Match"}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Profile Required Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-3 text-gray-800">Complete Your Profile</h2>
            <p className="text-gray-600 mb-6">
              You need to complete your dating profile before you can start matching.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push("/dating/dating-profiles")}
                className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 shadow"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
