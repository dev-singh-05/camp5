"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Pencil,
  MapPin,
  Heart,
  Briefcase,
  School,
  Ruler,
  Wine,
  Cigarette,
  Baby,
  Star,
  BookOpen,
  Camera,
  GraduationCap,
} from "lucide-react";

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
};

export default function DatingProfileDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [manualValue, setManualValue] = useState<string>("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

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
      calculateCompletion(data);
    }
    setLoading(false);
  }

  function calculateCompletion(data: any) {
    const fields = [
      "age", "work", "education", "branch", "gender", "location", "hometown",
      "height", "exercise", "drinking", "smoking", "kids", "religion", "year", "profile_photo",
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
        toast.error(`You can only change ${field} once.`);
        setActiveField(null);
        setSaving(false);
        return;
      }
      updates[lockField] = true;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      toast.error("Error saving choice: " + error.message);
    } else {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      calculateCompletion(updated);
      setActiveField(null);
      setManualValue("");
      toast.success("Profile updated!");
    }

    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      toast.error("Please log in again before uploading.");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `dating/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("dating-avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      toast.error("Error uploading image: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("dating-avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ profile_photo: publicUrl })
      .eq("id", profile.id);

    if (dbError) {
      toast.error("Error saving photo URL: " + dbError.message);
      return;
    }

    const updated = { ...profile, profile_photo: publicUrl };
    setProfile(updated);
    calculateCompletion(updated);
    toast.success("Profile photo updated successfully!");
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Please log in again.");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-gallery-${index}.${fileExt}`;
    const filePath = `dating-gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("dating-gallery")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
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

    if (dbError) return toast.error("Database update failed.");

    const updated = { ...profile, gallery_photos: newGallery };
    setProfile(updated);
    toast.success("Photo added to gallery!");
  }

  const essentialFields = ["age", "gender", "branch", "location", "hometown"];
  const essentialsFilled = essentialFields.every(
    (key) => profile && (profile as any)[key] && String((profile as any)[key]).trim() !== ""
  );

  const aboutYou = [
    { key: "age", label: "Age", icon: <Heart /> },
    { key: "work", label: "Work", icon: <Briefcase /> },
    { key: "education", label: "Education", icon: <School /> },
    { key: "branch", label: "Branch", icon: <GraduationCap /> },
    { key: "gender", label: "Gender", icon: <BookOpen /> },
    { key: "location", label: "Location", icon: <MapPin /> },
    { key: "hometown", label: "Hometown", icon: <MapPin /> },
  ];

  const moreAbout = [
    { key: "height", label: "Height", icon: <Ruler /> },
    { key: "exercise", label: "Exercise", icon: <Star /> },
    { key: "drinking", label: "Drinking", icon: <Wine /> },
    { key: "smoking", label: "Smoking", icon: <Cigarette /> },
    { key: "kids", label: "Kids", icon: <Baby /> },
    { key: "religion", label: "Religion", icon: <Heart /> },
  ];

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
 // ✅ Matching valid_branch constraint exactly
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 p-6 pb-24">
      <Toaster position="top-center" />

{/* ✅ Persistent Update My Profile Button (bottom center) */}
<div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
  <button
    onClick={async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please log in again.");
          router.push("/login");
          return;
        }

        // Optionally refresh profile
        await fetchProfile();
        toast.success("Profile updated! Redirecting...");
        setTimeout(() => router.push("/dating"), 1500);
      } catch (err) {
        console.error("Update button error:", err);
        toast.error("Something went wrong.");
      }
    }}
    className="px-8 py-3 bg-pink-500 text-white font-semibold rounded-full shadow-lg hover:bg-pink-600 transition"
  >
    🔄 Update My Profile
  </button>
</div>



      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img
              src={profile?.profile_photo || "https://via.placeholder.com/120x120.png?text=No+Photo"}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover shadow-md"
            />
            <label
              htmlFor="photoUpload"
              className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full cursor-pointer hover:bg-pink-600 shadow"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="photoUpload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {profile?.gallery_photos?.map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={photo || "https://via.placeholder.com/100x100.png?text=+"}
                className="w-full h-24 object-cover rounded-xl border"
              />
              <label
                htmlFor={`galleryUpload${index}`}
                className="absolute bottom-1 right-1 bg-pink-500 text-white p-1 rounded-full cursor-pointer hover:bg-pink-600"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id={`galleryUpload${index}`}
                type="file"
                accept="image/*"
                onChange={(e) => handleGalleryUpload(e, index)}
                className="hidden"
              />
            </div>
          ))}
        </div>

        {/* Profile Completion Bar */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Profile Completion</h2>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="bg-pink-500 h-3 transition-all duration-700" style={{ width: `${completion}%` }} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{completion}% complete</p>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-gray-800">My Dating Profile</h1>

        {/* About You */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">About You</h2>
          <div className="divide-y divide-gray-200">
            {aboutYou.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 transition px-2 rounded-lg"
                onClick={() => setActiveField(item.key)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-pink-500">{item.icon}</div>
                  <span className="font-medium text-gray-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">
                    {(profile as any)[item.key] || <span className="italic text-gray-400">Add</span>}
                  </span>
                  <Pencil className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* More About You */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">More About You</h2>
          <div className="divide-y divide-gray-200">
            {moreAbout.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 transition px-2 rounded-lg"
                onClick={() => setActiveField(item.key)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-pink-500">{item.icon}</div>
                  <span className="font-medium text-gray-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">
                    {(profile as any)[item.key] || <span className="italic text-gray-400">Add</span>}
                  </span>
                  <Pencil className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Continue Button */}
      {essentialsFilled && (
        <div className="fixed bottom-4 left-0 w-full flex justify-center z-40">
          <button
            onClick={async () => {
              if (!profile) return;
              const { error } = await supabase
                .from("profiles")
                .update({ profile_completed: true })
                .eq("id", profile.id);

              if (error) toast.error("Error updating profile: " + error.message);
              else {
                toast.success("Profile updated — redirecting...");
                setTimeout(() => router.push("/dating"), 2000);
              }
            }}
            className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 shadow-lg transition"
          >
            Continue to Dating 💞
          </button>
        </div>
      )}

      {/* Popup Modal */}
      {activeField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center">
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              {aboutYou.concat(moreAbout).find((f) => f.key === activeField)?.label}
            </h3>

            {OPTIONS[activeField as keyof typeof OPTIONS] ? (
              <div className="space-y-2 mb-4">
                {OPTIONS[activeField as keyof typeof OPTIONS].map((opt) => (
                  <button
                    key={opt}
                    disabled={saving}
                    onClick={() => handleSelect(activeField, opt)}
                    className="w-full py-2 rounded-lg border hover:bg-pink-50 text-gray-700 font-medium transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <input
                  type={activeField === "age" ? "number" : "text"}
                  placeholder={`Enter your ${activeField}`}
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  disabled={!manualValue || saving}
                  onClick={() => handleSelect(activeField, manualValue)}
                  className="w-full py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 font-medium transition"
                >
                  Save
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setActiveField(null);
                setManualValue("");
              }}
              className="w-full mt-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
