"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, CheckCircle, Info, AlertCircle, Smartphone, Image as ImageIcon } from "lucide-react";

type TokenPurchaseModalProps = {
  userId: string;
  onClose: () => void;
};

export default function TokenPurchaseModal({ userId, onClose }: TokenPurchaseModalProps) {
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Uploading to:", filePath);

      const { error: uploadError } = await supabase.storage
        .from("token-payments")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from("token-payments")
        .getPublicUrl(filePath);

      console.log("Upload successful, URL:", data.publicUrl);
      return data.publicUrl;
    } catch (err) {
      console.error("uploadScreenshot error:", err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!utrNumber.trim()) {
      alert("Please enter UTR number");
      return;
    }

    setUploading(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
        if (!screenshotUrl) {
          console.warn("Screenshot upload failed, proceeding without it");
        }
      }

      const { error } = await supabase
        .from("token_purchase_requests")
        .insert({
          user_id: userId,
          amount: 0,
          utr_number: utrNumber,
          payment_screenshot_url: screenshotUrl,
          status: "pending",
        });

      if (error) {
        console.error("Error creating request:", error);
        alert("Failed to submit request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("handleSubmit error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl" />

          <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-8 text-center text-card-foreground">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h3 className="text-2xl font-bold text-foreground mb-3">
              Request Submitted!
            </h3>
            <p className="text-muted-foreground mb-6">
              Your token purchase request has been submitted for admin review.
              Tokens will be credited within <span className="text-green-500 dark:text-green-400 font-semibold">30 minutes</span> after approval.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground/80">
                  <p className="font-semibold mb-2 text-foreground">What happens next?</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Admin will verify your payment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Tokens will be added to your account
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      You'll see updated balance automatically
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-green-500/50"
            >
              Close & Continue Using App
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl blur-xl" />

          {/* Main container */}
          <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden text-card-foreground">
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-50" />
              <div className="relative p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Add Tokens</h2>
                    <p className="text-sm text-muted-foreground">Complete payment & submit</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted border border-border flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Body - scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6 space-y-6">
                {/* QR Code Section */}
                <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30"
                  >
                    <Smartphone className="w-8 h-8 text-purple-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Payment QR Code
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Scan this QR code to make payment
                  </p>
                  <div className="inline-block px-6 py-3 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-xl font-semibold text-sm">
                    🚧 QR Code Coming Soon
                  </div>
                </div>

                {/* UTR Number Field */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    UTR Number / Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter UTR or Transaction ID"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-foreground placeholder:text-muted-foreground transition-all"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Enter the UTR/Transaction ID from your payment app
                  </p>
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Payment Screenshot <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="w-full px-4 py-4 bg-muted/20 hover:bg-muted/40 border border-border hover:border-purple-500/30 rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {screenshot ? screenshot.name : "Choose screenshot"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {screenshot ? "Click to change" : "PNG, JPG up to 10MB"}
                        </div>
                      </div>
                    </label>
                  </div>
                  {screenshot && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 text-sm text-green-500 dark:text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>File selected successfully</span>
                    </motion.div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Upload screenshot for faster verification
                  </p>
                </div>

                {/* Info Note */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground/80">
                      <p className="font-semibold mb-1 text-foreground">Note:</p>
                      <p className="text-xs text-muted-foreground">
                        Your request will be submitted successfully even if the screenshot upload fails.
                        The UTR number is mandatory for verification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className="border-t border-border p-6 bg-muted/10 space-y-3">
                <button
                  type="submit"
                  disabled={uploading || !utrNumber.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Submit for Review</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-muted/50 hover:bg-muted border border-border text-foreground rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}