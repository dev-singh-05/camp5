# Mobile Chat Implementation Guide

## Issues Identified and Fixed

### ✅ Issue 4: Dating Verification Redirect - FIXED
**Problem:** When user clicks "Submit Verification", it redirected to profile page instead of showing a popup/modal.

**Solution:**
- Created `DatingVerificationModal.tsx` component
- Updated `app/(tabs)/dating.tsx` to use the modal instead of `router.push()`
- Modal now shows for both "not_submitted" and "rejected" verification statuses

**Files Changed:**
- ✅ `components/DatingVerificationModal.tsx` (NEW)
- ✅ `app/(tabs)/dating.tsx` (UPDATED)

---

## Remaining Work

### 🔨 Issue 1: Surprise Questions Missing in Mobile Chat

**What's Missing:**
From `src/app/dating/chat/[id]/page.tsx` (web), the mobile chat (`app/dating/chat/[id].tsx`) is missing:

1. **Surprise Question Components:**
   - `SurpriseQuestionUnrevealed` - Shows locked gift box, click to reveal
   - `SurpriseQuestionAnswered` - Shows answered question with answer
   - `SurpriseQuestionModal` - Blocks chat until user answers
   - `CreateSurpriseQuestionModal` - Form to create surprise question
   - `TokenConfirmationModal` - Asks user to confirm 1 token usage
   - `InsufficientTokensModal` - Shows when user has no tokens

2. **State Management:**
   ```typescript
   const [surpriseQuestions, setSurpriseQuestions] = useState<SurpriseQuestion[]>([]);
   const [showCreateSQModal, setShowCreateSQModal] = useState(false);
   const [showAnswerModal, setShowAnswerModal] = useState<SurpriseQuestion | null>(null);
   const [showTokenConfirmation, setShowTokenConfirmation] = useState(false);
   const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
   const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
   ```

3. **Functions:**
   ```typescript
   handleCreateSurpriseQuestion(question: string)
   handleConfirmTokenUsage()
   handleCancelTokenUsage()
   handleRevealQuestion(sq: SurpriseQuestion)
   handleAnswerQuestion(answer: string)
   handleAddTokens()
   ```

4. **Real-time subscription** for surprise questions

5. **Merged message rendering** - Messages and surprise questions sorted chronologically

6. **Chat locking logic** - When unanswered surprise question exists

**Implementation Steps:**
1. Import surprise question types and utilities
2. Add all modals as React Native Modal components
3. Add state management for modals
4. Add surprise question functions
5. Update real-time subscriptions to include surprise questions
6. Update message rendering to merge and display surprise questions
7. Add "Surprise Question" button to header

---

### 🔨 Issue 2: Token System Missing

**What's Missing:**

1. **Token Balance:**
   - Display token balance in header
   - Load token balance from database
   - Real-time updates when tokens change

2. **Token Functions:**
   ```typescript
   loadTokenBalance(userId: string)
   // Subscription to user_tokens table changes
   ```

3. **Token Purchase Modal:**
   - Import `TokenPurchaseModal` component
   - Show when user clicks "Add Tokens"

4. **Token Transactions:**
   - Deduct token when sending surprise question
   - Create transaction record

**Implementation Steps:**
1. Add token state variables
2. Load token balance on mount
3. Subscribe to token balance changes
4. Integrate token purchase modal
5. Implement token deduction in surprise question flow

---

### 🔨 Issue 3: Profile Viewing and Reveal Logic

**What's Missing:**

1. **Profile State:**
   ```typescript
   const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);
   const [datingCategory, setDatingCategory] = useState<string | null>(null);
   ```

2. **Reveal Logic:**
   ```typescript
   handleReveal() // Updates dating_reveals table
   // Visibility calculations:
   const showPhoto = useMemo(() => {...}, [datingCategory, revealStatus]);
   const shouldShowRevealButton = useMemo(() => {...}, [datingCategory]);
   const locked = useMemo(() => {...}, [datingCategory, revealStatus]);
   ```

3. **Profile Modal:**
   - Full profile details
   - Gallery photos
   - Lifestyle info
   - Interests
   - Lock/unlock based on reveal status

4. **View Profile Button:**
   - Enabled only when profiles are revealed
   - Shows "Locked" when not revealed

**Implementation Steps:**
1. Add profile and reveal state variables
2. Fetch partner profile on load
3. Subscribe to dating_reveals changes
4. Implement visibility calculations
5. Create profile modal component
6. Add reveal identity button and logic
7. Add view profile button

---

## Quick Reference: Web vs Mobile Comparison

### Web (src/app/dating/chat/[id]/page.tsx)
- ✅ Surprise questions with 6 modals
- ✅ Token system integrated
- ✅ Profile viewing with reveal logic
- ✅ Real-time subscriptions for all features
- ✅ Chat locking when surprise question unanswered

### Mobile (app/dating/chat/[id].tsx)
- ❌ No surprise questions
- ❌ No token system
- ❌ No profile viewing
- ❌ No reveal logic
- ✅ Basic chat and icebreaker working

---

## Priority Order

1. **HIGH**: Token System (needed for surprise questions)
2. **HIGH**: Surprise Questions (main feature gap)
3. **MEDIUM**: Profile Viewing (user experience)
4. **LOW**: Polish and optimizations

---

## Files to Create/Modify

### New Files:
- ✅ `components/DatingVerificationModal.tsx`
- ✅ `utils/surpriseQuestion.ts`
- ⏳ `components/SurpriseQuestionModals.tsx` (all SQ modals)
- ⏳ `components/TokenPurchaseModal.tsx` (port from web)
- ⏳ `components/ProfileViewModal.tsx`

### Files to Update:
- ✅ `app/(tabs)/dating.tsx`
- ⏳ `app/dating/chat/[id].tsx` (major updates needed)

---

## Database Tables Used

- `dating_chats` - Chat messages
- `dating_matches` - Match info
- `dating_reveals` - Reveal status
- `surprise_questions` - Surprise questions
- `user_tokens` - Token balances
- `token_transactions` - Token history
- `icebreaker_questions` - Icebreaker questions
- `profiles` - User profiles

All tables have real-time subscriptions in web version.
