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
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile"; // Performance: Detect mobile for conditional animations

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
  const isMobile = useIsMobile(); // Performance: Detect mobile for conditional rendering

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

  // Performance: Memoize avatar URL calculation to avoid recalculating on every render
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

  // Performance: useCallback to prevent function recreation on every render
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

  // Performance: useCallback to prevent function recreation
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

  // Performance: useCallback to prevent function recreation
  const handleRequestAction = useCallback(async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("profile_requests").update({ status }).eq("id", id);
    if (!error) {
      setRequestsReceived((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Request ${status} ✅`);
    } else toast.error("Failed to update request ❌");
  }, []);

  // Performance: useCallback to prevent function recreation
  const handleEditField = useCallback((field: string, currentValue: any) => {
    if (editedFields.has(field)) {
      toast.error("This field has already been edited and cannot be changed again");
      return;
    }
    setEditingField(field);
    setTempValue(currentValue || "");
  }, [editedFields]);

  // Performance: useCallback to prevent function recreation
  const handleConfirmEdit = useCallback((field: string) => {
    setFieldToUpdate(field);
    setShowConfirmModal(true);
  }, []);

  // Performance: useCallback to prevent function recreation
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
    { key: "location", label: "Location", type: "text" },
    { key: "hometown", label: "Hometown", type: "text" },
    { key: "work", label: "Work", type: "text" },
    { key: "education", label: "Education", type: "text" },
    { key: "exercise", label: "Exercise", type: "text" },
    { key: "drinking", label: "Drinking", type: "text" },
    { key: "smoking", label: "Smoking", type: "text" },
    { key: "bio", label: "Bio", type: "textarea" },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <p className="text-red-500">❌ Could not load or create profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white py-8 px-4">
      <Toaster position="top-right" />

      {/* OPTIMIZED: Simplified animated backgrounds - removed continuous scale/rotate animations */}
      {!isMobile && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/5 to-transparent rounded-full blur-3xl" />
        </div>
      )}

      {/* Back Button */}
      <div className="relative z-10 max-w-6xl mx-auto mb-6">
        <motion.button
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>
      </div>

      {/* Main Profile Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-6xl mx-auto"
      >
        <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
          {/* Profile Header */}
          <div className="p-8 border-b border-white/10">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-32 h-32 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
                  />
                  <label className="absolute bottom-2 right-2 w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-lg flex items-center justify-center cursor-pointer transition-all shadow-lg group">
                    <Camera className="w-5 h-5 text-white" />
                    <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                        {profile.full_name}
                      </h1>
                      {globalRank && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full"
                        >
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-400">#{globalRank}</span>
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{profile.enrollment_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{profile.college_email}</span>
                      </div>
                      {profile.branch && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300 text-xs font-medium">
                            {profile.branch}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowRatingsModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        My Ratings
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm">
                        <span className="font-bold text-cyan-400">{totalConnections}</span>
                        <span className="text-white/60 ml-1">Connections</span>
                      </span>
                    </div>

                    {profile.avg_overall_xp && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">
                          <span className="font-bold text-yellow-400">{profile.avg_overall_xp}</span>
                          <span className="text-white/60 ml-1">Avg Rating</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-8 border-b border-white/10">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <label className="block mb-3 text-lg font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                {profile.description ? "Edit Description" : "Add Description"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <div className="flex justify-end mt-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveDescription}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Save Changes
                </motion.button>
              </div>
            </div>
          </div>

          {/* All Details Section */}
          <div className="border-b border-white/10">
            <button
              onClick={() => setShowAllDetails(!showAllDetails)}
              className="w-full flex items-center justify-between px-8 py-5 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">All Details</h3>
                  <p className="text-sm text-white/60">One-time edit for each field</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: showAllDetails ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-white/60" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showAllDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-8 pt-0 space-y-4 max-h-[600px] overflow-y-auto">
                    {profileFields.map((field) => {
                      const currentValue = profile[field.key as keyof Profile];
                      const isEdited = editedFields.has(field.key);
                      const isEditing = editingField === field.key;

                      return (
                        <div key={field.key} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <label className="font-semibold text-white">{field.label}</label>
                            {isEdited && (
                              <span className="flex items-center gap-1 text-xs bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-1 rounded-full">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              {field.type === "textarea" ? (
                                <textarea
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  rows={3}
                                />
                              ) : field.type === "select" ? (
                                <select
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                              )}
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleConfirmEdit(field.key)}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all"
                                >
                                  <Check className="w-4 h-4" />
                                  Confirm
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setEditingField(null)}
                                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <p className="text-white/80">
                                {currentValue !== null && currentValue !== undefined && currentValue !== ""
                                  ? String(currentValue)
                                  : <span className="text-white/40 italic">Not set</span>
                                }
                              </p>
                              {!isEdited && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleEditField(field.key, currentValue)}
                                  className="flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm transition-all"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Requests Sections */}
          <div className="p-8 space-y-4">
            {/* Requests Sent */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
              <button
                onClick={() => setShowSent(!showSent)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Send className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold">Requests Sent</h3>
                    <p className="text-sm text-white/60">{requestsSent.length} pending</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: showSent ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-white/60" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showSent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="p-6">
                      {requestsSent.length > 0 ? (
                        <div className="space-y-3">
                          {requestsSent.map((r) => (
                            <div key={r.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
                              <span className="font-medium">To: {r.to_user?.full_name || "Unknown"}</span>
                              <span className="text-xs px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-full">
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/60 text-center py-4">No requests sent</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Requests Received */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
              <button
                onClick={() => setShowReceived(!showReceived)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold">Requests Received</h3>
                    <p className="text-sm text-white/60">{requestsReceived.length} pending</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: showReceived ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-white/60" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showReceived && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="p-6">
                      {requestsReceived.length > 0 ? (
                        <div className="space-y-3">
                          {requestsReceived.map((r) => (
                            <div key={r.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
                              <span className="font-medium">From: {r.from_user?.full_name || "Unknown"}</span>
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRequestAction(r.id, "accepted")}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all"
                                >
                                  Accept
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRequestAction(r.id, "declined")}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                                >
                                  Decline
                                </motion.button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/60 text-center py-4">No requests received</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
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
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirm One-Time Edit</h3>
              </div>
              
              <p className="text-white/80 mb-6">
                Are you sure you want to update this field? <strong className="text-red-400">You can only edit this field once.</strong> After confirming, you won't be able to change it again.
              </p>
              
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFinalUpdate}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                >
                  Confirm & Lock
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ratings Modal */}
      <AnimatePresence>
        {showRatingsModal && (
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
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  My Ratings
                </h2>
                <button
                  onClick={() => setShowRatingsModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-6 border-b border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab("received")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === "received"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  Ratings Received ({ratingsReceived.length})
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab("given")}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === "given"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  Ratings Given ({ratingsGiven.length})
                </motion.button>
              </div>

              {/* Ratings List */}
              <div className="p-6 max-h-[500px] overflow-y-auto">
                <div className="space-y-3">
                  {activeTab === "received" ? (
                    ratingsReceived.length > 0 ? (
                      ratingsReceived.map((r, index) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: isMobile ? 0 : index * 0.05 }} // Performance: Remove stagger delay on mobile
                          className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white mb-2">{r.comment}</p>
                              <span className="text-xs text-white/40">
                                {new Date(r.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                          <Star className="w-8 h-8 text-white/40" />
                        </div>
                        <p className="text-white/60">No ratings received yet</p>
                      </div>
                    )
                  ) : ratingsGiven.length > 0 ? (
                    ratingsGiven.map((r, index) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isMobile ? 0 : index * 0.05 }} // Performance: Remove stagger delay on mobile
                        className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
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
                            className="w-10 h-10 rounded-full border-2 border-white/20"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-white mb-1">{r.to_user?.full_name}</p>
                            <p className="text-white/80 text-sm mb-2">{r.comment}</p>
                            <span className="text-xs text-white/40">
                              {new Date(r.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-white/40" />
                      </div>
                      <p className="text-white/60">No ratings given yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}