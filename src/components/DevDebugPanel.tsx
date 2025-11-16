'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Smartphone, Wifi, Package, Cpu, Copy, Download, Zap } from 'lucide-react';
import { useHaptics, useShare } from '@/hooks/useNativeFeatures';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  isDevelopment,
  getPlatformInfo,
  getDeviceInfo,
  getAppInfo,
  copyDebugReportToClipboard,
  downloadDebugReport,
  setupDebugMode,
} from '@/utils/debug';
import toast from 'react-hot-toast';

/**
 * Development-only debug panel component
 * Shows platform info, network status, environment status
 * Provides buttons to test haptics and share
 * Only visible in development mode
 */
export default function DevDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [appInfo, setAppInfo] = useState<any>(null);

  const { triggerHaptic } = useHaptics();
  const { shareContent } = useShare();
  const { isOnline, connectionType } = useNetworkStatus();

  // Only show in development
  if (!isDevelopment()) {
    return null;
  }

  useEffect(() => {
    // Setup debug mode on window
    setupDebugMode();

    // Load info
    setPlatformInfo(getPlatformInfo());

    getDeviceInfo().then(info => setDeviceInfo(info));
    getAppInfo().then(info => setAppInfo(info));
  }, []);

  const handleTestHaptics = async () => {
    await triggerHaptic('light');
    setTimeout(() => triggerHaptic('medium'), 200);
    setTimeout(() => triggerHaptic('heavy'), 400);
    setTimeout(() => triggerHaptic('success'), 600);
    toast.success('Haptic feedback tested!');
  };

  const handleTestShare = async () => {
    const result = await shareContent({
      title: 'Campus5 Debug Test',
      text: 'Testing native share functionality',
      url: 'https://campus5.app',
    });

    if (result.success) {
      toast.success('Share test successful!');
    } else {
      toast.error('Share test failed');
    }
  };

  const handleCopyReport = async () => {
    const success = await copyDebugReportToClipboard();
    if (success) {
      toast.success('Debug report copied to clipboard!');
    } else {
      toast.error('Failed to copy debug report');
    }
  };

  const handleDownloadReport = async () => {
    await downloadDebugReport();
    toast.success('Debug report downloaded!');
  };

  return (
    <>
      {/* Floating Debug Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-[9999] w-12 h-12 bg-purple-600 rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Open Debug Panel"
      >
        <Bug className="w-6 h-6 text-white" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-purple-500/30"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Debug Panel</h3>
                  <span className="px-2 py-1 bg-black/20 rounded text-xs text-white">DEV</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="space-y-4">
                  {/* Platform Info */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-purple-400" />
                      <h4 className="font-semibold text-white">Platform</h4>
                    </div>
                    {platformInfo && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Platform:</span>
                          <span className="text-white font-medium">{platformInfo.platform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Is Native:</span>
                          <span className={platformInfo.isNative ? 'text-green-400' : 'text-yellow-400'}>
                            {platformInfo.isNative ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">iOS:</span>
                          <span className={platformInfo.isIOS ? 'text-green-400' : 'text-slate-500'}>
                            {platformInfo.isIOS ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Android:</span>
                          <span className={platformInfo.isAndroid ? 'text-green-400' : 'text-slate-500'}>
                            {platformInfo.isAndroid ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Network Status */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Wifi className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-semibold text-white">Network</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                          {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="text-white font-medium">{connectionType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Device Info */}
                  {deviceInfo && (
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className="w-5 h-5 text-pink-400" />
                        <h4 className="font-semibold text-white">Device</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Model:</span>
                          <span className="text-white font-medium">{deviceInfo.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">OS Version:</span>
                          <span className="text-white font-medium">{deviceInfo.osVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Manufacturer:</span>
                          <span className="text-white font-medium">{deviceInfo.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Is Virtual:</span>
                          <span className={deviceInfo.isVirtual ? 'text-yellow-400' : 'text-green-400'}>
                            {deviceInfo.isVirtual ? 'Yes (Emulator)' : 'No (Real Device)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* App Info */}
                  {appInfo && (
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-5 h-5 text-green-400" />
                        <h4 className="font-semibold text-white">App</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white font-medium">{appInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Version:</span>
                          <span className="text-white font-medium">{appInfo.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Build:</span>
                          <span className="text-white font-medium">{appInfo.build}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Environment */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-semibold text-white">Environment</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Node Env:</span>
                        <span className="text-white font-medium">{process.env.NODE_ENV}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Supabase URL:</span>
                        <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-400' : 'text-red-400'}>
                          {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Supabase Key:</span>
                        <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-400' : 'text-red-400'}>
                          {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test Buttons */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-orange-400" />
                      <h4 className="font-semibold text-white">Test Features</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleTestHaptics}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        Test Haptics
                      </button>
                      <button
                        onClick={handleTestShare}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        Test Share
                      </button>
                    </div>
                  </div>

                  {/* Report Actions */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <h4 className="font-semibold text-white mb-3">Debug Report</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleCopyReport}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadReport}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      💡 Tip: Access debug functions in console via <code className="text-purple-400">window.campus5Debug</code>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
