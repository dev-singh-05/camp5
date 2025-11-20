# Complete Mobile Chat Implementation - Ready to Code

## ✅ COMPLETED WORK

### 1. Dating Verification Modal - DONE
- **File:** `components/DatingVerificationModal.tsx` ✅ Created
- **Integration:** `app/(tabs)/dating.tsx` ✅ Updated
- **Features:**
  - ID card upload with image picker
  - Fee receipt upload
  - Form validation
  - Progress indicators
  - Direct submission to database

### 2. Token Purchase Modal - DONE
- **File:** `components/TokenPurchaseModal.tsx` ✅ Already exists
- **Features:**
  - UTR number input
  - Payment screenshot upload
  - Submission to `token_purchase_requests` table
  - Success confirmation screen

### 3. Surprise Question Utilities - DONE
- **File:** `utils/surpriseQuestion.ts` ✅ Created
- **Functions:**
  - `createSurpriseQuestion()`
  - `getSurpriseQuestions()`
  - `revealSurpriseQuestion()`
  - `answerSurpriseQuestion()`

---

## 🔨 REMAINING: Enhanced Mobile Chat

The file `app/dating/chat/[id].tsx` needs a **COMPLETE REWRITE** with the following additions:

### Required Imports
```typescript
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert
} from "react-native";
import { useState, useEffect, useRef } from "react";
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
```

### Additional State Variables Needed

```typescript
// Existing states
const [messages, setMessages] = useState<any[]>([]);
const [newMessage, setNewMessage] = useState("");
const [loading, setLoading] = useState(true);
const [sending, setSending] = useState(false);
const [user, setUser] = useState<any>(null);
const [icebreaker, setIcebreaker] = useState<string | null>(null);

// NEW: Surprise Questions
const [surpriseQuestions, setSurpriseQuestions] = useState<SurpriseQuestion[]>([]);
const [showCreateSQModal, setShowCreateSQModal] = useState(false);
const [showAnswerModal, setShowAnswerModal] = useState<SurpriseQuestion | null>(null);
const [newQuestion, setNewQuestion] = useState("");
const [questionAnswer, setQuestionAnswer] = useState("");

// NEW: Token System
const [tokenBalance, setTokenBalance] = useState(0);
const [loadingTokens, setLoadingTokens] = useState(true);
const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
const [showTokenConfirmation, setShowTokenConfirmation] = useState(false);
const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

// NEW: Profile & Reveal
const [partnerProfile, setPartnerProfile] = useState<any>(null);
const [showProfileModal, setShowProfileModal] = useState(false);
const [revealStatus, setRevealStatus] = useState<any>(null);
const [datingCategory, setDatingCategory] = useState<string | null>(null);

// NEW: Chat Locking
const unansweredQuestion = surpriseQuestions.find(
  (sq) => sq.receiver_id === user?.id && sq.is_revealed && !sq.answer
);
const isChatLocked = !!unansweredQuestion;
```

### Functions to Add

#### 1. Load Token Balance
```typescript
async function loadTokenBalance(userId: string) {
  try {
    setLoadingTokens(true);

    let { data, error } = await supabase
      .from("user_tokens")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
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
```

#### 2. Surprise Question Handlers
```typescript
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
    // Deduct token
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
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    setTokenBalance(currentBalance.balance - 1);

    // Get receiver ID
    const { data: match } = await supabase
      .from("dating_matches")
      .select("user1_id, user2_id")
      .eq("id", id)
      .single();

    if (!match) throw new Error("Match not found");

    const receiverId = match.user1_id === user.id ? match.user2_id : match.user1_id;

    // Create surprise question
    await createSurpriseQuestion(id as string, user.id, receiverId, pendingQuestion);

    // Create transaction
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
```

#### 3. Reveal Identity Handler
```typescript
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
      const { error: insertErr } = await supabase
        .from("dating_reveals")
        .insert([{ match_id: id }]);

      if (insertErr) {
        console.error("Create reveal row error:", insertErr);
        Alert.alert("Error", "Could not initialize reveal.");
        return;
      }
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

      Alert.alert("Success", "🎉 Both identities revealed! You can now see each other's full profiles.");
    } else {
      await sendChatMessage(
        id as string,
        user.id,
        "💫 I clicked reveal identity! Click yours too to see each other's profiles."
      );

      Alert.alert("Success", "✅ Reveal request sent! Waiting for your match to reveal their identity...");
    }
  } catch (err) {
    console.error("Unexpected reveal error:", err);
    Alert.alert("Error", "Something went wrong.");
  }
}
```

### Real-time Subscriptions to Add

```typescript
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
      scrollViewRef.current?.scrollToEnd({ animated: true });
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
      if (payload.new && typeof payload.new === 'object' && 'balance' in payload.new) {
        setTokenBalance(payload.new.balance as number);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(tokenChannel);
  };
}, [user?.id]);
```

