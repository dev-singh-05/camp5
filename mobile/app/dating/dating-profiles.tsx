import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Heart,
  Camera,
  X,
  ChevronRight,
  Check,
  Upload,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

type Profile = {
  id: string;
  profile_photo?: string | null;
  gallery_photos?: string[];
  age?: number | null;
  work?: string;
  education?: string;
  branch?: string | null;
  gender?: string | null;
  location?: string | null;
  hometown?: string | null;
  height?: string | null;
  exercise?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  kids?: string | null;
  religion?: string | null;
  year?: string | null;
  gender_locked?: boolean;
  height_locked?: boolean;
  year_locked?: boolean;
  profile_completed?: boolean;
  interests?: string[];
  dating_description?: string;
};

const OPTIONS: Record<string, string[]> = {
  gender: ["Male", "Female", "Other"],
  drinking: ["Yes", "Sometimes", "Rarely", "No", "Sober"],
  smoking: ["Yes", "Sometimes", "No"],
  exercise: ["Regularly", "Sometimes", "Rarely", "Never"],
  kids: ["Want kids", "Don't want kids", "Already have kids"],
  religion: ["Hindu", "Muslim", "Christian", "Sikh", "Atheist", "Other"],
  height: ["5'0", "5'2", "5'4", "5'6", "5'8", "6'0", "6'2+"],
  year: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  branch: ["CSE", "ECE", "IT", "Mechanical", "Civil", "Electrical", "Other"],
};

const INTEREST_OPTIONS = [
  "Movies",
  "Music",
  "Sports",
  "Reading",
  "Gaming",
  "Traveling",
  "Cooking",
  "Photography",
  "Art",
  "Dancing",
  "Fitness",
  "Yoga",
  "Technology",
  "Fashion",
  "Food",
  "Nature",
  "Pets",
  "Adventure",
  "Writing",
  "Shopping",
  "Meditation",
  "Hiking",
  "Swimming",
  "Cycling",
];

