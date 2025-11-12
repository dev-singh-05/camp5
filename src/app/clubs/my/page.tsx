"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, Lock, CheckCircle, Clock, ChevronRight, Star, TrendingUp } from "lucide-react";

// Club type
type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
};

// 🔹 Reusable ClubCard with glassmorphic design
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
  const getCategoryColor = (cat: string | null) => {
    switch (cat?.toLowerCase()) {
      case "sports": return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
      case "arts": return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
      case "tech": return "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400";
      case "general": return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400";
      default: return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
    }
  };

  const getCategoryIcon = (cat: string | null) => {
    switch (cat?.toLowerCase()) {
      case "sports": return "⚽";
      case "arts": return "🎨";
      case "tech": return "💻";
      case "general": return "🌟";
      default: return "📁";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group relative"
    >
      <motion.div
        animate={{
          boxShadow: status === "joined" 
            ? [
                "0 0 20px rgba(34, 197, 94, 0.2)",
                "0 0 30px rgba(34, 197, 94, 0.3)",
                "0 0 20px rgba(34, 197, 94, 0.2)",
              ]
            : [
                "0 0 20px rgba(168, 85, 247, 0.2)",
                "0 0 30px rgba(168, 85, 247, 0.3)",
                "0 0 20px rgba(168, 85, 247, 0.2)",
              ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`absolute inset-0 ${
          status === "joined" 
            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20" 
            : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        } rounded-2xl blur-lg`}
      />
      <div className={`relative bg-black/40 backdrop-blur-xl rounded-2xl border p-6 transition-all overflow-hidden ${
        status === "joined" 
          ? "border-green-500/30 hover:border-green-500/50" 
          : "border-white/10 hover:border-purple-500/50"
      }`}>
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {status === "joined" ? (
            <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Active</span>
            </div>
          ) : status === "requested" ? (
            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400">Pending</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-start gap-4 mb-4">
          {/* Club Avatar */}
          <div className={`w-16 h-16 rounded-2xl ${
            status === "joined" 
              ? "bg-gradient-to-br from-green-500 to-emerald-500" 
              : "bg-gradient-to-br from-purple-500 to-pink-500"
          } flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
            {getCategoryIcon(club.category)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Club Name */}
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
              {club.name}
            </h3>

            {/* Category Badge */}
            {club.category && (
              <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(club.category)} border font-medium`}>
                {club.category}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {club.description && (
          <p className="text-sm text-white/60 line-clamp-2 mb-4">
            {club.description}
          </p>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          {rank !== undefined && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/60">
                Rank <span className="text-purple-400 font-semibold">#{rank}</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-white/60 group-hover:text-white/90 transition-colors">
            <span className="text-sm font-medium">
              {status === "joined" ? "Enter" : "View"}
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
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

  const getCategoryIcon = (cat: string | null) => {
    switch (cat?.toLowerCase()) {
      case "sports": return "⚽";
      case "arts": return "🎨";
      case "tech": return "💻";
      case "general": return "🌟";
      default: return "📁";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
      >
        <div className="p-8">
          <div className="flex items-start gap-6 mb-6">
            <div className={`w-20 h-20 rounded-2xl ${
              status === "joined" 
                ? "bg-gradient-to-br from-green-500 to-emerald-500" 
                : "bg-gradient-to-br from-purple-500 to-pink-500"
            } flex items-center justify-center text-4xl flex-shrink-0`}>
              {getCategoryIcon(club.category)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{club.name}</h2>
              {club.category && (
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 font-medium">
                  {club.category}
                </span>
              )}
              <div className="mt-3">
                {status === "joined" ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Active Member</span>
                  </div>
                ) : status === "requested" ? (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">Request Pending</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Description</h3>
            <p className="text-white/60 leading-relaxed">
              {club.description || "No description provided."}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
            >
              Close
            </button>
            {status === "joined" ? (
              <button
                onClick={() => router.push(`/clubs/${club.id}`)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
              >
                Enter Club
              </button>
            ) : status === "requested" ? (
              <div className="flex-1 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl font-semibold text-yellow-400 text-center">
                Request Pending
              </div>
            ) : (
              <button
                onClick={onJoin}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Join Now
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
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
      .select("id")
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

        // Get user's name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        // Send system message to club chat
        await supabase.from("messages").insert([{
          club_id: clubId,
          user_id: user.id,
          content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club via password`
        }]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                ←
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              >
                My Clubs
              </motion.h1>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Club
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">Joined Clubs</p>
                  <p className="text-3xl font-bold text-white">{joined.length}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">Pending Requests</p>
                  <p className="text-3xl font-bold text-white">{pending.length}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Joined Clubs Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Active Memberships</h2>
            </div>
            <span className="text-sm text-white/60">{joined.length} clubs</span>
          </div>

          {joined.length === 0 ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No clubs yet</h3>
                <p className="text-white/60 mb-6">Join a club to connect with your community</p>
                <button
                  onClick={() => router.push("/clubs")}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Explore Clubs
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </motion.section>

        {/* Pending Requests Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Pending Requests</h2>
            </div>
            <span className="text-sm text-white/60">{pending.length} requests</span>
          </div>

          {pending.length === 0 ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
                <p className="text-white/60">All your club requests have been processed</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </motion.section>
      </main>

      {/* Floating Create Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl shadow-purple-500/50 flex items-center justify-center z-50 hover:shadow-purple-500/70 transition-all"
      >
        <Plus className="w-8 h-8 text-white" />
      </motion.button>

      {/* Club Modal */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Create Club Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-white">Create New Club</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Club Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter club name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                  >
                    <option value="">Select Category</option>
                    <option>Sports</option>
                    <option>Arts</option>
                    <option>Tech</option>
                    <option>General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell members about your club..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Passcode (Optional)
                  </label>
                  <input
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    type="password"
                    placeholder="Leave empty for open club"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                  />
                  <p className="text-xs text-white/40 mt-2">Members will need this passcode to join</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createClub}
                    disabled={!name || !category}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Club
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}