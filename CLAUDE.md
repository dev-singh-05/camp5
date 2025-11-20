# CAMPUS Social Platform - Developer Guide for AI Assistants

> **Last Updated:** 2025-01-20
> **Platform:** Campus Social Network (Dating, Clubs, Ratings)
> **Stack:** Next.js 15.5.3 + React 19 + TypeScript + Supabase + Tailwind CSS

---

## 📋 Executive Summary

This is a **campus-focused social platform** that combines dating, club management, and peer ratings into one application. Built with **Next.js 15** using the App Router, **React 19**, **TypeScript**, and **Supabase** for backend/auth. The platform implements a **token economy**, **verification workflows**, and **real-time features**.

### Key Features
- **🌹 Dating System** - Profile verification, matching (random/interest-based), anonymous chat, reveal system
- **🏆 Clubs System** - Create/join clubs, passcode protection, leaderboard, chat rooms
- **⭐ Ratings System** - Peer ratings with attributes (confidence, intelligence, etc.), connection requests, token-gated stats
- **🪙 Token Economy** - Purchase/spend tokens to unlock features (stats viewing)
- **📱 Mobile-First** - Responsive design with mobile-optimized animations

---

## 🏗️ Architecture & Technology Stack

### Core Technologies
```json
{
  "framework": "Next.js 15.5.3 (App Router)",
  "runtime": "React 19.1.0",
  "language": "TypeScript 5.9.3",
  "database": "Supabase (PostgreSQL)",
  "auth": "Supabase Auth",
  "styling": "Tailwind CSS 3.4.17",
  "animations": "Framer Motion 12.23.24",
  "ui": "@headlessui/react 2.2.8",
  "notifications": "react-hot-toast 2.6.0",
  "icons": "lucide-react 0.544.0"
}
```

### Build Configuration
- **Build Tool:** Next.js with Turbopack (`--turbopack` flag)
- **TypeScript:** Strict mode enabled BUT build errors ignored in production (⚠️ **SECURITY RISK**)
- **ESLint:** Configured but ignored during builds (⚠️ **CODE QUALITY RISK**)

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_ENABLE_DATING_TEST=true|false  # Enable testing mode for dating
```

---

## 📁 Codebase Structure

```
camp5/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── login/page.tsx            # Login page
│   │   ├── signup/page.tsx           # Signup page
│   │   ├── dashboard/page.tsx        # Main dashboard
│   │   ├── dating/                   # Dating feature
│   │   │   ├── page.tsx              # Dating hub (matching, requests)
│   │   │   ├── chat/[id]/page.tsx    # Anonymous chat interface
│   │   │   ├── requests/page.tsx     # View/manage dating requests
│   │   │   ├── interests/page.tsx    # Manage interests
│   │   │   ├── random/page.tsx       # Random matching
│   │   │   └── dating-profiles/page.tsx  # Edit dating profile
│   │   ├── clubs/                    # Clubs feature
│   │   │   ├── page.tsx              # Browse all clubs
│   │   │   ├── my/page.tsx           # User's joined clubs
│   │   │   ├── leaderboard/page.tsx  # Club leaderboard
│   │   │   ├── [id]/page.tsx         # Club chat room
│   │   │   └── [id]/profile/page.tsx # Club profile page
│   │   ├── ratings/                  # Ratings feature
│   │   │   ├── page.tsx              # Browse users, rate peers
│   │   │   ├── connections/page.tsx  # View connections
│   │   │   └── leaderboard/page.tsx  # Ratings leaderboard
│   │   ├── profile/page.tsx          # User profile editor
│   │   ├── news/page.tsx             # Campus news feed
│   │   ├── admin/                    # Admin panel
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── dating-verifications/page.tsx
│   │   │   ├── icebreaker-questions/page.tsx
│   │   │   ├── events/page.tsx
│   │   │   ├── ads/page.tsx
│   │   │   ├── news/page.tsx
│   │   │   ├── tokens/page.tsx
│   │   │   └── xp-configs/page.tsx
│   │   └── lib/token.ts              # Token utilities
│   ├── components/                   # Reusable components
│   │   ├── ads.tsx                   # Ad banner component
│   │   ├── ClubCard.tsx              # Club card component
│   │   ├── ClubModal.tsx             # Club modal
│   │   ├── CreateClubModal.tsx       # Create club modal
│   │   ├── DialogBox.tsx             # Dialog/modal component
│   │   ├── ProfileStats.tsx          # Profile stats component
│   │   ├── RatingsAdPopup.tsx        # Ratings ad popup
│   │   ├── VerificationOverlay.tsx   # Dating verification overlay
│   │   └── tokens/                   # Token-related components
│   │       ├── TokenBalance.tsx
│   │       ├── TokenBalanceModal.tsx
│   │       └── TokenPurchaseModal.tsx
│   ├── utils/                        # Utility functions
│   │   ├── supabaseClient.ts         # Supabase client initialization
│   │   ├── dating.ts                 # Dating helper functions
│   │   ├── icebreaker.ts             # Icebreaker questions
│   │   ├── surpriseQuestion.ts       # Surprise questions
│   │   └── profileField.ts           # Profile field definitions
│   └── hooks/                        # Custom React hooks
│       ├── useDebounce.ts            # Debounce hook (performance)
│       └── useIsMobile.ts            # Mobile detection hook (performance)
├── mobile/                           # React Native mobile app (Expo)
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.ts
```

---

## 🔐 CRITICAL SECURITY VULNERABILITIES

> ⚠️ **URGENT:** These issues must be addressed before production deployment.

### 🚨 SEVERITY: CRITICAL

#### 1. **Admin Panel Has No Authorization Check**
**Location:** `src/app/admin/page.tsx:19-24`

```typescript
// CURRENT CODE (VULNERABLE):
const { data: auth } = await supabase.auth.getUser();
if (!auth?.user) {
  alert("Please log in to access the admin panel.");
  router.push("/login");
  return;
}
```

**Issue:** Only checks if user is logged in, NOT if they have admin privileges. **ANY logged-in user can access the admin panel.**

**Fix Required:**
```typescript
// Check both authentication AND admin role
const { data: auth } = await supabase.auth.getUser();
if (!auth?.user) {
  router.push("/login");
  return;
}

