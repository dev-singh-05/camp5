"use client";
import { Toaster, toast } from "react-hot-toast";
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
  description: string | null;
  event_date: string;
  members_required: number;
  xp_points: number;
  place: string | null;
  created_by: string;
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

type Invite = {
  id: string;
  token: string;
  role: string;
  max_uses: number;
  uses: number;
  expires_at?: string | null;
  created_at: string;
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

  // ✅ make sure we log the clubId for debugging
  useEffect(() => {
    console.log("📌 ClubDetailPage clubId from URL:", clubId);
  }, [clubId]);

  // --- Fetch invites ---
  const fetchInvites = async () => {
    if (!clubId) {
      console.error("❌ No clubId in fetchInvites");
      return;
    }

    setLoadingInvites(true);
    console.log("🔑 clubId param (from URL):", clubId);

    const { data, error } = await supabase
      .from("club_invites")
      .select("id, token, club_id, role, max_uses, uses, expires_at, created_at")
      .eq("club_id", clubId.toString()) // ✅ ensure string is cast correctly
      .order("created_at", { ascending: false })
      .limit(1);

    setLoadingInvites(false);

    if (error) {
      console.error("❌ fetchInvites error:", error.message);
      toast.error("Failed to load invites");
      return;
    }

    console.log("📥 fetchInvites result:", data);
    setInvites(data ?? []);
  };

  // --- Create Invite ---
const createInvite = async () => {
  if (!clubId || !currentUserId) return;

  const { data, error } = await supabase
    .from("club_invites")
    .insert([
      {
        club_id: clubId,
        created_by: currentUserId,
        role: inviteForm.role,
        max_uses: inviteForm.max_uses || 0,
        expires_at: inviteForm.expires_at || null,
      },
    ])
    .select("id, token, club_id, role, max_uses, uses, expires_at, created_at") // 👈 force return token
    .single();

  if (error || !data) {
    toast.error("Failed to create invite: " + (error?.message || "Unknown error"));
    return;
  }

  // 👇 update invites state immediately with this row
  setInvites([data]);

  // 👇 build URL right away
  const url = `${window.location.origin}/accept-invite?token=${data.token}`;
  await navigator.clipboard?.writeText(url);

  toast.success("Invite created and copied to clipboard");
};



  useEffect(() => {
    fetchInvites();
  }, [clubId]);


  // chat
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Events
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  // Sidebar dropdown toggles
  const [showTeammates, setShowTeammates] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteForm, setInviteForm] = useState({
    role: "member",
    max_uses: 1,
    expires_at: ""
  });
  const [loadingInvites, setLoadingInvites] = useState(false);

  // ---- Data fetch helpers ----
  const fetchMessages = async () => {
    if (!clubId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, created_at, user_id, profiles(full_name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !clubId) return;

    const { error } = await supabase.from("messages").insert([
      {
        club_id: clubId,
        user_id: currentUserId,
        content: newMessage.trim(),
      },
    ]);

    if (error) {
      console.error("❌ Failed to send message:", error.message);
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const fetchClub = async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("clubs")
      .select("name, description, logo_url")
      .eq("id", clubId)
      .single();
    setClub(data || null);
  };

  
  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from("club_invites").delete().eq("id", inviteId);
    if (error) {
      toast.error("Failed to revoke invite");
      return;
    }
    await fetchInvites();
    toast.success("Invite revoked");
  };

  const getInviteLink = (token: string) => `${window.location.origin}/accept-invite?token=${token}`;
  const copyInviteLink = async (token: string) => {
    const url = getInviteLink(token);
    await navigator.clipboard?.writeText(url);
    toast.success("Invite link copied");
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
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, event_date, members_required, xp_points, place, created_by"
      )
      .eq("club_id", clubId)
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Error fetching events");
      return;
    }
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

    // create channel outside of load so we can cleanup easily
    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          // payload.new should be the new message row
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    const load = async () => {
      setLoading(true);
      await fetchClub();
      await fetchMembers();
      await fetchEvents();
      await fetchMessages();

      // determine current user's role in this club
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (userId) {
        setCurrentUserId(userId);

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
      if (mounted) setLoading(false);
    };

    load();

    return () => {
      mounted = false;
      // unsubscribe / remove channel on cleanup
      supabase.removeChannel(channel);
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
      toast.error("Error leaving club");
      return;
    }

    setUserRole(null);
    await fetchMembers();
    router.push("/clubs");
  };

  const handleApprove = async (requestId: string, userId: string) => {
    if (!clubId) return;

    const { error: insertError } = await supabase.from("club_members").insert([
      {
        club_id: clubId,
        user_id: userId,
        role: "member",
      },
    ]);

    if (insertError) {
      toast.error("❌ Error approving request");
      return;
    }

    await supabase.from("club_requests").delete().eq("id", requestId);

    toast.success("✅ Request approved & user added");
    await fetchRequests();
    await fetchMembers();
  };

  const handleReject = async (requestId: string) => {
    await supabase.from("club_requests").delete().eq("id", requestId);
    toast.success("🚫 Request rejected");
    await fetchRequests();
  };

  const handlePromote = async (targetUserId: string) => {
    if (!clubId) return;
    await supabase
      .from("club_members")
      .update({ role: "admin" })
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);
    await fetchMembers();
  };

  const handleDemote = async (targetUserId: string) => {
    if (!clubId) return;
    const { count } = await supabase
      .from("club_members")
      .select("user_id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("role", "admin");

    if (count !== null && count <= 1) {
      toast.error("❌ Cannot demote the last admin.");
      return;
    }

    await supabase
      .from("club_members")
      .update({ role: "member" })
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);

    toast.success("User demoted ✅");
    await fetchMembers();
  };

  const handleRemove = async (targetUserId: string) => {
    if (!clubId) return;

    const { data: target } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", targetUserId)
      .single();

    if (target?.role === "admin") {
      const { count } = await supabase
        .from("club_members")
        .select("user_id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("role", "admin");

      if (count !== null && count <= 1) {
        toast.error("❌ Cannot remove the last admin.");
        return;
      }
    }

    await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", targetUserId);

    toast.success("User removed ✅");
    await fetchMembers();
  };

  const handleCreateEvent = async (formData: {
    title: string;
    description: string;
    event_date: string;
    members_required: number;
    xp_points: number;
    place: string;
  }) => {
    if (!clubId || !currentUserId) return;

    const { error } = await supabase.from("events").insert([
      {
        club_id: clubId,
        created_by: currentUserId,
        ...formData,
      },
    ]);

    if (error) {
      toast.error("❌ Error creating event");
      return;
    }

    toast.success("🎉 Event created");
    setShowCreateEventModal(false);
    await fetchEvents();
  };

  const handleParticipate = async (eventId: string) => {
    if (!currentUserId) return;

    const { error } = await supabase.from("event_participants").insert([
      {
        event_id: eventId,
        user_id: currentUserId,
      },
    ]);

    if (error) {
      toast.error("❌ Could not join event");
      return;
    }

    toast.success("✅ Joined event!");
    await fetchEventParticipants(eventId);
  };

  const fetchEventParticipants = async (eventId: string) => {
    const { data } = await supabase
      .from("event_participants")
      .select("user_id, joined_at, profiles(full_name)")
      .eq("event_id", eventId);

    setParticipants(data || []);
  };

  // ---- UI ----
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Toaster />
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


{userRole === "admin" && (
  <button
    onClick={async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const { data, error } = await supabase
        .from("club_invites")
        .insert([
          {
            club_id: clubId,
            created_by: user.id,
            role: "member", // invited users get member role
            max_uses: 1,
          },
        ])
        .select("token")
        .single();

      if (error || !data) {
        alert("Failed to create invite: " + (error?.message || "Unknown error"));
        return;
      }

      const url = `${window.location.origin}/accept-invite?token=${data.token}`;
      await navigator.clipboard?.writeText(url);
      alert("✅ Invite link copied:\n" + url);
    }}
    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
  >
    Invite
  </button>
)}



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
                        <li
                          key={e.id}
                          className="flex justify-between items-center text-gray-700 cursor-pointer hover:bg-gray-100 p-2 rounded"
                          onClick={() => {
                            setSelectedEvent(e);
                            fetchEventParticipants(e.id);
                          }}
                        >
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
                <h3 className="font-bold text-lg text-yellow-800">Admin Panel</h3>
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
            <h2 className="text-md font-semibold text-gray-700 mt-2">Team Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto mb-3 p-3 bg-gray-50 rounded-lg border">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet.</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((msg) => (
                  <li key={msg.id} className="text-gray-700">
                    <span className="font-semibold text-indigo-600">
                      {msg.profiles?.full_name || "Unknown"}
                    </span>
                    : {msg.content}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Floating Create Event Button */}
      {userRole === "admin" && (
        <button
          onClick={() => setShowCreateEventModal(true)}
          className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-indigo-600 text-white text-3xl shadow-lg flex items-center justify-center hover:scale-105"
        >
          +
        </button>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-2">{selectedEvent?.title}</h3>
            <p className="text-gray-600 mb-2">{selectedEvent?.description}</p>
            <p className="text-sm text-gray-500">
              📅{" "}
              {selectedEvent?.event_date
                ? new Date(selectedEvent.event_date).toLocaleString()
                : ""}
            </p>
            <p className="text-sm text-gray-500">📍 {selectedEvent?.place}</p>
            <p className="text-sm text-gray-500">
              🎯 {participants.length}/{selectedEvent?.members_required} slots
              filled
            </p>
            <p className="text-sm text-gray-500">⭐ {selectedEvent?.xp_points} XP</p>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() =>
                  selectedEvent && handleParticipate(selectedEvent.id)
                }
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Participate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create Event</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = {
                  title: (e.target as any).title.value,
                  description: (e.target as any).description.value,
                  event_date: (e.target as any).event_date.value,
                  members_required: parseInt(
                    (e.target as any).members_required.value
                  ),
                  xp_points: parseInt((e.target as any).xp_points.value),
                  place: (e.target as any).place.value,
                };
                await handleCreateEvent(formData);
              }}
              className="space-y-3"
            >
              <input
                name="title"
                placeholder="Event Title"
                className="w-full p-2 border rounded"
              />
              <textarea
                name="description"
                placeholder="Description"
                className="w-full p-2 border rounded"
              />
              <input
                type="datetime-local"
                name="event_date"
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                name="members_required"
                placeholder="Slots required"
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                name="xp_points"
                placeholder="XP Points"
                className="w-full p-2 border rounded"
              />
              <input
                name="place"
                placeholder="Event Place"
                className="w-full p-2 border rounded"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              value={`${window.location.origin}/accept-invite?token=${invites[0]?.token || ""}`}
              className="w-full p-2 border rounded mb-4"
            />

            {invites.length > 0 && (
              <button
                onClick={() => copyInviteLink(invites[0].token)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
              >
                Copy Link
              </button>
            )}

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


















