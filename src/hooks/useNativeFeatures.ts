'use client';

import { useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { isNative } from '@/utils/capacitor';

/**
 * Hook for triggering haptic feedback on native devices
 * @returns Function to trigger haptic feedback with different impact styles
 */
export const useHaptics = () => {
  const triggerHaptic = useCallback(
    async (
      type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium'
    ) => {
      if (!isNative()) return;

      try {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: ImpactStyle.Light });
            break;
          case 'medium':
            await Haptics.impact({ style: ImpactStyle.Medium });
            break;
          case 'heavy':
            await Haptics.impact({ style: ImpactStyle.Heavy });
            break;
          case 'success':
            await Haptics.notification({ type: 'SUCCESS' });
            break;
          case 'warning':
            await Haptics.notification({ type: 'WARNING' });
            break;
          case 'error':
            await Haptics.notification({ type: 'ERROR' });
            break;
        }
      } catch (error) {
        console.warn('Haptics error:', error);
      }
    },
    []
  );

  return { triggerHaptic };
};

/**
 * Hook for sharing content using native share dialog
 * @returns Function to share content with title, text, and URL
 */
export const useShare = () => {
  const shareContent = useCallback(
    async (options: { title?: string; text?: string; url?: string }) => {
      if (!isNative()) {
        // Fallback to Web Share API if available
        if (navigator.share) {
          try {
            await navigator.share(options);
            return { success: true };
          } catch (error) {
            console.warn('Web Share error:', error);
            return { success: false, error };
          }
        }
        console.warn('Share not available on this platform');
        return { success: false, error: 'Share not available' };
      }

      try {
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.title || 'Share',
        });
        return { success: true };
      } catch (error) {
        console.warn('Native share error:', error);
        return { success: false, error };
      }
    },
    []
  );

  return { shareContent };
};
