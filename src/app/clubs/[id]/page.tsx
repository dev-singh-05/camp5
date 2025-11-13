"use client";
import { Toaster, toast } from "react-hot-toast";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

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
  event_type: string;
  size_category: string | null;
  total_xp_pool: number;
  status: string;
  results_description: string | null;
  proof_photos: string[] | null;
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
  const [participatingLoading, setParticipatingLoading] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [eventAcceptanceStatus, setEventAcceptanceStatus] = useState<Record<string, boolean>>({});
  const [canComplete, setCanComplete] = useState<Record<string, boolean>>({});
  // add state near other admin panel states
const [inviteActioning, setInviteActioning] = useState<string | null>(null);


  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const [showTeammates, setShowTeammates] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
const [showActivityLog, setShowActivityLog] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [competingClubsForEvent, setCompetingClubsForEvent] = useState<any[]>([]);
const [eventInvitations, setEventInvitations] = useState<any[]>([]);

  const [eventParticipantCounts, setEventParticipantCounts] = useState<Record<string, number>>({});

  // Event creation form states
  const [eventType, setEventType] = useState<"intra" | "inter">("intra");
  const [sizeCategory, setSizeCategory] = useState("");
  const [competingClubs, setCompetingClubs] = useState<string[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);

  // Complete event modal states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<Event | null>(null);
  const [resultsDescription, setResultsDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clubPositions, setClubPositions] = useState<Record<string, number>>({});

// Helper: Check if event should be in history
const isHistoryEvent = (event: Event) => {
  return event.status === "approved" || event.status === "rejected";
};

// Split events into active and history
const activeEvents = events.filter(e => !isHistoryEvent(e));
const historyEvents = events.filter(e => isHistoryEvent(e));

