"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";

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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "fee"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
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
      setIdCardPreview("");
    } else {
      setFeeReceiptFile(null);
      setFeeReceiptPreview("");
    }
  };

  /**
   * Uploads the file to the `dating-verification` bucket.
   * IMPORTANT: This returns the storage *path* (folder/filename) so your admin
   * panel can call createSignedUrl(path) later. We do NOT return a full public URL here.
   */
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop() ?? "jpg";
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("dating-verification")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      // If the file already exists, you might want to upsert or rename — we keep strict behavior.
      throw uploadError;
    }

    // Return the storage path (not a public URL). Admin code expects a path for createSignedUrl.
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        setUploading(false);
        return;
      }

      // Upload files (returns storage paths so admin can create signed URLs)
      toast.loading("Uploading documents...", { id: "upload-docs" });

      const idCardPath = await uploadFile(idCardFile, "id-cards");
      const feeReceiptPath = await uploadFile(feeReceiptFile, "fee-receipts");

      // Insert verification record with storage paths (not public urls)
      const { error: insertError } = await supabase.from("dating_verifications").insert([
        {
          user_id: user.id,
          full_name: fullName.trim(),
          id_card_url: idCardPath, // store path so admin can createSignedUrl(path)
          fee_receipt_url: feeReceiptPath,
          status: "pending",
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      toast.dismiss("upload-docs");
      toast.success("Verification submitted! Please wait for admin approval.");
      // Callback to parent to re-check verification status and close overlay
      onVerificationSubmitted();
    } catch (err: any) {
      console.error("Verification submission error:", err);
      toast.dismiss("upload-docs");
      // Show a friendly message but include error if available
      toast.error(err?.message || "Failed to submit verification");
    } finally {
      setUploading(false);
    }
  };

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
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload ID card</span>
                <span className="text-xs text-gray-400 mt-1">(Max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "id")}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={idCardPreview}
                  alt="ID Card Preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeFile("id")}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
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
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload receipt</span>
                <span className="text-xs text-gray-400 mt-1">(Max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "fee")}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={feeReceiptPreview}
                  alt="Fee Receipt Preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeFile("fee")}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              🔐 <strong>Privacy Notice:</strong> Your documents are encrypted and only accessible by authorized admins for verification purposes. They will be deleted after verification.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            }`}
          >
            {uploading ? "Submitting..." : "Submit Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}
