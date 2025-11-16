/**
 * PERFORMANCE OPTIMIZATION: useIsMobile hook
 *
 * WHY: Allows us to disable expensive animations on mobile devices
 * to improve performance and battery life.
 *
 * Uses matchMedia API for accurate mobile detection (not just window width)
 * Memoized to prevent unnecessary re-renders
 */

import { useState, useEffect } from "react";

export function useIsMobile(breakpoint: number = 768): boolean {
  // Default to false for SSR compatibility
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // PERFORMANCE: Use matchMedia for efficient mobile detection
    // This is better than resize listeners as it only fires when crossing breakpoint
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // PERFORMANCE: Modern event listener (better than deprecated addListener)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
