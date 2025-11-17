// Performance Optimization: Combined hook for animation reduction logic
// WHY: Centralizes all conditions that should disable/reduce animations
// Considers mobile, reduced motion preferences, and device performance

import { useIsMobile } from './useIsMobile';
import { useReducedMotion } from './useReducedMotion';

/**
 * Hook that determines if animations should be reduced or disabled
 * Considers multiple factors:
 * - Mobile devices (limited GPU, battery)
 * - User's motion preferences (accessibility)
 * - Device performance indicators
 *
 * @returns boolean - true if animations should be reduced/disabled
 *
 * Usage:
 * const shouldReduce = useShouldReduceAnimations();
 * return shouldReduce ? <StaticComponent /> : <AnimatedComponent />;
 */
export function useShouldReduceAnimations(): boolean {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Reduce animations if:
  // 1. User is on mobile (limited resources)
  // 2. User prefers reduced motion (accessibility/battery saving)
  return isMobile || prefersReducedMotion;
}
