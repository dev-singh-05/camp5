import { App, URLOpenListenerEvent } from "@capacitor/app";
import { supabase } from "./supabaseClient";
import { isNative } from "./capacitor";

/**
 * Initialize mobile deep link auth handler for Capacitor apps
 * This listens for deep link callbacks from OAuth providers
 *
 * Call this in your app initialization (e.g., useEffect in root layout/page)
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   if (isNative()) {
 *     initMobileAuthListener();
 *   }
 * }, []);
 * ```
 */
export const initMobileAuthListener = () => {
  if (!isNative()) {
    return;
  }

  // Listen for deep link events
  App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    const url = event.url;

    // Check if this is an auth callback
    if (url.includes("auth/callback")) {
      try {
        // Extract the URL parameters
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");
        const error = urlObj.searchParams.get("error");

        if (error) {
          console.error("Mobile auth error:", error);
          // Handle error (e.g., show toast, redirect to login)
          return;
        }

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Error exchanging code for session:", exchangeError);
            // Handle error
            return;
          }

          if (data?.session) {
            console.log("Mobile auth successful:", data.session.user.email);
            // Session is now stored - redirect to home or intended page
            // You can use your router here to navigate
          }
        }
      } catch (err) {
        console.error("Error handling mobile auth callback:", err);
      }
    }
  });
};

/**
 * Clean up the mobile auth listener
 * Call this when unmounting or cleaning up
 */
export const removeMobileAuthListener = () => {
  if (!isNative()) {
    return;
  }

  App.removeAllListeners();
};
