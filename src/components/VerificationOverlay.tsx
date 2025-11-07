"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast from "react-hot-toast";
import { Upload, X, AlertCircle } from "lucide-react";

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

  /**
   * Uploads file to dating-verification bucket
   * Returns the storage path (not a full URL) for database storage
   * Path format: {folder}/{user_id}-{timestamp}.{ext}
   */
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Create filename: {user_id}-{timestamp}.{ext}
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const fileName = `${user.id}-${timestamp}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log("Uploading to path:", filePath);

    // Upload to storage
    const { data, error: uploadError } = await supabase.storage
      .from("dating-verification")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!data) {
      throw new Error("Upload returned no data");
    }

    console.log("Upload successful:", data.path);
    
    // Return just the path (not a full URL)
    // Admin will use createSignedUrl(path) later
    return data.path;
  };

  // Add this diagnostic function to your VerificationOverlay.tsx
// Replace the handleSubmit function with this version for debugging

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
    console.log("📧 User email:", user.email);

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
    
    console.log("📤 ID Card upload details:");
    console.log("  - File name:", idCardFile.name);
    console.log("  - File size:", idCardFile.size, "bytes");
    console.log("  - File type:", idCardFile.type);
    console.log("  - Target path:", idFilePath);
    
    const { data: idUploadData, error: idUploadError } = await supabase.storage
      .from("dating-verification")
      .upload(idFilePath, idCardFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (idUploadError) {
      console.error("❌ ID card upload error:", idUploadError);
      console.error("   Error code:", idUploadError.message);
      console.error("   Error details:", JSON.stringify(idUploadError, null, 2));
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
    
    console.log("📤 Fee receipt upload details:");
    console.log("  - File name:", feeReceiptFile.name);
    console.log("  - File size:", feeReceiptFile.size, "bytes");
    console.log("  - File type:", feeReceiptFile.type);
    console.log("  - Target path:", feeFilePath);
    
    const { data: feeUploadData, error: feeUploadError } = await supabase.storage
      .from("dating-verification")
      .upload(feeFilePath, feeReceiptFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (feeUploadError) {
      console.error("❌ Fee receipt upload error:", feeUploadError);
      console.error("   Error code:", feeUploadError.message);
      console.error("   Error details:", JSON.stringify(feeUploadError, null, 2));
      
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
    
    console.log("📝 Verification data to insert:");
    console.log(JSON.stringify(verificationData, null, 2));
    
    const { data: insertData, error: insertError } = await supabase
      .from("dating_verifications")
      .insert([verificationData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      console.error("   Error code:", insertError.code);
      console.error("   Error message:", insertError.message);
      console.error("   Error details:", JSON.stringify(insertError, null, 2));
      
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
    console.error("Error stack:", err.stack);
    setUploadProgress("");
    
    // Show user-friendly error message
    const errorMessage = err?.message || "Failed to submit verification. Please try again.";
    toast.error(errorMessage, { duration: 5000 });
    
  } finally {
    setUploading(false);
    setUploadProgress("");
  }
};

// Instructions:
// 1. Replace your existing handleSubmit function with this one
// 2. Try to submit a verification
// 3. Open browser console (F12)
// 4. Look for the detailed logs
// 5. Share the console output with me

  // Cleanup object URLs on unmount
  useState(() => {
    return () => {
      if (idCardPreview) URL.revokeObjectURL(idCardPreview);
      if (feeReceiptPreview) URL.revokeObjectURL(feeReceiptPreview);
    };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">🔒 Verification Required</h2>
          <p className="text-sm mt-2 opacity-90">
            To ensure safety and authenticity, please verify your identity before using the dating feature.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Important Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use clear, well-lit photos</li>
                <li>Ensure all text is readable</li>
                <li>Files must be under 5MB</li>
                <li>Only JPEG, PNG, or WebP formats accepted</li>
              </ul>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name as on ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none"
              required
              minLength={3}
              disabled={uploading}
            />
          </div>

          {/* ID Card Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ID Card Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload a clear photo of your college ID card or government-issued ID
            </p>

            {!idCardPreview ? (
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg transition ${
                uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-pink-400 hover:bg-pink-50"
              }`}>
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload ID card</span>
                <span className="text-xs text-gray-400 mt-1">(JPEG, PNG, WebP • Max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, "id")}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={idCardPreview}
                  alt="ID Card Preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile("id")}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fee Receipt Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fee Receipt <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload your college fee receipt or verification fee payment proof
            </p>

            {!feeReceiptPreview ? (
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg transition ${
                uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-pink-400 hover:bg-pink-50"
              }`}>
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload receipt</span>
                <span className="text-xs text-gray-400 mt-1">(JPEG, PNG, WebP • Max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, "fee")}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={feeReceiptPreview}
                  alt="Fee Receipt Preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile("fee")}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                {uploadProgress}
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              🔐 <strong>Privacy Notice:</strong> Your documents are encrypted and only accessible by authorized admins for verification purposes. They will be deleted after verification.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !fullName.trim() || !idCardFile || !feeReceiptFile}
            className={`w-full py-3 rounded-lg text-white font-semibold transition ${
              uploading || !fullName.trim() || !idCardFile || !feeReceiptFile
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Submitting...
              </span>
            ) : (
              "Submit Verification"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}