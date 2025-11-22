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
  Trophy,
  Search,
  Filter,
  X,
  Star,
  MessageSquare,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

type Profile = {
  id: string;
  full_name: string;
  profile_photo: string | null;
  branch: string | null;
  avg_confidence: number | null;
  avg_humbleness: number | null;
  avg_friendliness: number | null;
  avg_intelligence: number | null;
  avg_communication: number | null;
  avg_overall_xp: number | null;
  total_ratings: number | null;
  rank: number;
  gender?: string | null;
  hometown?: string | null;
  year?: string | null;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [unlockedStats, setUnlockedStats] = useState<Set<string>>(new Set());
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const TOKENS_TO_VIEW_STATS = 250;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Load token balance
        const { data: tokenData } = await supabase
          .from("user_tokens")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (tokenData) {
          setTokenBalance(tokenData.balance || 0);
        }

        // Load unlocked stats
        const { data: unlocksData } = await supabase
          .from("stats_unlocks")
          .select("profile_id")
          .eq("user_id", user.id);

        if (unlocksData) {
          const unlockedIds = new Set(unlocksData.map((u) => u.profile_id));
          setUnlockedStats(unlockedIds);
        }
      }

      // First, get all ratings and calculate cumulative XP per user
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("to_user_id, overall_xp");

      if (ratingsError) throw ratingsError;

      // Calculate cumulative XP for each user
      const xpMap: Record<string, { totalXP: number; count: number }> = {};
      (ratingsData || []).forEach((rating: any) => {
        const userId = rating.to_user_id;
        const xp = rating.overall_xp || 0;
        if (!xpMap[userId]) {
          xpMap[userId] = { totalXP: 0, count: 0 };
        }
        xpMap[userId].totalXP += xp;
        xpMap[userId].count++;
      });

      // Get user profiles for those with at least 3 ratings
      const userIdsWithEnoughRatings = Object.keys(xpMap).filter((id) => xpMap[id].count >= 3);

      if (userIdsWithEnoughRatings.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, profile_photo, branch, gender, hometown, year, avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication, total_ratings"
        )
        .in("id", userIdsWithEnoughRatings);

      if (error) throw error;

      // Attach cumulative XP and sort
      const profilesWithXP = (data || []).map((profile: any) => ({
        ...profile,
        avg_overall_xp: xpMap[profile.id]?.totalXP || 0,
      }));

      // Sort by cumulative XP descending
      profilesWithXP.sort((a, b) => (b.avg_overall_xp || 0) - (a.avg_overall_xp || 0));

      // Assign ranks
      const profilesWithRank = profilesWithXP.map((profile, index) => ({
        ...profile,
        rank: index + 1,
      }));

      setProfiles(profilesWithRank);
      setLoading(false);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const handleUnlockWithTokens = async () => {
    if (!currentUserId || !selectedUser) return;

    if (tokenBalance < TOKENS_TO_VIEW_STATS) {
      Toast.show({
        type: "error",
        text1: "Insufficient Tokens",
        text2: `You need ${TOKENS_TO_VIEW_STATS} tokens. Current balance: ${tokenBalance}`,
      });
      return;
    }

    setIsUnlocking(true);
    try {
      const newBalance = tokenBalance - TOKENS_TO_VIEW_STATS;

      // Deduct tokens
      const { error: tokenError } = await supabase
        .from("user_tokens")
        .update({ balance: newBalance })
        .eq("user_id", currentUserId);

      if (tokenError) throw tokenError;

      // Log transaction
      await supabase.from("token_transactions").insert([
        {
          user_id: currentUserId,
          amount: -TOKENS_TO_VIEW_STATS,
          type: "spend",
          status: "completed",
          description: `Unlocked stats for ${selectedUser.full_name}`,
        },
      ]);

      // Record unlock
      await supabase.from("stats_unlocks").insert([
        {
          user_id: currentUserId,
          profile_id: selectedUser.id,
          unlocked_via: "tokens",
        },
      ]);

      setTokenBalance(newBalance);
      setUnlockedStats((prev) => new Set(prev).add(selectedUser.id));
      Toast.show({
        type: "success",
        text1: "Stats Unlocked!",
        text2: `You can now view ${selectedUser.full_name}'s detailed stats`,
      });
    } catch (error) {
      console.error("Error unlocking stats:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to unlock stats. Please try again.",
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const getAvatar = (profile: Profile) => {
    if (profile.profile_photo) return { uri: profile.profile_photo };
    return null;
  };

  const getAvatarText = (profile: Profile) => {
    return profile.full_name[0].toUpperCase();
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return { bg: "rgba(251, 191, 36, 0.2)", border: "#fbbf24", text: "#fbbf24" };
    if (rank === 2) return { bg: "rgba(209, 213, 219, 0.2)", border: "#d1d5db", text: "#d1d5db" };
    if (rank === 3) return { bg: "rgba(251, 146, 60, 0.2)", border: "#fb923c", text: "#fb923c" };
    return { bg: "rgba(0,0,0,0.4)", border: "rgba(255,255,255,0.1)", text: "#06b6d4" };
  };

  const filteredProfiles = profiles.filter((p) => {
    const searchMatch = (p.full_name || "").toLowerCase().includes(search.toLowerCase());
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
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
          <Text style={styles.headerTitle}>
            <Trophy color="#fbbf24" size={24} /> Leaderboard
          </Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Filter color="#fff" size={20} />
            {(filterBranch || filterGender || filterYear) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Search */}
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

        {/* Leaderboard List */}
        {filteredProfiles.length > 0 ? (
          <View style={styles.leaderboardList}>
            {filteredProfiles.map((user) => {
              const colors = getRankColor(user.rank);
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.leaderboardCard,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedUser(user)}
                >
                  <View style={styles.rankContainer}>
                    <Text style={[styles.rankNumber, { color: colors.text }]}>#{user.rank}</Text>
                  </View>

                  <View style={styles.userAvatar}>
                    {getAvatar(user) ? (
                      <Image source={getAvatar(user)!} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{getAvatarText(user)}</Text>
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    <Text style={styles.userRatings}>Tap to view details</Text>
                  </View>

                  <Text style={styles.profileArrow}>→</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Trophy color="rgba(255,255,255,0.3)" size={80} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      {/* Profile Detail Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedUser(null)}>
              <X color="#fff" size={24} />
            </TouchableOpacity>

            {selectedUser && (
              <ScrollView>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatarLarge}>
                    {getAvatar(selectedUser) ? (
                      <Image source={getAvatar(selectedUser)!} style={styles.avatarImageLarge} />
                    ) : (
                      <Text style={styles.avatarTextLarge}>{getAvatarText(selectedUser)}</Text>
                    )}
                  </View>
                  <Text style={styles.profileName}>{selectedUser.full_name}</Text>

                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Trophy color="#fbbf24" size={16} />
                      <Text style={styles.statLabel}>Rank</Text>
                      <Text style={styles.statValue}>#{selectedUser.rank}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Star color="#fbbf24" size={16} />
                      <Text style={styles.statLabel}>Overall XP</Text>
                      <Text style={styles.statValue}>
                        {selectedUser.avg_overall_xp?.toFixed(1) || 0}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Sparkles color="#a855f7" size={16} />
                      <Text style={styles.statLabel}>Avg XP</Text>
                      <Text style={styles.statValue}>
                        {selectedUser.total_ratings && selectedUser.total_ratings > 0
                          ? (selectedUser.avg_overall_xp! / selectedUser.total_ratings).toFixed(1)
                          : 0}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MessageSquare color="#06b6d4" size={16} />
                      <Text style={styles.statLabel}>Ratings</Text>
                      <Text style={styles.statValue}>{selectedUser.total_ratings || 0}</Text>
                    </View>
                  </View>

                  <Text style={styles.profileBranch}>{selectedUser.branch || "—"}</Text>
                </View>

                {/* Detailed Stats - Show if unlocked, otherwise show unlock option */}
                {unlockedStats.has(selectedUser.id) ? (
                  <View style={styles.attributesContainer}>
                    <Text style={styles.attributesTitle}>Detailed Attributes</Text>
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
                        <View style={styles.attributeBarContainer}>
                          <View
                            style={[
                              styles.attributeBar,
                              { width: `${((attr.value || 0) / 5) * 100}%` },
                            ]}
                          />
                          <Text style={styles.attributeValue}>{attr.value?.toFixed(1) || 0}/5</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.lockedContainer}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.lockedTitle}>Detailed attributes are locked. Unlock to view their detailed ratings!</Text>
                    <TouchableOpacity
                      style={[
                        styles.unlockButton,
                        (isUnlocking || tokenBalance < TOKENS_TO_VIEW_STATS) &&
                          styles.unlockButtonDisabled,
                      ]}
                      onPress={handleUnlockWithTokens}
                      disabled={isUnlocking || tokenBalance < TOKENS_TO_VIEW_STATS}
                    >
                      {isUnlocking ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.unlockButtonText}>
                            {tokenBalance < TOKENS_TO_VIEW_STATS
                              ? "Insufficient Tokens"
                              : `🔓 Unlock Detailed Stats`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    paddingVertical: 12,
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  rankContainer: {
    width: 48,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  userRatings: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  profileArrow: {
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
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    justifyContent: "center",
  },
  statItem: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
    minWidth: 80,
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  profileBranch: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontStyle: "italic",
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
  attributeBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  attributeBar: {
    height: "100%",
    backgroundColor: "#a855f7",
    borderRadius: 4,
  },
  attributeValue: {
    position: "absolute",
    right: 8,
    top: -20,
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
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
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    width: "100%",
  },
  unlockButtonDisabled: {
    backgroundColor: "rgba(168, 85, 247, 0.3)",
    opacity: 0.6,
  },
  unlockButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
