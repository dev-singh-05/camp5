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

// IMPORTANT: Direct access to process.env.NEXT_PUBLIC_* is required
// for Next.js to replace these at build time. Dynamic lookups don't work!
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

// FIX: Ensure the URL always has the https:// protocol
// This prevents ERR_NAME_NOT_RESOLVED errors when the env var is set without the protocol
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
  console.warn('[Supabase] URL was missing protocol, added https://', supabaseUrl);
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Debug logging for mobile
const logMobileConfig = () => {
  if (typeof window !== 'undefined' && isNative()) {
    console.log('[Mobile Supabase] Initializing with config:', {
      url: supabaseUrl,
      hasKey: !!supabaseAnonKey,
      keyLength: supabaseAnonKey?.length,
      platform: isAndroid() ? 'Android' : 'iOS',
      isPlaceholder: supabaseUrl.includes('placeholder'),
    });

    if (supabaseUrl.includes('placeholder')) {
      console.error(
        '[Mobile Supabase] ⚠️ WARNING: Using placeholder URL! Check .env.production file.'
      );
    }
  }
};

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

// Mobile-specific fetch configuration with timeout support
const getMobileFetchConfig = () => {
  if (!isNative()) return {};

  // Custom fetch wrapper with timeout for mobile
  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const timeout = 30000; // 30 second timeout for mobile networks

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout - please check your network connection');
      }
      throw error;
    }
  };

  return {
    global: {
      fetch: fetchWithTimeout,
    },
  };
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
  // Apply mobile-specific fetch configuration
  ...getMobileFetchConfig(),
});

// Log configuration on mobile for debugging
if (typeof window !== 'undefined') {
  logMobileConfig();
}