// Verify admin role from database
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", auth.user.id)
  .single();

if (profile?.role !== "admin") {
  toast.error("Unauthorized access");
  router.push("/dashboard");
  return;
}
```

**Impact:** Full admin access to:
- Dating verifications approval/rejection
- User management
- Token transaction monitoring
- Content moderation
- System configuration

---

#### 2. **TypeScript & ESLint Errors Ignored in Production Builds**
**Location:** `next.config.ts:4-11`

```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ⚠️ DANGEROUS
  },
  typescript: {
    ignoreBuildErrors: true,    // ⚠️ DANGEROUS
  },
};
```

**Issue:** Type safety and linting errors are completely ignored during production builds. This can lead to runtime errors that TypeScript would have caught.

**Fix Required:** Remove these overrides and fix all TypeScript/ESLint errors properly.

---

#### 3. **Client-Side Token Balance Manipulation**
**Location:** `src/app/ratings/page.tsx:389-425`

```typescript
// VULNERABLE: Token deduction happens on client
const newBalance = tokenBalance - TOKENS_TO_VIEW_STATS;
await supabase
  .from("user_tokens")
  .update({ balance: newBalance })
  .eq("user_id", currentUserId);
```

**Issue:** Token balance updates happen on the client side. A malicious user can:
- Intercept the request and modify the token amount
- Bypass the balance check by manipulating JavaScript
- Create fake token transactions

**Fix Required:** Move token operations to **server-side RPC functions** or **Supabase Edge Functions**:

```typescript
// Use RPC instead
const { data, error } = await supabase.rpc("deduct_tokens_for_stats_unlock", {
  p_user_id: currentUserId,
  p_profile_id: selectedUser.id,
  p_amount: TOKENS_TO_VIEW_STATS
});
```

Then create a PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION deduct_tokens_for_stats_unlock(
  p_user_id UUID,
  p_profile_id UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check balance
  IF (SELECT balance FROM user_tokens WHERE user_id = p_user_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Deduct tokens atomically
  UPDATE user_tokens
  SET balance = balance - p_amount
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'spend', 'Unlocked stats for ' || p_profile_id);

  -- Record unlock
  INSERT INTO stats_unlocks (user_id, profile_id, unlocked_via)
  VALUES (p_user_id, p_profile_id, 'tokens');

  RETURN TRUE;
END;
$$;
```

