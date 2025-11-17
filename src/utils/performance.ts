// Performance Optimization Utilities
// Collection of helper functions to improve app performance

/**
 * Batch state updates to reduce re-renders
 * Useful when you need to update multiple state variables
 *
 * @param updates - Function that performs multiple state updates
 */
export function batchUpdates(updates: () => void): void {
  // React 18+ automatically batches updates, but this ensures compatibility
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => updates(), { timeout: 100 });
  } else {
    // Fallback to immediate execution
    updates();
  }
}

/**
 * Debounce function for event handlers
 * Creates a debounced version of a function
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function for frequent events
 * Ensures function executes at most once per delay period
 *
 * @param fn - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Lazy load a component with a loading fallback
 * Improves initial bundle size by code-splitting
 *
 * @param importFn - Dynamic import function
 * @returns Promise of the component
 */
export async function lazyLoadComponent<T = any>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  const module = await importFn();
  return module.default;
}

/**
 * Check if device has limited resources
 * Used to reduce animations/features on low-end devices
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for navigator.hardwareConcurrency (number of CPU cores)
  const cpuCores = navigator.hardwareConcurrency || 4;

  // Check for available memory (if supported)
  const deviceMemory = (navigator as any).deviceMemory || 4;

  // Consider low-end if:
  // - Less than 2 CPU cores
  // - Less than 2GB RAM
  return cpuCores < 2 || deviceMemory < 2;
}

/**
 * RequestAnimationFrame wrapper for smooth animations
 * Ensures animations run at optimal frame rate
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      callback.apply(this, args);
      rafId = null;
    });
  };
}

/**
 * Optimize images for better loading performance
 * Returns optimized image props for Next.js Image component
 */
export function getOptimizedImageProps(src: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizes = {
    sm: { width: 150, height: 150 },
    md: { width: 400, height: 400 },
    lg: { width: 800, height: 800 },
  };

  return {
    src,
    ...sizes[size],
    quality: 75,
    loading: 'lazy' as const,
    placeholder: 'blur' as const,
  };
}
