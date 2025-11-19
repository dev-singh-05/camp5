import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Eye, Calendar } from 'lucide-react-native';
import type { CampusNewsArticle } from '../types/dashboard';

type NewsDetailModalProps = {
  visible: boolean;
  article: CampusNewsArticle | null;
  onClose: () => void;
};

const CATEGORY_CONFIGS = {
  academic: { icon: '🎓', gradient: ['#06b6d4', '#0891b2'] },
  sports: { icon: '🏆', gradient: ['#10b981', '#059669'] },
  events: { icon: '📅', gradient: ['#a855f7', '#ec4899'] },
  default: { icon: '📢', gradient: ['#64748b', '#475569'] },
};

export function NewsDetailModal({ visible, article, onClose }: NewsDetailModalProps) {
  if (!article) return null;

  const config =
    CATEGORY_CONFIGS[article.category as keyof typeof CATEGORY_CONFIGS] ||
    CATEGORY_CONFIGS.default;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0f1729', '#1e1b4b', '#0f1729']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>News Details</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Category Badge */}
              <LinearGradient colors={config.gradient} style={styles.categoryBanner}>
                <Text style={styles.categoryIcon}>{config.icon}</Text>
                <Text style={styles.categoryText}>
                  {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                </Text>
                {article.pinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>📌 Pinned</Text>
                  </View>
                )}
              </LinearGradient>

              {/* Title */}
              <Text style={styles.title}>{article.title}</Text>

              {/* Meta Info */}
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Calendar color="rgba(255,255,255,0.6)" size={16} />
                  <Text style={styles.metaText}>
                    {new Date(
                      article.published_at || article.created_at
                    ).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Eye color="rgba(255,255,255,0.6)" size={16} />
                  <Text style={styles.metaText}>
                    {article.views.toLocaleString()} views
                  </Text>
                </View>
              </View>

              {/* Excerpt */}
              {article.excerpt && (
                <View style={styles.excerptContainer}>
                  <Text style={styles.excerpt}>{article.excerpt}</Text>
                </View>
              )}

              {/* Content */}
              <View style={styles.contentContainer}>
                <Text style={styles.contentText}>{article.content}</Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pinnedBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  pinnedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  excerptContainer: {
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#a855f7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  excerpt: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  contentContainer: {
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
  },
});
