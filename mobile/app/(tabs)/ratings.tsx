import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";

export default function Ratings() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [myRatings, setMyRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

      // Load users to rate
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, enrollment_number, year, branch")
        .neq("id", user.id)
        .limit(20);

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load my given ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("*, to_user:profiles!ratings_to_user_id_fkey(full_name)")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false });

      if (ratingsError) throw ratingsError;
      setMyRatings(ratingsData || []);

      setLoading(false);
    } catch (error) {
      console.error("Error loading ratings:", error);
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.enrollment_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
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
          <Text style={styles.headerTitle}>⭐ Ratings</Text>
          <Text style={styles.headerSubtitle}>Rate your peers anonymously</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            Rate your peers on 5 dimensions: Confidence, Humbleness, Friendliness, Intelligence,
            and Communication. All ratings are anonymous!
          </Text>
        </View>

        {/* My Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Ratings ({myRatings.length})</Text>
          {myRatings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No ratings given yet</Text>
            </View>
          ) : (
            <View style={styles.ratingsList}>
              {myRatings.slice(0, 3).map((rating) => (
                <View key={rating.id} style={styles.ratingCard}>
                  <Text style={styles.ratingName}>{rating.to_user?.full_name || "User"}</Text>
                  <View style={styles.ratingDimensions}>
                    <Text style={styles.ratingDimension}>
                      💪 Confidence: {rating.confidence || 0}/5
                    </Text>
                    <Text style={styles.ratingDimension}>
                      🙏 Humbleness: {rating.humbleness || 0}/5
                    </Text>
                    <Text style={styles.ratingDimension}>
                      😊 Friendliness: {rating.friendliness || 0}/5
                    </Text>
                    <Text style={styles.ratingDimension}>
                      🧠 Intelligence: {rating.intelligence || 0}/5
                    </Text>
                    <Text style={styles.ratingDimension}>
                      💬 Communication: {rating.communication || 0}/5
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Rate Others */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Students</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or enrollment..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              {filteredUsers.slice(0, 10).map((targetUser) => (
                <TouchableOpacity
                  key={targetUser.id}
                  style={styles.userCard}
                  onPress={() => {
                    Toast.show({
                      type: "info",
                      text1: "Rating Feature",
                      text2: "Full rating form coming in production version",
                    });
                  }}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {targetUser.full_name?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{targetUser.full_name}</Text>
                    <Text style={styles.userDetails}>
                      {targetUser.year} • {targetUser.branch}
                    </Text>
                  </View>
                  <Text style={styles.userArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Leaderboard Button */}
        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() => {
            Toast.show({
              type: "info",
              text1: "Leaderboard",
              text2: "Full leaderboard coming in production version",
            });
          }}
        >
          <Text style={styles.leaderboardButtonText}>🏆 View Leaderboard</Text>
        </TouchableOpacity>
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  infoCard: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderLeftWidth: 4,
    borderLeftColor: "#a855f7",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
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
  },
  ratingsList: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  ratingName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  ratingDimensions: {
    gap: 8,
  },
  ratingDimension: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
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
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  userArrow: {
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.4)",
  },
  leaderboardButton: {
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  leaderboardButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
