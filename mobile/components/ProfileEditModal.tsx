import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, User, Save } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';
import Toast from 'react-native-toast-message';

type ProfileEditModalProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onProfileUpdated: () => void;
};

type ProfileData = {
  full_name: string;
  location: string;
  year: string;
  branch: string;
  gender: string;
};

export function ProfileEditModal({ visible, userId, onClose, onProfileUpdated }: ProfileEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    location: '',
    year: '',
    branch: '',
    gender: '',
  });

  useEffect(() => {
    if (visible && userId) {
      loadProfile();
    }
  }, [visible, userId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, location, year, branch, gender')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          location: data.location || '',
          year: data.year || '',
          branch: data.branch || '',
          gender: data.gender || '',
        });
      }
    } catch (err) {
      console.error('loadProfile error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load profile data',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    // Validate required fields
    if (!profileData.full_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Full name is required',
      });
      return;
    }

    if (!profileData.gender) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Gender is required',
      });
      return;
    }

    if (!profileData.year) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Year is required',
      });
      return;
    }

    if (!profileData.branch) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Branch is required',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name.trim(),
          location: profileData.location.trim(),
          year: profileData.year,
          branch: profileData.branch,
          gender: profileData.gender,
          profile_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
      });

      onProfileUpdated();
      onClose();
    } catch (err) {
      console.error('handleSave error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#0f1729', '#1e1b4b', '#0f1729']} style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <User color="#fff" size={24} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Edit Profile</Text>
                  <Text style={styles.headerSubtitle}>Update your information</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Body - scrollable content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#a855f7" size="large" />
                  <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
              ) : (
                <View style={styles.form}>
                  {/* Full Name */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Full Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={profileData.full_name}
                      onChangeText={(text) => setProfileData({ ...profileData, full_name: text })}
                      placeholder="John Doe"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>

                  {/* Gender */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Gender <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      {['Male', 'Female', 'Other'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.radioButton,
                            profileData.gender === option && styles.radioButtonActive,
                          ]}
                          onPress={() => setProfileData({ ...profileData, gender: option })}
                        >
                          <Text
                            style={[
                              styles.radioButtonText,
                              profileData.gender === option && styles.radioButtonTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Year */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Current Year <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.radioButton,
                            profileData.year === option && styles.radioButtonActive,
                          ]}
                          onPress={() => setProfileData({ ...profileData, year: option })}
                        >
                          <Text
                            style={[
                              styles.radioButtonText,
                              profileData.year === option && styles.radioButtonTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Branch */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Branch/Course <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      {['CSE', 'ECE', 'ME', 'CE', 'EE', 'Other'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.radioButton,
                            profileData.branch === option && styles.radioButtonActive,
                          ]}
                          onPress={() => setProfileData({ ...profileData, branch: option })}
                        >
                          <Text
                            style={[
                              styles.radioButtonText,
                              profileData.branch === option && styles.radioButtonTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                      style={styles.input}
                      value={profileData.location}
                      onChangeText={(text) => setProfileData({ ...profileData, location: text })}
                      placeholder="Current city"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>

                  <Text style={styles.helperText}>
                    <Text style={styles.required}>*</Text> Required fields
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || loading}
              >
                <LinearGradient
                  colors={saving ? ['#6b7280', '#4b5563'] : ['#a855f7', '#ec4899']}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Save color="#fff" size={20} />
                  )}
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
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
  headerLeft: {
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
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  radioButtonActive: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: '#a855f7',
  },
  radioButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
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
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
