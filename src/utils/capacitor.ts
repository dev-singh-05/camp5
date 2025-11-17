import { Capacitor } from '@capacitor/core';

/**
 * Check if we're running in a browser environment
 * This prevents SSR errors during Next.js static export
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Check if the app is running in a native Capacitor environment
 * @returns true if running on iOS or Android via Capacitor
 */
export const isNative = (): boolean => {
  if (!isBrowser) return false;
  return Capacitor.isNativePlatform();
};

/**
 * Check if the app is running on iOS
 * @returns true if running on iOS platform
 */
export const isIOS = (): boolean => {
  if (!isBrowser) return false;
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if the app is running on Android
 * @returns true if running on Android platform
 */
export const isAndroid = (): boolean => {
  if (!isBrowser) return false;
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if the app is running in a web browser
 * @returns true if running on web platform
 */
export const isWeb = (): boolean => {
  if (!isBrowser) return true; // Default to web during SSR
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 * @returns 'ios' | 'android' | 'web'
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (!isBrowser) return 'web'; // Default to web during SSR
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Check if a specific plugin is available
 * @param pluginName - Name of the Capacitor plugin
 * @returns true if the plugin is available
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  if (!isBrowser) return false;
  return Capacitor.isPluginAvailable(pluginName);
};
