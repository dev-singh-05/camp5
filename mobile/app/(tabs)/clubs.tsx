import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Trophy, Users, Plus, X, Lock, Star } from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

const CATEGORIES = ["All", "Sports", "Arts", "Tech", "General"];

export default function Clubs() {
  const router = useRouter();
  const [clubs, setClubs] = useState<any[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [user, setUser] = useState<any>(null);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [requestedClubIds, setRequestedClubIds] = useState<string[]>([]);

  // Club detail modal states
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Passcode modal states
  const [showPassModal, setShowPassModal] = useState(false);
  const [enteredPass, setEnteredPass] = useState("");
  const [triesLeft, setTriesLeft] = useState(3);
  const [joiningClub, setJoiningClub] = useState<any>(null);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [searchQuery, selectedCategory, clubs]);

  async function loadClubs() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        // Get joined clubs
        const { data: joined } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", user.id);
        setJoinedClubIds((joined || []).map((j: any) => j.club_id));

        // Get requested clubs
        const { data: requested } = await supabase
          .from("club_requests")
          .select("club_id")
          .eq("user_id", user.id)
          .eq("status", "pending");
        setRequestedClubIds((requested || []).map((r: any) => r.club_id));
      }

      // Get all clubs
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setClubs(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error loading clubs:", error);
      setLoading(false);
    }
  }

  function filterClubs() {
    let filtered = clubs;

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (club) => club.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (club) =>
          club.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          club.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredClubs(filtered);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadClubs();
    setRefreshing(false);
  }

  function handleClubClick(club: any) {
    if (joinedClubIds.includes(club.id)) {
      // Navigate to club page
      router.push(`/clubs/${club.id}`);
    } else {
      // Show detail modal
      setSelectedClub(club);
      setShowDetailModal(true);
    }
  }

  async function startJoin(club: any) {
    setJoiningClub(club);
    setTriesLeft(3);
    setEnteredPass("");
    setShowDetailModal(false);
    setShowPassModal(true);
  }

  async function handlePassSubmit() {
    if (!joiningClub || !user) return;

    const { data: clubData } = await supabase
      .from("clubs")
      .select("passcode")
      .eq("id", joiningClub.id)
      .single();

    const realPass = clubData?.passcode;

    // If no password, join directly
    if (!realPass) {
      await supabase.from("club_members").insert([
        { club_id: joiningClub.id, user_id: user.id }
      ]);

      // Get user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send system message
      await supabase.from("messages").insert([{
        club_id: joiningClub.id,
        user_id: user.id,
        content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club`
      }]);

      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Joined ${joiningClub.name}!`,
      });
      return;
    }

    // Check password
    if (enteredPass === realPass) {
      await supabase.from("club_members").insert([
        { club_id: joiningClub.id, user_id: user.id }
      ]);

      // Get user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send system message
      await supabase.from("messages").insert([{
        club_id: joiningClub.id,
        user_id: user.id,
        content: `🔔 SYSTEM: ${profile?.full_name || "Someone"} joined the club via password`
      }]);

      setJoinedClubIds((prev) => [...prev, joiningClub.id]);
      setShowPassModal(false);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Joined ${joiningClub.name}!`,
      });
      return;
    }

    // Wrong password
    if (triesLeft - 1 > 0) {
      setTriesLeft(triesLeft - 1);
      setEnteredPass("");
      Toast.show({
        type: "error",
        text1: "Incorrect Password",
        text2: `${triesLeft - 1} tries remaining`,
      });
    } else {
      setShowPassModal(false);
      setShowRequestModal(true);
    }
  }

  async function handleRequest() {
    if (!joiningClub || !user) return;

    await supabase.from("club_requests").insert([
      { club_id: joiningClub.id, user_id: user.id, status: "pending" },
    ]);

    setRequestedClubIds((prev) => [...prev, joiningClub.id]);
    setShowRequestModal(false);
    Toast.show({
      type: "success",
      text1: "Request Sent",
      text2: `Your request to join ${joiningClub.name} has been sent to the admin.`,
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading clubs...</Text>
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
              onPress={() => router.push("/(tabs)/dashboard")}
            >
              <ChevronLeft color="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>👥 Clubs</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Join your campus communities</Text>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/clubs/my")}
            >
              <Users color="#fff" size={20} />
              <Text style={styles.quickActionText}>My Clubs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.leaderboardButton]}
              onPress={() => router.push("/clubs/leaderboard")}
            >
              <Trophy color="#fff" size={20} />
              <Text style={styles.quickActionText}>Leaderboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs..."
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Categories */}
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

        {/* Clubs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filteredClubs.length} {filteredClubs.length === 1 ? "Club" : "Clubs"}
          </Text>

          {filteredClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No clubs found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            <View style={styles.clubsList}>
              {filteredClubs.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={styles.clubCard}
                  onPress={() => handleClubClick(club)}
                >
                  <View style={styles.clubIconContainer}>
                    <Text style={styles.clubIcon}>
                      {club.category === "Sports"
                        ? "⚽"
                        : club.category === "Arts"
                        ? "🎨"
                        : club.category === "Tech"
                        ? "💻"
                        : "🌟"}
                    </Text>
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    <Text style={styles.clubCategory}>{club.category || "General"}</Text>
                    {club.description && (
                      <Text style={styles.clubDescription} numberOfLines={2}>
                        {club.description}
                      </Text>
                    )}
                    {joinedClubIds.includes(club.id) ? (
                      <View style={styles.joinedBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.joinedText}>Joined</Text>
                      </View>
                    ) : requestedClubIds.includes(club.id) ? (
                      <View style={styles.requestedBadge}>
                        <View style={styles.requestedDot} />
                        <Text style={styles.requestedText}>Requested</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.clubArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Club Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Club Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {selectedClub && (
              <View style={styles.modalBody}>
                <View style={styles.clubDetailHeader}>
                  <View style={styles.clubDetailIconContainer}>
                    <Text style={styles.clubDetailIcon}>
                      {selectedClub.category === "Sports"
                        ? "⚽"
                        : selectedClub.category === "Arts"
                        ? "🎨"
                        : selectedClub.category === "Tech"
                        ? "💻"
                        : "🌟"}
                    </Text>
                  </View>
                  <View style={styles.clubDetailInfo}>
                    <Text style={styles.clubDetailName}>{selectedClub.name}</Text>
                    <Text style={styles.clubDetailCategory}>
                      {selectedClub.category || "General"}
                    </Text>
                  </View>
                </View>

                <View style={styles.clubDetailDescriptionContainer}>
                  <Text style={styles.clubDetailDescriptionLabel}>Description</Text>
                  <Text style={styles.clubDetailDescription}>
                    {selectedClub.description || "No description provided."}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                  {requestedClubIds.includes(selectedClub.id) ? (
                    <View style={styles.requestPendingButton}>
                      <Text style={styles.requestPendingText}>Request Pending</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => startJoin(selectedClub)}
                      >
                        <Text style={styles.joinButtonText}>Join</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.requestButton}
                        onPress={() => {
                          setJoiningClub(selectedClub);
                          setShowDetailModal(false);
                          setShowRequestModal(true);
                        }}
                      >
                        <Text style={styles.requestButtonText}>Request</Text>
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
        visible={showPassModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.passModalIcon}>
              <Lock color="#a855f7" size={32} />
            </View>

            <Text style={styles.passModalTitle}>Enter Passcode</Text>
            <Text style={styles.passModalSubtitle}>
              Join <Text style={styles.passModalClubName}>{joiningClub?.name}</Text>
            </Text>

            <TextInput
              style={styles.passInput}
              value={enteredPass}
              onChangeText={setEnteredPass}
              placeholder="Enter club passcode"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              secureTextEntry
              textAlign="center"
              onSubmitEditing={handlePassSubmit}
            />

            <View style={styles.triesContainer}>
              <Text style={styles.triesText}>
                Tries remaining:{" "}
                <Text style={[styles.triesCount, triesLeft === 1 && styles.triesCountLow]}>
                  {triesLeft}
                </Text>
              </Text>
            </View>

            <View style={styles.passModalActions}>
              <TouchableOpacity
                style={styles.passModalCancelButton}
                onPress={() => setShowPassModal(false)}
              >
                <Text style={styles.passModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passModalSubmitButton, !enteredPass && styles.buttonDisabled]}
                onPress={handlePassSubmit}
                disabled={!enteredPass}
              >
                <Text style={styles.passModalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.requestModalIcon}>
              <Star color="#f59e0b" size={32} />
            </View>

            <Text style={styles.requestModalTitle}>Request Access</Text>
            <Text style={styles.requestModalSubtitle}>
              {triesLeft === 0 ? (
                <>You've used all passcode attempts. </>
              ) : (
                <>Want to skip the passcode? </>
              )}
              Send a request to join{" "}
              <Text style={styles.requestModalClubName}>{joiningClub?.name}</Text>
            </Text>

            <View style={styles.requestModalActions}>
              <TouchableOpacity
                style={styles.requestModalCancelButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.requestModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.requestModalSubmitButton}
                onPress={handleRequest}
              >
                <Text style={styles.requestModalSubmitText}>Send Request</Text>
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
    fontSize: 18,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    marginBottom: 16,
  },
  categories: {
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  clubsList: {
    gap: 12,
  },
  clubCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  clubIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  clubIcon: {
    fontSize: 24,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  clubCategory: {
    fontSize: 12,
    color: "#a855f7",
    marginBottom: 4,
  },
  clubDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  clubArrow: {
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.4)",
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  leaderboardButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  quickActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Status badges
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  joinedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  requestedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  requestedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  requestedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    width: "100%",
    maxWidth: 500,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    gap: 20,
  },
  clubDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  clubDetailIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  clubDetailIcon: {
    fontSize: 32,
  },
  clubDetailInfo: {
    flex: 1,
  },
  clubDetailName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  clubDetailCategory: {
    fontSize: 14,
    color: "#a855f7",
  },
  clubDetailDescriptionContainer: {
    gap: 8,
  },
  clubDetailDescriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  clubDetailDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  closeButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  joinButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  joinButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  requestButton: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  requestButtonText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
  },
  requestPendingButton: {
    flex: 1,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  requestPendingText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
  },
  // Passcode Modal
  passModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  passModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  passModalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 20,
  },
  passModalClubName: {
    color: "#a855f7",
    fontWeight: "600",
  },
  passInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: "white",
    fontSize: 18,
    letterSpacing: 4,
    marginBottom: 12,
  },
  triesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  triesText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  triesCount: {
    fontWeight: "600",
    color: "#a855f7",
  },
  triesCountLow: {
    color: "#ef4444",
  },
  passModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  passModalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  passModalCancelText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  passModalSubmitButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  passModalSubmitText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Request Modal
  requestModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  requestModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  requestModalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  requestModalClubName: {
    color: "#a855f7",
    fontWeight: "600",
  },
  requestModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  requestModalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  requestModalCancelText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  requestModalSubmitButton: {
    flex: 1,
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  requestModalSubmitText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
