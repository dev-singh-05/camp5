import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { NewsItem, CampusNewsArticle, Profile } from '../types/dashboard';
import {
  getStorageArray,
  addToStorageArray,
  STORAGE_KEYS,
  getStorageBoolean,
} from '../utils/storage';

export function useDashboardData(userId: string | undefined) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [campusNews, setCampusNews] = useState<CampusNewsArticle[]>([]);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Refs for dismissed/read items (prevents re-renders)
  const dismissedItemsRef = useRef<string[]>([]);
  const readItemsRef = useRef<string[]>([]);
  const readNewsRef = useRef<string[]>([]);

  // Timeout refs for debouncing real-time updates
  const newsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const campusNewsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load initial news (ratings, messages, dating chats, club events)
   */
  const loadInitialNews = useCallback(async () => {
    if (!userId) return;

    try {
      const newsItems: NewsItem[] = [];

      // Get notification preferences
      const [
        notificationsPaused,
        ratingsMsgEnabled,
        datingMsgEnabled,
        clubsMsgEnabled,
      ] = await Promise.all([
        getStorageBoolean(STORAGE_KEYS.NOTIFICATIONS_PAUSED, false),
        getStorageBoolean(STORAGE_KEYS.RATINGS_MSG_ENABLED, true),
        getStorageBoolean(STORAGE_KEYS.DATING_MSG_ENABLED, true),
        getStorageBoolean(STORAGE_KEYS.CLUBS_MSG_ENABLED, true),
      ]);

      if (notificationsPaused) {
        return;
      }

      // Load dismissed and read items from storage
      const [dismissed, read] = await Promise.all([
        getStorageArray(STORAGE_KEYS.DISMISSED_NEWS),
        getStorageArray(STORAGE_KEYS.READ_UPDATES),
      ]);

      dismissedItemsRef.current = dismissed;
      readItemsRef.current = read;

      // Fetch ratings received
      if (ratingsMsgEnabled) {
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('id, from_user_id, created_at, comment')
          .eq('to_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (ratingsData) {
          ratingsData.forEach((rating) => {
            if (!dismissed.includes(rating.id) && !read.includes(rating.id)) {
              newsItems.push({
                id: rating.id,
                type: 'rating',
                title: 'Someone rated you ⭐',
                body: rating.comment || undefined,
                created_at: rating.created_at,
                meta: { fromUserId: rating.from_user_id },
              });
            }
          });
        }
      }

      // Fetch user messages
      if (ratingsMsgEnabled) {
        const { data: messagesData } = await supabase
          .from('user_messages')
          .select('id, from_user_id, content, created_at, profiles!user_messages_from_user_id_fkey(full_name)')
          .eq('to_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (messagesData) {
          messagesData.forEach((msg: any) => {
            if (!dismissed.includes(msg.id) && !read.includes(msg.id)) {
              newsItems.push({
                id: msg.id,
                type: 'user_message',
                title: `Message from ${msg.profiles?.full_name || 'Someone'}`,
                body: msg.content,
                created_at: msg.created_at,
                meta: { fromUserId: msg.from_user_id },
              });
            }
          });
        }
      }

      // Fetch dating chats
      if (datingMsgEnabled) {
        const { data: datingData } = await supabase
          .from('dating_chats')
          .select(`
            id,
            match_id,
            sender_id,
            message,
            created_at,
            dating_matches!inner(user1_id, user2_id)
          `)
          .or(`dating_matches.user1_id.eq.${userId},dating_matches.user2_id.eq.${userId}`)
          .neq('sender_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (datingData) {
          datingData.forEach((chat: any) => {
            if (!dismissed.includes(chat.id) && !read.includes(chat.id)) {
              newsItems.push({
                id: chat.id,
                type: 'dating_chat',
                title: 'Dating chat message',
                body: chat.message,
                created_at: chat.created_at,
                meta: { matchId: chat.match_id },
              });
            }
          });
        }
      }

      // Fetch club events
      if (clubsMsgEnabled) {
        const { data: clubMemberships } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', userId)
          .eq('status', 'joined');

        if (clubMemberships && clubMemberships.length > 0) {
          const clubIds = clubMemberships.map((m) => m.club_id);

          const { data: eventsData } = await supabase
            .from('events')
            .select('id, club_id, title, created_at')
            .in('club_id', clubIds)
            .order('created_at', { ascending: false })
            .limit(50);

          if (eventsData) {
            eventsData.forEach((event) => {
              if (!dismissed.includes(event.id) && !read.includes(event.id)) {
                newsItems.push({
                  id: event.id,
                  type: 'club_event',
                  title: `New event: ${event.title}`,
                  created_at: event.created_at,
                  meta: { clubId: event.club_id },
                });
              }
            });
          }

          // Fetch club messages
          const { data: clubMessagesData } = await supabase
            .from('messages')
            .select('id, club_id, user_id, content, created_at, profiles!messages_user_id_fkey(full_name)')
            .in('club_id', clubIds)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (clubMessagesData) {
            clubMessagesData.forEach((msg: any) => {
              if (!dismissed.includes(msg.id) && !read.includes(msg.id)) {
                newsItems.push({
                  id: msg.id,
                  type: 'club_message',
                  title: `Club: ${msg.club_id} • ${msg.profiles?.full_name || 'Someone'}`,
                  body: msg.content,
                  created_at: msg.created_at,
                  meta: { clubId: msg.club_id },
                });
              }
            });
          }
        }
      }

      // Sort by created_at descending, limit to 200 items
      newsItems.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNews(newsItems.slice(0, 200));
    } catch (error) {
      console.error('Error loading initial news:', error);
    }
  }, [userId]);

  /**
   * Load campus news articles
   */
  const loadCampusNews = useCallback(async () => {
    try {
      const campusNewsEnabled = await getStorageBoolean(
        STORAGE_KEYS.CAMPUS_NEWS_ENABLED,
        true
      );

      if (!campusNewsEnabled) {
        return;
      }

      const { data } = await supabase
        .from('campus_news')
        .select('*')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(6);

      if (data) {
        setCampusNews(data);
      }
    } catch (error) {
      console.error('Error loading campus news:', error);
    }
  }, []);

  /**
   * Load user profile data
   */
  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, gender, year, branch, profile_completed, location, hometown')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfileData(data as Profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [userId]);

  /**
   * Load token balance
   */
  const loadTokenBalance = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      setTokenBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  }, [userId]);

  /**
   * Mark news item as read
   */
  const markAsRead = useCallback(async (itemId: string) => {
    await addToStorageArray(STORAGE_KEYS.READ_UPDATES, itemId);
    readItemsRef.current.push(itemId);
    setNews((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Dismiss news item
   */
  const dismissItem = useCallback(async (itemId: string) => {
    await addToStorageArray(STORAGE_KEYS.DISMISSED_NEWS, itemId);
    dismissedItemsRef.current.push(itemId);
    setNews((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Mark campus news as read
   */
  const markNewsAsRead = useCallback(async (articleId: string) => {
    await addToStorageArray(STORAGE_KEYS.READ_NEWS, articleId);
    readNewsRef.current.push(articleId);

    // Increment view count
    try {
      await supabase.rpc('increment_news_views', { news_id: articleId });
    } catch (error) {
      console.error('Error incrementing news views:', error);
    }
  }, []);

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`dashboard-${userId}`);

    // Subscribe to ratings
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ratings',
        filter: `to_user_id=eq.${userId}`,
      },
      (payload) => {
        if (newsUpdateTimeoutRef.current) {
          clearTimeout(newsUpdateTimeoutRef.current);
        }

        newsUpdateTimeoutRef.current = setTimeout(() => {
          loadInitialNews();
        }, 100);
      }
    );

    // Subscribe to user messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_messages',
        filter: `to_user_id=eq.${userId}`,
      },
      () => {
        if (newsUpdateTimeoutRef.current) {
          clearTimeout(newsUpdateTimeoutRef.current);
        }

        newsUpdateTimeoutRef.current = setTimeout(() => {
          loadInitialNews();
        }, 100);
      }
    );

    // Subscribe to campus news
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'campus_news',
      },
      () => {
        if (campusNewsUpdateTimeoutRef.current) {
          clearTimeout(campusNewsUpdateTimeoutRef.current);
        }

        campusNewsUpdateTimeoutRef.current = setTimeout(() => {
          loadCampusNews();
        }, 100);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'campus_news',
      },
      () => {
        if (campusNewsUpdateTimeoutRef.current) {
          clearTimeout(campusNewsUpdateTimeoutRef.current);
        }

        campusNewsUpdateTimeoutRef.current = setTimeout(() => {
          loadCampusNews();
        }, 100);
      }
    );

    // Subscribe to token balance updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_tokens',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        loadTokenBalance();
      }
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      if (newsUpdateTimeoutRef.current) {
        clearTimeout(newsUpdateTimeoutRef.current);
      }
      if (campusNewsUpdateTimeoutRef.current) {
        clearTimeout(campusNewsUpdateTimeoutRef.current);
      }
    };
  }, [userId, loadInitialNews, loadCampusNews, loadTokenBalance]);

  /**
   * Initial data load
   */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      loadInitialNews(),
      loadCampusNews(),
      loadProfile(),
      loadTokenBalance(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [userId, loadInitialNews, loadCampusNews, loadProfile, loadTokenBalance]);

  /**
   * Clear all updates
   */
  const clearAllUpdates = useCallback(async () => {
    const allIds = news.map((item) => item.id);
    for (const id of allIds) {
      await addToStorageArray(STORAGE_KEYS.DISMISSED_NEWS, id);
      dismissedItemsRef.current.push(id);
    }
    setNews([]);
  }, [news]);

  return {
    news,
    campusNews,
    profileData,
    tokenBalance,
    loading,
    markAsRead,
    dismissItem,
    clearAllUpdates,
    markNewsAsRead,
    refreshNews: loadInitialNews,
    refreshCampusNews: loadCampusNews,
    refreshProfile: loadProfile,
    refreshTokenBalance: loadTokenBalance,
  };
}
