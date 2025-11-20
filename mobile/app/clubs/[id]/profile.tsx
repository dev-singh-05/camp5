import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Edit,
  Save,
  X,
  Trophy,
  Calendar,
  Zap,
  Users,
  Crown,
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  History,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { supabase } from "../../../utils/supabaseClient";
import Toast from "react-native-toast-message";

export default function ClubProfile() {
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPasscode, setEditPasscode] = useState("");

  const [totalEvents, setTotalEvents] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [clubRank, setClubRank] = useState<number | null>(null);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [eventInvitations, setEventInvitations] = useState<any[]>([]);
  const [showEventHistory, setShowEventHistory] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [clubId]);

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
        fetchClubData(),
        fetchMembers(),
        fetchStats(),
        fetchUserRole(user.id),
        fetchEvents(),
        fetchMessages(),
      ]);

      // Only fetch admin stuff if user is admin
      const { data: roleData } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === "admin") {
        await Promise.all([
          fetchRequests(),
          fetchEventInvitations(),
        ]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }

  async function fetchClubData() {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (error) {
      Toast.show({ type: "error", text1: "Failed to load club" });
      return;
    }

    setClub(data);
    setEditName(data.name || "");
    setEditDescription(data.description || "");
    setEditCategory(data.category || "");
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from("club_members")
      .select("user_id, role, profiles(full_name, enrollment_number)")
      .eq("club_id", clubId)
      .order("role", { ascending: false });

    setMembers(data || []);
  }

  async function fetchUserRole(userId: string) {
    const { data } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .single();

    setUserRole(data?.role || null);
  }

  async function fetchStats() {
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);
    setTotalEvents(count || 0);

    const { data: clubData } = await supabase
      .from("clubs")
      .select("total_xp")
      .eq("id", clubId)
      .single();
    setTotalXP(clubData?.total_xp || 0);

    const { data: allClubs } = await supabase
      .from("clubs")
      .select("id, total_xp")
      .order("total_xp", { ascending: false });

    const rank = (allClubs || []).findIndex((c: any) => c.id === clubId) + 1;
    setClubRank(rank > 0 ? rank : null);
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from("club_requests")
      .select("id, user_id, profiles(full_name, enrollment_number)")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    setRequests(data || []);
  }

  async function fetchEventInvitations() {
    const { data } = await supabase
      .from("inter_club_participants")
      .select(`
        event_id,
        events!inner(
          id, title, description, event_date, total_xp_pool, clubs!inner(name)
        )
      `)
      .eq("club_id", clubId)
      .eq("accepted", false);

    setEventInvitations(data || []);
  }

  async function fetchEvents() {
    // Fetch own events
    const { data: ownEvents } = await supabase
      .from("events")
      .select("*")
      .eq("club_id", clubId)
      .order("event_date", { ascending: false });

    // Fetch accepted inter-club events
    const { data: acceptedInterEvents } = await supabase
      .from("inter_club_participants")
      .select(`
        event_id,
        events!inner(*)
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

    setEvents(uniqueEvents);
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("id, content, created_at, user_id, profiles(full_name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    setMessages(data || []);
  }

  async function sendSystemMessage(content: string) {
    if (!clubId || !currentUserId) return;

    await supabase.from("messages").insert([{
      club_id: clubId,
      user_id: currentUserId,
      content: `🔔 SYSTEM: ${content}`
    }]);
  }

  async function handleSave() {
    if (!club || userRole !== "admin") return;

    const updateData: any = {
      name: editName,
      description: editDescription,
      category: editCategory,
    };

    if (editPasscode.trim()) {
      updateData.passcode = editPasscode;
    }

    const { error } = await supabase
      .from("clubs")
      .update(updateData)
      .eq("id", clubId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to save changes" });
      return;
    }

    Toast.show({ type: "success", text1: "Club updated successfully!" });
    setIsEditing(false);
    setEditPasscode("");
    await fetchClubData();
  }

  async function handleApprove(requestId: string, userId: string) {
    const { error } = await supabase
      .from("club_members")
      .insert([{ club_id: clubId, user_id: userId }]);

    if (error) {
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

  async function handleReject(requestId: string) {
    await supabase.from("club_requests").delete().eq("id", requestId);
    Toast.show({ type: "success", text1: "Request rejected" });
    fetchRequests();
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
  }

  async function handleDeclineInvitation(eventId: string) {
    const { error } = await supabase
      .from("inter_club_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("club_id", clubId);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to decline invitation" });
      return;
    }

    Toast.show({ type: "success", text1: "Invitation declined" });
    await sendSystemMessage(`Declined inter-club event invitation`);
    fetchEventInvitations();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Club not found</Text>
      </View>
    );
  }

  const isAdmin = userRole === "admin";
  const admins = members.filter((m) => m.role === "admin");
  const regularMembers = members.filter((m) => m.role !== "admin");

  const isHistoryEvent = (event: any) => {
    return event.status === "approved" || event.status === "rejected";
  };

  const historyEvents = events.filter(e => isHistoryEvent(e));
  const activityLogs = messages.filter(msg =>
    msg.content && msg.content.startsWith("🔔 SYSTEM:")
  );

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Profile</Text>
        {isAdmin && isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Save color="#fff" size={20} />
          </TouchableOpacity>
        )}
        {isAdmin && !isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Edit color="#fff" size={20} />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Trophy color="#fff" size={40} />
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder="Club Name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={editName}
                onChangeText={setEditName}
              />

              <View style={styles.categorySelector}>
                {["Sports", "Arts", "Tech", "General"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      editCategory === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        editCategory === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={4}
              />

              <TextInput
                style={styles.input}
                placeholder="New Passcode (optional)"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={editPasscode}
                onChangeText={setEditPasscode}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setEditName(club.name);
                  setEditDescription(club.description || "");
                  setEditCategory(club.category || "");
                  setEditPasscode("");
                }}
              >
                <X color="#fff" size={16} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.clubName}>{club.name}</Text>
              <Text style={styles.clubCategory}>{club.category || "Uncategorized"}</Text>
              <Text style={styles.clubDescription}>
                {club.description || "No description provided."}
              </Text>

              {/* Stats */}
              <View style={styles.stats}>
                <View style={styles.statCard}>
                  <Calendar color="#3b82f6" size={24} />
                  <Text style={styles.statValue}>{totalEvents}</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>

                <View style={styles.statCard}>
                  <Zap color="#10b981" size={24} />
                  <Text style={styles.statValue}>{totalXP}</Text>
                  <Text style={styles.statLabel}>Total XP</Text>
                </View>

                <View style={styles.statCard}>
                  <Trophy color="#fbbf24" size={24} />
                  <Text style={styles.statValue}>#{clubRank || "N/A"}</Text>
                  <Text style={styles.statLabel}>Rank</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Users color="#a855f7" size={20} /> Club Members
          </Text>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>
              <Crown color="#fbbf24" size={16} /> Admins
            </Text>
            {admins.length === 0 ? (
              <Text style={styles.emptyText}>No admins</Text>
            ) : (
              admins.map((m) => (
                <View key={m.user_id} style={styles.memberCard}>
                  <View style={[styles.memberAvatar, styles.adminAvatar]}>
                    <Crown color="#fff" size={20} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.profiles?.full_name || "Unknown"}</Text>
                    <Text style={styles.memberEnrollment}>{m.profiles?.enrollment_number}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>
              <Shield color="#a855f7" size={16} /> Members ({regularMembers.length})
            </Text>
            {regularMembers.length === 0 ? (
              <Text style={styles.emptyText}>No members yet</Text>
            ) : (
              regularMembers.map((m) => (
                <View key={m.user_id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Shield color="#fff" size={20} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.profiles?.full_name || "Unknown"}</Text>
                    <Text style={styles.memberEnrollment}>{m.profiles?.enrollment_number}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Admin Panel */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <TouchableOpacity
              style={styles.adminHeader}
              onPress={() => setShowAdminPanel(!showAdminPanel)}
            >
              <View style={styles.adminHeaderLeft}>
                <Shield color="#fbbf24" size={20} />
                <Text style={styles.adminTitle}>Admin Panel</Text>
                {(eventInvitations.length > 0 || requests.length > 0) && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {eventInvitations.length + requests.length}
                    </Text>
                  </View>
                )}
              </View>
              {showAdminPanel ? (
                <ChevronUp color="#fff" size={20} />
              ) : (
                <ChevronDown color="#fff" size={20} />
              )}
            </TouchableOpacity>

            {showAdminPanel && (
              <View style={styles.adminContent}>
                {/* Event Invitations */}
                {eventInvitations.length > 0 && (
                  <View style={styles.adminSubsection}>
                    <Text style={styles.adminSubtitle}>Event Invitations</Text>
                    {eventInvitations.map((invitation: any) => (
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
                            onPress={() => handleDeclineInvitation(invitation.event_id)}
                          >
                            <X color="#fff" size={16} />
                            <Text style={styles.buttonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Pending Requests */}
                <View style={styles.adminSubsection}>
                  <Text style={styles.adminSubtitle}>Pending Join Requests</Text>
                  {requests.length === 0 ? (
                    <Text style={styles.emptyText}>No pending requests</Text>
                  ) : (
                    requests.map((r) => (
                      <View key={r.id} style={styles.requestCard}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestName}>{r.profiles?.full_name || "Unknown"}</Text>
                          <Text style={styles.requestEnrollment}>{r.profiles?.enrollment_number}</Text>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={styles.acceptIconButton}
                            onPress={() => handleApprove(r.id, r.user_id)}
                          >
                            <Check color="#fff" size={20} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectIconButton}
                            onPress={() => handleReject(r.id)}
                          >
                            <X color="#fff" size={20} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Event History */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowEventHistory(!showEventHistory)}
          >
            <View style={styles.dropdownHeaderLeft}>
              <History color="#10b981" size={20} />
              <Text style={styles.dropdownTitle}>Event History</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{historyEvents.length}</Text>
              </View>
            </View>
            {showEventHistory ? (
              <ChevronUp color="rgba(255, 255, 255, 0.6)" size={20} />
            ) : (
              <ChevronDown color="rgba(255, 255, 255, 0.6)" size={20} />
            )}
          </TouchableOpacity>

          {showEventHistory && (
            <View style={styles.dropdownContent}>
              {historyEvents.length === 0 ? (
                <Text style={styles.emptyText}>No completed events yet</Text>
              ) : (
                historyEvents.map((e) => (
                  <View key={e.id} style={styles.historyEventCard}>
                    <View style={styles.historyEventHeader}>
                      <Text style={styles.historyEventTitle}>{e.title}</Text>
                      {e.status === "approved" && (
                        <View style={styles.approvedBadge}>
                          <CheckCircle color="#10b981" size={12} />
                          <Text style={styles.approvedText}>Approved</Text>
                        </View>
                      )}
                      {e.status === "rejected" && (
                        <View style={styles.rejectedBadge}>
                          <XCircle color="#ef4444" size={12} />
                          <Text style={styles.rejectedText}>Rejected</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historyEventDescription} numberOfLines={2}>
                      {e.description || "No description"}
                    </Text>
                    <View style={styles.historyEventDetails}>
                      <View style={styles.historyEventDetail}>
                        <Calendar color="#a855f7" size={12} />
                        <Text style={styles.historyEventDetailText}>
                          {new Date(e.event_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.historyEventDetail}>
                        <MapPin color="#10b981" size={12} />
                        <Text style={styles.historyEventDetailText}>{e.place || "TBD"}</Text>
                      </View>
                      <View style={styles.historyEventDetail}>
                        <Zap color="#f59e0b" size={12} />
                        <Text style={styles.historyEventDetailText}>{e.total_xp_pool} XP</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Activity Log */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowActivityLog(!showActivityLog)}
          >
            <View style={styles.dropdownHeaderLeft}>
              <Activity color="#3b82f6" size={20} />
              <Text style={styles.dropdownTitle}>Activity Log</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activityLogs.length}</Text>
              </View>
            </View>
            {showActivityLog ? (
              <ChevronUp color="rgba(255, 255, 255, 0.6)" size={20} />
            ) : (
              <ChevronDown color="rgba(255, 255, 255, 0.6)" size={20} />
            )}
          </TouchableOpacity>

          {showActivityLog && (
            <View style={styles.dropdownContent}>
              {activityLogs.length === 0 ? (
                <Text style={styles.emptyText}>No activity yet</Text>
              ) : (
                activityLogs.map((log) => (
                  <View key={log.id} style={styles.activityLogCard}>
                    <Text style={styles.activityLogText}>
                      {log.content.replace("🔔 SYSTEM: ", "")}
                    </Text>
                    <Text style={styles.activityLogTime}>
                      {new Date(log.created_at).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

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
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    margin: 16,
    alignItems: "center",
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  clubName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  clubCategory: {
    fontSize: 16,
    color: "#a855f7",
    marginBottom: 12,
  },
  clubDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },
  editForm: {
    width: "100%",
    gap: 12,
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
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  categoryButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "white",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    fontStyle: "italic",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatar: {
    backgroundColor: "#fbbf24",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  memberEnrollment: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  adminSection: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    margin: 16,
    marginTop: 0,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  adminHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  badge: {
    backgroundColor: "#fbbf24",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f1729",
  },
  adminContent: {
    padding: 16,
    paddingTop: 0,
  },
  adminSubsection: {
    marginBottom: 20,
  },
  adminSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fbbf24",
    marginBottom: 12,
  },
  invitationCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  invitationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  invitationFrom: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 8,
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
    borderRadius: 8,
    gap: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  requestEnrollment: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  dropdownHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  countBadge: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#a855f7",
  },
  dropdownContent: {
    marginTop: 12,
    gap: 12,
  },
  historyEventCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  historyEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  historyEventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginRight: 8,
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  approvedText: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "600",
  },
  rejectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  rejectedText: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "600",
  },
  historyEventDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  historyEventDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  historyEventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyEventDetailText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
  },
  activityLogCard: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    borderRadius: 8,
    padding: 12,
  },
  activityLogText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  activityLogTime: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
