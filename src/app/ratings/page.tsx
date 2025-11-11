"use client";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import AdBanner from "@/components/ads";
import ProfileStats from "@/components/ProfileStats";

// Import the token purchase modal
const TokenPurchaseModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("token-payments")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from("token-payments")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("uploadScreenshot error:", err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!utrNumber.trim()) {
      alert("Please enter UTR number");
      return;
    }

    setUploading(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
        if (!screenshotUrl) {
          console.warn("Screenshot upload failed, proceeding without it");
        }
      }

      const { error } = await supabase
        .from("token_purchase_requests")
        .insert({
          user_id: userId,
          amount: 0,
          utr_number: utrNumber,
          payment_screenshot_url: screenshotUrl,
          status: "pending",
        });

      if (error) {
        console.error("Error creating request:", error);
        alert("Failed to submit request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("handleSubmit error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h3>
          <p className="text-gray-600 mb-6">
            Your token purchase request has been submitted. Tokens will be credited within <strong>30 minutes</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">💳 Add Tokens</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✖</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment QR Code</h3>
            <p className="text-gray-600 text-sm mb-4">Scan this QR code to make payment</p>
            <div className="inline-block px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
              🚧 QR Code Coming Soon
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UTR Number / Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter UTR or Transaction ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Screenshot (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer"
            />
            {screenshot && (
              <div className="mt-2 text-sm text-green-600">✓ {screenshot.name}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || !utrNumber.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Submitting..." : "Submit for Review"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

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

const TOKENS_TO_VIEW_STATS = 10;

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
  const [isMounted, setIsMounted] = useState(false);

  // Token system states
  const [tokenBalance, setTokenBalance] = useState(0);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [hasRatedUser, setHasRatedUser] = useState<Set<string>>(new Set());

  // Modal states
  const [showTokenUnlockModal, setShowTokenUnlockModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [isProfileRatingModal, setIsProfileRatingModal] = useState(false);
  const [isGlobalRatingModal, setIsGlobalRatingModal] = useState(false);

  // Rating states
  const [comment, setComment] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [humbleness, setHumbleness] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [overallXP, setOverallXP] = useState(0);

  // Global rating states
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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  // Fetch token balance
  useEffect(() => {
    if (!currentUserId) return;
    async function loadBalance() {
      const { data } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setTokenBalance(data?.balance || 0);
    }
    loadBalance();
  }, [currentUserId]);

  // Check if user has rated someone
  useEffect(() => {
    if (!currentUserId) return;
    async function checkRatings() {
      const { data } = await supabase
        .from("ratings")
        .select("to_user_id")
        .eq("from_user_id", currentUserId);
      
      if (data) {
        const ratedIds = new Set(data.map(r => r.to_user_id));
        setHasRatedUser(ratedIds);
      }
    }
    checkRatings();
  }, [currentUserId]);

  // Check unlocked stats
  useEffect(() => {
    if (!currentUserId) return;
    async function checkUnlocks() {
      const { data } = await supabase
        .from("stats_unlocks")
        .select("profile_id")
        .eq("user_id", currentUserId);
      
      if (data) {
        const unlockedIds = new Set(data.map(u => u.profile_id));
        setUnlockedStats(unlockedIds);
      }
    }
    checkUnlocks();
  }, [currentUserId]);

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

  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return profile.profile_photo;
    const name = encodeURIComponent(profile.full_name || profile.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
  };

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

  const canViewStats = (userId: string): boolean => {
    return unlockedStats.has(userId) || hasRatedUser.has(userId);
  };

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

  async function fetchRecentReviews(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*, from_user_id")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
    if (!error && data) setRecentReviews(data);
  }

  const openChat = async (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(true);
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages:", error);
      } else {
        setMessages(data || []);
      }

      if (subscriptionRef.current) {
        try {
          await supabase.removeChannel(subscriptionRef.current);
        } catch (err) {
          console.warn("removeChannel error:", err);
        }
        subscriptionRef.current = null;
      }

      const channelKey = [currentUserId, user.id].sort().join("-");
      const channel = supabase
        .channel(`chat-${channelKey}`)
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
    } catch (e) {
      console.error("openChat error:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedUser) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      from_user_id: currentUserId,
      to_user_id: selectedUser.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("user_messages")
        .insert([
          { from_user_id: currentUserId, to_user_id: selectedUser.id, content: optimisticMsg.content },
        ])
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error("Failed to send ❌");
        console.error("message insert error:", error);
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("handleSendMessage unexpected error:", e);
      toast.error("Failed to send ❌");
    }
  };

  const handleUnlockWithTokens = async () => {
    if (!currentUserId || !selectedUser) return;
    
    if (tokenBalance < TOKENS_TO_VIEW_STATS) {
      setShowTokenUnlockModal(false);
      setShowTokenPurchaseModal(true);
      return;
    }

    const newBalance = tokenBalance - TOKENS_TO_VIEW_STATS;
    await supabase
      .from("user_tokens")
      .update({ balance: newBalance })
      .eq("user_id", currentUserId);

    await supabase
      .from("token_transactions")
      .insert([{
        user_id: currentUserId,
        amount: -TOKENS_TO_VIEW_STATS,
        type: "spend",
        status: "completed",
        description: `Unlocked stats for ${selectedUser.full_name}`
      }]);

    await supabase
      .from("stats_unlocks")
      .insert([{
        user_id: currentUserId,
        profile_id: selectedUser.id,
        unlocked_via: "tokens"
      }]);

    setTokenBalance(newBalance);
    setUnlockedStats(prev => new Set(prev).add(selectedUser.id));
    setShowTokenUnlockModal(false);
    toast.success("Stats unlocked! 💎");
  };

  const handleSubmitRating = async (toUserId: string) => {
    if (!currentUserId || !comment.trim()) {
      toast.error("Please add a comment ❌");
      return;
    }

    try {
      const { error } = await supabase
        .from("ratings")
        .insert([{
          from_user_id: currentUserId,
          to_user_id: toUserId,
          comment: comment.trim(),
          confidence,
          humbleness,
          friendliness,
          intelligence,
          communication,
          overall_xp: overallXP
        }]);

      if (error) {
        toast.error(`Failed: ${error.message} ❌`);
        return;
      }

      toast.success("Rating submitted ✅");
      setIsProfileRatingModal(false);
      setShowTokenUnlockModal(false);
      setComment("");
      setConfidence(0);
      setHumbleness(0);
      setFriendliness(0);
      setIntelligence(0);
      setCommunication(0);
      setOverallXP(0);
      
      setHasRatedUser(prev => new Set(prev).add(toUserId));
      await fetchRecentReviews(toUserId);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error occurred ❌");
    }
  };

  const handleSubmitGlobalRating = async (toUserId: string) => {
    if (!currentUserId || !globalComment.trim()) {
      toast.error("Please add a comment ❌");
      return;
    }

    try {
      const { error } = await supabase
        .from("ratings")
        .insert([{
          from_user_id: currentUserId,
          to_user_id: toUserId,
          comment: globalComment.trim(),
          confidence: gConfidence,
          humbleness: gHumbleness,
          friendliness: gFriendliness,
          intelligence: gIntelligence,
          communication: gCommunication,
          overall_xp: gOverallXP
        }]);

      if (error) {
        toast.error(`Failed: ${error.message} ❌`);
        return;
      }

      toast.success("Rating submitted ✅");
      setGlobalComment("");
      setGConfidence(0);
      setGHumbleness(0);
      setGFriendliness(0);
      setGIntelligence(0);
      setGCommunication(0);
      setGOverallXP(0);
      setSearchQuery("");
      setSearchResults([]);
      setIsGlobalRatingModal(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error occurred ❌");
    }
  };

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

      const filtered = (data || []).filter((p: any) => p.id !== currentUserId);
      setSearchResults(filtered);
    }
    searchProfiles();
  }, [searchQuery, currentUserId]);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.id !== currentUserId &&
      (p.full_name || p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleViewStats = (user: Profile) => {
    setSelectedUser(user);
    setChatOpen(false);
    fetchRecentReviews(user.id);
    
    const status = getRequestStatus(user.id);
    if (status === "friends" && !canViewStats(user.id)) {
      setShowTokenUnlockModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* Top Bar with Token Balance */}
        <div className="flex gap-4 mb-6 items-center">
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

          {/* Token Balance Display */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-200">
            <span className="text-xl">💎</span>
            <div>
              <div className="text-xs text-gray-600">Tokens</div>
              <div className="text-lg font-bold text-purple-700">{tokenBalance}</div>
            </div>
          </div>
        </div>

        {/* Search */}
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

        {/* Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT - Profile List */}
          <div className="space-y-3 h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-gray-100">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleViewStats(profile)}
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
                {getRequestStatus(profile.id) === "friends" && canViewStats(profile.id) && (
                  <span className="text-green-500 text-lg">✓</span>
                )}
              </div>
            ))}
          </div>

          {/* RIGHT - Profile View */}
          <div className="bg-white rounded-xl shadow h-[600px] flex flex-col relative overflow-hidden">
            {selectedUser ? (
              !chatOpen ? (
                <div className="p-4 overflow-y-auto">
                  {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) ? (
                    <>
                      <ProfileStats 
                        user={selectedUser} 
                        getAvatar={getAvatar}
                        currentUserId={currentUserId}
                        connectionStatus={getRequestStatus(selectedUser.id)}
                        onConnect={() => handleConnectToggle(selectedUser.id)}
                        onRate={() => {}}
                        onOpenRating={() => setIsProfileRatingModal(true)}
                      />
                      
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

                      {/* Action Buttons */}
                      <div className="flex gap-3">
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
                      </div>
                    </>
                  ) : getRequestStatus(selectedUser.id) === "friends" ? (
                    // Stats locked - show unlock options
                    <div className="text-center py-8">
                      <img
                        src={getAvatar(selectedUser)}
                        alt={selectedUser.full_name}
                        className="w-24 h-24 rounded-full mx-auto mb-4"
                      />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedUser.full_name}</h2>
                      <p className="text-gray-600 mb-6">{selectedUser.description || 'No bio available'}</p>
                      
                      <div className="text-6xl mb-4">🔒</div>
                      <p className="text-gray-600 mb-6">Stats are locked. Unlock to view their ratings!</p>
                      
                      <button
                        onClick={() => setShowTokenUnlockModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 shadow-lg"
                      >
                        🔓 Unlock Stats
                      </button>
                    </div>
                  ) : (
                    // Not connected
                    <div className="text-center py-8">
                      <img
                        src={getAvatar(selectedUser)}
                        alt={selectedUser.full_name}
                        className="w-24 h-24 rounded-full mx-auto mb-4"
                      />
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedUser.full_name}</h2>
                      <p className="text-gray-600 mb-6">{selectedUser.description || 'No bio available'}</p>
                      
                      <div className="text-4xl mb-3">🤝</div>
                      <p className="text-gray-600 mb-4">Connect first to unlock stats</p>
                      
                      {getRequestStatus(selectedUser.id) === "requested" ? (
                        <button
                          onClick={() => handleConnectToggle(selectedUser.id)}
                          className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg shadow"
                        >
                          Request Sent ⏳ (Cancel)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectToggle(selectedUser.id)}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                        >
                          + Connect
                        </button>
                      )}
                    </div>
                  )}
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
              // No profile selected
              <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
                <div className="text-center">
                  <p className="text-gray-500 text-base">👈 Select a profile to view details</p>
                </div>

                <div className="w-full max-w-md">
                  {isMounted ? (
                    <AdBanner placement="ratings_page" />
                  ) : (
                    <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Token Unlock Modal */}
      {showTokenUnlockModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-center mb-4">Unlock Stats</h2>
            <p className="text-center text-gray-600 mb-6">
              Choose how to unlock <strong>{selectedUser.full_name}'s</strong> profile stats
            </p>

            <div className="space-y-3">
              <button
                onClick={handleUnlockWithTokens}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-between"
              >
                <span>Use {TOKENS_TO_VIEW_STATS} Tokens</span>
                <span className="text-2xl">💎</span>
              </button>

              <div className="text-center text-gray-400 text-sm">OR</div>

              <button
                onClick={() => {
                  setShowTokenUnlockModal(false);
                  setIsProfileRatingModal(true);
                }}
                className="w-full p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-between"
              >
                <span>Rate Them (Free)</span>
                <span className="text-2xl">⭐</span>
              </button>
            </div>

            <button
              onClick={() => setShowTokenUnlockModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Token Purchase Modal */}
      {showTokenPurchaseModal && currentUserId && (
        <TokenPurchaseModal 
          userId={currentUserId} 
          onClose={() => {
            setShowTokenPurchaseModal(false);
            // Refresh token balance after closing
            async function refreshBalance() {
              const { data } = await supabase
                .from("user_tokens")
                .select("balance")
                .eq("user_id", currentUserId)
                .maybeSingle();
              if (data) setTokenBalance(data.balance);
            }
            refreshBalance();
          }} 
        />
      )}

      {/* Profile Rating Modal */}
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
                Submit & Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Rating Modal */}
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
                const status = getRequestStatus(user.id);
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
                        className={`w-full px-4 py-2 rounded-lg shadow text-sm font-medium ${
                          status === "requested"
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

      {/* Floating + Button */}
      <a
        href="#"
        role="button"
        aria-label="Open rate modal"
        onClick={(e) => {
          e.preventDefault();
          setIsGlobalRatingModal(true);
        }}
        className="animated-button1 animated-button-fixed"
      >
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        +
      </a>
    </div>
  );
}