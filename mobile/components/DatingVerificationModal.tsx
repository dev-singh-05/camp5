import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../utils/supabaseClient";
import Toast from "react-native-toast-message";

type DatingVerificationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DatingVerificationModal({
  visible,
  onClose,
  onSuccess,
}: DatingVerificationModalProps) {
  const [fullName, setFullName] = useState("");
  const [idCardUri, setIdCardUri] = useState<string | null>(null);
  const [feeReceiptUri, setFeeReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const pickImage = async (type: "id" | "fee") => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        if (type === "id") {
          setIdCardUri(result.assets[0].uri);
        } else {
          setFeeReceiptUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick image",
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Please enter your full name");
      return;
    }

    if (fullName.trim().length < 3) {
      Alert.alert("Validation Error", "Full name must be at least 3 characters");
      return;
    }

    if (!idCardUri) {
      Alert.alert("Validation Error", "Please upload your ID card");
      return;
    }

    if (!feeReceiptUri) {
      Alert.alert("Validation Error", "Please upload your fee receipt");
      return;
    }

    setUploading(true);
    setUploadProgress("Checking authentication...");

    try {
      // 1. Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in first");
      }

      // 2. Check for existing verifications
      setUploadProgress("Checking existing verifications...");

      const { data: existingVerification, error: checkError } = await supabase
        .from("dating_verifications")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (checkError && (checkError as any).code !== "PGRST116") {
        throw new Error("Failed to check existing verifications");
      }

      if (existingVerification) {
        if (existingVerification.status === "pending") {
          Alert.alert("Already Submitted", "You already have a pending verification");
          return;
        }
        if (existingVerification.status === "approved") {
          Alert.alert("Already Verified", "You are already verified");
          return;
        }
      }

      // 3. Upload ID card
      setUploadProgress("Uploading ID card...");

      const idExt = idCardUri.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const idFileName = `${user.id}-${timestamp}.${idExt}`;
      const idFilePath = `id-cards/${idFileName}`;

      const idFormData = new FormData();
      idFormData.append("file", {
        uri: idCardUri,
        type: `image/${idExt}`,
        name: idFileName,
      } as any);

      const { data: idUploadData, error: idUploadError } = await supabase.storage
        .from("dating-verification")
        .upload(idFilePath, idFormData, {
          cacheControl: "3600",
          upsert: false,
        });

      if (idUploadError) {
        throw new Error(`ID card upload failed: ${idUploadError.message}`);
      }

      // 4. Upload fee receipt
      setUploadProgress("Uploading fee receipt...");

      const feeExt = feeReceiptUri.split(".").pop()?.toLowerCase() || "jpg";
      const feeTimestamp = Date.now();
      const feeFileName = `${user.id}-${feeTimestamp}.${feeExt}`;
      const feeFilePath = `fee-receipts/${feeFileName}`;

      const feeFormData = new FormData();
      feeFormData.append("file", {
        uri: feeReceiptUri,
        type: `image/${feeExt}`,
        name: feeFileName,
      } as any);

      const { data: feeUploadData, error: feeUploadError } = await supabase.storage
        .from("dating-verification")
        .upload(feeFilePath, feeFormData, {
          cacheControl: "3600",
          upsert: false,
        });

      if (feeUploadError) {
        // Clean up ID card on failure
        try {
          await supabase.storage.from("dating-verification").remove([idFilePath]);
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }

        throw new Error(`Fee receipt upload failed: ${feeUploadError.message}`);
      }

      // 5. Insert verification record
      setUploadProgress("Saving verification...");

      const verificationData = {
        user_id: user.id,
        full_name: fullName.trim(),
        id_card_url: idUploadData.path,
        fee_receipt_url: feeUploadData.path,
        status: "pending",
        submitted_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("dating_verifications")
        .insert([verificationData]);

      if (insertError) {
        // Clean up uploaded files on error
        try {
          await supabase.storage
            .from("dating-verification")
            .remove([idFilePath, feeFilePath]);
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }

        throw new Error(`Failed to save verification: ${insertError.message}`);
      }

      // Success!
      setUploadProgress("");
      Toast.show({
        type: "success",
        text1: "Success!",
        text2: "Verification submitted! Admin will review within 24-48 hours.",
      });

      // Clear form
      setFullName("");
      setIdCardUri(null);
      setFeeReceiptUri(null);

      // Close modal and notify parent
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Verification submission error:", err);
      setUploadProgress("");

      Alert.alert(
        "Submission Failed",
        err?.message || "Failed to submit verification. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🛡️ Verification Required</Text>
          <Text style={styles.headerSubtitle}>
            Verify your identity to access the dating feature
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Instructions */}
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>⚠️ Important Instructions:</Text>
            <Text style={styles.instructionItem}>✓ Use clear, well-lit photos</Text>
            <Text style={styles.instructionItem}>✓ Ensure all text is readable</Text>
            <Text style={styles.instructionItem}>✓ Files must be under 5MB</Text>
            <Text style={styles.instructionItem}>✓ Only JPEG/PNG formats</Text>
          </View>

          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name as on ID"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              editable={!uploading}
            />
          </View>

          {/* ID Card Upload */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              ID Card Photo <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>
              Upload a clear photo of your college ID or government ID
            </Text>

            {!idCardUri ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("id")}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonIcon}>📤</Text>
                <Text style={styles.uploadButtonText}>Click to upload ID card</Text>
                <Text style={styles.uploadButtonSubtext}>(JPEG/PNG • Max 5MB)</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.previewContainer}>
                <Image source={{ uri: idCardUri }} style={styles.previewImage} />
                {!uploading && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setIdCardUri(null)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.previewLabel}>
                  <Text style={styles.previewLabelText}>ID Card</Text>
                </View>
              </View>
            )}
          </View>

          {/* Fee Receipt Upload */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Fee Receipt <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>
              Upload your college fee receipt or verification payment proof
            </Text>

            {!feeReceiptUri ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage("fee")}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonIcon}>📤</Text>
                <Text style={styles.uploadButtonText}>Click to upload receipt</Text>
                <Text style={styles.uploadButtonSubtext}>(JPEG/PNG • Max 5MB)</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.previewContainer}>
                <Image source={{ uri: feeReceiptUri }} style={styles.previewImage} />
                {!uploading && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setFeeReceiptUri(null)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.previewLabel}>
                  <Text style={styles.previewLabelText}>Fee Receipt</Text>
                </View>
              </View>
            )}
          </View>

          {/* Upload Progress */}
          {uploadProgress && (
            <View style={styles.progressBox}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          {/* Privacy Notice */}
          <View style={styles.privacyBox}>
            <Text style={styles.privacyText}>
              🔒 <Text style={styles.privacyBold}>Privacy Notice:</Text> Your documents are
              encrypted and only accessible by authorized admins for verification. They will be
              deleted after verification.
            </Text>
          </View>
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, uploading && styles.buttonDisabled]}
            onPress={onClose}
            disabled={uploading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (uploading || !fullName.trim() || !idCardUri || !feeReceiptUri) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={uploading || !fullName.trim() || !idCardUri || !feeReceiptUri}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>🛡️ Submit Verification</Text>
            )}
          </TouchableOpacity>
        </View>

        <Toast />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1729",
  },
  header: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(236, 72, 153, 0.3)",
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  instructionsBox: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fbbf24",
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 12,
    color: "rgba(251, 191, 36, 0.9)",
    marginBottom: 4,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  helperText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  previewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#ef4444",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  previewLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
  },
  previewLabelText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  progressBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: "#60a5fa",
    fontWeight: "500",
  },
  privacyBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 12,
    color: "rgba(147, 197, 253, 0.9)",
  },
  privacyBold: {
    fontWeight: "600",
    color: "#93c5fd",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#ec4899",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
