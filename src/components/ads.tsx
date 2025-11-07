"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ExternalLink } from "lucide-react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  async function fetchAd() {
    try {
      setLoading(true);
      
      // Check current time for time-based ads
      const now = new Date().toISOString();

      const { data, error: queryError } = await supabase
        .from("ads")
        .select("*")
        .eq("active", true)
        // Match placement exactly or with comma-separated values
        .or(`placement.eq.${placement},placement.ilike.%${placement}%`)
        // Optional: Check if ad is within valid date range
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
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

      // Check if we got results
      if (data && data.length > 0) {
        console.log("Ad fetched successfully:", data[0]);
        setAd(data[0]);
      } else {
        console.log(`No active ads found for placement: ${placement}`);
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

  // Don't render anything while loading or if no ad
  if (loading || !ad) return null;

  return (
    <div className="w-full bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg overflow-hidden border border-purple-100 hover:shadow-xl transition-shadow duration-300">
      {ad.image_path && (
        <div className="w-full h-48 relative overflow-hidden bg-gray-100">
          <img
            src={ad.image_path}
            alt={ad.name || "Advertisement"}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
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
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
        
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
          Sponsored
        </p>
      </div>
    </div>
  );
}