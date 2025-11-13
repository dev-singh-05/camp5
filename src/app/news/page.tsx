"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";

type NewsArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  image_url: string | null;
  views: number;
  published_at: string;
  pinned: boolean;
};

export default function NewsPage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    loadNews();
    getUserId();
    
    // Subscribe to real-time news updates
    const channel = supabase
      .channel('news-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campus_news',
        },
        (payload) => {
          console.log('News update:', payload);
          loadNews(); // Reload all news when any change happens
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterCategory]);

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id || null);
  };

  const loadNews = async () => {
    setLoading(true);
    
    // Fetch news with proper ordering:
    // 1. Pinned first (pinned DESC means true comes before false)
    // 2. Then by newest published_at (most recent first)
    let query = supabase
      .from("campus_news")
      .select("*")
      .eq("published", true)
      .order("pinned", { ascending: false })      // Pinned news first
      .order("published_at", { ascending: false }); // Then newest first

    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load news");
      console.error(error);
    } else {
      setNews(data || []);
    }
    setLoading(false);
  };

  const openNewsModal = async (article: NewsArticle) => {
    setSelectedNews(article);

    // Mark as viewed
    if (userId) {
      await supabase.rpc("increment_news_views", {
        news_id_param: article.id,
        user_id_param: userId,
      });

      // Update local view count
      setNews((prev) =>
        prev.map((n) => (n.id === article.id ? { ...n, views: n.views + 1 } : n))
      );
    }
  };

  const closeModal = () => {
    setSelectedNews(null);
  };

  const copyLink = () => {
    if (selectedNews) {
      const url = `${window.location.origin}/news?id=${selectedNews.id}`;
      navigator.clipboard.writeText(url);
      toast.success("📋 Link copied!");
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "academic":
        return "🎓";
      case "sports":
        return "🏆";
      case "events":
        return "📅";
      default:
        return "📢";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "academic":
        return "from-blue-500/20 to-cyan-500/20 text-cyan-400";
      case "sports":
        return "from-green-500/20 to-emerald-500/20 text-emerald-400";
      case "events":
        return "from-purple-500/20 to-pink-500/20 text-pink-400";
      default:
        return "from-gray-500/20 to-slate-500/20 text-slate-400";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <p className="text-white/60">Loading news...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Toaster />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/20 text-white transition-all"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">📰 Campus News</h1>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterCategory === "all"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/10 backdrop-blur-xl border border-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory("academic")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterCategory === "academic"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "bg-white/10 backdrop-blur-xl border border-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              🎓 Academic
            </button>
            <button
              onClick={() => setFilterCategory("sports")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterCategory === "sports"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                  : "bg-white/10 backdrop-blur-xl border border-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              🏆 Sports
            </button>
            <button
              onClick={() => setFilterCategory("events")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterCategory === "events"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/10 backdrop-blur-xl border border-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              📅 Events
            </button>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
            <p className="text-white/60 text-lg">No news articles found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((article) => (
              <div
                key={article.id}
                onClick={() => openNewsModal(article)}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                  {article.image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className={`h-48 bg-gradient-to-br ${getCategoryColor(article.category)} flex items-center justify-center`}>
                      <span className="text-6xl">{getCategoryIcon(article.category)}</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      {article.pinned && (
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-semibold">
                          📌 Pinned
                        </span>
                      )}
                      <span
                        className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(
                          article.category
                        )} font-medium`}
                      >
                        {getCategoryIcon(article.category)} {article.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {article.title}
                    </h3>

                    {article.excerpt && (
                      <p className="text-sm text-white/60 mb-3 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-white/40 mb-4">
                      <span>
                        {new Date(article.published_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        👁️ {article.views}
                      </span>
                    </div>

                    <button className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 text-sm font-semibold shadow-lg transition-all">
                      Read More →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      {selectedNews && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-black/60 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(
                    selectedNews.category
                  )} font-medium`}
                >
                  {getCategoryIcon(selectedNews.category)} {selectedNews.category}
                </span>
                {selectedNews.pinned && (
                  <span className="text-xs px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-semibold">
                    📌 Pinned
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-white/60 hover:text-white text-2xl transition-colors"
              >
                ✖
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <h1 className="text-3xl font-bold text-white mb-4">
                {selectedNews.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-white/50 mb-6">
                <span>
                  📅{" "}
                  {new Date(selectedNews.published_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>👁️ {selectedNews.views} views</span>
              </div>

              {selectedNews.image_url && (
                <img
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  className="w-full h-96 object-cover rounded-xl mb-6 border border-white/10"
                />
              )}

              <div className="prose max-w-none">
                <div className="text-white/80 whitespace-pre-wrap leading-relaxed text-base">
                  {selectedNews.content}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-6 flex items-center justify-between">
              <button
                onClick={copyLink}
                className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-xl hover:bg-white/20 flex items-center gap-2 transition-all"
              >
                🔗 Copy Link
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
  );
}