'use client';

import { ButtonHTMLAttributes, useState } from 'react';
import { useShare } from '@/hooks/useNativeFeatures';
import toast from 'react-hot-toast';

interface NativeShareButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /**
   * Title for the share dialog
   */
  title?: string;
  /**
   * Text content to share
   */
  text?: string;
  /**
   * URL to share
   */
  url?: string;
  /**
   * Custom label for the button
   * @default "Share"
   */
  label?: string;
  /**
   * Callback fired after successful share
   */
  onShareSuccess?: () => void;
  /**
   * Callback fired when share fails
   */
  onShareError?: (error: any) => void;
}

/**
 * Button component that uses native share sheet on mobile devices
 * Falls back to Web Share API if available, then to clipboard copy
 * Shows toast feedback when content is shared
 */
export default function NativeShareButton({
  title,
  text,
  url,
  label = 'Share',
  onShareSuccess,
  onShareError,
  className = '',
  disabled = false,
  ...buttonProps
}: NativeShareButtonProps) {
  const { shareContent } = useShare();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing || disabled) return;

    setIsSharing(true);

    try {
      // Attempt to share using native or Web Share API
      const result = await shareContent({ title, text, url });

      if (result.success) {
        toast.success('Content shared successfully!');
        onShareSuccess?.();
      } else {
        // Fallback to clipboard if share not available
        await handleClipboardFallback();
      }
    } catch (error) {
      console.error('Share error:', error);
      // Try clipboard fallback on error
      await handleClipboardFallback();
    } finally {
      setIsSharing(false);
    }
  };

  const handleClipboardFallback = async () => {
    try {
      // Build the content to copy
      const contentParts: string[] = [];
      if (title) contentParts.push(title);
      if (text) contentParts.push(text);
      if (url) contentParts.push(url);

      const contentToCopy = contentParts.join('\n\n');

      if (!contentToCopy) {
        toast.error('No content to share');
        onShareError?.(new Error('No content to share'));
        return;
      }

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(contentToCopy);
        toast.success('Link copied to clipboard!');
        onShareSuccess?.();
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = contentToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          toast.success('Link copied to clipboard!');
          onShareSuccess?.();
        } catch (err) {
          console.error('Clipboard fallback failed:', err);
          toast.error('Failed to copy to clipboard');
          onShareError?.(err);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Failed to copy to clipboard');
      onShareError?.(error);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={disabled || isSharing}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        disabled || isSharing
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95'
      } ${className}`}
      {...buttonProps}
    >
      {/* Share icon */}
      <svg
        className="w-5 h-5"
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        />
      </svg>
      {isSharing ? 'Sharing...' : label}
    </button>
  );
}
