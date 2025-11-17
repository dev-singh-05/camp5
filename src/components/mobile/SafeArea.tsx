'use client';

import { ReactNode } from 'react';
import { isNative } from '@/utils/capacitor';

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

/**
 * SafeArea component that wraps children with safe area padding
 * Uses pure CSS env() variables for iOS notches and Android navigation bars
 * Only applies padding when running in native app
 */
export const SafeAreaWrapper = ({
  children,
  className = '',
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) => {
  const native = isNative();

  // Don't apply safe area padding on web
  if (!native) {
    return <div className={className}>{children}</div>;
  }

  // Apply safe area padding using CSS env() variables
  const paddingStyle = {
    paddingTop: top ? 'env(safe-area-inset-top)' : undefined,
    paddingBottom: bottom ? 'env(safe-area-inset-bottom)' : undefined,
    paddingLeft: left ? 'env(safe-area-inset-left)' : undefined,
    paddingRight: right ? 'env(safe-area-inset-right)' : undefined,
  };

  return (
    <div className={className} style={paddingStyle}>
      {children}
    </div>
  );
};

/**
 * Default SafeArea component - simplified version
 * Applies all safe area insets when on native platform
 */
export default function SafeArea({ children }: { children: ReactNode }) {
  const native = isNative();

  return (
    <div
      style={
        native
          ? {
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
