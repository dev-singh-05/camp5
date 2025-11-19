import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Heart, X } from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

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

export default function DatingRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/(auth)/login");
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
            .select(
              "id, full_name, profile_photo, gender, branch, year, height, dating_description, interests"
            )
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

  async function handleAccept(
    requestId: string,
    requesterId: string,
    matchType: string,
    category: string
  ) {
    setResponding(requestId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get a random icebreaker question for this match
      const { data: icebreakerQuestions } = await supabase
        .from("icebreaker_questions")
        .select("*")
        .eq("is_active", true)
        .in("usage_type", ["match_dating", "both"]);

      let icebreakerQuestionId = null;
      if (icebreakerQuestions && icebreakerQuestions.length > 0) {
        const randomQuestion =
          icebreakerQuestions[Math.floor(Math.random() * icebreakerQuestions.length)];
        icebreakerQuestionId = randomQuestion.id;
      }

      // Create the match
      const { data: newMatch, error: matchErr } = await supabase
        .from("dating_matches")
        .insert([
          {
            user1_id: requesterId,
            user2_id: user.id,
            match_type: matchType,
            dating_category: category,
            icebreaker_question_id: icebreakerQuestionId,
          },
        ])
        .select()
        .single();

      if (matchErr) {
        console.error("Match creation error:", matchErr);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to create match.",
        });
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

      Toast.show({
        type: "success",
        text1: "Match Created!",
        text2: "Opening chat...",
      });

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      // Navigate to chat
      setTimeout(() => {
        router.push(`/dating/chat/${newMatch.id}`);
      }, 1000);
    } catch (err) {
      console.error("Accept error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong.",
      });
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
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to decline request.",
        });
        return;
      }

      Toast.show({
        type: "info",
        text1: "Request Declined",
        text2: "Request has been declined.",
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Decline error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong.",
      });
    } finally {
      setResponding(null);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }

  function shouldHidePhoto(category: string) {
    return category === "serious" || category === "fun";
  }

  function shouldHideName(category: string, gender?: string | null) {
    return (
      category === "serious" ||
      category === "fun" ||
      (category === "mystery" && gender?.toLowerCase() === "female")
    );
  }

  function getCategoryColor(cat: string) {
    switch (cat.toLowerCase()) {
      case "serious":
        return "#ef4444";
      case "casual":
        return "#3b82f6";
      case "mystery":
        return "#a855f7";
      case "fun":
        return "#f97316";
      case "friends":
        return "#10b981";
      default:
        return "#6b7280";
    }
  }

  function getCategoryIcon(cat: string) {
    switch (cat.toLowerCase()) {
      case "serious":
        return "💖";
      case "casual":
        return "😎";
      case "mystery":
        return "🌸";
      case "fun":
        return "🔥";
      case "friends":
        return "🫶";
      default:
        return "❤️";
    }
  }

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

  return (
    <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📨 Match Requests</Text>
        </View>

        {/* Requests List */}
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>You don't have any match requests right now.</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                {/* Category Badge */}
                <View style={styles.categoryBadgeContainer}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(req.category) + "33" },
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {getCategoryIcon(req.category)} {req.category}
                    </Text>
                  </View>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                  <View style={styles.profileImageContainer}>
                    {shouldHidePhoto(req.category) ? (
                      <View style={styles.hiddenImage}>
                        <Text style={styles.hiddenImageText}>Hidden</Text>
                      </View>
                    ) : (
                      <Image
                        source={{
                          uri:
                            req.requester?.profile_photo || "https://via.placeholder.com/100",
                        }}
                        style={styles.profileImage}
                      />
                    )}
                    <View style={styles.matchTypeBadge}>
                      <Text style={styles.matchTypeIcon}>
                        {req.match_type === "random" ? "🎲" : "💡"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                      {shouldHideName(req.category, req.requester?.gender)
                        ? "Name Hidden"
                        : req.requester?.full_name || "Anonymous"}
                    </Text>
                    <Text style={styles.profileDetails}>
                      {req.requester?.gender} • {req.requester?.year} • {req.requester?.branch}
                      {req.requester?.height && ` • ${req.requester.height}`}
                    </Text>
                    {req.requester?.dating_description && (
                      <Text style={styles.profileDescription} numberOfLines={2}>
                        "{req.requester.dating_description}"
                      </Text>
                    )}
                    {req.requester?.interests && req.requester.interests.length > 0 && (
                      <View style={styles.interestsContainer}>
                        {req.requester.interests.slice(0, 3).map((interest, index) => (
                          <View key={index} style={styles.interestTag}>
                            <Text style={styles.interestText}>{interest}</Text>
                          </View>
                        ))}
                        {req.requester.interests.length > 3 && (
                          <Text style={styles.moreInterests}>
                            +{req.requester.interests.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Question & Answer */}
                <View style={styles.questionSection}>
                  <Text style={styles.questionLabel}>💬 {req.question_text}</Text>
                  <View style={styles.answerBox}>
                    <Text style={styles.answerText}>{req.answer}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.declineButton,
                      responding === req.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleDecline(req.id)}
                    disabled={responding === req.id}
                  >
                    <X color="#fff" size={20} />
                    <Text style={styles.actionButtonText}>
                      {responding === req.id ? "Declining..." : "Decline"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.acceptButton,
                      responding === req.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleAccept(req.id, req.requester_id, req.match_type, req.category)
                    }
                    disabled={responding === req.id}
                  >
                    <Heart color="#fff" size={20} />
                    <Text style={styles.actionButtonText}>
                      {responding === req.id ? "Accepting..." : "Let's Match"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
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
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  emptyState: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 48,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: "#ec4899",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  goBackText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  requestsList: {
    gap: 20,
  },
  requestCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    padding: 20,
    overflow: "hidden",
  },
  categoryBadgeContainer: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  categoryBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  profileImage: {
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
  matchTypeBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#a855f7",
    borderWidth: 2,
    borderColor: "#0f1729",
    alignItems: "center",
    justifyContent: "center",
  },
  matchTypeIcon: {
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 6,
  },
  profileDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  profileDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
    marginBottom: 10,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  interestTag: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  interestText: {
    fontSize: 11,
    color: "#ec4899",
    fontWeight: "500",
  },
  moreInterests: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  questionSection: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    padding: 16,
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    marginBottom: 10,
  },
  answerBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
  },
  answerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  acceptButton: {
    backgroundColor: "#ec4899",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
