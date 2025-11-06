"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Toaster, toast } from "react-hot-toast";

type Club = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  logo_url: string | null;
  created_by: string;
  passcode: string | null;
};

type Member = {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    enrollment_number: string;
    college_email: string;
  } | null;
};

export default function ClubProfilePage() {
  const { id: clubId } = useParams<{ id: string }>();
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPasscode, setEditPasscode] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Stats
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [clubRank, setClubRank] = useState<number | null>(null);
  // For history and activity
const [events, setEvents] = useState<any[]>([]);
const [messages, setMessages] = useState<any[]>([]);
const [eventParticipantCounts, setEventParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get current user
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      setCurrentUserId(userId);

      if (!userId) {
        router.push("/login");
        return;
      }

      // Check user role
      const { data: roleData } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .single();

      setUserRole(roleData?.role || null);

      // Fetch club data
    // Fetch club data
await fetchClubData();
await fetchMembers();
await fetchStats();
await fetchEvents();
await fetchMessages();

setLoading(false);
    };

    load();
  }, [clubId, router]);

  const fetchClubData = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (error) {
      toast.error("Failed to load club data");
      return;
    }

    setClub(data);
    setEditName(data.name || "");
    setEditDescription(data.description || "");
    setEditCategory(data.category || "");
    setEditPasscode(""); // Don't show password
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("club_members")
      .select("user_id, role, profiles(full_name, enrollment_number, college_email)")
      .eq("club_id", clubId)
      .order("role", { ascending: false }); // Admins first

    setMembers(
      (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role ?? "member",
        profiles: m.profiles || null,
      }))
    );
  };

  const fetchStats = async () => {
    // Count total events
    const { count: eventCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);

    setTotalEvents(eventCount || 0);

    // Get club XP and rank
    const { data: xpData } = await supabase
      .from("club_xp_ledger")
      .select("total_xp")
      .eq("club_id", clubId)
      .single();

    setTotalXP(xpData?.total_xp || 0);

    // Get rank
    const { data: allClubs } = await supabase
      .from("club_xp_ledger")
      .select("club_id, total_xp")
      .order("total_xp", { ascending: false });

    const rank = (allClubs || []).findIndex((c: any) => c.club_id === clubId) + 1;
    setClubRank(rank > 0 ? rank : null);
  };

  const fetchEvents = async () => {
  // Fetch events created by this club
  const { data: ownEvents } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .order("event_date", { ascending: false });

  // Fetch inter-club events where this club has ACCEPTED
  const { data: acceptedInterEvents } = await supabase
    .from("inter_club_participants")
    .select(`
      event_id,
      events!inner(*)
    `)
    .eq("club_id", clubId)
    .eq("accepted", true)
    .neq("events.club_id", clubId);

  // Merge both event lists
  const allEvents = [
    ...(ownEvents || []),
    ...(acceptedInterEvents || []).map((item: any) => item.events)
  ];

  // Remove duplicates
  const uniqueEvents = Array.from(
    new Map(allEvents.map(event => [event.id, event])).values()
  );

  setEvents(uniqueEvents);

  // Fetch participant counts
  if (uniqueEvents.length > 0) {
    const counts: Record<string, number> = {};
    for (const event of uniqueEvents) {
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      counts[event.id] = count || 0;
    }
    setEventParticipantCounts(counts);
  }
};

