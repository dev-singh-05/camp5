import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Trophy,
  Medal,
  Award,
  Search,
  Filter,
  Zap,
  Plus,
  X,
  Lock,
  Crown,
  Star,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
  total_xp: number;
  rank: number;
};

const CATEGORIES = ["all", "Sports", "Arts", "Tech", "General"];

export default function ClubLeaderboard() {
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [joiningClub, setJoiningClub] = useState<Club | null>(null);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [searchQuery, selectedCategory, clubs]);

  async function loadData() {
    try {
      await Promise.all([
        fetchClubs(),
        fetchUserClubsStatus(),
      ]);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function fetchClubs() {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, category, description, logo_url, total_xp")
      .order("total_xp", { ascending: false });

    if (error) {
      console.error("Error fetching clubs:", error);
      return;
    }

    const rankedClubs = (data || []).map((club: any, index: number) => ({
      ...club,
      rank: index + 1,
    }));

    setClubs(rankedClubs);
  }

  async function fetchUserClubsStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: joined } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id);
    setJoinedClubIds((joined || []).map((j: any) => j.club_id));

    const { data: requested } = await supabase
      .from("club_requests")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("status", "pending");
    setRequestedClubIds((requested || []).map((r: any) => r.club_id));
  }

  function setupRealtimeSubscription() {
    const subscription = supabase
      .channel("all-clubs-leaderboard")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "clubs",
        },
        () => {
          console.log("Club updated, refreshing leaderboard");
          fetchClubs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  function filterClubs() {
    let filtered = clubs;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (club) => club.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (club) =>
          club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          club.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredClubs(filtered);
  }

  function getRankIcon(rank: number) {
    if (rank === 1) return <Crown color="#fbbf24" size={24} />;
    if (rank === 2) return <Medal color="#9ca3af" size={24} />;
    if (rank === 3) return <Award color="#fb923c" size={24} />;
    return <Trophy color="#a855f7" size={20} />;
  }

  function getRankColor(rank: number) {
    if (rank === 1) return "#fbbf24";
    if (rank === 2) return "#9ca3af";
    if (rank === 3) return "#fb923c";
    return "#a855f7";
  }

  function getCategoryIcon(category: string | null) {
    switch (category?.toLowerCase()) {
      case "sports": return "⚽";
      case "arts": return "🎨";
      case "tech": return "💻";
      case "general": return "🌟";
      default: return "📁";
    }
  }

  async function handleJoinClub(club: Club) {
    const { data: clubData, error } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", club.id)
      .single();

    if (error) {
      Toast.show({ type: "error", text1: "Error fetching club data" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Toast.show({ type: "error", text1: "Please login first" });
      return;
    }

    if (!clubData?.passcode) {
      // Public club - join directly
      await supabase.from("club_members").insert([
        { club_id: club.id, user_id: user.id },
      ]);
      setJoinedClubIds((prev) => [...prev, club.id]);
      setShowClubModal(false);
      Toast.show({ type: "success", text1: "Joined club successfully!" });
      return;
    }

    // Private club - show passcode modal
    setJoiningClub(club);
    setTriesLeft(3);
    setPasscode("");
    setShowClubModal(false);
    setShowPasscodeModal(true);
  }

  async function handlePasscodeSubmit() {
    if (!joiningClub) return;

    const { data: clubData } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", joiningClub.id)
      .single();

    const realPass = clubData?.passcode;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (passcode === realPass) {
      await supabase.from("club_members").insert([
        { club_id: joiningClub.id, user_id: user.id },
      ]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      await supabase.from("messages").insert([{
        club_id: joiningClub.id,
        user_id: user.id,
        content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club via password`
      }]);

      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPasscodeModal(false);
      Toast.show({ type: "success", text1: "Joined club successfully!" });
      return;
    }

    if (triesLeft - 1 > 0) {
      setTriesLeft(triesLeft - 1);
      setPasscode("");
      Toast.show({ type: "error", text1: `Wrong passcode. ${triesLeft - 1} tries left` });
    } else {
      setShowPasscodeModal(false);
      // Automatically send request
      handleSendRequest();
    }
  }

  async function handleSendRequest() {
    if (!joiningClub) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("club_requests").insert([
      { club_id: joiningClub.id, user_id: user.id, status: "pending" },
    ]);
    setRequestedClubIds((prev) => [...prev, joiningClub.id]);
    Toast.show({ type: "success", text1: "Request sent successfully!" });
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const topThree = filteredClubs.slice(0, 3);
  const restOfClubs = filteredClubs.slice(3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft color="#fff" size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Trophy color="#fbbf24" size={24} />
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Top clubs by XP</Text>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search color="rgba(255, 255, 255, 0.4)" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.resultsCount}>
            Showing <Text style={styles.resultsCountHighlight}>{filteredClubs.length}</Text> clubs
          </Text>
        </View>

        {/* Top 3 Champions */}
        {topThree.length > 0 && (
          <View style={styles.championsSection}>
            <View style={styles.championHeader}>
              <Trophy color="#fbbf24" size={20} />
              <Text style={styles.sectionTitle}>Top Champions</Text>
            </View>
            {topThree.map((club) => (
              <TouchableOpacity
                key={club.id}
                style={[
                  styles.championCard,
                  { borderColor: getRankColor(club.rank) + "80" }
                ]}
                onPress={() => {
                  setSelectedClub(club);
                  setShowClubModal(true);
                }}
              >
                <View style={styles.championRankContainer}>
                  {getRankIcon(club.rank)}
                </View>

                <View style={[
                  styles.championAvatar,
                  { backgroundColor: getRankColor(club.rank) }
                ]}>
                  <Text style={styles.championEmoji}>{getCategoryIcon(club.category)}</Text>
                </View>

                <View style={styles.championInfo}>
                  <Text style={styles.championName}>{club.name}</Text>
                  {club.category && (
                    <Text style={styles.championCategory}>{club.category}</Text>
                  )}
                </View>

                <View style={[
                  styles.championXP,
                  { backgroundColor: getRankColor(club.rank) + "20", borderColor: getRankColor(club.rank) + "40" }
                ]}>
                  <Zap color={getRankColor(club.rank)} size={16} />
                  <Text style={[styles.championXPText, { color: getRankColor(club.rank) }]}>
                    {club.total_xp}
                  </Text>
                </View>

                <View style={[
                  styles.championRankBadge,
                  { backgroundColor: getRankColor(club.rank) + "30", borderColor: getRankColor(club.rank) + "50" }
                ]}>
                  <Text style={[styles.championRankText, { color: getRankColor(club.rank) }]}>
                    #{club.rank}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Rest of Clubs */}
        {restOfClubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Clubs</Text>
            {restOfClubs.map((club) => (
              <TouchableOpacity
                key={club.id}
                style={styles.clubCard}
                onPress={() => {
                  setSelectedClub(club);
                  setShowClubModal(true);
                }}
              >
                <View style={styles.clubRank}>
                  <Text style={styles.clubRankText}>#{club.rank}</Text>
                </View>

                <View style={styles.clubAvatar}>
                  <Text style={styles.clubEmoji}>{getCategoryIcon(club.category)}</Text>
                </View>

                <View style={styles.clubInfo}>
                  <Text style={styles.clubName}>{club.name}</Text>
                  {club.category && (
                    <Text style={styles.clubCategory}>{club.category}</Text>
                  )}
                </View>

                <View style={styles.clubXP}>
                  <Zap color="#fbbf24" size={16} />
                  <Text style={styles.clubXPText}>{club.total_xp}</Text>
                </View>

                {joinedClubIds.includes(club.id) && (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedText}>Joined</Text>
                  </View>
                )}
                {requestedClubIds.includes(club.id) && (
                  <View style={styles.requestedBadge}>
                    <Text style={styles.requestedText}>Pending</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredClubs.length === 0 && (
          <View style={styles.emptyState}>
            <Trophy color="rgba(255, 255, 255, 0.2)" size={64} />
            <Text style={styles.emptyText}>No clubs found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>

      {/* Club Detail Modal */}
      <Modal
        visible={showClubModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Club Details</Text>
              <TouchableOpacity onPress={() => setShowClubModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {selectedClub && (
              <View style={styles.modalBody}>
                <View style={[
                  styles.modalClubAvatar,
                  { backgroundColor: getRankColor(selectedClub.rank) }
                ]}>
                  <Text style={styles.modalClubEmoji}>
                    {getCategoryIcon(selectedClub.category)}
                  </Text>
                </View>

                <Text style={styles.modalClubName}>{selectedClub.name}</Text>
                {selectedClub.category && (
                  <Text style={styles.modalClubCategory}>{selectedClub.category}</Text>
                )}

                <View style={[
                  styles.modalRankBadge,
                  { backgroundColor: getRankColor(selectedClub.rank) + "20", borderColor: getRankColor(selectedClub.rank) + "40" }
                ]}>
                  {getRankIcon(selectedClub.rank)}
                  <Text style={[styles.modalRankText, { color: getRankColor(selectedClub.rank) }]}>
                    Rank #{selectedClub.rank}
                  </Text>
                </View>

                <View style={styles.modalXPContainer}>
                  <Zap color="#fbbf24" size={32} />
                  <Text style={styles.modalXPText}>{selectedClub.total_xp}</Text>
                  <Text style={styles.modalXPLabel}>Total XP</Text>
                </View>

                {selectedClub.description && (
                  <View style={styles.modalDescription}>
                    <Text style={styles.modalDescriptionLabel}>Description</Text>
                    <Text style={styles.modalDescriptionText}>{selectedClub.description}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  {joinedClubIds.includes(selectedClub.id) ? (
                    <TouchableOpacity
                      style={styles.enterButton}
                      onPress={() => {
                        setShowClubModal(false);
                        router.push(`/clubs/${selectedClub.id}`);
                      }}
                    >
                      <Text style={styles.enterButtonText}>Enter Club</Text>
                    </TouchableOpacity>
                  ) : requestedClubIds.includes(selectedClub.id) ? (
                    <View style={styles.requestedButton}>
                      <Clock color="#f59e0b" size={20} />
                      <Text style={styles.requestedButtonText}>Request Pending</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => handleJoinClub(selectedClub)}
                      >
                        <Plus color="#fff" size={20} />
                        <Text style={styles.joinButtonText}>Join Club</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.requestButton}
                        onPress={() => {
                          setJoiningClub(selectedClub);
                          setShowClubModal(false);
                          handleSendRequest();
                        }}
                      >
                        <Text style={styles.requestButtonText}>Send Request</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Passcode Modal */}
      <Modal
        visible={showPasscodeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPasscodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passcodeModal}>
            <View style={styles.passcodeIcon}>
              <Lock color="#a855f7" size={32} />
            </View>

            <Text style={styles.passcodeTitle}>Enter Passcode</Text>
            <Text style={styles.passcodeSubtitle}>
              Join {joiningClub?.name}
            </Text>

            <TextInput
              style={styles.passcodeInput}
              placeholder="Enter club passcode"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry
              autoFocus
            />

            <View style={styles.passcodeTriesContainer}>
              <Text style={styles.passcodeTriesText}>
                Tries remaining: <Text style={[
                  styles.passcodeTriesCount,
                  triesLeft === 1 && styles.passcodeTriesCountDanger
                ]}>{triesLeft}</Text>
              </Text>
            </View>

            <View style={styles.passcodeActions}>
              <TouchableOpacity
                style={styles.passcodeCancelButton}
                onPress={() => setShowPasscodeModal(false)}
              >
                <Text style={styles.passcodeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passcodeSubmitButton}
                onPress={handlePasscodeSubmit}
                disabled={!passcode}
              >
                <Text style={styles.passcodeSubmitText}>Submit</Text>
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
    backgroundColor: "#0f1729",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  categories: {
    marginBottom: 12,
  },
  categoryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  categoryText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "white",
  },
  resultsCount: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  resultsCountHighlight: {
    color: "#fbbf24",
    fontWeight: "600",
  },
  championsSection: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    padding: 16,
    marginBottom: 24,
  },
  championHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  championCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  championRankContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  championAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  championEmoji: {
    fontSize: 24,
  },
  championInfo: {
    flex: 1,
  },
  championName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  championCategory: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  championXP: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  championXPText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  championRankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  championRankText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 24,
  },
  clubCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  clubRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  clubRankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#a855f7",
  },
  clubAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  clubEmoji: {
    fontSize: 20,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,
  },
  clubCategory: {
    fontSize: 12,
    color: "#a855f7",
  },
  clubXP: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  clubXPText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fbbf24",
  },
  joinedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  joinedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10b981",
  },
  requestedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requestedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f59e0b",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#1e1b4b",
    borderRadius: 24,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    alignItems: "center",
  },
  modalClubAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalClubEmoji: {
    fontSize: 40,
  },
  modalClubName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  modalClubCategory: {
    fontSize: 16,
    color: "#a855f7",
    marginBottom: 16,
  },
  modalRankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalRankText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalXPContainer: {
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  modalXPText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fbbf24",
    marginVertical: 8,
  },
  modalXPLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalDescription: {
    width: "100%",
    marginBottom: 24,
  },
  modalDescriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  modalDescriptionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  enterButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  enterButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  requestedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  requestedButtonText: {
    color: "#f59e0b",
    fontSize: 16,
    fontWeight: "600",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a855f7",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  requestButton: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  requestButtonText: {
    color: "#f59e0b",
    fontSize: 16,
    fontWeight: "600",
  },
  passcodeModal: {
    backgroundColor: "#1e1b4b",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    alignItems: "center",
  },
  passcodeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  passcodeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  passcodeSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  passcodeInput: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 12,
  },
  passcodeTriesContainer: {
    marginBottom: 24,
  },
  passcodeTriesText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  passcodeTriesCount: {
    color: "#a855f7",
    fontWeight: "600",
  },
  passcodeTriesCountDanger: {
    color: "#ef4444",
  },
  passcodeActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  passcodeCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  passcodeCancelText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  passcodeSubmitButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  passcodeSubmitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
