// Performance Optimization: Debounce hook to reduce excessive API calls
// WHY: Prevents search queries from firing on every keystroke
// Reduces API calls from potentially 10+ per search to just 1

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // OPTIMIZATION: Set up a timer to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // OPTIMIZATION: Cleanup function to cancel timer if value changes before delay
    // This prevents unnecessary updates and API calls
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
