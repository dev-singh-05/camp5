'use client';

import { ReactNode } from 'react';
import { SafeAreaWrapper } from '@/components/mobile/SafeArea';
import BackButton from '@/components/mobile/BackButton';
import { isNative } from '@/utils/capacitor';
import { Toaster } from 'react-hot-toast';

interface LayoutContentProps {
  children: ReactNode;
}

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
          homeRoutes={['/', '/dashboard', '/dating', '/clubs', '/ratings', '/profile']}
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
