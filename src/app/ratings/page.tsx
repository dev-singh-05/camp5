"use client";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import AdBanner from "@/components/ads";


type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  leaderboard_rank?: number;
};

type Request = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
};

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
};

type Rating = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  comment: string;
  created_at: string;
};

export default function RatingsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState<Rating[]>([]);
  const [connections, setConnections] = useState<Profile[]>([]);

  // ✅ Rating modal states
  const [isProfileRatingModal, setIsProfileRatingModal] = useState(false);
  const [comment, setComment] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [humbleness, setHumbleness] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [overallXP, setOverallXP] = useState(0);

  // ✅ Global (floating +) modal
  const [isGlobalRatingModal, setIsGlobalRatingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [globalComment, setGlobalComment] = useState("");
  const [gConfidence, setGConfidence] = useState(0);
  const [gHumbleness, setGHumbleness] = useState(0);
  const [gFriendliness, setGFriendliness] = useState(0);
  const [gIntelligence, setGIntelligence] = useState(0);
  const [gCommunication, setGCommunication] = useState(0);
  const [gOverallXP, setGOverallXP] = useState(0);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<any>(null);

  // ✅ Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ✅ Current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  // ✅ Fetch profiles
  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) return console.error("Profiles fetch error:", error);
      const withRank = (data || []).map((p: any, i: number) => ({
        ...p,
        leaderboard_rank: i + 1,
      }));
      setProfiles(withRank);
    }
    fetchProfiles();
  }, []);

  // ✅ Fetch requests
  useEffect(() => {
    if (!currentUserId) return;
    async function fetchRequests() {
      const { data, error } = await supabase
        .from("profile_requests")
        .select("*")
        .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);
      if (error) return console.error("Requests fetch error:", error);
      setRequests(data || []);
    }
    fetchRequests();
  }, [currentUserId]);

  // ✅ Fetch connected profiles (friends only)
  useEffect(() => {
    if (!currentUserId) return;

    async function fetchConnections() {
      const { data: reqs, error } = await supabase
        .from("profile_requests")
        .select("*")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);

      if (error) {
        console.error("Connections fetch error:", error);
        return;
      }

      const otherUserIds = reqs.map((r) =>
        r.from_user_id === currentUserId ? r.to_user_id : r.from_user_id
      );

      if (otherUserIds.length === 0) {
        setConnections([]);
        return;
      }

      const { data: connectedProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherUserIds);

      if (profileError) {
        console.error("Profiles fetch error:", profileError);
        return;
      }

      setConnections(connectedProfiles || []);
    }

    fetchConnections();
  }, [currentUserId]);

  // ✅ Avatar fallback
  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

  // ✅ Connection status
  const getRequestStatus = (userId: string): "none" | "requested" | "friends" => {
    const req = requests.find(
      (r) =>
        (r.from_user_id === currentUserId && r.to_user_id === userId) ||
        (r.to_user_id === currentUserId && r.from_user_id === userId)
    );
    if (!req) return "none";
    if (req.status === "accepted") return "friends";
    return "requested";
  };

  // ✅ Connect/Cancel
  const handleConnectToggle = async (toUserId: string) => {
    if (!currentUserId) {
      toast.error("Login required ❌");
      return;
    }

    const existing = requests.find(
      (r) => r.from_user_id === currentUserId && r.to_user_id === toUserId
    );

    if (existing) {
      const { error } = await supabase.from("profile_requests").delete().eq("id", existing.id);
      if (error) return toast.error("Cancel failed ❌");
      setRequests((prev) => prev.filter((r) => r.id !== existing.id));
      toast("Request removed ❌");
    } else {
      const { data, error } = await supabase
        .from("profile_requests")
        .insert([{ from_user_id: currentUserId, to_user_id: toUserId, status: "pending" }])
        .select()
        .single();

      if (error) return toast.error("Send failed ❌");
      setRequests((prev) => [...prev, data]);
      toast.success("Request sent ✅");
    }
  };

  // ✅ Fetch recent reviews (last 3)
  async function fetchRecentReviews(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*, from_user_id")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
    if (!error && data) setRecentReviews(data);
  }

  // ✅ Open chat with realtime
  const openChat = async (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(true);
    if (!currentUserId) return;

    const { data } = await supabase
      .from("user_messages")
      .select("*")
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);

    if (subscriptionRef.current) await supabase.removeChannel(subscriptionRef.current);

    const channel = supabase
      .channel(`chat-${currentUserId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.from_user_id === currentUserId && msg.to_user_id === user.id) ||
            (msg.from_user_id === user.id && msg.to_user_id === currentUserId)
          ) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  // ✅ Send message (prevent duplicates)
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedUser) return;

    const { error } = await supabase.from("user_messages").insert([
      { from_user_id: currentUserId, to_user_id: selectedUser.id, content: newMessage },
    ]);

    if (error) toast.error("Failed to send ❌");
    setNewMessage("");
  };

  // ✅ Submit Rating (decimal sliders)
  const handleSubmitRating = async (toUserId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase.from("ratings").insert([
      {
        from_user_id: currentUserId,
        to_user_id: toUserId,
        comment,
        confidence,
        humbleness,
        friendliness,
        intelligence,
        communication,
        overall_xp: overallXP,
      },
    ]);
    if (error) toast.error("Failed ❌");
    else {
      toast.success("Rating submitted ✅");
      setIsProfileRatingModal(false);
      setComment("");
      fetchRecentReviews(toUserId);
      await fetchRecentReviews(toUserId);
      if (selectedUser && selectedUser.id === toUserId) setSelectedUser({ ...selectedUser });
    }
  };

  // ✅ Global Rating (floating +) with decimal sliders
  const handleSubmitGlobalRating = async (toUserId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase.from("ratings").insert([
      {
        from_user_id: currentUserId,
        to_user_id: toUserId,
        comment: globalComment,
        confidence: gConfidence,
        humbleness: gHumbleness,
        friendliness: gFriendliness,
        intelligence: gIntelligence,
        communication: gCommunication,
        overall_xp: gOverallXP,
      },
    ]);
    if (error) toast.error("Failed ❌");
    else {
      toast.success("Rating submitted ✅");
      setGlobalComment("");
      setSearchQuery("");
      setSearchResults([]);
      setIsGlobalRatingModal(false);
    }
  };

  // ✅ Global search — allows searching any user, but shows connect/rate logic later
  useEffect(() => {
    async function searchProfiles() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${searchQuery}%`);

      if (error) {
        console.error("Search error:", error);
        return;
      }

      // Exclude the current user
      const filtered = (data || []).filter((p) => p.id !== currentUserId);
      setSearchResults(filtered);
    }
    searchProfiles();
  }, [searchQuery, currentUserId]);


  // ✅ Filtered profiles
  const filteredProfiles = profiles.filter(
    (p) =>
      p.id !== currentUserId &&
      (p.full_name || p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* 🔹 Top */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => router.push("/ratings/connections")}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-95 shadow"
          >
            My Connections
          </button>
          <button
            onClick={() => router.push("/ratings/leaderboard")}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-95 shadow"
          >
            LeaderBoard
          </button>
        </div>

        {/* 🔹 Search */}
        <div className="flex items-center bg-white p-3 rounded-lg mb-6 shadow border">
          <span className="mr-3 text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
          />
        </div>

        {/* 🔹 Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-3">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => {
                  setSelectedUser(profile);
                  setChatOpen(false);
                  fetchRecentReviews(profile.id);
                }}
                className="flex items-center justify-between bg-white p-4 rounded-xl shadow cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatar(profile)}
                    alt={profile.full_name}
                    className="w-12 h-12 rounded-full"
                  />
                  <p className="font-medium text-gray-900">{profile.full_name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Profile view */}
          <div className="bg-white rounded-xl shadow h-[600px] flex flex-col relative p-4 overflow-y-auto">
            {selectedUser ? (
              !chatOpen ? (
                <div>
                  {/* 🟢 Fetch latest averages */}
                  <ProfileStats user={selectedUser} getAvatar={getAvatar} fetchRecentReviews={fetchRecentReviews} />

                  {/* Reviews */}
                  <div className="mb-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2 border-b pb-1">Recent Reviews</h3>
                    {recentReviews.length > 0 ? (
                      recentReviews.map((r) => (
                        <div key={r.id} className="bg-gray-50 p-2 rounded-lg text-sm mb-2 border">
                          <p className="text-gray-700">{r.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No reviews yet</p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    {getRequestStatus(selectedUser.id) === "friends" ? (
                      <>
                        <button
                          onClick={() => setIsProfileRatingModal(true)}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
                        >
                          + Add Rating
                        </button>
                        <button
                          onClick={() => openChat(selectedUser)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
                        >
                          Message
                        </button>
                      </>
                    ) : getRequestStatus(selectedUser.id) === "requested" ? (
                      <button
                        onClick={() => handleConnectToggle(selectedUser.id)}
                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg shadow transition"
                      >
                        Request Sent ⏳ (Cancel)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectToggle(selectedUser.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition"
                      >
                        + Connect
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                // Chat UI
                <div className="flex flex-col flex-1 h-full">
                  <div
                    className="flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => setChatOpen(false)}
                  >
                    <img src={getAvatar(selectedUser)} alt="" className="w-10 h-10 rounded-full" />
                    <h2 className="font-semibold text-gray-900">{selectedUser.full_name}</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-sm max-w-[70%] relative ${msg.from_user_id === currentUserId
                          ? "bg-blue-500 text-white ml-auto"
                          : "bg-gray-200 text-gray-900"
                          }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex p-3 border-t">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 border rounded-full px-3 py-2 text-sm bg-gray-100 text-gray-900"
                      placeholder="Type a message..."
                    />
                    <button
                      onClick={handleSendMessage}
                      className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-gray-500 m-auto">Select a user to view details</p>
            )}
          </div>

        </div>
      </div>

      {/* 🟣 Profile-Specific Rating Modal */}
      {isProfileRatingModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Rate {selectedUser.full_name}
            </h2>
            {[
              ["Confidence", confidence, setConfidence],
              ["Humbleness", humbleness, setHumbleness],
              ["Friendliness", friendliness, setFriendliness],
              ["Intelligence", intelligence, setIntelligence],
              ["Communication", communication, setCommunication],
            ].map(([label, value, setter]: any) => (
              <div key={label} className="mb-3">
                <label className="flex justify-between text-sm text-gray-700">
                  <span>{label}</span>
                  <span>{value}/5</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={value}
                  onChange={(e) => setter(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            ))}

            <div className="mb-4">
              <label className="flex justify-between text-sm text-gray-700">
                <span>Overall XP</span>
                <span>{overallXP}/100</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={overallXP}
                onChange={(e) => setOverallXP(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            <textarea
              placeholder="Write your review..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm mb-4 bg-gray-50 focus:ring focus:ring-indigo-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsProfileRatingModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitRating(selectedUser.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Global Floating + Modal */}
      {isGlobalRatingModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
              Wanna Rate Someone?
            </h2>
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4 text-gray-900 bg-gray-50 focus:ring focus:ring-indigo-200"
            />
            <div className="max-h-72 overflow-y-auto space-y-3">
              {searchResults.map((user) => {
                const status = getRequestStatus(user.id); // 👈 check connection status
                const isFriend = status === "friends";

                return (
                  <div key={user.id} className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">{user.full_name}</p>

                    {isFriend ? (
                      <>
                        {[
                          ["Confidence", gConfidence, setGConfidence],
                          ["Humbleness", gHumbleness, setGHumbleness],
                          ["Friendliness", gFriendliness, setGFriendliness],
                          ["Intelligence", gIntelligence, setGIntelligence],
                          ["Communication", gCommunication, setGCommunication],
                        ].map(([label, value, setter]: any) => (
                          <div key={label} className="mb-2">
                            <label className="flex justify-between text-xs text-gray-700">
                              <span>{label}</span>
                              <span>{value}/5</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="5"
                              step="0.5"
                              value={value}
                              onChange={(e) => setter(parseFloat(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        ))}

                        <div className="mb-2">
                          <label className="flex justify-between text-xs text-gray-700">
                            <span>Overall XP</span>
                            <span>{gOverallXP}/100</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={gOverallXP}
                            onChange={(e) => setGOverallXP(parseInt(e.target.value))}
                            className="w-full accent-purple-600"
                          />
                        </div>

                        <textarea
                          placeholder="Leave a comment..."
                          value={globalComment}
                          onChange={(e) => setGlobalComment(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm mb-2"
                        />

                        <button
                          onClick={() => handleSubmitGlobalRating(user.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm"
                        >
                          Submit
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectToggle(user.id)}
                        className={`w-full px-4 py-2 rounded-lg shadow text-sm font-medium ${status === "requested"
                          ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                          : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                      >
                        {status === "requested" ? "Request Sent ⏳ (Cancel)" : "+ Connect"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsGlobalRatingModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Floating + Button */}
      <button
        onClick={() => setIsGlobalRatingModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-2xl rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition"
      >
        +
      </button>
    </div>
  );
}

// 🟢 Profile Stats Component — fetches fresh averages and displays nicely
function ProfileStats({ user, getAvatar, fetchRecentReviews }: any) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings"
        )
        .eq("id", user.id)
        .single();
      if (!error && data) setStats(data);
    }
    fetchData();
  }, [user]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 border-b pb-3">
        <img
          src={getAvatar(user)}
          alt={user.full_name}
          className="w-20 h-20 rounded-full ring-4 ring-indigo-100"
        />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
          {stats ? (
            <p className="text-sm text-gray-600">
              ⭐{" "}
              <span className="font-semibold text-purple-600">
                {stats.avg_overall_xp?.toFixed(1) || 0}
              </span>
              /100 XP • 💬 {stats.total_ratings || 0} Ratings
            </p>
          ) : (
            <p className="text-gray-400 text-sm">Loading stats...</p>
          )}
        </div>
      </div>

      {/* Attribute bars */}
      {stats && (
        <div className="space-y-2">
          {[
            { label: "Confidence", key: "avg_confidence" },
            { label: "Humbleness", key: "avg_humbleness" },
            { label: "Friendliness", key: "avg_friendliness" },
            { label: "Intelligence", key: "avg_intelligence" },
            { label: "Communication", key: "avg_communication" },
          ].map(({ label, key }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span className="font-medium">{stats[key]?.toFixed(1) || 0}/5</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(stats[key] || 0) * 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <AdBanner placement="clubs_page" />

    </div>
  );
}