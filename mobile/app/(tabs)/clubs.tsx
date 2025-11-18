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

const CATEGORIES = ["All", "Sports", "Arts", "Tech", "General"];

export default function Clubs() {
  const router = useRouter();
  const [clubs, setClubs] = useState<any[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [searchQuery, selectedCategory, clubs]);

  async function loadClubs() {
    try {
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
          <Text style={styles.headerTitle}>👥 Clubs</Text>
          <Text style={styles.headerSubtitle}>Join your campus communities</Text>
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
                  onPress={() => router.push(`/clubs/${club.id}`)}
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
                  </View>
                  <Text style={styles.clubArrow}>→</Text>
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
});
