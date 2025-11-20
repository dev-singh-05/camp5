import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Users,
  TrendingUp,
  Search,
  Filter,
  X,
  Coins,
  Star,
  MessageSquare,
  Clock,
  Link,
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
  branch?: string | null;
  gender?: string | null;
  hometown?: string | null;
  year?: string | null;
};

type Request = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
};

export default function RatingsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Token system states
  const [tokenBalance, setTokenBalance] = useState(0);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [hasRatedUser, setHasRatedUser] = useState<Set<string>>(new Set());
  const [showTokenUnlockModal, setShowTokenUnlockModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Rating states
  const [confidence, setConfidence] = useState(0);
  const [humbleness, setHumbleness] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [overallXP, setOverallXP] = useState(0);

  const TOKENS_TO_VIEW_STATS = 250;

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

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, description, profile_photo, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, avg_overall_xp, total_ratings, branch, gender, hometown, year"
        );

      if (profilesError) throw profilesError;
      setProfiles((profilesData || []).filter((p) => p.id !== user.id));

      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("profile_requests")
        .select("*")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Fetch token balance
      const { data: tokenData } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setTokenBalance(tokenData?.balance || 0);

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
      console.error("Error loading data:", error);
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

  const getRequestStatus = (userId: string): "none" | "requested" | "friends" => {
    const req = requests.find(
      (r) =>
        (r.from_user_id === currentUserId && r.to_user_id === userId) ||
        (r.to_user_id === currentUserId && r.from_user_id === userId)
    );
    if (!req) return "none";
    if (req.status === "accepted") return "friends";
    return "requested";
  };

  const canViewStats = (userId: string): boolean => {
    return unlockedStats.has(userId);
  };

  const handleConnectToggle = async (toUserId: string) => {
    if (!currentUserId) {
      Toast.show({
        type: "error",
        text1: "Login required",
      });
      return;
    }

    const existing = requests.find(
      (r) => r.from_user_id === currentUserId && r.to_user_id === toUserId
    );

    if (existing) {
      const { error } = await supabase.from("profile_requests").delete().eq("id", existing.id);
      if (error) {
        Toast.show({ type: "error", text1: "Failed to cancel request" });
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== existing.id));
      Toast.show({ type: "info", text1: "Request cancelled" });
    } else {
      const { data, error } = await supabase
        .from("profile_requests")
        .insert([{ from_user_id: currentUserId, to_user_id: toUserId, status: "pending" }])
        .select()
        .single();

      if (error) {
        Toast.show({ type: "error", text1: "Failed to send request" });
        return;
      }
      setRequests((prev) => [...prev, data]);
      Toast.show({ type: "success", text1: "Request sent!" });
    }
  };

  const handleSubmitRating = async () => {
    if (!currentUserId || !selectedUser) return;

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
      setSelectedUser(null);
      setConfidence(0);
      setHumbleness(0);
      setFriendliness(0);
      setIntelligence(0);
      setCommunication(0);
      setOverallXP(0);
      setHasRatedUser((prev) => new Set(prev).add(selectedUser.id));
      await loadData(); // Refresh to update stats
    } catch (err) {
      console.error("Unexpected error:", err);
      Toast.show({ type: "error", text1: "Unexpected error occurred" });
    }
  };

  const handleUnlockWithTokens = async () => {
    if (!currentUserId || !selectedUser) return;

    if (tokenBalance < TOKENS_TO_VIEW_STATS) {
      Toast.show({
        type: "error",
        text1: "Insufficient tokens",
        text2: `You need ${TOKENS_TO_VIEW_STATS} tokens to unlock stats`,
      });
      return;
    }

    const newBalance = tokenBalance - TOKENS_TO_VIEW_STATS;
    await supabase.from("user_tokens").update({ balance: newBalance }).eq("user_id", currentUserId);

    await supabase.from("token_transactions").insert([
      {
        user_id: currentUserId,
        amount: -TOKENS_TO_VIEW_STATS,
        type: "spend",
        status: "completed",
        description: `Unlocked stats for ${selectedUser.full_name}`,
      },
    ]);

    await supabase.from("stats_unlocks").insert([
      {
        user_id: currentUserId,
        profile_id: selectedUser.id,
        unlocked_via: "tokens",
      },
    ]);

    setTokenBalance(newBalance);
    setUnlockedStats((prev) => new Set(prev).add(selectedUser.id));
    setShowTokenUnlockModal(false);
    Toast.show({ type: "success", text1: "Stats unlocked!" });
  };

  const filteredProfiles = profiles.filter((p) => {
    const searchMatch = (p.full_name || p.username || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!searchMatch) return false;
    if (filterBranch && p.branch !== filterBranch) return false;
    if (filterGender && p.gender !== filterGender) return false;
    if (filterYear && p.year !== filterYear) return false;
    return true;
  });

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Loading...</Text>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/dashboard")}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ratings</Text>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => router.push("/ratings/leaderboard")}
          >
            <TrendingUp color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color="rgba(255,255,255,0.6)" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search profiles..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Filter color="#fff" size={20} />
            {(filterBranch || filterGender || filterYear) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Token Balance */}
        <TouchableOpacity style={styles.tokenCard}>
          <Coins color="#fbbf24" size={24} />
          <Text style={styles.tokenLabel}>Your Tokens</Text>
          <Text style={styles.tokenAmount}>{tokenBalance}</Text>
        </TouchableOpacity>

        {/* My Connections Button */}
        <TouchableOpacity
          style={styles.connectionsButton}
          onPress={() => router.push("/ratings/connections")}
        >
          <Users color="#10b981" size={20} />
          <Text style={styles.connectionsButtonText}>My Connections</Text>
        </TouchableOpacity>

        {/* Profiles List */}
        <View style={styles.profilesList}>
          {filteredProfiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.profileCard}
              onPress={() => setSelectedUser(profile)}
            >
              <View style={styles.profileAvatar}>
                {getAvatar(profile) ? (
                  <Image source={getAvatar(profile)!} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{getAvatarText(profile)}</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.full_name || profile.username}</Text>
                {getRequestStatus(profile.id) === "friends" && canViewStats(profile.id) && (
                  <Text style={styles.connectedBadge}>✓ Connected</Text>
                )}
              </View>
              <Text style={styles.profileArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Profile Detail Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedUser(null)}
            >
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

                  {/* XP and Ratings - Always show for friends */}
                  {getRequestStatus(selectedUser.id) === "friends" && (
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
                  )}
                </View>

                {/* Attributes or Lock State */}
                {getRequestStatus(selectedUser.id) === "friends" && canViewStats(selectedUser.id) ? (
                  <View style={styles.attributesContainer}>
                    <Text style={styles.attributesTitle}>
                      <Sparkles color="#a855f7" size={16} /> Attributes
                    </Text>
                    {[
                      {
                        label: "Confidence",
                        value: selectedUser.avg_confidence,
                        icon: "💪",
                      },
                      {
                        label: "Humbleness",
                        value: selectedUser.avg_humbleness,
                        icon: "🙏",
                      },
                      {
                        label: "Friendliness",
                        value: selectedUser.avg_friendliness,
                        icon: "😊",
                      },
                      {
                        label: "Intelligence",
                        value: selectedUser.avg_intelligence,
                        icon: "🧠",
                      },
                      {
                        label: "Communication",
                        value: selectedUser.avg_communication,
                        icon: "💬",
                      },
                    ].map((attr) => (
                      <View key={attr.label} style={styles.attributeRow}>
                        <Text style={styles.attributeLabel}>
                          {attr.icon} {attr.label}
                        </Text>
                        <Text style={styles.attributeValue}>
                          {attr.value?.toFixed(1) || 0}/5
                        </Text>
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
                    {getRequestStatus(selectedUser.id) === "friends" ? (
                      <>
                        <Text style={styles.lockedText}>
                          Detailed attributes are locked. Spend {TOKENS_TO_VIEW_STATS} tokens to
                          unlock!
                        </Text>
                        <TouchableOpacity
                          style={styles.unlockButton}
                          onPress={() => setShowTokenUnlockModal(true)}
                        >
                          <Text style={styles.unlockButtonText}>🔓 Unlock Stats</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.lockedText}>Connect first to view stats</Text>
                        <TouchableOpacity
                          style={[
                            styles.unlockButton,
                            getRequestStatus(selectedUser.id) === "requested" &&
                              styles.requestedButton,
                          ]}
                          onPress={() => handleConnectToggle(selectedUser.id)}
                        >
                          <Text style={styles.unlockButtonText}>
                            {getRequestStatus(selectedUser.id) === "requested" ? (
                              <>
                                <Clock color="#fff" size={16} /> Request Sent
                              </>
                            ) : (
                              <>
                                <Link color="#fff" size={16} /> Connect
                              </>
                            )}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                {getRequestStatus(selectedUser.id) === "friends" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => setShowRatingModal(true)}
                    >
                      <Star color="#fff" size={18} />
                      <Text style={styles.rateButtonText}>Add Rating</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => router.push(`/ratings/chat/${selectedUser.id}`)}
                    >
                      <MessageSquare color="#fff" size={18} />
                      <Text style={styles.chatButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <TouchableOpacity
              style={styles.ratingModalClose}
              onPress={() => setShowRatingModal(false)}
            >
              <X color="#374151" size={24} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.ratingModalTitle}>Rate {selectedUser?.full_name}</Text>

              {[
                { label: "Confidence", value: confidence, setter: setConfidence },
                { label: "Humbleness", value: humbleness, setter: setHumbleness },
                { label: "Friendliness", value: friendliness, setter: setFriendliness },
                { label: "Intelligence", value: intelligence, setter: setIntelligence },
                { label: "Communication", value: communication, setter: setCommunication },
              ].map((item) => (
                <View key={item.label} style={styles.ratingItem}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingLabel}>{item.label}</Text>
                    <Text style={styles.ratingValue}>{item.value}/5</Text>
                  </View>
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

              <View style={styles.ratingItem}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.ratingLabel}>Overall XP</Text>
                  <Text style={styles.ratingValue}>{overallXP}/100</Text>
                </View>
                <TextInput
                  style={styles.xpInput}
                  keyboardType="numeric"
                  placeholder="Enter XP (0-100)"
                  placeholderTextColor="#9ca3af"
                  value={overallXP > 0 ? overallXP.toString() : ""}
                  onChangeText={(text) =>
                    setOverallXP(Math.min(100, Math.max(0, parseInt(text) || 0)))
                  }
                />
              </View>

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Token Unlock Modal */}
      <Modal visible={showTokenUnlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.tokenModalContent}>
            <Text style={styles.tokenModalTitle}>Unlock Stats</Text>
            <Text style={styles.tokenModalText}>
              Spend <Text style={styles.tokenHighlight}>{TOKENS_TO_VIEW_STATS} tokens</Text> to
              unlock {selectedUser?.full_name}'s detailed profile stats
            </Text>
            <TouchableOpacity style={styles.unlockTokenButton} onPress={handleUnlockWithTokens}>
              <Coins color="#fff" size={20} />
              <Text style={styles.unlockTokenButtonText}>
                Unlock for {TOKENS_TO_VIEW_STATS} Tokens
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelTokenButton}
              onPress={() => setShowTokenUnlockModal(false)}
            >
              <Text style={styles.cancelTokenButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Branch</Text>
              <View style={styles.filterOptions}>
                {["", "Computer Science", "Information Technology", "Electronics", "Mechanical"].map(
                  (branch) => (
                    <TouchableOpacity
                      key={branch}
                      style={[
                        styles.filterOption,
                        filterBranch === branch && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilterBranch(branch)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filterBranch === branch && styles.filterOptionTextActive,
                        ]}
                      >
                        {branch || "All Branches"}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.filterOptions}>
                {["", "male", "female", "other"].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.filterOption,
                      filterGender === gender && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilterGender(gender)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterGender === gender && styles.filterOptionTextActive,
                      ]}
                    >
                      {gender || "All Genders"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Year</Text>
              <View style={styles.filterOptions}>
                {["", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.filterOption,
                      filterYear === year && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilterYear(year)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterYear === year && styles.filterOptionTextActive,
                      ]}
                    >
                      {year || "All Years"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setFilterBranch("");
                  setFilterGender("");
                  setFilterYear("");
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
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
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    paddingVertical: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ec4899",
  },
  tokenCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  tokenLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#fbbf24",
  },
  tokenAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fbbf24",
  },
  connectionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  connectionsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  profilesList: {
    gap: 12,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 16,
  },
  profileAvatar: {
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  connectedBadge: {
    fontSize: 12,
    color: "#10b981",
  },
  profileArrow: {
    fontSize: 24,
    color: "rgba(255,255,255,0.4)",
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
    marginBottom: 16,
  },
  unlockButton: {
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  requestedButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  unlockButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    maxHeight: "85%",
  },
  ratingModalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e1b4b",
    marginBottom: 20,
    marginTop: 8,
    textAlign: "center",
  },
  ratingItem: {
    marginBottom: 16,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6366f1",
  },
  ratingButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ratingButton: {
    width: 48,
    height: 32,
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
  xpInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1e1b4b",
    fontWeight: "600",
    textAlign: "center",
  },
  ratingModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingBottom: 8,
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
  tokenModalContent: {
    backgroundColor: "#1e1b4b",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  tokenModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 16,
  },
  tokenModalText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 24,
  },
  tokenHighlight: {
    color: "#fbbf24",
    fontWeight: "bold",
  },
  unlockTokenButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  unlockTokenButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelTokenButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelTokenButtonText: {
    color: "white",
    fontSize: 14,
  },
  filterModalContent: {
    backgroundColor: "#1e1b4b",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterOptionActive: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  filterOptionText: {
    color: "white",
    fontSize: 14,
  },
  filterOptionTextActive: {
    fontWeight: "bold",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  clearFiltersText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyFiltersText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
