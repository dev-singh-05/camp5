# Mobile Components Usage Guide

This guide shows how to use the mobile-specific components and hooks for native app optimization.

## 📱 Available Mobile Components

### 1. SafeArea (Already Integrated)
The SafeArea component is automatically applied in the root layout for native apps. It handles iOS notches and Android navigation bars.

**Location**: Integrated in `src/components/LayoutContent.tsx`

### 2. PullToRefresh

Use this component to add native pull-to-refresh functionality to any list or feed.

**Example - Dating Chats List**:
```tsx
import PullToRefresh from '@/components/mobile/PullToRefresh';

function MyChatsSection() {
  const [matches, setMatches] = useState([]);

  const handleRefresh = async () => {
    const data = await fetchMatches();
    setMatches(data);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {matches.map(match => (
          <ChatCard key={match.id} match={match} />
        ))}
      </div>
    </PullToRefresh>
  );
}
```

**Best Use Cases**:
- Feed pages (news, posts, activities)
- Lists (clubs, matches, leaderboards)
- Chat/message lists
- Profile updates

### 3. NativeShareButton

Button component that uses native share sheet on mobile, with fallbacks for web.

**Example - Share Club**:
```tsx
import NativeShareButton from '@/components/mobile/NativeShareButton';

function ClubDetails({ club }) {
  return (
    <div>
      <h1>{club.name}</h1>
      <p>{club.description}</p>

      <NativeShareButton
        title={club.name}
        text={`Check out ${club.name} on Campus5!`}
        url={`https://campus5.app/clubs/${club.id}`}
        label="Share Club"
        onShareSuccess={() => console.log('Shared!')}
      />
    </div>
  );
}
```

**Example - Share Profile**:
```tsx
<NativeShareButton
  title="My Campus5 Profile"
  text="Connect with me on Campus5!"
  url={profileUrl}
  className="px-6 py-3 bg-blue-500 text-white rounded-lg"
/>
```

**Best Use Cases**:
- Profile sharing
- Club invitations
- Event sharing
- Dating profile sharing
- Achievement sharing

### 4. BackButton (Already Integrated)

The BackButton component is integrated in the root layout and handles Android back button navigation.

**Location**: Integrated in `src/components/LayoutContent.tsx`

**Configuration**:
```tsx
<BackButton
  homeRoutes={['/', '/dashboard', '/dating', '/clubs', '/ratings', '/profile']}
  confirmExit={false}
/>
```

**Behavior**:
- On home pages: Double-back to exit (or shows confirmation)
- On other pages: Navigates back in history
- Falls back to home route if no history

### 5. HapticButton

Button component that provides haptic feedback on native devices.

**Example - Primary Action**:
```tsx
import { HapticButton } from '@/components/mobile/HapticButton';

function MatchButton() {
  const handleMatch = () => {
    // Find match logic
  };

  return (
    <HapticButton
      onClick={handleMatch}
      hapticType="success"
      className="px-6 py-3 bg-green-500 text-white rounded-lg"
    >
      Find Match
    </HapticButton>
  );
}
```

**Example - Destructive Action**:
```tsx
<HapticButton
  onClick={handleDelete}
  hapticType="warning"
  className="px-4 py-2 bg-red-500 text-white rounded-lg"
>
  Delete
</HapticButton>
```

**Haptic Types**:
- `light` - Light tap (for subtle interactions)
- `medium` - Medium tap (default, for normal buttons)
- `heavy` - Heavy tap (for important actions)
- `success` - Success notification (for confirmations)
- `warning` - Warning notification (for warnings/destructive actions)
- `error` - Error notification (for errors)

**Best Use Cases**:
- Submit buttons → `success`
- Delete/Remove buttons → `warning`
- Error actions → `error`
- Navigation buttons → `light` or `medium`
- Important CTAs → `heavy` or `success`

## 🔌 Available Mobile Hooks

### 1. useNetworkStatus

Hook to detect online/offline status and network type.

**Example - Show Offline Banner**:
```tsx
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function MyComponent() {
  const { isOnline, connectionType, refresh } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div className="bg-yellow-500 text-black p-4">
        ⚠️ You're offline. Some features may not work.
      </div>
    );
  }

  return (
    <div>
      <p>Connected via {connectionType}</p>
      {/* Your content */}
    </div>
  );
}
```

**Example - Disable Actions When Offline**:
```tsx
function JoinClubButton({ clubId }) {
  const { isOnline } = useNetworkStatus();

  return (
    <button
      disabled={!isOnline}
      onClick={() => joinClub(clubId)}
      className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
    >
      {isOnline ? 'Join Club' : 'Offline'}
    </button>
  );
}
```

**Simple Version**:
```tsx
import { useIsOnline } from '@/hooks/useNetworkStatus';

