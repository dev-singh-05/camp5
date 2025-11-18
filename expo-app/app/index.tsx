import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Users, Heart, Star, Coins, Menu } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard() {
  const [profileName, setProfileName] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(150); // Demo value

  const NavigationCard = ({
    icon: Icon,
    title,
    subtitle,
    colors,
    onPress
  }: {
    icon: any;
    title: string;
    subtitle: string;
    colors: string[];
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={styles.navCard}
      activeOpacity={0.8}
    >
      <View style={styles.navCardContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors[0] }]}>
          <Icon size={32} color="white" />
        </View>
        <View style={styles.navTextContainer}>
          <Text style={styles.navTitle}>{title}</Text>
          <Text style={styles.navSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Welcome to Campus5</Text>

          <View style={styles.headerActions}>
            {/* Token Balance */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tokenButton}
            >
              <Coins size={16} color="#fbbf24" />
              <Text style={styles.tokenText}>{tokenBalance}</Text>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.profileButton}
            >
              <Text style={styles.profileText}>
                {profileName?.charAt(0) || 'U'}
              </Text>
            </TouchableOpacity>

            {/* Menu */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.menuButton}
            >
              <Menu size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navigation Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          <NavigationCard
            icon={Users}
            title="Clubs"
            subtitle="Community"
            colors={['#a855f7']}
            onPress={() => console.log('Navigate to Clubs')}
          />

          <NavigationCard
            icon={Heart}
            title="Dating"
            subtitle="Connect"
            colors={['#ec4899']}
            onPress={() => console.log('Navigate to Dating')}
          />

          <NavigationCard
            icon={Star}
            title="Ratings"
            subtitle="Leaderboard"
            colors={['#06b6d4']}
            onPress={() => console.log('Navigate to Ratings')}
          />
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ec4899' }]}>0</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#06b6d4' }]}>0</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  navCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  navCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  navTextContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  navSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#a855f7',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
});
