"use client";

// Performance optimization: Added useRef for debouncing real-time subscriptions
import { useEffect, useState, useRef } from "react"
import { memo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit, Save, X, Upload, Trophy, Users, Calendar,
  Star, TrendingUp, Crown, Shield, History, Activity, Trash2,
  MapPin, Clock, Award, Zap, CheckCircle, XCircle, Image as ImageIcon,
  Lock as LockIcon, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
// Performance optimization: Mobile detection to disable heavy animations
import { useIsMobile } from "@/hooks/useIsMobile";

type Club = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  logo_url: string | null;
  created_by: string;
  passcode: string | null;
};

type Member = {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    enrollment_number: string;
    college_email: string;
  } | null;
};

export default function ClubProfilePage() {
  const { id: clubId } = useParams<{ id: string }>();
  const router = useRouter();
  // Performance optimization: Detect mobile to disable heavy animations
  const isMobile = useIsMobile();
  // Performance optimization: Debounce timers for real-time subscriptions
  const statsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const messagesDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPasscode, setEditPasscode] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [showEventHistory, setShowEventHistory] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [totalEvents, setTotalEvents] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [clubRank, setClubRank] = useState<number | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [eventParticipantCounts, setEventParticipantCounts] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [eventInvitations, setEventInvitations] = useState<any[]>([]);
  const [inviteActioning, setInviteActioning] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      setCurrentUserId(userId);

      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .single();

      setUserRole(roleData?.role || null);

      await fetchClubData();
      await fetchMembers();
      await fetchStats();
      await fetchEvents();
      await fetchMessages();
      if (roleData?.role === "admin") {
        await fetchRequests();
        await fetchEventInvitations();
      }

      setLoading(false);
    };

    load();

    // Performance optimization: Debounce real-time subscriptions to prevent re-render storms
    // Subscribe to real-time club updates (XP changes) with 1s debounce
    const clubSubscription = supabase
      .channel(`club-${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clubs',
          filter: `id=eq.${clubId}`
        },
        (payload) => {
          console.log('✅ Club updated, debouncing stats refresh');

          // Clear previous timer
          if (statsDebounceRef.current) {
            clearTimeout(statsDebounceRef.current);
          }

          // Only refresh after 1 second of no updates
          statsDebounceRef.current = setTimeout(() => {
            console.log('🔄 Refreshing stats after debounce');
            fetchStats();
          }, 1000);
        }
      )
      .subscribe();

    // Subscribe to new messages with 500ms debounce (faster since messages are more visible to user)
    const messagesSubscription = supabase
      .channel(`messages-${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `club_id=eq.${clubId}`
        },
        (payload) => {
          console.log('✅ New message, debouncing refresh');

          // Clear previous timer
          if (messagesDebounceRef.current) {
            clearTimeout(messagesDebounceRef.current);
          }

          // Only refresh after 500ms of no new messages
          messagesDebounceRef.current = setTimeout(() => {
            console.log('🔄 Refreshing messages after debounce');
            fetchMessages();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clubSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
      // Cleanup debounce timers
      if (statsDebounceRef.current) {
        clearTimeout(statsDebounceRef.current);
      }
      if (messagesDebounceRef.current) {
        clearTimeout(messagesDebounceRef.current);
      }
    };
  }, [clubId, router]);

  const fetchClubData = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (error) {
      toast.error("Failed to load club data");
      console.error("Error fetching club:", error);
      return;
    }

    console.log("📊 Club data loaded:", data);
    setClub(data);
    setEditName(data.name || "");
    setEditDescription(data.description || "");
    setEditCategory(data.category || "");
    setEditPasscode("");
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("club_members")
      .select("user_id, role, profiles(full_name, enrollment_number, college_email)")
      .eq("club_id", clubId)
      .order("role", { ascending: false });

    setMembers(
      (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role ?? "member",
        profiles: m.profiles || null,
      }))
    );
  };

  const fetchStats = async () => {
    console.log("📊 Fetching stats for club:", clubId);
    
    // ✅ Get event count
    const { count: eventCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);

    setTotalEvents(eventCount || 0);

    // ✅ Get XP directly from clubs table
    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .select("total_xp")
      .eq("id", clubId)
      .single();

    if (clubError) {
      console.error("❌ Error fetching club XP:", clubError);
    } else {
      console.log(`✅ Club XP from database: ${clubData?.total_xp || 0}`);
      setTotalXP(clubData?.total_xp || 0);
    }

    // ✅ Get rank based on all clubs
    const { data: allClubs, error: rankError } = await supabase
      .from("clubs")
      .select("id, total_xp")
      .order("total_xp", { ascending: false });

    if (rankError) {
      console.error("❌ Error fetching club rankings:", rankError);
    } else {
      const rank = (allClubs || []).findIndex((c: any) => c.id === clubId) + 1;
      console.log(`✅ Club rank: ${rank} out of ${allClubs?.length || 0} clubs`);
      setClubRank(rank > 0 ? rank : null);
    }
  };

  const fetchEvents = async () => {
    const { data: ownEvents } = await supabase
      .from("events")
      .select("*")
      .eq("club_id", clubId)
      .order("event_date", { ascending: false });

    const { data: acceptedInterEvents } = await supabase
      .from("inter_club_participants")
      .select(`
        event_id,
        events!inner(*)
      `)
      .eq("club_id", clubId)
      .eq("accepted", true)
      .neq("events.club_id", clubId);

    const allEvents = [
      ...(ownEvents || []),
      ...(acceptedInterEvents || []).map((item: any) => item.events)
    ];

    const uniqueEvents = Array.from(
      new Map(allEvents.map(event => [event.id, event])).values()
    );

    setEvents(uniqueEvents);

    if (uniqueEvents.length > 0) {
      const counts: Record<string, number> = {};
      for (const event of uniqueEvents) {
        const { count } = await supabase
          .from("event_participants")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);
        counts[event.id] = count || 0;
      }
      setEventParticipantCounts(counts);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const fetchRequests = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("club_requests")
      .select(
        `id, user_id, status, requested_at, profiles ( full_name, enrollment_number, college_email )`
      )
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    setRequests(
      (data ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        club_id: r.club_id,
        status: r.status,
        requested_at: r.requested_at,
        profiles: r.profiles
          ? {
            full_name: r.profiles.full_name,
            enrollment_number: r.profiles.enrollment_number,
            college_email: r.profiles.college_email,
          }
          : null,
      }))
    );
  };

  const fetchEventInvitations = async () => {
    if (!clubId) return;

    const { data, error } = await supabase
      .from("inter_club_participants")
      .select(`
        event_id,
        club_id,
        accepted,
        events!inner(
          id,
          title,
          description,
          event_date,
          total_xp_pool,
          clubs!inner(name)
        )
      `)
      .eq("club_id", clubId)
      .eq("accepted", false);

    if (error) {
      console.error("Error fetching event invitations:", error);
      return;
    }

    setEventInvitations(data || []);
  };

  const sendSystemMessage = async (content: string) => {
    if (!clubId || !currentUserId) return;

    const { error } = await supabase.from("messages").insert([
      {
        club_id: clubId,
        user_id: currentUserId,
        content: `🔔 SYSTEM: ${content}`,
      },
    ]);

    if (error) {
      console.error("Error sending system message:", error);
    }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    if (!clubId) return;

    const { error: insertError } = await supabase.from("club_members").insert([
      {
        club_id: clubId,
        user_id: userId,
        role: "member",
      },
    ]);

    if (insertError) {
      toast.error("Failed to add user");
      return;
    }

    await supabase.from("club_requests").delete().eq("id", requestId);

    toast.success("✅ Request approved & user added");
    const approvedUser = requests.find(r => r.id === requestId);
    if (approvedUser?.profiles?.full_name) {
      await sendSystemMessage(`${approvedUser.profiles.full_name} joined the club`);
    }
    await fetchRequests();
    await fetchMembers();
  };

  const handleReject = async (requestId: string) => {
    await supabase.from("club_requests").delete().eq("id", requestId);
    toast.success("🚫 Request rejected");
    await fetchRequests();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!club || userRole !== "admin") return;

    let logoUrl = club.logo_url;

    if (logoFile) {
      const fileName = `${clubId}_${Date.now()}.${logoFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(fileName, logoFile);

      if (uploadError) {
        toast.error("Failed to upload logo");
        return;
      }

      const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(fileName);
      logoUrl = urlData.publicUrl;
    }

    const updateData: any = {
      name: editName,
      description: editDescription,
      category: editCategory,
      logo_url: logoUrl,
    };

    if (editPasscode.trim()) {
      updateData.passcode = editPasscode;
    }

    const { error } = await supabase
      .from("clubs")
      .update(updateData)
      .eq("id", clubId);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("✅ Club profile updated!");
    setIsEditing(false);
    setEditPasscode("");
    setLogoFile(null);
    setLogoPreview(null);
    await fetchClubData();
  };

  const isHistoryEvent = (event: any) => {
    return event.status === "approved" || event.status === "rejected";
  };

  const historyEvents = events.filter(e => isHistoryEvent(e));
  const activityLogs = messages.filter(msg => 
    msg.content && msg.content.startsWith("🔔 SYSTEM:")
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
          />
          <p className="text-white/70 text-lg font-medium">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <p className="text-red-400">Club not found</p>
      </div>
    );
  }

  const isAdmin = userRole === "admin";
  const admins = members.filter((m) => m.role === "admin");
  const regularMembers = members.filter((m) => m.role !== "admin");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <Toaster />

      {/* Performance optimization: Disable infinite background animation on mobile */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={!isMobile ? {
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          } : { opacity: 0.03 }}
          transition={!isMobile ? { duration: 20, repeat: Infinity } : undefined}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </motion.button>

          <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
            Club Profile
          </h1>

          {isAdmin && isEditing && (
            <div className="flex gap-2">
              {!isEditing ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(club.name);
                      setEditDescription(club.description || "");
                      setEditCategory(club.category || "");
                      setEditPasscode("");
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </motion.button>
                </>
              )}
            </div>
          )}

          {!isAdmin && <div className="w-10 h-10" />}
        </div>

        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group mb-6 md:mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/10 p-4 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl md:rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {logoPreview || club.logo_url ? (
                      <img
                        src={logoPreview || club.logo_url!}
                        alt="Club logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Trophy className="w-20 h-20 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                      <Upload className="w-8 h-8 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Club Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                      >
                        <option value="">Select category</option>
                        <option value="Sports">Sports</option>
                        <option value="Arts">Arts</option>
                        <option value="Tech">Tech</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                        <LockIcon className="w-4 h-4" />
                        Change Password (optional)
                      </label>
                      <input
                        type="password"
                        value={editPasscode}
                        onChange={(e) => setEditPasscode(e.target.value)}
                        placeholder="Leave empty to keep current"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-2">{club.name}</h2>
                    <p className="text-purple-400 font-semibold mb-4">{club.category || "Uncategorized"}</p>
                    <p className="text-white/70 leading-relaxed mb-6">
                      {club.description || "No description provided."}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      <div className="relative group/stat">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl blur-lg opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                        <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
                          <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-400 mx-auto mb-1 md:mb-2" />
                          <p className="text-xl md:text-3xl font-bold text-blue-400">{totalEvents}</p>
                          <p className="text-xs text-white/60">Events</p>
                        </div>
                      </div>

                      <div className="relative group/stat">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                        <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
                          <Zap className="w-5 h-5 md:w-6 md:h-6 text-green-400 mx-auto mb-1 md:mb-2" />
                          <p className="text-xl md:text-3xl font-bold text-green-400">{totalXP}</p>
                          <p className="text-xs text-white/60">Total XP</p>
                        </div>
                      </div>

                      <div className="relative group/stat">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl blur-lg opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                        <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 text-center">
                          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 mx-auto mb-1 md:mb-2" />
                          <p className="text-xl md:text-3xl font-bold text-yellow-400">#{clubRank || "N/A"}</p>
                          <p className="text-xs text-white/60">Rank</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Members Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Club Members
            </h3>

            {/* Admins */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Admins
              </h4>
              {admins.length === 0 ? (
                <p className="text-white/40 text-sm">No admins</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {admins.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">
                          {m.profiles?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          {m.profiles?.enrollment_number || "No ID"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Regular Members */}
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Members ({regularMembers.length})
              </h4>
              {regularMembers.length === 0 ? (
                <p className="text-white/40 text-sm">No members yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regularMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">
                          {m.profiles?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {m.profiles?.enrollment_number || "No ID"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Admin Panel */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-yellow-500/30">
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-white/5 rounded-t-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Admin Panel</h3>
                  {(eventInvitations.length > 0 || requests.length > 0) && (
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm px-2 py-0.5 rounded-full font-bold">
                      {eventInvitations.length + requests.length}
                    </span>
                  )}
                </div>
                {showAdminPanel ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
              </button>

              <AnimatePresence>
                {showAdminPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-6 max-h-96 overflow-y-auto">
                      {/* Event Invitations */}
                      {eventInvitations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-purple-300 mb-3">Event Invitations</h4>
                          <div className="space-y-2">
                            {eventInvitations.map((invitation: any) => {
                              const isBusy = inviteActioning === invitation.event_id;
                              return (
                                <motion.div
                                  key={invitation.event_id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`p-3 bg-white/5 border border-white/10 rounded-xl ${isBusy ? "opacity-60" : ""}`}
                                >
                                  <div className="mb-3">
                                    <p className="font-semibold text-white text-sm">{invitation.events.title}</p>
                                    <p className="text-xs text-white/60">
                                      By: {invitation.events.clubs.name} •{" "}
                                      {new Date(invitation.events.event_date).toLocaleDateString()} •{" "}
                                      {invitation.events.total_xp_pool} XP
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <motion.button
                                      disabled={isBusy}
                                      whileHover={!isBusy ? { scale: 1.02 } : {}}
                                      whileTap={!isBusy ? { scale: 0.98 } : {}}
                                      onClick={async () => {
                                        setInviteActioning(invitation.event_id);
                                        setEventInvitations(prev => prev.filter(i => i.event_id !== invitation.event_id));

                                        const { data: upd, error } = await supabase
                                          .from("inter_club_participants")
                                          .update({ accepted: true })
                                          .eq("event_id", invitation.event_id)
                                          .eq("club_id", clubId)
                                          .select("event_id, club_id, accepted")
                                          .single();

                                        if (error || !upd || upd.accepted !== true) {
                                          await fetchEventInvitations();
                                          setInviteActioning(null);
                                          if (error) {
                                            toast.error(`Failed to accept challenge: ${error.message}`);
                                          } else {
                                            toast.error("Failed to accept challenge (no matching row / RLS / backend issue).");
                                          }
                                          return;
                                        }

                                        toast.success("✅ Challenge accepted!");
                                        await sendSystemMessage(`Accepted inter-club event: ${invitation.events.title}`);
                                        await fetchEventInvitations();
                                        await fetchEvents();
                                        setInviteActioning(null);
                                      }}
                                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${isBusy ? "bg-green-300/50" : "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/50"} text-white transition-all`}
                                    >
                                      {isBusy ? "Accepting..." : "Accept"}
                                    </motion.button>

                                    <motion.button
                                      disabled={isBusy}
                                      whileHover={!isBusy ? { scale: 1.02 } : {}}
                                      whileTap={!isBusy ? { scale: 0.98 } : {}}
                                      onClick={async () => {
                                        setInviteActioning(invitation.event_id);
                                        setEventInvitations(prev => prev.filter(i => i.event_id !== invitation.event_id));

                                        const { error } = await supabase
                                          .from("inter_club_participants")
                                          .delete()
                                          .eq("event_id", invitation.event_id)
                                          .eq("club_id", clubId);

                                        if (error) {
                                          toast.error("Failed to decline challenge");
                                          await fetchEventInvitations();
                                          setInviteActioning(null);
                                          return;
                                        }

                                        toast.success("❌ Challenge declined");
                                        await sendSystemMessage(`Declined inter-club event: ${invitation.events.title}`);
                                        await fetchEventInvitations();
                                        await fetchEvents();
                                        setInviteActioning(null);
                                      }}
                                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${isBusy ? "bg-red-300/50" : "bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"} text-white transition-all`}
                                    >
                                      {isBusy ? "Declining..." : "Decline"}
                                    </motion.button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Pending Join Requests */}
                      <div>
                        <h4 className="font-semibold text-purple-300 mb-3">Pending Join Requests</h4>
                        {requests.length === 0 ? (
                          <p className="text-white/40 text-sm">No pending requests</p>
                        ) : (
                          <div className="space-y-2">
                            {requests.map((r) => (
                              <motion.div
                                key={r.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-xl"
                              >
                                <span className="text-sm text-white">
                                  {r.profiles?.full_name || `User: ${r.user_id}`}
                                </span>
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => handleApprove(r.id, r.user_id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                                  >
                                    Approve
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleReject(r.id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                                  >
                                    Reject
                                  </motion.button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Event History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          id="history"
          className="relative group mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
            <button
              onClick={() => setShowEventHistory(!showEventHistory)}
              className="w-full flex justify-between items-center px-6 py-4 hover:bg-white/5 rounded-t-2xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">Event History</h3>
                <span className="text-sm text-white/40">({historyEvents.length})</span>
              </div>
              {showEventHistory ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
            </button>
            
            <AnimatePresence>
              {showEventHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
                    {historyEvents.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No completed events yet</p>
                    ) : (
                      historyEvents.map((e) => (
                        <div key={e.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-white">{e.title}</h4>
                            {e.status === "approved" && (
                              <span className="text-xs px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Approved
                              </span>
                            )}
                            {e.status === "rejected" && (
                              <span className="text-xs px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/60 mb-3">{e.description || "No description"}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(e.event_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {e.place || "TBD"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {e.total_xp_pool} XP
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {eventParticipantCounts[e.id] || 0}/{e.members_required}
                            </span>
                          </div>
                          {e.results_description && (
                            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <p className="text-xs text-white/80">
                                <strong className="text-green-400">Results:</strong> {e.results_description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          id="activity"
          className="relative group mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
            <button
              onClick={() => setShowActivityLog(!showActivityLog)}
              className="w-full flex justify-between items-center px-6 py-4 hover:bg-white/5 rounded-t-2xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Activity Log</h3>
                <span className="text-sm text-white/40">({activityLogs.length})</span>
              </div>
              {showActivityLog ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
            </button>
            
            <AnimatePresence>
              {showActivityLog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-2 max-h-96 overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <p className="text-white/40 text-sm py-8 text-center">No activity yet</p>
                    ) : (
                      activityLogs.slice().reverse().map((log) => (
                        <div key={log.id} className="p-3 bg-blue-500/10 border-l-4 border-blue-400 rounded-lg">
                          <p className="text-sm text-white/80">
                            {log.content.replace("🔔 SYSTEM: ", "")}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Password Protection Info */}
        {club.passcode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-4">
              <p className="text-sm text-yellow-400 flex items-center gap-2">
                <LockIcon className="w-4 h-4" />
                This club is password-protected
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        {isAdmin && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (confirm("Are you sure you want to delete this club? This cannot be undone!")) {
                  toast.error("Delete functionality coming soon");
                }
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all text-white lowercase"
            >
              delete club
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all text-white lowercase"
            >
              edit club
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}