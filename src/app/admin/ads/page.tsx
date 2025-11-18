"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AdminAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    body: "",
    action_url: "",
    placement: "",
    priority: 0,
    active: true,
    image: null as File | null,
  });

  // Check if user is admin
  async function checkAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: adminData, error } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !adminData) {
        toast.error("Access denied: Admin only");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error("Admin check error:", err);
      toast.error("Access denied");
      setTimeout(() => router.push("/"), 2000);
    } finally {
      setChecking(false);
    }
  }

  async function fetchAds() {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("updated_at", { ascending: false });
    
    console.log("Fetched ads:", { data, error });
    if (!error) setAds(data || []);
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAds();
    }
  }, [isAdmin]);

  async function handleUpload() {
    if (!form.name) {
      toast.error("Ad name required");
      return;
    }

    if (!form.placement) {
      toast.error("Placement required (e.g., dating_page)");
      return;
    }

    setLoading(true);
    let image_path = null;

    try {
      // Upload image if provided
      if (form.image) {
        const fileExt = form.image.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        console.log("Uploading image:", fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ads")
          .upload(fileName, form.image, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        console.log("Upload successful:", uploadData);

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("ads")
          .getPublicUrl(fileName);

        image_path = publicUrlData?.publicUrl ?? null;
        console.log("Public URL:", image_path);
      }

      // Insert ad into database
      console.log("Inserting ad with data:", {
        name: form.name,
        title: form.title,
        body: form.body,
        action_url: form.action_url,
        placement: form.placement,
        priority: form.priority,
        active: form.active,
        image_path,
      });

      const { data: insertData, error: insertError } = await supabase
        .from("ads")
        .insert([
          {
            name: form.name,
            title: form.title || null,
            body: form.body || null,
            action_url: form.action_url || null,
            placement: form.placement,
            priority: form.priority,
            active: form.active,
            image_path: image_path,
          },
        ])
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error(`Failed to save ad: ${insertError.message}`);
      } else {
        console.log("Insert successful:", insertData);
        toast.success("Ad saved successfully!");
        
        // Reset form
        setForm({
          name: "",
          title: "",
          body: "",
          action_url: "",
          placement: "",
          priority: 0,
          active: true,
          image: null,
        });
        
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        // Refresh ads list
        fetchAds();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("ads")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update ad");
    } else {
      toast.success("Ad updated");
      fetchAds();
    }
  }

  async function deleteAd(id: string) {
    if (!confirm("Delete this ad?")) return;
    
    const { error } = await supabase
      .from("ads")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete ad");
    } else {
      toast.success("Ad deleted");
      fetchAds();
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Checking admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Toaster position="top-center" />
        <p className="text-lg text-red-600">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🛠 Manage Advertisements</h1>
          <button
            onClick={() => router.push("/dating")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ← Back to App
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-8 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Create New Ad</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Name * <span className="text-gray-500 font-normal">(internal use only)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Summer Campaign 2024"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-gray-500 font-normal">(shown to users)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Special Offer!"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Body</label>
            <textarea
              placeholder="e.g., Get 50% off on all premium features"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Action URL</label>
            <input
              type="url"
              placeholder="https://example.com/offer"
              value={form.action_url}
              onChange={(e) => setForm({ ...form, action_url: e.target.value })}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Placement * <span className="text-gray-500 font-normal">(where to show the ad)</span>
            </label>
            <input
              type="text"
              placeholder="dating_page"
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value })}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: <code className="bg-gray-100 px-1 rounded">dating_page</code>, 
              <code className="bg-gray-100 px-1 rounded mx-1">dashboard</code>, 
             <code className="bg-gray-100 px-1 rounded mx-1">clubs</code>, 
           <code className="bg-gray-100 px-1 rounded mx-1">ratings_page</code>,  </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Priority <span className="text-gray-500 font-normal">(higher = shown first)</span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: parseInt(e.target.value) || 0 })
              }
              className="w-full p-3 border rounded focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, image: e.target.files ? e.target.files[0] : null })
              }
              className="w-full p-2 border rounded"
            />
            {form.image && (
              <p className="text-sm text-green-600 mt-1">✓ {form.image.name}</p>
            )}
          </div>

          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Active (ad will be shown)</span>
          </label>

          <button
            disabled={loading}
            onClick={handleUpload}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-lg disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? "Uploading..." : "📤 Create Advertisement"}
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-3">
          Current Ads ({ads.length})
        </h2>
        
        {ads.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">No ads yet. Create your first ad above! 👆</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {ad.image_path && (
                    <img
                      src={ad.image_path}
                      alt="ad preview"
                      className="w-32 h-24 object-cover rounded flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{ad.name}</h3>
                    {ad.title && <p className="text-sm text-gray-700">{ad.title}</p>}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        📍 {ad.placement}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        ⭐ Priority: {ad.priority}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        ad.active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {ad.active ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(ad.id, ad.active)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        ad.active
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {ad.active ? '⏸ Pause' : '▶ Activate'}
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}