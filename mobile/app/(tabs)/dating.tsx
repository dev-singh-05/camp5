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
import { getMyMatches } from "../../utils/dating";
import Toast from "react-native-toast-message";

export default function Dating() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

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

      // Fetch matches using the utility function
      const matchesData = await getMyMatches();
      setMatches(matchesData || []);

      setLoading(false);
    } catch (error) {
      console.error("Error loading dating data:", error);
      setLoading(false);
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
          <Text style={styles.headerTitle}>💖 Dating</Text>
          <Text style={styles.headerSubtitle}>Find your perfect match</Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/dating/random")}
          >
            <Text style={styles.actionIcon}>🎲</Text>
            <Text style={styles.actionTitle}>Random Match</Text>
            <Text style={styles.actionDescription}>Get matched with someone new</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/dating/interests")}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionTitle}>Interest Match</Text>
            <Text style={styles.actionDescription}>Find people with similar interests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/dating/dating-profiles")}
          >
            <Text style={styles.actionIcon}>👀</Text>
            <Text style={styles.actionTitle}>Browse Profiles</Text>
            <Text style={styles.actionDescription}>Explore dating profiles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/dating/requests")}
          >
            <Text style={styles.actionIcon}>📨</Text>
            <Text style={styles.actionTitle}>Requests</Text>
            <Text style={styles.actionDescription}>View connection requests</Text>
          </TouchableOpacity>
        </View>

        {/* Matches Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Matches ({matches.length})</Text>

          {matches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💔</Text>
              <Text style={styles.emptyText}>No matches yet</Text>
              <Text style={styles.emptySubtext}>
                Try random or interest-based matching to find someone special!
              </Text>
            </View>
          ) : (
            <View style={styles.matchesList}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  onPress={() => router.push(`/dating/chat/${match.id}`)}
                >
                  <View style={styles.matchAvatar}>
                    <Text style={styles.matchAvatarText}>
                      {match.match_type === "random" ? "🎲" : "🎯"}
                    </Text>
                  </View>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchType}>
                      {match.match_type === "random" ? "Random Match" : "Interest Match"}
                    </Text>
                    <Text style={styles.matchDate}>
                      {new Date(match.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.matchArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
    marginBottom: 24,
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
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  actionDescription: {
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
  matchesList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  matchAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  matchAvatarText: {
    fontSize: 24,
  },
  matchInfo: {
    flex: 1,
  },
  matchType: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  matchArrow: {
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
