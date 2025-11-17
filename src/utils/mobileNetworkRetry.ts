/**
 * Mobile Network Retry Utility
 *
 * Provides retry logic with exponential backoff for mobile network requests
 * Handles flaky mobile connections and temporary network failures
 */

import { isNative } from './capacitor';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attemptNumber: number) => boolean;
  onRetry?: (error: Error, attemptNumber: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('offline') ||
      message.includes('connection')
    );
  },
  onRetry: (error: Error, attemptNumber: number, delay: number) => {
    console.log(
      `[Mobile Retry] Attempt ${attemptNumber} failed: ${error.message}. Retrying in ${delay}ms...`
    );
  },
};

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the successful function execution
 *
 * @example
 * const data = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase.from('users').select();
 *     if (error) throw error;
 *     return data;
 *   },
 *   { maxRetries: 3 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted all attempts
      if (attempt > config.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!config.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      // Notify about retry
      config.onRetry(lastError, attempt, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError || new Error('Unknown error occurred during retry');
}

/**
 * Wrapper for Supabase queries with automatic retry on mobile
 *
 * @param queryFn - The Supabase query function
 * @param options - Retry configuration options
 * @returns The query result
 *
 * @example
 * const { data, error } = await supabaseWithRetry(
 *   () => supabase.from('users').select()
 * );
 */
export async function supabaseWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  // Only apply retry logic on mobile
  if (!isNative()) {
    return queryFn();
  }

  try {
    const result = await withRetry(async () => {
      const { data, error } = await queryFn();

      // Treat Supabase errors as exceptions for retry logic
      if (error) {
        throw error;
      }

      return { data, error: null };
    }, options);

    return result;
  } catch (error) {
    // Return error in Supabase format
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Check if the device is online before making a request
 * Throws an error if offline to avoid unnecessary retry attempts
 */
export async function ensureOnline(): Promise<void> {
  if (typeof navigator === 'undefined') return;

  if (!navigator.onLine) {
    throw new Error('Device is offline. Please check your internet connection.');
  }
}

/**
 * Combine online check with retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the successful function execution
 */
export async function withOnlineCheck<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  await ensureOnline();
  return withRetry(fn, options);
}
