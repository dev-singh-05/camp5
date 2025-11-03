"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

type Request = {
  id: string;
  requester_id: string;
  candidate_id: string;
  category: string;
  match_type: string;
  answer: string;
  question_text: string;
  status: string;
  created_at: string;
  requester?: {
    id: string;
    full_name?: string;
    profile_photo?: string | null;
    gender?: string | null;
    branch?: string | null;
    year?: string | null;
    height?: string | null;
    dating_description?: string | null;
    interests?: string[] | null;
  };
};

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch requests where current user is the candidate
      const { data, error } = await supabase
        .from("dating_requests")
        .select("*")
        .eq("candidate_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch requests error:", error);
        return;
      }

      // Fetch requester profiles
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo, gender, branch, year, height, dating_description, interests")
            .eq("id", req.requester_id)
            .single();

          return { ...req, requester: profile || undefined };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId: string, requesterId: string, matchType: string, category: string) {
    setResponding(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the match
      const { data: newMatch, error: matchErr } = await supabase
        .from("dating_matches")
        .insert([
          {
            user1_id: requesterId,
            user2_id: user.id,
            match_type: matchType,
            dating_category: category,
          },
        ])
        .select()
        .single();

      if (matchErr) {
        console.error("Match creation error:", matchErr);
        toast.error("Failed to create match.");
        return;
      }

      // Update request status
      const { error: updateErr } = await supabase
        .from("dating_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) {
        console.error("Update request error:", updateErr);
      }

      toast.success("Match created! Opening chat...");
      
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      // Navigate to chat
      setTimeout(() => {
        router.push(`/dating/chat/${newMatch.id}`);
      }, 1000);
    } catch (err) {
      console.error("Accept error:", err);
      toast.error("Something went wrong.");
    } finally {
      setResponding(null);
    }
  }

  async function handleDecline(requestId: string) {
    setResponding(requestId);
    try {
      const { error } = await supabase
        .from("dating_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) {
        console.error("Decline error:", error);
        toast.error("Failed to decline request.");
        return;
      }

      toast("Request declined.");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Something went wrong.");
    } finally {
      setResponding(null);
    }
  }

  const profilePlaceholder = "/images/avatar-placeholder.png";

  // Determine what to hide based on category
  function shouldHidePhoto(category: string) {
    return category === "serious" || category === "fun";
  }

  function shouldHideName(category: string, gender?: string | null) {
    return category === "serious" || category === "fun" || 
      (category === "mystery" && gender?.toLowerCase() === "female");
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 p-6">
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Match Requests</h1>
          <button onClick={() => router.push("/dating")} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            ← Back
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-600">No pending requests right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl shadow p-6">
                {/* Requester Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {shouldHidePhoto(req.category) ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Hidden</div>
                    ) : (
                      <img src={req.requester?.profile_photo || profilePlaceholder} alt="Requester" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-lg">
                          {shouldHideName(req.category, req.requester?.gender) ? "Name Hidden" : (req.requester?.full_name || "N/A")}
                        </p>
                        <p className="text-sm text-gray-600">
                          {req.requester?.gender} • {req.requester?.year} • {req.requester?.branch}
                          {req.requester?.height && ` • ${req.requester.height}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{req.category}</span>
                      </div>
                    </div>

                    {req.requester?.dating_description && (
                      <p className="text-sm text-gray-700 italic mb-2">"{req.requester.dating_description}"</p>
                    )}

                    {req.requester?.interests && req.requester.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {req.requester.interests.map((i) => (
                          <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">{i}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Question & Answer */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-800 mb-2">Q: {req.question_text}</p>
                  <p className="text-gray-700">A: {req.answer}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={responding === req.id}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    {responding === req.id ? "..." : "Decline"}
                  </button>
                  <button
                    onClick={() => handleAccept(req.id, req.requester_id, req.match_type, req.category)}
                    disabled={responding === req.id}
                    className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {responding === req.id ? "Accepting..." : "Let's Match"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}