function MyComponent() {
  const isOnline = useIsOnline();

  return <div>{isOnline ? '🟢 Online' : '🔴 Offline'}</div>;
}
```

### 2. useHaptics (from useNativeFeatures)

Already available! Trigger haptic feedback programmatically.

**Example**:
```tsx
import { useHaptics } from '@/hooks/useNativeFeatures';

function CustomButton() {
  const { triggerHaptic } = useHaptics();

  const handleClick = async () => {
    await triggerHaptic('medium');
    // Do something
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### 3. useShare (from useNativeFeatures)

Already available! Programmatic sharing.

**Example**:
```tsx
import { useShare } from '@/hooks/useNativeFeatures';

function ShareProfileButton() {
  const { shareContent } = useShare();

  const handleShare = async () => {
    const result = await shareContent({
      title: 'My Profile',
      text: 'Check out my Campus5 profile!',
      url: 'https://campus5.app/profile/123'
    });

    if (result.success) {
      console.log('Shared successfully!');
    }
  };

  return <button onClick={handleShare}>Share</button>;
}
```

## 🎯 Implementation Recommendations

### Dating Pages
```tsx
// src/app/dating/page.tsx

// ✅ Add PullToRefresh to chats list
<PullToRefresh onRefresh={fetchMatches}>
  <div className="chats-list">
    {matches.map(match => <ChatCard match={match} />)}
  </div>
</PullToRefresh>

// ✅ Use HapticButton for match buttons
<HapticButton
  onClick={() => handleMatch('random')}
  hapticType="success"
>
  Random Match
</HapticButton>

// ✅ Add share button in profile modal
<NativeShareButton
  title="Dating Profile"
  text="Check out this profile!"
  url={profileUrl}
/>
```

### Clubs Pages
```tsx
// src/app/clubs/page.tsx

// ✅ Add PullToRefresh to clubs list
<PullToRefresh onRefresh={fetchClubs}>
  <div className="clubs-grid">
    {clubs.map(club => <ClubCard club={club} />)}
  </div>
</PullToRefresh>

// ✅ Show offline indicator
const { isOnline } = useNetworkStatus();
{!isOnline && (
  <div className="offline-banner">
    You're offline. Some features may not work.
  </div>
)}

// ✅ Use HapticButton for join button
<HapticButton
  onClick={handleJoinClub}
  hapticType="success"
  disabled={!isOnline}
>
  Join Club
</HapticButton>

// ✅ Share club
<NativeShareButton
  title={club.name}
  text={`Join ${club.name} on Campus5!`}
  url={clubUrl}
/>
```

### Profile Pages
```tsx
// src/app/profile/page.tsx

// ✅ Add share button
<NativeShareButton
  title="My Campus5 Profile"
  text={`Connect with ${userName} on Campus5!`}
  url={profileUrl}
  label="Share Profile"
/>

// ✅ PullToRefresh for activity feed
<PullToRefresh onRefresh={fetchActivity}>
  <ActivityFeed activities={activities} />
</PullToRefresh>
```

### Leaderboard Pages
```tsx
// src/app/clubs/leaderboard/page.tsx
// src/app/ratings/leaderboard/page.tsx

// ✅ PullToRefresh for leaderboard updates
<PullToRefresh onRefresh={fetchLeaderboard}>
  <LeaderboardList rankings={rankings} />
</PullToRefresh>

// ✅ Share leaderboard position
<NativeShareButton
  title="My Ranking"
  text={`I'm ranked #${rank} on Campus5!`}
  url={leaderboardUrl}
/>
```

## 🚀 Platform Detection

All mobile components automatically detect the platform and gracefully degrade:

```tsx
import { isNative, isIOS, isAndroid, isWeb } from '@/utils/capacitor';

// Check if running in native app
if (isNative()) {
  // Native-specific code
}

// Check specific platform
if (isIOS()) {
  // iOS-specific code
}

if (isAndroid()) {
  // Android-specific code
}

if (isWeb()) {
  // Web-specific code
}
```

## 📝 Best Practices

1. **Always provide fallbacks**: All mobile components gracefully degrade to web versions
2. **Use haptic feedback sparingly**: Only for meaningful interactions
3. **Test on multiple devices**: iOS and Android have different behaviors
4. **Consider network status**: Disable network-dependent actions when offline
5. **Optimize for touch**: Ensure touch targets are at least 44x44px
6. **Use native patterns**: Pull-to-refresh, share sheets, etc.

## 🔧 Troubleshooting

**PullToRefresh not working?**
- Ensure the component is scrollable
- Check that onRefresh returns a Promise
- Verify you're testing on a native device (doesn't work in browser)

**Haptics not working?**
- Check device settings (haptics might be disabled)
- iOS simulator doesn't support haptics (test on real device)
- Some Android devices have limited haptic support

**Share not working?**
- Verify you're providing at least one of: title, text, or url
- Check browser compatibility for Web Share API
- On iOS, share sheet requires user interaction (can't be triggered programmatically on page load)

---

For more details, see the component source files in `src/components/mobile/` and `src/hooks/`.
