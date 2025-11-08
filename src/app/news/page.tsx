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
        return "bg-blue-100 text-blue-700";
      case "sports":
        return "bg-green-100 text-green-700";
      case "events":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading news...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">📰 Campus News</h1>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1 rounded text-sm ${
                filterCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory("academic")}
              className={`px-3 py-1 rounded text-sm ${
                filterCategory === "academic"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🎓 Academic
            </button>
            <button
              onClick={() => setFilterCategory("sports")}
              className={`px-3 py-1 rounded text-sm ${
                filterCategory === "sports"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🏆 Sports
            </button>
            <button
              onClick={() => setFilterCategory("events")}
              className={`px-3 py-1 rounded text-sm ${
                filterCategory === "events"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              📅 Events
            </button>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No news articles found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((article) => (
              <div
                key={article.id}
                onClick={() => openNewsModal(article)}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition group"
              >
                {article.image_url ? (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="text-4xl">{getCategoryIcon(article.category)}</span>
                  </div>
                )}

                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {article.pinned && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                        📌
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(
                        article.category
                      )}`}
                    >
                      {getCategoryIcon(article.category)} {article.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>
                      {new Date(article.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>👁️ {article.views}</span>
                  </div>

                  <button className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold">
                    Read More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      {selectedNews && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
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
                    selectedNews.category
                  )}`}
                >
                  {getCategoryIcon(selectedNews.category)} {selectedNews.category}
                </span>
                {selectedNews.pinned && (
                  <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded">
                    📌 Pinned
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✖
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {selectedNews.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
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
                  className="w-full h-96 object-cover rounded-lg mb-6"
                />
              )}

              <div className="prose max-w-none">
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedNews.content}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-6 flex items-center justify-between">
              <button
                onClick={copyLink}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2"
              >
                🔗 Copy Link
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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