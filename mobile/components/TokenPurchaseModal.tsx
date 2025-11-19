import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Upload, CheckCircle, Info, AlertCircle, Smartphone, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

type TokenPurchaseModalProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
};

export function TokenPurchaseModal({ visible, userId, onClose }: TokenPurchaseModalProps) {
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setScreenshot({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('File selection error:', err);
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot) return null;

    try {
      const fileExt = screenshot.name.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const response = await fetch(screenshot.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('token-payments')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: screenshot.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('token-payments').getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('uploadScreenshot error:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim()) {
      Alert.alert('Error', 'Please enter UTR number');
      return;
    }

    setUploading(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        screenshotUrl = await uploadScreenshot();
        if (!screenshotUrl) {
          console.warn('Screenshot upload failed, proceeding without it');
        }
      }

      const { error } = await supabase.from('token_purchase_requests').insert({
        user_id: userId,
        amount: 0,
        utr_number: utrNumber,
        payment_screenshot_url: screenshotUrl,
        status: 'pending',
      });

      if (error) {
        console.error('Error creating request:', error);
        Toast.show({
          type: 'error',
          text1: 'Submission Failed',
          text2: 'Please try again',
        });
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('handleSubmit error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setUtrNumber('');
    setScreenshot(null);
    setSubmitted(false);
    onClose();
  };

  if (submitted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Success gradient background */}
            <View style={[styles.gradientBg, { backgroundColor: 'rgba(16,185,129,0.1)' }]} />

            <LinearGradient colors={['#0f1729', '#1e1b4b', '#0f1729']} style={styles.modalContent}>
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <CheckCircle color="#10b981" size={48} />
                </View>

                <Text style={styles.successTitle}>Request Submitted!</Text>
                <Text style={styles.successSubtext}>
                  Your token purchase request has been submitted for admin review.{'\n'}
                  Tokens will be credited within <Text style={styles.highlight}>30 minutes</Text> after
                  approval.
                </Text>

                <View style={styles.infoBox}>
                  <View style={styles.infoHeader}>
                    <Info color="#3b82f6" size={20} />
                    <Text style={styles.infoTitle}>What happens next?</Text>
                  </View>
                  <View style={styles.infoList}>
                    <View style={styles.infoItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.infoText}>Admin will verify your payment</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.infoText}>Tokens will be added to your account</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.infoText}>You'll see updated balance automatically</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.successButton} onPress={handleClose}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.successButtonGradient}
                  >
                    <Text style={styles.successButtonText}>Close & Continue Using App</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
        <Toast />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Animated gradient background */}
          <View style={styles.gradientBg} />

          <LinearGradient colors={['#0f1729', '#1e1b4b', '#0f1729']} style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerIcon}>
                  <Upload color="#fff" size={24} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Add Tokens</Text>
                  <Text style={styles.headerSubtitle}>Complete payment & submit</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Body - scrollable */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* QR Code Section */}
              <View style={styles.qrSection}>
                <View style={styles.qrIconContainer}>
                  <Smartphone color="#a855f7" size={32} />
                </View>
                <Text style={styles.qrTitle}>Payment QR Code</Text>
                <Text style={styles.qrSubtitle}>Scan this QR code to make payment</Text>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>🚧 QR Code Coming Soon</Text>
                </View>
              </View>

              {/* UTR Number Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  UTR Number / Transaction ID <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={utrNumber}
                  onChangeText={setUtrNumber}
                  placeholder="Enter UTR or Transaction ID"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                />
                <View style={styles.inputHint}>
                  <Info color="rgba(255,255,255,0.5)" size={12} />
                  <Text style={styles.hintText}>Enter the UTR/Transaction ID from your payment app</Text>
                </View>
              </View>

              {/* Screenshot Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Payment Screenshot <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TouchableOpacity style={styles.fileButton} onPress={handleFileSelect}>
                  <View style={styles.fileIconContainer}>
                    <ImageIcon color="#a855f7" size={20} />
                  </View>
                  <View style={styles.fileTextContainer}>
                    <Text style={styles.fileButtonText}>
                      {screenshot ? screenshot.name : 'Choose screenshot'}
                    </Text>
                    <Text style={styles.fileButtonSubtext}>
                      {screenshot ? 'Click to change' : 'PNG, JPG up to 10MB'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {screenshot && (
                  <View style={styles.successBadge}>
                    <CheckCircle color="#10b981" size={16} />
                    <Text style={styles.successBadgeText}>File selected successfully</Text>
                  </View>
                )}
                <View style={styles.inputHint}>
                  <Info color="rgba(255,255,255,0.5)" size={12} />
                  <Text style={styles.hintText}>Upload screenshot for faster verification</Text>
                </View>
              </View>

              {/* Info Note */}
              <View style={styles.warningBox}>
                <AlertCircle color="#3b82f6" size={20} />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Note:</Text>
                  <Text style={styles.warningText}>
                    Your request will be submitted successfully even if the screenshot upload fails. The UTR
                    number is mandatory for verification.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitButton, (!utrNumber.trim() || uploading) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!utrNumber.trim() || uploading}
              >
                <LinearGradient colors={['#a855f7', '#ec4899']} style={styles.submitButtonGradient}>
                  {uploading ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </>
                  ) : (
                    <>
                      <Upload color="#fff" size={20} />
                      <Text style={styles.submitButtonText}>Submit for Review</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
      <Toast />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 24,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  qrSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  qrPlaceholder: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 12,
  },
  qrPlaceholderText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  inputHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  fileButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTextContainer: {
    flex: 1,
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  fileButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 8,
  },
  successBadgeText: {
    fontSize: 14,
    color: '#10b981',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  successContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  highlight: {
    color: '#10b981',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  successButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  successButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
