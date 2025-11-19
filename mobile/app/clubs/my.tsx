import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Users,
  Plus,
  CheckCircle,
  Clock,
  X,
  Lock,
  ChevronRight,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

type Club = {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
};

export default function MyClubs() {
  const router = useRouter();

  const [joinedClubs, setJoinedClubs] = useState<Club[]>([]);
  const [pendingClubs, setPendingClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showClubModal, setShowClubModal] = useState(false);

  // Create club form states
  const [clubName, setClubName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({ type: "error", text1: "Please login first" });
        router.push("/(tabs)/dashboard");
        return;
      }

      await Promise.all([
        fetchJoinedClubs(user.id),
        fetchPendingClubs(user.id),
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function fetchJoinedClubs(userId: string) {
    const { data, error } = await supabase
      .from("club_members")
      .select("clubs(id, name, category, description, logo_url)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching joined clubs:", error);
      return;
    }

    const clubs = (data || [])
      .map((item: any) => item.clubs)
      .filter((club: any) => club !== null);
    setJoinedClubs(clubs);
  }

  async function fetchPendingClubs(userId: string) {
    const { data, error } = await supabase
      .from("club_requests")
      .select("clubs(id, name, category, description, logo_url)")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching pending clubs:", error);
      return;
    }

    const clubs = (data || [])
      .map((item: any) => item.clubs)
      .filter((club: any) => club !== null);
    setPendingClubs(clubs);
  }

  async function handleCreateClub() {
    if (!clubName.trim() || !category) {
      Toast.show({ type: "error", text1: "Please fill all required fields" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Toast.show({ type: "error", text1: "Please login first" });
      return;
    }

    const { data: newClub, error: clubError } = await supabase
      .from("clubs")
      .insert([
        {
          name: clubName.trim(),
          category,
          passcode: passcode.trim() || null,
          description: description.trim() || null,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (clubError || !newClub) {
      Toast.show({ type: "error", text1: "Failed to create club" });
      return;
    }

    await supabase.from("club_members").insert([
      {
        club_id: newClub.id,
        user_id: user.id,
        role: "admin",
      },
    ]);

    Toast.show({ type: "success", text1: "Club created successfully!" });
    resetForm();
    setShowCreateModal(false);
    loadData();

    // Navigate to the new club
    router.push(`/clubs/${newClub.id}`);
  }

  function resetForm() {
    setClubName("");
    setCategory("");
    setDescription("");
    setPasscode("");
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

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading your clubs...</Text>
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
            <Text style={styles.headerTitle}>My Clubs</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus color="#fff" size={24} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Your club memberships</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <CheckCircle color="#10b981" size={24} />
            </View>
            <Text style={styles.statLabel}>Joined Clubs</Text>
            <Text style={styles.statValue}>{joinedClubs.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Clock color="#f59e0b" size={24} />
            </View>
            <Text style={styles.statLabel}>Pending Requests</Text>
            <Text style={styles.statValue}>{pendingClubs.length}</Text>
          </View>
        </View>

        {/* Joined Clubs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Users color="#10b981" size={20} />
              <Text style={styles.sectionTitle}>Active Memberships</Text>
            </View>
            <Text style={styles.sectionCount}>{joinedClubs.length} clubs</Text>
          </View>

          {joinedClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Users color="rgba(255, 255, 255, 0.2)" size={48} />
              <Text style={styles.emptyText}>No clubs yet</Text>
              <Text style={styles.emptySubtext}>Join a club to connect with your community</Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push("/(tabs)/clubs")}
              >
                <Text style={styles.exploreButtonText}>Explore Clubs</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.clubsList}>
              {joinedClubs.map((club, index) => (
                <TouchableOpacity
                  key={club.id}
                  style={styles.clubCard}
                  onPress={() => router.push(`/clubs/${club.id}`)}
                >
                  <View style={styles.clubAvatar}>
                    <Text style={styles.clubEmoji}>{getCategoryIcon(club.category)}</Text>
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    {club.category && (
                      <Text style={styles.clubCategory}>{club.category}</Text>
                    )}
                    {club.description && (
                      <Text style={styles.clubDescription} numberOfLines={2}>
                        {club.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.statusBadge}>
                    <CheckCircle color="#10b981" size={16} />
                  </View>
                  <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Clock color="#f59e0b" size={20} />
              <Text style={styles.sectionTitle}>Pending Requests</Text>
            </View>
            <Text style={styles.sectionCount}>{pendingClubs.length} requests</Text>
          </View>

          {pendingClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock color="rgba(255, 255, 255, 0.2)" size={48} />
              <Text style={styles.emptyText}>No pending requests</Text>
              <Text style={styles.emptySubtext}>All your club requests have been processed</Text>
            </View>
          ) : (
            <View style={styles.clubsList}>
              {pendingClubs.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={[styles.clubCard, styles.pendingCard]}
                  onPress={() => {
                    setSelectedClub(club);
                    setShowClubModal(true);
                  }}
                >
                  <View style={[styles.clubAvatar, styles.pendingAvatar]}>
                    <Text style={styles.clubEmoji}>{getCategoryIcon(club.category)}</Text>
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    {club.category && (
                      <Text style={styles.clubCategory}>{club.category}</Text>
                    )}
                    {club.description && (
                      <Text style={styles.clubDescription} numberOfLines={2}>
                        {club.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.pendingBadge}>
                    <Clock color="#f59e0b" size={16} />
                  </View>
                  <ChevronRight color="rgba(255, 255, 255, 0.4)" size={20} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

      {/* Create Club Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Club</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Club Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter club name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={clubName}
                onChangeText={setClubName}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categorySelector}>
                {["Sports", "Arts", "Tech", "General"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell members about your club..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>
                <Lock color="rgba(255, 255, 255, 0.6)" size={16} />
                {" "}Passcode (Optional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Leave empty for open club"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={passcode}
                onChangeText={setPasscode}
                secureTextEntry
              />
              <Text style={styles.inputHint}>Members will need this passcode to join</Text>

              <TouchableOpacity
                style={styles.createClubButton}
                onPress={handleCreateClub}
                disabled={!clubName || !category}
              >
                <Text style={styles.createClubButtonText}>Create Club</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Club Detail Modal */}
      <Modal
        visible={showClubModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowClubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clubDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Club Details</Text>
              <TouchableOpacity onPress={() => setShowClubModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {selectedClub && (
              <View style={styles.clubDetailContent}>
                <View style={styles.clubDetailAvatar}>
                  <Text style={styles.clubDetailEmoji}>
                    {getCategoryIcon(selectedClub.category)}
                  </Text>
                </View>

                <Text style={styles.clubDetailName}>{selectedClub.name}</Text>
                {selectedClub.category && (
                  <Text style={styles.clubDetailCategory}>{selectedClub.category}</Text>
                )}

                {selectedClub.description && (
                  <View style={styles.clubDetailDescription}>
                    <Text style={styles.clubDetailDescriptionLabel}>Description</Text>
                    <Text style={styles.clubDetailDescriptionText}>
                      {selectedClub.description}
                    </Text>
                  </View>
                )}

                <View style={styles.clubDetailStatus}>
                  <Clock color="#f59e0b" size={24} />
                  <Text style={styles.clubDetailStatusText}>Request Pending</Text>
                </View>
              </View>
            )}
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  sectionCount: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  clubsList: {
    gap: 12,
  },
  clubCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    padding: 12,
    gap: 12,
  },
  pendingCard: {
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingAvatar: {
    backgroundColor: "#f59e0b",
  },
  clubEmoji: {
    fontSize: 28,
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
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 48,
    alignItems: "center",
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
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: "#a855f7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e1b4b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
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
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  input: {
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  inputHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: -12,
    marginBottom: 16,
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  categoryButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "white",
  },
  createClubButton: {
    backgroundColor: "#a855f7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  createClubButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  clubDetailModal: {
    backgroundColor: "#1e1b4b",
    borderRadius: 24,
    margin: 16,
    alignSelf: "center",
    width: "90%",
    maxWidth: 400,
  },
  clubDetailContent: {
    padding: 24,
    alignItems: "center",
  },
  clubDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  clubDetailEmoji: {
    fontSize: 40,
  },
  clubDetailName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  clubDetailCategory: {
    fontSize: 16,
    color: "#a855f7",
    marginBottom: 16,
  },
  clubDetailDescription: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  clubDetailDescriptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  clubDetailDescriptionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  clubDetailStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clubDetailStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f59e0b",
  },
});
