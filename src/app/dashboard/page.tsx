"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type NewsType = "rating" | "user_message" | "dating_chat" | "club_event" | "club_message";
type NewsItem = {
  id: string;
  type: NewsType;
  title: string;
  body?: string | null;
  created_at: string;
  meta?: Record<string, any>;
};

export default function Dashboard() {
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[]>([]);
  const removedItemsRef = useRef<Set<string>>(new Set());

  const [ads] = useState<string[]>([
    "/ads/ad-1.png",
    "/ads/ad-2.png",
    "/ads/ad-3.png",
  ]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const userIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // rotate ads
  useEffect(() => {
    const t = setInterval(() => setActiveAdIndex((i) => (i + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length]);

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

      // initial news + start realtime
      await loadInitialNews(userId);
      await startRealtime(userId);
    }

    init();

    return () => {
      mounted = false;
      cleanupRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // load initial news (same as before)
  // ----------------------------
  async function loadInitialNews(userId: string) {
    try {
      const results: NewsItem[] = [];

      // recent ratings to this user
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

      // recent direct user messages to current user
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

      // dating chats for matches involving user
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

      // club events & club messages for user's clubs
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
      setNews(results);
    } catch (err) {
      console.error("loadInitialNews error:", err);
    }
  }

  // ----------------------------
  // Realtime: create channel, await subscribe, add handlers
  // ----------------------------
  async function startRealtime(userId: string) {
    try {
      cleanupRealtime(); // remove old if any

      const channel = supabase.channel(`dashboard-news-${userId}`);

      // ratings -> target user
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

      // user_messages -> to current user
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

      // dating chat inserts -> filter by involvement
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

      // events -> only push if current user is member
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

      // club messages -> only push if current user is member
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

      // actually subscribe (await to ensure it's active)
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

  // avoid duplicates & respect removedItemsRef
  function pushNews(item: NewsItem) {
    // quick ignore if user dismissed this specific id during this session
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
    setNews((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAllNews() {
    setNews([]);
    // keep removedItemsRef to avoid re-adding exact same ids while session lasts
  }

  // clicking news navigates / or opens relevant place
  function handleNewsClick(item: NewsItem) {
    switch (item.type) {
      case "rating":
        router.push("/ratings/leaderboard");
        break;
      case "user_message":
        if (item.meta?.from_user_id) {
          // route to ratings page with query param; ratings page will open the chat
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-r from-purple-500 to-pink-600">
        <p className="text-white text-lg">Loading dashboard...</p>
      </div>
    );
  }

  // ---------- UI ----------
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
        {/* Layout: left (2 cols) = Sponsor big area + buttons below. Right (1 col) = Latest Updates */}
        <div className="grid grid-cols-3 lg:grid-cols-3 gap-6">
          {/* LEFT: wide area spanning 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Sponsored big area (top + middle combined) */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Sponsored</h3>
                <div className="text-xs text-gray-500">Partner promotions</div>
              </div>

              <div className="w-full h-[420px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                <img
                  src={ads[activeAdIndex]}
                  alt="sponsored"
                  className="object-cover w-full h-full"
                  onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/900x420?text=Your+Ad+Here")}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-24 bg-gray-50 rounded-md flex items-center justify-center">
                  <img src="/ads/ad-small-1.png" alt="ad" className="object-contain h-full" onError={(e)=> (e.currentTarget.src = "https://via.placeholder.com/280x80?text=Ad")} />
                </div>
                <div className="h-24 bg-gray-50 rounded-md flex items-center justify-center">
                  <img src="/ads/ad-small-2.png" alt="ad" className="object-contain h-full" onError={(e)=> (e.currentTarget.src = "https://via.placeholder.com/280x80?text=Ad")} />
                </div>
              </div>

              <div className="mt-3 text-center">
                <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-indigo-600 hover:underline">Become a sponsor</a>
              </div>
            </div>

            {/* Left-bottom: 3 equal buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/clubs" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer">
                  <div className="text-3xl">🏆</div>
                  <div className="mt-2 text-sm font-semibold">Clubs</div>
                </div>
              </Link>

              <Link href="/ratings" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer">
                  <div className="text-3xl">⭐</div>
                  <div className="mt-2 text-sm font-semibold">Ratings</div>
                </div>
              </Link>

              <Link href="/dating" className="block">
                <div className="h-24 bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center hover:shadow-lg transition cursor-pointer">
                  <div className="text-3xl">💌</div>
                  <div className="mt-2 text-sm font-semibold">Blind Dating</div>
                </div>
              </Link>
            </div>
          </div>

          {/* RIGHT: Latest Updates (entire right column) */}
          <aside className="space-y-6">
            <div className="sticky top-6">
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
                  <p className="text-gray-500 text-sm">No recent updates.</p>
                ) : (
                  <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    {news.map((n) => (
                      <li
                        key={n.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-white transition"
                      >
                        <div className="flex-shrink-0">
                          {n.type === "rating" && <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold">⭐</div>}
                          {n.type === "user_message" && <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">✉️</div>}
                          {n.type === "dating_chat" && <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center font-bold">💬</div>}
                          {n.type === "club_event" && <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold">📅</div>}
                          {n.type === "club_message" && <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">🏷️</div>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <button onClick={() => handleNewsClick(n)} className="text-left w-full">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                              <time className="text-xs text-gray-400 ml-2">
                                {new Date(n.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                              </time>
                            </div>
                            {n.body && <p className="text-sm text-gray-700 mt-1 line-clamp-3">{n.body}</p>}
                          </button>
                        </div>

                        <div className="ml-3 flex flex-col items-end gap-2">
                          <button onClick={() => removeNewsItem(n.id)} title="Dismiss" className="text-gray-400 hover:text-gray-700">✖</button>
                          <button onClick={() => handleNewsClick(n)} className="text-xs text-indigo-600 hover:underline">Open</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}