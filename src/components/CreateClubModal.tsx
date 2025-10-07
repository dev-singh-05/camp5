"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function CreateClubModal({
  show,
  onClose,
  onCreate,
}: {
  show: boolean;
  onClose: () => void;
  onCreate?: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [passcode, setPasscode] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null); // placeholder
  const [error, setError] = useState("");

  if (!show) return null;

  const handleCreate = async () => {
    setError("");

    if (!name.trim()) {
      setError("Club name is required.");
      return;
    }
    if (!category.trim()) {
      setError("Please select a category.");
      return;
    }

    // ✅ Get logged-in user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    // ✅ Insert new club
    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .insert([
        {
          name: name.trim(),
          category,
          passcode: passcode.trim() || null,
          description: description.trim() || null,
          logo_url: null,
          created_by: user.id,
        },
      ])
      .select("id") // ⬅️ return the id of the new club
      .single();

    if (clubError || !clubData) {
      console.error("❌ Error creating club:", clubError?.message);
      setError(clubError?.message || "Failed to create club.");
      return;
    }

    const clubId = clubData.id;

    // ✅ Insert creator into club_members
    const { error: memberError } = await supabase
      .from("club_members")
      .insert([{ club_id: clubId, user_id: user.id, role: "admin" }]);

    if (memberError) {
      console.error("❌ Error adding creator to club_members:", memberError.message);
    }

    // ✅ Insert first invite (token generated automatically)
    const { error: inviteError } = await supabase
      .from("club_invites")
      .insert([{ club_id: clubId, created_by: user.id, role: "member" }]);

    if (inviteError) {
      console.error("❌ Error creating initial invite:", inviteError.message);
    }

    // ✅ Reset all fields
    setName("");
    setCategory("");
    setPasscode("");
    setDescription("");
    setLogo(null);

    // ✅ Refresh parent & close modal
    onCreate?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
        <h3 className="text-xl font-bold mb-3 text-indigo-700">Create Club</h3>

        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Club Name"
          className="w-full mb-3 p-2 border rounded"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        >
          <option value="">Select category</option>
          <option>Sports</option>
          <option>Arts</option>
          <option>Tech</option>
          <option>General</option>
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Club Description"
          rows={3}
          className="w-full mb-3 p-2 border rounded"
        />

        {/* Logo placeholder (not functional yet) */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogo(e.target.files?.[0] || null)}
          className="w-full mb-3"
        />

        <input
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode (optional)"
          className="w-full mb-4 p-2 border rounded"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

