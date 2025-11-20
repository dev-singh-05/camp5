import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Send } from "lucide-react-native";
import { supabase } from "../../../utils/supabaseClient";
import Toast from "react-native-toast-message";

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
};

export default function ChatPage() {
  const router = useRouter();
  const { id: otherUserId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Load other user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo")
        .eq("id", otherUserId)
        .single();

      setOtherUser(profileData);

      // Load messages
      const { data: messagesData } = await supabase
        .from("user_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages(messagesData || []);

      // Subscribe to new messages
      const channelKey = [user.id, otherUserId].sort().join("-");
      const channel = supabase
        .channel(`chat-${channelKey}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_messages" },
          (payload) => {
            const msg = payload.new as Message;
            if (
              (msg.from_user_id === user.id && msg.to_user_id === otherUserId) ||
              (msg.from_user_id === otherUserId && msg.to_user_id === user.id)
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
          }
        )
        .subscribe();

      setLoading(false);

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error("Error loading chat:", error);
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUserId || !otherUserId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      from_user_id: currentUserId,
      to_user_id: otherUserId as string,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("user_messages")
        .insert([
          {
            from_user_id: currentUserId,
            to_user_id: otherUserId,
            content: optimisticMsg.content,
          },
        ])
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Toast.show({ type: "error", text1: "Failed to send message" });
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Toast.show({ type: "error", text1: "Failed to send message" });
    }
  }

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (loading) {
    return (
      <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/ratings/connections")}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherUser?.full_name?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View>
              <Text style={styles.headerName}>{otherUser?.full_name || "User"}</Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageWrapper,
                msg.from_user_id === currentUserId
                  ? styles.myMessageWrapper
                  : styles.theirMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  msg.from_user_id === currentUserId ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  headerStatus: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageWrapper: {
    marginVertical: 4,
  },
  myMessageWrapper: {
    alignItems: "flex-end",
  },
  theirMessageWrapper: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: "#a855f7",
  },
  theirMessage: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  messageText: {
    fontSize: 16,
    color: "white",
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.2)",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
  },
});
