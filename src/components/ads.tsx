"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type Ad = {
  id: string;
  name: string;
  image_path: string | null;
  title: string | null;
  body: string | null;
  action_url: string | null;
  placement: string | null;
  priority: number;
};

export default function AdBanner({ placement }: { placement: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAd();
  }, [placement]);

  async function fetchAd() {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 AdBanner: Fetching ad for placement:", placement);

      const { data, error: queryError } = await supabase
        .from("ads")
        .select("*")
        .eq("active", true)
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      console.log("📊 AdBanner query result:", { 
        placement, 
        data, 
        error: queryError,
        foundAds: data?.length || 0 
      });

      if (queryError) {
        console.error("❌ AdBanner error:", queryError);
        setError(queryError.message);
        setAd(null);
        return;
      }

      if (data && data.length > 0) {
        console.log("✅ AdBanner: Ad loaded successfully:", data[0]);
        setAd(data[0]);
      } else {
        console.log(`⚠️ AdBanner: No active ads found for placement '${placement}'`);
        setAd(null);
      }
    } catch (err) {
      console.error("💥 AdBanner unexpected error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setAd(null);
    } finally {
      setLoading(false);
    }
  }

  // Show loading state (optional - can remove to show nothing while loading)
  if (loading) {
    return (
      <div className="w-full bg-gray-100 rounded-2xl shadow-lg overflow-hidden border border-gray-200 animate-pulse">
        <div className="w-full h-48 bg-gray-200"></div>
        <div className="p-6 space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Show error in development (remove in production)
  if (error && process.env.NODE_ENV === 'development') {
    return (
      <div className="w-full bg-red-50 border-2 border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-semibold">Ad Error</p>
        <p className="text-red-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  // Don't render anything if no ad (most common case)
  if (!ad) {
    console.log("⭕ AdBanner: No ad to display");
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg overflow-hidden border border-purple-100 hover:shadow-xl transition-shadow duration-300">
      {ad.image_path && (
        <div className="w-full h-48 relative overflow-hidden bg-gray-100">
          <img
            src={ad.image_path}
            alt={ad.name || "Advertisement"}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.error("❌ AdBanner: Image failed to load:", ad.image_path);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="p-6 space-y-3">
        {ad.title && (
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            {ad.title}
          </h3>
        )}
        
        {ad.body && (
          <p className="text-gray-700 text-sm leading-relaxed">
            {ad.body}
          </p>
        )}
        
        {ad.action_url && (
          <a
            href={ad.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 group"
          >
            Learn More
            <svg 
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
          Sponsored
        </p>
      </div>
    </div>
  );
}