---

#### 4. **Weak Password Validation**
**Location:** `src/app/signup/page.tsx` (no validation present)

**Issue:** Passwords are not validated for strength. Users can set weak passwords like "123456".

**Fix Required:**
```typescript
// Add password validation
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain an uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain a lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain a number" };
  }
  return { valid: true, message: "" };
}
```

---

#### 5. **Email Validation Only on Client Side**
**Location:** `src/app/signup/page.tsx:36-41`

```typescript
// Client-side only validation
if (selectedUni === "medicaps" && !email.endsWith("@medicaps.ac.in")) {
  toast.error("Please use your Medicaps University email ID (@medicaps.ac.in)");
  setLoading(false);
  return;
}
```

**Issue:** A malicious user can bypass this by:
- Modifying the `selectedUni` value in localStorage
- Directly calling the Supabase API with any email
- Using browser dev tools to bypass the check

**Fix Required:** Implement **server-side validation** using Supabase database triggers or Edge Functions.

---

#### 6. **SQL Injection Risk in Search Queries**
**Location:** Multiple locations using `.ilike()` with user input

**Example:** `src/app/ratings/page.tsx:523`
```typescript
.ilike("full_name", `%${searchQuery}%`)
```

**Issue:** While Supabase client library provides some protection, raw string interpolation in database queries is risky.

**Fix Required:** Use parameterized queries and sanitize all user inputs.

---

#### 7. **No Rate Limiting**

**Issue:** No rate limiting on:
- Match requests (users can spam match requests)
- Message sending (users can flood chat)
- Connection requests (users can spam friend requests)
- Rating submissions (users can submit duplicate ratings)

**Fix Required:** Implement rate limiting using:
- Supabase Rate Limiting rules
- Edge Functions with rate limiters
- Database constraints (unique indexes, timestamps)

---

#### 8. **Exposed Supabase Anon Key**
**Location:** `src/utils/supabaseClient.ts:4-5`

**Issue:** The Supabase anon key is exposed in client-side code. While this is standard practice, it requires **proper Row Level Security (RLS)** policies on ALL tables.

**Action Required:**
1. Audit ALL Supabase tables to ensure RLS is enabled
2. Verify RLS policies are correctly implemented
3. Test with different user roles to ensure no unauthorized access

---

### 🟡 SEVERITY: HIGH

#### 9. **Missing CSRF Protection**
No CSRF tokens are implemented for state-changing operations.

#### 10. **No Input Sanitization**
User-generated content (messages, ratings, profile descriptions) is not sanitized before display, risking XSS attacks.

**Fix Required:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before rendering
<p>{DOMPurify.sanitize(profile.description)}</p>
```

#### 11. **Realtime Subscription Cleanup Issues**
**Location:** Multiple pages use realtime subscriptions but cleanup is inconsistent

**Example:** `src/app/dating/page.tsx:516-643`
- Subscriptions are created but cleanup can fail silently
- No error boundaries for subscription failures

---

## ⚡ Performance Optimization Opportunities

### ✅ Good Performance Patterns Already Implemented

1. **Mobile-Optimized Animations**
   - `useIsMobile()` hook detects mobile devices
   - Heavy animations disabled on mobile (blur, rotate, scale)
   - LazyMotion used instead of full Framer Motion import (~20KB savings)

   **Example:** `src/app/login/page.tsx:78-98`

2. **Debounced Search**
   - `useDebounce` hook prevents excessive re-renders
   - Used in ratings search: `src/app/ratings/page.tsx:74`

3. **Memoization**
   - `useMemo` for filtered lists
   - `useCallback` for expensive functions
   - `React.memo` for components

   **Example:** `src/app/clubs/page.tsx:322-333`

4. **CSS Animations Over JS**
   - Custom CSS keyframe animations instead of Framer Motion for background effects
   - GPU-accelerated animations

   **Example:** `src/app/dating/page.tsx:1435-1456`

---

### 🔧 Optimization Opportunities

#### 1. **Image Optimization**
**Current:** Images loaded without Next.js Image component

**Fix:**
```typescript
import Image from 'next/image';

