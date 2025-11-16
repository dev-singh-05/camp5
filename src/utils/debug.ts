import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';

/**
 * Debug utilities for development mode only
 * These functions help debug issues on different devices and platforms
 */

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Log platform information
 * Shows current platform (web/ios/android)
 */
export const logPlatform = (): void => {
  if (!isDevelopment()) return;

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  console.group('🔧 Platform Info');
  console.log('Platform:', platform);
  console.log('Is Native:', isNative);
  console.log('Capacitor Version:', Capacitor.getPlatform());
  console.groupEnd();
};

/**
 * Get platform information as object
 */
export const getPlatformInfo = () => {
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isIOS: Capacitor.getPlatform() === 'ios',
    isAndroid: Capacitor.getPlatform() === 'android',
    isWeb: Capacitor.getPlatform() === 'web',
  };
};

/**
 * Log detailed device information
 * Only works on native platforms
 */
export const logDeviceInfo = async (): Promise<void> => {
  if (!isDevelopment()) return;

  try {
    const deviceInfo = await Device.getInfo();
    const deviceId = await Device.getId();

    console.group('📱 Device Info');
    console.log('Model:', deviceInfo.model);
    console.log('Platform:', deviceInfo.platform);
    console.log('OS Version:', deviceInfo.osVersion);
    console.log('Manufacturer:', deviceInfo.manufacturer);
    console.log('Is Virtual:', deviceInfo.isVirtual);
    console.log('Device ID:', deviceId.identifier);
    console.log('Memory (MB):', deviceInfo.memUsed ? `${(deviceInfo.memUsed / 1024 / 1024).toFixed(2)} MB used` : 'N/A');
    console.groupEnd();
  } catch (error) {
    console.warn('Device info not available (web platform)');
  }
};

/**
 * Get device information as object
 */
