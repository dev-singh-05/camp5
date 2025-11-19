import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";
import { ProfileEditModal } from "../../components/ProfileEditModal";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    matches: 0,
    clubs: 0,
    ratingsGiven: 0,
    ratingsReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load stats
      const [matchesResult, clubsResult, ratingsGivenResult, ratingsReceivedResult] =
        await Promise.all([
          supabase
            .from("dating_matches")
            .select("id", { count: "exact" })
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
          supabase
            .from("club_members")
            .select("id", { count: "exact" })
            .eq("user_id", user.id),
          supabase
            .from("ratings")
            .select("id", { count: "exact" })
            .eq("from_user_id", user.id),
          supabase.from("ratings").select("id", { count: "exact" }).eq("to_user_id", user.id),
        ]);

      setStats({
        matches: matchesResult.count || 0,
        clubs: clubsResult.count || 0,
        ratingsGiven: ratingsGivenResult.count || 0,
        ratingsReceived: ratingsReceivedResult.count || 0,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Logged out successfully",
    });
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const xp = profile?.avg_overall_xp || 0;

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || "User"}</Text>
          <Text style={styles.enrollment}>{profile?.enrollment_number || "N/A"}</Text>
          <Text style={styles.email}>{profile?.college_email || "N/A"}</Text>
        </View>

        {/* XP Card */}
        <View style={styles.xpCard}>
          <Text style={styles.xpLabel}>Total XP</Text>
          <Text style={styles.xpValue}>{xp.toFixed(1)}</Text>
          <View style={styles.xpBar}>
            <View style={[styles.xpBarFill, { width: `${Math.min(xp * 2, 100)}%` }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.matches}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.clubs}</Text>
            <Text style={styles.statLabel}>Clubs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.ratingsGiven}</Text>
            <Text style={styles.statLabel}>Ratings Given</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.ratingsReceived}</Text>
            <Text style={styles.statLabel}>Ratings Received</Text>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Year:</Text>
              <Text style={styles.infoValue}>{profile?.year || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Branch:</Text>
              <Text style={styles.infoValue}>{profile?.branch || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>{profile?.gender || "Not set"}</Text>
            </View>
            {profile?.interests && profile.interests.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Interests:</Text>
                <Text style={styles.infoValue}>{profile.interests.join(", ")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      {user && (
        <ProfileEditModal
          visible={editModalVisible}
          userId={user.id}
          onClose={() => setEditModalVisible(false)}
          onProfileUpdated={loadData}
        />
      )}

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
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  enrollment: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
  xpCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  xpLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  xpValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#a855f7",
    marginBottom: 16,
  },
  xpBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: "#a855f7",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#a855f7",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  infoValue: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