### UI Components to Add

#### 1. Token Balance Display (in header)
```typescript
<View style={styles.tokenBadge}>
  <Text style={styles.tokenIcon}>🪙</Text>
  <Text style={styles.tokenText}>{loadingTokens ? "..." : tokenBalance}</Text>
</View>
```

#### 2. Surprise Question Button (in header)
```typescript
<TouchableOpacity
  style={styles.surpriseButton}
  onPress={() => setShowCreateSQModal(true)}
  disabled={isChatLocked || loadingTokens}
>
  <Text>🎁 Surprise Q</Text>
</TouchableOpacity>
```

#### 3. View Profile Button (in header)
```typescript
<TouchableOpacity
  style={[styles.profileButton, locked && styles.buttonLocked]}
  onPress={() => {
    if (!locked) setShowProfileModal(true);
  }}
  disabled={locked}
>
  <Text>{locked ? "🔒 Profile" : "View Profile"}</Text>
</TouchableOpacity>
```

#### 4. Reveal Identity Button
```typescript
{shouldShowRevealButton && (
  <TouchableOpacity style={styles.revealButton} onPress={handleReveal}>
    <Text style={styles.revealButtonText}>Reveal Identity</Text>
  </TouchableOpacity>
)}
```

#### 5. Chat Lock Banner
```typescript
{isChatLocked && (
  <View style={styles.lockBanner}>
    <Text style={styles.lockBannerText}>
      ⚠️ Chat locked - Answer the surprise question to continue
    </Text>
  </View>
)}
```

---

## Modal Components to Add

### 1. Create Surprise Question Modal
```typescript
<Modal visible={showCreateSQModal} animationType="slide">
  <View style={styles.modalContainer}>
    <Text style={styles.modalTitle}>🎁 Create Surprise Question</Text>
    <Text style={styles.modalSubtitle}>
      Ask your match a fun question! They'll have to answer before continuing.
    </Text>

    {/* Token balance display */}
    <View style={styles.tokenDisplay}>
      <Text>Your Balance: 🪙 {tokenBalance} tokens</Text>
    </View>

    <TextInput
      style={styles.modalInput}
      value={newQuestion}
      onChangeText={setNewQuestion}
      placeholder="E.g., What's your most embarrassing moment?"
      multiline
      maxLength={300}
    />

    <Text style={styles.charCount}>{newQuestion.length}/300</Text>

    <View style={styles.modalWarning}>
      <Text>🪙 Sending this question will cost 1 token</Text>
    </View>

    <View style={styles.modalButtons}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          setShowCreateSQModal(false);
          setNewQuestion("");
        }}
      >
        <Text>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sendButton, !newQuestion.trim() && styles.buttonDisabled]}
        onPress={() => handleCreateSurpriseQuestion(newQuestion)}
        disabled={!newQuestion.trim()}
      >
        <Text>Send 🎁</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

### 2. Answer Surprise Question Modal (Blocking)
```typescript
<Modal visible={!!showAnswerModal} animationType="slide">
  <View style={styles.modalContainer}>
    <Text style={styles.modalTitle}>🎁 Surprise Question!</Text>
    <Text style={styles.modalSubtitle}>
      Your match sent you a surprise question. Answer it to continue chatting!
    </Text>

    <View style={styles.questionBox}>
      <Text style={styles.questionLabel}>Question:</Text>
      <Text style={styles.questionText}>{showAnswerModal?.question}</Text>
    </View>

    <TextInput
      style={styles.modalInput}
      value={questionAnswer}
      onChangeText={setQuestionAnswer}
      placeholder="Type your answer here..."
      multiline
      maxLength={500}
    />

    <Text style={styles.charCount}>{questionAnswer.length}/500</Text>

    <TouchableOpacity
      style={[styles.submitButton, !questionAnswer.trim() && styles.buttonDisabled]}
      onPress={() => handleAnswerQuestion(questionAnswer)}
      disabled={!questionAnswer.trim()}
    >
      <Text>Submit Answer 🎉</Text>
    </TouchableOpacity>

    <Text style={styles.warningText}>
      ⚠️ You must answer to continue using the chat
    </Text>
  </View>
</Modal>
```

### 3. Token Confirmation Modal
```typescript
<Modal visible={showTokenConfirmation} animationType="fade" transparent>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmationCard}>
      <Text style={styles.confirmTitle}>🪙 Use 1 Token?</Text>
      <Text style={styles.confirmText}>
        Surprise questions cost 1 token to send
      </Text>

      <View style={styles.tokenWarning}>
        <Text>1 token will be deducted</Text>
      </View>

      <View style={styles.confirmButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setShowTokenConfirmation(false);
            setPendingQuestion(null);
          }}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmTokenUsage}
        >
          <Text>🪙 Use 1 Token</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### 4. Insufficient Tokens Modal
