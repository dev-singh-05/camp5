"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

const INTEREST_OPTIONS = [
  "Football", "Cricket", "Basketball", "Music", "Dance",
  "Coding", "Gaming", "Travel", "Movies", "Art",
  "Fitness", "Reading", "Photography", "Cooking", "Fashion"
];

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function DatingProfilesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [photo, setPhoto] = useState("");
  const [datingDescription, setDatingDescription] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [height, setHeight] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState("");

  // 🔒 lock flags
  const [genderLocked, setGenderLocked] = useState(false);
  const [heightLocked, setHeightLocked] = useState(false);
  const [yearLocked, setYearLocked] = useState(false);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, profile_photo, dating_description, interests, looking_for, height, year, gender, gender_locked, height_locked, year_locked"
        )
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setPhoto(data.profile_photo || "");
        setDatingDescription(data.dating_description || "");
        setInterests(data.interests || []);
        setLookingFor(data.looking_for || "");
        setHeight(data.height || "");
        setYear(data.year || "");
        setGender(data.gender || "");

        // 🔒 Lock status
        setGenderLocked(data.gender_locked || false);
        setHeightLocked(data.height_locked || false);
        setYearLocked(data.year_locked || false);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  // Toggle interest selection (max 5)
  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      } else {
        alert("You can select up to 5 interests only.");
      }
    }
  };

  // Save profile
  async function saveProfile() {
    if (!profile) return;

    const updates: any = {
      profile_photo: photo,
      dating_description: datingDescription,
      interests,
      looking_for: lookingFor,
    };

    // Lock rules
    if (!genderLocked) {
      updates.gender = gender;
      if (profile.gender && profile.gender !== gender)
        updates.gender_locked = true;
    }

    if (!heightLocked) {
      updates.height = height;
      if (profile.height && profile.height !== height)
        updates.height_locked = true;
    }

    if (!yearLocked) {
      updates.year = year;
      if (profile.year && profile.year !== year)
        updates.year_locked = true;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      alert("Error saving profile: " + error.message);
    } else {
      alert("Profile updated!");
      // Refresh lock states immediately
      setGenderLocked(updates.gender_locked || genderLocked);
      setHeightLocked(updates.height_locked || heightLocked);
      setYearLocked(updates.year_locked || yearLocked);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-6">My Dating Profile</h1>

        {/* Profile Photo */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Upload Profile Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !profile) return;

              const fileExt = file.name.split(".").pop();
              const fileName = `dating/${profile.id}.${fileExt}`;
              const filePath = `${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

              if (uploadError) return alert("Error uploading image: " + uploadError.message);

              const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

              if (urlData.publicUrl) {
                setPhoto(urlData.publicUrl);
                await supabase
                  .from("profiles")
                  .update({ profile_photo: urlData.publicUrl })
                  .eq("id", profile.id);
              }
            }}
            className="w-full border rounded-lg px-4 py-2"
          />

          {photo && (
            <img
              src={photo}
              alt="profile"
              className="mt-4 w-32 h-32 rounded-full object-cover shadow"
            />
          )}
        </div>

        {/* Gender */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            disabled={genderLocked}
            className={`w-full border rounded-lg px-4 py-2 ${genderLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          >
            <option value="">Select gender...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {genderLocked
              ? "You’ve already updated this once — now locked."
              : "You can only change this once."}
          </p>
        </div>

        {/* Dating Description */}
        <div className="mb-6">
          <label className="block font-medium mb-2">About Me</label>
          <textarea
            value={datingDescription}
            onChange={(e) => setDatingDescription(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 h-28"
            placeholder="Write something short about yourself..."
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">
            {datingDescription.length}/200 characters
          </p>
        </div>

        {/* Interests */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Select up to 5 interests</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  interests.includes(option)
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Selected: {interests.join(", ") || "None"}
          </p>
        </div>

        {/* Looking For */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Looking For</label>
          <select
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="">Select...</option>
            <option value="friendship">Friendship</option>
            <option value="relationship">Relationship</option>
            <option value="networking">Networking</option>
            <option value="casual">Casual</option>
            <option value="study-buddy">Study Buddy</option>
          </select>
        </div>

        {/* Height */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Height</label>
          <input
            type="text"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            disabled={heightLocked}
            className={`w-full border rounded-lg px-4 py-2 ${heightLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
            placeholder="e.g. 5'8 or 172 cm"
          />
          <p className="text-sm text-gray-500 mt-1">
            {heightLocked
              ? "You’ve already updated this once — now locked."
              : "You can only change this once."}
          </p>
        </div>

        {/* Year */}
        <div className="mb-6">
          <label className="block font-medium mb-2">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={yearLocked}
            className={`w-full border rounded-lg px-4 py-2 ${yearLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          >
            <option value="">Select year...</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {yearLocked
              ? "You’ve already updated this once — now locked."
              : "You can only change this once."}
          </p>
        </div>

        <button
          onClick={saveProfile}
          className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg shadow hover:bg-pink-600"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
}
