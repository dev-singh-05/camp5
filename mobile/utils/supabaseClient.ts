import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ✅ Supabase configuration - Get from expo-constants for proper loading
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "";
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase credentials missing!");
  console.error("EXPO_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Present" : "❌ Missing");
  console.error("EXPO_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ Present" : "❌ Missing");
  console.error("Available env vars:", Constants.expoConfig?.extra);
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file and restart the app."
  );
}

console.log("✅ Supabase client initializing with URL:", supabaseUrl);

// ✅ Create Supabase client for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ← Uses AsyncStorage instead of localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ← No URL detection in mobile
    // Handle token refresh errors gracefully
    flowType: 'pkce',
  },
});

// Add error listener to handle auth errors globally
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
  } else if (event === 'USER_UPDATED') {
    console.log('✅ User updated');
  }
});
