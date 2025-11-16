/**
 * Environment Variable Configuration
 *
 * Safely access environment variables with runtime validation.
 * Works seamlessly in both web and native Capacitor environments.
 *
 * Usage:
 *   import { getEnv, getRequiredEnv } from '@/lib/env';
 *
 *   const apiUrl = getEnv('NEXT_PUBLIC_API_URL', 'https://default.com');
 *   const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
 */

/**
 * Environment variable names used in the app
 * Add new environment variables here for type safety
 */
export type EnvVarName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'NEXT_PUBLIC_ENABLE_DATING_TEST'
  | 'NEXT_PUBLIC_APP_ENV'
  | 'NEXT_PUBLIC_APP_VERSION'
  | 'NEXT_PUBLIC_APP_SCHEME'
  | 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'
  | 'NEXT_PUBLIC_SENTRY_DSN'
  | 'NEXT_PUBLIC_MIXPANEL_TOKEN'
  | 'NEXT_PUBLIC_API_BASE_URL'
  | 'NEXT_PUBLIC_CDN_URL';

/**
 * Check if we're running in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Check if we're running in a Capacitor native environment
 */
const isCapacitor = (): boolean => {
  if (!isBrowser) return false;

  // Check if Capacitor is available
  if (typeof (window as any).Capacitor !== 'undefined') {
    return true;
  }

  return false;
};

/**
 * Get environment variable value
 * Works in both server-side (Node.js) and client-side (browser/Capacitor) environments
 *
 * @param name - Environment variable name
 * @returns The value of the environment variable or undefined
 */
function getEnvValue(name: string): string | undefined {
  // In browser/Capacitor, use the bundled process.env
  if (isBrowser) {
    return process.env[name];
  }

  // In Node.js (SSR/build time), access from process.env
  return process.env[name];
}

/**
 * Safely get an environment variable with an optional default value
 *
 * @param name - Environment variable name
 * @param defaultValue - Default value if the environment variable is not set
 * @returns The environment variable value or the default value
 *
 * @example
 * const apiUrl = getEnv('NEXT_PUBLIC_API_URL', 'https://api.default.com');
 */
export function getEnv(name: EnvVarName, defaultValue?: string): string | undefined {
  const value = getEnvValue(name);

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value;
}

/**
 * Get a required environment variable
 * Throws an error if the variable is not set
 *
 * @param name - Environment variable name
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 *
 * @example
 * const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
 */
export function getRequiredEnv(name: EnvVarName): string {
  const value = getEnvValue(name);

  if (value === undefined || value === '' || value.includes('your_') || value.includes('_here')) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════════════╗
║                   MISSING ENVIRONMENT VARIABLE                      ║
╚════════════════════════════════════════════════════════════════════╝

Environment variable "${name}" is required but not set.

${isCapacitor() ? '📱 Capacitor Native App Environment' : '🌐 Web Environment'}

To fix this:

1. Copy .env.production.example to .env.production (or .env.local for dev)

   cp .env.production.example .env.production

2. Edit .env.production and set the value for ${name}

3. For mobile apps, rebuild the app after changing environment variables:

   npm run build:export
   npx cap sync android    # or ios

   Then rebuild in Android Studio or Xcode

4. For web, restart the development server:

   npm run dev

Need help? Check the .env.production.example file for instructions.
────────────────────────────────────────────────────────────────────
`;

    throw new Error(errorMessage);
  }

  return value;
}

/**
 * Get a boolean environment variable
 *
 * @param name - Environment variable name
 * @param defaultValue - Default value if the environment variable is not set
 * @returns The boolean value
 *
 * @example
 * const isTestMode = getBoolEnv('NEXT_PUBLIC_ENABLE_DATING_TEST', false);
 */
export function getBoolEnv(name: EnvVarName, defaultValue = false): boolean {
  const value = getEnvValue(name);

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get a number environment variable
 *
 * @param name - Environment variable name
 * @param defaultValue - Default value if the environment variable is not set
 * @returns The number value
 *
 * @example
 * const maxRetries = getNumberEnv('NEXT_PUBLIC_MAX_RETRIES', 3);
 */
export function getNumberEnv(name: EnvVarName, defaultValue?: number): number | undefined {
  const value = getEnvValue(name);

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.warn(`Environment variable ${name} is not a valid number: ${value}`);
    return defaultValue;
  }

  return parsed;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnv('NEXT_PUBLIC_APP_ENV', process.env.NODE_ENV) === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv('NEXT_PUBLIC_APP_ENV', process.env.NODE_ENV) === 'production';
}

/**
 * Check if we're in staging mode
 */
export function isStaging(): boolean {
  return getEnv('NEXT_PUBLIC_APP_ENV') === 'staging';
}

/**
 * Get all environment variables for debugging
 * Only use in development - filters out sensitive data
 *
 * @returns Object with environment information
 */
export function getEnvInfo() {
  if (!isDevelopment()) {
    return { error: 'Environment info only available in development mode' };
  }

  return {
    environment: getEnv('NEXT_PUBLIC_APP_ENV', process.env.NODE_ENV),
    version: getEnv('NEXT_PUBLIC_APP_VERSION'),
    isCapacitor: isCapacitor(),
    isBrowser,
    // Don't log actual values for security
    hasSupabaseUrl: !!getEnvValue('NEXT_PUBLIC_SUPABASE_URL'),
    hasSupabaseKey: !!getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}

/**
 * Pre-configured environment variables for common use cases
 * Import these directly instead of calling getEnv/getRequiredEnv
 */
export const env = {
  // Supabase (required)
  supabase: {
    url: () => getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: () => getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },

  // App configuration
  app: {
    env: () => getEnv('NEXT_PUBLIC_APP_ENV', process.env.NODE_ENV || 'development'),
    version: () => getEnv('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
    scheme: () => getEnv('NEXT_PUBLIC_APP_SCHEME', 'com.campus5.app'),
  },

  // Feature flags
  features: {
    datingTest: () => getBoolEnv('NEXT_PUBLIC_ENABLE_DATING_TEST', false),
  },

  // Analytics (optional)
  analytics: {
    googleAnalyticsId: () => getEnv('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'),
    sentryDsn: () => getEnv('NEXT_PUBLIC_SENTRY_DSN'),
    mixpanelToken: () => getEnv('NEXT_PUBLIC_MIXPANEL_TOKEN'),
  },

  // API configuration (optional)
  api: {
    baseUrl: () => getEnv('NEXT_PUBLIC_API_BASE_URL'),
    cdnUrl: () => getEnv('NEXT_PUBLIC_CDN_URL'),
  },
} as const;

/**
 * Validate all required environment variables at app startup
 * Call this in your app's entry point (e.g., _app.tsx or layout.tsx)
 *
 * @throws Error if any required environment variable is missing
 *
 * @example
 * // In app/layout.tsx or _app.tsx
 * import { validateEnv } from '@/lib/env';
 *
 * // Validate on app startup
 * if (typeof window !== 'undefined') {
 *   validateEnv();
 * }
 */
export function validateEnv(): void {
  try {
    // Validate required variables
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    // Log success in development
    if (isDevelopment()) {
      console.log('✅ Environment variables validated successfully');
      console.log('Environment info:', getEnvInfo());
    }
  } catch (error) {
    // Re-throw the error to prevent app from starting with missing config
    throw error;
  }
}
