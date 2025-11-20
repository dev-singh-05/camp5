import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabaseClient";
import { UserCheck, UserX, Users } from "lucide-react-native";
import Toast from "react-native-toast-message";

type Request = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_user: {
    id: string;
    full_name: string;
    profile_photo: string | null;
  };
};

export function ConnectionRequests({ userId }: { userId: string }) {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();

    // Subscribe to changes
    const channel = supabase
      .channel("profile_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_requests", filter: `to_user_id=eq.${userId}` },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from("profile_requests")
        .select("id, from_user_id, to_user_id, status, created_at, from_user:profiles!profile_requests_from_user_id_fkey(id, full_name, profile_photo)")
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRequests(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error loading requests:", error);
      setLoading(false);
    }
  }

  async function handleAccept(requestId: string) {
    try {
      const { error } = await supabase
        .from("profile_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Connection accepted!",
      });

      loadRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
      Toast.show({
        type: "error",
        text1: "Failed to accept request",
      });
    }
  }

  async function handleDecline(requestId: string) {
    try {
      const { error } = await supabase
        .from("profile_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      Toast.show({
        type: "info",
        text1: "Connection declined",
      });

      loadRequests();
    } catch (error) {
      console.error("Error declining request:", error);
      Toast.show({
        type: "error",
        text1: "Failed to decline request",
      });
    }
  }

  const getAvatar = (request: Request) => {
    if (request.from_user?.profile_photo) {
      return { uri: request.from_user.profile_photo };
    }
    return null;
  };

  const getAvatarText = (request: Request) => {
    return (request.from_user?.full_name || "U")[0].toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#a855f7" />
      </View>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users color="#10b981" size={20} />
          <Text style={styles.headerTitle}>Connection Requests</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/ratings")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.requestsList}>
        {requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestAvatar}>
              {getAvatar(request) ? (
                <Image source={getAvatar(request)!} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{getAvatarText(request)}</Text>
              )}
            </View>

            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{request.from_user?.full_name}</Text>
              <Text style={styles.requestTime}>
                {new Date(request.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(request.id)}
              >
                <UserCheck color="#10b981" size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(request.id)}
              >
                <UserX color="#ef4444" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  viewAllText: {
    fontSize: 14,
    color: "#a855f7",
    fontWeight: "600",
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 12,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