<Image
  src={profile.profile_photo}
  alt={profile.full_name}
  width={128}
  height={128}
  className="rounded-full"
  loading="lazy"
  placeholder="blur"
/>
```

**Impact:**
- Automatic image optimization (WebP, AVIF)
- Lazy loading
- Proper sizing for mobile
- ~40-60% reduction in image bandwidth

---

#### 2. **Code Splitting**
**Current:** All components bundled together

**Fix:** Use dynamic imports for heavy components
```typescript
import dynamic from 'next/dynamic';

const TokenPurchaseModal = dynamic(() => import('@/components/tokens/TokenPurchaseModal'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

**Impact:**
- Reduce initial bundle size by ~30%
- Faster Time to Interactive (TTI)

---

#### 3. **Database Query Optimization**

**Issue:** Multiple sequential database queries could be combined

**Example:** `src/app/clubs/page.tsx:176-200`
```typescript
// CURRENT: 3 separate queries
const { data } = await supabase.from("clubs").select("*");
const { data: joined } = await supabase.from("club_members").select("club_id");
const { data: requested } = await supabase.from("club_requests").select("club_id");

// OPTIMIZED: Single query with joins
const { data } = await supabase
  .from("clubs")
  .select(`
    *,
    club_members!left(club_id),
    club_requests!left(club_id, status)
  `)
  .eq("club_members.user_id", user.id)
  .eq("club_requests.user_id", user.id);
```

**Impact:**
- 3x reduction in API calls
- Faster page load
- Reduced network latency

---

#### 4. **Infinite Scroll Instead of Loading All**

**Issue:** Dating/Clubs/Ratings pages load ALL records at once

**Fix:** Implement pagination or infinite scroll
```typescript
const [page, setPage] = useState(0);
const PAGE_SIZE = 20;

const { data } = await supabase
  .from("profiles")
  .select("*")
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

**Impact:**
- 90% reduction in initial load time for large datasets
- Better mobile performance

---

#### 5. **Reduce Bundle Size**

**Current Bundle Analysis Needed:**
```bash
npm install --save-dev @next/bundle-analyzer
```

**Suspected Large Dependencies:**
- framer-motion (even with LazyMotion)
- @headlessui/react
- react-hot-toast

**Alternatives:**
- Replace Framer Motion with CSS animations where possible
- Use smaller toast library (sonner)

---

#### 6. **Service Worker for Offline Support**

**Add PWA capabilities:**
```bash
npm install next-pwa
```

**Impact:**
- Offline access to previously viewed profiles
- Cache static assets
- Better mobile app experience

---

## 👤 User Workflows

### 🌹 Dating Workflow

```
1. USER SIGNS UP
   ↓
2. SUBMIT VERIFICATION
   - Upload college ID photo
   - Status: pending
   ↓
3. ADMIN APPROVES/REJECTS
   - If rejected: user can resubmit
   - If approved: proceed
   ↓
4. COMPLETE PROFILE (minimum 50%)
   - Required fields: age, gender, branch, year, height, etc.
   - Add interests
   - Upload profile photo
   ↓
5. SELECT CATEGORY
   - Serious Dating
   - Casual Dating
   - Mystery Mode (women's names hidden)
   - For Fun & Flirty
   - Friendship
   ↓
6. FIND MATCH
   Option A: Random Match
   - System picks random verified user
   - Opposite gender (if specified)

   Option B: Interest Match
   - System picks user with overlapping interests
   - Opposite gender (if specified)
   ↓
7. SEND REQUEST
   - Answer icebreaker question
   - Request sent to candidate
   ↓
8. CANDIDATE RESPONDS
   Option A: Accept
   - Match created ✅
   - Anonymous chat unlocked

   Option B: Reject
   - Request deleted ❌
   - User can try again with different person
   ↓
9. ANONYMOUS CHAT
   - Both users chat anonymously
   - Names hidden (depending on category)
   - Photos hidden (for certain categories)
   ↓
10. REVEAL PROCESS
    - Either user can request reveal
    - When BOTH users request reveal:
      → Names & photos revealed
      → Can exchange contact info
```

**Edge Cases:**
- If user changes mind: Can delete match (deletes chat history)
- If no matches found: "Try again later" message
- If profile < 50%: Redirected to profile completion page

---

### 🏆 Clubs Workflow

```
1. BROWSE CLUBS
   - View all clubs
   - Filter by category (Sports, Arts, Tech, General)
   - Search by name
   ↓
2. SELECT CLUB
   Option A: Open Club (no passcode)
   - Click "Join"
   - Instantly joined

   Option B: Passcode-Protected Club
   - Click "Join"
   - Enter passcode
   - 3 attempts allowed
   - If failed: Can send join request to admin

   Option C: Send Join Request
   - Click "Request"
   - Admin approves/rejects
   ↓
3. JOINED CLUBS
   - Access club chat room
   - View club members
   - See club leaderboard (XP-based)
   - Participate in events
   ↓
4. CREATE CLUB
   - Enter club name
   - Select category
   - Add description
   - Set passcode (optional)
   - Automatically become admin
```

**Admin Capabilities:**
- Approve/reject join requests
- Manage members (kick, promote)
- Send announcements
- Edit club details

---

### ⭐ Ratings Workflow

```
1. VIEW PROFILES
   - Browse all users
   - Search by name
   - Filter by: branch, gender, hometown, year
   ↓
2. SEND CONNECTION REQUEST
   - Click "+ Connect"
   - Request sent
   ↓
3. CONNECTION ACCEPTED
   - Basic stats visible:
     • Overall XP
     • Average XP
     • Total Ratings Count
   - Detailed attributes LOCKED 🔒
   ↓
4. UNLOCK DETAILED STATS
   Option A: Rate the user first (FREE)
   - Submit rating with attributes:
     • Confidence (0-5)
     • Humbleness (0-5)
     • Friendliness (0-5)
     • Intelligence (0-5)
     • Communication (0-5)
     • Overall XP (0-100)
   - Detailed stats unlocked ✅

   Option B: Spend 250 tokens
   - Pay 250 tokens
   - Detailed stats unlocked ✅
   ↓
5. VIEW DETAILED STATS
   - See all attributes with progress bars
   - View ratings breakdown
   ↓
6. CHAT (AFTER RATING)
   - Can only message users you've rated
   - Real-time chat
   - Message history saved
```

**Restrictions:**
- Must be connected to view ANY stats
- Must rate OR pay tokens to see detailed attributes
- Must rate before sending messages

---

### 🪙 Token Economy Workflow

```
1. EARN TOKENS
   - Sign up bonus: 100 tokens
   - Complete profile: 50 tokens
   - Daily login: 10 tokens
   - Rate someone: 25 tokens

2. SPEND TOKENS
   - Unlock stats: 250 tokens
   - Boost profile visibility: 100 tokens
   - Send super like: 50 tokens

3. PURCHASE TOKENS
   - Payment gateway integration (TODO)
   - Packages:
     • 500 tokens: $4.99
     • 1000 tokens: $8.99
     • 2500 tokens: $19.99
```

---

## 🛠️ Development Workflows

### Getting Started

```bash
# Clone repository
git clone <repo-url>
cd camp5

# Install dependencies
npm install

# Set up environment variables
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=<your-url>
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Setup (Supabase)

**Required Tables:**
```sql
-- Users & Profiles
- auth.users (Supabase Auth)
- profiles
  • id (UUID, FK to auth.users)
  • full_name, username, email
  • enrollment_number, college_email
  • profile_photo, description
  • age, gender, branch, year, location, hometown
  • height, exercise, drinking, smoking, kids, religion
  • work, education
  • interests (TEXT[])
  • dating_verified (BOOLEAN)
  • avg_confidence, avg_humbleness, avg_friendliness, avg_intelligence, avg_communication
  • avg_overall_xp, total_ratings

-- Dating
- dating_verifications
  • user_id, photo_url
  • status (pending, approved, rejected)
  • rejection_reason, reviewed_by, submitted_at

- dating_matches
  • id, user1_id, user2_id
  • match_type (random, interest)
  • created_at

- dating_requests
  • requester_id, candidate_id
  • question_text, answer
  • category (casual, serious, mystery, fun, friends)
  • match_type, status (pending, accepted, rejected)

- dating_chats
  • match_id, sender_id, message
  • created_at

- dating_reveals
  • match_id
  • user1_reveal, user2_reveal (BOOLEAN)

- icebreaker_questions
  • question, category
  • usage_type (match_dating, club_chat, both)
  • is_active

-- Clubs
- clubs
  • id, name, category, description
  • logo_url, passcode
  • created_by

- club_members
  • club_id, user_id
  • role (admin, member)
  • joined_at

- club_requests
  • club_id, user_id
  • status (pending, accepted, rejected)

- messages (club chat)
  • club_id, user_id, content
  • created_at

-- Ratings
- ratings
  • from_user_id, to_user_id
  • comment
  • confidence, humbleness, friendliness, intelligence, communication
  • overall_xp
  • created_at

- profile_requests
  • from_user_id, to_user_id
  • status (pending, accepted, rejected)

- user_messages
  • from_user_id, to_user_id, content
  • created_at

- stats_unlocks
  • user_id, profile_id
  • unlocked_via (rating, tokens)

-- Tokens
- user_tokens
  • user_id, balance

- token_transactions
  • user_id, amount
  • type (earn, spend, purchase)
  • description, status
  • created_at

-- Other
- events
  • title, description, image_url
  • date, location, category

- advertisements
  • title, description, image_url
  • link, placement
  • start_date, end_date, is_active

- notifications
  • user_id, title, message
  • type, related_id
  • is_read, created_at
```

**Required RLS Policies:**
- Enable RLS on ALL tables
- Users can only read/write their own data
- Admin role can access all data
- Dating matches visible to both participants only
- Club members can view club messages
- Ratings visible after connection established

---

### Code Conventions

#### File Organization
```
- Page components: `src/app/[feature]/page.tsx`
- Reusable components: `src/components/[ComponentName].tsx`
- Utilities: `src/utils/[utilName].ts`
- Hooks: `src/hooks/use[HookName].ts`
- Types: Defined inline or in component file
```

#### Naming Conventions
```typescript
// Components: PascalCase
export default function ClubCard() {}

// Files: kebab-case for pages, PascalCase for components
// page.tsx, club-card.tsx

// Functions: camelCase
async function fetchClubs() {}

// Constants: UPPER_SNAKE_CASE
const TOKENS_TO_VIEW_STATS = 250;

// CSS classes: Tailwind utility classes
className="flex items-center gap-4 bg-white/5 rounded-xl"
```

#### Component Structure
```typescript
"use client";  // For client components (most components)

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

type Props = {
  // Props types
};

export default function ComponentName({ prop }: Props) {
  // 1. Hooks
  const [state, setState] = useState();

  // 2. Effects
  useEffect(() => {}, []);

  // 3. Handlers
  const handleClick = async () => {};

  // 4. Render
  return <div>...</div>;
}
```

#### Performance Patterns
```typescript
// 1. Mobile detection
import { useIsMobile } from "@/hooks/useIsMobile";
const isMobile = useIsMobile();

// Conditionally disable animations
<motion.div
  whileHover={!isMobile ? { scale: 1.05 } : undefined}
>

// 2. Debouncing
import { useDebounce } from "@/hooks/useDebounce";
const debouncedSearch = useDebounce(search, 300);

// 3. Memoization
const filteredData = useMemo(() => {
  return data.filter(item => /* logic */);
}, [data, filterCriteria]);

const handleClick = useCallback(() => {
  // handler logic
}, [dependency]);

// 4. LazyMotion (Framer Motion)
import { LazyMotion, domAnimation, m } from "framer-motion";

<LazyMotion features={domAnimation} strict>
  <m.div>Animated content</m.div>
</LazyMotion>
```

#### Supabase Patterns
```typescript
// 1. Get current user
const { data: { user } } = await supabase.auth.getUser();

// 2. Query data
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("column", value)
  .order("created_at", { ascending: false });

// 3. Insert data
const { data, error } = await supabase
  .from("table")
  .insert([{ ...values }])
  .select()
  .single();

// 4. Update data
const { error } = await supabase
  .from("table")
  .update({ column: newValue })
  .eq("id", id);

// 5. Delete data
const { error } = await supabase
  .from("table")
  .delete()
  .eq("id", id);

// 6. Realtime subscription
const channel = supabase
  .channel("channel-name")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "table_name"
  }, (payload) => {
    console.log("New record:", payload.new);
  })
  .subscribe();

// Cleanup
useEffect(() => {
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 🧪 Testing Strategy

### Current State
⚠️ **No tests currently implemented**

### Recommended Testing Approach

1. **Unit Tests** (Jest + React Testing Library)
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom
   ```
   - Test utility functions
   - Test custom hooks
   - Test component rendering

2. **Integration Tests** (Playwright)
   ```bash
   npm install --save-dev @playwright/test
   ```
   - Test user workflows
   - Test database operations
   - Test real-time features

3. **E2E Tests** (Cypress or Playwright)
   - Complete user journeys
   - Critical paths (signup, dating match, club join)

4. **Visual Regression Tests** (Percy or Chromatic)
   - Ensure UI consistency
   - Catch styling bugs

---

## 📊 Monitoring & Analytics

### Recommended Tools

1. **Error Tracking**
   - Sentry for error monitoring
   - Track client-side errors
   - Monitor API failures

2. **Performance Monitoring**
   - Vercel Analytics (if deployed on Vercel)
   - Google Lighthouse for performance audits
   - Web Vitals tracking

3. **User Analytics**
   - PostHog or Mixpanel for user behavior
   - Track feature usage
   - Funnel analysis (signup → verification → match)

---

## 🚀 Deployment Checklist

### Before Production

- [ ] Fix all CRITICAL security vulnerabilities
- [ ] Enable TypeScript strict mode and fix all errors
- [ ] Enable ESLint and fix all warnings
- [ ] Implement proper admin authorization
- [ ] Add password strength validation
- [ ] Move token operations to server-side
- [ ] Audit and enable RLS on all Supabase tables
- [ ] Add input sanitization (DOMPurify)
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Set up error monitoring (Sentry)
- [ ] Configure environment variables properly
- [ ] Test on multiple browsers and devices
- [ ] Perform security audit
- [ ] Load testing for scalability

### Deployment Steps

```bash
# 1. Build production bundle
npm run build

# 2. Check for build errors
# Fix any TypeScript/ESLint errors

# 3. Test production build locally
npm start

# 4. Deploy to hosting platform
# Vercel (recommended):
vercel --prod

# Or deploy to your preferred platform
```

---

## 🎯 Roadmap & Future Enhancements

### High Priority
1. **Security Hardening** (CRITICAL)
   - Fix all vulnerabilities listed above
   - Implement proper authentication/authorization
   - Add rate limiting

2. **Performance Optimization**
   - Image optimization with Next.js Image
   - Code splitting
   - Infinite scroll for large lists

3. **Testing**
   - Unit tests for critical functions
   - E2E tests for main user flows

### Medium Priority
1. **Mobile App**
   - React Native app already exists in `/mobile` directory
   - Needs synchronization with web app features

2. **Payment Integration**
   - Stripe/Razorpay for token purchases
   - Subscription model for premium features

3. **Enhanced Features**
   - Video chat for dating matches
   - Club events with RSVP
   - Leaderboard gamification

### Low Priority
1. **Admin Dashboard Improvements**
   - Analytics dashboard
   - User management tools
   - Content moderation queue

2. **Notifications**
   - Push notifications (web + mobile)
   - Email notifications
   - In-app notification center

---

## 🤝 AI Assistant Guidelines

### When Working on This Codebase

1. **Always prioritize security**
   - Never bypass authentication checks
   - Always validate user input
   - Use parameterized queries
   - Implement RLS policies

2. **Follow performance patterns**
   - Use `useIsMobile()` for mobile optimization
   - Use `useDebounce()` for search inputs
   - Memoize expensive computations
   - Use LazyMotion for animations

3. **Maintain consistency**
   - Follow existing file structure
   - Use established naming conventions
   - Match the existing code style

4. **Test before committing**
   - Test on both desktop and mobile
   - Check for TypeScript errors
   - Verify database operations work correctly

5. **Document changes**
   - Add comments for complex logic
   - Update this CLAUDE.md if adding new features
   - Document new environment variables

---

## 📞 Contact & Support

For questions or issues:
- Check existing code patterns first
- Review this documentation
- Test changes thoroughly before committing
- Consider security implications of all changes

---

**Last Updated:** 2025-01-20
**Version:** 1.0.0
**Maintainer:** Campus Platform Team
