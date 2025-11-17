// Performance Optimization: Throttle hook to limit execution frequency
// WHY: Prevents excessive function calls during rapid events (scroll, resize, drag)
// Ensures function runs at most once per specified delay period

import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        // Execute immediately if enough time has passed
        callback(...args);
        lastRun.current = now;
      } else {
        // Schedule execution for when delay period is over
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRun.current = Date.now();
          },
          delay - timeSinceLastRun
        );
      }
    }) as T,
    [callback, delay]
  );
}
