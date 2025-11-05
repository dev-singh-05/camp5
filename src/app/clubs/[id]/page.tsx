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
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, event_date, members_required, xp_points, place, created_by, event_type, size_category, total_xp_pool, status, results_description, proof_photos"
      )
      .eq("club_id", clubId)
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Error fetching events");
      return;
    }
    setEvents(data || []);
    
    if (data && data.length > 0) {
      fetchAllEventParticipantCounts(data.map(e => e.id));
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
if (completingEvent.event_type === "inter") {
  // 1) Save positions
  for (const [clubId, position] of Object.entries(clubPositions)) {
    await supabase
      .from("inter_club_participants")
      .update({ position })
      .eq("event_id", completingEvent.id)
      .eq("club_id", clubId);
  }

  // 2) Compute XP pool and split by rank (strictly decreasing)
  // n = number of clubs (includes your club; you already loaded these for the modal)
  const n = competingClubsForEvent.length;
  const pool = n * 100;

  // Formula: points for rank r = round( 200 * (n - r + 1) / (n + 1) )
  // This gives strictly decreasing values and sums ~ pool.
  // We'll adjust any rounding remainder to 1st place.
  type Entry = { club_id: string; position: number };
  const entries: Entry[] = Object.entries(clubPositions)
    .map(([club_id, position]) => ({ club_id, position: Number(position) }))
    .sort((a, b) => a.position - b.position); // rank order: 1,2,3...

  const pointsByClub: Record<string, number> = {};
  let sum = 0;

  for (const e of entries) {
    const r = e.position; // 1-based rank
    const pts = Math.round((200 * (n - r + 1)) / (n + 1));
    pointsByClub[e.club_id] = pts;
    sum += pts;
  }

  // Fix rounding so total exactly equals pool (add diff to 1st place)
  const diff = pool - sum;
  if (entries.length > 0 && diff !== 0) {
    const firstClubId = entries[0].club_id;
    pointsByClub[firstClubId] = (pointsByClub[firstClubId] || 0) + diff;
  }

  // 3) Persist xp_awarded
  for (const e of entries) {
    await supabase
      .from("inter_club_participants")
      .update({ xp_awarded: pointsByClub[e.club_id] })
      .eq("event_id", completingEvent.id)
      .eq("club_id", e.club_id);
  }
}


    toast.success("✅ Event submitted for review!");
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
  onClick={() => handleEventClick(e)} // ✅ Use new handler
>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>
                                📅 {e.title} – {new Date(e.event_date).toLocaleDateString()}
                              </span>
                              {getEventStatusBadge(e.status)}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 font-semibold">
                            {eventParticipantCounts[e.id] || 0}/{e.members_required}
                          </span>
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
                {/* ✅ Event Invitations Section */}
{/* ✅ Event Invitations Section */}
{eventInvitations.length > 0 && (
  <>
    <h4 className="mt-3 font-semibold text-indigo-700">Event Invitations</h4>
    <ul className="list-disc ml-6 mt-2 space-y-2">
     // In the invitations list render:
{eventInvitations.map((invitation: any) => {
  const isBusy = inviteActioning === invitation.event_id;
  return (
    <li key={invitation.event_id} className="flex justify-between items-center text-gray-700 opacity-100">
      <div className={isBusy ? "opacity-60" : ""}>
        <p className="font-semibold">{invitation.events.title}</p>
        <p className="text-xs text-gray-500">
          By: {invitation.events.clubs.name} •
          {new Date(invitation.events.event_date).toLocaleDateString()} •
          {invitation.events.total_xp_pool} XP
        </p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={isBusy}
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

          className={`px-2 py-1 rounded text-sm ${isBusy ? "bg-green-300" : "bg-green-600 hover:bg-green-700"} text-white`}
        >
          {isBusy ? "Accepting..." : "Accept"}
        </button>

        <button
          disabled={isBusy}
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
            await fetchEventInvitations();
            await fetchEvents();

            if (selectedEvent?.id === invitation.event_id) {
              setSelectedEvent(null);
            }

            setInviteActioning(null);
          }}
          className={`px-2 py-1 rounded text-sm ${isBusy ? "bg-red-300" : "bg-red-600 hover:bg-red-700"} text-white`}
        >
          {isBusy ? "Declining..." : "Decline"}
        </button>
      </div>
    </li>
  );
})}

    </ul>
  </>
)}
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
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                ← Back
              </button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">{club?.name}</h1>
                <p className="text-gray-600">{club?.description}</p>
              </div>
            </div>

            <h2 className="text-md font-semibold text-gray-700 mt-2 hidden md:block">Team Chat</h2>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-3">{selectedEvent?.title}</h3>
            {selectedEvent?.description && (
              <p className="text-gray-600 mb-3">{selectedEvent.description}</p>
            )}
            <div className="space-y-1 mb-3">
              <p className="text-sm text-gray-700">
                📅{" "}
                {selectedEvent?.event_date
                  ? new Date(selectedEvent.event_date).toLocaleString()
                  : ""}
              </p>
              <p className="text-sm text-gray-700">📍 {selectedEvent?.place || "TBD"}</p>
              <p className="text-sm text-gray-700 font-semibold">
                🎯 {participants.length}/{selectedEvent?.members_required} slots filled
              </p>
              <p className="text-sm text-gray-700">⭐ {selectedEvent?.total_xp_pool} XP</p>
              <div>{getEventStatusBadge(selectedEvent.status)}</div>
            </div>

            {/* Show results if approved */}
            {selectedEvent.status === "approved" && selectedEvent.results_description && (
              <div className="mb-3 p-3 bg-green-50 rounded border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Event Results</h4>
                <p className="text-sm text-gray-700">{selectedEvent.results_description}</p>
              </div>
            )}

            {/* Show rejection reason if rejected */}
            {selectedEvent.status === "rejected" && (
              <div className="mb-3 p-3 bg-red-50 rounded border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">Event Rejected</h4>
                <p className="text-sm text-gray-700">This event did not meet approval criteria.</p>
              </div>
            )}


            {/* Show photos if available */}
            {selectedEvent.proof_photos && selectedEvent.proof_photos.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-gray-700 mb-2">Event Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedEvent.proof_photos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Event photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show participants list */}
            {participants.length > 0 && (
              <div className="mt-3 mb-3 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border">
                <p className="text-xs font-semibold text-gray-600 mb-1">Participants:</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  {participants.map((p: any) => (
                    <li key={p.user_id}>
                      • {p.profiles?.full_name || "Unknown"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between mt-4 gap-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
{canComplete[selectedEvent.id] && eventAcceptanceStatus[selectedEvent.id] && (
  <button
    onClick={() => openCompleteModal(selectedEvent)}
    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
  >
    Complete Event
  </button>
)}

{selectedEvent.event_type === "inter" && !eventAcceptanceStatus[selectedEvent.id] && (
  <button
    disabled
    className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
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
                    <button
                      onClick={() => selectedEvent && handleDitchEvent(selectedEvent.id)}
                      className={`px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 ${participatingLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      disabled={participatingLoading}
                    >
                      {participatingLoading ? "Leaving..." : "Ditch Event"}
                    </button>
                  );
                }

                if (isFull) {
                  return (
                    <button
                      disabled
                      className="px-4 py-2 bg-red-400 text-white rounded cursor-not-allowed"
                    >
                      Full
                    </button>
                  );
                }

                return (
                  <button
                    onClick={() => selectedEvent && handleParticipate(selectedEvent.id)}
                    className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${participatingLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={participatingLoading}
                  >
                    {participatingLoading ? "Joining..." : "Participate"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  xp_points: calculateXP(),
                  place: (e.target as any).place.value,
                };
                await handleCreateEvent(formData);
              }}
              className="space-y-3"
            >
              {/* Event Type */}
              <div>
                <label className="block text-sm font-semibold mb-2">Event Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="intra"
                      checked={eventType === "intra"}
                      onChange={() => setEventType("intra")}
                      className="mr-2"
                    />
                    🟢 Intra-club
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="inter"
                      checked={eventType === "inter"}
                      onChange={() => setEventType("inter")}
                      className="mr-2"
                    />
                    🔵 Inter-club
                  </label>
                </div>
              </div>

              {/* Size Category for Intra */}
              {eventType === "intra" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Event Size</label>
                  <select
                    value={sizeCategory}
                    onChange={(e) => setSizeCategory(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select size</option>
                    <option value="small">Small (50-60 people) - 150 XP</option>
                    <option value="medium">Medium (90-150 people) - 300 XP</option>
                    <option value="large">Large (150+ people) - 600 XP</option>
                  </select>
                </div>
              )}

              {/* Competing Clubs for Inter */}
              {eventType === "inter" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Competing Clubs (100 XP per club)
                  </label>
                  <select
                    multiple
                    value={competingClubs}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setCompetingClubs(selected);
                    }}
                    className="w-full p-2 border rounded h-32"
                    required
                  >
                    {allClubs.filter(c => c.id !== clubId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Hold Ctrl/Cmd to select multiple. Total XP: {calculateXP()}
                  </p>
                </div>
              )}

              <input
                name="title"
                placeholder="Event Title"
                className="w-full p-2 border rounded"
                required
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
                required
              />
              <input
                type="number"
                name="members_required"
                placeholder="Slots required"
                className="w-full p-2 border rounded"
                min="1"
                required
              />
              <input
                name="place"
                placeholder="Event Place"
                className="w-full p-2 border rounded"
              />

              <div className="bg-indigo-50 p-3 rounded">
                <p className="text-sm font-semibold text-indigo-800">
                  Total XP for this event: {calculateXP()}
                </p>
              </div>

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

      {/* Complete Event Modal */}
{showCompleteModal && completingEvent && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">Complete Event: {completingEvent.title}</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold mb-2">What happened?</label>
          <textarea
            value={resultsDescription}
            onChange={(e) => setResultsDescription(e.target.value)}
            placeholder="Describe the event results..."
            className="w-full p-2 border rounded h-24"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Upload Photos (proof)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            {selectedFiles.length} photo(s) selected
          </p>
        </div>

    {/* ✅ If inter-club, show competing clubs (dynamic positions + no duplicates) */}
{completingEvent.event_type === "inter" && competingClubsForEvent.length > 0 && (
  <div>
    <label className="block text-sm font-semibold mb-2">Competition Results</label>
    <p className="text-xs text-gray-500 mb-2">
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
              className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded"
            >
              <span className="text-sm flex-1 font-medium">{club.name}</span>
              <select
                value={clubPositions[club.id] ?? ""}
                onChange={(e) =>
                  setClubPositions((prev) => ({
                    ...prev,
                    [club.id]: Number(e.target.value),
                  }))
                }
                className="p-2 border rounded text-sm"
                required
              >
                <option value="">Select position</option>
                {positionOptions.map((pos) => (
                  <option
                    key={pos}
                    value={pos}
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
            <p className="text-xs text-red-600 mt-1">
              Assign a unique position to each club (1 to {totalClubs}).
            </p>
          )}
        </>
      );
    })()}
  </div>
)}


        <div className="bg-yellow-50 p-3 rounded">
          <p className="text-xs text-yellow-800">
            ℹ️ After submission, this event will be reviewed by platform admins.
            XP will be awarded upon approval.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowCompleteModal(false)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleCompleteEvent}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            disabled={
  !resultsDescription ||
  selectedFiles.length === 0 ||
  (completingEvent.event_type === "inter" && (!allAssigned || !uniqueAssigned))
}

          >
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Leave Club</h3>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to leave this club? You'll lose access to
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