import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Eye } from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import type { CampusNewsArticle } from "../../types/dashboard";
import { NewsDetailModal } from "../../components/NewsDetailModal";

const CATEGORY_CONFIGS = {
  academic: { icon: "🎓", gradient: ["#06b6d4", "#0891b2"] },
  sports: { icon: "🏆", gradient: ["#10b981", "#059669"] },
  events: { icon: "📅", gradient: ["#a855f7", "#ec4899"] },
  default: { icon: "📢", gradient: ["#64748b", "#475569"] },
};

export default function AllNews() {
  const router = useRouter();
  const [news, setNews] = useState<CampusNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<CampusNewsArticle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAllNews();
  }, []);

  async function loadAllNews() {
    try {
      const { data, error } = await supabase
        .from("campus_news")
        .select("*")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error("Error loading news:", error);
    } finally {
      setLoading(false);
    }
  }

  const getCategoryConfig = (category: string) => {
    return (
      CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS] ||
      CATEGORY_CONFIGS.default
    );
  };

  async function handleArticleClick(article: CampusNewsArticle) {
    // Increment views
    await supabase.rpc("increment_news_views", { news_id: article.id });
    // Show detail modal
    setSelectedArticle(article);
    setModalVisible(true);
  }

  if (loading) {
    return (
      <LinearGradient
        colors={["#0f1729", "#1e1b4b", "#0f1729"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading news...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All News</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* News List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {news.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No news available</Text>
            <Text style={styles.emptySubtext}>
              Check back later for campus updates and announcements.
            </Text>
          </View>
        ) : (
          news.map((article) => {
            const config = getCategoryConfig(article.category);

            return (
              <TouchableOpacity
                key={article.id}
                style={styles.articleCard}
                onPress={() => handleArticleClick(article)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={config.gradient}
                  style={styles.articleGradient}
                >
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryIcon}>{config.icon}</Text>
                    <Text style={styles.categoryText}>
                      {article.category.charAt(0).toUpperCase() +
                        article.category.slice(1)}
                    </Text>
                  </View>

                  {/* Pinned Badge */}
                  {article.pinned && (
                    <View style={styles.pinnedBadge}>
                      <Text style={styles.pinnedText}>📌 Pinned</Text>
                    </View>
                  )}

                  {/* Article Content */}
                  <View style={styles.articleContent}>
                    <Text style={styles.articleTitle} numberOfLines={2}>
                      {article.title}
                    </Text>
                    {article.excerpt && (
                      <Text style={styles.articleExcerpt} numberOfLines={3}>
                        {article.excerpt}
                      </Text>
                    )}

                    {/* Article Meta */}
                    <View style={styles.articleMeta}>
                      <View style={styles.viewsContainer}>
                        <Eye color="rgba(255,255,255,0.6)" size={14} />
                        <Text style={styles.viewsText}>
                          {article.views.toLocaleString()} views
                        </Text>
                      </View>
                      <Text style={styles.dateText}>
                        {new Date(
                          article.published_at || article.created_at
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* News Detail Modal */}
      <NewsDetailModal
        visible={modalVisible}
        article={selectedArticle}
        onClose={() => setModalVisible(false)}
      />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  articleCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  articleGradient: {
    padding: 16,
    minHeight: 140,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  pinnedBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  pinnedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
    lineHeight: 20,
  },
  articleMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  dateText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
});
