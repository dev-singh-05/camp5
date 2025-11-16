'use client';

import { useCallback, useEffect, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { PushNotifications } from '@capacitor/push-notifications';
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

interface PushNotificationState {
  isRegistered: boolean;
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Hook for managing push notifications
 * @returns Push notification state and setup function
 */
export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isRegistered: false,
    token: null,
    error: null,
    isLoading: false,
  });

  const setupPushNotifications = useCallback(async () => {
    if (!isNative()) {
      setState((prev) => ({
        ...prev,
        error: 'Push notifications only available on native platforms',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      } else {
        setState((prev) => ({
          ...prev,
          error: 'Push notification permission denied',
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    if (!isNative()) return;

    // Listen for registration success
    const registrationListener = PushNotifications.addListener(
      'registration',
      (token) => {
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          token: token.value,
          isLoading: false,
          error: null,
        }));
      }
    );

    // Listen for registration errors
    const errorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          error: error.error,
          isLoading: false,
        }));
      }
    );

    // Listen for push notifications received
    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push notification received:', notification);
      }
    );

    // Listen for notification actions (when user taps notification)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        console.log('Push notification action performed:', notification);
      }
    );

    // Cleanup listeners
    return () => {
      registrationListener.remove();
      errorListener.remove();
      notificationListener.remove();
      actionListener.remove();
    };
  }, []);

  return {
    ...state,
    setupPushNotifications,
  };
};
