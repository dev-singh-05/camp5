import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Users,
  TrendingUp,
  MessageSquare,
  Star,
  X,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  avg_confidence?: number | null;
  avg_humbleness?: number | null;
  avg_friendliness?: number | null;
  avg_intelligence?: number | null;
  avg_communication?: number | null;
  avg_overall_xp?: number | null;
  total_ratings?: number | null;
  leaderboard_rank?: number | null;
};

export default function ConnectionsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasRatedUser, setHasRatedUser] = useState<Set<string>>(new Set());
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());

  // Rating states
  const [confidence, setConfidence] = useState(0);
  const [humbleness, setHumbleness] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [communication, setCommunication] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Fetch accepted connections
      const { data: connections } = await supabase
        .from("profile_requests")
        .select("*")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      const otherUserIds =
        connections?.map((req) =>
          req.from_user_id === user.id ? req.to_user_id : req.from_user_id
        ) || [];

      if (otherUserIds.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Fetch all leaderboard users
      const { data: leaderboardData } = await supabase
        .from("profiles")
        .select("id, avg_overall_xp")
        .order("avg_overall_xp", { ascending: false });

      const leaderboard = leaderboardData || [];

      // Fetch connected users' full data
      const { data: connectedProfiles } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, description, profile_photo, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings"
        )
        .in("id", otherUserIds);

      // Attach leaderboard rank
      const rankedConnections = (connectedProfiles || []).map((profile) => {
        const index = leaderboard.findIndex((u) => u.id === profile.id);
        const rank = index >= 0 ? index + 1 : null;
        return { ...profile, leaderboard_rank: rank };
      });

      setProfiles(rankedConnections);

      // Check if user has rated someone
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("to_user_id")
        .eq("from_user_id", user.id);

      if (ratingsData) {
        const ratedIds = new Set(ratingsData.map((r) => r.to_user_id));
        setHasRatedUser(ratedIds);
      }

      // Check unlocked stats
      const { data: unlocksData } = await supabase
        .from("stats_unlocks")
        .select("profile_id")
        .eq("user_id", user.id);

      if (unlocksData) {
        const unlockedIds = new Set(unlocksData.map((u) => u.profile_id));
        setUnlockedStats(unlockedIds);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading connections:", error);
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return { uri: profile.profile_photo };
    return null;
  };

  const getAvatarText = (profile: Profile) => {
    return (profile.full_name || profile.username || "U")[0].toUpperCase();
  };

  const openChat = (user: Profile) => {
    if (!hasRatedUser.has(user.id)) {
      setSelectedUser(user);
      setShowRatingModal(true);
      Toast.show({
        type: "error",
        text1: "You need to rate this person before you can chat",
      });
      return;
    }
    router.push(`/ratings/chat/${user.id}`);
  };

  const handleSubmitRating = async () => {
    if (!currentUserId || !selectedUser) return;

    const overallXP = (confidence + humbleness + friendliness + intelligence + communication) * 4;

    try {
      const { error } = await supabase.from("ratings").insert([
        {
          from_user_id: currentUserId,
          to_user_id: selectedUser.id,
          comment: "",
          confidence,
          humbleness,
          friendliness,
          intelligence,
          communication,
          overall_xp: overallXP,
        },
      ]);

      if (error) {
        Toast.show({ type: "error", text1: "Failed to submit rating" });
        return;
      }

      Toast.show({ type: "success", text1: "Rating submitted!" });
      setShowRatingModal(false);
      setConfidence(0);
      setHumbleness(0);
      setFriendliness(0);
      setIntelligence(0);
      setCommunication(0);
      setHasRatedUser((prev) => new Set(prev).add(selectedUser.id));
    } catch (err) {
      console.error("Unexpected error:", err);
      Toast.show({ type: "error", text1: "Unexpected error occurred" });
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/ratings")}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Connections</Text>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => router.push("/ratings/leaderboard")}
          >
            <TrendingUp color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Connections List */}
        {profiles.length > 0 ? (
          <View style={styles.connectionsList}>
            {profiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.connectionCard}
                onPress={() => setSelectedUser(profile)}
              >
                <View style={styles.connectionAvatar}>
                  {getAvatar(profile) ? (
                    <Image source={getAvatar(profile)!} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{getAvatarText(profile)}</Text>
                  )}
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {profile.full_name || profile.username}
                  </Text>
                  {profile.leaderboard_rank && (
                    <Text style={styles.connectionRank}>
                      <TrendingUp color="#fbbf24" size={12} /> Rank #{profile.leaderboard_rank}
                    </Text>
                  )}
                </View>
                <Text style={styles.connectionArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Users color="rgba(255,255,255,0.3)" size={80} />
            <Text style={styles.emptyText}>No connections yet</Text>
            <Text style={styles.emptySubtext}>
              Start connecting with people from the ratings page
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Profile Detail Modal */}
      <Modal visible={!!selectedUser && !showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedUser(null)}>
              <X color="#fff" size={24} />
            </TouchableOpacity>

            {selectedUser && (
              <ScrollView>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatarLarge}>
                    {getAvatar(selectedUser) ? (
                      <Image source={getAvatar(selectedUser)!} style={styles.avatarImageLarge} />
                    ) : (
                      <Text style={styles.avatarTextLarge}>{getAvatarText(selectedUser)}</Text>
                    )}
                  </View>
                  <Text style={styles.profileNameLarge}>{selectedUser.full_name}</Text>
                  <Text style={styles.profileDescription}>
                    {selectedUser.description || "No bio available"}
                  </Text>

                  {/* Leaderboard Rank */}
                  {selectedUser.leaderboard_rank && (
                    <View style={styles.rankBadge}>
                      <TrendingUp color="#fbbf24" size={16} />
                      <Text style={styles.rankText}>Rank #{selectedUser.leaderboard_rank}</Text>
                    </View>
                  )}

                  {/* XP and Ratings - Always show */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Star color="#fbbf24" size={16} />
                      <Text style={styles.statValue}>
                        {selectedUser.avg_overall_xp?.toFixed(1) || 0}
                      </Text>
                      <Text style={styles.statLabel}>Overall XP</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Sparkles color="#a855f7" size={16} />
                      <Text style={styles.statValue}>
                        {selectedUser.total_ratings && selectedUser.total_ratings > 0
                          ? (selectedUser.avg_overall_xp! / selectedUser.total_ratings).toFixed(1)
                          : 0}
                      </Text>
                      <Text style={styles.statLabel}>Avg XP</Text>
                    </View>
                    <View style={styles.statBox}>
                      <MessageSquare color="#06b6d4" size={16} />
                      <Text style={styles.statValue}>{selectedUser.total_ratings || 0}</Text>
                      <Text style={styles.statLabel}>Ratings</Text>
                    </View>
                  </View>
                </View>

                {/* Attributes - Only show if unlocked via tokens */}
                {unlockedStats.has(selectedUser.id) ? (
                  <View style={styles.attributesContainer}>
                    <Text style={styles.attributesTitle}>
                      <Sparkles color="#a855f7" size={16} /> Detailed Attributes
                    </Text>
                    {[
                      { label: "Confidence", value: selectedUser.avg_confidence, icon: "💪" },
                      { label: "Humbleness", value: selectedUser.avg_humbleness, icon: "🙏" },
                      { label: "Friendliness", value: selectedUser.avg_friendliness, icon: "😊" },
                      { label: "Intelligence", value: selectedUser.avg_intelligence, icon: "🧠" },
                      { label: "Communication", value: selectedUser.avg_communication, icon: "💬" },
                    ].map((attr) => (
                      <View key={attr.label} style={styles.attributeRow}>
                        <Text style={styles.attributeLabel}>
                          {attr.icon} {attr.label}
                        </Text>
                        <Text style={styles.attributeValue}>{attr.value?.toFixed(1) || 0}/5</Text>
                        <View style={styles.attributeBarContainer}>
                          <View
                            style={[
                              styles.attributeBar,
                              { width: `${((attr.value || 0) / 5) * 100}%` },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.lockedContainer}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.lockedText}>
                      Detailed attributes are locked. Use 250 tokens to unlock on the main ratings page.
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => setShowRatingModal(true)}
                  >
                    <Star color="#fff" size={18} />
                    <Text style={styles.rateButtonText}>Add Rating</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chatButton} onPress={() => openChat(selectedUser)}>
                    <MessageSquare color="#fff" size={18} />
                    <Text style={styles.chatButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <Text style={styles.ratingModalTitle}>Rate {selectedUser?.full_name}</Text>

            {[
              { label: "Confidence", value: confidence, setter: setConfidence },
              { label: "Humbleness", value: humbleness, setter: setHumbleness },
              { label: "Friendliness", value: friendliness, setter: setFriendliness },
              { label: "Intelligence", value: intelligence, setter: setIntelligence },
              { label: "Communication", value: communication, setter: setCommunication },
            ].map((item) => (
              <View key={item.label} style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>{item.label}</Text>
                <Text style={styles.ratingValue}>{item.value}/5</Text>
                <View style={styles.ratingButtons}>
                  {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.ratingButton,
                        item.value === val && styles.ratingButtonActive,
                      ]}
                      onPress={() => item.setter(val)}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          item.value === val && styles.ratingButtonTextActive,
                        ]}
                      >
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRating}>
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 16,
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  leaderboardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  connectionsList: {
    gap: 12,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 16,
  },
  connectionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  connectionRank: {
    fontSize: 12,
    color: "#fbbf24",
  },
  connectionArrow: {
    fontSize: 24,
    color: "rgba(255,255,255,0.4)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#1e1b4b",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    padding: 20,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 40,
  },
  profileAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarImageLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarTextLarge: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  profileNameLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  profileDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 16,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fbbf24",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    minWidth: 90,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  attributesContainer: {
    marginBottom: 20,
  },
  attributesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  attributeRow: {
    marginBottom: 16,
  },
  attributeLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  attributeValue: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
    marginBottom: 4,
  },
  attributeBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  attributeBar: {
    height: "100%",
    backgroundColor: "#a855f7",
    borderRadius: 4,
  },
  lockedContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  rateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  rateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06b6d4",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  chatButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  ratingModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e1b4b",
    marginBottom: 20,
    textAlign: "center",
  },
  ratingItem: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ratingButton: {
    width: 50,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonActive: {
    backgroundColor: "#a855f7",
  },
  ratingButtonText: {
    fontSize: 14,
    color: "#374151",
  },
  ratingButtonTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  ratingModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
