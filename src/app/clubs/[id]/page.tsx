"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

type Member = {
  user_id: string;
  role: string | null;
  profiles: {
    full_name: string;
    enrollment_number: string;
    college_email: string;
  } | null;
};

type Club = {
  name: string;
  description: string | null;
  logo_url: string | null;
};

type Event = {
  id: string;
  title: string;
  event_date: string;
};

type Request = {
  id: string;
  user_id: string;
  club_id: string;
  status: string;
  requested_at: string;
  profiles?: {
    full_name?: string;
    enrollment_number?: string;
    college_email?: string;
  } | null;
};

export default function ClubDetailsPage() {
  const { id: clubId } = useParams<{ id: string }>();
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showTeammates, setShowTeammates] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // ---- Data fetch helpers ----
  const fetchClub = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("clubs")
      .select("name, description, logo_url")
      .eq("id", clubId)
      .single();
    setClub(data || null);
  };

  const fetchMembers = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("club_members")
      .select(
        `user_id, role, profiles ( full_name, enrollment_number, college_email )`
      )
      .eq("club_id", clubId);
    setMembers(
      (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role ?? null,
        profiles: m.profiles
          ? {
              full_name: m.profiles.full_name ?? "Unnamed",
              enrollment_number: m.profiles.enrollment_number ?? "No ID",
              college_email: m.profiles.college_email ?? "No Email",
            }
          : null,
      }))
    );
  };

  const fetchEvents = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .eq("club_id", clubId)
      .order("event_date", { ascending: true });
    setEvents(data || []);
  };

  const fetchRequests = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("club_requests")
      .select(
        `id, user_id, status, requested_at, profiles ( full_name, enrollment_number, college_email )`
      )
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    setRequests(
      (data ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        club_id: r.club_id,
        status: r.status,
        requested_at: r.requested_at,
        profiles: r.profiles
          ? {
              full_name: r.profiles.full_name,
              enrollment_number: r.profiles.enrollment_number,
              college_email: r.profiles.college_email,
            }
          : null,
      }))
    );
  };

  // initial load
  useEffect(() => {
    if (!clubId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await fetchClub();
      await fetchMembers();
      await fetchEvents();

      // determine current user's role in this club
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (userId) {
        setCurrentUserId(userId); // ✅ store logged-in userId

        const { data: roleData } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", clubId)
          .eq("user_id", userId)
          .single();
        if (!mounted) return;
        setUserRole(roleData?.role || null);

        if (roleData?.role === "admin") {
          await fetchRequests();
        } else {
          setRequests([]);
        }
      }
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [clubId]);

  // ---- User actions ----
  const handleLeaveClub = async () => {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId || !clubId) return;

    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error leaving club:", error.message);
      return;
    }

    setUserRole(null);
    await fetchMembers();
    router.push("/clubs");
  };

  const handleApprove = async (requestId: string, userId: string) => {
    if (!clubId) return;
    const { error: insertError } = await supabase.from("club_members").insert([
      { club_id: clubId, user_id: userId, role: "member" },
    ]);
    if (insertError) {
      console.error("Error approving request:", insertError.message);
      return;
    }
    await supabase.from("club_requests").delete().eq("id", requestId);
    await fetchRequests();
    await fetchMembers();
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase
      .from("club_requests")
      .delete()
      .eq("id", requestId);
    if (error) console.error("Error rejecting request:", error.message);
    await fetchRequests();
  };

  const handlePromote = async (targetUserId: string) => {
    if (!clubId) return;
    const { error } = await supabase
      .from("club_members")
      .update({ role: "admin" })
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);
    if (error) console.error("Error promoting user:", error.message);
    await fetchMembers();
  };

  const handleDemote = async (targetUserId: string) => {
    if (!clubId || targetUserId === currentUserId) return; // ✅ prevent self-demote
    const { error } = await supabase
      .from("club_members")
      .update({ role: "member" })
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);
    if (error) console.error("Error demoting user:", error.message);
    await fetchMembers();
  };

  const handleRemove = async (targetUserId: string) => {
    if (!clubId || targetUserId === currentUserId) return; // ✅ prevent self-remove
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);
    if (error) console.error("Error removing user:", error.message);
    await fetchMembers();
  };

  // ---- UI ----
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="h-full grid grid-cols-1 md:grid-cols-4">
        {/* Sidebar */}
        <div className="col-span-1 flex flex-col bg-white shadow-inner h-screen">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {/* Club Logo */}
            <div className="flex items-center justify-center">
              {club?.logo_url ? (
                <img
                  src={club.logo_url}
                  alt="Club Logo"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl">
                  🏅
                </div>
              )}
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Invite
            </button>

            {/* Teammates Section */}
            <div className="bg-gray-100 rounded-lg shadow-sm flex flex-col">
              <button
                onClick={() => setShowTeammates(!showTeammates)}
                className="w-full flex justify-between items-center px-4 py-3 font-bold text-gray-800 hover:bg-gray-200 rounded-t-lg"
              >
                Teammates
                <span>{showTeammates ? "▲" : "▼"}</span>
              </button>
              {showTeammates && (
                <div className="max-h-40 overflow-y-auto px-4 py-2">
                  {loading ? (
                    <p className="text-gray-500">Loading teammates...</p>
                  ) : members.length === 0 ? (
                    <p className="text-gray-500">No teammates found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {members.map((m) => (
                        <li
                          key={m.user_id}
                          className="flex justify-between items-center text-gray-700"
                        >
                          <span>
                            {m.role === "admin" ? "👑 " : "👤 "}
                            {m.profiles?.full_name} (
                            {m.profiles?.enrollment_number})
                          </span>
                          {/* admin controls */}
                          {userRole === "admin" && (
                            <div className="flex gap-2 text-sm">
                              {m.role === "member" && (
                                <button
                                  onClick={() => handlePromote(m.user_id)}
                                  className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Promote
                                </button>
                              )}
                              {m.role === "admin" &&
                                m.user_id !== currentUserId && (
                                  <button
                                    onClick={() => handleDemote(m.user_id)}
                                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                  >
                                    Demote
                                  </button>
                                )}
                              {m.user_id !== currentUserId && (
                                <button
                                  onClick={() => handleRemove(m.user_id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Events Section */}
            <div className="bg-gray-100 rounded-lg shadow-sm flex flex-col">
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="w-full flex justify-between items-center px-4 py-3 font-bold text-gray-800 hover:bg-gray-200 rounded-t-lg"
              >
                Events / Competitions
                <span>{showEvents ? "▲" : "▼"}</span>
              </button>
              {showEvents && (
                <div className="max-h-40 overflow-y-auto px-4 py-2">
                  {events.length === 0 ? (
                    <p className="text-gray-500">No events yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {events.map((e) => (
                        <li key={e.id} className="text-gray-600">
                          📅 {e.title} –{" "}
                          {new Date(e.event_date).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Admin Panel */}
            {userRole === "admin" && (
              <div className="bg-yellow-50 rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-lg text-yellow-800">
                  Admin Panel
                </h3>
                <h4 className="mt-2 font-semibold">Pending Requests</h4>
                {requests.length === 0 ? (
                  <p className="text-gray-500">No pending requests.</p>
                ) : (
                  <ul className="list-disc ml-6 mt-2 space-y-2">
                    {requests.map((r) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center text-gray-700"
                      >
                        <span>
                          {r.profiles?.full_name
                            ? r.profiles.full_name
                            : `User: ${r.user_id}`}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(r.id, r.user_id)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Leave Club Button */}
          <div className="p-4">
            <button
              onClick={() => setShowLeaveModal(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Leave Club
            </button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="col-span-3 flex flex-col bg-white shadow-inner h-screen">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">{club?.name}</h1>
            <p className="text-gray-600">{club?.description}</p>
            <h2 className="text-md font-semibold text-gray-700 mt-2">
              Team Chat
            </h2>
          </div>
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto mb-3 p-3 bg-gray-50 rounded-lg border">
              <p className="text-gray-500">[Chat system coming soon]</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Invite Link</h3>
            <p className="mb-4 text-sm text-gray-600">
              Share this link with others to invite them:
            </p>
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/clubs/${clubId}`}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Leave Club</h3>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to leave this club? You’ll lose access to
              teammates, chat, and events.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveClub}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}















