"use client";

import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getMyMatches } from "@/utils/dating";
import { User } from "lucide-react";

type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  match_type: string;
};

type PartnerProfile = {
  id?: string;
  full_name?: string;
  profile_photo?: string | null;
  gender?: string | null;
  branch?: string | null;
  year?: string | null;
  dating_description?: string | null;
  interests?: string[] | null;
};

export default function DatingPage() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completion, setCompletion] = useState<number>(0);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);

  const [showPreReveal, setShowPreReveal] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚫 Show toast + redirect if profile < 50%
  useEffect(() => {
    if (completion > 0 && completion < 50) {
      // show a friendly toaster and redirect after short delay
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

      if (error) {
        // If RLS blocks select or other issue, log and set 0
        console.warn("fetchProfileCompletion error:", error);
        setCompletion(0);
        return;
      }

      if (!profile) {
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
        const key = f as keyof typeof profile;
        const value = profile[key];
        return value !== undefined && value !== null && value !== "";
      }).length;

      const percent = Math.round((filled / fields.length) * 100);
      setCompletion(percent);
    } catch (err) {
      console.error("Error fetching profile completion:", err);
      setCompletion(0);
    }
  }

  async function handleMatch(type: "random" | "interest") {
    // Extra guard: do not allow matching when below completion threshold
    if (completion > 0 && completion < 50) {
      toast.error("Complete at least 50% of your profile before matching 💞");
      router.push("/dating/dating-profiles");
      return;
    }

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const rpcName = type === "random" ? "random_match" : "interest_match";
      const { data, error } = await supabase.rpc(rpcName, { p_user_id: user.id });

      if (error) {
        console.warn("RPC error:", error);
        toast.error("No match found right now. Try again later.");
        return;
      }

      if (!data || data.length === 0) {
        toast("No match found right now. Try again later.");
        return;
      }

      const match = data[0];
const matchId = match.match_id || match.id;

// Store the dating category
await supabase
  .from("dating_matches")
  .update({ dating_category: selectedCategory })
  .eq("id", matchId);

setMatchedId(matchId);

      const partnerData: PartnerProfile = {
        gender: match.gender,
        branch: match.branch,
        year: match.year,
        dating_description: match.dating_description,
        interests: match.interests || [],
      };

      // fetch the dating_matches row to find otherId, then fetch other profile (photo, name)
      try {
        const { data: matchRow, error: matchRowErr } = await supabase
          .from("dating_matches")
          .select("user1_id, user2_id")
          .eq("id", matchId)
          .single();

        if (!matchRowErr && matchRow) {
          const otherId =
            matchRow.user1_id === user.id ? matchRow.user2_id : matchRow.user1_id;

          if (otherId) {
            const { data: otherProfile, error: otherProfileErr } = await supabase
              .from("profiles")
              .select(
                "id, full_name, profile_photo, gender, branch, year, dating_description, interests"
              )
              .eq("id", otherId)
              .maybeSingle();

            if (!otherProfileErr && otherProfile) {
              partnerData.id = otherProfile.id;
              partnerData.full_name = otherProfile.full_name ?? undefined;
              partnerData.profile_photo = otherProfile.profile_photo ?? null;
              partnerData.gender = otherProfile.gender ?? partnerData.gender;
              partnerData.branch = otherProfile.branch ?? partnerData.branch;
              partnerData.year = otherProfile.year ?? partnerData.year;
              partnerData.dating_description =
                otherProfile.dating_description ?? partnerData.dating_description;
              partnerData.interests = otherProfile.interests ?? partnerData.interests;
            } else {
              if (otherProfileErr) console.warn("otherProfileErr:", otherProfileErr);
            }
          }
        } else {
          if (matchRowErr) console.warn("matchRowErr:", matchRowErr);
        }
      } catch (innerErr) {
        console.warn("Error fetching partner profile:", innerErr);
      }

      setPartner(partnerData);
      setShowPreReveal(true);
    } catch (err) {
      console.error("Error creating match:", err);
      toast.error("Something went wrong while finding a match.");
    } finally {
      setCreating(false);
    }
  }

  // determine modal variant mapping (we will render according to your exact rules)
  function getModalVariantForCategory(cat: string) {
    switch (cat) {
      case "serious":
        return "serious"; // pre-reveal, name+photo hidden, rest shown
      case "casual":
        return "casual"; // full reveal
      case "mystery":
        return "mystery"; // if partner female -> show only interests+description+gender, hide name+photo
      case "fun":
        return "fun"; // pre-reveal, name+photo hidden, rest shown (like serious)
      case "friends":
        return "casual"; // friendship = same as casual
      default:
        return "serious";
    }
  }

  const profilePlaceholder = "/images/avatar-placeholder.png";

  // computed disabled state for buttons
  const matchingDisabled = creating || (completion > 0 && completion < 50);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex flex-col">
      <Toaster position="top-center" />

      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 shadow bg-white gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-2xl font-bold text-gray-800">Blind Dating</h1>
          <Link
            href="/dating/dating-profiles"
            className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition shadow ml-4"
            title="Your dating profile"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>

        <div className="w-full sm:w-1/3 mt-2 sm:mt-0">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm font-medium text-gray-700">{completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                completion < 50 ? "bg-red-400" : completion < 80 ? "bg-yellow-400" : "bg-pink-500"
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <label htmlFor="category" className="block text-lg font-semibold text-gray-700 mb-2">
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

          {/* Inline message if profile incomplete */}
          {completion > 0 && completion < 50 && (
            <p className="text-red-500 text-sm mt-2">
              ⚠️ Your profile is only {completion}% complete — finish it first to start matching!
            </p>
          )}
        </div>

        {selectedCategory && (
          <div className="flex flex-col sm:flex-row gap-6 mb-10">
            <button
              onClick={() => handleMatch("random")}
              disabled={matchingDisabled}
              className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
                matchingDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {creating ? "Finding Match..." : "🎲 Random Match"}
            </button>

            {selectedCategory !== "fun" && selectedCategory !== "friends" && (
              <button
                onClick={() => handleMatch("interest")}
                disabled={matchingDisabled}
                className={`flex-1 px-6 py-4 rounded-xl text-white font-semibold shadow-md transition ${
                  matchingDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600"
                }`}
              >
                {creating ? "Finding Match..." : "💡 Interests Match"}
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
                {match.match_type === "random" ? "🎲 Random Match" : "💡 Interest Match"}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal rendering with the requested exact behaviors */}
      {showPreReveal && partner && matchedId && (() => {
        const variant = getModalVariantForCategory(selectedCategory);

        const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-lg w-full">
              {children}
            </div>
          </div>
        );

        // --- Serious (pre-reveal): name hidden, photo hidden, show gender/year/branch/description/interests
        if (variant === "serious") {
          return (
            <ModalWrapper>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">💖 Matched — Get to know them</h2>
                <p className="text-gray-600 mb-4">Name & photo are hidden — here’s what both of you can see:</p>

                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {partner.gender && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">👤 {partner.gender}</span>
                  )}
                  {partner.branch && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">🧠 {partner.branch}</span>
                  )}
                  {partner.year && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🎓 {partner.year}</span>
                  )}
                </div>

                {partner.dating_description && (
                  <p className="text-gray-700 italic mb-4 px-3">“{partner.dating_description}”</p>
                )}

                {partner.interests && partner.interests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {partner.interests.map((i) => (
                      <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowPreReveal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Close</button>
                  <button onClick={() => router.push(`/dating/chat/${matchedId}`)} className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600">Continue to Chat 💬</button>
                </div>
              </div>
            </ModalWrapper>
          );
        }

        // --- Casual (full visual reveal)
        if (variant === "casual") {
          return (
            <ModalWrapper>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">😎 Casual Match!</h2>
                <p className="text-gray-600 mb-4">Here’s who you matched with — feel free to start chatting.</p>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 shadow">
                    <img src={partner.profile_photo || profilePlaceholder} alt={partner.full_name || "Partner"} className="w-full h-full object-cover" />
                  </div>

                  <div className="text-left">
                    {partner.full_name && <p className="font-semibold text-lg">{partner.full_name}</p>}
                    {partner.gender && <p className="text-sm text-gray-600">👤 {partner.gender}</p>}
                    {partner.branch && <p className="text-sm text-gray-600">🧠 {partner.branch}</p>}
                    {partner.year && <p className="text-sm text-gray-600">🎓 {partner.year}</p>}
                    {partner.dating_description && <p className="text-sm italic text-gray-700 mt-2">{partner.dating_description}</p>}
                  </div>
                </div>

                {partner.interests && partner.interests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {partner.interests.map((i) => <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>)}
                  </div>
                )}

                <div className="mt-6 flex gap-3 justify-center">
                  <button onClick={() => setShowPreReveal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Close</button>
                  <button onClick={() => router.push(`/dating/chat/${matchedId}`)} className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600">Continue to Chat 💬</button>
                </div>
              </div>
            </ModalWrapper>
          );
        }

        // --- Mystery mode: if partner is female => show ONLY interests, description, and gender (hide name+photo).
        if (variant === "mystery") {
          const isFemale = partner.gender?.toLowerCase() === "female";
          return (
            <ModalWrapper>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">🌸 Mystery Mode</h2>
                <p className="text-gray-600 mb-4">To prioritize comfort, limited info is shown for women.</p>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 shadow flex items-center justify-center">
                    {isFemale ? <div className="text-gray-500 italic">Photo hidden</div> : <img src={partner.profile_photo || profilePlaceholder} alt={partner.full_name || "Partner"} className="w-full h-full object-cover" />}
                  </div>

                  <div className="text-left">
                    {isFemale ? (
                      <p className="text-gray-500 italic">Name hidden</p>
                    ) : (
                      partner.full_name && <p className="font-semibold text-lg">{partner.full_name}</p>
                    )}

                    {partner.gender && <p className="text-sm text-gray-600">👤 {partner.gender}</p>}
                    {partner.branch && <p className="text-sm text-gray-600">🧠 {partner.branch}</p>}
                    {partner.year && <p className="text-sm text-gray-600">🎓 {partner.year}</p>}
                  </div>
                </div>

                {/* For female: show only interests & description (if present) */}
                {(isFemale && partner.interests && partner.interests.length > 0) && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {partner.interests.map((i) => <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>)}
                  </div>
                )}

                {isFemale && partner.dating_description && (
                  <p className="text-gray-700 italic mt-3 px-3">“{partner.dating_description}”</p>
                )}

                {/* If partner is not female, we already displayed full info above; optionally also show interests */}
                {!isFemale && partner.interests && partner.interests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {partner.interests.map((i) => <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>)}
                  </div>
                )}

                <div className="mt-6 flex gap-3 justify-center">
                  <button onClick={() => setShowPreReveal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Close</button>
                  <button onClick={() => router.push(`/dating/chat/${matchedId}`)} className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600">Continue to Chat 💬</button>
                </div>
              </div>
            </ModalWrapper>
          );
        }

        // --- Fun (pre-reveal similar to serious): name+photo hidden, show rest
        if (variant === "fun") {
          return (
            <ModalWrapper>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">🔥 Fun & Flirty</h2>
                <p className="text-gray-600 mb-4">Name & photo are hidden — here’s some things you can see:</p>

                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {partner.gender && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">👤 {partner.gender}</span>
                  )}
                  {partner.branch && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">🧠 {partner.branch}</span>
                  )}
                  {partner.year && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🎓 {partner.year}</span>
                  )}
                </div>

                {partner.dating_description && (
                  <p className="text-gray-700 italic mb-4 px-3">“{partner.dating_description}”</p>
                )}

                {partner.interests && partner.interests.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {partner.interests.map((i) => (
                      <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowPreReveal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Close</button>
                  <button onClick={() => router.push(`/dating/chat/${matchedId}`)} className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600">Continue to Chat 💬</button>
                </div>
              </div>
            </ModalWrapper>
          );
        }

        // fallback (shouldn't hit): treat as serious
        return (
          <ModalWrapper>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">🎉 You’ve Been Matched!</h2>
              <p className="text-gray-600 mb-4">Here’s what both of you can see:</p>

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {partner.gender && <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">👤 {partner.gender}</span>}
                {partner.branch && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">🧠 {partner.branch}</span>}
                {partner.year && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🎓 {partner.year}</span>}
              </div>

              {partner.dating_description && <p className="text-gray-700 italic mb-4 px-3">“{partner.dating_description}”</p>}
              {partner.interests && partner.interests.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {partner.interests.map((i) => <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{i}</span>)}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowPreReveal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Close</button>
                <button onClick={() => router.push(`/dating/chat/${matchedId}`)} className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600">Continue to Chat 💬</button>
              </div>
            </div>
          </ModalWrapper>
        );
      })()}
    </div>
  );
}
