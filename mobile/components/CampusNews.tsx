import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { ChevronDown, ChevronUp, Sparkles, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { CampusNewsArticle } from '../types/dashboard';
import { NewsDetailModal } from './NewsDetailModal';

type CampusNewsProps = {
  articles: CampusNewsArticle[];
  onArticleRead: (articleId: string) => void;
};

const CATEGORY_CONFIGS = {
  academic: { icon: '🎓', color: '#06b6d4' },
  sports: { icon: '🏆', color: '#10b981' },
  events: { icon: '📅', color: '#a855f7' },
  default: { icon: '📢', color: '#64748b' },
};

const ROTATION_INTERVAL = 5000; // 5 seconds

export function CampusNews({ articles, onArticleRead }: CampusNewsProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<CampusNewsArticle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Separate pinned and new articles
  const pinnedArticles = articles.filter((a) => a.pinned);
  const newArticles = articles.filter((a) => !a.pinned);

  // Rotation indices
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [currentNewIndex, setCurrentNewIndex] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Auto-rotation effect
  useEffect(() => {
    if (!expanded) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update indices
        if (pinnedArticles.length > 1) {
          setCurrentPinnedIndex((prev) => (prev + 1) % pinnedArticles.length);
        }
        if (newArticles.length > 1) {
          setCurrentNewIndex((prev) => (prev + 1) % newArticles.length);
        }

        // Reset position and fade in
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [expanded, pinnedArticles.length, newArticles.length]);

  const getCategoryConfig = (category: string) => {
    return (
      CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS] ||
      CATEGORY_CONFIGS.default
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleArticleClick = (article: CampusNewsArticle) => {
    setSelectedArticle(article);
    setModalVisible(true);
    onArticleRead(article.id);
  };

  // Count new articles (published in last 3 days)
  const newCount = articles.filter((article) => {
    const publishedDate = new Date(article.published_at || article.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return publishedDate > threeDaysAgo;
  }).length;

  if (articles.length === 0) {
    return null;
  }

  // Get current articles to display
  const currentPinned = pinnedArticles.length > 0 ? pinnedArticles[currentPinnedIndex] : null;
  const currentNew = newArticles.length > 0 ? newArticles[currentNewIndex] : null;
  const displayArticles = [currentPinned, currentNew].filter(Boolean) as CampusNewsArticle[];

  const renderArticle = (article: CampusNewsArticle) => {
    const config = getCategoryConfig(article.category);
    const isNew =
      new Date(article.published_at || article.created_at) >
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    return (
      <Animated.View
        key={article.id}
        style={[
          styles.newsItem,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.newsItemButton}
          onPress={() => handleArticleClick(article)}
          activeOpacity={0.7}
        >
          <View style={styles.newsItemContent}>
            {/* Icon/Category */}
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: `${config.color}20` },
              ]}
            >
              <Text style={styles.categoryIconText}>{config.icon}</Text>
            </View>

            {/* Content */}
            <View style={styles.newsContent}>
              <View style={styles.newsHeader}>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: `${config.color}20` },
                    ]}
                  >
                    <Text style={[styles.categoryBadgeText, { color: config.color }]}>
                      {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                    </Text>
                  </View>
                  {article.pinned && (
                    <View style={styles.pinnedBadge}>
                      <Text style={styles.pinnedBadgeText}>📌</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.newsTitle} numberOfLines={2}>
                {article.title}
              </Text>

              {article.excerpt && (
                <Text style={styles.newsExcerpt} numberOfLines={2}>
                  {article.excerpt}
                </Text>
              )}

              <View style={styles.newsFooter}>
                <View style={styles.viewsContainer}>
                  <Eye color="rgba(255,255,255,0.5)" size={12} />
                  <Text style={styles.viewsText}>{article.views.toLocaleString()}</Text>
                </View>
                <Text style={styles.dateText}>
                  {formatDate(article.published_at || article.created_at)}
                </Text>
                {isNew && <Sparkles color="#fbbf24" size={14} />}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerIcon}>📰</Text>
            <Text style={styles.headerTitle}>News</Text>
            {newCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newCount} new</Text>
              </View>
            )}
            <View style={styles.chevron}>
              {expanded ? (
                <ChevronUp color="rgba(255,255,255,0.6)" size={20} />
              ) : (
                <ChevronDown color="rgba(255,255,255,0.6)" size={20} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/news/all' as any)}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {expanded && (
          <View style={styles.content}>
            {displayArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No new news</Text>
              </View>
            ) : (
              <View style={styles.newsListContainer}>
                {displayArticles.map((article) => renderArticle(article))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* News Detail Modal */}
      <NewsDetailModal
        visible={modalVisible}
        article={selectedArticle}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginLeft: 'auto',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  badge: {
    backgroundColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a855f7',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  newsListContainer: {
    padding: 12,
    gap: 8,
  },
  newsItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newsItemButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  newsItemContent: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    fontSize: 20,
  },
  newsContent: {
    flex: 1,
    gap: 4,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  pinnedBadgeText: {
    fontSize: 10,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
  },
  newsExcerpt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
});