export const getDeviceInfo = async () => {
  try {
    const deviceInfo = await Device.getInfo();
    const deviceId = await Device.getId();

    return {
      model: deviceInfo.model,
      platform: deviceInfo.platform,
      osVersion: deviceInfo.osVersion,
      manufacturer: deviceInfo.manufacturer,
      isVirtual: deviceInfo.isVirtual,
      deviceId: deviceId.identifier,
      memUsed: deviceInfo.memUsed,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Log environment configuration status
 * Shows which environment variables are set (without exposing secrets)
 */
export const logEnvironment = (): void => {
  if (!isDevelopment()) return;

  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NODE_ENV': process.env.NODE_ENV,
  };

  console.group('🌍 Environment Status');
  Object.entries(envVars).forEach(([key, value]) => {
    if (key === 'NODE_ENV') {
      console.log(`${key}:`, value);
    } else {
      console.log(`${key}:`, value ? '✅ Set' : '❌ Not Set');
    }
  });
  console.groupEnd();
};

/**
 * Log network status
 */
export const logNetworkStatus = async (): Promise<void> => {
  if (!isDevelopment()) return;

  try {
    const status = await Network.getStatus();

    console.group('🌐 Network Status');
    console.log('Connected:', status.connected);
    console.log('Connection Type:', status.connectionType);
    console.groupEnd();
  } catch (error) {
    console.warn('Network status not available');
  }
};

/**
 * Get network status as object
 */
export const getNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Log app information
 */
export const logAppInfo = async (): Promise<void> => {
  if (!isDevelopment()) return;

  try {
    const appInfo = await App.getInfo();

    console.group('📦 App Info');
    console.log('Name:', appInfo.name);
    console.log('ID:', appInfo.id);
    console.log('Version:', appInfo.version);
    console.log('Build:', appInfo.build);
    console.groupEnd();
  } catch (error) {
    console.warn('App info not available (web platform)');
  }
};

/**
 * Get app information as object
 */
export const getAppInfo = async () => {
  try {
    const appInfo = await App.getInfo();
    return {
      name: appInfo.name,
      id: appInfo.id,
      version: appInfo.version,
      build: appInfo.build,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Log all debug information at once
 */
export const logAllDebugInfo = async (): Promise<void> => {
  if (!isDevelopment()) return;

  console.log('%c🔍 Campus5 Debug Info', 'font-size: 20px; font-weight: bold; color: #7c3aed;');
  console.log('─'.repeat(50));

  logPlatform();
  await logDeviceInfo();
  logEnvironment();
  await logNetworkStatus();
  await logAppInfo();

  console.log('─'.repeat(50));
};

/**
 * Get all debug information as structured object
 */
export const getAllDebugInfo = async () => {
  const platformInfo = getPlatformInfo();
  const deviceInfo = await getDeviceInfo();
  const networkStatus = await getNetworkStatus();
  const appInfo = await getAppInfo();

  return {
    platform: platformInfo,
    device: deviceInfo,
    network: networkStatus,
    app: appInfo,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create a formatted debug report string
 */
export const createDebugReport = async (): Promise<string> => {
  const info = await getAllDebugInfo();

  let report = '=== Campus5 Debug Report ===\n\n';
  report += `Generated: ${info.timestamp}\n\n`;

  report += '--- Platform ---\n';
  report += `Platform: ${info.platform.platform}\n`;
  report += `Is Native: ${info.platform.isNative}\n`;
  report += `Is iOS: ${info.platform.isIOS}\n`;
  report += `Is Android: ${info.platform.isAndroid}\n\n`;

  if (info.device) {
    report += '--- Device ---\n';
    report += `Model: ${info.device.model}\n`;
    report += `OS Version: ${info.device.osVersion}\n`;
    report += `Manufacturer: ${info.device.manufacturer}\n`;
    report += `Is Virtual: ${info.device.isVirtual}\n\n`;
  }

  if (info.network) {
    report += '--- Network ---\n';
    report += `Connected: ${info.network.connected}\n`;
    report += `Type: ${info.network.connectionType}\n\n`;
  }

  if (info.app) {
    report += '--- App ---\n';
    report += `Name: ${info.app.name}\n`;
    report += `Version: ${info.app.version}\n`;
    report += `Build: ${info.app.build}\n\n`;
  }

  report += '--- Environment ---\n';
  report += `Node Env: ${info.environment.nodeEnv}\n`;
  report += `Supabase URL: ${info.environment.hasSupabaseUrl ? 'Set' : 'Not Set'}\n`;
  report += `Supabase Key: ${info.environment.hasSupabaseKey ? 'Set' : 'Not Set'}\n\n`;

  report += '=== End Report ===\n';

  return report;
};

/**
 * Copy debug report to clipboard
 */
export const copyDebugReportToClipboard = async (): Promise<boolean> => {
  try {
    const report = await createDebugReport();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(report);
      console.log('✅ Debug report copied to clipboard');
      return true;
    } else {
      console.warn('❌ Clipboard API not available');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to copy debug report:', error);
    return false;
  }
};

/**
 * Download debug report as text file
 */
export const downloadDebugReport = async (): Promise<void> => {
  try {
    const report = await createDebugReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus5-debug-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ Debug report downloaded');
  } catch (error) {
    console.error('❌ Failed to download debug report:', error);
  }
};

/**
 * Log performance metrics
 */
export const logPerformanceMetrics = (): void => {
  if (!isDevelopment()) return;
  if (typeof window === 'undefined') return;

  const perf = window.performance;
  if (!perf) return;

  console.group('⚡ Performance Metrics');

  // Navigation timing
  const navTiming = perf.timing;
  if (navTiming) {
    const pageLoadTime = navTiming.loadEventEnd - navTiming.navigationStart;
    const domReadyTime = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
    const firstByteTime = navTiming.responseStart - navTiming.requestStart;

    console.log('Page Load Time:', `${pageLoadTime}ms`);
    console.log('DOM Ready Time:', `${domReadyTime}ms`);
    console.log('Time to First Byte:', `${firstByteTime}ms`);
  }

  // Memory (if available)
  const memory = (perf as any).memory;
  if (memory) {
    console.log('Memory Used:', `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('Memory Limit:', `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }

  console.groupEnd();
};

/**
 * Setup debug mode on window object (for console access)
 */
export const setupDebugMode = (): void => {
  if (!isDevelopment()) return;
  if (typeof window === 'undefined') return;

  (window as any).campus5Debug = {
    logAll: logAllDebugInfo,
    platform: logPlatform,
    device: logDeviceInfo,
    environment: logEnvironment,
    network: logNetworkStatus,
    app: logAppInfo,
    performance: logPerformanceMetrics,
    report: createDebugReport,
    copyReport: copyDebugReportToClipboard,
    downloadReport: downloadDebugReport,
  };

  console.log(
    '%cDebug mode enabled! Access via window.campus5Debug',
    'color: #7c3aed; font-weight: bold;'
  );
  console.log('Available commands:', Object.keys((window as any).campus5Debug));
};