// Filter system messages for activity log (messages starting with 🔔 SYSTEM:)
const activityLogs = messages.filter(msg => 
  msg.content && msg.content.startsWith("🔔 SYSTEM:")
);

  useEffect(() => {
    console.log("📌 ClubDetailPage clubId from URL:", clubId);
  }, [clubId]);

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

 const sendSystemMessage = async (content: string) => {
  if (!clubId || !currentUserId) return;
  
  const { error } = await supabase.from("messages").insert([
    {
      club_id: clubId,
      user_id: currentUserId, // Use current user ID for system messages
      content: `🔔 SYSTEM: ${content}`,
    },
  ]);

  if (error) {
    console.error("❌ Failed to send system message:", error.message);
  }
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
  
  // Fetch events created by this club
  const { data: ownEvents, error: ownError } = await supabase
    .from("events")
    .select(
      "id, title, description, event_date, members_required, xp_points, place, created_by, event_type, size_category, total_xp_pool, status, results_description, proof_photos"
    )
    .eq("club_id", clubId)
    .order("event_date", { ascending: true });

  if (ownError) {
    toast.error("Error fetching events");
    return;
  }

  // Fetch inter-club events where this club has ACCEPTED
  const { data: acceptedInterEvents, error: interError } = await supabase
    .from("inter_club_participants")
    .select(`
      event_id,
      events!inner(
        id, title, description, event_date, members_required, xp_points, place, created_by, event_type, size_category, total_xp_pool, status, results_description, proof_photos, club_id
      )
    `)
    .eq("club_id", clubId)
    .eq("accepted", true)
    .neq("events.club_id", clubId);

  if (interError) {
    console.error("Error fetching accepted inter-club events:", interError);
  }

  // Merge both event lists
  const allEvents = [
    ...(ownEvents || []),
    ...(acceptedInterEvents || []).map((item: any) => item.events)
  ];

  // Remove duplicates by event id
  const uniqueEvents = Array.from(
    new Map(allEvents.map(event => [event.id, event])).values()
  );

  // Sort by event_date
  uniqueEvents.sort((a, b) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  setEvents(uniqueEvents);
  
  if (uniqueEvents.length > 0) {
    fetchAllEventParticipantCounts(uniqueEvents.map(e => e.id));
  }
};
 
const checkCanComplete = async (event: Event) => {
  const result = await canCompleteEvent(event);
  setCanComplete(prev => ({ ...prev, [event.id]: result }));
};

  const fetchAllEventParticipantCounts = async (eventIds: string[]) => {
    const counts: Record<string, number> = {};
    
    for (const eventId of eventIds) {
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      
      counts[eventId] = count || 0;
    }
    
    setEventParticipantCounts(counts);
  };

const checkEventAcceptance = async (eventId: string, eventType: string) => {
  if (eventType !== "inter") { setEventAcceptanceStatus(prev => ({ ...prev, [eventId]: true })); return; }
  const { data: participants } = await supabase
    .from("inter_club_participants")
    .select("accepted")
    .eq("event_id", eventId);

  const allAccepted = participants?.every((p: any) => p.accepted === true) || false;
  setEventAcceptanceStatus(prev => ({ ...prev, [eventId]: allAccepted }));
};


// Call this when opening event modal
const handleEventClick = async (event: Event) => {
  setSelectedEvent(event);
  await fetchEventParticipants(event.id);
  await checkEventAcceptance(event.id, event.event_type);
  await checkCanComplete(event); // ✅ Add this line
};

const fetchAllClubs = async () => {
  const { data } = await supabase
    .from("clubs")
    .select("id, name")
    .order("name");
  setAllClubs(data || []);
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


const fetchEventInvitations = async () => {
  if (!clubId) return;
  
  console.log("Fetching invitations for club:", clubId);
  
  // Get events where this club is invited but hasn't accepted yet
 const { data, error } = await supabase
  .from("inter_club_participants")
  .select(`
    event_id,
    club_id,
    accepted,
    events!inner(
      id,
      title,
      description,
      event_date,
      total_xp_pool,
      status,
      club_id,
      clubs!inner(name)
    )
  `)
  .eq("club_id", clubId)
  .neq("accepted", true)             // ✅ excludes NULL and false in a single filter
  .eq("events.status", "upcoming");


  if (error) {
    console.error("Error fetching invitations:", error);
    return;
  }

  console.log("Raw invitation data from DB:", data);
  console.log("Event invitations:", data);
  setEventInvitations(data || []);
};
 // ✅ Real-time subscription for event invitations
// ✅ Real-time subscription for event invitations
useEffect(() => {
  if (!clubId || userRole !== "admin") return;

  const channel = supabase
    .channel(`event-invitations-${clubId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inter_club_participants",
        filter: `club_id=eq.${clubId}`,
      },
      async () => {
        await fetchEventInvitations();
        await fetchEvents();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [clubId, userRole]);

// ADD THIS TO clubs/[id]/page.tsx

// ✅ Add this useEffect after the existing message subscription (around line 400)
// This subscribes to event status changes in real-time

useEffect(() => {
  if (!clubId) return;

  const channel = supabase
    .channel(`event-status-${clubId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "events",
        filter: `club_id=eq.${clubId}`,
      },
      async (payload) => {
        console.log("Event status changed:", payload);
        // Refresh events when any event is updated
        await fetchEvents();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [clubId]);

// ✅ Also subscribe to inter-club event status changes
useEffect(() => {
  if (!clubId) return;

  const channel = supabase
    .channel(`inter-event-status-${clubId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "inter_club_participants",
        filter: `club_id=eq.${clubId}`,
      },
      async (payload) => {
        console.log("Inter-club participant updated:", payload);
        // Refresh events when XP is awarded
        await fetchEvents();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    let mounted = true;

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
      await fetchAllClubs();

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
  await fetchEventInvitations(); // ✅ Add this line
} else {
  setRequests([]);
  setEventInvitations([]); // ✅ Add this line
}
      }
      if (mounted) setLoading(false);
    };

    load();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [clubId]);
  

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
    const approvedUser = requests.find(r => r.id === requestId);
    if (approvedUser?.profiles?.full_name) {
      await sendSystemMessage(`${approvedUser.profiles.full_name} joined the club`);
    }
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
  
  // Get user's name before promoting
  const targetMember = members.find(m => m.user_id === targetUserId);
  
  await supabase
    .from("club_members")
    .update({ role: "admin" })
    .eq("club_id", clubId)
    .eq("user_id", targetUserId);
  
  // Send system message
  if (targetMember?.profiles?.full_name) {
    await sendSystemMessage(`${targetMember.profiles.full_name} was promoted to admin`);
  }
  
  await fetchMembers();
};

const handleDemote = async (targetUserId: string) => {
  if (!clubId) return;
  
  // Get user's name before demoting
  const targetMember = members.find(m => m.user_id === targetUserId);
  
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
  
  // Send system message
  if (targetMember?.profiles?.full_name) {
    await sendSystemMessage(`${targetMember.profiles.full_name} was demoted to member`);
  }
  
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

   // Get user's name before removing
const targetMember = members.find(m => m.user_id === targetUserId);

await supabase
  .from("club_members")
  .delete()
  .eq("club_id", clubId)
  .eq("user_id", targetUserId);

toast.success("User removed ✅");

// Send system message
if (targetMember?.profiles?.full_name) {
  await sendSystemMessage(`${targetMember.profiles.full_name} was removed from the club`);
}

await fetchMembers();
  };

  const calculateXP = () => {
    if (eventType === "intra") {
      if (sizeCategory === "small") return 150;
      if (sizeCategory === "medium") return 300;
      if (sizeCategory === "large") return 600;
    } else if (eventType === "inter") {
    return (competingClubs.length + 1) * 100; 
    }
    return 0;
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

    const totalXP = calculateXP();

    const { data: newEvent, error } = await supabase.from("events").insert([
      {
        club_id: clubId,
        created_by: currentUserId,
        ...formData,
        event_type: eventType,
        size_category: eventType === "intra" ? sizeCategory : null,
        total_xp_pool: totalXP,
        status: "upcoming",
      },
    ]).select().single();

    if (error) {
      toast.error("❌ Error creating event");
      return;
    }

if (eventType === "inter" && newEvent) {
  const rows = [
    // creator’s club (auto-accepted)
    {
      event_id: newEvent.id,
      club_id: clubId,                 // <- creator
      position: null,
      xp_awarded: 0,
      accepted: true,
    },
    // invited clubs (pending)
    ...competingClubs.map((id) => ({
      event_id: newEvent.id,
      club_id: id,
      position: null,
      xp_awarded: 0,
      accepted: false,
    })),
  ];

  await supabase.from("inter_club_participants").insert(rows);
}


    toast.success("🎉 Event created");
    await sendSystemMessage(`New event created: ${formData.title} on ${new Date(formData.event_date).toLocaleDateString()}`);
    setShowCreateEventModal(false);
    setEventType("intra");
    setSizeCategory("");
    setCompetingClubs([]);
    await fetchEvents();
  };

  const handleParticipate = async (eventId: string) => {
    if (!currentUserId) {
      toast.error("You must be logged in to join.");
      return;
    }

    setParticipatingLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_event", {
        p_event_id: eventId,
        p_user_id: currentUserId,
      });

      if (error) {
        console.error("RPC error:", error);
        toast.error("Could not join event");
        setParticipatingLoading(false);
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        toast.error("Unexpected server response");
        setParticipatingLoading(false);
        return;
      }

      if (result.reason === "joined") {
        toast.success("✅ Joined event");
        const event = events.find(e => e.id === eventId);
        if (event) {
          await sendSystemMessage(`${currentUserId} joined event: ${event.title}`);
        }
        await fetchEventParticipants(eventId);
      } else if (result.reason === "already_joined") {
        toast("You already joined this event");
      } else if (result.reason === "full") {
        toast.error("Event is full");
      } else if (result.reason === "event_not_found") {
        toast.error("Event not found");
      } else {
        toast.error("Could not join event");
      }
    } catch (err) {
      console.error("Unexpected error joining event:", err);
      toast.error("Could not join event");
    } finally {
      setParticipatingLoading(false);
    }
  };

  const handleDitchEvent = async (eventId: string) => {
    if (!currentUserId) {
      toast.error("You must be logged in.");
      return;
    }

    setParticipatingLoading(true);
    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error ditching event:", error);
        toast.error("Could not leave event");
        return;
      }

      toast.success("👋 Left event");
      await fetchEventParticipants(eventId);
    } catch (err) {
      console.error("Unexpected error leaving event:", err);
      toast.error("Could not leave event");
    } finally {
      setParticipatingLoading(false);
    }
  };

  const fetchEventParticipants = async (eventId: string) => {
    const { data: participantData, error: participantError } = await supabase
      .from("event_participants")
      .select("user_id, joined_at")
      .eq("event_id", eventId);

    if (participantError) {
      console.error("Error fetching participants:", participantError);
      setParticipants([]);
      return;
    }

    if (!participantData || participantData.length === 0) {
      setParticipants([]);
      return;
    }

    const userIds = participantData.map(p => p.user_id);
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      setParticipants(participantData.map(p => ({
        user_id: p.user_id,
        joined_at: p.joined_at,
        profiles: null
      })));
      return;
    }

    const merged = participantData.map(p => ({
      user_id: p.user_id,
      joined_at: p.joined_at,
      profiles: profileData?.find(prof => prof.id === p.user_id) || null
    }));

    console.log("Fetched participants:", merged);
    setParticipants(merged);
  };

  useEffect(() => {
    if (!selectedEvent || !selectedEvent.id) return;

    const eventId = selectedEvent.id;

    const channel = supabase
      .channel(`event-participants-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: any) => {
          setParticipants((prev) => {
            if (prev.some((p: any) => p.user_id === payload.new.user_id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: any) => {
          setParticipants((prev) =>
            prev.filter((p: any) => p.user_id !== payload.old.user_id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setParticipants([]);
    };
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!clubId || events.length === 0) return;

    const channel = supabase
      .channel(`all-event-participants-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => {
          fetchAllEventParticipantCounts(events.map(e => e.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, events]);




const openCompleteModal = async (event: Event) => {
  setCompletingEvent(event);
  setResultsDescription("");
  setSelectedFiles([]);
  setClubPositions({});

  // Ensure creator club row exists (covers legacy events created before the fix)
if (event.event_type === "inter" && clubId) {
  await supabase
    .from("inter_club_participants")
    .upsert(
      { event_id: event.id, club_id: clubId, accepted: true, position: null, xp_awarded: 0 },
      { onConflict: "event_id,club_id" }
    );
}

  
  // ✅ If inter-club, fetch the competing clubs
  if (event.event_type === "inter") {
    const { data: participants } = await supabase
      .from("inter_club_participants")
      .select("club_id, clubs(id, name)")
      .eq("event_id", event.id);
    
    if (participants) {
      setCompetingClubsForEvent(participants.map((p: any) => ({
        id: p.club_id,
        name: p.clubs?.name || "Unknown Club"
      })));
    }
  } else {
    setCompetingClubsForEvent([]);
  }
  
  setShowCompleteModal(true);
};
  const handleCompleteEvent = async () => {
    if (!completingEvent || !currentUserId) return;

    // Upload photos
    const photoUrls: string[] = [];
    for (const file of selectedFiles) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("event-photos")
        .upload(fileName, file);

      if (error) {
        console.error("Error uploading photo:", error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("event-photos")
        .getPublicUrl(fileName);
      
      photoUrls.push(urlData.publicUrl);
    }

    // Update event
    const { error: updateError } = await supabase
      .from("events")
      .update({
        status: "pending",
        results_description: resultsDescription,
        proof_photos: photoUrls,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", completingEvent.id);

    if (updateError) {
      toast.error("Failed to submit event");
      return;
    }

 // If inter-club, update positions + XP distribution
// If inter-club, update positions + XP distribution
// If inter-club, update positions + XP distribution
if (completingEvent.event_type === "inter") {
  // 1) Save positions
  for (const [clubId, position] of Object.entries(clubPositions)) {
    await supabase
      .from("inter_club_participants")
      .update({ position })
      .eq("event_id", completingEvent.id)
      .eq("club_id", clubId);
  }

  // 2) Build the ranked list from the *assigned* positions only
  type Entry = { club_id: string; position: number };
  const entries: Entry[] = Object.entries(clubPositions)
    .map(([club_id, position]) => ({ club_id, position: Number(position) }))
    .filter(e => Number.isFinite(e.position)) // only clubs that got a position
    .sort((a, b) => a.position - b.position); // rank order: 1,2,3...

  // n = number of clubs actually ranked (what the creator assigned)
  const n = entries.length;

  // 3) XP pool = n * 100 (your rule)
  const pool = n * 100;

  // 4) Strictly-decreasing split that ALWAYS sums to pool
  //    Weight for rank r is proportional to (n - r + 1); sum of weights = n(n+1)/2
  //    points = pool * weight / totalWeights
  const totalWeights = (n * (n + 1)) / 2;

  const pointsByClub: Record<string, number> = {};
  let sum = 0;

  for (const e of entries) {
    const weight = n - e.position + 1; // n, n-1, ..., 1
    const pts = Math.round((pool * weight) / totalWeights);
    pointsByClub[e.club_id] = pts;
    sum += pts;
  }

  // 5) Fix rounding so total exactly equals pool (give diff to 1st place)
  const diff = pool - sum;
  if (entries.length > 0 && diff !== 0) {
    const firstClubId = entries[0].club_id;
    pointsByClub[firstClubId] = (pointsByClub[firstClubId] || 0) + diff;
  }

  // 6) Persist xp_awarded
  for (const e of entries) {
    await supabase
      .from("inter_club_participants")
      .update({ xp_awarded: pointsByClub[e.club_id] })
      .eq("event_id", completingEvent.id)
      .eq("club_id", e.club_id);
  }

  // (Optional) Keep the event's visible pool aligned with what you just distributed
  await supabase
    .from("events")
    .update({ total_xp_pool: pool })
    .eq("id", completingEvent.id);
}




    toast.success("✅ Event submitted for review!");
    await sendSystemMessage(`Event "${completingEvent.title}" submitted for review`);
    setShowCompleteModal(false);
    await fetchEvents();
  };

  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Upcoming</span>;
      case "pending":
        return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending Review</span>;
      case "approved":
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">✅ Approved</span>;
      case "rejected":
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">❌ Rejected</span>;
      default:
        return null;
    }
  };

 const canCompleteEvent = async (event: Event) => {
  const eventDate = new Date(event.event_date);
  const now = new Date();
  
  const isCreator = event.created_by === currentUserId;
  const isPastDate = eventDate < now;
  const isUpcoming = event.status === "upcoming";
  
  if (!isCreator || !isPastDate || !isUpcoming) {
    return false;
  }
  
  // ✅ For inter-club events, check if all clubs have accepted
  if (event.event_type === "inter") {
    const { data: participants, error } = await supabase
      .from("inter_club_participants")
      .select("accepted")
      .eq("event_id", event.id);
    
    if (error || !participants) return false;
    
    // All clubs must have accepted
    const allAccepted = participants.every((p: any) => p.accepted === true);
    return allAccepted;
  }
  
  return true;
};

// ===== Inter-club completion helpers (positions) =====
const totalClubsInModal =
  completingEvent && completingEvent.event_type === "inter"
    ? competingClubsForEvent.length
    : 0;

const assignedPositions = Object.values(clubPositions).filter(
  (v): v is number => typeof v === "number" && !isNaN(v)
);

const allAssigned =
  completingEvent?.event_type !== "inter" ||
  assignedPositions.length === totalClubsInModal;


const uniqueAssigned =
 new Set(assignedPositions).size === assignedPositions.length;



  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-x-hidden">
      <Toaster />
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-10 left-10 w-48 h-48 md:w-96 md:h-96 bg-purple-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-48 h-48 md:w-96 md:h-96 bg-pink-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-48 h-48 md:w-96 md:h-96 bg-cyan-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [-50, 50, -50],
          y: [-50, 50, -50],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-4 relative z-10">
        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col bg-black/40 backdrop-blur-xl lg:border-r border-white/10 lg:h-screen overflow-y-auto">
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
            {/* Club Logo */}
            <motion.div
              className="flex items-center justify-center py-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {club?.logo_url ? (
                <img
                  src={club.logo_url}
                  alt="Club Logo"
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-purple-500/30 shadow-lg shadow-purple-500/50"
                />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg border border-white/20 flex items-center justify-center text-2xl md:text-3xl">
                  🏅
                </div>
              )}
            </motion.div>

            {userRole === "admin" && (
              <motion.button
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
                        role: "member",
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
                  await sendSystemMessage(`Admin created a new invite link`);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Invite
              </motion.button>
            )}

            {/* Teammates Section */}
            <motion.div
              className="bg-black/40 backdrop-blur-xl rounded-lg lg:rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setShowTeammates(!showTeammates)}
                className="w-full flex justify-between items-center px-2 md:px-3 py-1.5 md:py-2 font-bold text-xs md:text-sm text-white hover:bg-white/5 transition-all"
              >
                <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-300 bg-clip-text text-transparent">
                  Teammates
                </span>
                <span className="text-white/60">{showTeammates ? "▲" : "▼"}</span>
              </button>
              <AnimatePresence>
                {showTeammates && (
                  <motion.div
                    className="max-h-60 md:max-h-72 overflow-y-auto px-2 md:px-3 py-1.5"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loading ? (
                      <p className="text-white/40 text-xs">Loading teammates...</p>
                    ) : members.length === 0 ? (
                      <p className="text-white/40 text-xs">No teammates found.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {members.map((m) => (
                          <motion.li
                            key={m.user_id}
                            className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-white/80 text-xs gap-1.5"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <span className="break-words">
                              {m.role === "admin" ? "👑 " : "👤 "}
                              {m.profiles?.full_name} (
                              {m.profiles?.enrollment_number})
                            </span>
                            {userRole === "admin" && (
                              <div className="flex gap-1 text-xs flex-wrap">
                                {m.role === "member" && (
                                  <motion.button
                                    onClick={() => handlePromote(m.user_id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:shadow-md hover:shadow-purple-500/50 transition-all whitespace-nowrap"
                                  >
                                    Promote
                                  </motion.button>
                                )}
                                {m.role === "admin" &&
                                  m.user_id !== currentUserId && (
                                    <motion.button
                                      onClick={() => handleDemote(m.user_id)}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className="px-1.5 py-0.5 bg-yellow-500 text-white rounded hover:shadow-md hover:shadow-yellow-500/50 transition-all whitespace-nowrap"
                                    >
                                      Demote
                                    </motion.button>
                                  )}
                                {m.user_id !== currentUserId && (
                                  <motion.button
                                    onClick={() => handleRemove(m.user_id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-1.5 py-0.5 bg-red-600 text-white rounded hover:shadow-md hover:shadow-red-500/50 transition-all whitespace-nowrap"
                                  >
                                    Remove
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

 {/* Active Events Section */}
<motion.div
  className="bg-black/40 backdrop-blur-xl rounded-lg lg:rounded-xl border border-white/10 hover:border-purple-500/30 transition-all flex flex-col overflow-hidden"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
>
  <button
    onClick={() => setShowEvents(!showEvents)}
    className="w-full flex justify-between items-center px-2 md:px-3 py-1.5 md:py-2 font-bold text-xs md:text-sm text-white hover:bg-white/5 transition-all"
  >
    <div className="flex items-center gap-2">
      <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
        Active Events
      </span>
      {activeEvents.length > 0 && (
        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
          {activeEvents.length}
        </span>
      )}
    </div>
    <span className="text-white/60">{showEvents ? "▲" : "▼"}</span>
  </button>
  <AnimatePresence>
    {showEvents && (
      <motion.div
        className="max-h-60 md:max-h-72 overflow-y-auto px-2 md:px-3 py-1.5"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeEvents.length === 0 ? (
          <p className="text-white/40 text-xs">No active events.</p>
        ) : (
          <ul className="space-y-1.5">
            {activeEvents.map((e) => (
              <motion.li
                key={e.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-white/80 cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-all gap-1.5"
                onClick={() => handleEventClick(e)}
                whileHover={{ scale: 1.02, x: 4 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="break-words">
                      📅 {e.title} – {new Date(e.event_date).toLocaleDateString()}
                    </span>
                    {getEventStatusBadge(e.status)}
                  </div>
                </div>
                <span className="text-xs text-white/60 font-semibold whitespace-nowrap">
                  {eventParticipantCounts[e.id] || 0}/{e.members_required}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>

            {/* Admin Panel */}
            {userRole === "admin" && (
              <motion.div
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-lg lg:rounded-xl border border-yellow-500/30 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex justify-between items-center px-2 md:px-3 py-1.5 md:py-2 font-bold text-xs md:text-sm text-white hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                      Admin Panel
                    </span>
                    {(eventInvitations.length > 0 || requests.length > 0) && (
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {eventInvitations.length + requests.length}
                      </span>
                    )}
                  </div>
                  <span className="text-white/60">{showHistory ? "▲" : "▼"}</span>
                </button>
                <AnimatePresence>
                {showHistory && (
                  <motion.div
                    className="px-2 md:px-3 py-1.5"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                {/* ✅ Event Invitations Section */}
{/* ✅ Event Invitations Section */}
{eventInvitations.length > 0 && (
  <>
    <h4 className="mt-2 font-semibold text-xs md:text-sm text-purple-300">Event Invitations</h4>
    <ul className="ml-1 mt-1.5 space-y-1.5">
     {eventInvitations.map((invitation: any) => {
  const isBusy = inviteActioning === invitation.event_id;
  return (
    <motion.li
      key={invitation.event_id}
      className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-white/80 opacity-100 bg-white/5 p-1.5 md:p-2 rounded-lg gap-1.5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className={`flex-1 ${isBusy ? "opacity-60" : ""}`}>
        <p className="font-semibold text-xs break-words">{invitation.events.title}</p>
        <p className="text-xs text-white/60 break-words">
          By: {invitation.events.clubs.name} •
          {new Date(invitation.events.event_date).toLocaleDateString()} •
          {invitation.events.total_xp_pool} XP
        </p>
      </div>
      <div className="flex gap-1 flex-wrap">
        <motion.button
          disabled={isBusy}
          whileHover={!isBusy ? { scale: 1.05 } : {}}
          whileTap={!isBusy ? { scale: 0.95 } : {}}
         onClick={async () => {
  setInviteActioning(invitation.event_id);

  // optimistic remove
  setEventInvitations(prev => prev.filter(i => i.event_id !== invitation.event_id));

  // attempt update and RETURN the row
  const { data: upd, error } = await supabase
    .from("inter_club_participants")
    .update({ accepted: true })
    .eq("event_id", invitation.event_id)
    .eq("club_id", clubId)
    .select("event_id, club_id, accepted")
    .single();

  if (error || !upd || upd.accepted !== true) {
    // rollback if update didn’t stick
    await fetchEventInvitations();
    setInviteActioning(null);

    // better error surface for RLS/incident/0 rows
    if (error) {
      console.error("Accept update failed:", error);
      toast.error(`Failed to accept challenge: ${error.message}`);
    } else {
      console.warn("Accept update matched no row or accepted still not true:", upd);
      toast.error("Failed to accept challenge (no matching row / RLS / backend issue).");
    }
    return;
  }

  toast.success("✅ Challenge accepted!");
  await sendSystemMessage(`Accepted inter-club event: ${invitation.events.title}`);
  // keep UI in sync
  await fetchEventInvitations();
  await fetchEvents();

  if (selectedEvent?.id === invitation.event_id) {
    const event = events.find(e => e.id === invitation.event_id);
    if (event) {
      await checkEventAcceptance(invitation.event_id, "inter");
      await checkCanComplete(event);
    }
  }

  setInviteActioning(null);
}}

          className={`px-3 py-1 rounded-lg text-xs font-semibold ${isBusy ? "bg-green-300/50" : "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-md hover:shadow-green-500/50"} text-white transition-all`}
        >
          {isBusy ? "Accepting..." : "Accept"}
        </motion.button>

        <motion.button
          disabled={isBusy}
          whileHover={!isBusy ? { scale: 1.05 } : {}}
          whileTap={!isBusy ? { scale: 0.95 } : {}}
          onClick={async () => {
            setInviteActioning(invitation.event_id);

            // ✅ optimistic remove from UI immediately
            setEventInvitations(prev => prev.filter(i => i.event_id !== invitation.event_id));

            const { error } = await supabase
              .from("inter_club_participants")
              .delete()
              .eq("event_id", invitation.event_id)
              .eq("club_id", clubId);

            if (error) {
              toast.error("Failed to decline challenge");
              // rollback if needed
              await fetchEventInvitations();
              setInviteActioning(null);
              return;
            }

            toast.success("❌ Challenge declined");
            await sendSystemMessage(`Declined inter-club event: ${invitation.events.title}`);
            await fetchEventInvitations();
            await fetchEvents();

            if (selectedEvent?.id === invitation.event_id) {
              setSelectedEvent(null);
            }

            setInviteActioning(null);
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold ${isBusy ? "bg-red-300/50" : "bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-md hover:shadow-red-500/50"} text-white transition-all`}
        >
          {isBusy ? "Declining..." : "Decline"}
        </motion.button>
      </div>
    </motion.li>
  );
})}

    </ul>
  </>
)}
                <h4 className="mt-2 font-semibold text-xs md:text-sm text-purple-300">Pending Requests</h4>
                {requests.length === 0 ? (
                  <p className="text-white/40 text-xs mt-1.5">No pending requests.</p>
                ) : (
                  <ul className="ml-1 mt-1.5 space-y-1.5">
                    {requests.map((r) => (
                      <motion.li
                        key={r.id}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-white/80 bg-white/5 p-1.5 md:p-2 rounded-lg gap-1.5"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <span className="text-xs break-words">
                          {r.profiles?.full_name
                            ? r.profiles.full_name
                            : `User: ${r.user_id}`}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          <motion.button
                            onClick={() => handleApprove(r.id, r.user_id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-xs font-semibold hover:shadow-md hover:shadow-green-500/50 transition-all whitespace-nowrap"
                          >
                            Approve
                          </motion.button>
                          <motion.button
                            onClick={() => handleReject(r.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded text-xs font-semibold hover:shadow-md hover:shadow-red-500/50 transition-all whitespace-nowrap"
                          >
                            Reject
                          </motion.button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            )}

          </div>

          {/* Leave Club Button */}
          <div className="p-2">
            <motion.button
              onClick={() => setShowLeaveModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
            >
              Leave Club
            </motion.button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-3 flex flex-col bg-black/30 backdrop-blur-xl lg:h-screen">
         <div className="p-3 md:p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
  <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
    <motion.button
      onClick={() => router.back()}
      aria-label="Go back"
      whileHover={{ scale: 1.05, x: -4 }}
      whileTap={{ scale: 0.95 }}
      className="px-2 py-1 text-xs md:text-sm bg-white/10 backdrop-blur-lg rounded-lg hover:bg-white/20 transition-all text-white whitespace-nowrap"
    >
      ← Back
    </motion.button>

    <div className="flex-1">
      <h1 className="text-sm md:text-base font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent break-words">{club?.name}</h1>
      <p className="text-white/60 text-xs break-words line-clamp-1">{club?.description}</p>
    </div>
  </div>

  <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto justify-end">
    <motion.button
      onClick={() => router.push(`/clubs/${clubId}/profile`)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all whitespace-nowrap"
    >
      📋 Profile
    </motion.button>
    <h2 className="text-xs md:text-sm font-semibold text-white/80 hidden lg:block">Team Chat</h2>
  </div>
</div>

          <div className="flex-1 overflow-y-auto mb-2 p-2 bg-black/20 rounded-lg border border-white/10 m-2 md:m-3 min-h-[200px] lg:min-h-0">
            {messages.length === 0 ? (
              <p className="text-white/40 text-xs">No messages yet.</p>
            ) : (
              <ul className="space-y-1.5 md:space-y-2">
                {messages.map((msg, idx) => (
                  <motion.li
                    key={msg.id}
                    className="text-white/80 bg-white/5 p-1.5 md:p-2 rounded-lg backdrop-blur-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <span className="font-semibold text-xs bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent break-words">
                      {msg.profiles?.full_name || "Unknown"}
                    </span>
                    : <span className="text-white/90 text-xs break-words">{msg.content}</span>
                    <span className="text-xs text-white/40 ml-1 whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-2 md:p-3 border-t border-white/10 flex gap-1.5">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <motion.button
              onClick={sendMessage}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all whitespace-nowrap"
            >
              Send
            </motion.button>
          </div>
        </div>
      </div>

      {/* Floating Create Event Button */}
      {userRole === "admin" && (
        <motion.button
          onClick={() => setShowCreateEventModal(true)}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-4 right-4 md:bottom-6 md:left-6 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-3xl md:text-4xl shadow-2xl shadow-purple-500/50 flex items-center justify-center z-50"
        >
          +
        </motion.button>
      )}

      {/* Event Details Modal */}
      <AnimatePresence>
      {selectedEvent && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-black/80 backdrop-blur-2xl border border-white/20 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <h3 className="text-lg md:text-xl font-bold mb-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent break-words">{selectedEvent?.title}</h3>
            {selectedEvent?.description && (
              <p className="text-white/70 text-sm md:text-base mb-3 break-words">{selectedEvent.description}</p>
            )}
            <div className="space-y-2 mb-3">
              <p className="text-xs md:text-sm text-white/80 break-words">
                📅{" "}
                {selectedEvent?.event_date
                  ? new Date(selectedEvent.event_date).toLocaleString()
                  : ""}
              </p>
              <p className="text-xs md:text-sm text-white/80 break-words">📍 {selectedEvent?.place || "TBD"}</p>
              <p className="text-xs md:text-sm text-white/90 font-semibold">
                🎯 {participants.length}/{selectedEvent?.members_required} slots filled
              </p>
              <p className="text-xs md:text-sm text-white/80">⭐ {selectedEvent?.total_xp_pool} XP</p>
              <div>{getEventStatusBadge(selectedEvent.status)}</div>
            </div>

            {/* Show results if approved */}
            {selectedEvent.status === "approved" && selectedEvent.results_description && (
              <div className="mb-3 p-2 md:p-3 bg-green-500/20 backdrop-blur-lg rounded-xl border border-green-500/30">
                <h4 className="font-semibold text-sm md:text-base text-green-300 mb-2">Event Results</h4>
                <p className="text-xs md:text-sm text-white/70 break-words">{selectedEvent.results_description}</p>
              </div>
            )}

            {/* Show rejection reason if rejected */}
            {selectedEvent.status === "rejected" && (
              <div className="mb-3 p-2 md:p-3 bg-red-500/20 backdrop-blur-lg rounded-xl border border-red-500/30">
                <h4 className="font-semibold text-sm md:text-base text-red-300 mb-2">Event Rejected</h4>
                <p className="text-xs md:text-sm text-white/70">This event did not meet approval criteria.</p>
              </div>
            )}


            {/* Show photos if available */}
            {selectedEvent.proof_photos && selectedEvent.proof_photos.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm md:text-base text-white/90 mb-2">Event Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedEvent.proof_photos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Event photo ${idx + 1}`}
                      className="w-full h-20 md:h-24 object-cover rounded-xl border border-white/20"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show participants list */}
            {participants.length > 0 && (
              <div className="mt-3 mb-3 max-h-32 md:max-h-40 overflow-y-auto bg-white/5 backdrop-blur-lg p-2 md:p-3 rounded-xl border border-white/10">
                <p className="text-xs font-semibold text-white/70 mb-2">Participants:</p>
                <ul className="text-xs text-white/80 space-y-1">
                  {participants.map((p: any) => (
                    <li key={p.user_id} className="break-words">
                      • {p.profiles?.full_name || "Unknown"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
              <motion.button
                onClick={() => setSelectedEvent(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm md:text-base bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Close
              </motion.button>
{canComplete[selectedEvent.id] && eventAcceptanceStatus[selectedEvent.id] && (
  <motion.button
    onClick={() => openCompleteModal(selectedEvent)}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="px-4 py-2 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
  >
    Complete Event
  </motion.button>
)}

{selectedEvent.event_type === "inter" && !eventAcceptanceStatus[selectedEvent.id] && (
  <button
    disabled
    className="px-4 py-2 text-sm md:text-base bg-white/10 text-white/40 rounded-xl cursor-not-allowed"
    title="Waiting for all clubs to accept this challenge"
  >
    ⏳ Waiting for Clubs
  </button>
)}
              {selectedEvent.status === "upcoming" && (() => {
                const participantCount = participants?.length ?? 0;
                const capacity = selectedEvent?.members_required ?? 0;
                const isFull = participantCount >= capacity;
                const alreadyJoined = participants?.some((p: any) => p.user_id === currentUserId);

                if (alreadyJoined) {
                  return (
                    <motion.button
                      onClick={() => selectedEvent && handleDitchEvent(selectedEvent.id)}
                      whileHover={!participatingLoading ? { scale: 1.05 } : {}}
                      whileTap={!participatingLoading ? { scale: 0.95 } : {}}
                      className={`px-4 py-2 text-sm md:text-base bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all ${participatingLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      disabled={participatingLoading}
                    >
                      {participatingLoading ? "Leaving..." : "Ditch Event"}
                    </motion.button>
                  );
                }

                if (isFull) {
                  return (
                    <button
                      disabled
                      className="px-4 py-2 text-sm md:text-base bg-white/10 text-white/40 rounded-xl cursor-not-allowed"
                    >
                      Full
                    </button>
                  );
                }

                return (
                  <motion.button
                    onClick={() => selectedEvent && handleParticipate(selectedEvent.id)}
                    whileHover={!participatingLoading ? { scale: 1.05 } : {}}
                    whileTap={!participatingLoading ? { scale: 0.95 } : {}}
                    className={`px-4 py-2 text-sm md:text-base bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all ${participatingLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={participatingLoading}
                  >
                    {participatingLoading ? "Joining..." : "Participate"}
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
      {showCreateEventModal && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-black/80 backdrop-blur-2xl border border-white/20 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <h3 className="text-base md:text-lg font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">Create Event</h3>
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
                  xp_points: calculateXP(),
                  place: (e.target as any).place.value,
                };
                await handleCreateEvent(formData);
              }}
              className="space-y-3"
            >
              {/* Event Type */}
              <div>
                <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">Event Type</label>
                <div className="flex gap-3 md:gap-4">
                  <label className="flex items-center text-xs md:text-sm text-white/80 cursor-pointer">
                    <input
                      type="radio"
                      value="intra"
                      checked={eventType === "intra"}
                      onChange={() => setEventType("intra")}
                      className="mr-2 accent-purple-500"
                    />
                    🟢 Intra-club
                  </label>
                  <label className="flex items-center text-xs md:text-sm text-white/80 cursor-pointer">
                    <input
                      type="radio"
                      value="inter"
                      checked={eventType === "inter"}
                      onChange={() => setEventType("inter")}
                      className="mr-2 accent-purple-500"
                    />
                    🔵 Inter-club
                  </label>
                </div>
              </div>

              {/* Size Category for Intra */}
              {eventType === "intra" && (
                <div>
                  <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">Event Size</label>
                  <select
                    value={sizeCategory}
                    onChange={(e) => setSizeCategory(e.target.value)}
                    className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    required
                  >
                    <option value="" className="bg-slate-900">Select size</option>
                    <option value="small" className="bg-slate-900">Small (50-60 people) - 150 XP</option>
                    <option value="medium" className="bg-slate-900">Medium (90-150 people) - 300 XP</option>
                    <option value="large" className="bg-slate-900">Large (150+ people) - 600 XP</option>
                  </select>
                </div>
              )}

              {/* Competing Clubs for Inter */}
              {eventType === "inter" && (
                <div>
                  <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">
                    Competing Clubs (100 XP per club)
                  </label>
                  <select
                    multiple
                    value={competingClubs}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setCompetingClubs(selected);
                    }}
                    className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white h-32 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    required
                  >
                    {allClubs.filter(c => c.id !== clubId).map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-white/60 mt-1">
                    Hold Ctrl/Cmd to select multiple. Total XP: {calculateXP()}
                  </p>
                </div>
              )}

              <input
                name="title"
                placeholder="Event Title"
                className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              />
              <textarea
                name="description"
                placeholder="Description"
                className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <input
                type="datetime-local"
                name="event_date"
                className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              />
              <input
                type="number"
                name="members_required"
                placeholder="Slots required"
                className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                min="1"
                required
              />
              <input
                name="place"
                placeholder="Event Place"
                className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />

              <div className="bg-purple-500/20 backdrop-blur-lg p-2 md:p-3 rounded-xl border border-purple-500/30">
                <p className="text-xs md:text-sm font-semibold text-purple-200">
                  Total XP for this event: {calculateXP()}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <motion.button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm md:text-base bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Create
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Complete Event Modal */}
<AnimatePresence>
{showCompleteModal && completingEvent && (
  <motion.div
    className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="bg-black/80 backdrop-blur-2xl border border-white/20 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
    >
      <h3 className="text-base md:text-lg font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent break-words">Complete Event: {completingEvent.title}</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">What happened?</label>
          <textarea
            value={resultsDescription}
            onChange={(e) => setResultsDescription(e.target.value)}
            placeholder="Describe the event results..."
            className="w-full p-2 md:p-3 text-sm md:text-base bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-white/40 h-24 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            required
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">Upload Photos (proof)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            className="w-full p-2 md:p-3 text-xs md:text-sm bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white file:text-xs md:file:text-sm file:cursor-pointer hover:file:bg-purple-600"
          />
          <p className="text-xs text-white/60 mt-1">
            {selectedFiles.length} photo(s) selected
          </p>
        </div>

    {/* ✅ If inter-club, show competing clubs (dynamic positions + no duplicates) */}
{completingEvent.event_type === "inter" && competingClubsForEvent.length > 0 && (
  <div>
    <label className="block text-xs md:text-sm font-semibold mb-2 text-white/80">Competition Results</label>
    <p className="text-xs text-white/60 mb-2">
      Assign unique positions to each club:
    </p>

    {/* Make number of position options = number of clubs */}
    {(() => {
      const totalClubs = competingClubsForEvent.length;
      const positionOptions = Array.from({ length: totalClubs }, (_, i) => i + 1);
      const usedPositions = new Set(
        Object.values(clubPositions).filter(
          (v): v is number => typeof v === "number" && !isNaN(v)
        )
      );

      return (
        <>
          {competingClubsForEvent.map((club) => (
            <div
              key={club.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-2 md:p-3 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10"
            >
              <span className="text-xs md:text-sm flex-1 font-medium text-white/90 break-words">{club.name}</span>
              <select
                value={clubPositions[club.id] ?? ""}
                onChange={(e) =>
                  setClubPositions((prev) => ({
                    ...prev,
                    [club.id]: Number(e.target.value),
                  }))
                }
                className="p-2 text-xs md:text-sm bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              >
                <option value="" className="bg-slate-900">Select position</option>
                {positionOptions.map((pos) => (
                  <option
                    key={pos}
                    value={pos}
                    className="bg-slate-900"
                    // disable a position if already used by another club
                    disabled={usedPositions.has(pos) && clubPositions[club.id] !== pos}
                  >
                    {pos === 1 ? "🥇 " : pos === 2 ? "🥈 " : pos === 3 ? "🥉 " : ""}
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Helper message if something is missing or duplicated */}
          {(!allAssigned || !uniqueAssigned) && (
            <p className="text-xs text-red-400 mt-1">
              Assign a unique position to each club (1 to {totalClubs}).
            </p>
          )}
        </>
      );
    })()}
  </div>
)}


        <div className="bg-yellow-500/20 backdrop-blur-lg p-2 md:p-3 rounded-xl border border-yellow-500/30">
          <p className="text-xs text-yellow-200">
            ℹ️ After submission, this event will be reviewed by platform admins.
            XP will be awarded upon approval.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <motion.button
            onClick={() => setShowCompleteModal(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 text-sm md:text-base bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 transition-all"
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={handleCompleteEvent}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
  !resultsDescription ||
  selectedFiles.length === 0 ||
  (completingEvent.event_type === "inter" && (!allAssigned || !uniqueAssigned))
}

          >
            Submit for Review
          </motion.button>
        </div>
      </div>
    </motion.div>
  </motion.div>
)}
</AnimatePresence>
      {/* Leave Confirmation Modal */}
      <AnimatePresence>
      {showLeaveModal && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-black/80 backdrop-blur-2xl border border-white/20 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <h3 className="text-base md:text-lg font-bold mb-4 bg-gradient-to-r from-white via-red-200 to-rose-200 bg-clip-text text-transparent">Leave Club</h3>
            <p className="mb-4 text-xs md:text-sm text-white/70">
              Are you sure you want to leave this club? You'll lose access to
              teammates, chat, and events.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <motion.button
                onClick={() => setShowLeaveModal(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm md:text-base bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleLeaveClub}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm md:text-base bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
              >
                Leave
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}