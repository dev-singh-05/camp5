/**
 * Environment configuration
 * This module provides a centralized way to access environment variables
 * Works with both Next.js (web) and Capacitor (mobile)
 */

// For Next.js, these are embedded at build time
// For the mobile app, make sure to rebuild after changing .env.local
export const NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validation helper
export function validateEnv(): boolean {
  const hasUrl = !!NEXT_PUBLIC_SUPABASE_URL &&
    NEXT_PUBLIC_SUPABASE_URL !== '' &&
    !NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const hasKey = !!NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    NEXT_PUBLIC_SUPABASE_ANON_KEY !== '' &&
    !NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder');

  if (!hasUrl || !hasKey) {
    console.error('❌ Supabase environment variables not found or invalid!');
    console.error('Make sure .env.local exists with valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return false;
  }

  console.log('✅ Supabase environment variables loaded successfully');
  return true;
}
