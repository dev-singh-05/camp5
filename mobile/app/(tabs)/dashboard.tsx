import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Coins } from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import { useDashboardData } from "../../hooks/useDashboardData";
import { Ads } from "../../components/Ads";
import { CampusNews } from "../../components/CampusNews";
import { Updates } from "../../components/Updates";
import { TokenBalanceModal } from "../../components/TokenBalanceModal";
import { TokenPurchaseModal } from "../../components/TokenPurchaseModal";
import { ConnectionRequests } from "../../components/ConnectionRequests";
import { ProfileEditModal } from "../../components/ProfileEditModal";
import type { NewsItem } from "../../types/dashboard";
import Toast from "react-native-toast-message";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tokenBalanceModalVisible, setTokenBalanceModalVisible] = useState(false);
  const [tokenPurchaseModalVisible, setTokenPurchaseModalVisible] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Use the dashboard data hook
  const {
    news,
    campusNews,
    profileData,
    tokenBalance,
    loading,
    markAsRead,
    dismissItem,
    clearAllUpdates,
    markNewsAsRead,
    refreshNews,
    refreshCampusNews,
    refreshProfile,
    refreshTokenBalance,
  } = useDashboardData(user?.id);

  useEffect(() => {
    loadUser();
  }, []);

  // Check for profile completion when profileData is loaded
  useEffect(() => {
    if (profileData && !loading) {
      // Check if required fields are missing
      if (
        !profileData.full_name ||
        !profileData.gender ||
        !profileData.year ||
        !profileData.branch
      ) {
        setShowOnboardingModal(true);
      }
    }
  }, [profileData, loading]);

  async function loadUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      refreshNews(),
      refreshCampusNews(),
      refreshProfile(),
      refreshTokenBalance(),
    ]);
    setRefreshing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Logged out successfully",
    });
    router.replace("/");
  }

  /**
   * Handle news item navigation
   */
  function handleNewsNavigation(item: NewsItem) {
    markAsRead(item.id);

    switch (item.type) {
      case "rating":
        router.push("/(tabs)/ratings");
        break;
      case "user_message":
        router.push("/(tabs)/ratings");
        break;
      case "dating_chat":
        if (item.meta?.matchId) {
          router.push(`/dating/chat/${item.meta.matchId}` as any);
        } else {
          router.push("/(tabs)/dating");
        }
        break;
      case "club_event":
      case "club_message":
        if (item.meta?.clubId) {
          router.push(`/(tabs)/clubs`);
        }
        break;
      case "campus_news":
        // Navigate to news detail if needed
        break;
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.profileAvatar}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.avatarText}>
                {profileData?.full_name?.[0]?.toUpperCase() || "?"}
              </Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Welcome to Campus5</Text>
              <Text style={styles.name}>{profileData?.full_name || "User"}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Token Balance */}
            <TouchableOpacity
              style={styles.tokenButton}
              onPress={() => setTokenBalanceModalVisible(true)}
            >
              <Coins color="#fbbf24" size={20} />
              <Text style={styles.tokenText}>{tokenBalance}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ads Component */}
        <Ads placement="dashboard" />

        {/* Connection Requests */}
        {user && <ConnectionRequests userId={user.id} />}

        {/* Campus News Component */}
        <CampusNews articles={campusNews} onArticleRead={markNewsAsRead} />

        {/* Updates/Notifications Component */}
        <Updates
          news={news}
          onDismiss={dismissItem}
          onClearAll={clearAllUpdates}
          onNavigate={handleNewsNavigation}
        />
      </ScrollView>

      {/* Token Balance Modal */}
      {user && (
        <TokenBalanceModal
          visible={tokenBalanceModalVisible}
          userId={user.id}
          onClose={() => setTokenBalanceModalVisible(false)}
          onAddTokens={() => setTokenPurchaseModalVisible(true)}
        />
      )}

      {/* Token Purchase Modal */}
      {user && (
        <TokenPurchaseModal
          visible={tokenPurchaseModalVisible}
          userId={user.id}
          onClose={() => setTokenPurchaseModalVisible(false)}
        />
      )}

      {/* Onboarding Modal - for first-time users */}
      {user && (
        <ProfileEditModal
          visible={showOnboardingModal}
          userId={user.id}
          onClose={() => {
            // Don't allow closing without completing required fields
            if (
              profileData?.full_name &&
              profileData?.gender &&
              profileData?.year &&
              profileData?.branch
            ) {
              setShowOnboardingModal(false);
            }
          }}
          onProfileUpdated={() => {
            refreshProfile();
            setShowOnboardingModal(false);
          }}
        />
      )}

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
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 12,
  },
  scrollContent: {
    padding: 12,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tokenButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  tokenText: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "600",
  },
});
