/*
 * IMPORTANT: After deployment, add these redirect URLs in Supabase Dashboard:
 * - Authentication > URL Configuration > Redirect URLs
 * - Add: com.campus5.app://auth/callback (Android)
 * - Add: campus5://auth/callback (iOS - if deploying iOS later)
 * - Add: http://localhost:3000/auth/callback (Web development)
 * - Add: https://yourdomain.com/auth/callback (Production web)
 */

import { createClient } from "@supabase/supabase-js";
import { isNative, isAndroid } from "./capacitor";

// ✅ Make sure you have these defined in `.env.local` (no quotes)
// Use placeholder values during build if env vars are not available (for static export)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Configure redirect URLs based on platform
const getRedirectUrl = (): string => {
  if (isNative()) {
    // Native mobile app - use deep link URLs
    if (isAndroid()) {
      return "com.campus5.app://auth/callback";
    }
    // iOS uses campus5:// scheme
    return "campus5://auth/callback";
  }
  // Web - use standard HTTP callback
  return `${window.location.origin}/auth/callback`;
};

// ✅ Create the Supabase client for client-side use with mobile support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Only detect session in URL for web, not for native apps
    // Native apps use deep links which are handled differently
    detectSessionInUrl: !isNative(),
    // Set the redirect URL dynamically based on platform
    ...(typeof window !== "undefined" && {
      redirectTo: getRedirectUrl(),
    }),
  },
  // Enable real-time for both web and native
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
