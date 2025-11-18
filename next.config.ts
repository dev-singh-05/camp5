import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export - Supabase auth requires server-side runtime
  // output: 'export',

  // Keep image optimization disabled for compatibility
  images: {
    unoptimized: true,
  },

  // Trailing slash for better compatibility
  trailingSlash: true,

  typescript: {
    // Temporarily ignore TypeScript errors during builds
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
