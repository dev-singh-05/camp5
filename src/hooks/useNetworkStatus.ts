'use client';

import { useCallback, useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import { isNative } from '@/utils/capacitor';

/**
 * Network connection types
 */
export type NetworkType = 'wifi' | 'cellular' | 'none' | 'unknown';

/**
 * Network status state
 */
export interface NetworkStatus {
  /**
   * Whether the device is connected to the internet
   */
  isOnline: boolean;
  /**
   * Type of network connection (wifi, cellular, etc.)
   */
  connectionType: NetworkType;
  /**
   * Whether the network status is being checked
   */
  isChecking: boolean;
}

/**
 * Custom hook to detect online/offline status and network type
 * Works in both web and native environments
 *
 * @returns Network status including isOnline, connectionType, and refresh function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, connectionType, refresh } = useNetworkStatus();
 *
 *   if (!isOnline) {
 *     return <div>No internet connection</div>;
 *   }
 *
 *   return <div>Connected via {connectionType}</div>;
 * }
 * ```
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    isChecking: false,
  });

  /**
   * Refresh network status manually
   */
  const refresh = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      if (isNative()) {
        // Use Capacitor Network API on native
        const networkStatus = await Network.getStatus();
        setStatus({
          isOnline: networkStatus.connected,
          connectionType: mapNativeConnectionType(networkStatus.connectionType),
          isChecking: false,
        });
      } else {
        // Use browser API on web
        const connection = getWebConnectionInfo();
        setStatus({
          isOnline: navigator.onLine,
          connectionType: connection.type,
          isChecking: false,
        });
      }
    } catch (error) {
      console.error('Error checking network status:', error);
      setStatus(prev => ({ ...prev, isChecking: false }));
    }
  }, []);

  useEffect(() => {
    // Initial network status check
    refresh();

    if (isNative()) {
      // Listen for network status changes on native
      const networkListener = Network.addListener('networkStatusChange', (networkStatus) => {
        setStatus({
          isOnline: networkStatus.connected,
          connectionType: mapNativeConnectionType(networkStatus.connectionType),
          isChecking: false,
        });
      });

      return () => {
        networkListener.remove();
      };
    } else {
      // Listen for online/offline events on web
      const handleOnline = () => {
        const connection = getWebConnectionInfo();
        setStatus({
          isOnline: true,
          connectionType: connection.type,
          isChecking: false,
        });
      };

      const handleOffline = () => {
        setStatus({
          isOnline: false,
          connectionType: 'none',
          isChecking: false,
        });
      };

      const handleConnectionChange = () => {
        const connection = getWebConnectionInfo();
        setStatus(prev => ({
          ...prev,
          connectionType: connection.type,
        }));
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Listen for connection type changes (if supported)
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', handleConnectionChange);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (connection) {
          connection.removeEventListener('change', handleConnectionChange);
        }
      };
    }
  }, [refresh]);

  return {
    ...status,
    refresh,
  };
}

/**
 * Map Capacitor connection type to our NetworkType
 */
function mapNativeConnectionType(type: string): NetworkType {
  switch (type.toLowerCase()) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
    case '2g':
    case '3g':
    case '4g':
    case '5g':
      return 'cellular';
    case 'none':
      return 'none';
    default:
      return 'unknown';
  }
}

/**
 * Get connection info from Web APIs
 */
function getWebConnectionInfo(): { type: NetworkType; effectiveType?: string } {
  // Try to use Network Information API (experimental)
  const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

  if (connection) {
    const type = connection.type;
    const effectiveType = connection.effectiveType;

    // Map connection type
    if (type === 'wifi' || effectiveType === 'wifi') {
      return { type: 'wifi', effectiveType };
    } else if (type === 'cellular' || effectiveType) {
      return { type: 'cellular', effectiveType };
    } else if (type === 'none') {
      return { type: 'none', effectiveType };
    }
  }

  // Fallback - assume unknown but online
  return { type: navigator.onLine ? 'unknown' : 'none' };
}

/**
 * Simple hook that only returns boolean online status
 * Useful when you only need to know if device is online
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
