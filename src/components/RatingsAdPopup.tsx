"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Star } from "lucide-react";

export default function RatingsAdPopup() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    // Check if ad has been shown in this session
    const hasSeenAd = sessionStorage.getItem("ratings_ad_shown");

    if (!hasSeenAd) {
      // Show ad after a short delay
      const timer = setTimeout(() => {
        setShowAd(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShowAd(false);
    // Mark ad as shown in this session
    sessionStorage.setItem("ratings_ad_shown", "true");
  };

  return (
    <AnimatePresence>
      {showAd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-purple-900/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl max-w-sm w-full p-6 overflow-hidden"
          >
            {/* Animated Background Glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20 blur-2xl"
            />

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Icon */}
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Star className="w-10 h-10 text-white" fill="white" />
                </div>
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-extrabold text-white mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                Welcome to Ratings!
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </h2>

              {/* Description */}
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                Rate your peers, unlock their stats, and climb the leaderboard!
                Connect with others and build your reputation in the community.
              </p>

              {/* Features */}
              <div className="space-y-2 mb-6 text-left">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10"
                >
                  <span className="text-2xl">💪</span>
                  <span className="text-white/90 text-sm">Rate multiple attributes</span>
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10"
                >
                  <span className="text-2xl">🏆</span>
                  <span className="text-white/90 text-sm">Climb the leaderboard</span>
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10"
                >
                  <span className="text-2xl">🔓</span>
                  <span className="text-white/90 text-sm">Unlock profile stats</span>
                </motion.div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Get Started
              </motion.button>

              {/* Skip Text */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleClose}
                className="mt-3 text-white/50 text-xs hover:text-white/80 transition-colors"
              >
                Skip for now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
