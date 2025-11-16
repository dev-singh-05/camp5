'use client';

import { ReactNode, CSSProperties } from 'react';

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
 * Uses CSS env() variables to handle iOS notches and Android navigation bars
 * Works on all platforms without requiring Capacitor packages
 *
 * The safe-area-inset values are automatically provided by the browser/WebView
 * and work with the viewport-fit=cover meta tag in the HTML head
 */
export const SafeAreaWrapper = ({
  children,
  className = '',
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) => {
  // Build inline styles using CSS env() variables
  const safeAreaStyle: CSSProperties = {
    paddingTop: top ? 'env(safe-area-inset-top, 0px)' : undefined,
    paddingBottom: bottom ? 'env(safe-area-inset-bottom, 0px)' : undefined,
    paddingLeft: left ? 'env(safe-area-inset-left, 0px)' : undefined,
    paddingRight: right ? 'env(safe-area-inset-right, 0px)' : undefined,
  };

  return (
    <div className={className} style={safeAreaStyle}>
      {children}
    </div>
  );
};

/**
 * SafeArea component using CSS safe-area-inset with Tailwind classes
 * Alternative approach using Tailwind's arbitrary values
 * Note: Tailwind's arbitrary values may not work with env() in all cases
 * Use SafeAreaWrapper (inline styles) for better compatibility
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
    ${top ? 'pt-[env(safe-area-inset-top,0px)]' : ''}
    ${bottom ? 'pb-[env(safe-area-inset-bottom,0px)]' : ''}
    ${left ? 'pl-[env(safe-area-inset-left,0px)]' : ''}
    ${right ? 'pr-[env(safe-area-inset-right,0px)]' : ''}
  `.trim();

  return (
    <div className={`${safeAreaClass} ${className}`.trim()}>{children}</div>
  );
};

// Default export uses inline styles approach for better compatibility
export default SafeAreaWrapper;