```typescript
<Modal visible={showInsufficientTokens} animationType="fade" transparent>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmationCard}>
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
          style={styles.cancelButton}
          onPress={() => setShowInsufficientTokens(false)}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTokensButton}
          onPress={() => {
            setShowInsufficientTokens(false);
            setShowTokenPurchaseModal(true);
          }}
        >
          <Text>🪙 Add Tokens</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### 5. Profile View Modal
```typescript
<Modal visible={showProfileModal} animationType="slide">
  <ScrollView style={styles.profileModal}>
    {/* Profile photo */}
    {/* Name, age, gender */}
    {/* Dating bio */}
    {/* Gallery photos */}
    {/* Education, work, location */}
    {/* Lifestyle (exercise, drinking, smoking, kids) */}
    {/* Interests */}
    {/* Close button */}
  </ScrollView>
</Modal>
```

### 6. Token Purchase Modal Integration
```typescript
<TokenPurchaseModal
  visible={showTokenPurchaseModal}
  userId={user?.id || ""}
  onClose={() => setShowTokenPurchaseModal(false)}
/>
```

---

## Message Rendering with Surprise Questions

```typescript
// Merge messages and surprise questions chronologically
const allItems = [
  ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
  ...surpriseQuestions.map((sq) => ({ type: "surprise" as const, data: sq, timestamp: sq.created_at })),
].sort((a, b) => {
  const timeA = new Date(a.timestamp || 0).getTime();
  const timeB = new Date(b.timestamp || 0).getTime();
  return timeA - timeB;
});

// Render function
function renderMessages() {
  return allItems.map((item, index) => {
    if (item.type === "message") {
      const m = item.data;
      const isMyMessage = m.sender_id === user?.id;
      return (
        <View key={m.id || index} style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
          <Text style={styles.messageText}>{m.message}</Text>
          <Text style={styles.messageTime}>
            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            <Text style={styles.surpriseTitle}>🎁 Surprise Question</Text>
            <View style={styles.questionBox}>
              <Text style={styles.questionLabel}>Question:</Text>
              <Text>{sq.question}</Text>
            </View>
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Answer:</Text>
              <Text>{sq.answer}</Text>
            </View>
          </View>
        );
      } else {
        // Unrevealed surprise question
        return (
          <View key={sq.id} style={styles.surpriseUnrevealed}>
            <Text style={styles.surpriseIcon}>🎁</Text>
            <Text style={styles.surpriseTitle}>Surprise Question!</Text>
            {isMyQuestion ? (
              <Text>Waiting for them to reveal...</Text>
            ) : (
              <TouchableOpacity
                style={styles.revealButton}
                onPress={() => handleRevealQuestion(sq)}
              >
                <Text>🔓 Click to Reveal</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }
    }
  });
}
```

---

## Visibility Calculations

```typescript
const showPhoto = useMemo(() => {
  const category = datingCategory?.toLowerCase() || "";
  const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;

  if (category === "casual" || category === "friends") {
    return true;
  }

  if (category === "serious" || category === "fun" || category === "mystery") {
    return bothRevealed;
  }

  return bothRevealed;
}, [datingCategory, revealStatus]);

const shouldShowRevealButton = useMemo(() => {
  const category = datingCategory?.toLowerCase() || "";
  return category !== "casual" && category !== "friends";
}, [datingCategory]);

const locked = useMemo(() => {
  const category = datingCategory?.toLowerCase() || "";

  if (category === "casual" || category === "friends") {
    return false;
  }

  if (category === "serious" || category === "fun" || category === "mystery") {
    const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;
    return !bothRevealed;
  }

  return true;
}, [datingCategory, revealStatus]);
```

---

## Summary

This document provides **COMPLETE SPECIFICATIONS** for implementing the enhanced mobile chat. The implementation requires:

1. ✅ **Verification Modal** - DONE
2. ✅ **Token Purchase Modal** - EXISTS
3. ✅ **Surprise Question Utils** - DONE
4. ⏳ **Complete Chat Rewrite** - SPECIFICATIONS PROVIDED ABOVE

The mobile chat needs approximately **1000+ lines of code** to match the web version's functionality. All the logic, components, and styling patterns are documented above.

### Estimated Implementation Time
- **Solo Developer**: 8-12 hours
- **With existing components**: 6-8 hours
- **Testing & Polish**: 2-4 hours

### Priority Implementation Order
1. Token balance loading and display
2. Surprise question modals (all 4)
3. Real-time subscriptions
4. Message rendering with surprise questions
5. Profile viewing and reveal logic
6. Testing and edge cases
