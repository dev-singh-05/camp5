'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from '@/utils/capacitor';

interface BackButtonProps {
  /**
   * List of routes that are considered "home" pages
   * Prevents app exit on these pages
   * @default ['/']
   */
  homeRoutes?: string[];
  /**
   * Callback fired when back button is pressed on home page
   * (just before app would exit)
   */
  onHomeBackPress?: () => void;
  /**
   * Whether to show a confirmation before exiting app from home page
   * @default false
   */
  confirmExit?: boolean;
  /**
   * Custom confirmation message
   * @default "Are you sure you want to exit?"
   */
  confirmMessage?: string;
}

/**
 * Component that handles Android back button behavior
 * Integrates with Next.js router for navigation
 * Prevents accidental app exit on home pages
 *
 * Usage: Add to root layout or individual pages
 * <BackButton homeRoutes={['/', '/dashboard', '/profile']} />
 */
export default function BackButton({
  homeRoutes = ['/'],
  onHomeBackPress,
  confirmExit = false,
  confirmMessage = 'Are you sure you want to exit?',
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only set up back button handler on native platforms
    if (!isNative()) {
      return;
    }

    let lastBackPress = 0;
    const DOUBLE_BACK_DELAY = 2000; // 2 seconds for double-back to exit

    const backButtonListener = CapacitorApp.addListener(
      'backButton',
      async ({ canGoBack }) => {
        const currentPath = pathname;
        const isHomePage = homeRoutes.some(route =>
          route === currentPath || currentPath.startsWith(route + '/')
        );

        if (isHomePage) {
          // On home page - handle exit behavior
          onHomeBackPress?.();

          if (confirmExit) {
            // Show confirmation dialog
            const shouldExit = window.confirm(confirmMessage);
            if (shouldExit) {
              CapacitorApp.exitApp();
            }
          } else {
            // Double-back to exit pattern
            const currentTime = new Date().getTime();
            if (currentTime - lastBackPress < DOUBLE_BACK_DELAY) {
              CapacitorApp.exitApp();
            } else {
              lastBackPress = currentTime;
              // Show toast or message to user
              if (typeof window !== 'undefined') {
                // You could use toast here if available
                console.log('Press back again to exit');
              }
            }
          }
        } else {
          // Not on home page - navigate back if possible
          if (canGoBack) {
            router.back();
          } else {
            // No history, go to home
            router.push(homeRoutes[0]);
          }
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      backButtonListener.remove();
    };
  }, [pathname, router, homeRoutes, onHomeBackPress, confirmExit, confirmMessage]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook version for programmatic control of back button behavior
 */
export function useBackButton(options: BackButtonProps = {}) {
  const {
    homeRoutes = ['/'],
    onHomeBackPress,
    confirmExit = false,
    confirmMessage = 'Are you sure you want to exit?',
  } = options;

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    let lastBackPress = 0;
    const DOUBLE_BACK_DELAY = 2000;

    const backButtonListener = CapacitorApp.addListener(
      'backButton',
      async ({ canGoBack }) => {
        const currentPath = pathname;
        const isHomePage = homeRoutes.some(route =>
          route === currentPath || currentPath.startsWith(route + '/')
        );

        if (isHomePage) {
          onHomeBackPress?.();

          if (confirmExit) {
            const shouldExit = window.confirm(confirmMessage);
            if (shouldExit) {
              CapacitorApp.exitApp();
            }
          } else {
            const currentTime = new Date().getTime();
            if (currentTime - lastBackPress < DOUBLE_BACK_DELAY) {
              CapacitorApp.exitApp();
            } else {
              lastBackPress = currentTime;
              console.log('Press back again to exit');
            }
          }
        } else {
          if (canGoBack) {
            router.back();
          } else {
            router.push(homeRoutes[0]);
          }
        }
      }
    );

    return () => {
      backButtonListener.remove();
    };
  }, [pathname, router, homeRoutes, onHomeBackPress, confirmExit, confirmMessage]);
}