export default function DatingProfiles() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);

  // Modal states
  const [activeField, setActiveField] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState<string>("");
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [datingDescription, setDatingDescription] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
    } else if (data) {
      if (!data.gallery_photos) data.gallery_photos = ["", "", "", ""];
      setProfile(data as Profile);
      setSelectedInterests(data.interests || []);
      setDatingDescription(data.dating_description || "");
      calculateCompletion(data);
    }
    setLoading(false);
  }

  function calculateCompletion(data: any) {
    const fields = [
      "age",
      "work",
      "education",
      "branch",
      "gender",
      "location",
      "hometown",
      "height",
      "exercise",
      "drinking",
      "smoking",
      "kids",
      "religion",
      "year",
      "profile_photo",
    ];

    const filled = fields.filter((f) => {
      const v = data?.[f];
      return v !== undefined && v !== null && v !== "";
    }).length;

    setCompletion(Math.round((filled / fields.length) * 100));
  }

  async function handleSelect(field: string, value: any) {
    if (!profile) return;
    setSaving(true);

    const updates: any = {
      [field]: field === "gender" ? String(value).toLowerCase() : value,
    };

    if (["gender", "height", "year"].includes(field)) {
      const lockField = `${field}_locked`;
      if ((profile as any)[lockField]) {
        Toast.show({
          type: "error",
          text1: "Locked Field",
          text2: `You can only change ${field} once.`,
        });
        setActiveField(null);
        setSaving(false);
        return;
      }
      updates[lockField] = true;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error saving choice: " + error.message,
      });
    } else {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      calculateCompletion(updated);
      setActiveField(null);
      setManualValue("");
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Profile updated!",
      });
    }

    setSaving(false);
  }

  async function handlePhotoUpload() {
    if (!profile) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow access to your photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const photo = result.assets[0];
      const fileExt = photo.uri.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `dating/${fileName}`;

      // Convert to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("dating-avatars")
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        Toast.show({
          type: "error",
          text1: "Upload Error",
          text2: uploadError.message,
        });
        return;
      }

      const { data: urlData } = supabase.storage.from("dating-avatars").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ profile_photo: publicUrl })
        .eq("id", profile.id);

      if (dbError) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Error saving photo URL.",
        });
        return;
      }

      const updated = { ...profile, profile_photo: publicUrl };
      setProfile(updated);
      calculateCompletion(updated);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Profile photo updated!",
      });
    }
  }

  async function handleGalleryUpload(index: number) {
    if (!profile) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow access to your photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const photo = result.assets[0];
      const fileExt = photo.uri.split(".").pop();
      const fileName = `${user.id}-gallery-${index}.${fileExt}`;
      const filePath = `dating-gallery/${fileName}`;

      const response = await fetch(photo.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("dating-gallery")
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        Toast.show({
          type: "error",
          text1: "Upload Error",
          text2: uploadError.message,
        });
        return;
      }

      const { data: urlData } = supabase.storage.from("dating-gallery").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const newGallery = [...(profile.gallery_photos || ["", "", "", ""])];
      newGallery[index] = publicUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ gallery_photos: newGallery })
        .eq("id", profile.id);

      if (dbError) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Database update failed.",
        });
        return;
      }

      const updated = { ...profile, gallery_photos: newGallery };
      setProfile(updated);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Photo added to gallery!",
      });
    }
  }

  async function handleSaveInterests() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ interests: selectedInterests })
      .eq("id", profile.id);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error saving interests.",
      });
    } else {
      const updated = { ...profile, interests: selectedInterests };
      setProfile(updated);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Interests saved!",
      });
      setShowInterestsModal(false);
    }

    setSaving(false);
  }

  async function handleSaveDatingDescription() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ dating_description: datingDescription.trim() })
      .eq("id", profile.id);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error saving description.",
      });
    } else {
      const updated = { ...profile, dating_description: datingDescription.trim() };
      setProfile(updated);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Dating bio saved!",
      });
      setShowDescriptionModal(false);
    }

    setSaving(false);
  }

  async function handleContinueToDating() {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({ profile_completed: true })
      .eq("id", profile.id);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error updating profile.",
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Redirecting to dating...",
      });
      setTimeout(() => router.push("/(tabs)/dating"), 1500);
    }
  }

  const essentialFields = ["age", "gender", "branch", "location", "hometown"];
  const essentialsFilled = essentialFields.every(
    (key) => profile && (profile as any)[key] && String((profile as any)[key]).trim() !== ""
  );

  const aboutYou = [
    { key: "age", label: "Age" },
    { key: "work", label: "Work" },
    { key: "education", label: "Education" },
    { key: "branch", label: "Branch" },
    { key: "gender", label: "Gender" },
    { key: "location", label: "Location" },
    { key: "hometown", label: "Hometown" },
  ];

  const moreAbout = [
    { key: "height", label: "Height" },
    { key: "exercise", label: "Exercise" },
    { key: "drinking", label: "Drinking" },
    { key: "smoking", label: "Smoking" },
    { key: "kids", label: "Kids" },
    { key: "religion", label: "Religion" },
  ];

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#831843", "#0f1729"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>👤 My Dating Profile</Text>
        </View>

        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.profilePhotoContainer}>
            <TouchableOpacity onPress={handlePhotoUpload} style={styles.profilePhotoWrapper}>
              <Image
                source={{
                  uri:
                    profile?.profile_photo ||
                    "https://via.placeholder.com/150x150.png?text=No+Photo",
                }}
                style={styles.profilePhoto}
              />
              <View style={styles.cameraIcon}>
                <Camera color="#fff" size={20} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoLabel}>Upload your profile photo</Text>
          </View>

          {/* Gallery */}
          <View style={styles.gallerySection}>
            <Text style={styles.sectionTitle}>✨ Photo Gallery</Text>
            <View style={styles.galleryGrid}>
              {profile?.gallery_photos?.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.galleryItem}
                  onPress={() => handleGalleryUpload(index)}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.galleryImage} />
                  ) : (
                    <View style={styles.galleryPlaceholder}>
                      <Upload color="rgba(255,255,255,0.4)" size={32} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Profile Completion */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionLabel}>Profile Completion</Text>
            <Text style={styles.completionPercent}>{completion}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completion}%`,
                  backgroundColor:
                    completion < 50 ? "#ef4444" : completion < 80 ? "#f59e0b" : "#ec4899",
                },
              ]}
            />
          </View>
        </View>

        {/* About You Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💖 About You</Text>
          <View style={styles.fieldsList}>
            {aboutYou.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.fieldItem}
                onPress={() => setActiveField(item.key)}
              >
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{item.label}</Text>
                  <Text style={styles.fieldValue}>
                    {(profile as any)?.[item.key] || "Not set"}
                  </Text>
                </View>
                <ChevronRight color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* More About You Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ More About You</Text>
          <View style={styles.fieldsList}>
            {moreAbout.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.fieldItem}
                onPress={() => setActiveField(item.key)}
              >
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{item.label}</Text>
                  <Text style={styles.fieldValue}>
                    {(profile as any)?.[item.key] || "Not set"}
                  </Text>
                </View>
                <ChevronRight color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dating Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Dating Preferences</Text>
          <View style={styles.fieldsList}>
            <TouchableOpacity
              style={styles.fieldItem}
              onPress={() => setShowDescriptionModal(true)}
            >
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Dating Bio</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {profile?.dating_description || "Not set"}
                </Text>
              </View>
              <ChevronRight color="rgba(255,255,255,0.4)" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fieldItem}
              onPress={() => setShowInterestsModal(true)}
            >
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Interests</Text>
                <Text style={styles.fieldValue}>
                  {profile?.interests && profile.interests.length > 0
                    ? `${profile.interests.length} selected`
                    : "Not set"}
                </Text>
              </View>
              <ChevronRight color="rgba(255,255,255,0.4)" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue Button */}
        {essentialsFilled && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinueToDating}>
            <Heart color="#fff" size={20} />
            <Text style={styles.continueButtonText}>Continue to Dating</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Field Edit Modal */}
      <Modal
        visible={activeField !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setActiveField(null);
          setManualValue("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {aboutYou.concat(moreAbout).find((f) => f.key === activeField)?.label}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveField(null);
                  setManualValue("");
                }}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeField && OPTIONS[activeField as keyof typeof OPTIONS] ? (
                <View style={styles.optionsList}>
                  {OPTIONS[activeField as keyof typeof OPTIONS].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.optionButton}
                      onPress={() => handleSelect(activeField, opt)}
                      disabled={saving}
                    >
                      <Text style={styles.optionButtonText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.manualInputContainer}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder={`Enter your ${activeField}`}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={manualValue}
                    onChangeText={setManualValue}
                    keyboardType={activeField === "age" ? "numeric" : "default"}
                  />
                  <TouchableOpacity
                    style={[styles.saveButton, (!manualValue || saving) && styles.saveButtonDisabled]}
                    onPress={() => activeField && handleSelect(activeField, manualValue)}
                    disabled={!manualValue || saving}
                  >
                    <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interests Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedInterests(profile?.interests || []);
          setShowInterestsModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>✨ Select Your Interests</Text>
                <Text style={styles.modalSubtitle}>Choose up to 10 interests</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedInterests(profile?.interests || []);
                  setShowInterestsModal(false);
                }}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.interestsGrid}>
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      style={[styles.interestButton, isSelected && styles.interestButtonSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedInterests(selectedInterests.filter((i) => i !== interest));
                        } else {
                          if (selectedInterests.length < 10) {
                            setSelectedInterests([...selectedInterests, interest]);
                          } else {
                            Toast.show({
                              type: "error",
                              text1: "Maximum Reached",
                              text2: "You can select up to 10 interests.",
                            });
                          }
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.interestButtonText,
                          isSelected && styles.interestButtonTextSelected,
                        ]}
                      >
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setSelectedInterests(profile?.interests || []);
                    setShowInterestsModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveInterests}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? "Saving..." : `Save (${selectedInterests.length}/10)`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dating Description Modal */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setDatingDescription(profile?.dating_description || "");
          setShowDescriptionModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>💖 Dating Bio</Text>
                <Text style={styles.modalSubtitle}>Tell potential matches about yourself</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDatingDescription(profile?.dating_description || "");
                  setShowDescriptionModal(false);
                }}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.descriptionInput}
                value={datingDescription}
                onChangeText={setDatingDescription}
                placeholder="e.g., Love traveling, coffee addict, looking for genuine connections..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={6}
                maxLength={200}
                textAlignVertical="top"
              />
              <View style={styles.descriptionMeta}>
                <Text style={styles.descriptionHint}>Share what makes you unique</Text>
                <Text style={styles.descriptionCounter}>{datingDescription.length}/200</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setDatingDescription(profile?.dating_description || "");
                    setShowDescriptionModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveDatingDescription}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Bio"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  photoSection: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    marginBottom: 20,
  },
  profilePhotoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profilePhotoWrapper: {
    position: "relative",
  },
  profilePhoto: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: "rgba(236, 72, 153, 0.3)",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#ec4899",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f1729",
  },
  photoLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
  gallerySection: {
    marginTop: 8,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  galleryItem: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  completionCard: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    marginBottom: 20,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  completionPercent: {
    fontSize: 14,
    color: "#ec4899",
    fontWeight: "bold",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  fieldsList: {
    gap: 8,
  },
  fieldItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ec4899",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  optionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  manualInputContainer: {
    gap: 12,
  },
  manualInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#ec4899",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  interestButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  interestButtonSelected: {
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  interestButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  interestButtonTextSelected: {
    color: "white",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  descriptionInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    fontSize: 14,
    minHeight: 120,
    marginBottom: 12,
  },
  descriptionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  descriptionHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  descriptionCounter: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
