"use client";

import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
// PERFORMANCE: Import useCallback, useMemo, and React.memo for memoization to prevent unnecessary re-renders
import React, { useEffect, useState, useRef, Suspense, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getMyMatches } from "@/utils/dating";
import { User, Heart, Sparkles, Mail, ChevronRight, X, Send, Users, Zap, ChevronDown } from "lucide-react";
import AdBanner from "@/components/ads";
import { motion, AnimatePresence } from "framer-motion";
// PERFORMANCE: Import useIsMobile hook to disable expensive animations on mobile
import { useIsMobile } from "@/hooks/useIsMobile";

// Performance optimization: Dynamically import VerificationOverlay to reduce initial bundle size
const VerificationOverlay = dynamic(() => import("@/components/VerificationOverlay"), {
  ssr: false,
});

/* ----------------------------- Types ------------------------------------ */

type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  match_type: string;
};

type Profile = {
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

type Question = {
  id: string;
  text: string;
  category?: string | null;
};

type VerificationStatus = {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  rejection_reason?: string;
};

/* --------------------------- ChatCard Component ------------------------- */

// PERFORMANCE: Memoize ChatCard to prevent unnecessary re-renders
const ChatCard = React.memo(({ match, index, router }: { match: Match; index: number; router: any }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={() => router.push(`/dating/chat/${match.id}`)}
      className="relative group cursor-pointer"
    >
      {/* PERFORMANCE: Simplified hover effect using CSS only */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-pink-500/50 p-4 transition-all duration-200 group-hover:translate-x-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xl flex-shrink-0">
              {match.match_type === "random" ? "🎲" : "💡"}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {match.match_type === "random" ? "Random Match" : "Interest Match"}
              </h3>
              <p className="text-xs text-white/60">Click to open chat</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-all duration-200 flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
});

/* --------------------------- Component ---------------------------------- */

function DatingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // PERFORMANCE: Detect mobile to disable expensive animations
  const isMobile = useIsMobile();

  /* -------------------------- Local state -------------------------------- */
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completion, setCompletion] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [userGender, setUserGender] = useState<string | null>(null);
  const [acceptedMatchesCount, setAcceptedMatchesCount] = useState<number>(0);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: "not_submitted",
  });
  const [showVerificationOverlay, setShowVerificationOverlay] = useState(false);

  // 🧪 TESTING MODE - Controlled by environment variable
  const ENABLE_TESTING_MODE = process.env.NEXT_PUBLIC_ENABLE_DATING_TEST === "true";
  const [testingMode, setTestingMode] = useState(false);

  // Request flow
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [candidate, setCandidate] = useState<Profile | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingMatchType, setPendingMatchType] = useState<"random" | "interest">(
    "random"
  );

  // Dropdown state for chats
  const [isChatsExpanded, setIsChatsExpanded] = useState(false);

  // Refs for subscriptions cleanup
  const verificationChannelRef = useRef<any>(null);
  const notificationsChannelRef = useRef<any>(null);

  /* ------------------------- Fetch helpers ------------------------------- */

  // PERFORMANCE: Wrap in useCallback to prevent unnecessary re-creation on every render
  // WHY: These functions are passed to useEffect dependencies and used in real-time handlers
  const fetchMatches = useCallback(async () => {
    try {
      const data = await getMyMatches();
      setMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check verification status for current user.
   * PERFORMANCE: Memoized to prevent re-creation
   * UPDATED: Only shows verification modal after 2 accepted matches
   */
  const checkVerificationStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's accepted matches count
      const { data: profileData } = await supabase
        .from("profiles")
        .select("dating_accepted_matches_count")
        .eq("id", user.id)
        .single();

      const matchCount = profileData?.dating_accepted_matches_count || 0;
      setAcceptedMatchesCount(matchCount);

      const { data: verification, error } = await supabase
        .from("dating_verifications")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.error("Verification check error:", error);
        return;
      }

      if (!verification) {
        setVerificationStatus({ status: "not_submitted" });
        // Only show verification overlay after 2 accepted matches
        setShowVerificationOverlay(matchCount >= 2);
      } else {
        setVerificationStatus({
          status: verification.status as "pending" | "approved" | "rejected",
          rejection_reason: verification.rejection_reason,
        });
        setShowVerificationOverlay(false);
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    }
  }, []);

  /* ------------------------ Profile utilities ---------------------------- */

  // PERFORMANCE: Memoize to prevent unnecessary re-creation
  const fetchProfileCompletion = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "age, work, education, branch, gender, location, hometown, height, exercise, drinking, smoking, kids, religion, year, profile_photo"
        )
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setCompletion(0);
        return;
      }

      const fields = [
        "age",
        "work",
        "education",
        "branch",
        "gender",
        "location",
        "hometown",
        "height",
        "exercise",
        "drinking",
        "smoking",
        "kids",
        "religion",
        "year",
        "profile_photo",
      ];

      const filled = fields.filter((f) => {
        const value = profile[f as keyof typeof profile];
        return value !== undefined && value !== null && value !== "";
      }).length;

      setCompletion(Math.round((filled / fields.length) * 100));
    } catch (err) {
      console.error("Error fetching profile completion:", err);
      setCompletion(0);
    }
  }, []);

  // PERFORMANCE: Memoize to prevent unnecessary re-creation
  const fetchUserGender = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", user.id)
        .maybeSingle();

      setUserGender(profile?.gender ?? null);
    } catch (err) {
      console.error("Error fetching user gender:", err);
    }
  }, []);

  /* ------------------------ Matching flow -------------------------------- */

  async function handleMatch(type: "random" | "interest") {
    // Allow first 2 matches without verification (progressive unlock)
    const needsVerification = acceptedMatchesCount >= 2;

    // Check verification status after 2 matches
    if (needsVerification && verificationStatus.status !== "approved") {
      toast.error("Please complete verification to continue matching 💞");
      return;
    }

    // For first 2 matches, only require photo and interests (basic fields)
    // After 2 matches, require 50% profile completion
    const minCompletionRequired = acceptedMatchesCount >= 2 ? 50 : 0;

    if (completion > 0 && completion < minCompletionRequired) {
      toast.error("Complete at least 50% of your profile before matching 💞");
      router.push("/dating/dating-profiles");
      return;
    }

    setCreating(true);
    setPendingMatchType(type);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get user's interests and gender
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("interests, gender")
        .eq("id", user.id)
        .single();

      // Determine opposite gender
      const oppositeGender =
        myProfile?.gender === "male"
          ? "female"
          : myProfile?.gender === "female"
          ? "male"
          : null;

      // Build exclusion set - ONLY if NOT in testing mode
      const excludedIds = new Set<string>([user.id]);

      if (!testingMode) {
        // Performance optimization: Run matches and requests queries in parallel
        const [matchesResult, requestsResult] = await Promise.all([
          supabase
            .from("dating_matches")
            .select("user1_id, user2_id")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
          supabase
            .from("dating_requests")
            .select("requester_id, candidate_id")
            .or(`requester_id.eq.${user.id},candidate_id.eq.${user.id}`)
        ]);

        const existingMatches = matchesResult.data;
        const existingRequests = requestsResult.data;

        (existingMatches || []).forEach((m: any) => {
          if (m.user1_id === user.id) {
            excludedIds.add(m.user2_id);
          } else {
            excludedIds.add(m.user1_id);
          }
        });

        (existingRequests || []).forEach((r: any) => {
          if (r.requester_id === user.id) {
            excludedIds.add(r.candidate_id);
          } else {
            excludedIds.add(r.requester_id);
          }
        });

        console.log("Excluded IDs:", Array.from(excludedIds));
      } else {
        console.log("🧪 TESTING MODE: Not excluding any users");
      }

      // BUILD QUERY - fetch ALL verified candidates first
      let candidateQuery = supabase
        .from("profiles")
        .select(
          "id, full_name, profile_photo, gender, branch, year, height, dating_description, interests"
        )
        .eq("dating_verified", true)
        .neq("id", user.id); // Don't match with yourself

      // Apply gender filter if the user provided a gender
      if (oppositeGender) {
        candidateQuery = candidateQuery.eq("gender", oppositeGender);
      }

      // Apply interest filter for interest-based matching
      if (
        type === "interest" &&
        myProfile?.interests &&
        myProfile.interests.length > 0
      ) {
        candidateQuery = candidateQuery.overlaps("interests", myProfile.interests);
      }

      // Performance optimization: Limit candidates to reduce data transfer and improve performance
      candidateQuery = candidateQuery.limit(100);

      const { data: allCandidates, error: candidateErr } = await candidateQuery;

      if (candidateErr) {
        console.error("Candidate fetch error:", candidateErr);
        toast.error("Error finding matches. Try again.");
        return;
      }

      console.log("All candidates fetched:", allCandidates?.length || 0);

      // FILTER OUT EXCLUDED IDs IN JAVASCRIPT
      const candidates = (allCandidates || []).filter((c: any) => !excludedIds.has(c.id));

      console.log("Total candidates after filtering:", candidates.length);

      if (candidates.length === 0) {
        toast("No matches found right now. Try again later!");
        return;
      }

      // Pick random candidate
      const selectedCandidate =
        candidates[Math.floor(Math.random() * candidates.length)];
      console.log("Selected candidate:", selectedCandidate.full_name);
      setCandidate(selectedCandidate);

      // Fetch a random icebreaker question from admin-managed questions
      const { data: icebreakerQuestions } = await supabase
        .from("icebreaker_questions")
        .select("*")
        .eq("is_active", true)
        .in("usage_type", ["match_dating", "both"]);

      if (icebreakerQuestions && icebreakerQuestions.length > 0) {
        const randomQuestion = icebreakerQuestions[Math.floor(Math.random() * icebreakerQuestions.length)];
        setQuestion({ id: randomQuestion.id, text: randomQuestion.question });
      } else {
        setQuestion({ id: "default", text: "Why do you think we'd be a good match?" });
      }

      setAnswer("");
      setShowRequestModal(true);
    } catch (err) {
      console.error("Error finding match:", err);
      toast.error("Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  /* ----------------------- Request/Send flow ----------------------------- */

  async function sendRequest() {
    if (!candidate || !question || !answer.trim()) {
      toast.error("Please answer the question before sending.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("dating_requests").insert([
        {
          requester_id: user.id,
          candidate_id: candidate.id,
          category: selectedCategory || "casual",
          match_type: pendingMatchType,
          answer: answer.trim(),
          question_text: question.text,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("Send request error:", error);
        toast.error("Failed to send request. Try again.");
        return;
      }

      toast.success("Request sent! Waiting for response.");
      setShowRequestModal(false);
      setCandidate(null);
      setQuestion(null);
      setAnswer("");
    } catch (err) {
      console.error("Send request error:", err);
      toast.error("Failed to send request.");
    }
  }

  /* ---------------------- Testing helpers ------------------------------- */

  async function clearMyDatingData() {
    if (
      !confirm(
        "⚠️ This will delete ALL your matches, chats, reveals, and requests. Continue?"
      )
    ) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myMatches } = await supabase
        .from("dating_matches")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchIds = (myMatches || []).map((m: any) => m.id);

      if (matchIds.length > 0) {
        await supabase.from("dating_chats").delete().in("match_id", matchIds);
        await supabase.from("dating_reveals").delete().in("match_id", matchIds);
        await supabase.from("dating_matches").delete().in("id", matchIds);
      }

      await supabase
        .from("dating_requests")
        .delete()
        .or(`requester_id.eq.${user.id},candidate_id.eq.${user.id}`);

      toast.success("All dating data cleared! You can now re-match with anyone.");
      fetchMatches();
    } catch (err) {
      console.error("Clear data error:", err);
      toast.error("Failed to clear data.");
    }
  }

  /* ----------------------- Derived UI state ----------------------------- */

  const profilePlaceholder = "/images/avatar-placeholder.png";

  // PERFORMANCE: Memoize expensive boolean calculations to prevent re-computation on every render
  // WHY: These are computed from multiple state variables and used in render
  // UPDATED: Progressive unlock - allow matching without verification for first 2 matches
  const matchingDisabled = useMemo(() => {
    const needsVerification = acceptedMatchesCount >= 2;
    const minCompletionRequired = acceptedMatchesCount >= 2 ? 50 : 0;

    return (
      creating ||
      (completion > 0 && completion < minCompletionRequired) ||
      (needsVerification && verificationStatus.status !== "approved")
    );
  }, [creating, completion, verificationStatus.status, acceptedMatchesCount]);

  const shouldHidePhoto = useMemo(
    () => selectedCategory === "serious" || selectedCategory === "fun",
    [selectedCategory]
  );

  const shouldHideName = useMemo(
    () =>
      selectedCategory === "serious" ||
      selectedCategory === "fun" ||
      (selectedCategory === "mystery" && candidate?.gender?.toLowerCase() === "female"),
    [selectedCategory, candidate?.gender]
  );

  /* --------------------- Realtime subscriptions ------------------------- */

  useEffect(() => {
    let mounted = true;
    // PERFORMANCE: Debounce expensive re-fetch operations
    // WHY: Real-time updates can fire rapidly, causing excessive API calls
    let fetchDebounceTimer: NodeJS.Timeout | null = null;

    const debouncedFetch = () => {
      if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
      fetchDebounceTimer = setTimeout(() => {
        if (!mounted) return;
        fetchProfileCompletion();
        fetchMatches();
      }, 500); // 500ms debounce - batch rapid updates together
    };

    async function setupSubscription() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Clean previous channels
        if (verificationChannelRef.current) {
          try {
            supabase.removeChannel(verificationChannelRef.current);
          } catch (e) {
            console.error("Error removing verification channel:", e);
          }
          verificationChannelRef.current = null;
        }

        if (notificationsChannelRef.current) {
          try {
            supabase.removeChannel(notificationsChannelRef.current);
          } catch (e) {
            console.error("Error removing notifications channel:", e);
          }
          notificationsChannelRef.current = null;
        }

        // Set up verification channel
        const vChannel = supabase
          .channel(`public:dating_verifications:user=${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "dating_verifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload: any) => {
              if (!mounted) return;

              const newRow = payload?.new as { status?: string; rejection_reason?: string } | undefined;
              const eventType = payload?.eventType as string | undefined;
              const newStatus = newRow?.status;

              if (newStatus) {
                setVerificationStatus({
                  status: newStatus as "pending" | "approved" | "rejected",
                  rejection_reason: newRow?.rejection_reason,
                });
                setShowVerificationOverlay(false);
              } else if (eventType === "DELETE") {
                setVerificationStatus({ status: "not_submitted" });
                setShowVerificationOverlay(true);
              }

              // PERFORMANCE: Use debounced fetch instead of calling directly
              debouncedFetch();
            }
          )
          .subscribe();

        verificationChannelRef.current = vChannel;

        // Set up notifications channel
        const nChannel = supabase
          .channel(`public:notifications:user=${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              if (!mounted) return;
              // PERFORMANCE: Debounce this too
              if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
              fetchDebounceTimer = setTimeout(() => {
                if (!mounted) return;
                checkVerificationStatus();
              }, 300);
            }
          )
          .subscribe();

        notificationsChannelRef.current = nChannel;
      } catch (e) {
        console.error("Realtime setup error:", e);
      }
    }

    setupSubscription();

    return () => {
      mounted = false;
      if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
      if (verificationChannelRef.current) {
        try {
          supabase.removeChannel(verificationChannelRef.current);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
      if (notificationsChannelRef.current) {
        try {
          supabase.removeChannel(notificationsChannelRef.current);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
    };
  }, [fetchProfileCompletion, fetchMatches, checkVerificationStatus]);

  /* ------------------------ Initial load -------------------------------- */

  useEffect(() => {
    checkVerificationStatus();
    fetchMatches();
    fetchProfileCompletion();
    fetchUserGender();
  }, []);

  /* If profile completion is less than required minimum, nudge user */
  useEffect(() => {
    // Progressive unlock: Only require 50% completion after 2 matches
    const minCompletionRequired = acceptedMatchesCount >= 2 ? 50 : 0;

    if (completion > 0 && completion < minCompletionRequired) {
      toast.error("Please complete at least 50% of your profile before matching 💞", {
        duration: 2500,
      });
      const t = setTimeout(() => {
        router.push("/dating/dating-profiles");
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [completion, acceptedMatchesCount, router]);

  /* Handle navigation from deleted chat - remove deleted match from list */
  useEffect(() => {
    const deletedId = searchParams.get("deletedId");
    if (deletedId) {
      // Filter out the deleted match from the matches list
      setMatches((prevMatches) => prevMatches.filter((match) => match.id !== deletedId));

      // Clean up URL by removing the deletedId parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      toast.success("Chat deleted successfully");
    }
  }, [searchParams]);

  /* --------------------------- UI -------------------------------------- */

  // Show verification overlay only after 2 accepted matches
  if (showVerificationOverlay && verificationStatus.status === "not_submitted" && acceptedMatchesCount >= 2) {
    return (
      <VerificationOverlay
        onVerificationSubmitted={() => {
          checkVerificationStatus();
          setShowVerificationOverlay(false);
        }}
      />
    );
  }

  // Show pending screen (only after 2 matches)
  if (verificationStatus.status === "pending" && acceptedMatchesCount >= 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md w-full text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-4xl">⏳</span>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Pending</h2>
            <p className="text-white/60 mb-4">
              Your verification is being reviewed by our admin team. This usually takes 24-48 hours.
            </p>
            <p className="text-sm text-white/40">You'll receive a notification once your verification is approved.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show rejected screen (only after 2 matches)
  if (verificationStatus.status === "rejected" && acceptedMatchesCount >= 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500/30 to-pink-500/30 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Rejected</h2>
            <p className="text-white/60 mb-4">Unfortunately, your verification was not approved.</p>
            {verificationStatus.rejection_reason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-1">Reason:</p>
                <p className="text-sm text-red-300">{verificationStatus.rejection_reason}</p>
              </div>
            )}
            <button
              onClick={() => {
                setVerificationStatus({ status: "not_submitted" });
                setShowVerificationOverlay(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/50 font-medium transition-all"
            >
              Submit New Verification
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main dating page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 text-white overflow-x-hidden">
      <Toaster position="top-center" />

      {/* Animated Background Elements */}
      {/* PERFORMANCE: Use CSS animations instead of JS for better performance */}
      {/* WHY: CSS animations are GPU-accelerated and don't block the main thread */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {!isMobile ? (
          <>
            {/* PERFORMANCE: Replaced Framer Motion with pure CSS animations */}
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow opacity-[0.05]" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-rose-500/10 to-transparent rounded-full blur-3xl animate-pulse-slower opacity-[0.05]" />
          </>
        ) : (
          <>
            {/* Static gradients for mobile - no animation overhead */}
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl opacity-[0.05]" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-rose-500/10 to-transparent rounded-full blur-3xl opacity-[0.05]" />
          </>
        )}
      </div>

      {/* Header - Mobile Optimized */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile: 3-button row at top */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0 sm:hidden">
            {/* Back Button (Left) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white text-sm font-medium"
            >
              ← Back
            </motion.button>

            {/* Requests Button (Center) */}
            <Link
              href="/dating/requests"
              className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              Requests
            </Link>

            {/* Profile Button (Right) */}
            <Link
              href="/dating/dating-profiles"
              className="px-4 py-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center gap-2 text-white hover:shadow-lg hover:shadow-pink-500/50 transition-all font-medium text-sm"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
          </div>

          {/* Desktop Layout (hidden on mobile) */}
          <div className="hidden sm:flex flex-col lg:flex-row items-center gap-4">
            {/* Left: Back Button */}
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="w-full lg:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all text-white font-medium"
            >
              ← Back
            </motion.button>

            {/* Center: Profile Completion Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 w-full"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl blur-lg" />
                <div className="relative bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-white/80">Profile Completion</span>
                    <span className="text-sm font-bold text-pink-400">{completion}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
                    <motion.div
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
            </motion.div>

            {/* Right: Requests & Profile Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Link
                href="/dating/requests"
                className="flex-1 lg:flex-none px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Requests
              </Link>
              <Link
                href="/dating/dating-profiles"
                className="flex-1 lg:flex-none px-6 py-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center gap-2 text-white hover:shadow-lg hover:shadow-pink-500/50 transition-all font-medium"
              >
                <User className="w-5 h-5" />
                Profile
              </Link>
            </div>
          </div>

          {/* Profile Completion Bar (Mobile Only) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="block sm:hidden"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl blur-lg" />
              <div className="relative bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-white/80">Profile Completion</span>
                  <span className="text-xs font-bold text-pink-400">{completion}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-2 rounded-full transition-all duration-500 ${
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
          </motion.div>
        </div>
      </header>

      {/* Testing mode controls */}
      {ENABLE_TESTING_MODE && (
        <div className="relative z-10 border-b border-white/5 bg-yellow-500/10 backdrop-blur-xl">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testingMode}
                    onChange={(e) => setTestingMode(e.target.checked)}
                    className="w-4 h-4 text-pink-500 rounded focus:ring-pink-400"
                  />
                  <span className="text-sm font-medium text-yellow-300">🧪 Testing Mode (Allow re-matching)</span>
                </label>
              </div>
              <button
                onClick={clearMyDatingData}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 rounded-xl hover:shadow-lg hover:shadow-red-500/30 text-sm font-medium transition-all"
              >
                🗑️ Clear All My Dating Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Category Selection - Always visible at top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            {/* PERFORMANCE: Replaced JS animation with CSS for better performance */}
            {!isMobile ? (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-rose-500/30 rounded-3xl blur-2xl animate-pulse-medium opacity-40" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-rose-500/30 rounded-3xl blur-2xl opacity-40" />
            )}
            <div className="relative bg-gradient-to-br from-slate-900/80 via-purple-950/40 to-slate-900/80 backdrop-blur-2xl rounded-3xl border border-pink-500/30 shadow-2xl overflow-hidden">
              {/* Decorative gradient overlays */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
              <div className="absolute top-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
              
              <div className="relative p-4 sm:p-8">
                <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-3">
                  {/* PERFORMANCE: Replaced rotating animation with static icon for better performance */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  What are you looking for?
                </label>
                
                <div className="relative">
                  {/* Custom dropdown wrapper with enhanced styling */}
                  <div className="relative group/select">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-2xl blur-xl"
                      whileHover={{ scale: 1.02, opacity: 0.8 }}
                      transition={{ duration: 0.2 }}
                    />
                    <div className="relative">
                      {/* Red outline wrapper */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-red-500/60 pointer-events-none z-20" />
<select
  id="category"
  value={selectedCategory}
  onChange={(e) => setSelectedCategory(e.target.value)}
  className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-slate-950/50 border-2 border-red-500/50 rounded-2xl focus:ring-4 focus:ring-red-500/40 focus:border-red-500 text-white text-base sm:text-lg font-semibold appearance-none cursor-pointer transition-all hover:border-red-500/70 hover:bg-slate-900/60 hover:shadow-xl hover:shadow-red-500/30 shadow-lg relative z-10 [&>option]:bg-slate-900 [&>option]:text-white [&>option]:py-3"
  style={{
    colorScheme: 'dark',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ef4444'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1.5rem',
    paddingRight: '3rem',
    backgroundColor: 'transparent',
  }}
>
  <option value="">✨ Select a category</option>
  <option value="serious">💖 Serious Dating</option>
  <option value="casual">😎 Casual Dating</option>
  <option value="mystery">🌸 Mystery Mode (Women First)</option>
  <option value="fun">🔥 For Fun & Flirty</option>
  <option value="friends">🫶 Friendship</option>
</select>
                    </div>
                  </div>
                  
                  {/* Helper text */}
                  {!selectedCategory && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white/60 text-sm mt-4 flex items-center gap-2 pl-2"
                    >
                      <Heart className="w-4 h-4 text-pink-400" />
                      Choose what you're looking for to get started
                    </motion.p>
                  )}
                  
                  {selectedCategory && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 relative"
                    >
                      {/* Red outline wrapper */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-pink-500/60 pointer-events-none z-20" />
                      <div className="p-4 bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-pink-500/20 border-2 border-pink-500/40 rounded-2xl backdrop-blur-xl shadow-lg relative">
                        <div className="text-pink-200 text-base font-semibold flex items-center gap-2">
                          {/* PERFORMANCE: Replaced pulsing animation with static icon */}
                          <Sparkles className="w-5 h-5 text-pink-400" />
                          Great choice! Now find your match below
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {completion > 0 && completion < 50 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 relative"
                  >
                    {/* Red outline wrapper */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-red-500/70 pointer-events-none z-20" />
                    <div className="p-5 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 border-2 border-red-500/50 rounded-2xl backdrop-blur-xl shadow-lg relative">
                      <p className="text-red-300 text-base font-bold flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        Your profile is only {completion}% complete — finish it first!
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Match Buttons - Show when category selected */}
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <motion.button
              whileHover={{ scale: matchingDisabled ? 1 : 1.02, y: matchingDisabled ? 0 : -4 }}
              whileTap={{ scale: matchingDisabled ? 1 : 0.98 }}
              onClick={() => handleMatch("random")}
              disabled={matchingDisabled}
              className={`relative group ${matchingDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* PERFORMANCE: Replaced box-shadow animation with static glow */}
              {/* WHY: Box-shadow animations are expensive and cause layout thrashing */}
              <div
                className={`absolute inset-0 ${
                  matchingDisabled ? "bg-gray-500/20" : "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                } rounded-2xl blur-lg transition-opacity duration-300 ${!matchingDisabled ? "group-hover:opacity-80" : ""}`}
              />
              <div
                className={`relative backdrop-blur-xl rounded-2xl border p-4 sm:p-8 transition-all ${
                  matchingDisabled
                    ? "bg-black/20 border-white/5"
                    : "bg-black/40 border-white/10 hover:border-green-500/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl ${
                        matchingDisabled
                          ? "bg-gray-500/20 border border-gray-500/30"
                          : "bg-gradient-to-br from-green-500 to-emerald-500"
                      }`}
                    >
                      🎲
                    </div>
                    <div className="text-left">
                      <h3 className={`text-lg sm:text-xl font-bold mb-1 ${matchingDisabled ? "text-white/40" : "text-white"}`}>
                        {creating ? "Finding..." : "Random Match"}
                      </h3>
                      <p className={`text-xs sm:text-sm ${matchingDisabled ? "text-white/20" : "text-white/60"}`}>
                        Discover someone new
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 ${matchingDisabled ? "text-white/20" : "text-white/40 group-hover:text-white/80 group-hover:translate-x-1"} transition-all flex-shrink-0`} />
                </div>
              </div>
            </motion.button>

            {selectedCategory !== "fun" && selectedCategory !== "friends" && (
              <motion.button
                whileHover={{ scale: matchingDisabled ? 1 : 1.02, y: matchingDisabled ? 0 : -4 }}
                whileTap={{ scale: matchingDisabled ? 1 : 0.98 }}
                onClick={() => handleMatch("interest")}
                disabled={matchingDisabled}
                className={`relative group ${matchingDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                {/* PERFORMANCE: Replaced box-shadow animation with static glow */}
                {/* WHY: Box-shadow animations are expensive and cause layout thrashing */}
                <div
                  className={`absolute inset-0 ${
                    matchingDisabled ? "bg-gray-500/20" : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
                  } rounded-2xl blur-lg transition-opacity duration-300 ${!matchingDisabled ? "group-hover:opacity-80" : ""}`}
                />
                <div
                  className={`relative backdrop-blur-xl rounded-2xl border p-4 sm:p-8 transition-all ${
                    matchingDisabled
                      ? "bg-black/20 border-white/5"
                      : "bg-black/40 border-white/10 hover:border-cyan-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl ${
                          matchingDisabled
                            ? "bg-gray-500/20 border border-gray-500/30"
                            : "bg-gradient-to-br from-cyan-500 to-blue-500"
                        }`}
                      >
                        💡
                      </div>
                      <div className="text-left">
                        <h3 className={`text-lg sm:text-xl font-bold mb-1 ${matchingDisabled ? "text-white/40" : "text-white"}`}>
                          {creating ? "Finding..." : "Interests Match"}
                        </h3>
                        <p className={`text-xs sm:text-sm ${matchingDisabled ? "text-white/20" : "text-white/60"}`}>
                          Based on shared interests
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 ${matchingDisabled ? "text-white/20" : "text-white/40 group-hover:text-white/80 group-hover:translate-x-1"} transition-all flex-shrink-0`} />
                  </div>
                </div>
              </motion.button>
            )}
          </motion.div>
        )}

        {/* My Chats Section with Dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              {/* Header - Always visible (clickable when chats > 0) */}
              <motion.div
                onClick={() => {
                  if (matches.length > 0) {
                    setIsChatsExpanded(!isChatsExpanded);
                  }
                }}
                className={`p-6 border-b border-white/10 ${
                  matches.length > 0 ? "cursor-pointer hover:bg-white/5" : ""
                } transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-400" />
                      My Chats
                      {matches.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-xs text-pink-400 font-medium">
                          {matches.length}
                        </span>
                      )}
                    </h2>
                  </div>
                  {matches.length > 0 && (
                    <motion.div
                      animate={{ rotate: isChatsExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    </motion.div>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {matches.length === 0
                    ? "No chats yet"
                    : matches.length === 1
                    ? "You have 1 chat"
                    : `${isChatsExpanded ? "Showing all chats" : "Click to see all chats"}`}
                </p>
              </motion.div>

              {/* Chats List - Conditional rendering based on state */}
              <AnimatePresence>
                {loading ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full mx-auto"
                      />
                      <p className="text-white/60 mt-4">Loading chats...</p>
                    </div>
                  </motion.div>
                ) : matches.length === 0 ? (
                  // Fully collapsed when no chats
                  null
                ) : matches.length === 1 ? (
                  // Show 1 chat with collapse option (always visible but collapsible)
                  isChatsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="space-y-3">
                          <ChatCard match={matches[0]} index={0} router={router} />
                        </div>
                      </div>
                    </motion.div>
                  )
                ) : (
                  // Multiple chats: show newest (first) always, rest on expand
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="space-y-3">
                        {/* Always show the first (newest) chat */}
                        <ChatCard match={matches[0]} index={0} router={router} />
                        
                        {/* Show rest only when expanded */}
                        {/* PERFORMANCE: Simplified transitions for better performance */}
                        <AnimatePresence>
                          {isChatsExpanded && matches.slice(1).map((match, index) => (
                            <motion.div
                              key={match.id}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, delay: index * 0.03 }}
                            >
                              <ChatCard match={match} index={index + 1} router={router} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Ad Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <AdBanner placement="dating_page" />
          </div>
        </motion.div>

        {/* Footer Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-white/60 text-sm font-medium">Datings Dashboard</p>
        </motion.div>
      </main>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && candidate && question && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-pink-400" />
                  Send Match Request
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Candidate Profile */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-lg" />
                  <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                        {shouldHidePhoto ? (
                          <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                            Hidden
                          </div>
                        ) : (
                          <Image
                            src={candidate.profile_photo || profilePlaceholder}
                            alt="Match"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-xl text-white mb-2">
                          {shouldHideName ? "Name Hidden" : candidate.full_name}
                        </p>
                        <p className="text-sm text-white/60 mb-3">
                          {candidate.gender} • {candidate.year} • {candidate.branch}
                          {candidate.height && ` • ${candidate.height}`}
                        </p>
                        {candidate.dating_description && (
                          <p className="text-sm text-white/80 italic mb-3">
                            "{candidate.dating_description}"
                          </p>
                        )}
                        {candidate.interests && candidate.interests.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {candidate.interests.map((interest) => (
                              <span
                                key={interest}
                                className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-full text-xs font-medium"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div>
                  <label className="block font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    {question.text}
                  </label>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-white/40 transition-all resize-none"
                    rows={6}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendRequest}
                    disabled={!answer.trim()}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                      !answer.trim()
                        ? "bg-gray-500/20 border border-gray-500/30 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-500/50"
                    }`}
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
        @keyframes pulse-medium {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 20s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 25s ease-in-out infinite;
        }
        .animate-pulse-medium {
          animation: pulse-medium 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function DatingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <DatingPageContent />
    </Suspense>
  );
}