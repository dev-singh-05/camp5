import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Share,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from '@react-native-picker/picker';
import {
  ChevronLeft,
  Users,
  Calendar,
  Trophy,
  Send,
  Plus,
  X,
  Check,
  Clock,
  Settings,
  LogOut,
  MessageCircle,
  Activity,
  Upload,
  CheckCircle,
  Image as ImageIcon,
  User,
  UserPlus,
  Copy,
} from "lucide-react-native";
import { supabase } from "../../utils/supabaseClient";
import Toast from "react-native-toast-message";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

type Member = {
  user_id: string;
  role: string | null;
  profiles: {
    full_name: string;
    enrollment_number: string;
  } | null;
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

export default function ClubDetails() {
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<"chat" | "events" | "members">("chat");
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventInvitations, setEventInvitations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [eventParticipantCounts, setEventParticipantCounts] = useState<Record<string, number>>({});

  // Complete event states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<Event | null>(null);
  const [resultsDescription, setResultsDescription] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [clubPositions, setClubPositions] = useState<Record<string, number>>({});
  const [competingClubsForEvent, setCompetingClubsForEvent] = useState<any[]>([]);
  const [canComplete, setCanComplete] = useState<Record<string, boolean>>({});

  // Event form states
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventPlace, setEventPlace] = useState("");
  const [membersRequired, setMembersRequired] = useState("");
  const [xpPoints, setXpPoints] = useState("");
  const [eventType, setEventType] = useState<"intra" | "inter">("intra");
  const [sizeCategory, setSizeCategory] = useState("");
  const [competingClubs, setCompetingClubs] = useState<string[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
    setupRealtimeSubscriptions();
  }, [clubId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({ type: "error", text1: "Please login first" });
        router.back();
        return;
      }
      setCurrentUserId(user.id);

      await Promise.all([
        fetchClub(),
        fetchMembers(),
        fetchEvents(),
        fetchMessages(),
        fetchUserRole(user.id),
        fetchEventInvitations(),
        fetchRequests(),
        fetchAllClubs(),
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function fetchClub() {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();
    if (error) throw error;
    setClub(data);
  }

  async function fetchMembers() {
    const { data, error } = await supabase
      .from("club_members")
      .select("user_id, role, profiles(full_name, enrollment_number)")
      .eq("club_id", clubId);
    if (error) throw error;
    setMembers(data || []);
  }

  async function fetchEvents() {
    const { data: ownEvents, error: ownError } = await supabase
      .from("events")
      .select("*")
      .eq("club_id", clubId)
      .order("event_date", { ascending: true });

    const { data: acceptedInterEvents, error: interError } = await supabase
      .from("inter_club_participants")
      .select(`
        event_id,
        events!inner(
          id, title, description, event_date, members_required, xp_points,
          place, created_by, event_type, size_category, total_xp_pool, status,
          results_description, proof_photos
        )
      `)
      .eq("club_id", clubId)
      .eq("accepted", true);

    const allEvents = [
      ...(ownEvents || []),
      ...(acceptedInterEvents || []).map((item: any) => item.events)
    ];

    const uniqueEvents = Array.from(
      new Map(allEvents.map(event => [event.id, event])).values()
    );

    uniqueEvents.sort((a: any, b: any) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    setEvents(uniqueEvents as Event[]);

    if (uniqueEvents.length > 0) {
      await fetchAllEventParticipantCounts(uniqueEvents.map((e: any) => e.id));
      // Check which events can be completed
      for (const event of uniqueEvents as Event[]) {
        const canComp = await canCompleteEvent(event);
        setCanComplete(prev => ({ ...prev, [event.id]: canComp }));
      }
    }
  }

  async function fetchAllEventParticipantCounts(eventIds: string[]) {
    const counts: Record<string, number> = {};
    for (const eventId of eventIds) {
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      counts[eventId] = count || 0;
    }
    setEventParticipantCounts(counts);
  }

  async function canCompleteEvent(event: Event): Promise<boolean> {
    const eventDate = new Date(event.event_date);
    const now = new Date();

    const isCreator = event.created_by === currentUserId;
    const isPastDate = eventDate < now;
    const isUpcoming = event.status === "upcoming";

    if (!isCreator || !isPastDate || !isUpcoming) {
      return false;
    }

    if (event.event_type === "inter") {
      const { data: participants, error } = await supabase
        .from("inter_club_participants")
        .select("accepted")
        .eq("event_id", event.id);

      if (error || !participants) return false;
      const allAccepted = participants.every((p: any) => p.accepted === true);
      return allAccepted;
    }

    return true;
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, created_at, user_id, profiles(full_name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data || []);
  }

  async function fetchUserRole(userId: string) {
    const { data, error } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .single();
    if (!error && data) setUserRole(data.role);
  }

  async function fetchEventInvitations() {
    if (!clubId) return;

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
      .eq("accepted", false)
      .eq("events.status", "upcoming");

    if (!error) {
      setEventInvitations(data || []);
    }
  }

  async function fetchRequests() {
    const { data, error } = await supabase
      .from("club_requests")
      .select("id, user_id, status, requested_at, profiles(full_name, enrollment_number)")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });
    if (!error) setRequests(data || []);
  }

  async function fetchAllClubs() {
    const { data } = await supabase
      .from("clubs")
      .select("id, name")
      .order("name");
    setAllClubs(data || []);
  }

  async function fetchEventParticipants(eventId: string) {
    const { data: participantData } = await supabase
      .from("event_participants")
      .select("user_id, joined_at")
      .eq("event_id", eventId);

    if (!participantData || participantData.length === 0) {
      setParticipants([]);
      return;
    }

    const userIds = participantData.map(p => p.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const merged = participantData.map(p => ({
      user_id: p.user_id,
      joined_at: p.joined_at,
      profiles: profileData?.find((prof: any) => prof.id === p.user_id) || null
    }));

    setParticipants(merged);
  }

  function setupRealtimeSubscriptions() {
    const messagesChannel = supabase
      .channel(`messages-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `club_id=eq.${clubId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`events-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `club_id=eq.${clubId}`,
        },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(eventsChannel);
    };
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId || !clubId) return;

    const { error } = await supabase.from("messages").insert([
      {
        club_id: clubId,
        user_id: currentUserId,
        content: newMessage.trim(),
      },
    ]);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to send message" });
      return;
    }

    setNewMessage("");
  }

  async function sendSystemMessage(content: string) {
    if (!clubId || !currentUserId) return;

    await supabase.from("messages").insert([{
      club_id: clubId,
      user_id: currentUserId,
      content: `🔔 SYSTEM: ${content}`
    }]);
  }

  async function handleCreateEvent() {
    if (!eventTitle || !eventDate || !membersRequired || !xpPoints) {
      Toast.show({ type: "error", text1: "Please fill all required fields" });
      return;
    }

    const totalXP = eventType === "inter"
      ? (competingClubs.length + 1) * 100
      : calculateIntraXP(sizeCategory);

    const eventData: any = {
      club_id: clubId,
      title: eventTitle,
      description: eventDescription,
      event_date: eventDate,
      place: eventPlace,
      members_required: parseInt(membersRequired),
      xp_points: parseInt(xpPoints),
      created_by: currentUserId,
      event_type: eventType,
      status: "upcoming",
      total_xp_pool: totalXP,
    };

    if (eventType === "intra") {
      eventData.size_category = sizeCategory;
    }

    const { data: newEvent, error } = await supabase
      .from("events")
      .insert([eventData])
      .select()
      .single();

    if (error) {
      Toast.show({ type: "error", text1: "Failed to create event" });
      return;
    }

    if (eventType === "inter" && newEvent) {
      const participants = [
        { event_id: newEvent.id, club_id: clubId, accepted: true, position: null, xp_awarded: 0 },
        ...competingClubs.map(cid => ({
          event_id: newEvent.id,
          club_id: cid,
          accepted: false,
          position: null,
          xp_awarded: 0,
        })),
      ];

      await supabase.from("inter_club_participants").insert(participants);
    }

    Toast.show({ type: "success", text1: "Event created successfully!" });
    await sendSystemMessage(`New event created: ${eventTitle} on ${new Date(eventDate).toLocaleDateString()}`);
    resetEventForm();
    setShowCreateEventModal(false);
    fetchEvents();
  }

  function calculateIntraXP(category: string) {
    const xpValues: Record<string, number> = {
      small: 150,
      medium: 300,
      large: 600,
    };
    return xpValues[category] || 0;
  }

  function resetEventForm() {
    setEventTitle("");
    setEventDescription("");
    setEventDate("");
    setSelectedDate(new Date());
    setShowDatePicker(false);
    setEventPlace("");
    setMembersRequired("");
    setXpPoints("");
    setEventType("intra");
    setSizeCategory("");
    setCompetingClubs([]);
  }

  function handleDateChange(event: any, date?: Date) {
    setShowDatePicker(Platform.OS === 'ios'); // Keep picker open on iOS
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setEventDate(formattedDate);
    }
  }

  async function handleJoinEvent(eventId: string) {
    if (!currentUserId) return;

    const { data, error } = await supabase.rpc("join_event", {
      p_event_id: eventId,
      p_user_id: currentUserId,
    });

    if (error) {
      Toast.show({ type: "error", text1: "Failed to join event" });
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.reason === "joined") {
      Toast.show({ type: "success", text1: "Joined event successfully!" });
      await fetchAllEventParticipantCounts([eventId]);
    } else if (result?.reason === "already_joined") {
      Toast.show({ type: "info", text1: "Already joined this event" });
    } else if (result?.reason === "full") {
      Toast.show({ type: "error", text1: "Event is full" });
    }
  }

  async function handleDitchEvent(eventId: string) {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", currentUserId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to leave event" });
      return;
    }

    Toast.show({ type: "success", text1: "Left event successfully" });
    await fetchAllEventParticipantCounts([eventId]);
  }

  async function openCompleteModal(event: Event) {
    setCompletingEvent(event);
    setResultsDescription("");
    setSelectedPhotos([]);
    setClubPositions({});

    // Ensure creator club row exists
    if (event.event_type === "inter" && clubId) {
      await supabase
        .from("inter_club_participants")
        .upsert(
          { event_id: event.id, club_id: clubId, accepted: true, position: null, xp_awarded: 0 },
          { onConflict: "event_id,club_id" }
        );
    }

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
  }

  async function handleCompleteEvent() {
    if (!completingEvent || !currentUserId) return;

    // Upload photos
    const photoUrls: string[] = [];

    if (selectedPhotos.length > 0) {
      try {
        Toast.show({ type: "info", text1: "Uploading photos..." });

        for (const photo of selectedPhotos) {
          try {
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fileExt = photo.uri.split('.').pop() || 'jpg';
            const filePath = `${fileName}.${fileExt}`;

            // Read the file as blob for React Native
            const response = await fetch(photo.uri);

            if (!response.ok) {
              throw new Error(`Failed to fetch photo: ${response.status}`);
            }

            const blob = await response.blob();

            if (!blob) {
              throw new Error("Failed to convert photo to blob");
            }

            // Determine content type from the asset
            const contentType = photo.mimeType || `image/${fileExt}`;

            const { data, error } = await supabase.storage
              .from("event-photos")
              .upload(filePath, blob, {
                contentType: contentType,
                cacheControl: '3600',
                upsert: false
              });

            if (error) {
              console.error("Error uploading photo:", error);
              Toast.show({
                type: "error",
                text1: "Photo upload failed",
                text2: error.message
              });
              continue;
            }

            const { data: urlData } = supabase.storage
              .from("event-photos")
              .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
              photoUrls.push(urlData.publicUrl);
            }
          } catch (err: any) {
            console.error("Error processing photo:", err);
            Toast.show({
              type: "error",
              text1: "Photo processing failed",
              text2: err?.message || "Unknown error"
            });
            continue;
          }
        }
      } catch (err) {
        console.error("Error in photo upload process:", err);
      }
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
      Toast.show({ type: "error", text1: "Failed to submit event" });
      return;
    }

    // Handle inter-club positions and XP
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

    Toast.show({ type: "success", text1: "Event submitted for review!" });
    await sendSystemMessage(`Event "${completingEvent.title}" submitted for review`);
    setShowCompleteModal(false);
    await fetchEvents();
  }

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedPhotos([...selectedPhotos, ...result.assets]);
    }
  }

  async function handleAcceptInvitation(eventId: string) {
    const { error } = await supabase
      .from("inter_club_participants")
      .update({ accepted: true })
      .eq("event_id", eventId)
      .eq("club_id", clubId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to accept invitation" });
      return;
    }

    Toast.show({ type: "success", text1: "Invitation accepted!" });
    await sendSystemMessage(`Accepted inter-club event invitation`);
    fetchEventInvitations();
    fetchEvents();
  }

  async function handleRejectInvitation(eventId: string) {
    const { error } = await supabase
      .from("inter_club_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("club_id", clubId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to reject invitation" });
      return;
    }

    Toast.show({ type: "success", text1: "Invitation rejected" });
    await sendSystemMessage(`Declined inter-club event invitation`);
    fetchEventInvitations();
  }

  async function handleAcceptRequest(requestId: string, userId: string) {
    const { error: memberError } = await supabase
      .from("club_members")
      .insert([{ club_id: clubId, user_id: userId }]);

    if (memberError) {
      Toast.show({ type: "error", text1: "Failed to add member" });
      return;
    }

    await supabase.from("club_requests").delete().eq("id", requestId);

    Toast.show({ type: "success", text1: "Request approved!" });
    const approvedUser = requests.find(r => r.id === requestId);
    if (approvedUser?.profiles?.full_name) {
      await sendSystemMessage(`${approvedUser.profiles.full_name} joined the club`);
    }
    fetchRequests();
    fetchMembers();
  }

  async function handleRejectRequest(requestId: string) {
    const { error } = await supabase
      .from("club_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to reject request" });
      return;
    }

    Toast.show({ type: "success", text1: "Request rejected" });
    fetchRequests();
  }

  async function handleLeaveClub() {
    Alert.alert(
      "Leave Club",
      "Are you sure you want to leave this club?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("club_members")
              .delete()
              .eq("club_id", clubId)
              .eq("user_id", currentUserId);

            if (error) {
              Toast.show({ type: "error", text1: "Failed to leave club" });
              return;
            }

            Toast.show({ type: "success", text1: "Left club successfully" });
            router.back();
          },
        },
      ]
    );
  }

  function scrollToBottom() {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleCreateInvite() {
    if (!currentUserId || !clubId) return;

    try {
      const { data, error } = await supabase
        .from("club_invites")
        .insert([
          {
            club_id: clubId,
            created_by: currentUserId,
            role: "member",
            max_uses: 1,
          },
        ])
        .select("token")
        .single();

      if (error || !data) {
        Toast.show({
          type: "error",
          text1: "Failed to create invite",
          text2: error?.message || "Unknown error",
        });
        return;
      }

      // For mobile, we'll use Share API instead of clipboard
      const url = `https://yourdomain.com/accept-invite?token=${data.token}`;

      try {
        await Share.share({
          message: `Join our club on Campus5! ${url}`,
          title: "Club Invite",
        });

        await sendSystemMessage(`Admin created a new invite link`);

        Toast.show({
          type: "success",
          text1: "Invite Created",
          text2: "Share link sent!",
        });
      } catch (shareError) {
        // If share fails, just show success with the link
        Toast.show({
          type: "success",
          text1: "Invite Created",
          text2: url,
        });
      }
    } catch (err) {
      console.error("Error creating invite:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create invite",
      });
    }
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { text: string; bg: string; color: string }> = {
      upcoming: { text: "Upcoming", bg: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" },
      pending: { text: "Pending Review", bg: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" },
      approved: { text: "Approved", bg: "rgba(16, 185, 129, 0.2)", color: "#10b981" },
      rejected: { text: "Rejected", bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444" },
    };

    const badge = badges[status] || badges.upcoming;
    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading club...</Text>
      </View>
    );
  }

  const totalClubsInModal = completingEvent?.event_type === "inter" ? competingClubsForEvent.length : 0;
  const assignedPositions = Object.values(clubPositions).filter(
    (v): v is number => typeof v === "number" && !isNaN(v)
  );
  const allAssigned = completingEvent?.event_type !== "inter" || assignedPositions.length === totalClubsInModal;
  const uniqueAssigned = new Set(assignedPositions).size === assignedPositions.length;

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.clubInfo}>
            <Text style={styles.clubName}>{club?.name}</Text>
            <Text style={styles.clubCategory}>{club?.category}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {userRole === "admin" && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleCreateInvite}
              >
                <UserPlus color="#fff" size={20} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push(`/clubs/${clubId}/profile`)}
            >
              <User color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "chat" && styles.tabActive]}
            onPress={() => setActiveTab("chat")}
          >
            <MessageCircle color={activeTab === "chat" ? "#a855f7" : "#fff"} size={20} />
            <Text style={[styles.tabText, activeTab === "chat" && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "events" && styles.tabActive]}
            onPress={() => setActiveTab("events")}
          >
            <Calendar color={activeTab === "events" ? "#a855f7" : "#fff"} size={20} />
            <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "members" && styles.tabActive]}
            onPress={() => setActiveTab("members")}
          >
            <Users color={activeTab === "members" ? "#a855f7" : "#fff"} size={20} />
            <Text style={[styles.tabText, activeTab === "members" && styles.tabTextActive]}>Members</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      {activeTab === "chat" ? (
        <View style={styles.chatContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              renderItem={({ item: msg }) => (
                <View
                  style={[
                    styles.messageBubble,
                    msg.user_id === currentUserId ? styles.myMessage : styles.otherMessage,
                  ]}
                >
                  {msg.user_id !== currentUserId && (
                    <Text style={styles.messageSender}>{msg.profiles?.full_name}</Text>
                  )}
                  <Text style={styles.messageText}>{msg.content}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            />

            {/* Fixed Message Input */}
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Send color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Events Tab */}
          {activeTab === "events" && (
            <View style={styles.section}>
              {userRole === "admin" && (
                <>
                  {eventInvitations.length > 0 && (
                    <View style={styles.invitationsSection}>
                      <Text style={styles.sectionTitle}>Event Invitations</Text>
                      {eventInvitations.map((invitation) => (
                        <View key={invitation.event_id} style={styles.invitationCard}>
                          <Text style={styles.invitationTitle}>{invitation.events.title}</Text>
                          <Text style={styles.invitationFrom}>
                            From: {invitation.events.clubs?.name}
                          </Text>
                          <Text style={styles.invitationDate}>
                            {new Date(invitation.events.event_date).toLocaleDateString()}
                          </Text>
                          <View style={styles.invitationActions}>
                            <TouchableOpacity
                              style={styles.acceptButton}
                              onPress={() => handleAcceptInvitation(invitation.event_id)}
                            >
                              <Check color="#fff" size={16} />
                              <Text style={styles.buttonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectButton}
                              onPress={() => handleRejectInvitation(invitation.event_id)}
                            >
                              <X color="#fff" size={16} />
                              <Text style={styles.buttonText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.createEventButton}
                    onPress={() => setShowCreateEventModal(true)}
                  >
                    <Plus color="#fff" size={20} />
                    <Text style={styles.createEventText}>Create Event</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.sectionTitle}>Active Events</Text>
              {events.filter(e => e.status === "upcoming" || e.status === "pending").length === 0 ? (
                <View style={styles.emptyState}>
                  <Calendar color="rgba(255, 255, 255, 0.2)" size={48} />
                  <Text style={styles.emptyText}>No active events</Text>
                </View>
              ) : (
                events.filter(e => e.status === "upcoming" || e.status === "pending").map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    onPress={async () => {
                      setSelectedEvent(event);
                      await fetchEventParticipants(event.id);
                      setShowEventModal(true);
                    }}
                  >
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={[
                        styles.eventTypeBadge,
                        event.event_type === "inter" ? styles.interBadge : styles.intraBadge
                      ]}>
                        <Text style={styles.eventTypeText}>
                          {event.event_type === "inter" ? "Inter" : "Intra"}
                        </Text>
                      </View>
                    </View>
                    {getStatusBadge(event.status)}
                    <Text style={styles.eventDescription} numberOfLines={2}>
                      {event.description}
                    </Text>
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetail}>
                        <Calendar color="#a855f7" size={16} />
                        <Text style={styles.eventDetailText}>
                          {new Date(event.event_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.eventDetail}>
                        <Trophy color="#f59e0b" size={16} />
                        <Text style={styles.eventDetailText}>{event.total_xp_pool} XP</Text>
                      </View>
                      <View style={styles.eventDetail}>
                        <Users color="#10b981" size={16} />
                        <Text style={styles.eventDetailText}>
                          {eventParticipantCounts[event.id] || 0}/{event.members_required}
                        </Text>
                      </View>
                    </View>
                    {canComplete[event.id] && (
                      <TouchableOpacity
                        style={styles.completeEventButton}
                        onPress={() => openCompleteModal(event)}
                      >
                        <CheckCircle color="#fff" size={16} />
                        <Text style={styles.completeEventText}>Complete Event</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <View style={styles.section}>
              {userRole === "admin" && requests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Pending Requests</Text>
                  {requests.map((request) => (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestName}>{request.profiles?.full_name}</Text>
                        <Text style={styles.requestEnrollment}>
                          {request.profiles?.enrollment_number}
                        </Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAcceptRequest(request.id, request.user_id)}
                        >
                          <Check color="#fff" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleRejectRequest(request.id)}
                        >
                          <X color="#fff" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.sectionTitle}>Members ({members.length})</Text>
              {members.map((member) => (
                <View key={member.user_id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {member.profiles?.full_name?.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.profiles?.full_name}</Text>
                    <Text style={styles.memberEnrollment}>
                      {member.profiles?.enrollment_number}
                    </Text>
                  </View>
                  {member.role === "admin" && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminText}>Admin</Text>
                    </View>
                  )}
                </View>
              ))}

              {userRole !== "admin" && (
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveClub}>
                  <LogOut color="#ef4444" size={20} />
                  <Text style={styles.leaveText}>Leave Club</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Event Detail Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Details</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalEventTitle}>{selectedEvent.title}</Text>
                {getStatusBadge(selectedEvent.status)}
                <Text style={styles.modalEventDescription}>{selectedEvent.description}</Text>

                <View style={styles.modalEventDetails}>
                  <View style={styles.modalEventDetail}>
                    <Calendar color="#a855f7" size={20} />
                    <Text style={styles.modalEventDetailText}>
                      {new Date(selectedEvent.event_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.modalEventDetail}>
                    <Trophy color="#f59e0b" size={20} />
                    <Text style={styles.modalEventDetailText}>{selectedEvent.total_xp_pool} XP</Text>
                  </View>
                  <View style={styles.modalEventDetail}>
                    <Users color="#10b981" size={20} />
                    <Text style={styles.modalEventDetailText}>
                      {participants.length}/{selectedEvent.members_required}
                    </Text>
                  </View>
                </View>

                <Text style={styles.participantsTitle}>Participants</Text>
                {participants.map((p: any) => (
                  <View key={p.user_id} style={styles.participantCard}>
                    <Text style={styles.participantName}>{p.profiles?.full_name || "Unknown"}</Text>
                  </View>
                ))}

                {selectedEvent.status === "upcoming" && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => handleJoinEvent(selectedEvent.id)}
                    >
                      <Text style={styles.joinButtonText}>Join Event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.ditchButton}
                      onPress={() => handleDitchEvent(selectedEvent.id)}
                    >
                      <Text style={styles.ditchButtonText}>Leave Event</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Complete Event Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Event</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Results Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what happened..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={resultsDescription}
                onChangeText={setResultsDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Proof Photos</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                <Upload color="#fff" size={20} />
                <Text style={styles.uploadButtonText}>Upload Photos ({selectedPhotos.length})</Text>
              </TouchableOpacity>

              {selectedPhotos.length > 0 && (
                <ScrollView horizontal style={styles.photosPreview}>
                  {selectedPhotos.map((photo, idx) => (
                    <View key={idx} style={styles.photoPreview}>
                      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => setSelectedPhotos(selectedPhotos.filter((_, i) => i !== idx))}
                      >
                        <X color="#fff" size={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {completingEvent?.event_type === "inter" && (
                <>
                  <Text style={styles.inputLabel}>Club Positions</Text>
                  <Text style={styles.inputHint}>Select the finishing position for each club</Text>
                  {competingClubsForEvent.map((club) => (
                    <View key={club.id} style={styles.positionRow}>
                      <Text style={styles.positionClubName}>{club.name}</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={clubPositions[club.id]?.toString() || ""}
                          onValueChange={(value) => {
                            if (value) {
                              setClubPositions({ ...clubPositions, [club.id]: parseInt(value) });
                            }
                          }}
                          style={styles.picker}
                          dropdownIconColor="#a855f7"
                        >
                          <Picker.Item label="Select Rank" value="" color="#666" />
                          {Array.from({ length: competingClubsForEvent.length }, (_, i) => (
                            <Picker.Item
                              key={i + 1}
                              label={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`}
                              value={(i + 1).toString()}
                              color="#fff"
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!resultsDescription || !allAssigned || !uniqueAssigned) && styles.submitButtonDisabled
                ]}
                onPress={handleCompleteEvent}
                disabled={!resultsDescription || !allAssigned || !uniqueAssigned}
              >
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Event Modal - Same as before */}
      <Modal
        visible={showCreateEventModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Event</Text>
              <TouchableOpacity onPress={() => setShowCreateEventModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Event Title *"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={eventDescription}
                onChangeText={setEventDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Event Date *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar color="#a855f7" size={20} />
                <Text style={styles.datePickerText}>
                  {eventDate || "Select Date"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Place"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={eventPlace}
                onChangeText={setEventPlace}
              />

              <TextInput
                style={styles.input}
                placeholder="Members Required *"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={membersRequired}
                onChangeText={setMembersRequired}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="XP Points *"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={xpPoints}
                onChangeText={setXpPoints}
                keyboardType="numeric"
              />

              <View style={styles.eventTypeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, eventType === "intra" && styles.typeButtonActive]}
                  onPress={() => setEventType("intra")}
                >
                  <Text style={[styles.typeButtonText, eventType === "intra" && styles.typeButtonTextActive]}>
                    Intra-Club
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, eventType === "inter" && styles.typeButtonActive]}
                  onPress={() => setEventType("inter")}
                >
                  <Text style={[styles.typeButtonText, eventType === "inter" && styles.typeButtonTextActive]}>
                    Inter-Club
                  </Text>
                </TouchableOpacity>
              </View>

              {eventType === "intra" && (
                <View style={styles.sizeCategorySelector}>
                  {["small", "medium", "large"].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.sizeButton, sizeCategory === size && styles.sizeButtonActive]}
                      onPress={() => setSizeCategory(size)}
                    >
                      <Text style={[styles.sizeButtonText, sizeCategory === size && styles.sizeButtonTextActive]}>
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {eventType === "inter" && (
                <>
                  <Text style={styles.clubsSelectorTitle}>Select Competing Clubs:</Text>
                  {allClubs
                    .filter((c) => c.id !== clubId)
                    .map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.clubCheckbox}
                        onPress={() => {
                          setCompetingClubs((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                      >
                        <View style={[styles.checkbox, competingClubs.includes(c.id) && styles.checkboxChecked]}>
                          {competingClubs.includes(c.id) && <Check color="#fff" size={16} />}
                        </View>
                        <Text style={styles.clubCheckboxText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                </>
              )}

              <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
                <Text style={styles.createButtonText}>Create Event</Text>
              </TouchableOpacity>
            </ScrollView>
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
    backgroundColor: "#0f1729",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  clubInfo: {
    flex: 1,
    alignItems: "center",
  },
  clubName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  clubCategory: {
    fontSize: 14,
    color: "#a855f7",
    marginTop: 4,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
  },
  tabText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#a855f7",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#a855f7",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  messageSender: {
    fontSize: 12,
    color: "#a855f7",
    marginBottom: 4,
    fontWeight: "600",
  },
  messageText: {
    color: "white",
    fontSize: 14,
  },
  messageTime: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "white",
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  invitationsSection: {
    marginBottom: 24,
  },
  invitationCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
    padding: 16,
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  invitationFrom: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 12,
  },
  invitationActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  createEventButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a855f7",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  createEventText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    marginTop: 16,
  },
  eventCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginRight: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  intraBadge: {
    backgroundColor: "#10b981",
  },
  interBadge: {
    backgroundColor: "#f59e0b",
  },
  eventTypeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  eventDescription: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventDetailText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
  completeEventButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  completeEventText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  requestEnrollment: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  memberEnrollment: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  leaveText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e1b4b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    padding: 20,
  },
  modalEventTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  modalEventDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 16,
  },
  modalEventDetails: {
    gap: 12,
    marginBottom: 20,
  },
  modalEventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalEventDetailText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 14,
    color: "white",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  joinButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  ditchButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ditchButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "#a855f7",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  uploadButtonText: {
    color: "#a855f7",
    fontSize: 14,
    fontWeight: "600",
  },
  photosPreview: {
    marginBottom: 12,
  },
  photoPreview: {
    width: 80,
    height: 80,
    marginRight: 8,
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  inputHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 12,
    fontStyle: "italic",
  },
  positionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  positionClubName: {
    flex: 1,
    fontSize: 14,
    color: "white",
  },
  pickerContainer: {
    width: 140,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    color: "white",
    height: 40,
  },
  positionInput: {
    width: 80,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  eventTypeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  typeButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: "white",
  },
  sizeCategorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  sizeButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  sizeButtonActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  sizeButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  sizeButtonTextActive: {
    color: "white",
  },
  clubsSelectorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  clubCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  clubCheckboxText: {
    color: "white",
    fontSize: 14,
  },
  createButton: {
    backgroundColor: "#a855f7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },
});
