"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import AdBanner from "@/components/ads";

type NewsType = "rating" | "user_message" | "dating_chat" | "club_event" | "club_message";
type NewsItem = {
  id: string;
  type: NewsType;
  title: string;
  body?: string | null;
  created_at: string;
  meta?: Record<string, any>;
};

type CampusNews = {
  id: string;
  title: string;
  category: string;
  published_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [campusNews, setCampusNews] = useState<CampusNews[]>([]);
  const [hasUnreadNews, setHasUnreadNews] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [tableExists, setTableExists] = useState<boolean>(true);

  const userIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

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

      const dismissed = await loadDismissedNotifications(userId);
      await loadInitialNews(userId, dismissed);
      await loadCampusNews(userId);
      await startRealtime(userId);
      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
      cleanupRealtime();
    };
  }, []);

  async function loadDismissedNotifications(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from("dismissed_notifications")
        .select("notification_id")
        .eq("user_id", userId);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setTableExists(false);
          return new Set();
        }
        return new Set();
      }

      const dismissed = new Set((data || []).map(d => d.notification_id));
      setDismissedIds(dismissed);
      return dismissed;
    } catch (err) {
      return new Set();
    }
  }

  async function loadCampusNews(userId: string) {
    try {
      const { data, error } = await supabase
        .from("campus_news")
        .select("id, title, category, published_at")
        .eq("published", true)
        .eq("featured", true)
        .order("pinned", { ascending: false })      // Pinned first
        .order("published_at", { ascending: false }) // Then newest
        .limit(4);                                   // Show only 4 on dashboard

      if (error) {
        console.error("Error loading campus news:", error);
        return;
      }

      setCampusNews(data || []);

      // Check for unread news
      const { data: viewedNews } = await supabase
        .from("news_views")
        .select("news_id")
        .eq("user_id", userId);

      const viewedIds = new Set((viewedNews || []).map(v => v.news_id));
      const hasUnread = (data || []).some(n => !viewedIds.has(n.id));
      setHasUnreadNews(hasUnread);
    } catch (err) {
      console.error("loadCampusNews error:", err);
    }
  }

  async function loadInitialNews(userId: string, dismissedIdsParam?: Set<string>) {
    try {
      const dismissed = dismissedIdsParam || dismissedIds;
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
      const filtered = results.filter(item => !dismissed.has(item.id));
      setNews(filtered);
    } catch (err) {
      console.error("loadInitialNews error:", err);
    }
  }

  async function startRealtime(userId: string) {
    try {
      cleanupRealtime();
      const channel = supabase.channel(`dashboard-news-${userId}`);

      // ... existing realtime subscriptions ...

      // Subscribe to campus news changes
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campus_news" },
        async () => {
          await loadCampusNews(userId);
        }
      );

      await channel.subscribe();
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

  async function resetDismissedItems() {
    if (!userIdRef.current || !tableExists) return;
    const { error } = await supabase
      .from("dismissed_notifications")
      .delete()
      .eq("user_id", userIdRef.current);

    if (!error) {
      const emptySet = new Set<string>();
      setDismissedIds(emptySet);
      await loadInitialNews(userIdRef.current, emptySet);
    }
  }

  function pushNews(item: NewsItem) {
    if (dismissedIds.has(item.id)) return;
    setNews((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      const next = [item, ...prev].slice(0, 200);
      next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return next;
    });
  }

  async function removeNewsItem(id: string) {
    if (!userIdRef.current) return;
    if (tableExists) {
      await supabase
        .from("dismissed_notifications")
        .insert({ user_id: userIdRef.current, notification_id: id });
    }
    setDismissedIds(prev => new Set([...prev, id]));
    setNews((prev) => prev.filter((n) => n.id !== id));
  }

  async function clearAllNews() {
    if (!userIdRef.current || news.length === 0) return;
    if (tableExists) {
      const rows = news.map(item => ({
        user_id: userIdRef.current!,
        notification_id: item.id,
      }));
      await supabase.from("dismissed_notifications").upsert(rows, { onConflict: 'user_id,notification_id' });
    }
    const newDismissed = new Set([...dismissedIds, ...news.map(n => n.id)]);
    setDismissedIds(newDismissed);
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
      default:
        router.push("/");
    }
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "academic": return "🎓";
      case "sports": return "🏆";
      case "events": return "📅";
      default: return "📢";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-r from-purple-500 to-pink-600">
        <p className="text-white text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-extrabold text-indigo-700">Campus5 Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="font-medium text-gray-700 hover:underline">
              Welcome, {profileName}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📢 Advertisements</h3>
                <span className="text-xs text-gray-500">Featured promotions</span>
              </div>
              <AdBanner placement="dashboard" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/clubs" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                  <div className="text-3xl group-hover:scale-110 transition-transform">🏆</div>
                  <div className="mt-2 text-sm font-semibold">Clubs</div>
                </div>
              </Link>
              <Link href="/ratings" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                  <div className="text-3xl group-hover:scale-110 transition-transform">⭐</div>
                  <div className="mt-2 text-sm font-semibold">Ratings</div>
                </div>
              </Link>
              <Link href="/dating" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer group">
                  <div className="text-3xl group-hover:scale-110 transition-transform">💌</div>
                  <div className="mt-2 text-sm font-semibold">Blind Dating</div>
                </div>
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="sticky top-6 space-y-4">
              {/* Latest Updates */}
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Latest Updates</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearAllNews}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                    >
                      Clear
                    </button>
                    <span className="text-xs text-gray-500">{news.length}</span>
                  </div>
                </div>
                <div className="max-h-[35vh] overflow-y-auto pr-2">
                  {news.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm mb-2">No updates</p>
                      {tableExists && (
                        <button onClick={resetDismissedItems} className="text-xs text-indigo-600 hover:underline">
                          Show dismissed
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {news.map((n) => (
                        <li key={n.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border hover:bg-white transition">
                          <div className="flex-1 min-w-0">
                            <button onClick={() => handleNewsClick(n)} className="text-left w-full">
                              <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                              {n.body && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>}
                            </button>
                          </div>
                          <button onClick={() => removeNewsItem(n.id)} className="text-gray-400 hover:text-gray-700 text-sm">✖</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Campus News */}
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">📰 Campus News</h3>
                  <Link
                    href="/news"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    View All →
                    {hasUnreadNews && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                  </Link>
                </div>
                <div className="max-h-[35vh] overflow-y-auto pr-2">
                  {campusNews.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">No news yet</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {campusNews.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => router.push("/news")}
                          className="p-2 bg-gray-50 rounded-lg border hover:bg-white transition cursor-pointer"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{getCategoryIcon(n.category)}</span>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {new Date(n.published_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}