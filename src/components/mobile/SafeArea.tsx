'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SafeArea } from '@capacitor/safe-area';
import { isNative } from '@/utils/capacitor';

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * SafeArea component that wraps children with safe area padding
 * Handles iOS notches and Android navigation bars
 */
export const SafeAreaWrapper = ({
  children,
  className = '',
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) => {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const getSafeAreaInsets = async () => {
      try {
        const safeAreaData = await SafeArea.getSafeAreaInsets();
        setInsets(safeAreaData.insets);
      } catch (error) {
        console.warn('SafeArea API error:', error);
      }
    };

    getSafeAreaInsets();

    // Listen for safe area changes (e.g., device rotation)
    const listener = SafeArea.addListener('safeAreaChanged', (data) => {
      setInsets(data.insets);
    });

    return () => {
      listener.remove();
    };
  }, []);

  // Only apply safe area padding on native platforms
  if (!isNative()) {
    return <div className={className}>{children}</div>;
  }

  const paddingStyle = {
    paddingTop: top ? `${insets.top}px` : undefined,
    paddingBottom: bottom ? `${insets.bottom}px` : undefined,
    paddingLeft: left ? `${insets.left}px` : undefined,
    paddingRight: right ? `${insets.right}px` : undefined,
  };

  return (
    <div className={className} style={paddingStyle}>
      {children}
    </div>
  );
};

/**
 * SafeArea component using CSS safe-area-inset variables
 * Fallback option that works with CSS env() variables
 */
export const SafeAreaCSS = ({
  children,
  className = '',
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) => {
  const safeAreaClass = `
    ${top ? 'pt-[env(safe-area-inset-top)]' : ''}
    ${bottom ? 'pb-[env(safe-area-inset-bottom)]' : ''}
    ${left ? 'pl-[env(safe-area-inset-left)]' : ''}
    ${right ? 'pr-[env(safe-area-inset-right)]' : ''}
  `.trim();

  return (
    <div className={`${safeAreaClass} ${className}`.trim()}>{children}</div>
  );
};

// Default export uses the API-based approach
export default SafeAreaWrapper;
