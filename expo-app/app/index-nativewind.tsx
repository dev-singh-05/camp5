import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Users, Heart, Star, Coins, Menu, Bell, TrendingUp, Calendar } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

type NewsItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  created_at: string;
};

export default function Dashboard() {
  const [profileName, setProfileName] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, tokens')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileName(profile.full_name);
          setTokenBalance(profile.tokens || 0);
        }

        // Fetch news
        const { data: newsData } = await supabase
          .from('news')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (newsData) {
          setNews(newsData);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const NavigationCard = ({
    icon: Icon,
    title,
    subtitle,
    colors,
    delay,
    onPress
  }: {
    icon: any;
    title: string;
    subtitle: string;
    colors: string[];
    delay: number;
    onPress: () => void;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      className="mb-4"
    >
      <TouchableOpacity
        onPress={onPress}
        className="relative overflow-hidden rounded-3xl"
        activeOpacity={0.8}
      >
        <View className={`${colors[0]} p-6 border ${colors[1]}`}>
          <View className="flex-col items-center space-y-3">
            <View className={`w-16 h-16 rounded-2xl ${colors[2]} items-center justify-center`}>
              <Icon size={32} color="white" />
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-white mb-1">{title}</Text>
              <Text className="text-xs text-white/60">{subtitle}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const NewsCard = ({ item, index }: { item: NewsItem; index: number }) => {
    const getNewsIcon = () => {
      switch (item.type) {
        case 'rating':
          return <Star size={16} color="#fbbf24" />;
        case 'dating_chat':
          return <Heart size={16} color="#ec4899" />;
        case 'club_event':
          return <Calendar size={16} color="#8b5cf6" />;
        default:
          return <Bell size={16} color="#60a5fa" />;
      }
    };

    return (
      <Animated.View
        entering={FadeIn.delay(index * 100)}
        className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-3"
      >
        <View className="flex-row items-start gap-3">
          <View className="mt-1">
            {getNewsIcon()}
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm mb-1">{item.title}</Text>
            {item.body && (
              <Text className="text-white/60 text-xs">{item.body}</Text>
            )}
            <Text className="text-white/40 text-xs mt-2">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-lg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-black/20 border-b border-white/5 pt-12 pb-4 px-4">
        <View className="flex-row items-center justify-between">
          <Animated.View entering={FadeIn.delay(100)}>
            <Text className="text-2xl font-bold text-white">
              Welcome to Campus5
            </Text>
          </Animated.View>

          <View className="flex-row items-center gap-3">
            {/* Token Balance */}
            <Animated.View entering={FadeIn.delay(200)}>
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30"
              >
                <Coins size={16} color="#fbbf24" />
                <Text className="text-sm font-semibold text-yellow-400">{tokenBalance}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Profile */}
            <Animated.View entering={FadeIn.delay(300)}>
              <TouchableOpacity
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">
                  {profileName?.charAt(0) || 'U'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Menu */}
            <Animated.View entering={FadeIn.delay(400)}>
              <TouchableOpacity
                activeOpacity={0.8}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
              >
                <Menu size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Cards */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-4">Quick Access</Text>

          <NavigationCard
            icon={Users}
            title="Clubs"
            subtitle="Community"
            colors={[
              'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
              'border-purple-500/30',
              'bg-gradient-to-br from-purple-500 to-pink-500'
            ]}
            delay={100}
            onPress={() => console.log('Navigate to Clubs')}
          />

          <NavigationCard
            icon={Heart}
            title="Dating"
            subtitle="Connect"
            colors={[
              'bg-gradient-to-br from-pink-500/20 to-rose-500/20',
              'border-pink-500/30',
              'bg-gradient-to-br from-pink-500 to-rose-500'
            ]}
            delay={200}
            onPress={() => console.log('Navigate to Dating')}
          />

          <NavigationCard
            icon={Star}
            title="Ratings"
            subtitle="Leaderboard"
            colors={[
              'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
              'border-cyan-500/30',
              'bg-gradient-to-br from-cyan-500 to-blue-500'
            ]}
            delay={300}
            onPress={() => console.log('Navigate to Ratings')}
          />
        </View>

        {/* News Section */}
        {news.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold">Updates</Text>
              <TouchableOpacity>
                <Text className="text-purple-400 text-sm">See all</Text>
              </TouchableOpacity>
            </View>

            {news.slice(0, 5).map((item, index) => (
              <NewsCard key={item.id} item={item} index={index} />
            ))}
          </View>
        )}

        {/* Stats Section */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Your Stats</Text>

          <View className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-3xl font-bold text-purple-400">0</Text>
                <Text className="text-white/60 text-xs mt-1">Connections</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-pink-400">0</Text>
                <Text className="text-white/60 text-xs mt-1">Matches</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-cyan-400">0</Text>
                <Text className="text-white/60 text-xs mt-1">Points</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