const fetchMessages = async () => {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  setMessages(data || []);
};

  const handleSave = async () => {
    if (!club || userRole !== "admin") return;

    let logoUrl = club.logo_url;

    // Upload logo if changed
    if (logoFile) {
      const fileName = `${clubId}_${Date.now()}.${logoFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(fileName, logoFile);

      if (uploadError) {
        toast.error("Failed to upload logo");
        return;
      }

      const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(fileName);
      logoUrl = urlData.publicUrl;
    }

    // Update club data
    const updateData: any = {
      name: editName,
      description: editDescription,
      category: editCategory,
      logo_url: logoUrl,
    };

    // Only update password if provided
    if (editPasscode.trim()) {
      updateData.passcode = editPasscode;
    }

    const { error } = await supabase
      .from("clubs")
      .update(updateData)
      .eq("id", clubId);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("✅ Club profile updated!");
    setIsEditing(false);
    setEditPasscode(""); // Clear password field
    await fetchClubData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading club profile...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Club not found</p>
      </div>
    );
  }

  const isAdmin = userRole === "admin";
  const admins = members.filter((m) => m.role === "admin");
  const regularMembers = members.filter((m) => m.role !== "admin");

  // Helper: Check if event should be in history
const isHistoryEvent = (event: any) => {
  return event.status === "approved" || event.status === "rejected";
};

// Split events into active and history
const historyEvents = events.filter(e => isHistoryEvent(e));

// Filter system messages for activity log
const activityLogs = messages.filter(msg => 
  msg.content && msg.content.startsWith("🔔 SYSTEM:")
);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <Toaster />

      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Club Profile</h1>

          {isAdmin && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              ✏️ Edit Profile
            </button>
          )}

          {isAdmin && isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(club.name);
                  setEditDescription(club.description || "");
                  setEditCategory(club.category || "");
                  setEditPasscode("");
                  setLogoFile(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                💾 Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {isEditing ? (
                <div>
                  <label className="block cursor-pointer">
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {logoFile ? (
                        <img
                          src={URL.createObjectURL(logoFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt="Club logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🏅</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">Click to change</p>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt="Club logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🏅</span>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Club Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select category</option>
                      <option value="Sports">Sports</option>
                      <option value="Arts">Arts</option>
                      <option value="Tech">Tech</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Change Password (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      placeholder="New password (optional)"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{club.name}</h2>
                  <p className="text-indigo-600 font-semibold mb-4">
                    {club.category || "Uncategorized"}
                  </p>
                  <p className="text-gray-700 mb-4">
                    {club.description || "No description provided."}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-600">{totalEvents}</p>
                      <p className="text-xs text-gray-600">Total Events</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-2xl font-bold text-green-600">{totalXP}</p>
                      <p className="text-xs text-gray-600">Total XP</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <p className="text-2xl font-bold text-yellow-600">
                        #{clubRank || "N/A"}
                      </p>
                      <p className="text-xs text-gray-600">Global Rank</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Club Members</h3>

          {/* Admins */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-yellow-700 mb-2">👑 Admins</h4>
            {admins.length === 0 ? (
              <p className="text-gray-500 text-sm">No admins</p>
            ) : (
              <ul className="space-y-2">
                {admins.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                    <span className="text-2xl">👑</span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {m.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {m.profiles?.enrollment_number || "No ID"} •{" "}
                        {m.profiles?.college_email || "No email"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Regular Members */}
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-2">
              👥 Members ({regularMembers.length})
            </h4>
            {regularMembers.length === 0 ? (
              <p className="text-gray-500 text-sm">No members yet</p>
            ) : (
              <ul className="space-y-2">
                {regularMembers.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {m.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {m.profiles?.enrollment_number || "No ID"} •{" "}
                        {m.profiles?.college_email || "No email"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Password Protection Info */}
        {club.passcode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800">
              🔒 This club is password-protected. Only members with the password can join.
            </p>
          </div>
        )}
        {/* Event History Section */}
<div id="history" className="bg-white rounded-xl shadow-lg p-6 mb-6">
  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    📜 Event History
  </h3>
  <div className="space-y-3">
    {historyEvents.length === 0 ? (
      <p className="text-gray-500 text-sm">No completed events yet.</p>
    ) : (
      historyEvents.map((e) => (
        <div
          key={e.id}
          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-900">{e.title}</h4>
            {e.status === "approved" && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                ✅ Approved
              </span>
            )}
            {e.status === "rejected" && (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                ❌ Rejected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{e.description || "No description"}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>📅 {new Date(e.event_date).toLocaleDateString()}</span>
            <span>📍 {e.place || "TBD"}</span>
            <span>⭐ {e.total_xp_pool} XP</span>
            <span>
              👥 {eventParticipantCounts[e.id] || 0}/{e.members_required}
            </span>
          </div>
          {e.results_description && (
            <div className="mt-3 p-2 bg-green-50 rounded">
              <p className="text-xs text-gray-700">
                <strong>Results:</strong> {e.results_description}
              </p>
            </div>
          )}
        </div>
      ))
    )}
  </div>
</div>

{/* Activity Log Section */}
<div id="activity" className="bg-white rounded-xl shadow-lg p-6 mb-6">
  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    📋 Activity Log
  </h3>
  <div className="space-y-2 max-h-96 overflow-y-auto">
    {activityLogs.length === 0 ? (
      <p className="text-gray-500 text-sm">No activity yet.</p>
    ) : (
      activityLogs.slice().reverse().map((log) => (
        <div
          key={log.id}
          className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
        >
          <p className="text-sm text-gray-800">
            {log.content.replace("🔔 SYSTEM: ", "")}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(log.created_at).toLocaleString()}
          </p>
        </div>
      ))
    )}
  </div>
</div>

        {/* Admin Only: Danger Zone */}
        {isAdmin && !isEditing && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              Careful! These actions cannot be undone.
            </p>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this club? This cannot be undone!")) {
                  // TODO: Add delete functionality
                  toast.error("Delete functionality coming soon");
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑️ Delete Club
            </button>
          </div>
        )}
      </div>
    </div>
  );
}