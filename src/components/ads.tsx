"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export type Ad = {
  id: string;
  name: string;
  image_path: string | null;
  title: string | null;
  body: string | null;
  action_url: string | null;
  placement: string | null; // e.g. "ratings_page", "dashboard_page", "dating_page"
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

export default function AdBanner({ placement }: { placement: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAds = async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("ads")
          .select("*")
          .eq("active", true)
          .or(`placement.eq.${placement},placement.ilike.%${placement}%`)
          .or(`starts_at.is.null,starts_at.lte.${now}`)
          .or(`ends_at.is.null,ends_at.gte.${now}`)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(15);

        if (error) throw error;
        if (!isMounted) return;
        setAds(data ?? []);
        setIndex(0);
      } catch (e) {
        console.error("Ads fetch failed:", e);
        if (isMounted) setAds([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();
    return () => {
      isMounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [placement]);

  // variable dwell time: higher priority stays longer
  const durations = useMemo(() => {
    return ads.map((a) => Math.max(1200, 3600 + (a.priority || 0) * 900));
  }, [ads]);

  // autoplay
  useEffect(() => {
    if (!ads.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setIndex((i) => (i + 1) % ads.length),
      durations[index] || 3600
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ads.length, durations, index]);

  if (loading || ads.length === 0) return null;
  const ad = ads[index];

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
    </section>
  );
}