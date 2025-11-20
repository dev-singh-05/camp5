"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
// PERFORMANCE: Import useIsMobile to disable animations on mobile
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Pencil,
  MapPin,
  Heart,
  Briefcase,
  School,
  Ruler,
  Wine,
  Cigarette,
  Baby,
  Star,
  BookOpen,
  Camera,
  GraduationCap,
  Sparkles,
  X,
  Check,
  ChevronRight,
  User,
  Upload,
} from "lucide-react";

type Profile = {
  id: string;
  profile_photo?: string | null;
  gallery_photos?: string[];
  age?: number | null;
  work?: string;
  education?: string;
  branch?: string | null;
  gender?: string | null;
  location?: string | null;
  hometown?: string | null;
  height?: string | null;
  exercise?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  kids?: string | null;
  religion?: string | null;
  year?: string | null;
  gender_locked?: boolean;
  height_locked?: boolean;
  year_locked?: boolean;
  profile_completed?: boolean;
  interests?: string[];
  dating_description?: string;
};

export default function DatingProfileDashboard() {
  const router = useRouter();
  // PERFORMANCE: Detect mobile to disable expensive animations
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [manualValue, setManualValue] = useState<string>("");

  // Interests state
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Dating description state
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [datingDescription, setDatingDescription] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
    } else if (data) {
      if (!data.gallery_photos) data.gallery_photos = ["", "", "", ""];
      setProfile(data as Profile);
      setSelectedInterests(data.interests || []);
      setDatingDescription(data.dating_description || "");
      calculateCompletion(data);
    }
    setLoading(false);
  }

  function calculateCompletion(data: any) {
    const fields = [
      "age", "work", "education", "branch", "gender", "location", "hometown",
      "height", "exercise", "drinking", "smoking", "kids", "religion", "year", "profile_photo",
    ];

    const filled = fields.filter((f) => {
      const v = data?.[f];
      return v !== undefined && v !== null && v !== "";
    }).length;

    setCompletion(Math.round((filled / fields.length) * 100));
  }

  async function handleSelect(field: string, value: any) {
    if (!profile) return;
    setSaving(true);

    const updates: any = {
      [field]: field === "gender" ? String(value).toLowerCase() : value,
    };

    if (["gender", "height", "year"].includes(field)) {
      const lockField = `${field}_locked`;
      if ((profile as any)[lockField]) {
        toast.error(`You can only change ${field} once.`);
        setActiveField(null);
        setSaving(false);
        return;
      }
      updates[lockField] = true;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      toast.error("Error saving choice: " + error.message);
    } else {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      calculateCompletion(updated);
      setActiveField(null);
      setManualValue("");
      toast.success("Profile updated!");
    }

    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      toast.error("Please log in again before uploading.");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `dating/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("dating-avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      toast.error("Error uploading image: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("dating-avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ profile_photo: publicUrl })
      .eq("id", profile.id);

    if (dbError) {
      toast.error("Error saving photo URL: " + dbError.message);
      return;
    }

    const updated = { ...profile, profile_photo: publicUrl };
    setProfile(updated);
    calculateCompletion(updated);
    toast.success("Profile photo updated successfully!");
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Please log in again.");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-gallery-${index}.${fileExt}`;
    const filePath = `dating-gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("dating-gallery")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("dating-gallery").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const newGallery = [...(profile.gallery_photos || ["", "", "", ""])];
    newGallery[index] = publicUrl;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ gallery_photos: newGallery })
      .eq("id", profile.id);

    if (dbError) return toast.error("Database update failed.");

    const updated = { ...profile, gallery_photos: newGallery };
    setProfile(updated);
    toast.success("Photo added to gallery!");
  }

  // ✅ Save Interests
  async function handleSaveInterests() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ interests: selectedInterests })
      .eq("id", profile.id);

    if (error) {
      toast.error("Error saving interests: " + error.message);
    } else {
      const updated = { ...profile, interests: selectedInterests };
      setProfile(updated);
      toast.success("Interests saved!");
      setShowInterestsModal(false);
    }

    setSaving(false);
  }

  // ✅ Save Dating Description
  async function handleSaveDatingDescription() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ dating_description: datingDescription.trim() })
      .eq("id", profile.id);

    if (error) {
      toast.error("Error saving description: " + error.message);
    } else {
      const updated = { ...profile, dating_description: datingDescription.trim() };
      setProfile(updated);
      toast.success("Dating description saved!");
      setShowDescriptionModal(false);
    }

    setSaving(false);
  }

  const essentialFields = ["age", "gender", "branch", "location", "hometown"];
  const essentialsFilled = essentialFields.every(
    (key) => profile && (profile as any)[key] && String((profile as any)[key]).trim() !== ""
  );

  const aboutYou = [
    { key: "age", label: "Age", icon: <Heart /> },
    { key: "work", label: "Work", icon: <Briefcase /> },
    { key: "education", label: "Education", icon: <School /> },
    { key: "branch", label: "Branch", icon: <GraduationCap /> },
    { key: "gender", label: "Gender", icon: <BookOpen /> },
    { key: "location", label: "Location", icon: <MapPin /> },
    { key: "hometown", label: "Hometown", icon: <MapPin /> },
  ];

  const moreAbout = [
    { key: "height", label: "Height", icon: <Ruler /> },
    { key: "exercise", label: "Exercise", icon: <Star /> },
    { key: "drinking", label: "Drinking", icon: <Wine /> },
    { key: "smoking", label: "Smoking", icon: <Cigarette /> },
    { key: "kids", label: "Kids", icon: <Baby /> },
    { key: "religion", label: "Religion", icon: <Heart /> },
  ];

  const OPTIONS: Record<string, string[]> = {
    gender: ["Male", "Female", "Other"],
    drinking: ["Yes", "Sometimes", "Rarely", "No", "Sober"],
    smoking: ["Yes", "Sometimes", "No"],
    exercise: ["Regularly", "Sometimes", "Rarely", "Never"],
    kids: ["Want kids", "Don't want kids", "Already have kids"],
    religion: ["Hindu", "Muslim", "Christian", "Sikh", "Atheist", "Other"],
    height: ["5'0", "5'2", "5'4", "5'6", "5'8", "6'0", "6'2+"],
    year: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    branch: ["CSE", "ECE", "IT", "Mechanical", "Civil", "Electrical", "Other"],
  };

  const INTEREST_OPTIONS = [
    "Movies", "Music", "Sports", "Reading", "Gaming", "Traveling",
    "Cooking", "Photography", "Art", "Dancing", "Fitness", "Yoga",
    "Technology", "Fashion", "Food", "Nature", "Pets", "Adventure",
    "Writing", "Shopping", "Meditation", "Hiking", "Swimming", "Cycling"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 flex items-center justify-center">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 text-white overflow-x-hidden pb-32">
      <Toaster position="top-center" />

      {/* Animated Background Elements */}
      {/* PERFORMANCE: Use CSS animations instead of JS for better performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {!isMobile ? (
          <>
            {/* PERFORMANCE: Replaced Framer Motion with pure CSS animations */}
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow opacity-[0.05]" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-rose-500/10 to-transparent rounded-full blur-3xl animate-pulse-slower opacity-[0.05]" />
          </>
        ) : (
          <>
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl opacity-[0.05]" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-rose-500/10 to-transparent rounded-full blur-3xl opacity-[0.05]" />
          </>
        )}
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <m.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
            >
              ←
            </m.button>

            <m.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-white via-pink-200 to-rose-200 bg-clip-text text-transparent flex items-center gap-2"
            >
              <User className="w-6 h-6 text-pink-400" />
              My Dating Profile
            </m.h1>

            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Profile Photo Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
              {/* Main Profile Photo */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group/photo">
                  <m.div
                    whileHover={{ scale: 1.05 }}
                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-pink-500/30 shadow-2xl shadow-pink-500/20"
                  >
                    <Image
                      src={profile?.profile_photo || "https://via.placeholder.com/150x150.png?text=No+Photo"}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </m.div>
                  <label
                    htmlFor="photoUpload"
                    className="absolute bottom-0 right-0 bg-gradient-to-br from-pink-500 to-rose-500 text-white p-3 rounded-full cursor-pointer hover:shadow-lg hover:shadow-pink-500/50 transition-all border border-white/10"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                  <input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-white/60 mt-4">Upload your profile photo</p>
              </div>

              {/* Gallery Photos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Photo Gallery
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profile?.gallery_photos?.map((photo, index) => (
                    <m.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className="relative group/gallery"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl blur opacity-0 group-hover/gallery:opacity-100 transition-opacity" />
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                        {photo ? (
                          <Image
                            src={photo}
                            alt={`Gallery ${index + 1}`}
                            width={256}
                            height={256}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-white/40" />
                          </div>
                        )}
                        <label
                          htmlFor={`galleryUpload${index}`}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover/gallery:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </label>
                        <input
                          id={`galleryUpload${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleGalleryUpload(e, index)}
                          className="hidden"
                        />
                      </div>
                    </m.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Profile Completion */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl blur-lg" />
            <div className="relative bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-white/80">Profile Completion</span>
                <span className="text-sm font-bold text-pink-400">{completion}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-3 rounded-full transition-all duration-500 ${
                    completion < 50
                      ? "bg-gradient-to-r from-red-500 to-orange-500"
                      : completion < 80
                      ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                      : "bg-gradient-to-r from-pink-500 to-rose-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </m.div>

        {/* About You Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  About You
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {aboutYou.map((item, index) => (
                    <m.div
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      onClick={() => setActiveField(item.key)}
                      className="relative group/item cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                      <div className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-pink-500/50 p-4 transition-all duration-200 group-hover/item:translate-x-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                              {item.icon}
                            </div>
                            <div>
                              <p className="font-medium text-white">{item.label}</p>
                              <p className="text-sm text-white/60">
                                {(profile as any)[item.key] || <span className="italic">Not set</span>}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/40 group-hover/item:text-white/80 group-hover/item:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* More About You Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-pink-400" />
                  More About You
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {moreAbout.map((item, index) => (
                    <m.div
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      onClick={() => setActiveField(item.key)}
                      className="relative group/item cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                      <div className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-pink-500/50 p-4 transition-all duration-200 group-hover/item:translate-x-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                              {item.icon}
                            </div>
                            <div>
                              <p className="font-medium text-white">{item.label}</p>
                              <p className="text-sm text-white/60">
                                {(profile as any)[item.key] || <span className="italic">Not set</span>}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/40 group-hover/item:text-white/80 group-hover/item:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Dating Preferences Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Dating Preferences
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {/* Dating Bio */}
                  <m.div
                    onClick={() => setShowDescriptionModal(true)}
                    className="relative group/item cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                    <div className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-pink-500/50 p-4 transition-all duration-200 group-hover/item:translate-x-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                            <Heart />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white">Dating Bio</p>
                            <p className="text-sm text-white/60 truncate">
                              {profile?.dating_description || <span className="italic">Not set</span>}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover/item:text-white/80 transition-all duration-200 flex-shrink-0" />
                      </div>
                    </div>
                  </m.div>

                  {/* Interests */}
                  <m.div
                    onClick={() => setShowInterestsModal(true)}
                    className="relative group/item cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                    <div className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-pink-500/50 p-4 transition-all duration-200 group-hover/item:translate-x-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                            <Sparkles />
                          </div>
                          <div>
                            <p className="font-medium text-white">Interests</p>
                            <p className="text-sm text-white/60">
                              {profile?.interests && profile.interests.length > 0
                                ? `${profile.interests.length} selected`
                                : <span className="italic">Not set</span>}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover/item:text-white/80 transition-all duration-200" />
                      </div>
                    </div>
                  </m.div>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      </main>

      {/* Fixed Bottom Button */}
      {essentialsFilled && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6"
        >
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (!profile) return;
              const { error } = await supabase
                .from("profiles")
                .update({ profile_completed: true })
                .eq("id", profile.id);

              if (error) toast.error("Error updating profile: " + error.message);
              else {
                toast.success("Profile updated — redirecting...");
                setTimeout(() => router.push("/dating"), 2000);
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl font-semibold hover:shadow-2xl hover:shadow-pink-500/50 transition-all text-lg flex items-center gap-2"
          >
            <Heart className="w-5 h-5" />
            Continue to Dating
          </m.button>
        </m.div>
      )}

      {/* Field Edit Modal */}
      <AnimatePresence>
        {activeField && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setActiveField(null);
              setManualValue("");
            }}
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-white">
                  {aboutYou.concat(moreAbout).find((f) => f.key === activeField)?.label}
                </h3>
                <button
                  onClick={() => {
                    setActiveField(null);
                    setManualValue("");
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {OPTIONS[activeField as keyof typeof OPTIONS] ? (
                  OPTIONS[activeField as keyof typeof OPTIONS].map((opt) => (
                    <m.button
                      key={opt}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={saving}
                      onClick={() => handleSelect(activeField, opt)}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/50 text-white font-medium transition-all disabled:opacity-50"
                    >
                      {opt}
                    </m.button>
                  ))
                ) : (
                  <>
                    <input
                      type={activeField === "age" ? "number" : "text"}
                      placeholder={`Enter your ${activeField}`}
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                    />
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!manualValue || saving}
                      onClick={() => handleSelect(activeField, manualValue)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-500/50 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save"}
                    </m.button>
                  </>
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Interests Modal */}
      <AnimatePresence>
        {showInterestsModal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setSelectedInterests(profile?.interests || []);
              setShowInterestsModal(false);
            }}
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    Select Your Interests
                  </h3>
                  <p className="text-sm text-white/60 mt-1">Choose up to 10 interests</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedInterests(profile?.interests || []);
                    setShowInterestsModal(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {INTEREST_OPTIONS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <m.button
                        key={interest}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInterests(selectedInterests.filter((i) => i !== interest));
                          } else {
                            if (selectedInterests.length < 10) {
                              setSelectedInterests([...selectedInterests, interest]);
                            } else {
                              toast.error("Maximum 10 interests allowed");
                            }
                          }
                        }}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 border border-pink-500/50"
                            : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
                        }`}
                      >
                        {interest}
                      </m.button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedInterests(profile?.interests || []);
                      setShowInterestsModal(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInterests}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-500/50 text-white font-semibold transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : `Save (${selectedInterests.length}/10)`}
                  </button>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Dating Description Modal */}
      <AnimatePresence>
        {showDescriptionModal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setDatingDescription(profile?.dating_description || "");
              setShowDescriptionModal(false);
            }}
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
            >
              <div className="border-b border-white/10 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-400" />
                    Dating Bio
                  </h3>
                  <p className="text-sm text-white/60 mt-1">Tell potential matches about yourself</p>
                </div>
                <button
                  onClick={() => {
                    setDatingDescription(profile?.dating_description || "");
                    setShowDescriptionModal(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <textarea
                  value={datingDescription}
                  onChange={(e) => setDatingDescription(e.target.value)}
                  placeholder="e.g., Love traveling, coffee addict, looking for genuine connections..."
                  rows={6}
                  maxLength={200}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-white/40 transition-all resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-white/40">Share what makes you unique</p>
                  <p className="text-xs text-white/60">{datingDescription.length}/200</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setDatingDescription(profile?.dating_description || "");
                      setShowDescriptionModal(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDatingDescription}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-500/50 text-white font-semibold transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Bio"}
                  </button>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* PERFORMANCE: Custom CSS animations for better performance than JS */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.08; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.08; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 20s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}