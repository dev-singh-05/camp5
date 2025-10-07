"use client";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

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

export default function RatingsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // ✅ modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [comment, setComment] = useState("");

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ✅ Get current user
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

  // ✅ Avatar fallback
  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

  // ✅ Send or cancel request
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

  // ✅ Request status
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

  // ✅ Open chat
  const openChat = async (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(true);

    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("user_messages")
      .select("*")
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (error) return console.error("Messages fetch error:", error);

    setMessages(data || []);

    supabase
      .channel("user-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.from_user_id === currentUserId && msg.to_user_id === user.id) ||
          (msg.from_user_id === user.id && msg.to_user_id === currentUserId)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
  };

  // ✅ Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedUser) return;

    const tempMsg: Message = {
      id: Date.now().toString(),
      from_user_id: currentUserId,
      to_user_id: selectedUser.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    const { error } = await supabase.from("user_messages").insert([
      { from_user_id: currentUserId, to_user_id: selectedUser.id, content: tempMsg.content },
    ]);

    if (error) {
      toast.error("Failed to send ❌");
      console.error("Send message error:", error);
    }
  };

  // ✅ Filtered profiles
  const filteredProfiles = profiles.filter((p) => {
    if (p.id === currentUserId) return false;
    const name = (p.full_name || p.username || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ✅ Search profiles for modal
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
      if (!error && data) setSearchResults(data);
    }
    searchProfiles();
  }, [searchQuery]);

  // ✅ Submit rating
  const handleSubmitRating = async (toUserId: string) => {
    if (!currentUserId || !comment.trim()) return;
    const { error } = await supabase.from("ratings").insert([
      { from_user_id: currentUserId, to_user_id: toUserId, comment },
    ]);
    if (error) {
      toast.error("Failed to submit ❌");
    } else {
      toast.success("Rating submitted ✅");
      setComment("");
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* 🔹 Top Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => router.push("/ratings/connections")}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-95 shadow"
          >
            My Connections
          </button>
          <button className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold">
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

        {/* 🔹 Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const name = profile.full_name || profile.username || "Unnamed";
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between bg-white p-4 rounded-xl shadow"
                >
                  <div className="flex items-center gap-3">
                    <img src={getAvatar(profile)} alt={name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>        
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(profile);
                      setChatOpen(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg shadow text-sm"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-xl shadow h-[500px] flex flex-col relative">
            {selectedUser ? (
              !chatOpen ? (
                // ✅ Profile View
                <div className="flex flex-col items-center justify-center flex-1 p-6">
                  <img src={getAvatar(selectedUser)} alt="profile" className="w-24 h-24 rounded-full mb-3" />
                  <h2 className="text-lg font-semibold">{selectedUser.full_name}</h2>
                  <p className="text-gray-500 text-sm mb-4">{selectedUser.description || "No bio"}</p>
                  {getRequestStatus(selectedUser.id) === "friends" ? (
                    <button
                      onClick={() => openChat(selectedUser)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Message
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectToggle(selectedUser.id)}
                      className={`px-4 py-2 rounded-lg text-white ${
                        getRequestStatus(selectedUser.id) === "requested"
                          ? "bg-gray-500"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {getRequestStatus(selectedUser.id) === "requested" ? "Requested" : "Connect+"}
                    </button>
                  )}
                </div>
              ) : (
                // ✅ Chat View
                <div className="flex flex-col flex-1 h-full">
                  <div
                    className="flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => setChatOpen(false)}
                  >
                    <img src={getAvatar(selectedUser)} alt="profile" className="w-10 h-10 rounded-full" />
                    <h2 className="font-semibold text-gray-900">{selectedUser.full_name}</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-sm max-w-[70%] relative ${
                          msg.from_user_id === currentUserId
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

      {/* ✅ Floating + Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="absolute bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl rounded-full shadow-lg flex items-center justify-center hover:opacity-95"
        aria-label="add"
      >
        +
      </button>

      {/* ✅ Modal */}
      {isModalOpen && (
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

            <div className="max-h-40 overflow-y-auto space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-2 border rounded-lg flex flex-col gap-2 hover:bg-gray-50"
                >
                  <span className="font-medium">{user.full_name}</span>
                  {getRequestStatus(user.id) === "friends" ? (
                    <textarea
                      placeholder="Leave a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => handleConnectToggle(user.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      {getRequestStatus(user.id) === "requested" ? "Requested" : "Connect+"}
                    </button>
                  )}

                  {getRequestStatus(user.id) === "friends" && (
                    <button
                      onClick={() => handleSubmitRating(user.id)}
                      disabled={!comment.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mt-2"
                    >
                      Submit
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}