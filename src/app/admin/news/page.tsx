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
  published: boolean;
  featured: boolean;
  pinned: boolean;
  image_url: string | null;
  views: number;
  created_at: string;
  published_at: string | null;
};

export default function AdminNewsPage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push("/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!adminData) {
      toast.error("Access denied. Admins only.");
      router.push("/dashboard");
      return;
    }

    await fetchNews();
  };

  const fetchNews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campus_news")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load news");
      console.error(error);
    } else {
      setNews(data || []);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingNews(null);
    setTitle("");
    setExcerpt("");
    setContent("");
    setCategory("general");
    setPublished(false);
    setFeatured(false);
    setPinned(false);
    setImageFile(null);
    setImageUrl("");
    setShowModal(true);
  };

  const openEditModal = (article: NewsArticle) => {
    setEditingNews(article);
    setTitle(article.title);
    setExcerpt(article.excerpt || "");
    setContent(article.content);
    setCategory(article.category);
    setPublished(article.published);
    setFeatured(article.featured);
    setPinned(article.pinned);
    setImageFile(null);
    setImageUrl(article.image_url || "");
    setShowModal(true);
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl || null;

    setUploading(true);
    const fileName = `news_${Date.now()}_${imageFile.name}`;
    const { data, error } = await supabase.storage
      .from("news-images")
      .upload(fileName, imageFile);

    setUploading(false);

    if (error) {
      toast.error("Failed to upload image");
      console.error(error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("news-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    const uploadedImageUrl = await handleImageUpload();

    const articleData = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      category,
      published,
      featured,
      pinned,
      image_url: uploadedImageUrl,
      published_at: published ? new Date().toISOString() : null,
    };

    if (editingNews) {
      // Update existing
      const { error } = await supabase
        .from("campus_news")
        .update(articleData)
        .eq("id", editingNews.id);

      if (error) {
        toast.error("Failed to update article");
        console.error(error);
        return;
      }

      toast.success("✅ Article updated");
    } else {
      // Create new
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("campus_news")
        .insert([{ ...articleData, author_id: userData.user?.id }]);

      if (error) {
        toast.error("Failed to create article");
        console.error(error);
        return;
      }

      toast.success("✅ Article created");
    }

    setShowModal(false);
    await fetchNews();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    const { error } = await supabase
      .from("campus_news")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete article");
      console.error(error);
      return;
    }

    toast.success("🗑️ Article deleted");
    await fetchNews();
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("campus_news")
      .update({
        published: !currentStatus,
        published_at: !currentStatus ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(!currentStatus ? "📰 Published" : "📝 Unpublished");
    await fetchNews();
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("campus_news")
      .update({ featured: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update featured status");
      return;
    }

    toast.success(!currentStatus ? "⭐ Featured" : "Unfeatured");
    await fetchNews();
  };

  const togglePinned = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("campus_news")
      .update({ pinned: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update pinned status");
      return;
    }

    toast.success(!currentStatus ? "📌 Pinned" : "Unpinned");
    await fetchNews();
  };

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
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <Toaster />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">📰 Manage Campus News</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            + Create New Article
          </button>
        </div>

        {news.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No news articles yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {news.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCategoryIcon(article.category)}</span>
                      <h3 className="font-bold text-lg text-gray-900">{article.title}</h3>
                      {article.pinned && <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">📌 Pinned</span>}
                      {article.featured && <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">⭐ Featured</span>}
                      <span className={`text-xs px-2 py-1 rounded ${article.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {article.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    {article.excerpt && (
                      <p className="text-sm text-gray-600 mb-2">{article.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👁️ {article.views} views</span>
                      <span>📅 {new Date(article.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => togglePublished(article.id, article.published)}
                      className={`px-3 py-1 rounded text-sm ${article.published ? 'bg-gray-200 hover:bg-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      {article.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => toggleFeatured(article.id, article.featured)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                    >
                      {article.featured ? "Unfeature" : "Feature"}
                    </button>
                    <button
                      onClick={() => togglePinned(article.id, article.pinned)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      {article.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => openEditModal(article)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingNews ? "Edit Article" : "Create New Article"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✖
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Enter article title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="general">📢 General</option>
                  <option value="academic">🎓 Academic</option>
                  <option value="sports">🏆 Sports</option>
                  <option value="events">📅 Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Excerpt (Preview)</label>
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Short preview (150 characters max)"
                  maxLength={150}
                />
                <p className="text-xs text-gray-500 mt-1">{excerpt.length}/150 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 border rounded-lg h-64"
                  placeholder="Write the full article content..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-lg"
                />
                {imageUrl && !imageFile && (
                  <img src={imageUrl} alt="Current" className="mt-2 w-32 h-32 object-cover rounded" />
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  <span className="text-sm font-semibold">Publish now</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                  />
                  <span className="text-sm font-semibold">⭐ Featured (show on dashboard)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                  />
                  <span className="text-sm font-semibold">📌 Pin to top</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : editingNews ? "Update Article" : "Create Article"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}