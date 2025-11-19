import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import type { CampusNewsArticle } from '../types/dashboard';

type NewsSectionProps = {
  articles: CampusNewsArticle[];
  onArticleClick: (article: CampusNewsArticle) => void;
};

const CATEGORY_CONFIGS = {
  academic: { icon: '🎓', color: '#06b6d4' },
  sports: { icon: '🏆', color: '#10b981' },
  events: { icon: '📅', color: '#a855f7' },
  default: { icon: '📢', color: '#64748b' },
};

export function NewsSection({ articles, onArticleClick }: NewsSectionProps) {
  const [expanded, setExpanded] = useState(true);

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

  // Count new articles (published in last 3 days)
  const newCount = articles.filter((article) => {
    const publishedDate = new Date(article.published_at || article.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return publishedDate > threeDaysAgo;
  }).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📰</Text>
          <Text style={styles.headerTitle}>News</Text>
          {newCount > 0 && (
            <View style={styles.badge}>
              <Sparkles color="#fff" size={12} />
              <Text style={styles.badgeText}>{newCount} new</Text>
            </View>
          )}
        </View>
        <View>
          {expanded ? (
            <ChevronUp color="rgba(255,255,255,0.6)" size={20} />
          ) : (
            <ChevronDown color="rgba(255,255,255,0.6)" size={20} />
          )}
        </View>
      </TouchableOpacity>

      {/* Content */}
      {expanded && (
        <View style={styles.content}>
          {articles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No news available</Text>
              <Text style={styles.emptySubtext}>
                Check back later for campus updates and announcements.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {articles.map((article) => {
                const config = getCategoryConfig(article.category);
                const isNew =
                  new Date(article.published_at || article.created_at) >
                  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

                return (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.newsItem}
                    onPress={() => onArticleClick(article)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(168,85,247,0.05)', 'rgba(0,0,0,0.1)']}
                      style={styles.newsItemGradient}
                    >
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
                          <Text style={styles.newsTitle} numberOfLines={2}>
                            {article.title}
                          </Text>
                        </View>

                        {article.excerpt && (
                          <Text style={styles.newsExcerpt} numberOfLines={2}>
                            {article.excerpt}
                          </Text>
                        )}

                        <View style={styles.newsFooter}>
                          <View style={styles.categoryBadge}>
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: config.color },
                              ]}
                            >
                              {article.category.charAt(0).toUpperCase() +
                                article.category.slice(1)}
                            </Text>
                          </View>

                          <Text style={styles.dateText}>
                            {formatDate(article.published_at || article.created_at)}
                          </Text>

                          {isNew && (
                            <View style={styles.newBadge}>
                              <Sparkles color="#fbbf24" size={12} />
                            </View>
                          )}
                        </View>

                        {/* Pinned Badge */}
                        {article.pinned && (
                          <View style={styles.pinnedBadge}>
                            <Text style={styles.pinnedText}>📌 Pinned</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 16,
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
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  list: {
    maxHeight: 500,
  },
  newsItem: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  newsItemGradient: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    fontSize: 24,
  },
  newsContent: {
    flex: 1,
    gap: 6,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  newsTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  newsExcerpt: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  newBadge: {
    marginLeft: 'auto',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(168,85,247,0.3)',
    borderRadius: 8,
  },
  pinnedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
});
