import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronDown, ChevronRight, X } from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import { getMyMatches } from "../../utils/dating";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import DatingVerificationModal from "../../components/DatingVerificationModal";

type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  match_type: string;
  created_at: string;
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
};

type VerificationStatus = {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  rejection_reason?: string;
};

export default function Dating() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [completion, setCompletion] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [acceptedMatchesCount, setAcceptedMatchesCount] = useState<number>(0);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: "not_submitted",
  });
  const [creating, setCreating] = useState(false);
  const [isChatsExpanded, setIsChatsExpanded] = useState(false);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [candidate, setCandidate] = useState<Profile | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingMatchType, setPendingMatchType] = useState<"random" | "interest">("random");

  // Testing mode
  const [testingMode, setTestingMode] = useState(false);

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/(auth)/login");
        return;
      }

      setUser(user);

      // Check verification status
      await checkVerificationStatus(user.id);

      // Fetch matches
      const matchesData = await getMyMatches();
      setMatches(matchesData || []);

      // Fetch profile completion
      await fetchProfileCompletion(user.id);

      setLoading(false);
    } catch (error) {
      console.error("Error loading dating data:", error);
      setLoading(false);
    }
  }

  async function checkVerificationStatus(userId: string) {
    try {
      // Get user's accepted matches count for progressive unlocking
      const { data: profileData } = await supabase
        .from("profiles")
        .select("dating_accepted_matches_count")
        .eq("id", userId)
        .single();

      const matchCount = profileData?.dating_accepted_matches_count || 0;
      setAcceptedMatchesCount(matchCount);

      const { data: verification, error } = await supabase
        .from("dating_verifications")
        .select("status, rejection_reason")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.error("Verification check error:", error);
        return;
      }

      if (!verification) {
        setVerificationStatus({ status: "not_submitted" });
      } else {
        setVerificationStatus({
          status: verification.status as "pending" | "approved" | "rejected",
          rejection_reason: verification.rejection_reason,
        });
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    }
  }

  async function fetchProfileCompletion(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "age, work, education, branch, gender, location, hometown, height, exercise, drinking, smoking, kids, religion, year, profile_photo"
        )
        .eq("id", userId)
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
  }

  async function handleMatch(type: "random" | "interest") {
    // Progressive unlock: Allow first 2 matches without verification
    const needsVerification = acceptedMatchesCount >= 2;

    // Check verification status after 2 matches
    if (needsVerification && verificationStatus.status !== "approved") {
      Toast.show({
        type: "error",
        text1: "Verification Required",
        text2: "Please complete verification to continue matching",
      });
      // Show verification modal
      setShowVerificationModal(true);
      return;
    }

    // For first 2 matches, only require photo and interests (basic fields)
    // After 2 matches, require 50% profile completion
    const minCompletionRequired = acceptedMatchesCount >= 2 ? 50 : 0;

    if (completion > 0 && completion < minCompletionRequired) {
      Toast.show({
        type: "error",
        text1: "Profile Incomplete",
        text2: "Complete at least 50% of your profile before matching",
      });
      router.push("/dating/dating-profiles");
      return;
    }

    setCreating(true);
    setPendingMatchType(type);

    try {
      if (!user) return;

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

      // Build exclusion set
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
      }

      // Fetch candidates
      let candidateQuery = supabase
        .from("profiles")
        .select(
          "id, full_name, profile_photo, gender, branch, year, height, dating_description, interests"
        )
        .eq("dating_verified", true)
        .neq("id", user.id);

      // Apply gender filter
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

      const { data: allCandidates, error: candidateErr } = await candidateQuery;

      if (candidateErr) {
        console.error("Candidate fetch error:", candidateErr);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Error finding matches. Try again.",
        });
        return;
      }

      // Filter out excluded IDs
      const candidates = (allCandidates || []).filter((c: any) => !excludedIds.has(c.id));

      if (candidates.length === 0) {
        Toast.show({
          type: "info",
          text1: "No Matches",
          text2: "No matches found right now. Try again later!",
        });
        return;
      }

      // Pick random candidate
      const selectedCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      setCandidate(selectedCandidate);

      // Fetch a random icebreaker question
      const { data: icebreakerQuestions } = await supabase
        .from("icebreaker_questions")
        .select("*")
        .eq("is_active", true)
        .in("usage_type", ["match_dating", "both"]);

      if (icebreakerQuestions && icebreakerQuestions.length > 0) {
        const randomQuestion =
          icebreakerQuestions[Math.floor(Math.random() * icebreakerQuestions.length)];
        setQuestion({ id: randomQuestion.id, text: randomQuestion.question });
      } else {
        setQuestion({ id: "default", text: "Why do you think we'd be a good match?" });
      }

      setAnswer("");
      setShowRequestModal(true);
    } catch (err) {
      console.error("Error finding match:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function sendRequest() {
    if (!candidate || !question || !answer.trim()) {
      Toast.show({
        type: "error",
        text1: "Required",
        text2: "Please answer the question before sending.",
      });
      return;
    }

    try {
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
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to send request. Try again.",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Request sent! Waiting for response.",
      });
      setShowRequestModal(false);
      setCandidate(null);
      setQuestion(null);
      setAnswer("");
    } catch (err) {
      console.error("Send request error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to send request.",
      });
    }
  }

  async function clearMyDatingData() {
    try {
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

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "All dating data cleared!",
      });
      loadData();
    } catch (err) {
      console.error("Clear data error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to clear data.",
      });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Progressive unlock: Allow first 2 matches without verification
  const needsVerification = acceptedMatchesCount >= 2;
  const minCompletionRequired = acceptedMatchesCount >= 2 ? 50 : 0;

  const matchingDisabled =
    creating ||
    (completion > 0 && completion < minCompletionRequired) ||
    (needsVerification && verificationStatus.status !== "approved");

  const shouldHidePhoto = selectedCategory === "serious" || selectedCategory === "fun";
  const shouldHideName =
    selectedCategory === "serious" ||
    selectedCategory === "fun" ||
    (selectedCategory === "mystery" && candidate?.gender?.toLowerCase() === "female");

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show verification pending screen (only after 2 matches)
  if (verificationStatus.status === "pending" && acceptedMatchesCount >= 2) {
    return (
      <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>⏳</Text>
            <Text style={styles.statusTitle}>Verification Pending</Text>
            <Text style={styles.statusText}>
              Your verification is being reviewed by our admin team. This usually takes 24-48
              hours.
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Show verification not submitted screen (only after 2 matches)
  if (verificationStatus.status === "not_submitted" && acceptedMatchesCount >= 2) {
    return (
      <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>📸</Text>
            <Text style={styles.statusTitle}>Verification Required</Text>
            <Text style={styles.statusText}>
              Please complete your dating verification to continue matching.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowVerificationModal(true)}
            >
              <Text style={styles.primaryButtonText}>Submit Verification</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DatingVerificationModal
          visible={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={() => {
            setShowVerificationModal(false);
            loadData();
          }}
        />
      </LinearGradient>
    );
  }

  // Show verification rejected screen (only after 2 matches)
  if (verificationStatus.status === "rejected" && acceptedMatchesCount >= 2) {
    return (
      <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>❌</Text>
            <Text style={styles.statusTitle}>Verification Rejected</Text>
            <Text style={styles.statusText}>
              Unfortunately, your verification was not approved.
            </Text>
            {verificationStatus.rejection_reason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionLabel}>Reason:</Text>
                <Text style={styles.rejectionText}>{verificationStatus.rejection_reason}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowVerificationModal(true)}
            >
              <Text style={styles.primaryButtonText}>Submit New Verification</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DatingVerificationModal
          visible={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={() => {
            setShowVerificationModal(false);
            loadData();
          }}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/dashboard")}
            >
              <ChevronLeft color="#fff" size={24} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestsButton}
              onPress={() => router.push("/dating/requests")}
            >
              <Text style={styles.requestsText}>📨 Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/dating/dating-profiles")}
            >
              <Text style={styles.profileText}>👤 Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Completion */}
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Profile Completion</Text>
              <Text style={styles.completionPercent}>{completion}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${completion}%`,
                    backgroundColor:
                      completion < 50 ? "#ef4444" : completion < 80 ? "#f59e0b" : "#ec4899",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>✨ What are you looking for?</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
              style={styles.picker}
              dropdownIconColor="#ec4899"
            >
              <Picker.Item label="✨ Select a category" value="" />
              <Picker.Item label="💖 Serious Dating" value="serious" />
              <Picker.Item label="😎 Casual Dating" value="casual" />
              <Picker.Item label="🌸 Mystery Mode (Women First)" value="mystery" />
              <Picker.Item label="🔥 For Fun & Flirty" value="fun" />
              <Picker.Item label="🫶 Friendship" value="friends" />
            </Picker>
          </View>

          {!selectedCategory && (
            <Text style={styles.helperText}>💕 Choose what you're looking for to get started</Text>
          )}

          {selectedCategory && (
            <View style={styles.selectedCategoryBox}>
              <Text style={styles.selectedCategoryText}>
                ✨ Great choice! Now find your match below
              </Text>
            </View>
          )}

          {completion > 0 && completion < 50 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Your profile is only {completion}% complete — finish it first!
              </Text>
            </View>
          )}
        </View>

        {/* Match Buttons */}
        {selectedCategory && (
          <View style={styles.matchButtonsContainer}>
            <TouchableOpacity
              style={[styles.matchButton, matchingDisabled && styles.matchButtonDisabled]}
              onPress={() => handleMatch("random")}
              disabled={matchingDisabled}
            >
              <Text style={styles.matchButtonIcon}>🎲</Text>
              <Text
                style={[styles.matchButtonTitle, matchingDisabled && styles.matchButtonTextDisabled]}
              >
                {creating ? "Finding..." : "Random Match"}
              </Text>
              <Text
                style={[
                  styles.matchButtonDescription,
                  matchingDisabled && styles.matchButtonTextDisabled,
                ]}
              >
                Discover someone new
              </Text>
            </TouchableOpacity>

            {selectedCategory !== "fun" && selectedCategory !== "friends" && (
              <TouchableOpacity
                style={[styles.matchButton, matchingDisabled && styles.matchButtonDisabled]}
                onPress={() => handleMatch("interest")}
                disabled={matchingDisabled}
              >
                <Text style={styles.matchButtonIcon}>💡</Text>
                <Text
                  style={[
                    styles.matchButtonTitle,
                    matchingDisabled && styles.matchButtonTextDisabled,
                  ]}
                >
                  {creating ? "Finding..." : "Interests Match"}
                </Text>
                <Text
                  style={[
                    styles.matchButtonDescription,
                    matchingDisabled && styles.matchButtonTextDisabled,
                  ]}
                >
                  Based on shared interests
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* My Chats */}
        <View style={styles.chatsSection}>
          <TouchableOpacity
            style={styles.chatsHeader}
            onPress={() => {
              if (matches.length > 0) {
                setIsChatsExpanded(!isChatsExpanded);
              }
            }}
            disabled={matches.length === 0}
          >
            <View style={styles.chatsHeaderLeft}>
              <Text style={styles.chatsTitle}>👥 My Chats</Text>
              {matches.length > 0 && (
                <View style={styles.chatsBadge}>
                  <Text style={styles.chatsBadgeText}>{matches.length}</Text>
                </View>
              )}
            </View>
            {matches.length > 0 && (
              <ChevronDown
                color="#fff"
                size={20}
                style={{
                  transform: [{ rotate: isChatsExpanded ? "180deg" : "0deg" }],
                }}
              />
            )}
          </TouchableOpacity>

          <Text style={styles.chatsSubtitle}>
            {matches.length === 0
              ? "No chats yet"
              : matches.length === 1
              ? "You have 1 chat"
              : `${isChatsExpanded ? "Showing all chats" : "Click to see all chats"}`}
          </Text>

          {matches.length > 0 && isChatsExpanded && (
            <View style={styles.chatsList}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.chatCard}
                  onPress={() => router.push(`/dating/chat/${match.id}`)}
                >
                  <View style={styles.chatIconContainer}>
                    <Text style={styles.chatIcon}>
                      {match.match_type === "random" ? "🎲" : "💡"}
                    </Text>
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatType}>
                      {match.match_type === "random" ? "Random Match" : "Interest Match"}
                    </Text>
                    <Text style={styles.chatSubtext}>Click to open chat</Text>
                  </View>
                  <ChevronRight color="rgba(255,255,255,0.4)" size={20} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Match Request</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Candidate Profile */}
              {candidate && (
                <View style={styles.candidateCard}>
                  <View style={styles.candidateImageContainer}>
                    {shouldHidePhoto ? (
                      <View style={styles.hiddenImage}>
                        <Text style={styles.hiddenImageText}>Hidden</Text>
                      </View>
                    ) : (
                      <Image
                        source={{
                          uri: candidate.profile_photo || "https://via.placeholder.com/100",
                        }}
                        style={styles.candidateImage}
                      />
                    )}
                  </View>
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>
                      {shouldHideName ? "Name Hidden" : candidate.full_name}
                    </Text>
                    <Text style={styles.candidateDetails}>
                      {candidate.gender} • {candidate.year} • {candidate.branch}
                      {candidate.height && ` • ${candidate.height}`}
                    </Text>
                    {candidate.dating_description && (
                      <Text style={styles.candidateDescription}>
                        "{candidate.dating_description}"
                      </Text>
                    )}
                    {candidate.interests && candidate.interests.length > 0 && (
                      <View style={styles.interestsContainer}>
                        {candidate.interests.slice(0, 3).map((interest, index) => (
                          <View key={index} style={styles.interestTag}>
                            <Text style={styles.interestText}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Question */}
              {question && (
                <View style={styles.questionSection}>
                  <Text style={styles.questionLabel}>⚡ {question.text}</Text>
                  <TextInput
                    style={styles.answerInput}
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder="Type your answer..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRequestModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, !answer.trim() && styles.sendButtonDisabled]}
                  onPress={sendRequest}
                  disabled={!answer.trim()}
                >
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  statusCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 20,
  },
  rejectionBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  rejectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fca5a5",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: "#fecaca",
  },
  primaryButton: {
    backgroundColor: "#ec4899",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  backText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  requestsButton: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  requestsText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  profileButton: {
    backgroundColor: "#ec4899",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  profileText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  completionCard: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  completionPercent: {
    fontSize: 14,
    color: "#ec4899",
    fontWeight: "bold",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  categorySection: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    padding: 20,
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.5)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  picker: {
    color: "white",
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 8,
  },
  selectedCategoryBox: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(236, 72, 153, 0.4)",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  selectedCategoryText: {
    fontSize: 16,
    color: "#fbb6ce",
    fontWeight: "600",
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.5)",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  warningText: {
    fontSize: 16,
    color: "#fca5a5",
    fontWeight: "bold",
    textAlign: "center",
  },
  matchButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  matchButton: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    alignItems: "center",
  },
  matchButtonDisabled: {
    opacity: 0.5,
  },
  matchButtonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  matchButtonTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
    textAlign: "center",
  },
  matchButtonDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  matchButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  chatsSection: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 20,
  },
  chatsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  chatsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  chatsBadge: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  chatsBadgeText: {
    fontSize: 12,
    color: "#ec4899",
    fontWeight: "600",
  },
  chatsSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chatsList: {
    padding: 16,
    gap: 12,
  },
  chatCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatIcon: {
    fontSize: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatType: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  chatSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    padding: 20,
  },
  candidateCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    marginBottom: 20,
  },
  candidateImageContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  candidateImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(236, 72, 153, 0.3)",
  },
  hiddenImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenImageText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  candidateInfo: {
    alignItems: "center",
  },
  candidateName: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  candidateDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  candidateDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  interestTag: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    fontSize: 12,
    color: "#ec4899",
    fontWeight: "500",
  },
  questionSection: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  answerInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 14,
    minHeight: 120,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sendButton: {
    flex: 1,
    backgroundColor: "#ec4899",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
