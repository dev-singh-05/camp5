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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  async function fetchAd() {
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
        .limit(1);

      if (error) {
        console.error("Error fetching ad:", error);
        setAd(null);
        return;
      }

      if (data && data.length > 0) setAd(data[0]);
      else setAd(null);
    } catch (err) {
      console.error("Unexpected error fetching ad:", err);
      setAd(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !ad) return null;

  return (
    <div className="w-full flex justify-center mt-8 mb-8 px-4">
      <div
        className="w-full max-w-5xl bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row items-stretch"
        role="region"
        aria-label="Advertisement"
      >
        {/* Image column (kept compact to avoid overwhelming the layout) */}
        {ad.image_path && (
          <div className="w-full sm:w-1/3 h-36 sm:h-auto flex-shrink-0 overflow-hidden bg-gray-50">
            <img
              src={ad.image_path}
              alt={ad.name || "Advertisement"}
              loading="lazy"
              className="w-full h-full object-cover object-center"
              style={{ display: "block" }}
            />
          </div>
        )}

        {/* Content column */}
        <div className="p-4 sm:p-6 flex flex-col justify-between gap-3">
          <div>
            {ad.title && (
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {ad.title}
              </h3>
            )}
            {ad.body && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                {ad.body}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              {ad.action_url ? (
                <a
                  href={ad.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-transform transform hover:-translate-y-0.5"
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span className="inline-block bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-md">
                  Sponsored
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Sponsored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
