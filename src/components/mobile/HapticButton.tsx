'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { useHaptics } from '@/hooks/useNativeFeatures';

interface HapticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Type of haptic feedback to trigger on click
   * @default 'medium'
   */
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  /**
   * Whether to disable haptic feedback
   * @default false
   */
  disableHaptics?: boolean;
}

/**
 * Button component with haptic feedback on native devices
 * Extends standard HTML button with all its properties
 */
export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  (
    {
      hapticType = 'medium',
      disableHaptics = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { triggerHaptic } = useHaptics();

    const handleClick = async (
      event: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
      // Trigger haptic feedback before onClick
      if (!disableHaptics) {
        await triggerHaptic(hapticType);
      }

      // Call the original onClick handler if provided
      if (onClick) {
        onClick(event);
      }
    };

    return (
      <button ref={ref} onClick={handleClick} {...buttonProps}>
        {children}
      </button>
    );
  }
);

HapticButton.displayName = 'HapticButton';

export default HapticButton;
