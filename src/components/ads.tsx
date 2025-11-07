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
    <section className="w-full flex justify-center mt-6 mb-8 px-4" role="region" aria-label="Advertisement carousel">
      {/* Increased height + vertical sections */}
      <div className="relative w-full max-w-5xl h-[380px] sm:h-[470px] md:h-[570px] rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white flex flex-col">
        {/* TOP: heading/title (small) */}
        <div className="flex-none px-6 pt-6 pb-3 text-center">
          {ad.title ? (
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {ad.title}
            </h3>
          ) : null}
          {ad.body ? (
            <p className="mt-1 text-gray-600 text-sm md:text-base line-clamp-2">{ad.body}</p>
          ) : null}
        </div>

        {/* MIDDLE: large image area */}
        <div className="relative flex-1 mx-4 sm:mx-6 mb-4 rounded-xl overflow-hidden bg-gray-100">
          {ad.image_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.image_path}
              alt={ad.name || ad.title || "Advertisement"}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* subtle gradient bottom for control contrast */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"/>

          {/* Controls over image (left/right arrows) */}
          {ads.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + ads.length) % ads.length)}
                aria-label="Previous ad"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm border border-white/70 backdrop-blur"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % ads.length)}
                aria-label="Next ad"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm border border-white/70 backdrop-blur"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* BOTTOM: CTA + dots (small) */}
        <div className="flex-none px-6 pb-6 pt-2">
          <div className="flex flex-col items-center gap-3">
            {ad.action_url ? (
              <a
                href={ad.action_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-5 py-2 rounded-md text-sm font-medium shadow-sm"
                aria-label="Learn more about this sponsored content"
              >
                Learn More
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md">Sponsored</span>
            )}

            {/* Dots */}
            {ads.length > 1 && (
              <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                {ads.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to ad ${i + 1}`}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === index ? "bg-gray-800 w-5" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            )}

            <span className="text-[11px] text-gray-400">Sponsored</span>
          </div>
        </div>
      </div>
    </div>
  );
}