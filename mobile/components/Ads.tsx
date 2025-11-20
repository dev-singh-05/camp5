import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';
import type { Ad } from '../types/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function Ads({ placement = 'dashboard' }: { placement?: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch ads from Supabase
   */
  const fetchAds = async () => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true)
        .eq('placement', placement)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (data) {
        setAds(data);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate dwell time based on priority
   */
  const getDwellTime = (priority: number): number => {
    return Math.max(1200, 3600 + priority * 900);
  };

  /**
   * Handle auto-rotation
   */
  useEffect(() => {
    if (ads.length <= 1) return;

    const currentAd = ads[currentIndex];
    const dwellTime = currentAd ? getDwellTime(currentAd.priority) : 5000;

    rotationTimerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, dwellTime);

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
    };
  }, [currentIndex, ads]);

  /**
   * Load ads on mount
   */
  useEffect(() => {
    fetchAds();
  }, [placement]);

  /**
   * Navigate to previous ad
   */
  const handlePrevious = () => {
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
    }
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  /**
   * Navigate to next ad
   */
  const handleNext = () => {
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
    }
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  /**
   * Open ad action URL
   */
  const handleLearnMore = async () => {
    const ad = ads[currentIndex];
    if (ad?.action_url) {
      try {
        await Linking.openURL(ad.action_url);
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      </View>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>📢</Text>
        <Text style={styles.title}>Ads</Text>
      </View>

      <View style={styles.carouselContainer}>
        {/* Ad Image/Content */}
        <View style={styles.adContent}>
          {currentAd.image_path ? (
            <Image
              source={{ uri: currentAd.image_path }}
              style={styles.adImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.adPlaceholder}>
              <Text style={styles.adPlaceholderText}>No Image</Text>
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <View style={styles.adInfo}>
              {currentAd.title && (
                <Text style={styles.adTitle} numberOfLines={2}>
                  {currentAd.title}
                </Text>
              )}
              {currentAd.body && (
                <Text style={styles.adBody} numberOfLines={2}>
                  {currentAd.body}
                </Text>
              )}
            </View>
          </LinearGradient>

          {/* Navigation Arrows */}
          {ads.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={handlePrevious}
              >
                <ChevronLeft color="#fff" size={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={handleNext}
              >
                <ChevronRight color="#fff" size={24} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Testimonials Section */}
        <View style={styles.testimonialsContainer}>
          <Text style={styles.testimonialsTitle}>Testimonials</Text>
          <Text style={styles.testimonialsText}>Give 30 percent more</Text>
        </View>

        {/* Sponsored Badge and CTA */}
        <View style={styles.footer}>
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>

          {currentAd.action_url && (
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={handleLearnMore}
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
              <ExternalLink color="#fff" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Pagination Dots */}
        {ads.length > 1 && (
          <View style={styles.pagination}>
            {ads.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
                onPress={() => {
                  if (rotationTimerRef.current) {
                    clearTimeout(rotationTimerRef.current);
                  }
                  setCurrentIndex(index);
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  carouselContainer: {
    marginHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  adContent: {
    position: 'relative',
    height: 220,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  adInfo: {
    gap: 4,
  },
  adTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  adBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  testimonialsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  testimonialsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  testimonialsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sponsoredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sponsoredText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#a855f7',
    borderRadius: 20,
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#a855f7',
  },
});
