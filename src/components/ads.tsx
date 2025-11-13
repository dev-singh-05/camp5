"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export type Ad = {
  id: string;
  name: string;
  image_path: string | null;
  title: string | null;
  body: string | null;
  action_url: string | null;
  placement: string | null;
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

  // Show loading skeleton while fetching - FIXED: Much darker background
  if (loading) {
    return (
      <section className="w-full" role="region" aria-label="Loading advertisement">
        <div className="relative">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
            <div className="h-[320px] sm:h-[400px] bg-gradient-to-br from-purple-950/20 to-slate-950/20 animate-pulse" />
            <div className="p-5 bg-slate-900/90 backdrop-blur-sm border-t border-white/5">
              <div className="flex items-center justify-between gap-4">
                <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
                <div className="h-9 w-28 bg-white/5 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (ads.length === 0) return null;
  const ad = ads[index];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
      role="region"
      aria-label="Advertisement carousel"
    >
      <div className="relative group">
        {/* Animated gradient background blur */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />

        {/* Main ad container - FIXED: Darker background */}
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Image Section */}
          <div className="relative h-[320px] sm:h-[400px] overflow-hidden bg-slate-900/50">
            {ad.image_path && (
              <img
                src={ad.image_path}
                alt={ad.name || ad.title || "Advertisement"}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Navigation arrows */}
            {ads.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + ads.length) % ads.length)}
                  aria-label="Previous ad"
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % ads.length)}
                  aria-label="Next ad"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            {/* Content overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {ad.title && (
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 drop-shadow-lg">
                  {ad.title}
                </h3>
              )}
              {ad.body && (
                <p className="text-sm text-white/90 line-clamp-2 mb-4 drop-shadow-md">
                  {ad.body}
                </p>
              )}
            </div>
          </div>

          {/* Bottom section with CTA and navigation - FIXED: Darker background */}
          <div className="p-5 bg-slate-900/90 backdrop-blur-sm border-t border-white/5">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Sponsored label */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 px-2.5 py-1 bg-white/5 rounded-full border border-white/10">
                  Sponsored
                </span>
                
                {/* Pagination dots */}
                {ads.length > 1 && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    {ads.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        aria-label={`Go to ad ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          i === index 
                            ? "bg-purple-400 w-6" 
                            : "bg-white/20 hover:bg-white/30 w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: CTA button */}
              {ad.action_url && (
                <a
                  href={ad.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-purple-500/50 transition-all"
                  aria-label="Learn more about this sponsored content"
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Mobile pagination dots */}
            {ads.length > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                {ads.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to ad ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index 
                        ? "bg-purple-400 w-6" 
                        : "bg-white/20 hover:bg-white/30 w-1.5"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}