"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export type Club = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  logo_url?: string | null;
  // rank can be string (like "#1 Global") or number
  rank?: string | number | null;
};

export default function ClubModal({
  club,
  status, // "joined" | "requested" | "none"
  onClose,
  onSuccess, // callback after join/request to refresh parent
}: {
  club: Club | null;
  status: "joined" | "requested" | "none";
  onClose: () => void;
  onSuccess?: (newStatus: "joined" | "requested") => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [triesLeft, setTriesLeft] = useState(3);
  const [error, setError] = useState<string | null>(null);

  if (!club) return null;

  const handleJoin = async () => {
    setError(null);
    setLoading(true);

    try {
      // fetch passcode for this club
      const { data: clubData, error: clubErr } = await supabase
        .from("clubs")
        .select("passcode")
        .eq("id", club.id)
        .single();

      if (clubErr) {
        setError("Failed to fetch club data.");
        setLoading(false);
        return;
      }

      const realPass = clubData?.passcode;
      const userRes = await supabase.auth.getUser();
      const user = userRes.data?.user;
      if (!user) {
        setError("You must be logged in to join.");
        setLoading(false);
        return;
      }

      if (!realPass) {
        // public club — join instantly
        await supabase.from("club_members").insert([{ club_id: club.id, user_id: user.id }]);
        onSuccess?.("joined");
        setLoading(false);
        return;
      }

      // passcode-protected: give up to 3 tries, then create request
      let tries = 3;
      while (tries > 0) {
        const pass = prompt(
          tries === 3
            ? "Enter club passcode (leave empty to request access):"
            : `Wrong passcode. ${tries} tries left:`
        );
        if (pass === null) {
          // user cancelled
          setLoading(false);
          return;
        }
        if (pass === realPass) {
          await supabase.from("club_members").insert([{ club_id: club.id, user_id: user.id }]);
          onSuccess?.("joined");
          setLoading(false);
          return;
        }
        tries--;
        setTriesLeft(tries);
      }

      // all tries used — create request
      await supabase.from("club_requests").insert([{ club_id: club.id, user_id: user.id, status: "pending" }]);
      onSuccess?.("requested");
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = () => {
    // only allow entering if status === 'joined'
    if (status === "joined") router.push(`/clubs/${club.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-60 w-[min(980px,96%)] max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-start gap-4">
          {/* Left: logo */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-600">
              {/* show logo if present later, placeholder now */}
              {club.logo_url ? (
                <img src={club.logo_url} alt={`${club.name} logo`} className="w-full h-full object-cover rounded-full" />
              ) : (
                "👤"
              )}
            </div>
          </div>

          {/* Middle: name/category/description */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{club.name}</h2>
            <p className="text-sm text-gray-600 mb-4">{club.category || "Uncategorized"}</p>

            <div className="text-base text-gray-700 whitespace-pre-line">
              {club.description || "No description provided."}
            </div>
          </div>

          {/* Right: rank + actions */}
          <div className="flex flex-col items-end gap-4">
            <div className="text-right">
              {club.rank && <div className="text-lg font-semibold text-gray-800 mb-2"> {club.rank}</div>}
            </div>

            <div className="flex flex-col gap-2">
              {status === "joined" ? (
                <>
                  <button
                    onClick={handleEnter}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Enter Club
                  </button>
                </>
              ) : status === "requested" ? (
                <div className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded">Requested</div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading ? "Working..." : "Join"}
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
