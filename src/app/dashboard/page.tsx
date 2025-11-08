"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import AdBanner from "@/components/ads";

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
  const removedItemsRef = useRef<Set<string>>(new Set());

  const userIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // About modal
  const [aboutOpen, setAboutOpen] = useState(false);

  // Help & Feedback modals
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Help form state
  const [helpName, setHelpName] = useState("");
  const [helpEmail, setHelpEmail] = useState("");
  const [helpMessage, setHelpMessage] = useState("");

  // Feedback form state
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");

  // Notification preference toggles (persisted)
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

  // Dark mode placeholder
  const [darkMode, setDarkMode] = useState(false);

  // Load dismissed items from localStorage
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

    // Load notification prefs
    const paused = localStorage.getItem("prefs_notifications_paused");
    const r = localStorage.getItem("prefs_ratings_messages");
    const d = localStorage.getItem("prefs_dating_messages");
    const c = localStorage.getItem("prefs_clubs_messages");
    const cn = localStorage.getItem("prefs_campus_news");
    const dm = localStorage.getItem("prefs_dark_mode");

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
    if (dm === "1") {
      setDarkMode(true);
    }
  }, []);

  // Save dismissed items to localStorage whenever they change
  const saveDismissedItems = () => {
    localStorage.setItem("dismissedNews", JSON.stringify([...removedItemsRef.current]));
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;
      setProfileName(profile?.full_name || "Student");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCampusNews() {
    try {
      const { data, error } = await supabase
        .from("campus_news")
        .select("*")
        .eq("published", true)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) {
        console.error("Failed to load campus news:", error);
        return;
      }

      setCampusNews(data || []);
    } catch (err) {
      console.error("loadCampusNews error:", err);
    }
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
          title: "Someone rated you ⭐",
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

      // Filter out dismissed items
      const filtered = results.filter((item) => !removedItemsRef.current.has(item.id));
      setNews(filtered);
    } catch (err) {
      console.error("loadInitialNews error:", err);
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
        { event: "INSERT", schema: "public", table: "dating_chats" },
        async (payload: any) => {
          const c = payload.new;
          try {
            const { data: match } = await supabase.from("dating_matches").select("id, user1_id, user2_id").eq("id", c.match_id).maybeSingle();
            if (!match) return;
            if (match.user1_id !== userId && match.user2_id !== userId) return;
            let senderName = "Someone";
            try {
              const { data: p } = await supabase.from("profiles").select("full_name").eq("id", c.sender_id).maybeSingle();
              senderName = p?.full_name || senderName;
            } catch (e) {}
            const item: NewsItem = {
              id: `datingchat-${c.id}`,
              type: "dating_chat",
              title: `Dating chat: ${senderName}`,
              body: c.message ?? null,
              created_at: c.created_at,
              meta: { match_id: c.match_id },
            };
            pushNews(item);
          } catch (err) {
            console.error("dating_chats payload handling error:", err);
          }
        }
      );

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        async (payload: any) => {
          const ev = payload.new;
          try {
            const { data: member } = await supabase
              .from("club_members")
              .select("id")
              .eq("club_id", ev.club_id)
              .eq("user_id", userId)
              .maybeSingle();
            if (!member) return;
            const item: NewsItem = {
              id: `event-${ev.id}`,
              type: "club_event",
              title: `New event: ${ev.title}`,
              body: ev.description ?? null,
              created_at: ev.created_at,
              meta: { club_id: ev.club_id, event_id: ev.id },
            };
            pushNews(item);
          } catch (err) {
            console.error("events payload handler error:", err);
          }
        }
      );

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
          const m = payload.new;
          try {
            const { data: member } = await supabase
              .from("club_members")
              .select("id")
              .eq("club_id", m.club_id)
              .eq("user_id", userId)
              .maybeSingle();
            if (!member) return;
            let sender = "Someone";
            try {
              const { data: p } = await supabase.from("profiles").select("full_name").eq("id", m.user_id).maybeSingle();
              sender = p?.full_name || sender;
            } catch (e) {}
            const item: NewsItem = {
              id: `clubmsg-${m.id}`,
              type: "club_message",
              title: `Club message • ${sender}`,
              body: m.content ?? null,
              created_at: m.created_at,
              meta: { club_id: m.club_id },
            };
            pushNews(item);
          } catch (err) {
            console.error("messages payload error:", err);
          }
        }
      );

      // Listen for new campus news articles
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campus_news" },
        (payload: any) => {
          const article = payload.new;
          if (!article.published) return;
          
          // Add to campusNews state
          setCampusNews((prev) => {
            const exists = prev.some((n) => n.id === article.id);
            if (exists) return prev;
            const updated = [article, ...prev];
            updated.sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
            });
            return updated;
          });
        }
      );

      // Listen for campus news updates (publish/unpublish)
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campus_news" },
        (payload: any) => {
          const article = payload.new;

          if (!article.published) {
            // Remove unpublished article from campusNews
            setCampusNews((prev) => prev.filter((n) => n.id !== article.id));
          } else {
            // Add or update published article in campusNews
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

      await channel.subscribe();

      realtimeChannelRef.current = channel;
      console.log("Dashboard realtime subscribed for user:", userId);
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

  function resetDismissedItems() {
    removedItemsRef.current.clear();
    localStorage.removeItem("dismissedNews");
    if (userIdRef.current) {
      loadInitialNews(userIdRef.current);
      loadCampusNews();
    }
  }

  function pushNews(item: NewsItem) {
    // Respect notification preferences
    if (notificationsPausedRef.current) return;

    // Filter per-type
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

  function getCategoryIcon(category: string) {
    switch (category) {
      case "academic": return "🎓";
      case "sports": return "🏆";
      case "events": return "📅";
      default: return "📢";
    }
  }

  function getCategoryColor(cat: string) {
    switch (cat) {
      case "academic":
        return "bg-blue-100 text-blue-700";
      case "sports":
        return "bg-green-100 text-green-700";
      case "events":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  const openNewsModal = async (article: CampusNewsArticle) => {
    setSelectedNewsArticle(article);

    // Mark as viewed
    if (userIdRef.current) {
      await supabase.rpc("increment_news_views", {
        news_id_param: article.id,
        user_id_param: userIdRef.current,
      });

      // Update local view count
      setCampusNews((prev) =>
        prev.map((n) => (n.id === article.id ? { ...n, views: n.views + 1 } : n))
      );
    }
  };

  const closeNewsModal = () => {
    setSelectedNewsArticle(null);
  };

  const copyNewsLink = () => {
    if (selectedNewsArticle) {
      const url = `${window.location.origin}/news/${selectedNewsArticle.id}`;
      navigator.clipboard.writeText(url);
      // You can add toast notification here if you have it
      console.log("Link copied!");
    }
  };

  // Get news to display: pinned first, then newest ones, max 4 total
  const getDisplayNews = () => {
    const pinnedNews = campusNews.filter((n) => n.pinned);
    const unpinnedNews = campusNews.filter((n) => !n.pinned);
    
    // Combine: pinned first, then unpinned (both already sorted by date)
    const combined = [...pinnedNews, ...unpinnedNews];
    
    // Return only first 4
    return combined.slice(0, 4);
  };

  const displayNews = getDisplayNews();

  // Notification preference handlers (persist)
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

  // Dark mode placeholder
  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("prefs_dark_mode", next ? "1" : "0");
  }

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Help submit
  function submitHelp(e?: React.FormEvent) {
    e?.preventDefault();
    console.log("Help form:", { helpName, helpEmail, helpMessage });
    setHelpOpen(false);
    setHelpName("");
    setHelpEmail("");
    setHelpMessage("");
  }

  // Feedback submit
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
      <div className="flex h-screen items-center justify-center bg-gradient-to-r from-indigo-700 to-purple-600">
        <p className="text-white text-lg font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <header className="bg-indigo-700 shadow">
          <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
            <h1 className="text-2xl font-extrabold text-white">Campus5 Dashboard</h1>
            <div className="flex items-center gap-3">
              <Link href="/profile" className="font-medium text-white hover:underline">
                Welcome, {profileName}
              </Link>

              <button
                aria-label="Open settings"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-indigo-600/60"
              >
                <div className="w-6 h-6 flex flex-col justify-between">
                  <span className="block h-[2px] w-5 bg-white"></span>
                  <span className="block h-[2px] w-5 bg-white"></span>
                  <span className="block h-[2px] w-5 bg-white"></span>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: wide area spanning 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Advertisements Section with AdBanner */}
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">📢 Advertisements</h3>
                  <span className="text-xs text-gray-500">Featured promotions</span>
                </div>

                <AdBanner placement="dashboard" />

                <div id="ad-fallback" className="hidden">
                  <div className="w-full h-[300px] bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-700 font-medium mb-2">Your Ad Here</p>
                      <a href="/admin/ads" className="text-sm text-indigo-600 hover:underline">
                        Become a sponsor
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={resetDismissedItems} className="text-xs text-gray-600 hover:text-gray-800">
                Show dismissed
              </button>

              {/* Quick Access Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/clubs" className="block">
                  <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                    <div className="text-3xl group-hover:scale-110 transition-transform">🏆</div>
                    <div className="mt-2 text-sm font-semibold text-gray-800">Clubs</div>
                  </div>
                </Link>

                <Link href="/ratings" className="block">
                  <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                    <div className="text-3xl group-hover:scale-110 transition-transform">⭐</div>
                    <div className="mt-2 text-sm font-semibold text-gray-800">Ratings</div>
                  </div>
                </Link>

                <Link href="/dating" className="block">
                  <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                    <div className="text-3xl group-hover:scale-110 transition-transform">💌</div>
                    <div className="mt-2 text-sm font-semibold text-gray-800">Blind Dating</div>
                  </div>
                </Link>
              </div>

            </div>

            {/* RIGHT: Latest Updates and Campus News */}
            <aside className="space-y-6">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Latest Updates</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearAllNews}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Clear all
                    </button>
                    <span className="text-xs text-gray-500">{news.length} items</span>
                  </div>
                </div>

                {news.length === 0 ? (
                  <p className="text-gray-600 text-sm">No recent updates.</p>
                ) : (
                  <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {news.map((n) => (
                      <li
                        key={n.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-white transition"
                      >
                        <div className="flex-shrink-0">
                          {n.type === "rating" && (
                            <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold">
                              ⭐
                            </div>
                          )}
                          {n.type === "user_message" && (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                              ✉️
                            </div>
                          )}
                          {n.type === "dating_chat" && (
                            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                              💬
                            </div>
                          )}
                          {n.type === "club_event" && (
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                              📅
                            </div>
                          )}
                          {n.type === "club_message" && (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                              🏷️
                            </div>
                          )}
                          {n.type === "campus_news" && (
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                              📰
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <button onClick={() => handleNewsClick(n)} className="text-left w-full">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                              <time className="text-xs text-gray-400 ml-2">
                                {new Date(n.created_at).toLocaleString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </time>
                            </div>
                            {n.body && <p className="text-sm text-gray-700 mt-1 line-clamp-3">{n.body}</p>}
                            {n.type === "campus_news" && n.meta?.category && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {getCategoryIcon(n.meta.category)} {n.meta.category}
                              </span>
                            )}
                          </button>
                        </div>

                        <div className="ml-3 flex flex-col items-end gap-2">
                          <button onClick={() => removeNewsItem(n.id)} title="Dismiss" className="text-gray-500 hover:text-gray-700">
                            ✖
                          </button>
                          <button onClick={() => handleNewsClick(n)} className="text-xs text-indigo-600 hover:underline">
                            Open
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Campus News Section */}
              {displayNews.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📰 Campus News</h3>
                    <Link href="/news" className="text-sm text-indigo-600 hover:underline">
                      View all
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {displayNews.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => openNewsModal(article)}
                        className="cursor-pointer hover:bg-gray-50 rounded-lg p-3 transition group border border-gray-100"
                      >
                        <div className="flex items-start gap-3">
                          {article.image_url ? (
                            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                              <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                              <span className="text-2xl">{getCategoryIcon(article.category)}</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">{getCategoryIcon(article.category)}</span>
                              <span className="text-xs text-gray-500 uppercase">{article.category}</span>
                              {article.pinned && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">📌</span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition line-clamp-2 mb-1">
                              {article.title}
                            </h4>
                            {article.excerpt && (
                              <p className="text-xs text-gray-600 line-clamp-2 mb-2">{article.excerpt}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>👁️ {article.views}</span>
                              <span>•</span>
                              <span>{new Date(article.published_at || article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>

        {/* News Detail Modal */}
        {selectedNewsArticle && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            onClick={closeNewsModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded ${getCategoryColor(
                      selectedNewsArticle.category
                    )}`}
                  >
                    {getCategoryIcon(selectedNewsArticle.category)} {selectedNewsArticle.category}
                  </span>
                  {selectedNewsArticle.pinned && (
                    <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded">
                      📌 Pinned
                    </span>
                  )}
                </div>
                <button
                  onClick={closeNewsModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✖
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedNewsArticle.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <span>
                    📅{" "}
                    {new Date(selectedNewsArticle.published_at || selectedNewsArticle.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>👁️ {selectedNewsArticle.views} views</span>
                </div>

                {selectedNewsArticle.image_url && (
                  <img
                    src={selectedNewsArticle.image_url}
                    alt={selectedNewsArticle.title}
                    className="w-full h-96 object-cover rounded-lg mb-6"
                  />
                )}

                <div className="prose max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedNewsArticle.content}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-6 flex items-center justify-between">
                <button
                  onClick={copyNewsLink}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2"
                >
                  🔗 Copy Link
                </button>
                <button
                  onClick={closeNewsModal}
                  className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40"
            role="dialog"
            aria-modal="true"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        {/* Slide-in panel */}
        <aside
          className={`fixed top-0 right-0 z-50 h-full w-[360px] transform bg-white shadow-xl transition-transform ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-hidden={!sidebarOpen}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                  {profileName?.charAt(0) ?? "S"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                  <p className="text-xs text-gray-500">Member</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Close"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* About */}
              <button
                onClick={() => {
                  setAboutOpen(true);
                }}
                className="flex items-center gap-3 w-full text-left p-3 rounded hover:bg-gray-50"
              >
                <span className="text-lg">ℹ️</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">About</div>
                  <div className="text-xs text-gray-500">About this project</div>
                </div>
              </button>

              {/* Help Center */}
              <button
                onClick={() => {
                  setHelpOpen(true);
                }}
                className="flex items-center gap-3 w-full text-left p-3 rounded hover:bg-gray-50 mt-2"
              >
                <span className="text-lg">❓</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Help Center</div>
                  <div className="text-xs text-gray-500">Contact / Support</div>
                </div>
              </button>

              {/* Send Feedback */}
              <button
                onClick={() => {
                  setFeedbackOpen(true);
                }}
                className="flex items-center gap-3 w-full text-left p-3 rounded hover:bg-gray-50 mt-2"
              >
                <span className="text-lg">📝</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Send Feedback</div>
                  <div className="text-xs text-gray-500">Tell us what you think</div>
                </div>
              </button>

              {/* Dark / Light Mode */}
              <div className="flex items-center justify-between w-full p-3 rounded hover:bg-gray-50 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌓</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Dark / Light Mode</div>
                    <div className="text-xs text-gray-500">Toggle theme (placeholder)</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleDarkMode()}
                  className="px-3 py-1 bg-gray-100 rounded text-sm"
                >
                  {darkMode ? "Dark" : "Light"}
                </button>
              </div>

              {/* Notifications section */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Notifications</div>
                      <div className="text-xs text-gray-500">Manage notification preferences</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{notificationsPaused ? "Paused" : "On"}</div>
                </div>

                <div className="flex items-center justify-between p-2">
                  <div className="text-sm text-gray-800">Pause all notifications</div>
                  <input
                    type="checkbox"
                    checked={notificationsPaused}
                    onChange={(e) => {
                      togglePauseNotifications(e.target.checked);
                    }}
                  />
                </div>

                <div className="mt-2 p-2 rounded bg-gray-50">
                  <div className="flex items-center justify-between p-2">
                    <div className="text-sm text-gray-800">Ratings & user messages</div>
                    <input
                      type="checkbox"
                      checked={ratingsMsgEnabled}
                      onChange={(e) => toggleRatingsMessages(e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <div className="text-sm text-gray-800">Dating messages</div>
                    <input
                      type="checkbox"
                      checked={datingMsgEnabled}
                      onChange={(e) => toggleDatingMessages(e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <div className="text-sm text-gray-800">Clubs messages & events</div>
                    <input
                      type="checkbox"
                      checked={clubsMsgEnabled}
                      onChange={(e) => toggleClubsMessages(e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <div className="text-sm text-gray-800">Campus news</div>
                    <input
                      type="checkbox"
                      checked={campusNewsEnabled}
                      onChange={(e) => toggleCampusNews(e.target.checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Membership Status & History */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  router.push("/membership");
                }}
                className="flex items-center gap-3 w-full text-left p-3 mt-4 rounded hover:bg-gray-50"
              >
                <span className="text-lg">📜</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Membership Status & History</div>
                  <div className="text-xs text-gray-500">View your clubs & past activity</div>
                </div>
              </button>
            </div>

            {/* Footer area with logout */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">Signed in as</div>
                <div className="text-sm font-medium text-gray-900">{profileName}</div>
              </div>

              <div className="mt-3">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Logout
                </button>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    router.push("/account/delete");
                  }}
                  className="w-full mt-2 px-4 py-2 border text-sm rounded text-red-600 hover:bg-red-50"
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ABOUT modal */}
        {aboutOpen && (
          <ModalOverlay onClose={() => setAboutOpen(false)}>
            <div className="w-full bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900">About Campus5</h3>
                <button onClick={() => setAboutOpen(false)} className="text-gray-500">
                  ✕
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-800 space-y-2">
                <p>
                  Campus5 is a campus community platform connecting clubs, events, ratings and social
                  features for students. It includes club management, events (intra/inter), a rating
                  system, a blind dating feature and an ads/sponsorship module.
                </p>
                <p>
                  This project uses Supabase for backend data (auth, real-time events, and Postgres),
                  and Next.js for the frontend.
                </p>
                <p className="text-xs text-gray-500">
                  Developer note: add more project-specific details here (vision, team, contact).
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setAboutOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded">
                  Close
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* HELP modal */}
        {helpOpen && (
          <ModalOverlay onClose={() => setHelpOpen(false)}>
            <div className="w-full bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Help Center</h3>
                <button onClick={() => setHelpOpen(false)} className="text-gray-500">
                  ✕
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={submitHelp}>
                <div>
                  <label className="text-sm text-gray-700">Name</label>
                  <input
                    value={helpName}
                    onChange={(e) => setHelpName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    value={helpEmail}
                    onChange={(e) => setHelpEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="your@college.edu"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Message</label>
                  <textarea
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={6}
                    placeholder="Describe your issue..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="px-4 py-2 border rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">
                    Send
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}

        {/* FEEDBACK modal */}
        {feedbackOpen && (
          <ModalOverlay onClose={() => setFeedbackOpen(false)}>
            <div className="w-full bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Send Feedback</h3>
                <button onClick={() => setFeedbackOpen(false)} className="text-gray-500">
                  ✕
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={submitFeedback}>
                <div>
                  <label className="text-sm text-gray-700">Name</label>
                  <input
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="your@college.edu"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700">Type</label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  >
                    <option value="general">General</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-700">Message</label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={6}
                    placeholder="Tell us what you think..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    className="px-4 py-2 border rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">
                    Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}

        <style jsx global>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}

/* ---------- Helper modal overlay component ---------- */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={() => onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}