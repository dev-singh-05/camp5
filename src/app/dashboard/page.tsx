"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import AdBanner from "@/components/ads";
import TokenBalanceModal from "@/components/tokens/TokenBalanceModal";
import TokenPurchaseModal from "@/components/tokens/TokenPurchaseModal";
import {
  Users,
  Heart,
  Star,
  Bell,
  Menu,
  X,
  TrendingUp,
  Newspaper,
  Calendar,
  MessageSquare,
  Award,
  ChevronDown,
  ExternalLink,
  Coins,
  HelpCircle,
  Info,
  Send
} from "lucide-react";

type NewsType = "rating" | "user_message" | "dating_chat" | "club_event" | "club_message" | "campus_news";
type NewsItem = {
  id: string;
  type: NewsType;
  title: string;
  body?: string | null;
  created_at: string;
  meta?: Record<string, any>;
};

type CampusNewsArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  published: boolean;
  featured: boolean;
  pinned: boolean;
  image_url: string | null;
  views: number;
  created_at: string;
  published_at: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [campusNews, setCampusNews] = useState<CampusNewsArticle[]>([]);
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<CampusNewsArticle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dropdown states
  const [updatesExpanded, setUpdatesExpanded] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(true);

  // News rotation states
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [currentNewIndex, setCurrentNewIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  
  const removedItemsRef = useRef<Set<string>>(new Set());
  const readItemsRef = useRef<Set<string>>(new Set());
  const readNewsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  // Modals
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    full_name: "",
    location: "",
    hometown: "",
    year: "",
    branch: "",
    gender: ""
  });
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showTokenBalance, setShowTokenBalance] = useState(false);
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);

  // Form states
  const [helpName, setHelpName] = useState("");
  const [helpEmail, setHelpEmail] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");

  // Notification preferences
  const [notificationsPaused, setNotificationsPaused] = useState(false);
  const notificationsPausedRef = useRef(false);
  const [ratingsMsgEnabled, setRatingsMsgEnabled] = useState(true);
  const ratingsMsgRef = useRef(true);
  const [datingMsgEnabled, setDatingMsgEnabled] = useState(true);
  const datingMsgRef = useRef(true);
  const [clubsMsgEnabled, setClubsMsgEnabled] = useState(true);
  const clubsMsgRef = useRef(true);
  const [campusNewsEnabled, setCampusNewsEnabled] = useState(true);
  const campusNewsRef = useRef(true);

  // Load dismissed items, read items, and preferences from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem("dismissedNews");
    if (dismissed) {
      try {
        const parsed = JSON.parse(dismissed);
        removedItemsRef.current = new Set(parsed);
      } catch (e) {
        console.error("Failed to parse dismissed news:", e);
      }
    }

    const readUpdates = localStorage.getItem("readUpdates");
    if (readUpdates) {
      try {
        const parsed = JSON.parse(readUpdates);
        readItemsRef.current = new Set(parsed);
      } catch (e) {
        console.error("Failed to parse read updates:", e);
      }
    }

    const readNews = localStorage.getItem("readNews");
    if (readNews) {
      try {
        const parsed = JSON.parse(readNews);
        readNewsRef.current = new Set(parsed);
      } catch (e) {
        console.error("Failed to parse read news:", e);
      }
    }

    const paused = localStorage.getItem("prefs_notifications_paused");
    const r = localStorage.getItem("prefs_ratings_messages");
    const d = localStorage.getItem("prefs_dating_messages");
    const c = localStorage.getItem("prefs_clubs_messages");
    const cn = localStorage.getItem("prefs_campus_news");

    if (paused === "1") {
      setNotificationsPaused(true);
      notificationsPausedRef.current = true;
    }
    if (r === "0") {
      setRatingsMsgEnabled(false);
      ratingsMsgRef.current = false;
    }
    if (d === "0") {
      setDatingMsgEnabled(false);
      datingMsgRef.current = false;
    }
    if (c === "0") {
      setClubsMsgEnabled(false);
      clubsMsgRef.current = false;
    }
    if (cn === "0") {
      setCampusNewsEnabled(false);
      campusNewsRef.current = false;
    }
  }, []);

  const saveDismissedItems = () => {
    localStorage.setItem("dismissedNews", JSON.stringify([...removedItemsRef.current]));
  };

  const saveReadItems = () => {
    localStorage.setItem("readUpdates", JSON.stringify([...readItemsRef.current]));
  };

  const saveReadNews = () => {
    localStorage.setItem("readNews", JSON.stringify([...readNewsRef.current]));
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login");
        return;
      }

      const userId = data.user.id;
      userIdRef.current = userId;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, gender, year, branch, profile_completed")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;
      setProfileName(profileData?.full_name || "Student");

      if (!profileData?.full_name || !profileData?.gender || !profileData?.year || !profileData?.branch) {
        setShowOnboardingModal(true);
      }

      // Load token balance - FIXED: using user_tokens table
      const { data: tokenData, error: tokenError } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (tokenError) {
        console.error("Failed to load token balance:", tokenError);
      }

      if (mounted) {
        setTokenBalance(tokenData?.balance || 0);
      }

      setLoading(false);
      await loadInitialNews(userId);
      await loadCampusNews();
      await startRealtime(userId);
    }

    init();

    return () => {
      mounted = false;
      cleanupRealtime();
    };
  }, []);

  // Auto-rotation effect for news (7 seconds)
  useEffect(() => {
    if (!newsExpanded || campusNews.length === 0) return;

    // Get unread news
    const unreadNews = campusNews.filter(n => !readNewsRef.current.has(n.id));
    const pinnedNews = unreadNews.filter(n => n.pinned);
    const newNews = unreadNews.filter(n => !n.pinned);

    const interval = setInterval(() => {
      setSlideDirection('left');

      // Rotate pinned news if there are multiple
      if (pinnedNews.length > 1) {
        setCurrentPinnedIndex((prev) => (prev + 1) % pinnedNews.length);
      }

      // Rotate new news if there are multiple
      if (newNews.length > 1) {
        setCurrentNewIndex((prev) => (prev + 1) % newNews.length);
      }
    }, 7000); // 7 seconds

    return () => clearInterval(interval);
  }, [campusNews, newsExpanded]);

  // Auto-expand updates when new updates arrive
  useEffect(() => {
    if (news.length > 0) {
      setUpdatesExpanded(true);
    } else {
      setUpdatesExpanded(false);
    }
  }, [news.length]);

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!userIdRef.current) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: onboardingData.full_name,
        location: onboardingData.location,
        hometown: onboardingData.hometown,
        year: onboardingData.year,
        branch: onboardingData.branch,
        gender: onboardingData.gender,
        profile_completed: true
      })
      .eq("id", userIdRef.current);

    if (error) {
      console.error("Profile update failed:", error);
      return;
    }

    setProfileName(onboardingData.full_name);
    setShowOnboardingModal(false);
  }

  async function loadInitialNews(userId: string) {
    try {
      const results: NewsItem[] = [];

      const { data: ratings } = await supabase
        .from("ratings")
        .select("id, comment, created_at, overall_xp, to_user_id")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      (ratings || []).forEach((r: any) =>
        results.push({
          id: `rating-${r.id}`,
          type: "rating",
          title: "New rating received",
          body: r.comment ?? null,
          created_at: r.created_at,
          meta: { overall_xp: r.overall_xp ?? null },
        })
      );

      const { data: messages } = await supabase
        .from("user_messages")
        .select("id, from_user_id, content, created_at")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      const senderIds = Array.from(new Set((messages || []).map((m: any) => m.from_user_id)));
      const sendersById: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        (profiles || []).forEach((p: any) => (sendersById[p.id] = p));
      }

      (messages || []).forEach((m: any) =>
        results.push({
          id: `um-${m.id}`,
          type: "user_message",
          title: `Message from ${sendersById[m.from_user_id]?.full_name || "Someone"}`,
          body: m.content ?? null,
          created_at: m.created_at,
          meta: { from_user_id: m.from_user_id },
        })
      );

      const { data: matches } = await supabase
        .from("dating_matches")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const matchIds = (matches || []).map((m: any) => m.id);
      if (matchIds.length > 0) {
        const { data: dchats } = await supabase
          .from("dating_chats")
          .select("id, match_id, sender_id, message, created_at")
          .in("match_id", matchIds)
          .order("created_at", { ascending: false })
          .limit(8);

        const senders = Array.from(new Set((dchats || []).map((c: any) => c.sender_id)));
        const senderProfiles: Record<string, any> = {};
        if (senders.length > 0) {
          const { data: s } = await supabase.from("profiles").select("id, full_name").in("id", senders);
          (s || []).forEach((p: any) => (senderProfiles[p.id] = p));
        }

        (dchats || []).forEach((c: any) => {
          results.push({
            id: `datingchat-${c.id}`,
            type: "dating_chat",
            title: `Dating chat: ${senderProfiles[c.sender_id]?.full_name || "Someone"}`,
            body: c.message ?? null,
            created_at: c.created_at,
            meta: { match_id: c.match_id },
          });
        });
      }

      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", userId);

      const clubIds = (memberships || []).map((m: any) => m.club_id);
      if (clubIds.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("id, club_id, title, created_at")
          .in("club_id", clubIds)
          .order("created_at", { ascending: false })
          .limit(6);

        (events || []).forEach((ev: any) =>
          results.push({
            id: `event-${ev.id}`,
            type: "club_event",
            title: `New event: ${ev.title}`,
            body: null,
            created_at: ev.created_at,
            meta: { club_id: ev.club_id, event_id: ev.id },
          })
        );

        const { data: cmessages } = await supabase
          .from("messages")
          .select("id, club_id, user_id, content, created_at, profiles(full_name)")
          .in("club_id", clubIds)
          .order("created_at", { ascending: false })
          .limit(8);

        (cmessages || []).forEach((m: any) =>
          results.push({
            id: `clubmsg-${m.id}`,
            type: "club_message",
            title: `Club: ${m.club_id} • ${m.profiles?.full_name || "Someone"}`,
            body: m.content ?? null,
            created_at: m.created_at,
            meta: { club_id: m.club_id },
          })
        );
      }

      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filter to show only unread updates (not dismissed and not read)
      const filtered = results.filter((item) =>
        !removedItemsRef.current.has(item.id) && !readItemsRef.current.has(item.id)
      );
      setNews(filtered);
    } catch (err) {
      console.error("loadInitialNews error:", err);
    }
  }

  async function loadCampusNews() {
    try {
      const { data, error } = await supabase
        .from("campus_news")
        .select("*")
        .eq("published", true)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Failed to load campus news:", error);
        return;
      }

      setCampusNews(data || []);
    } catch (err) {
      console.error("loadCampusNews error:", err);
    }
  }

  async function startRealtime(userId: string) {
    try {
      cleanupRealtime();
      const channel = supabase.channel(`dashboard-news-${userId}`);

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ratings", filter: `to_user_id=eq.${userId}` },
        (payload: any) => {
          const r = payload.new;
          const item: NewsItem = {
            id: `rating-${r.id}`,
            type: "rating",
            title: "Someone rated you ⭐",
            body: r.comment ?? null,
            created_at: r.created_at,
            meta: { overall_xp: r.overall_xp ?? null },
          };
          pushNews(item);
        }
      );

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_messages", filter: `to_user_id=eq.${userId}` },
        async (payload: any) => {
          const m = payload.new;
          let name = "Someone";
          try {
            const { data } = await supabase.from("profiles").select("full_name").eq("id", m.from_user_id).maybeSingle();
            name = data?.full_name || name;
          } catch (e) {}
          const item: NewsItem = {
            id: `um-${m.id}`,
            type: "user_message",
            title: `Message from ${name}`,
            body: m.content ?? null,
            created_at: m.created_at,
            meta: { from_user_id: m.from_user_id },
          };
          pushNews(item);
        }
      );

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campus_news" },
        (payload: any) => {
          const article = payload.new;
          if (!article.published) return;

          setCampusNews((prev) => {
            const exists = prev.some((n) => n.id === article.id);
            if (exists) return prev;
            const updated = [article, ...prev];
            updated.sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
            });
            return updated.slice(0, 6);
          });
        }
      );

      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campus_news" },
        (payload: any) => {
          const article = payload.new;

          if (!article.published) {
            setCampusNews((prev) => prev.filter((n) => n.id !== article.id));
          } else {
            setCampusNews((prev) => {
              const filtered = prev.filter((n) => n.id !== article.id);
              const updated = [article, ...filtered];
              updated.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
              });
              return updated;
            });
          }
        }
      );

      // Add listener for token balance updates
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_tokens", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const updated = payload.new;
          setTokenBalance(updated.balance || 0);
        }
      );

      channel.subscribe();
      realtimeChannelRef.current = channel;
    } catch (err) {
      console.error("Failed to start realtime:", err);
    }
  }

  function cleanupRealtime() {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current).catch(() => {});
      realtimeChannelRef.current = null;
    }
  }

  function pushNews(item: NewsItem) {
    if (notificationsPausedRef.current) return;

    if (item.type === "rating" && !ratingsMsgRef.current) return;
    if (item.type === "user_message" && !ratingsMsgRef.current) return;
    if (item.type === "dating_chat" && !datingMsgRef.current) return;
    if ((item.type === "club_event" || item.type === "club_message") && !clubsMsgRef.current) return;
    if (item.type === "campus_news" && !campusNewsRef.current) return;

    if (removedItemsRef.current.has(item.id)) return;

    setNews((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      const next = [item, ...prev].slice(0, 200);
      next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return next;
    });
  }

  function removeNewsItem(id: string) {
    removedItemsRef.current.add(id);
    saveDismissedItems();
    setNews((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAllNews() {
    news.forEach((item) => removedItemsRef.current.add(item.id));
    saveDismissedItems();
    setNews([]);
  }

  function handleNewsClick(item: NewsItem) {
    // Mark update as read
    readItemsRef.current.add(item.id);
    saveReadItems();

    // Remove from UI
    setNews((prev) => prev.filter((n) => n.id !== item.id));

    switch (item.type) {
      case "rating":
        router.push("/ratings/leaderboard");
        break;
      case "user_message":
        if (item.meta?.from_user_id) {
          router.push(`/ratings?openChat=${item.meta.from_user_id}`);
        } else {
          router.push(`/ratings`);
        }
        break;
      case "dating_chat":
        if (item.meta?.match_id) router.push(`/dating/chat/${item.meta.match_id}`);
        else router.push("/dating");
        break;
      case "club_event":
      case "club_message":
        if (item.meta?.club_id) router.push(`/clubs/${item.meta.club_id}`);
        else router.push("/clubs");
        break;
      case "campus_news":
        router.push(`/news/${item.meta?.article_id}`);
        break;
      default:
        router.push("/");
    }
  }

  const openNewsModal = async (article: CampusNewsArticle) => {
    setSelectedNewsArticle(article);

    // Mark news as read
    readNewsRef.current.add(article.id);
    saveReadNews();

    if (userIdRef.current) {
      await supabase.rpc("increment_news_views", {
        news_id_param: article.id,
        user_id_param: userIdRef.current,
      });

      setCampusNews((prev) =>
        prev.map((n) => (n.id === article.id ? { ...n, views: n.views + 1 } : n))
      );
    }
  };

  const closeNewsModal = () => {
    setSelectedNewsArticle(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "academic": return "🎓";
      case "sports": return "🏆";
      case "events": return "📅";
      default: return "📢";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "academic": return "from-blue-500/20 to-cyan-500/20 text-cyan-400";
      case "sports": return "from-green-500/20 to-emerald-500/20 text-emerald-400";
      case "events": return "from-purple-500/20 to-pink-500/20 text-pink-400";
      default: return "from-gray-500/20 to-slate-500/20 text-slate-400";
    }
  };

  const getNewsIcon = (type: NewsType) => {
    switch (type) {
      case "rating": return <Star className="w-4 h-4" />;
      case "user_message": return <MessageSquare className="w-4 h-4" />;
      case "dating_chat": return <Heart className="w-4 h-4" />;
      case "club_event": return <Calendar className="w-4 h-4" />;
      case "club_message": return <Bell className="w-4 h-4" />;
      default: return <Newspaper className="w-4 h-4" />;
    }
  };

  function togglePauseNotifications(v?: boolean) {
    const next = typeof v === "boolean" ? v : !notificationsPaused;
    setNotificationsPaused(next);
    notificationsPausedRef.current = next;
    localStorage.setItem("prefs_notifications_paused", next ? "1" : "0");
  }
  function toggleRatingsMessages(v?: boolean) {
    const next = typeof v === "boolean" ? v : !ratingsMsgEnabled;
    setRatingsMsgEnabled(next);
    ratingsMsgRef.current = next;
    localStorage.setItem("prefs_ratings_messages", next ? "1" : "0");
  }
  function toggleDatingMessages(v?: boolean) {
    const next = typeof v === "boolean" ? v : !datingMsgEnabled;
    setDatingMsgEnabled(next);
    datingMsgRef.current = next;
    localStorage.setItem("prefs_dating_messages", next ? "1" : "0");
  }
  function toggleClubsMessages(v?: boolean) {
    const next = typeof v === "boolean" ? v : !clubsMsgEnabled;
    setClubsMsgEnabled(next);
    clubsMsgRef.current = next;
    localStorage.setItem("prefs_clubs_messages", next ? "1" : "0");
  }
  function toggleCampusNews(v?: boolean) {
    const next = typeof v === "boolean" ? v : !campusNewsEnabled;
    setCampusNewsEnabled(next);
    campusNewsRef.current = next;
    localStorage.setItem("prefs_campus_news", next ? "1" : "0");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function submitHelp(e?: React.FormEvent) {
    e?.preventDefault();
    console.log("Help form:", { helpName, helpEmail, helpMessage });
    setHelpOpen(false);
    setHelpName("");
    setHelpEmail("");
    setHelpMessage("");
  }

  function submitFeedback(e?: React.FormEvent) {
    e?.preventDefault();
    console.log("Feedback:", { feedbackName, feedbackEmail, feedbackType, feedbackMessage });
    setFeedbackOpen(false);
    setFeedbackName("");
    setFeedbackEmail("");
    setFeedbackType("general");
    setFeedbackMessage("");
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
          />
          <p className="text-white/70 text-lg font-medium">Loading Campus5...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base md:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            >
              Welcome to Campus5
            </motion.h1>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Token Balance */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTokenBalance(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
              >
                <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                <span className="text-xs md:text-sm font-semibold text-yellow-400">{tokenBalance}</span>
                <span className="hidden md:inline text-xs text-yellow-400/70">Tokens</span>
              </motion.button>

              {/* Profile */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/profile")}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                {profileName?.charAt(0) || "U"}
              </motion.button>

              {/* Menu */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                <Menu className="w-4 h-4 md:w-5 md:h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-4 md:px-6 py-3 pb-20 md:pb-3">
        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-12 gap-6 min-h-[calc(100vh-120px)]">
          {/* Left Sidebar: Navigation Cards */}
          <div className="col-span-3 space-y-4">
            {/* Clubs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/clubs")}
              className="cursor-pointer group relative"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(168, 85, 247, 0.3)",
                    "0 0 40px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(168, 85, 247, 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl blur-lg"
              />
              <div className="relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 hover:border-purple-500/50 transition-all">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Clubs</h3>
                    <p className="text-xs text-white/60">Community</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dating */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dating")}
              className="cursor-pointer group relative"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(236, 72, 153, 0.3)",
                    "0 0 40px rgba(236, 72, 153, 0.5)",
                    "0 0 20px rgba(236, 72, 153, 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-0 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-2xl blur-lg"
              />
              <div className="relative bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-xl rounded-2xl border border-pink-500/30 p-6 hover:border-pink-500/50 transition-all">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Dating</h3>
                    <p className="text-xs text-white/60">Connect</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rating */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/ratings")}
              className="cursor-pointer group relative"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(34, 211, 238, 0.3)",
                    "0 0 40px rgba(34, 211, 238, 0.5)",
                    "0 0 20px rgba(34, 211, 238, 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-2xl blur-lg"
              />
              <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-6 hover:border-cyan-500/50 transition-all">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Rating</h3>
                    <p className="text-xs text-white/60">Review</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Center: Featured/Ads Section */}
          <div className="col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    📢 Featured
                  </h3>
                  <span className="text-xs text-white/50 px-3 py-1 bg-white/5 rounded-full">Sponsored</span>
                </div>
                
                <div>
                  <AdBanner placement="dashboard" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Sidebar: Updates & News */}
          <div className="col-span-3 space-y-4">
            {/* Updates Card with Dropdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 transition-all">
                <button
                  onClick={() => setUpdatesExpanded(!updatesExpanded)}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-white">Updates</h3>
                      <span className="text-xs text-white/40">{news.length} items</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: updatesExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-white/60" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {updatesExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {news.length > 0 && (
                        <div className="flex items-center justify-end mb-3 pt-2 border-t border-white/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearAllNews();
                            }}
                            className="text-xs text-white/40 hover:text-white/60"
                          >
                            Clear all
                          </button>
                        </div>
                      )}

                      <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {news.length === 0 ? (
                          <p className="text-white/40 text-sm text-center py-6">No recent updates</p>
                        ) : (
                          news.slice(0, 3).map((item, index) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ x: 4, scale: 1.02 }}
                              className="group/item cursor-pointer"
                            >
                              <div className="bg-white/5 hover:bg-white/10 rounded-xl p-2 border border-white/5 hover:border-cyan-500/30 transition-all">
                                <div className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 transition-transform">
                                    {getNewsIcon(item.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <button
                                        onClick={() => handleNewsClick(item)}
                                        className="flex-1 text-left"
                                      >
                                        <h4 className="font-semibold text-sm text-white mb-0.5 line-clamp-1 group-hover/item:text-cyan-400 transition-colors">
                                          {item.title}
                                        </h4>
                                        {item.body && (
                                          <p className="text-xs text-white/60 line-clamp-1">{item.body}</p>
                                        )}
                                        <time className="text-xs text-white/40 mt-0.5 block">
                                          {new Date(item.created_at).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </time>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeNewsItem(item.id);
                                        }}
                                        className="text-white/40 hover:text-white/80 flex-shrink-0"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            
            

            {/* News Card with Dropdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 hover:border-purple-500/30 transition-all">
                <button
                  onClick={() => setNewsExpanded(!newsExpanded)}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-white">News</h3>
                      <span className="text-xs text-white/40">
                        {campusNews.filter(n => !readNewsRef.current.has(n.id)).length} new
                      </span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: newsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-white/60" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {newsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-end mb-3 pt-2 border-t border-white/5">
                        <Link href="/news" className="text-sm text-purple-400 hover:text-purple-300">
                          View all
                        </Link>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          // Filter unread news
                          const unreadNews = campusNews.filter(n => !readNewsRef.current.has(n.id));
                          const pinnedNews = unreadNews.filter(n => n.pinned);
                          const newNews = unreadNews.filter(n => !n.pinned);

                          // Get current items to display
                          const currentPinned = pinnedNews.length > 0 ? pinnedNews[currentPinnedIndex % pinnedNews.length] : null;
                          const currentNew = newNews.length > 0 ? newNews[currentNewIndex % newNews.length] : null;

                          const displayNews = [currentPinned, currentNew].filter(Boolean) as CampusNewsArticle[];

                          if (displayNews.length === 0) {
                            return <p className="text-white/40 text-sm text-center py-6">No new news</p>;
                          }

                          return displayNews.map((article, slotIndex) => (
                            <div key={`slot-${slotIndex}`} className="relative overflow-hidden">
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={article.id}
                                  initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                                  transition={{ duration: 0.5, ease: "easeInOut" }}
                                  whileHover={{ x: 4, scale: 1.02 }}
                                  onClick={() => openNewsModal(article)}
                                  className="group/item cursor-pointer"
                                >
                                  <div className="bg-white/5 hover:bg-white/10 rounded-xl p-2.5 border border-white/5 hover:border-purple-500/30 transition-all">
                                    <div className="flex items-start gap-2">
                                      {article.image_url ? (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 group-hover/item:scale-110 transition-transform">
                                          <img
                                            src={article.image_url}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(article.category)} flex items-center justify-center flex-shrink-0 text-xl group-hover/item:scale-110 transition-transform`}>
                                          {getCategoryIcon(article.category)}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getCategoryColor(article.category)} font-medium`}>
                                            {article.category}
                                          </span>
                                          {article.pinned && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                              📌
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="font-semibold text-sm text-white mb-0.5 line-clamp-1 group-hover/item:text-purple-400 transition-colors">
                                          {article.title}
                                        </h4>
                                        {article.excerpt && (
                                          <p className="text-xs text-white/60 line-clamp-1">{article.excerpt}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                                          <span className="flex items-center gap-1">
                                            👁️ {article.views}
                                          </span>
                                          <span>•</span>
                                          <time>
                                            {new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </time>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          {/* Ads Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  📢 Ads
                </h3>
              </div>
              <div>
                <AdBanner placement="dashboard" />
              </div>
            </div>
          </motion.div>

          {/* Updates Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setUpdatesExpanded(!updatesExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 border-b border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">Updates</h3>
                    <span className="text-xs text-white/40">{news.length} items</span>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: updatesExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/60"
                >
                  {updatesExpanded ? "✓" : <ChevronDown className="w-5 h-5" />}
                </motion.div>
              </button>

              <AnimatePresence>
                {updatesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-4 py-3"
                  >
                    {news.length > 0 && (
                      <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAllNews();
                          }}
                          className="text-xs text-white/40 hover:text-white/60"
                        >
                          Clear all
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {news.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-6">No recent updates</p>
                      ) : (
                        news.slice(0, 5).map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group/item cursor-pointer"
                          >
                            <div className="bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 hover:border-cyan-500/30 transition-all">
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                                  {getNewsIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      onClick={() => handleNewsClick(item)}
                                      className="flex-1 text-left"
                                    >
                                      <h4 className="font-semibold text-sm text-white mb-0.5 line-clamp-1">
                                        {item.title}
                                      </h4>
                                      {item.body && (
                                        <p className="text-xs text-white/60 line-clamp-2">{item.body}</p>
                                      )}
                                      <time className="text-xs text-white/40 mt-0.5 block">
                                        {new Date(item.created_at).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </time>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeNewsItem(item.id);
                                      }}
                                      className="text-white/40 hover:text-white/80 flex-shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* News Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setNewsExpanded(!newsExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 border-b border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Newspaper className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">News</h3>
                    <span className="text-xs text-white/40">
                      {campusNews.filter(n => !readNewsRef.current.has(n.id)).length} new
                    </span>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: newsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/60"
                >
                  {newsExpanded ? "✓" : <ChevronDown className="w-5 h-5" />}
                </motion.div>
              </button>

              <AnimatePresence>
                {newsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-4 py-3"
                  >
                    <div className="flex items-center justify-end mb-3">
                      <Link href="/news" className="text-sm text-purple-400 hover:text-purple-300">
                        View all
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const unreadNews = campusNews.filter(n => !readNewsRef.current.has(n.id));
                        const pinnedNews = unreadNews.filter(n => n.pinned);
                        const newNews = unreadNews.filter(n => !n.pinned);

                        const currentPinned = pinnedNews.length > 0 ? pinnedNews[currentPinnedIndex % pinnedNews.length] : null;
                        const currentNew = newNews.length > 0 ? newNews[currentNewIndex % newNews.length] : null;

                        const displayNews = [currentPinned, currentNew].filter(Boolean) as CampusNewsArticle[];

                        if (displayNews.length === 0) {
                          return <p className="text-white/40 text-sm text-center py-6">No new news</p>;
                        }

                        return displayNews.map((article, slotIndex) => (
                          <div key={`slot-${slotIndex}`} className="relative overflow-hidden">
                            <motion.div
                              key={article.id}
                              onClick={() => openNewsModal(article)}
                              className="group/item cursor-pointer"
                            >
                              <div className="bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 hover:border-purple-500/30 transition-all">
                                <div className="flex items-start gap-2">
                                  {article.image_url ? (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                      <img
                                        src={article.image_url}
                                        alt={article.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(article.category)} flex items-center justify-center flex-shrink-0 text-xl`}>
                                      {getCategoryIcon(article.category)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getCategoryColor(article.category)} font-medium`}>
                                        {article.category}
                                      </span>
                                      {article.pinned && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                          📌
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-semibold text-sm text-white mb-0.5 line-clamp-2">
                                      {article.title}
                                    </h4>
                                    {article.excerpt && (
                                      <p className="text-xs text-white/60 line-clamp-2">{article.excerpt}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                                      <span className="flex items-center gap-1">
                                        👁️ {article.views}
                                      </span>
                                      <span>•</span>
                                      <time>
                                        {new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </time>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ));
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
        <div className="grid grid-cols-3 gap-1 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/clubs")}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-white/80">Clubs</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/ratings")}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-white/80">Ratings</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/dating")}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-xs font-medium text-white/80">Dating</span>
          </motion.button>
        </div>
      </nav>

      {/* All Modals */}
      
      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboardingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Campus5! 🎉</h2>
              <p className="text-sm text-white/60 mb-6">Complete your profile to get started</p>

              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Full Name *</label>
                  <input
                    required
                    value={onboardingData.full_name}
                    onChange={(e) => setOnboardingData({...onboardingData, full_name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Gender *</label>
                  <select
                    required
                    value={onboardingData.gender}
                    onChange={(e) => setOnboardingData({...onboardingData, gender: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Current Year *</label>
                  <select
                    required
                    value={onboardingData.year}
                    onChange={(e) => setOnboardingData({...onboardingData, year: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                  >
                    <option value="">Select year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Branch/Course *</label>
                  <select
                    required
                    value={onboardingData.branch}
                    onChange={(e) => setOnboardingData({...onboardingData, branch: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                  >
                    <option value="">Select branch</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Location</label>
                  <input
                    value={onboardingData.location}
                    onChange={(e) => setOnboardingData({...onboardingData, location: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="Current city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Hometown</label>
                  <input
                    value={onboardingData.hometown}
                    onChange={(e) => setOnboardingData({...onboardingData, hometown: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="Your hometown"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Complete Profile
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token Balance Modal */}
      {showTokenBalance && userIdRef.current && (
        <TokenBalanceModal
          userId={userIdRef.current}
          onClose={() => setShowTokenBalance(false)}
          onAddTokens={() => setShowTokenPurchase(true)}
        />
      )}

      {/* Token Purchase Modal */}
      {showTokenPurchase && userIdRef.current && (
        <TokenPurchaseModal
          userId={userIdRef.current}
          onClose={() => setShowTokenPurchase(false)}
        />
      )}

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNewsArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeNewsModal}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(selectedNewsArticle.category)} font-medium`}>
                    {getCategoryIcon(selectedNewsArticle.category)} {selectedNewsArticle.category}
                  </span>
                  {selectedNewsArticle.pinned && (
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      📌 Pinned
                    </span>
                  )}
                </div>
                <button
                  onClick={closeNewsModal}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8">
                <h1 className="text-3xl font-bold text-white mb-4">
                  {selectedNewsArticle.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-white/60 mb-6">
                  <span className="flex items-center gap-1">
                    📅 {new Date(selectedNewsArticle.published_at || selectedNewsArticle.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    👁️ {selectedNewsArticle.views} views
                  </span>
                </div>

                {selectedNewsArticle.image_url && (
                  <img
                    src={selectedNewsArticle.image_url}
                    alt={selectedNewsArticle.title}
                    className="w-full h-96 object-cover rounded-xl mb-6"
                  />
                )}

                <div className="prose prose-invert max-w-none">
                  <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                    {selectedNewsArticle.content}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 p-6 flex items-center justify-between bg-slate-900/50">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/news/${selectedNewsArticle.id}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  onClick={closeNewsModal}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed top-0 right-0 z-50 h-full w-[360px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-y-auto"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
                      {profileName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{profileName}</p>
                      <p className="text-xs text-white/60">Student Member</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      router.push("/profile");
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all text-left"
                  >
                    <Award className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">View Profile</div>
                      <div className="text-xs text-white/60">Manage your account</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      router.push("/membership");
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all text-left"
                  >
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Membership</div>
                      <div className="text-xs text-white/60">Status & history</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAboutOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all text-left"
                  >
                    <Info className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">About</div>
                      <div className="text-xs text-white/60">About this project</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setHelpOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-green-500/30 transition-all text-left"
                  >
                    <HelpCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Help Center</div>
                      <div className="text-xs text-white/60">Contact / Support</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setFeedbackOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/30 transition-all text-left"
                  >
                    <Send className="w-5 h-5 text-yellow-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Send Feedback</div>
                      <div className="text-xs text-white/60">Tell us what you think</div>
                    </div>
                  </button>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-white/60" />
                        <div>
                          <div className="text-sm font-semibold text-white">Notifications</div>
                          <div className="text-xs text-white/40">{notificationsPaused ? "Paused" : "Active"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-white/5 rounded-xl p-3">
                      <div className="flex items-center justify-between p-2">
                        <div className="text-sm text-white">Pause all</div>
                        <input
                          type="checkbox"
                          checked={notificationsPaused}
                          onChange={(e) => togglePauseNotifications(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between p-2">
                        <div className="text-sm text-white/80">Ratings & messages</div>
                        <input
                          type="checkbox"
                          checked={ratingsMsgEnabled}
                          onChange={(e) => toggleRatingsMessages(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between p-2">
                        <div className="text-sm text-white/80">Dating messages</div>
                        <input
                          type="checkbox"
                          checked={datingMsgEnabled}
                          onChange={(e) => toggleDatingMessages(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between p-2">
                        <div className="text-sm text-white/80">Clubs & events</div>
                        <input
                          type="checkbox"
                          checked={clubsMsgEnabled}
                          onChange={(e) => toggleClubsMessages(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between p-2">
                        <div className="text-sm text-white/80">Campus news</div>
                        <input
                          type="checkbox"
                          checked={campusNewsEnabled}
                          onChange={(e) => toggleCampusNews(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-xl font-semibold text-red-400 transition-all"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      router.push("/account/delete");
                    }}
                    className="w-full px-4 py-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* About, Help, Feedback Modals */}
      <AnimatePresence>
        {aboutOpen && (
          <ModalOverlay onClose={() => setAboutOpen(false)}>
            <div className="w-full bg-slate-900 rounded-2xl shadow-2xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">About Campus5</h3>
                <button onClick={() => setAboutOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm text-white/80 space-y-3">
                <p>
                  Campus5 is a campus community platform connecting clubs, events, ratings and social
                  features for students.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setAboutOpen(false)} 
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && (
          <ModalOverlay onClose={() => setHelpOpen(false)}>
            <div className="w-full bg-slate-900 rounded-2xl shadow-2xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Help Center</h3>
                <button onClick={() => setHelpOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form className="space-y-4" onSubmit={submitHelp}>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Name</label>
                  <input
                    value={helpName}
                    onChange={(e) => setHelpName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Email</label>
                  <input
                    value={helpEmail}
                    onChange={(e) => setHelpEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="your@college.edu"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Message</label>
                  <textarea
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    rows={4}
                    placeholder="Describe your issue..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackOpen && (
          <ModalOverlay onClose={() => setFeedbackOpen(false)}>
            <div className="w-full bg-slate-900 rounded-2xl shadow-2xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Send Feedback</h3>
                <button onClick={() => setFeedbackOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form className="space-y-4" onSubmit={submitFeedback}>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Name</label>
                  <input
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Email</label>
                  <input
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    placeholder="your@college.edu"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Type</label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                  >
                    <option value="general">General</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/80 block mb-1">Message</label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                    rows={4}
                    placeholder="Tell us what you think..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 w-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}