"use client";

import "./page.css";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Profile = {
  id: string;
  full_name?: string;
  enrollment_number?: string | null;
  college_email?: string | null;
  description?: string | null;
  profile_photo?: string | null;
  branch?: string | null;
  avg_overall_xp?: number | null;
};

type Request = {
  id: string;
  status: string;
  from_user?: { full_name: string | null } | null;
  to_user?: { full_name: string | null } | null;
};

type Rating = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  comment: string;
  created_at: string;
  to_user?: { full_name: string; profile_photo?: string | null } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [requestsSent, setRequestsSent] = useState<Request[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<Request[]>([]);
  const [uploading, setUploading] = useState(false);

  const [showSent, setShowSent] = useState(false);
  const [showReceived, setShowReceived] = useState(false);

  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratingsReceived, setRatingsReceived] = useState<Rating[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<Rating[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "given">("received");

  const [totalConnections, setTotalConnections] = useState<number>(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  const getAvatarUrl = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const fallbackName = encodeURIComponent(profile.full_name || "User");
    return `https://ui-avatars.com/api/?name=${fallbackName}&background=random&size=128`;
  };

  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      // ---- Fetch Profile ----
      let { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!profileData) {
        const fallbackName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          (session.user.email ? session.user.email.split("@")[0] : "Student");

        const { data: insertedProfile } = await supabase
          .from("profiles")
          .insert([{ id: userId, full_name: fallbackName, college_email: session.user.email }])
          .select()
          .maybeSingle();

        profileData = insertedProfile || null;
      }

      if (profileData) {
        setProfile(profileData);
        setDescription(profileData.description || "");
      }

      // ---- Fetch Requests ----
      const { data: sentData } = await supabase
        .from("profile_requests")
        .select(`
          id,
          status,
          to_user:to_user_id ( full_name )
        `)
        .eq("from_user_id", userId);

      const { data: receivedData } = await supabase
        .from("profile_requests")
        .select(`
          id,
          status,
          from_user:from_user_id ( full_name )
        `)
        .eq("to_user_id", userId)
        .eq("status", "pending");

      setRequestsSent(
        sentData?.map((r: any) => ({
          id: r.id,
          status: r.status,
          to_user: r.to_user || null,
        })) || []
      );

      setRequestsReceived(
        receivedData?.map((r: any) => ({
          id: r.id,
          status: r.status,
          from_user: r.from_user || null,
        })) || []
      );

      // ---- Fetch Ratings ----
      const { data: received } = await supabase
        .from("ratings")
        .select("*")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false });

      setRatingsReceived(received || []);

      const { data: given } = await supabase
        .from("ratings")
        .select(
          `
            id,
            from_user_id,
            to_user_id,
            comment,
            created_at,
            to_user:to_user_id (
              full_name,
              profile_photo
            )
          `
        )
        .eq("from_user_id", userId)
        .order("created_at", { ascending: false });

      const normalized = (given || []).map((r: any) => ({
        ...r,
        to_user: Array.isArray(r.to_user) ? r.to_user[0] : r.to_user,
      }));

      setRatingsGiven(normalized);

      // ---- Fetch Global Rank ----
      const { data: leaderboard } = await supabase
        .from("profiles")
        .select("id, avg_overall_xp")
        .order("avg_overall_xp", { ascending: false });

      const rankIndex = leaderboard?.findIndex((p) => p.id === userId);
      if (rankIndex !== undefined && rankIndex >= 0) setGlobalRank(rankIndex + 1);

      // ---- Fetch Total Connections ----
      const { count } = await supabase
        .from("profile_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

      setTotalConnections(count || 0);

      setLoading(false);
    }

    fetchData();
  }, [router]);

  async function handleSaveDescription() {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({ description })
      .eq("id", profile.id);

    if (!error) {
      setProfile((p) => (p ? { ...p, description } : p));
      toast.success("Description saved ✅");
    } else {
      toast.error("Failed to save description ❌");
    }
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profile) return;
    const file = e.target.files?.[0];
    if (!file) return toast.error("No file selected");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `avatars/${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo: publicUrl })
        .eq("id", profile.id);
      if (updateError) throw updateError;

      setProfile((p) => (p ? { ...p, profile_photo: publicUrl } : p));
      toast.success("Profile photo updated ✅");
    } catch (err) {
      toast.error("Failed to upload photo ❌");
    } finally {
      setUploading(false);
    }
  }

  async function handleRequestAction(id: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("profile_requests").update({ status }).eq("id", id);
    if (!error) {
      setRequestsReceived((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Request ${status} ✅`);
    } else toast.error("Failed to update request ❌");
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-200">
        <p className="text-gray-900 text-lg animate-pulse">Loading profile...</p>
      </div>
    );

  if (!profile)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-red-500">❌ Could not load or create profile</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-100 py-12 px-4">
      {/* Back Button */}
      <div className="text-box">
            <a
              href="#"
              role="button"
              aria-label="Go back"
              onClick={(e) => {
                e.preventDefault();
                router.back();
              }}
              className="btn btn-white btn-animated"
            >
              ← Back
            </a>
          </div>
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#fefefe] via-[#f8f7fb] to-[#ebe9f5] shadow-2xl rounded-3xl p-10 space-y-10 border border-gray-200 transition-all duration-300 hover:shadow-purple-200 relative">

        {/* Back Button
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute left-10 top-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:scale-105 transition"
        >
          ← Back
        </button> */}

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6">
          <div className="flex items-center gap-6">
            <img
              src={getAvatarUrl(profile)}
              alt="Profile Avatar"
              className="w-28 h-28 rounded-full object-cover shadow-lg border-2 border-purple-200"
            />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold text-gray-900">
                  {profile.full_name || "Student"}
                </h2>
                {globalRank && (
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-3 py-1 rounded-lg shadow-sm">
                    #{globalRank} Global Rank
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm">
                Enrollment: {profile.enrollment_number || "Not set"}
              </p>
              <p className="text-gray-700 text-sm">Email: {profile.college_email}</p>
              {profile.branch && (
                <p className="text-gray-700 text-sm font-semibold">Branch: {profile.branch}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <div className="flex gap-3">
              <label className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:opacity-90 shadow cursor-pointer transition">
                {uploading ? "Uploading..." : "Change Photo"}
                <input type="file" accept="image/*" onChange={handleUploadPhoto} hidden />
              </label>
              <button
                onClick={() => setShowRatingsModal(true)}
                className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-2 rounded-lg hover:opacity-90 shadow transition"
              >
                My Ratings
              </button>
            </div>
            <p className="text-gray-800 font-medium bg-purple-100 px-3 py-1 rounded-md shadow-sm">
              Total Connections: <span className="font-bold text-purple-700">{totalConnections}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="relative bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-5 shadow-sm">
          <label className="block mb-2 text-gray-900 font-semibold text-lg">
            {profile.description ? "Edit Description" : "Add Description"}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-gray-50 focus:ring-2 focus:ring-purple-300 resize-none transition"
            rows={4}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveDescription}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-2 rounded-lg shadow hover:scale-105 transition"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-6">
          {/* Requests Sent */}
          <div className="border rounded-lg shadow-sm bg-white/80">
            <button
              className="w-full flex justify-between items-center px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 text-gray-900 font-semibold rounded-t-lg"
              onClick={() => setShowSent(!showSent)}
            >
              Requests Sent
              <span>{showSent ? "▲" : "▼"}</span>
            </button>
            {showSent && (
              <div className="p-4 transition-all duration-500 ease-in-out">
                {requestsSent.length > 0 ? (
                  <ul className="space-y-3">
                    {requestsSent.map((r) => (
                      <li
                        key={r.id}
                        className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-purple-50 flex justify-between items-center shadow-sm hover:scale-[1.01] transition"
                      >
                        <span className="text-indigo-700 font-medium">
                          To: {r.to_user?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                          {r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No requests sent</p>
                )}
              </div>
            )}
          </div>

          {/* Requests Received */}
          <div className="border rounded-lg shadow-sm bg-white/80">
            <button
              className="w-full flex justify-between items-center px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 text-gray-900 font-semibold rounded-t-lg"
              onClick={() => setShowReceived(!showReceived)}
            >
              Requests Received
              <span>{showReceived ? "▲" : "▼"}</span>
            </button>
            {showReceived && (
              <div className="p-4 transition-all duration-500 ease-in-out">
                {requestsReceived.length > 0 ? (
                  <ul className="space-y-3">
                    {requestsReceived.map((r) => (
                      <li
                        key={r.id}
                        className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-purple-50 flex justify-between items-center shadow-sm hover:scale-[1.01] transition"
                      >
                        <span className="text-indigo-700 font-medium">
                          From: {r.from_user?.full_name || "Unknown"}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestAction(r.id, "accepted")}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRequestAction(r.id, "declined")}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No requests received</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Ratings Modal */}
      {showRatingsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-100 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">My Ratings</h2>
              <button
                onClick={() => setShowRatingsModal(false)}
                className="text-gray-600 hover:text-gray-900 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab("received")}
                className={`px-4 py-2 rounded-lg transition ${activeTab === "received"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    : "bg-gray-200 text-gray-900"
                  }`}
              >
                Ratings Received
              </button>
              <button
                onClick={() => setActiveTab("given")}
                className={`px-4 py-2 rounded-lg transition ${activeTab === "given"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    : "bg-gray-200 text-gray-900"
                  }`}
              >
                Ratings Given
              </button>
            </div>

            {/* Ratings List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {activeTab === "received" ? (
                ratingsReceived.length > 0 ? (
                  ratingsReceived.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-purple-50 text-gray-900 shadow-sm"
                    >
                      <p>{r.comment}</p>
                      <span className="text-xs text-gray-600 block mt-1">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No ratings received yet</p>
                )
              ) : ratingsGiven.length > 0 ? (
                ratingsGiven.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-purple-50 flex items-center gap-3 text-gray-900 shadow-sm"
                  >
                    <img
                      src={
                        r.to_user?.profile_photo ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          r.to_user?.full_name || "User"
                        )}&background=random&size=64`
                      }
                      alt="avatar"
                      className="w-10 h-10 rounded-full border border-gray-300"
                    />
                    <div>
                      <p className="font-semibold">{r.to_user?.full_name}</p>
                      <p className="text-sm">{r.comment}</p>
                      <span className="text-xs text-gray-600 block mt-1">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No ratings given yet</p>
              )}
            </div>
          </div>
        </div>  
      )}
    </div>
  );
}