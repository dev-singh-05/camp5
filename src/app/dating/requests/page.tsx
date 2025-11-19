"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomMatchIcebreakerQuestion } from "@/utils/icebreaker";
// PERFORMANCE: Import useIsMobile to disable animations on mobile
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Heart,
  X,
  Check,
  Mail,
  User,
  MapPin,
  GraduationCap,
  Ruler,
  Sparkles,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";

type Request = {
  id: string;
  requester_id: string;
  candidate_id: string;
  category: string;
  match_type: string;
  answer: string;
  question_text: string;
  status: string;
  created_at: string;
  requester?: {
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
};

export default function RequestsPage() {
  const router = useRouter();
  // PERFORMANCE: Detect mobile to disable expensive animations
  const isMobile = useIsMobile();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch requests where current user is the candidate
      const { data, error } = await supabase
        .from("dating_requests")
        .select("*")
        .eq("candidate_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch requests error:", error);
        return;
      }

      // Fetch requester profiles
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo, gender, branch, year, height, dating_description, interests")
            .eq("id", req.requester_id)
            .single();

          return { ...req, requester: profile || undefined };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId: string, requesterId: string, matchType: string, category: string) {
    setResponding(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get a random icebreaker question for this match
      const icebreakerQuestion = await getRandomMatchIcebreakerQuestion();

      // Create the match
      const { data: newMatch, error: matchErr } = await supabase
        .from("dating_matches")
        .insert([
          {
            user1_id: requesterId,
            user2_id: user.id,
            match_type: matchType,
            dating_category: category,
            icebreaker_question_id: icebreakerQuestion?.id || null,
          },
        ])
        .select()
        .single();

      if (matchErr) {
        console.error("Match creation error:", matchErr);
        toast.error("Failed to create match.");
        return;
      }

      // Update request status
      const { error: updateErr } = await supabase
        .from("dating_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateErr) {
        console.error("Update request error:", updateErr);
      }

      toast.success("Match created! Opening chat...");
      
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      // Navigate to chat
      setTimeout(() => {
        router.push(`/dating/chat/${newMatch.id}`);
      }, 1000);
    } catch (err) {
      console.error("Accept error:", err);
      toast.error("Something went wrong.");
    } finally {
      setResponding(null);
    }
  }

  async function handleDecline(requestId: string) {
    setResponding(requestId);
    try {
      const { error } = await supabase
        .from("dating_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) {
        console.error("Decline error:", error);
        toast.error("Failed to decline request.");
        return;
      }

      toast("Request declined.");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Something went wrong.");
    } finally {
      setResponding(null);
    }
  }

  const profilePlaceholder = "/images/avatar-placeholder.png";

  // Determine what to hide based on category
  function shouldHidePhoto(category: string) {
    return category === "serious" || category === "fun";
  }

  function shouldHideName(category: string, gender?: string | null) {
    return category === "serious" || category === "fun" || 
      (category === "mystery" && gender?.toLowerCase() === "female");
  }

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "serious": return "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400";
      case "casual": return "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400";
      case "mystery": return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
      case "fun": return "from-orange-500/20 to-yellow-500/20 border-orange-500/30 text-orange-400";
      case "friends": return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
      default: return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "serious": return "💖";
      case "casual": return "😎";
      case "mystery": return "🌸";
      case "fun": return "🔥";
      case "friends": return "🫶";
      default: return "❤️";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-950 text-white overflow-x-hidden">
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
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </motion.button>

            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-white via-pink-200 to-rose-200 bg-clip-text text-transparent flex items-center gap-2"
            >
              <Mail className="w-6 h-6 text-pink-400" />
              Match Requests
            </motion.h1>

            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
              <Mail className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
              <p className="text-white/60">You don't have any match requests right now.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-500/50 transition-all"
              >
                Go Back
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {requests.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                className="relative group"
              >
                {/* PERFORMANCE: Replaced pulsing box-shadow with static glow */}
                {/* WHY: Box-shadow animations cause expensive repaints */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl blur-xl transition-opacity duration-300 group-hover:opacity-80" />
                <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                  {/* Category Badge - Top Right */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gradient-to-r ${getCategoryColor(req.category)} border font-medium`}>
                      {getCategoryIcon(req.category)} {req.category}
                    </span>
                  </div>

                  <div className="p-6">
                    {/* Requester Profile */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-500/30 bg-white/5">
                          {shouldHidePhoto(req.category) ? (
                            <div className="w-full h-full flex items-center justify-center text-white/40">
                              <User className="w-8 h-8" />
                            </div>
                          ) : (
                            <img
                              src={req.requester?.profile_photo || profilePlaceholder}
                              alt="Requester"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 border-2 border-slate-900 flex items-center justify-center text-lg">
                          {req.match_type === "random" ? "🎲" : "💡"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {shouldHideName(req.category, req.requester?.gender)
                            ? "Name Hidden"
                            : req.requester?.full_name || "Anonymous"}
                        </h3>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-white/60 mb-3">
                          {req.requester?.gender && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {req.requester.gender}
                            </span>
                          )}
                          {req.requester?.year && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-4 h-4" />
                              {req.requester.year}
                            </span>
                          )}
                          {req.requester?.branch && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {req.requester.branch}
                            </span>
                          )}
                          {req.requester?.height && (
                            <span className="flex items-center gap-1">
                              <Ruler className="w-4 h-4" />
                              {req.requester.height}
                            </span>
                          )}
                        </div>

                        {req.requester?.dating_description && (
                          <p className="text-sm text-white/80 italic mb-3 line-clamp-2">
                            "{req.requester.dating_description}"
                          </p>
                        )}

                        {req.requester?.interests && req.requester.interests.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {req.requester.interests.slice(0, 5).map((interest) => (
                              <span
                                key={interest}
                                className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-full text-xs font-medium"
                              >
                                {interest}
                              </span>
                            ))}
                            {req.requester.interests.length > 5 && (
                              <span className="px-2 py-1 bg-white/5 border border-white/10 text-white/60 rounded-full text-xs font-medium">
                                +{req.requester.interests.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question & Answer Section */}
                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl blur" />
                        <div className="relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <MessageCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-white mb-2">{req.question_text}</p>
                              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <p className="text-white/80 text-sm">{req.answer}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDecline(req.id)}
                        disabled={responding === req.id}
                        className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/50 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        {responding === req.id ? "Declining..." : "Decline"}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAccept(req.id, req.requester_id, req.match_type, req.category)}
                        disabled={responding === req.id}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-500/50 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Heart className="w-4 h-4" />
                        {responding === req.id ? "Accepting..." : "Let's Match"}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

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