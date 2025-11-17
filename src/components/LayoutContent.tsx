'use client';

import { ReactNode } from 'react';
import { SafeAreaWrapper } from '@/components/mobile/SafeArea';
import BackButton from '@/components/mobile/BackButton';
import { isNative } from '@/utils/capacitor';
import { Toaster } from 'react-hot-toast';

interface LayoutContentProps {
  children: ReactNode;
}

// Define home routes outside component to prevent re-creation on every render
const HOME_ROUTES = ['/', '/dashboard', '/dating', '/clubs', '/ratings', '/profile'];

/**
 * Client-side layout content wrapper that conditionally applies SafeArea
 * Only wraps content with SafeArea when running in native app
 * Also handles Android back button navigation
 */
export default function LayoutContent({ children }: LayoutContentProps) {
  // Conditionally wrap with SafeArea only in native apps
  if (isNative()) {
    return (
      <>
        {/* Handle Android back button navigation */}
        <BackButton
          homeRoutes={HOME_ROUTES}
          confirmExit={false}
        />
        <SafeAreaWrapper className="min-h-screen">
          {children}
        </SafeAreaWrapper>
        {/* Global toast container */}
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </>
    );
  }

  // Web version without SafeArea or BackButton
  return (
    <>
      {children}
      {/* Global toast container */}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </>
  );
}
