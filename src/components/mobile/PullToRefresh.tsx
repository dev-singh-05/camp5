'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useHaptics } from '@/hooks/useNativeFeatures';
import { isNative } from '@/utils/capacitor';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  /**
   * Distance in pixels required to trigger refresh
   * @default 80
   */
  pullDistance?: number;
  /**
   * Maximum distance the pull indicator can travel
   * @default 150
   */
  maxPullDistance?: number;
  /**
   * Whether pull-to-refresh is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Pull-to-refresh component with native feel and haptic feedback
 * Only active when running in native app (isNative() === true)
 * Provides smooth animations and haptic feedback on pull
 */
export default function PullToRefresh({
  children,
  onRefresh,
  className = '',
  pullDistance = 80,
  maxPullDistance = 150,
  enabled = true,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullAmount, setPullAmount] = useState(0);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useHaptics();

  // Only enable pull-to-refresh on native platforms
  const isPullEnabled = enabled && isNative();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isPullEnabled || isRefreshing) return;

    // Only start pulling if we're at the top of the scroll container
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop || window.scrollY;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
      setHasTriggeredHaptic(false);
    }
  }, [isPullEnabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !isPullEnabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    // Only pull down (positive difference)
    if (diff > 0) {
      // Apply resistance effect - harder to pull as you go further
      const resistance = 0.5;
      const adjustedDiff = Math.min(diff * resistance, maxPullDistance);
      setPullAmount(adjustedDiff);

      // Trigger haptic feedback when pull distance is reached
      if (adjustedDiff >= pullDistance && !hasTriggeredHaptic) {
        triggerHaptic('medium');
        setHasTriggeredHaptic(true);
      }

      // Prevent default scrolling when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isPullEnabled, isRefreshing, pullDistance, maxPullDistance, hasTriggeredHaptic, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || !isPullEnabled) return;

    setIsPulling(false);

    // Trigger refresh if pulled far enough
    if (pullAmount >= pullDistance) {
      setIsRefreshing(true);
      await triggerHaptic('success');

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
        await triggerHaptic('error');
      } finally {
        setIsRefreshing(false);
        setPullAmount(0);
        setHasTriggeredHaptic(false);
      }
    } else {
      // Snap back if not pulled far enough
      setPullAmount(0);
      setHasTriggeredHaptic(false);
    }
  }, [isPulling, isPullEnabled, pullAmount, pullDistance, onRefresh, triggerHaptic]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPullEnabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPullEnabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const refreshIndicatorHeight = isRefreshing ? pullDistance : pullAmount;
  const isReadyToRefresh = pullAmount >= pullDistance;
  const rotationDegrees = Math.min((pullAmount / pullDistance) * 180, 180);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull-to-refresh indicator */}
      {isPullEnabled && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
          style={{
            height: `${refreshIndicatorHeight}px`,
            transform: `translateY(-${pullDistance - refreshIndicatorHeight}px)`,
            opacity: refreshIndicatorHeight > 0 ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {/* Loading spinner or pull indicator */}
            {isRefreshing ? (
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-6 h-6 text-violet-600 transition-transform duration-200"
                style={{
                  transform: `rotate(${rotationDegrees}deg)`,
                }}
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {/* Status text */}
            <p className="text-xs text-gray-600 font-medium">
              {isRefreshing
                ? 'Refreshing...'
                : isReadyToRefresh
                ? 'Release to refresh'
                : 'Pull to refresh'}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: isPullEnabled && (isPulling || isRefreshing)
            ? `translateY(${refreshIndicatorHeight}px)`
            : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
