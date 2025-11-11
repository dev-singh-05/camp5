"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

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
      // Remove the payment-screenshots/ prefix - just use the filename
      const filePath = fileName;

      console.log("Uploading to:", filePath);

      // Upload to token-payments bucket (matches your Supabase setup)
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

      // Get public URL from the same bucket
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

      // Try to upload screenshot if provided
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
        if (!screenshotUrl) {
          console.warn("Screenshot upload failed, proceeding without it");
        }
      }

      // Create purchase request
      const { error } = await supabase
        .from("token_purchase_requests")
        .insert({
          user_id: userId,
          amount: 0, // Admin will update this
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
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Request Submitted!
          </h3>
          <p className="text-gray-600 mb-6">
            Your token purchase request has been submitted for admin review. 
            Tokens will be credited within <strong>30 minutes</strong> after approval.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2">What happens next?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Admin will verify your payment</li>
                  <li>• Tokens will be added to your account</li>
                  <li>• You'll see updated balance automatically</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Close & Continue Using App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">💳 Add Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✖
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* QR Code Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Payment QR Code
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Scan this QR code to make payment
            </p>
            <div className="inline-block px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
              🚧 QR Code Coming Soon
            </div>
          </div>

          {/* UTR Number Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UTR Number / Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter UTR or Transaction ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the UTR/Transaction ID from your payment app
            </p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Screenshot (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            {screenshot && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <span>✓</span>
                <span>{screenshot.name}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Upload a screenshot of your payment for faster verification
            </p>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Note:</p>
                <p>Your request will be submitted successfully even if the screenshot upload fails. The UTR number is mandatory for verification.</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !utrNumber.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {uploading ? "Submitting..." : "Submit for Review"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}