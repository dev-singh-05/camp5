"use client";

import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getMyMatches } from "@/utils/dating";
import { User } from "lucide-react";
import AdBanner from "@/components/ads";

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

export default function DatingPage() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completion, setCompletion] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [userGender, setUserGender] = useState<string | null>(null);

  // 🧪 TESTING MODE - Controlled by environment variable
  const ENABLE_TESTING_MODE = process.env.NEXT_PUBLIC_ENABLE_DATING_TEST === "true";
  const [testingMode, setTestingMode] = useState(false);

  // Request flow state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [candidate, setCandidate] = useState<Profile | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingMatchType, setPendingMatchType] = useState<"random" | "interest">("random");

  async function fetchMatches() {
    try {
      const data = await getMyMatches();
      setMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
    fetchProfileCompletion();
    fetchUserGender();
  }, []);

  useEffect(() => {
    if (completion > 0 && completion < 50) {
      toast.error("Please complete at least 50% of your profile before matching 💞", {
        duration: 2500,
      });
      const t = setTimeout(() => {
        router.push("/dating/dating-profiles");
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [completion, router]);

  async function fetchProfileCompletion() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("age, work, education, branch, gender, location, hometown, height, exercise, drinking, smoking, kids, religion, year, profile_photo")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setCompletion(0);
        return;
      }

      const fields = ["age", "work", "education", "branch", "gender", "location", "hometown", "height", "exercise", "drinking", "smoking", "kids", "religion", "year", "profile_photo"];
      const filled = fields.filter((f) => {
        const value = profile[f as keyof typeof profile];
        return value !== undefined && value !== null && value !== "";
      }).length;

      setCompletion(Math.round((filled / fields.length) * 100));
    } catch (err) {
      console.error("Error fetching profile completion:", err);
      setCompletion(0);
    }
  }

  async function fetchUserGender() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
  }

  async function handleMatch(type: "random" | "interest") {
    if (completion > 0 && completion < 50) {
      toast.error("Complete at least 50% of your profile before matching 💞");
      router.push("/dating/dating-profiles");
      return;
    }

    setCreating(true);
    setPendingMatchType(type);

    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      // 🧪 Build exclusion set - ONLY if NOT in testing mode
      const excludedIds = new Set<string>([user.id]);
      
      if (!testingMode) {
        // Find existing matches and pending requests to exclude
        const { data: existingMatches } = await supabase
          .from("dating_matches")
          .select("user1_id, user2_id")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        const { data: existingRequests } = await supabase
          .from("dating_requests")
          .select("requester_id, candidate_id")
          .or(`requester_id.eq.${user.id},candidate_id.eq.${user.id}`);

        // ✅ Only exclude the OTHER person in each match/request
        (existingMatches || []).forEach((m) => {
          if (m.user1_id === user.id) {
            excludedIds.add(m.user2_id);
          } else {
            excludedIds.add(m.user1_id);
          }
        });

        (existingRequests || []).forEach((r) => {
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

      // ✅ BUILD QUERY - fetch ALL candidates first
      let candidateQuery = supabase
        .from("profiles")
        .select("id, full_name, profile_photo, gender, branch, year, height, dating_description, interests");

      // Apply gender filter
      if (oppositeGender) {
        candidateQuery = candidateQuery.eq("gender", oppositeGender);
      }

      // Apply interest filter for interest-based matching
      if (type === "interest" && myProfile?.interests && myProfile.interests.length > 0) {
        candidateQuery = candidateQuery.overlaps("interests", myProfile.interests);
      }

      const { data: allCandidates, error: candidateErr } = await candidateQuery;

      if (candidateErr) {
        console.error("Candidate fetch error:", candidateErr);
        toast.error("Error finding matches. Try again.");
        return;
      }

      // ✅ FILTER OUT EXCLUDED IDs IN JAVASCRIPT (not SQL)
      const candidates = (allCandidates || []).filter(
        (c) => !excludedIds.has(c.id)
      );

      console.log("Total candidates after filtering:", candidates.length);

      if (candidates.length === 0) {
        toast("No matches found right now. Try again later!");
        return;
      }

      // Pick random candidate
      const selectedCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      console.log("Selected candidate:", selectedCandidate.full_name);
      setCandidate(selectedCandidate);

      // Fetch a random question
      let questionQuery = supabase
        .from("dating_questions")
        .select("*")
        .eq("active", true);

      if (selectedCategory) {
        questionQuery = questionQuery.or(`category.is.null,category.eq.${selectedCategory}`);
      } else {
        questionQuery = questionQuery.is("category", null);
      }

      const { data: questions } = await questionQuery;

      if (questions && questions.length > 0) {
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        setQuestion(randomQuestion);
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

  async function sendRequest() {
    if (!candidate || !question || !answer.trim()) {
      toast.error("Please answer the question before sending.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  // 🧪 Clear all your dating data for testing
  async function clearMyDatingData() {
    if (!confirm("⚠️ This will delete ALL your matches, chats, reveals, and requests. Continue?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all match IDs for this user
      const { data: myMatches } = await supabase
        .from("dating_matches")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchIds = (myMatches || []).map(m => m.id);

      // Delete in order due to foreign keys
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

  const profilePlaceholder = "/images/avatar-placeholder.png";
  const matchingDisabled = creating || (completion > 0 && completion < 50);

  const shouldHidePhoto = selectedCategory === "serious" || selectedCategory === "fun";
  const shouldHideName =
    selectedCategory === "serious" ||
    selectedCategory === "fun" ||
    (selectedCategory === "mystery" && candidate?.gender?.toLowerCase() === "female");

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex flex-col">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 shadow bg-white gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Blind Dating</h1>
          <div className="flex gap-2">
            <Link
              href="/dating/requests"
              className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium"
            >
              📨 Requests
            </Link>
            <Link
              href="/dating/dating-profiles"
              className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition shadow"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="w-full sm:w-1/3 mt-2 sm:mt-0">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm font-medium text-gray-700">{completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                completion < 50
                  ? "bg-red-400"
                  : completion < 80
                  ? "bg-yellow-400"
                  : "bg-pink-500"
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </header>

      {/* 🧪 TESTING MODE CONTROLS - Only visible in development */}
      {ENABLE_TESTING_MODE && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testingMode}
                  onChange={(e) => setTestingMode(e.target.checked)}
                  className="w-4 h-4 text-pink-500 rounded focus:ring-pink-400"
                />
                <span className="text-sm font-medium text-gray-700">
                  🧪 Testing Mode (Allow re-matching)
                </span>
              </label>
            </div>
            <button
              onClick={clearMyDatingData}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
            >
              🗑️ Clear All My Dating Data
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <label
            htmlFor="category"
            className="block text-lg font-semibold text-gray-700 mb-2"
          >
            What are you looking for?
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-pink-400 focus:outline-none bg-white"
          >
            <option value="">Select a category</option>
            <option value="serious">💖 Serious Dating</option>
            <option value="casual">😎 Casual Dating</option>
            <option value="mystery">🌸 Mystery Mode (Women First)</option>
            <option value="fun">🔥 For Fun & Flirty</option>
            <option value="friends">🫶 Friendship</option>
          </select>

          {completion > 0 && completion < 50 && (
            <p className="text-red-500 text-sm mt-2">
              ⚠️ Your profile is only {completion}% complete — finish it first!
            </p>
          )}
        </div>

        {selectedCategory && (
          <div className="flex flex-col sm:flex-row gap-6 mb-10">
            <button
              onClick={() => handleMatch("random")}
              disabled={matchingDisabled}
              className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
                matchingDisabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {creating ? "Finding..." : "🎲 Random Match"}
            </button>

            {selectedCategory !== "fun" && selectedCategory !== "friends" && (
              <button
                onClick={() => handleMatch("interest")}
                disabled={matchingDisabled}
                className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
                  matchingDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-600"
                }`}
              >
                {creating ? "Finding..." : "💡 Interests Match"}
              </button>
            )}
          </div>
        )}

        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Connections</h2>
        {loading ? (
          <p className="text-gray-600">Loading chats...</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-600">No connections yet. Start matching!</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                onClick={() => router.push(`/dating/chat/${match.id}`)}
                className="h-14 rounded-xl shadow bg-pink-400 hover:bg-pink-500 transition cursor-pointer flex items-center px-6 text-white font-medium"
              >
                {match.match_type === "random"
                  ? "🎲 Random Match"
                  : "💡 Interest Match"}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Request Modal */}
      {showRequestModal && candidate && question && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Send Match Request
            </h2>

            {/* Candidate Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-4 mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {shouldHidePhoto ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      Hidden
                    </div>
                  ) : (
                    <img
                      src={candidate.profile_photo || profilePlaceholder}
                      alt="Match"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {shouldHideName ? "Name Hidden" : candidate.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {candidate.gender} • {candidate.year} • {candidate.branch}
                    {candidate.height && ` • ${candidate.height}`}
                  </p>
                </div>
              </div>

              {candidate.dating_description && (
                <p className="text-sm text-gray-700 italic mb-2">
                  "{candidate.dating_description}"
                </p>
              )}

              {candidate.interests && candidate.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {candidate.interests.map((i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Question & Answer */}
            <div className="mb-6">
              <label className="block font-semibold text-gray-700 mb-2">
                {question.text}
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendRequest}
                disabled={!answer.trim()}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  !answer.trim()
                    ? "bg-gray-400"
                    : "bg-pink-500 hover:bg-pink-600"
                }`}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
      <AdBanner placement="dating_page" />
    </div>
  );
}