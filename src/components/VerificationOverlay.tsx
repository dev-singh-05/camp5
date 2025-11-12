"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, AlertCircle, Shield, Lock, CheckCircle, Image as ImageIcon } from "lucide-react";

type VerificationOverlayProps = {
  onVerificationSubmitted: () => void;
};

export default function VerificationOverlay({ onVerificationSubmitted }: VerificationOverlayProps) {
  const [fullName, setFullName] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [feeReceiptFile, setFeeReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [idCardPreview, setIdCardPreview] = useState<string>("");
  const [feeReceiptPreview, setFeeReceiptPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "fee"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (type === "id") {
      setIdCardFile(file);
      setIdCardPreview(URL.createObjectURL(file));
    } else {
      setFeeReceiptFile(file);
      setFeeReceiptPreview(URL.createObjectURL(file));
    }
  };

  const removeFile = (type: "id" | "fee") => {
    if (type === "id") {
      setIdCardFile(null);
      if (idCardPreview) URL.revokeObjectURL(idCardPreview);
      setIdCardPreview("");
    } else {
      setFeeReceiptFile(null);
      if (feeReceiptPreview) URL.revokeObjectURL(feeReceiptPreview);
      setFeeReceiptPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (fullName.trim().length < 3) {
      toast.error("Full name must be at least 3 characters");
      return;
    }

    if (!idCardFile) {
      toast.error("Please upload your ID card");
      return;
    }

    if (!feeReceiptFile) {
      toast.error("Please upload your fee receipt");
      return;
    }

    setUploading(true);
    setUploadProgress("Checking authentication...");

    try {
      // 1. Check authentication
      console.log("🔍 Step 1: Checking authentication...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Please log in first");
      }

      console.log("✅ User authenticated:", user.id);

      // 2. Check if user already has a pending or approved verification
      setUploadProgress("Checking existing verifications...");
      console.log("🔍 Step 2: Checking for existing verifications...");
      
      const { data: existingVerification, error: checkError } = await supabase
        .from("dating_verifications")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("❌ Check error:", checkError);
        throw new Error("Failed to check existing verifications");
      }

      if (existingVerification) {
        console.log("⚠️ Existing verification found:", existingVerification.status);
        if (existingVerification.status === "pending") {
          toast.error("You already have a pending verification");
          return;
        }
        if (existingVerification.status === "approved") {
          toast.error("You are already verified");
          return;
        }
      }

      console.log("✅ No blocking verifications found");

      // 3. Upload ID card
      setUploadProgress("Uploading ID card...");
      console.log("🔍 Step 3: Uploading ID card...");
      
      const fileExt = idCardFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const idFileName = `${user.id}-${timestamp}.${fileExt}`;
      const idFilePath = `id-cards/${idFileName}`;
      
      const { data: idUploadData, error: idUploadError } = await supabase.storage
        .from("dating-verification")
        .upload(idFilePath, idCardFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (idUploadError) {
        console.error("❌ ID card upload error:", idUploadError);
        throw new Error(`ID card upload failed: ${idUploadError.message}`);
      }

      console.log("✅ ID card uploaded successfully:", idUploadData.path);

      // 4. Upload fee receipt
      setUploadProgress("Uploading fee receipt...");
      console.log("🔍 Step 4: Uploading fee receipt...");
      
      const feeExt = feeReceiptFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const feeTimestamp = Date.now();
      const feeFileName = `${user.id}-${feeTimestamp}.${feeExt}`;
      const feeFilePath = `fee-receipts/${feeFileName}`;
      
      const { data: feeUploadData, error: feeUploadError } = await supabase.storage
        .from("dating-verification")
        .upload(feeFilePath, feeReceiptFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (feeUploadError) {
        console.error("❌ Fee receipt upload error:", feeUploadError);
        
        // Try to clean up ID card
        try {
          await supabase.storage.from("dating-verification").remove([idFilePath]);
          console.log("🧹 Cleaned up ID card after fee receipt upload failure");
        } catch (cleanupError) {
          console.error("❌ Cleanup error:", cleanupError);
        }
        
        throw new Error(`Fee receipt upload failed: ${feeUploadError.message}`);
      }

      console.log("✅ Fee receipt uploaded successfully:", feeUploadData.path);

      // 5. Insert verification record
      setUploadProgress("Saving verification...");
      console.log("🔍 Step 5: Inserting verification record...");
      
      const verificationData = {
        user_id: user.id,
        full_name: fullName.trim(),
        id_card_url: idUploadData.path,
        fee_receipt_url: feeUploadData.path,
        status: "pending",
        submitted_at: new Date().toISOString(),
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from("dating_verifications")
        .insert([verificationData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        
        // Try to clean up uploaded files on error
        try {
          await supabase.storage
            .from("dating-verification")
            .remove([idFilePath, feeFilePath]);
          console.log("🧹 Cleaned up uploaded files after insert failure");
        } catch (cleanupError) {
          console.error("❌ Cleanup error:", cleanupError);
        }
        
        throw new Error(`Failed to save verification: ${insertError.message}`);
      }

      console.log("✅ Verification record created successfully:", insertData);

      // Success!
      setUploadProgress("");
      toast.success("Verification submitted successfully! Admin will review within 24-48 hours.");
      
      // Clear form
      setFullName("");
      removeFile("id");
      removeFile("fee");
      
      // Notify parent component
      setTimeout(() => {
        onVerificationSubmitted();
      }, 1000);

    } catch (err: any) {
      console.error("💥 VERIFICATION SUBMISSION ERROR:", err);
      setUploadProgress("");
      
      // Show user-friendly error message
      const errorMessage = err?.message || "Failed to submit verification. Please try again.";
      toast.error(errorMessage, { duration: 5000 });
      
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Cleanup object URLs on unmount
  useState(() => {
    return () => {
      if (idCardPreview) URL.revokeObjectURL(idCardPreview);
      if (feeReceiptPreview) URL.revokeObjectURL(feeReceiptPreview);
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-pink-500/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-xl" />
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-pink-500/30 bg-[length:200%_100%]"
          />
          <div className="relative p-8 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  Verification Required
                  <Lock className="w-5 h-5 text-pink-400" />
                </h2>
                <p className="text-sm text-white/80">
                  To ensure safety and authenticity, please verify your identity before using the dating feature.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Important Instructions */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl blur" />
              <div className="relative bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200/90">
                  <p className="font-semibold mb-2 text-yellow-300">Important Instructions:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>Use clear, well-lit photos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>Ensure all text is readable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>Files must be under 5MB</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>Only JPEG, PNG, or WebP formats accepted</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name as on ID"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-white/40 transition-all"
                required
                minLength={3}
                disabled={uploading}
              />
            </div>

            {/* ID Card Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                ID Card Photo <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-white/60 mb-3">
                Upload a clear photo of your college ID card or government-issued ID
              </p>

              {!idCardPreview ? (
                <label className={`group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all ${
                  uploading
                    ? "cursor-not-allowed opacity-50 border-white/10"
                    : "cursor-pointer border-white/20 hover:border-pink-500/50 hover:bg-pink-500/5"
                }`}>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-pink-400" />
                    </div>
                    <span className="text-sm text-white/80 font-medium mb-1">Click to upload ID card</span>
                    <span className="text-xs text-white/40">(JPEG, PNG, WebP • Max 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleFileChange(e, "id")}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group/preview"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl blur" />
                  <div className="relative rounded-xl overflow-hidden border-2 border-white/10">
                    <img
                      src={idCardPreview}
                      alt="ID Card Preview"
                      className="w-full h-56 object-cover"
                    />
                    {!uploading && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => removeFile("id")}
                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <ImageIcon className="w-4 h-4" />
                        <span className="font-medium">ID Card</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Fee Receipt Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Fee Receipt <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-white/60 mb-3">
                Upload your college fee receipt or verification fee payment proof
              </p>

              {!feeReceiptPreview ? (
                <label className={`group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all ${
                  uploading
                    ? "cursor-not-allowed opacity-50 border-white/10"
                    : "cursor-pointer border-white/20 hover:border-pink-500/50 hover:bg-pink-500/5"
                }`}>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-pink-400" />
                    </div>
                    <span className="text-sm text-white/80 font-medium mb-1">Click to upload receipt</span>
                    <span className="text-xs text-white/40">(JPEG, PNG, WebP • Max 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handleFileChange(e, "fee")}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group/preview"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl blur" />
                  <div className="relative rounded-xl overflow-hidden border-2 border-white/10">
                    <img
                      src={feeReceiptPreview}
                      alt="Fee Receipt Preview"
                      className="w-full h-56 object-cover"
                    />
                    {!uploading && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => removeFile("fee")}
                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <ImageIcon className="w-4 h-4" />
                        <span className="font-medium">Fee Receipt</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {uploadProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl blur" />
                  <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                      />
                      <span className="text-sm text-blue-300 font-medium">{uploadProgress}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy Notice */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl blur" />
              <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
                <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-200/90">
                  <strong className="text-blue-300">Privacy Notice:</strong> Your documents are encrypted and only accessible by authorized admins for verification purposes. They will be deleted after verification.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: uploading ? 1 : 1.02 }}
              whileTap={{ scale: uploading ? 1 : 0.98 }}
              type="submit"
              disabled={uploading || !fullName.trim() || !idCardFile || !feeReceiptFile}
              className={`w-full py-4 rounded-xl text-white font-semibold transition-all text-lg ${
                uploading || !fullName.trim() || !idCardFile || !feeReceiptFile
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-2xl hover:shadow-pink-500/50"
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" />
                  Submit Verification
                </span>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(236, 72, 153, 0.6) rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
          margin: 4px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.6);
          border-radius: 5px;
          border: 2px solid rgba(15, 23, 42, 1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.8);
        }
      `}</style>
    </motion.div>
  );
}