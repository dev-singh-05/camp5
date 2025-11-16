// Performance Optimization: Hook to detect mobile devices
// WHY: Allows us to disable expensive animations on mobile while keeping them on desktop
// This improves mobile performance significantly (targeting 60fps)

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint: number = 1024): boolean {
  // Default to true (mobile-first) to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // OPTIMIZATION: Only run on client-side to detect screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // OPTIMIZATION: Debounced resize listener to avoid excessive re-renders
    let timeoutId: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    window.addEventListener('resize', debouncedCheck);
    return () => {
      window.removeEventListener('resize', debouncedCheck);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);

  return isMobile;
}
