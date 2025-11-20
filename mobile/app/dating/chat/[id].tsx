import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../utils/supabaseClient";
import { getChatMessages, sendChatMessage, getRevealStatus } from "../../../utils/dating";
import { getMatchIcebreakerQuestion } from "../../../utils/icebreaker";
import {
  getSurpriseQuestions,
  createSurpriseQuestion,
  revealSurpriseQuestion,
  answerSurpriseQuestion,
  type SurpriseQuestion,
} from "../../../utils/surpriseQuestion";
import { TokenPurchaseModal } from "../../../components/TokenPurchaseModal";
import Toast from "react-native-toast-message";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // Basic states
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);

  // Surprise question states
  const [surpriseQuestions, setSurpriseQuestions] = useState<SurpriseQuestion[]>([]);
  const [showCreateSQModal, setShowCreateSQModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState<SurpriseQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");

  // Token states
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [showTokenConfirmation, setShowTokenConfirmation] = useState(false);
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  // Profile & reveal states
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [revealStatus, setRevealStatus] = useState<any>(null);
  const [datingCategory, setDatingCategory] = useState<string | null>(null);

  // Chat locking
  const unansweredQuestion = surpriseQuestions.find(
    (sq) => sq.receiver_id === user?.id && sq.is_revealed && !sq.answer
  );
  const isChatLocked = !!unansweredQuestion;

  // Show unanswered question modal when locked
  useEffect(() => {
    if (unansweredQuestion && !showAnswerModal) {
      setShowAnswerModal(unansweredQuestion);
    }
  }, [unansweredQuestion]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`chat-data-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "dating_chats",
        filter: `match_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "dating_reveals",
        filter: `match_id=eq.${id}`,
      }, (payload) => {
        setRevealStatus(payload.new);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "surprise_questions",
        filter: `match_id=eq.${id}`,
      }, (payload) => {
        const newSQ = payload.new as SurpriseQuestion;
        setSurpriseQuestions((prev) => {
          if (prev.some((sq) => sq.id === newSQ.id)) return prev;
          return [...prev, newSQ];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "surprise_questions",
        filter: `match_id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as SurpriseQuestion;
        setSurpriseQuestions((prev) =>
          prev.map((sq) => (sq.id === updated.id ? updated : sq))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Token balance subscription
  useEffect(() => {
    if (!user?.id) return;

    const tokenChannel = supabase
      .channel(`user-tokens-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_tokens",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new && typeof payload.new === "object" && "balance" in payload.new) {
          setTokenBalance(payload.new.balance as number);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tokenChannel);
    };
  }, [user?.id]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      // Load messages
      const messagesData = await getChatMessages(id as string);
      setMessages(messagesData || []);

      // Load surprise questions
      const sqData = await getSurpriseQuestions(id as string);
      setSurpriseQuestions(sqData || []);

      // Load icebreaker
      const icebreakerData = await getMatchIcebreakerQuestion(id as string);
      if (icebreakerData) {
        setIcebreaker(icebreakerData.question);
      }

      // Load token balance
      await loadTokenBalance(user.id);

      // Load reveal status
      const revealData = await getRevealStatus(id as string);
      setRevealStatus(revealData || null);

      // Load match data and partner profile
      const { data: matchData } = await supabase
        .from("dating_matches")
        .select("dating_category, user1_id, user2_id")
        .eq("id", id)
        .single();

      if (matchData) {
        setDatingCategory(matchData.dating_category);

        const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;

        if (otherId) {
          const { data: partner } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherId)
            .single();

          if (partner) {
            setPartnerProfile(partner);
          }
        }
      }

      setLoading(false);

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
    } catch (error) {
      console.error("Error loading chat:", error);
      setLoading(false);
    }
  }

  async function loadTokenBalance(userId: string) {
    try {
      setLoadingTokens(true);

      let { data, error } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.error("Error loading token balance:", error);
        return;
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_tokens")
          .insert({ user_id: userId, balance: 0 })
          .select("balance")
          .single();

        if (insertError) {
          console.error("Error creating token balance:", insertError);
          return;
        }
        data = newData;
      }

      setTokenBalance(data?.balance || 0);
    } catch (err) {
      console.error("loadTokenBalance error:", err);
    } finally {
      setLoadingTokens(false);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || sending || !user || isChatLocked) return;

    setSending(true);

    try {
      await sendChatMessage(id as string, user.id, newMessage.trim());
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleCreateSurpriseQuestion(question: string) {
    if (tokenBalance < 1) {
      setShowInsufficientTokens(true);
      return;
    }

    setPendingQuestion(question);
    setShowTokenConfirmation(true);
  }

  async function handleConfirmTokenUsage() {
    if (!pendingQuestion || !user) return;

    try {
      const { data: currentBalance, error: fetchError } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (fetchError || !currentBalance || currentBalance.balance < 1) {
        setShowTokenConfirmation(false);
        setShowInsufficientTokens(true);
        return;
      }

      await supabase
        .from("user_tokens")
        .update({
          balance: currentBalance.balance - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      setTokenBalance(currentBalance.balance - 1);

      const { data: match } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", id)
        .single();

      if (!match) throw new Error("Match not found");

      const receiverId = match.user1_id === user.id ? match.user2_id : match.user1_id;

      await createSurpriseQuestion(id as string, user.id, receiverId, pendingQuestion);

      await supabase.from("token_transactions").insert({
        user_id: user.id,
        amount: -1,
        type: "spend",
        status: "completed",
        description: "Surprise question sent",
      });

      Alert.alert("Success", "🎁 Surprise question sent! 1 token deducted.");

      setShowTokenConfirmation(false);
      setPendingQuestion(null);
      setShowCreateSQModal(false);
      setNewQuestion("");
    } catch (err) {
      console.error("Failed to send surprise question:", err);
      Alert.alert("Error", "Failed to send surprise question");
      if (user?.id) await loadTokenBalance(user.id);
    }
  }

  async function handleRevealQuestion(sq: SurpriseQuestion) {
    try {
      await revealSurpriseQuestion(sq.id);
    } catch (err) {
      console.error("Failed to reveal question:", err);
      Alert.alert("Error", "Failed to reveal question");
    }
  }

  async function handleAnswerQuestion(answer: string) {
    try {
      if (!showAnswerModal) return;
      await answerSurpriseQuestion(showAnswerModal.id, answer);
      setShowAnswerModal(null);
      setQuestionAnswer("");
    } catch (err) {
      console.error("Failed to answer question:", err);
      Alert.alert("Error", "Failed to submit answer");
    }
  }

  async function handleReveal() {
    try {
      if (!user) {
        Alert.alert("Error", "Please log in to reveal identity.");
        return;
      }

      const { data: match, error: matchErr } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", id)
        .single();

      if (matchErr || !match) {
        console.error("Match fetch error:", matchErr);
        Alert.alert("Error", "Could not load match details.");
        return;
      }

      const { data: existing } = await supabase
        .from("dating_reveals")
        .select("*")
        .eq("match_id", id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("dating_reveals").insert([{ match_id: id }]);
      }

      const fieldToUpdate = user.id === match.user1_id ? "user1_reveal" : "user2_reveal";

      const { data: result, error: updateErr } = await supabase
        .from("dating_reveals")
        .update({ [fieldToUpdate]: true })
        .eq("match_id", id)
        .select("user1_reveal, user2_reveal")
        .single();

      if (updateErr) {
        console.error("Reveal update error:", updateErr);
        Alert.alert("Error", "Failed to reveal identity.");
        return;
      }

      setRevealStatus(result);

      if (result?.user1_reveal && result?.user2_reveal) {
        const partnerId = match.user1_id === user.id ? match.user2_id : match.user1_id;

        const { data: partnerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", partnerId)
          .single();

        if (partnerData) setPartnerProfile(partnerData);

        await sendChatMessage(
          id as string,
          user.id,
          "🎉 Both users have revealed their identities! You can now see each other's full profiles."
        );

        Alert.alert(
          "Success",
          "🎉 Both identities revealed! You can now see each other's full profiles."
        );
      } else {
        await sendChatMessage(
          id as string,
          user.id,
          "💫 I clicked reveal identity! Click yours too to see each other's profiles."
        );

        Alert.alert(
          "Success",
          "✅ Reveal request sent! Waiting for your match to reveal their identity..."
        );
      }
    } catch (err) {
      console.error("Unexpected reveal error:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  }

  // Visibility calculations
  const showPhoto = useMemo(() => {
    const category = datingCategory?.toLowerCase() || "";
    const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;

    if (category === "casual" || category === "friends") return true;
    if (category === "serious" || category === "fun" || category === "mystery") return bothRevealed;

    return bothRevealed;
  }, [datingCategory, revealStatus]);

  const shouldShowRevealButton = useMemo(() => {
    const category = datingCategory?.toLowerCase() || "";
    return category !== "casual" && category !== "friends";
  }, [datingCategory]);

  const locked = useMemo(() => {
    const category = datingCategory?.toLowerCase() || "";

    if (category === "casual" || category === "friends") return false;
    if (category === "serious" || category === "fun" || category === "mystery") {
      const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;
      return !bothRevealed;
    }

    return true;
  }, [datingCategory, revealStatus]);

  // Render messages with surprise questions
  function renderMessages() {
    const allItems = [
      ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
      ...surpriseQuestions.map((sq) => ({
        type: "surprise" as const,
        data: sq,
        timestamp: sq.created_at,
      })),
    ].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    if (allItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      );
    }

    return allItems.map((item, index) => {
      if (item.type === "message") {
        const m = item.data;
        const isMyMessage = m.sender_id === user?.id;
        return (
          <View
            key={m.id || index}
            style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}
          >
            <Text style={styles.messageText}>{m.message}</Text>
            <Text style={styles.messageTime}>
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        );
      } else if (item.type === "surprise") {
        const sq = item.data as SurpriseQuestion;
        const isMyQuestion = sq.sender_id === user?.id;

        if (sq.answer) {
          // Answered surprise question
          return (
            <View key={sq.id} style={styles.surpriseAnswered}>
              <View style={styles.surpriseHeader}>
                <Text style={styles.surpriseIcon}>🎁</Text>
                <Text style={styles.surpriseTitle}>Surprise Question</Text>
              </View>

              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>Question:</Text>
                <Text style={styles.questionText}>{sq.question}</Text>
              </View>

              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Answer:</Text>
                <Text style={styles.answerText}>{sq.answer}</Text>
              </View>

              <Text style={styles.timestampText}>
                Answered {new Date(sq.answered_at || "").toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        } else {
          // Unrevealed surprise question
          return (
            <View key={sq.id} style={styles.surpriseUnrevealed}>
              <Text style={styles.surpriseIcon}>🎁</Text>
              <Text style={styles.surpriseTitle}>Surprise Question!</Text>
              {isMyQuestion ? (
                <Text style={styles.waitingText}>Waiting for them to reveal...</Text>
              ) : (
                <TouchableOpacity
                  style={styles.revealQuestionButton}
                  onPress={() => handleRevealQuestion(sq)}
                >
                  <Text style={styles.revealQuestionButtonText}>🔓 Click to Reveal</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }
      }

      return null;
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerActions}>
            {/* Token Balance */}
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenIcon}>🪙</Text>
              <Text style={styles.tokenText}>{loadingTokens ? "..." : tokenBalance}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionsRow}
          contentContainerStyle={styles.actionsContent}
        >
          <TouchableOpacity
            style={[styles.actionButton, (isChatLocked || loadingTokens) && styles.actionButtonDisabled]}
            onPress={() => setShowCreateSQModal(true)}
            disabled={isChatLocked || loadingTokens}
          >
            <Text style={styles.actionButtonText}>🎁 Surprise Q</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, locked && styles.actionButtonDisabled]}
            onPress={() => {
              if (!locked) setShowProfileModal(true);
            }}
            disabled={locked}
          >
            <Text style={styles.actionButtonText}>
              {locked ? "🔒 Profile" : "View Profile"}
            </Text>
          </TouchableOpacity>

          {shouldShowRevealButton && (
            <TouchableOpacity style={styles.revealButton} onPress={handleReveal}>
              <Text style={styles.revealButtonText}>Reveal Identity</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Chat Lock Banner */}
        {isChatLocked && (
          <View style={styles.lockBanner}>
            <Text style={styles.lockBannerText}>
              ⚠️ Chat locked - Answer the surprise question to continue
            </Text>
          </View>
        )}

      {/* Icebreaker */}
      {icebreaker && (
        <View style={styles.icebreaker}>
          <Text style={styles.icebreakerLabel}>🧊 Icebreaker:</Text>
          <Text style={styles.icebreakerText}>{icebreaker}</Text>
        </View>
      )}

      {/* Messages and Input with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContent}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {renderMessages()}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={isChatLocked ? "Answer the surprise question first..." : "Type a message..."}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            editable={!isChatLocked}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (sending || !newMessage.trim() || isChatLocked) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || !newMessage.trim() || isChatLocked}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      {/* Create Surprise Question Modal */}
      <Modal visible={showCreateSQModal} animationType="slide" transparent={false}>
        <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎁 Create Surprise Question</Text>
            <TouchableOpacity onPress={() => {
              setShowCreateSQModal(false);
              setNewQuestion("");
            }}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Ask your match a fun question! They'll have to answer before continuing.
            </Text>

            <View style={styles.tokenDisplay}>
              <Text style={styles.tokenDisplayText}>Your Balance: 🪙 {tokenBalance} tokens</Text>
            </View>

            <TextInput
              style={styles.modalInput}
              value={newQuestion}
              onChangeText={setNewQuestion}
              placeholder="E.g., What's your most embarrassing moment?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              maxLength={300}
            />

            <Text style={styles.charCount}>{newQuestion.length}/300 characters</Text>

            <View style={styles.modalWarning}>
              <Text style={styles.modalWarningText}>🪙 Sending this question will cost 1 token</Text>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowCreateSQModal(false);
                setNewQuestion("");
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSendButton, !newQuestion.trim() && styles.buttonDisabled]}
              onPress={() => handleCreateSurpriseQuestion(newQuestion)}
              disabled={!newQuestion.trim()}
            >
              <Text style={styles.modalSendButtonText}>Send 🎁</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>

      {/* Answer Surprise Question Modal */}
      <Modal visible={!!showAnswerModal} animationType="slide" transparent={false}>
        <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎁 Surprise Question!</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Your match sent you a surprise question. Answer it to continue chatting!
            </Text>

            <View style={styles.modalQuestionBox}>
              <Text style={styles.modalQuestionLabel}>Question:</Text>
              <Text style={styles.modalQuestionText}>{showAnswerModal?.question}</Text>
            </View>

            <TextInput
              style={styles.modalInput}
              value={questionAnswer}
              onChangeText={setQuestionAnswer}
              placeholder="Type your answer here..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              maxLength={500}
            />

            <Text style={styles.charCount}>{questionAnswer.length}/500 characters</Text>

            <Text style={styles.modalRequiredText}>
              ⚠️ You must answer to continue using the chat
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalSubmitButton, !questionAnswer.trim() && styles.buttonDisabled]}
              onPress={() => handleAnswerQuestion(questionAnswer)}
              disabled={!questionAnswer.trim()}
            >
              <Text style={styles.modalSubmitButtonText}>Submit Answer 🎉</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>

      {/* Token Confirmation Modal */}
      <Modal visible={showTokenConfirmation} animationType="fade" transparent>
        <View style={styles.overlayModal}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>🪙 Use 1 Token?</Text>
            <Text style={styles.confirmText}>
              Surprise questions cost 1 token to send
            </Text>

            <View style={styles.tokenWarningBox}>
              <Text style={styles.tokenWarningBoxText}>1 token will be deducted</Text>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setShowTokenConfirmation(false);
                  setPendingQuestion(null);
                }}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmTokenUsage}>
                <Text style={styles.confirmButtonText}>🪙 Use 1 Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Insufficient Tokens Modal */}
      <Modal visible={showInsufficientTokens} animationType="fade" transparent>
        <View style={styles.overlayModal}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>⚠️ Insufficient Tokens</Text>
            <Text style={styles.confirmText}>
              You need at least 1 token to send a surprise question
            </Text>

            <View style={styles.noTokensBox}>
              <Text style={styles.noTokensIcon}>🪙</Text>
              <Text style={styles.noTokensText}>No Tokens Available</Text>
              <Text style={styles.noTokensSubtext}>
                Add tokens to continue using premium features
              </Text>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowInsufficientTokens(false)}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addTokensButton}
                onPress={() => {
                  setShowInsufficientTokens(false);
                  setShowTokenPurchaseModal(true);
                }}
              >
                <Text style={styles.addTokensButtonText}>🪙 Add Tokens</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile View Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent={false}>
        <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>Profile</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.profileModalContent}>
            {partnerProfile ? (
              <View style={styles.profileCard}>
                <Text style={styles.profileName}>
                  {locked ? "🔒 Name Hidden" : partnerProfile.full_name || "Mystery Match"}
                </Text>

                {!locked && (
                  <>
                    {partnerProfile.dating_description && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>💖 About</Text>
                        <Text style={styles.profileSectionText}>
                          "{partnerProfile.dating_description}"
                        </Text>
                      </View>
                    )}

                    {(partnerProfile.branch || partnerProfile.year) && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>🎓 Education</Text>
                        <Text style={styles.profileSectionText}>
                          {partnerProfile.branch}
                          {partnerProfile.year && ` • ${partnerProfile.year}`}
                        </Text>
                      </View>
                    )}

                    {partnerProfile.height && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>📏 Height</Text>
                        <Text style={styles.profileSectionText}>{partnerProfile.height}</Text>
                      </View>
                    )}

                    {partnerProfile.interests && partnerProfile.interests.length > 0 && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>✨ Interests</Text>
                        <View style={styles.interestsContainer}>
                          {partnerProfile.interests.map((interest: string, index: number) => (
                            <View key={index} style={styles.interestTag}>
                              <Text style={styles.interestText}>{interest}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.noProfileText}>Loading profile...</Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeProfileButton}
            onPress={() => setShowProfileModal(false)}
          >
            <Text style={styles.closeProfileButtonText}>Close Profile</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Modal>

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        visible={showTokenPurchaseModal}
        userId={user?.id || ""}
        onClose={() => setShowTokenPurchaseModal(false)}
      />

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
    fontSize: 18,
    marginTop: 12,
  },
  keyboardView: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: "white",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tokenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tokenIcon: {
    fontSize: 14,
  },
  tokenText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  actionsRow: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  actionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  revealButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  revealButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  lockBanner: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    padding: 12,
  },
  lockBannerText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  icebreaker: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderLeftWidth: 4,
    borderLeftColor: "#a855f7",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  icebreakerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a855f7",
    marginBottom: 4,
  },
  icebreakerText: {
    fontSize: 14,
    color: "white",
    fontStyle: "italic",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#a855f7",
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  messageText: {
    color: "white",
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    alignSelf: "flex-end",
  },
  surpriseAnswered: {
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  surpriseUnrevealed: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  surpriseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  surpriseIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  surpriseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#a855f7",
  },
  questionBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  questionText: {
    fontSize: 14,
    color: "white",
  },
  answerBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: "white",
  },
  timestampText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  waitingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 8,
  },
  revealQuestionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  revealQuestionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "white",
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#a855f7",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  modalCloseButton: {
    fontSize: 32,
    color: "white",
    fontWeight: "300",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
    lineHeight: 20,
  },
  tokenDisplay: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  tokenDisplayText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "right",
    marginBottom: 20,
  },
  modalWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    padding: 16,
  },
  modalWarningText: {
    color: "#fbbf24",
    fontSize: 14,
    textAlign: "center",
  },
  modalQuestionBox: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalQuestionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  modalQuestionText: {
    fontSize: 16,
    color: "white",
    lineHeight: 24,
  },
  modalRequiredText: {
    fontSize: 12,
    color: "#fbbf24",
    textAlign: "center",
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSendButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSubmitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  overlayModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 20,
  },
  tokenWarningBox: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tokenWarningBoxText: {
    color: "#fbbf24",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  noTokensBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  noTokensIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noTokensText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  noTokensSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmCancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  addTokensButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addTokensButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  profileModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  profileModalContent: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
  },
  profileName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  profileSection: {
    marginBottom: 20,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a855f7",
    marginBottom: 8,
  },
  profileSectionText: {
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    color: "#a855f7",
    fontSize: 12,
    fontWeight: "500",
  },
  noProfileText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 40,
  },
  closeProfileButton: {
    backgroundColor: "#a855f7",
    borderRadius: 12,
    paddingVertical: 16,
    margin: 20,
    alignItems: "center",
  },
  closeProfileButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
