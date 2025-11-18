import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Supabase configuration (same as web app)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Create Supabase client for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ← Uses AsyncStorage instead of localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ← No URL detection in mobile
  },
});
