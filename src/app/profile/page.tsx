"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Award,
  Users,
  Edit2,
  Check,
  X,
  ChevronDown,
  Camera,
  Star,
  Send,
  MessageSquare,
  AlertCircle,
  Lock,
  ArrowLeft,
  LogOut
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import BentoCard from "@/components/ui/BentoCard";
import HappyButton from "@/components/ui/HappyButton";
import { useTheme } from "@/context/ThemeContext";

type Profile = {
  id: string;
  full_name?: string;
  enrollment_number?: string | null;
  college_email?: string | null;
  description?: string | null;
  profile_photo?: string | null;
  branch?: string | null;
  avg_overall_xp?: number | null;
  gender?: string | null;
  year?: string | null;
  location?: string | null;
  hometown?: string | null;
  profile_completed?: boolean;
  age?: number | null;
  work?: string | null;
  education?: string | null;
  exercise?: string | null;
  education_level?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  kids?: string | null;
  have_kids?: string | null;
  zodiac?: string | null;
  politics?: string | null;
  religion?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  personality?: string[] | null;
  gender_locked?: boolean;
  height_locked?: boolean;
  year_locked?: boolean;
  height?: string | null;
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
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [requestsSent, setRequestsSent] = useState<Request[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<Request[]>([]);
  const [uploading, setUploading] = useState(false);

  const [showSent, setShowSent] = useState(false);
  const [showReceived, setShowReceived] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratingsReceived, setRatingsReceived] = useState<Rating[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<Rating[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "given">("received");

  const [totalConnections, setTotalConnections] = useState<number>(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [fieldToUpdate, setFieldToUpdate] = useState<string | null>(null);

  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const avatarUrl = useMemo(() => {
    if (!profile) return "";
    if (profile.profile_photo) return profile.profile_photo;
    const fallbackName = encodeURIComponent(profile.full_name || "User");
    return `https://ui-avatars.com/api/?name=${fallbackName}&background=random&size=128`;
  }, [profile?.profile_photo, profile?.full_name]);

  useEffect(() => {
    async function fetchData() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      let { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!profileData) {
        const fallbackName = session.user.user_metadata?.full_name ||
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

        const locked = new Set<string>();
        if (profileData.gender_locked) locked.add("gender");
        if (profileData.height_locked) locked.add("height");
        if (profileData.year_locked) locked.add("year");
        setEditedFields(locked);
      }

      // Fetch requests sent
      const { data: sentData } = await supabase
        .from("profile_requests")
        .select(`
          id,
          status,
          to_user:to_user_id ( full_name )
        `)
        .eq("from_user_id", userId);

      // Fetch requests received
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

      // Fetch ratings received
      const { data: received } = await supabase
        .from("ratings")
        .select("*")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false });

      setRatingsReceived(received || []);

      // Fetch ratings given
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

      // Fetch leaderboard for global rank
      const { data: leaderboard } = await supabase
        .from("profiles")
        .select("id, avg_overall_xp")
        .order("avg_overall_xp", { ascending: false });

      const rankIndex = leaderboard?.findIndex((p) => p.id === userId);
      if (rankIndex !== undefined && rankIndex >= 0) setGlobalRank(rankIndex + 1);

      // Fetch total connections
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

  const handleSaveDescription = useCallback(async () => {
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
  }, [profile, description]);

  const handleUploadPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [profile]);

  const handleRequestAction = useCallback(async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("profile_requests").update({ status }).eq("id", id);
    if (!error) {
      setRequestsReceived((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Request ${status} ✅`);
    } else toast.error("Failed to update request ❌");
  }, []);

  const handleEditField = useCallback((field: string, currentValue: any) => {
    if (editedFields.has(field)) {
      toast.error("This field has already been edited and cannot be changed again");
      return;
    }
    setEditingField(field);
    setTempValue(currentValue || "");
  }, [editedFields]);

  const handleConfirmEdit = useCallback((field: string) => {
    setFieldToUpdate(field);
    setShowConfirmModal(true);
  }, []);

  const handleFinalUpdate = useCallback(async () => {
    if (!profile || !fieldToUpdate) return;

    const updateData: any = { [fieldToUpdate]: tempValue };

    if (fieldToUpdate === "gender") updateData.gender_locked = true;
    if (fieldToUpdate === "height") updateData.height_locked = true;
    if (fieldToUpdate === "year") updateData.year_locked = true;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (!error) {
      setProfile((p) => (p ? { ...p, ...updateData } : p));
      setEditedFields((prev) => new Set(prev).add(fieldToUpdate));
      toast.success(`${fieldToUpdate} updated successfully! This field cannot be edited again.`);
      setEditingField(null);
      setShowConfirmModal(false);
      setFieldToUpdate(null);
    } else {
      toast.error("Failed to update field ❌");
    }
  }, [profile, fieldToUpdate, tempValue]);

  const profileFields = [
    { key: "full_name", label: "Full Name", type: "text" },
    { key: "enrollment_number", label: "Enrollment Number", type: "text" },
    { key: "branch", label: "Branch", type: "select", options: ["CSE", "ECE", "IT", "Mechanical", "Civil", "Electrical", "Other"] },
    { key: "gender", label: "Gender", type: "select", options: ["male", "female", "other"] },
    { key: "year", label: "Year", type: "text" },
    { key: "age", label: "Age", type: "number" },
    { key: "height", label: "Height", type: "text" },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden transition-colors duration-300">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <HappyButton
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          icon={ArrowLeft}
        >
          Back to Dashboard
        </HappyButton>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          My Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Stats */}
        <div className="space-y-6">
          <BentoCard variant="purple" className="text-center">
            <div className="relative inline-block mb-4 group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="relative w-32 h-32 rounded-full object-cover border-4 border-background shadow-xl"
              />
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" disabled={uploading} />
              </label>
            </div>

            <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
            <p className="text-muted-foreground text-sm mb-4">{profile.college_email}</p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {profile.branch && (
                <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium border border-purple-500/20">
                  {profile.branch}
                </span>
              )}
              {globalRank && (
                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/20 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Rank #{globalRank}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background/50 rounded-xl border border-border">
                <div className="text-2xl font-bold text-cyan-500">{totalConnections}</div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
              <div className="p-3 bg-background/50 rounded-xl border border-border">
                <div className="text-2xl font-bold text-yellow-500">{profile.avg_overall_xp || "-"}</div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>

            <div className="mt-6">
              <HappyButton
                variant="outline"
                className="w-full"
                onClick={() => setShowRatingsModal(true)}
                icon={Star}
              >
                View My Ratings
              </HappyButton>
            </div>
          </BentoCard>

          {/* Requests Summary */}
          <BentoCard variant="blue" title="Requests">
            <div className="space-y-3">
              <button
                onClick={() => setShowReceived(!showReceived)}
                className="w-full flex items-center justify-between p-3 bg-background/50 hover:bg-background/80 rounded-xl border border-border transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">Received</div>
                    <div className="text-xs text-muted-foreground">{requestsReceived.length} pending</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showReceived ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showReceived && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-2">
                      {requestsReceived.length > 0 ? (
                        requestsReceived.map((r) => (
                          <div key={r.id} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{r.from_user?.full_name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRequestAction(r.id, "accepted")}
                                className="px-2 py-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded text-xs font-medium transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRequestAction(r.id, "declined")}
                                className="px-2 py-1 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded text-xs font-medium transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-center text-muted-foreground py-2">No pending requests</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowSent(!showSent)}
          className="w-full flex items-center justify-between p-3 bg-background/50 hover:bg-background/80 rounded-xl border border-border transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Send className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Sent</div>
              <div className="text-xs text-muted-foreground">{requestsSent.length} pending</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSent ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showSent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                {requestsSent.length > 0 ? (
                  requestsSent.map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border text-sm">
                      <span className="font-medium truncate mr-2">{r.to_user?.full_name}</span>
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full border border-yellow-500/20">
                        {r.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-muted-foreground py-2">No sent requests</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BentoCard>
        </div>

        {/* Right Column: Details & Bio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio Section */}
          <BentoCard variant="default" title="About Me" icon={User}>
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-foreground placeholder:text-muted-foreground resize-none"
                rows={4}
                placeholder="Tell us about yourself... (e.g. interests, hobbies, what you're looking for)"
              />
              <div className="flex justify-end mt-2 pt-2 border-t border-border">
                <HappyButton
                  size="sm"
                  variant="periwinkle"
                  onClick={handleSaveDescription}
                  icon={Check}
                >
                  Save Bio
                </HappyButton>
              </div>
            </div>
          </BentoCard>

          {/* Theme & Appearance */}
          <BentoCard variant="pink" title="Appearance" icon={Star}>
            <div className="flex items-center justify-between p-2">
              <div>
                <div className="font-semibold">Theme Preference</div>
                <div className="text-xs text-muted-foreground">Switch between Light and Dark mode</div>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-8 w-14 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span className={`${theme === 'dark' ? 'translate-x-7 bg-purple-500' : 'translate-x-1 bg-yellow-400'} inline-block h-6 w-6 transform rounded-full transition-transform`} />
                <span className="sr-only">Toggle theme</span>
              </button>
            </div>
          </BentoCard>

          {/* Profile Details */}
          <BentoCard variant="default" title="Profile Details" icon={Edit2}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profileFields.map((field) => {
          const currentValue = profile[field.key as keyof Profile];
          const isEdited = editedFields.has(field.key);
          const isEditing = editingField === field.key;

          return (
            <div key={field.key} className="p-4 bg-muted/20 rounded-xl border border-border hover:border-purple-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {field.label}
                </label>
                {isEdited && (
                  <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full border border-red-500/20">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {field.type === "select" ? (
                    <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmEdit(field.key)}
                      className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="flex-1 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center min-h-[28px]">
                  <p className="text-foreground font-medium truncate mr-2">
                    {currentValue !== null && currentValue !== undefined && currentValue !== ""
                      ? String(currentValue)
                      : <span className="text-muted-foreground/50 italic">Not set</span>
                    }
                  </p>
                  {!isEdited && (
                    <button
                      onClick={() => handleEditField(field.key, currentValue)}
                      className="p-1.5 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BentoCard>
    </div>
    </div>
    </div>

    {/* Confirmation Modal */}
    <AnimatePresence>
  {
    showConfirmModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
        onClick={() => setShowConfirmModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Confirm One-Time Edit</h3>
          </div>

          <p className="text-muted-foreground mb-6">
            Are you sure you want to update this field? <strong className="text-red-500">You can only edit this field once.</strong> After confirming, you won't be able to change it again.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalUpdate}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/20 transition-all"
            >
              Confirm & Lock
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }
  </AnimatePresence>

    {/* Ratings Modal */}
    <AnimatePresence>
  {
    showRatingsModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
        onClick={() => setShowRatingsModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/10">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              My Ratings
            </h2>
            <button
              onClick={() => setShowRatingsModal(false)}
              className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-border bg-card">
            <button
              onClick={() => setActiveTab("received")}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all text-sm ${activeTab === "received"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              Received ({ratingsReceived.length})
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all text-sm ${activeTab === "given"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              Given ({ratingsGiven.length})
            </button>
          </div>

          {/* Ratings List */}
          <div className="p-6 overflow-y-auto flex-1 bg-muted/5">
            <div className="space-y-3">
              {activeTab === "received" ? (
                ratingsReceived.length > 0 ? (
                  ratingsReceived.map((r, index) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-card border border-border rounded-xl shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-500">
                          <Star className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground mb-2 text-sm">{r.comment}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">No ratings received yet</p>
                  </div>
                )
              ) : ratingsGiven.length > 0 ? (
                ratingsGiven.map((r, index) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-card border border-border rounded-xl shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          r.to_user?.profile_photo ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            r.to_user?.full_name || "User"
                          )}&background=random&size=64`
                        }
                        alt="avatar"
                        className="w-10 h-10 rounded-full border border-border object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm mb-1">{r.to_user?.full_name}</p>
                        <p className="text-muted-foreground text-sm mb-2">{r.comment}</p>
                        <span className="text-xs text-muted-foreground/70">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">No ratings given yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }
  </AnimatePresence>
    </div>
  );
}