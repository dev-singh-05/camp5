// Performance Optimization: Intersection Observer hook for lazy rendering
// WHY: Only renders components when they're visible in viewport
// Reduces initial render time and improves scrolling performance

import { useState, useEffect, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Hook to detect if an element is visible in the viewport
 *
 * @param elementRef - React ref to the element to observe
 * @param options - Intersection Observer options
 * @returns boolean indicating if element is visible
 *
 * Usage: Use this to lazy load content that's off-screen
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  }: UseIntersectionObserverOptions = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already visible and frozen, don't observe
    if (freezeOnceVisible && isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, threshold, root, rootMargin, freezeOnceVisible, isVisible]);

  return isVisible;
}
