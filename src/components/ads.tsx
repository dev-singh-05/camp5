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

  useEffect(() => {
    fetchAd();
  }, [placement]);

  async function fetchAd() {
    try {
      setLoading(true);
      
      // Check current time for time-based ads
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("active", true)
        // Use contains operator for text array or exact match
        .or(`placement.eq.${placement},placement.ilike.%${placement}%`)
        // Optional: Check if ad is within valid date range
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching ad:", error);
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
      console.error("Unexpected error fetching ad:", err);
      setAd(null);
    } finally {
      setLoading(false);
    }
  }

  // Don't render anything while loading or if no ad
  if (loading || !ad) return null;

  return (
    <div className="my-8 flex flex-col items-center text-center bg-white rounded-2xl shadow p-4">
      {ad.image_path && (
        <img
          src={ad.image_path}
          alt={ad.name || "Advertisement"}
          className="w-full max-w-sm rounded-lg mb-3 object-cover"
        />
      )}
      {ad.title && <h3 className="font-semibold text-lg">{ad.title}</h3>}
      {ad.body && <p className="text-gray-600 text-sm mt-1">{ad.body}</p>}
      {ad.action_url && (
        <a
          href={ad.action_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Learn More
        </a>
      )}
    </div>
  );
}