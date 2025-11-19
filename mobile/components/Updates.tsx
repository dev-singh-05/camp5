import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  Heart,
  Calendar,
  Users,
  Newspaper,
  X,
} from 'lucide-react-native';
import type { NewsItem, NewsType } from '../types/dashboard';
import { useRouter } from 'expo-router';

type UpdatesProps = {
  news: NewsItem[];
  onDismiss: (itemId: string) => void;
  onClearAll: () => void;
  onNavigate: (item: NewsItem) => void;
};

const NEWS_TYPE_CONFIG: Record<
  NewsType,
  { icon: any; color: string; label: string }
> = {
  rating: {
    icon: Star,
    color: '#fbbf24',
    label: 'Rating',
  },
  user_message: {
    icon: MessageCircle,
    color: '#3b82f6',
    label: 'Message',
  },
  dating_chat: {
    icon: Heart,
    color: '#ec4899',
    label: 'Dating',
  },
  club_event: {
    icon: Calendar,
    color: '#8b5cf6',
    label: 'Event',
  },
  club_message: {
    icon: Users,
    color: '#10b981',
    label: 'Club',
  },
  campus_news: {
    icon: Newspaper,
    color: '#06b6d4',
    label: 'News',
  },
};

export function Updates({ news, onDismiss, onClearAll, onNavigate }: UpdatesProps) {
  const [expanded, setExpanded] = useState(true);

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderNewsIcon = (type: NewsType) => {
    const config = NEWS_TYPE_CONFIG[type];
    const IconComponent = config.icon;
    return <IconComponent color={config.color} size={20} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>📊</Text>
          <Text style={styles.headerTitle}>Updates</Text>
          {news.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{news.length}</Text>
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
        {news.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={onClearAll}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {expanded && (
        <View style={styles.content}>
          {news.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No new updates</Text>
              <Text style={styles.emptySubtext}>
                You're all caught up! Check back later for new notifications.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {news.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.newsItem}
                  onPress={() => onNavigate(item)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(168,85,247,0.1)', 'rgba(0,0,0,0.2)']}
                    style={styles.newsItemGradient}
                  >
                    {/* Icon */}
                    <View style={styles.newsIcon}>{renderNewsIcon(item.type)}</View>

                    {/* Content */}
                    <View style={styles.newsContent}>
                      <View style={styles.newsHeader}>
                        <Text style={styles.newsTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.newsTime}>
                          {formatTimeAgo(item.created_at)}
                        </Text>
                      </View>
                      {item.body && (
                        <Text style={styles.newsBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                      )}
                      <View style={styles.newsFooter}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>
                            {NEWS_TYPE_CONFIG[item.type].label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Dismiss Button */}
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onDismiss(item.id);
                      }}
                    >
                      <X color="rgba(255,255,255,0.5)" size={16} />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
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
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
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
    backgroundColor: '#a855f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
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
  newsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    flex: 1,
    gap: 4,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  newsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  newsTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  newsBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '600',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
