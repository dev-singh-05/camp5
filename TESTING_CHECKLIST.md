# ✅ Campus5 Mobile Testing Checklist

Comprehensive testing checklist for Campus5 mobile app before release.

## 📋 Pre-Launch Functionality Tests

### Page Loading Tests

- [ ] **Home page loads correctly**
  - App launches without crashes
  - All UI elements render properly
  - No console errors in Logcat/Safari Console

- [ ] **Clubs page loads**
  - Clubs list displays correctly
  - Club cards show all information
  - Images load properly (or placeholder shown)

- [ ] **Dating page loads**
  - Dating feed displays
  - Profile cards render correctly
  - Swipe UI is responsive

- [ ] **Events page loads**
  - Events list displays
  - Event details are visible
  - Date/time formatting is correct

- [ ] **Profile page loads**
  - User profile displays correctly
  - Profile picture loads
  - User information is accurate

### Navigation Tests

- [ ] **Bottom navigation works**
  - All tabs are clickable
  - Tab switches happen instantly
  - Active tab is highlighted
  - Icons display correctly

- [ ] **Back button behavior (Android)**
  - Back button navigates to previous page
  - Back button on home page shows "exit app" confirmation
  - Back button in modals closes the modal
  - Navigation stack is maintained correctly

- [ ] **Swipe gestures (iOS)**
  - Swipe from left edge goes back
  - Swipe gesture is smooth
  - Navigation animation plays correctly

- [ ] **Deep linking works**
  - External links open in-app
  - Share URLs open correct pages
  - App handles invalid URLs gracefully

### Authentication Flow

- [ ] **Sign up works**
  - Email validation works
  - Password requirements enforced
  - Error messages display correctly
  - Success redirects to onboarding/home

- [ ] **Login works**
  - Correct credentials log in successfully
  - Incorrect credentials show error
  - "Forgot password" link works
  - Session persists after app restart

- [ ] **Logout works**
  - Logout button clears session
  - Redirects to login page
  - No cached data remains
  - Can login again successfully

- [ ] **Session persistence**
  - App remembers logged-in user after closing
  - Session doesn't expire prematurely
  - Auto-logout on token expiry works
  - Refresh token updates correctly

### Database Operations (CRUD)

#### Create

- [ ] **Create new club**
  - Form validation works
  - Image upload succeeds
  - Club appears in database
  - UI updates immediately

- [ ] **Create new event**
  - All fields save correctly
  - Date/time pickers work
  - Event appears in events list

- [ ] **Create new post/message**
  - Text input works smoothly
  - Post submits successfully
  - Post appears in feed

#### Read

- [ ] **Load clubs list**
  - All clubs display
  - Pagination works (if implemented)
  - Images load correctly
  - No duplicates shown

- [ ] **Load user profile**
  - Profile data loads completely
  - Bio, interests, etc. display
  - Profile picture shows

- [ ] **Load messages/chat**
  - Messages load in correct order
  - Timestamps are accurate
  - Sender names display correctly

#### Update

- [ ] **Update profile**
  - Changes save to database
  - UI reflects changes immediately
  - Validation works correctly

- [ ] **Update club information**
  - Admin can edit club details
  - Changes persist after refresh
  - Other users see updates

- [ ] **Edit posts**
  - Edit option appears for own posts
  - Edited content saves
  - "Edited" indicator shows (if implemented)

#### Delete

- [ ] **Delete post**
  - Delete confirmation appears
  - Post removed from database
  - UI updates immediately
  - Can't undo after confirmation

- [ ] **Leave club**
  - Leave button works
  - User removed from members list
  - Club no longer in user's clubs

- [ ] **Delete account**
  - Confirmation required
  - All user data deleted
  - Redirects to login
  - Can't login with deleted account

### Real-Time Updates

- [ ] **Real-time messages**
  - New messages appear instantly
  - No refresh needed
  - Typing indicators work (if implemented)
  - Message order is correct

- [ ] **Real-time notifications**
  - Notifications appear in-app
  - Badge counts update
  - Notification data is accurate

- [ ] **Live presence indicators**
  - Online/offline status updates
  - Last seen timestamps update
  - Presence is accurate across devices

## ⚡ Performance Tests

### Launch Performance

- [ ] **Cold start time**
  - App launches in under 3 seconds
  - Splash screen shows for appropriate duration
  - No white screen flash

- [ ] **Warm start time**
  - App resumes in under 1 second
  - Previous state is restored
  - No visible lag

- [ ] **First meaningful paint**
  - Content appears within 2 seconds
  - Loading indicators show if needed
  - Progressive loading works

### Runtime Performance

- [ ] **Smooth scrolling**
  - Lists scroll at 60fps
  - No janky animations
  - Images don't cause lag while scrolling
  - Infinite scroll works smoothly

- [ ] **Animation performance**
  - Page transitions are smooth
  - Button press animations are instant
  - No dropped frames
  - 60fps maintained during animations

- [ ] **Image loading**
  - Images load progressively
  - Placeholders show while loading
  - No layout shifts when images load
  - Failed images show fallback

### Memory Management

- [ ] **No memory leaks**
  - Memory usage stays stable over time
  - Opening/closing pages doesn't increase memory
  - Test with Chrome DevTools or Android Profiler

- [ ] **Image memory**
  - Large images don't crash app
  - Images are released from memory when not visible
  - Gallery browsing doesn't cause memory issues

- [ ] **Long sessions**
  - App runs for 30+ minutes without issues
  - No performance degradation over time
  - Memory doesn't exceed 200MB for typical usage

### Battery Usage

- [ ] **Background battery drain**
  - App uses minimal battery when backgrounded
  - Location services stop when not needed
  - Network requests pause in background

- [ ] **Active usage battery**
  - Normal browsing uses reasonable battery
  - No unexpected battery drain
  - Battery usage similar to other social apps

- [ ] **Battery optimization**
  - App handles Android battery optimization
  - Background tasks work with battery saver
  - No false "high battery usage" warnings

### Network Performance

- [ ] **Fast connection (WiFi)**
  - Data loads quickly
  - Images download without delay
  - Real-time updates are instant

- [ ] **Slow connection (3G)**
  - App remains usable on slow network
  - Appropriate loading indicators
  - Timeouts are reasonable
  - Offline indicators show

- [ ] **Offline mode**
  - App doesn't crash when offline
  - Cached data displays
  - Offline indicator visible
  - Queued actions execute when online

- [ ] **Network switch**
  - Handles WiFi to cellular switch
  - Handles losing/regaining connection
  - Reconnects automatically

## 🤖 Android-Specific Tests

### Back Button Behavior

- [ ] **Navigation back**
  - Back button navigates through history
  - Returns to previous screen correctly
  - Animation plays in reverse

- [ ] **Exit on home**
  - Back on home shows "Press again to exit" or confirmation
  - Double-back exits app
  - Timer resets after 2 seconds

- [ ] **Modal/dialog behavior**
  - Back button closes modals
  - Back button closes bottom sheets
  - Back button dismisses dialogs

- [ ] **Form behavior**
  - Back button shows "discard changes?" if form is dirty
  - Confirmation required for unsaved changes
  - Can choose to stay or discard

### Status Bar Styling

- [ ] **Status bar color**
  - Color matches app theme (default: #0f172a)
  - No white flash on launch
  - Color transitions smoothly between pages

- [ ] **Status bar icons**
  - Icons are visible (light icons on dark background)
  - Time, battery, signal visible
  - Icons don't overlap with app content

- [ ] **Full screen mode**
  - Status bar hides in full-screen content
  - Returns when exiting full screen
  - No layout shifts

### Splash Screen

- [ ] **Splash displays correctly**
  - Campus5 logo/branding shows
  - Background color correct (#0f172a)
  - No white screen before splash

- [ ] **Splash duration**
  - Shows for ~2 seconds (configured duration)
  - Fades out smoothly (300ms)
  - Transitions to app without flash

- [ ] **Splash on various screen sizes**
  - Looks good on phones (5-7 inches)
  - Looks good on tablets (7-10 inches)
  - Logo is centered and scaled properly

### Safe Area Handling

- [ ] **Notch/cutout handling**
  - Content doesn't go behind notch
  - SafeAreaWrapper components work
  - Status bar height respected

- [ ] **Navigation bar**
  - Content doesn't go behind nav bar
  - Bottom safe area respected
  - Tabs visible above nav bar

- [ ] **Landscape mode**
  - Safe areas work in landscape
  - Cutouts handled correctly
  - No content hidden

### Keyboard Behavior

- [ ] **Keyboard shows/hides smoothly**
  - Input focuses and keyboard appears
  - No layout jumping
  - Smooth animation

- [ ] **Keyboard resize mode**
  - Content resizes when keyboard shows
  - Input field scrolls into view
  - Submit buttons remain accessible

- [ ] **Keyboard type**
  - Email inputs show email keyboard
  - Number inputs show number pad
  - URL inputs show URL keyboard

- [ ] **Keyboard dismiss**
  - Tap outside input to dismiss
  - Swipe down to dismiss (if enabled)
  - Submit button dismisses keyboard

### Hardware Features

- [ ] **Device back button**
  - Physical back button works
  - Gesture navigation works
  - 3-button navigation works

- [ ] **Volume buttons**
  - Volume buttons control media (if applicable)
  - Don't interfere with app

- [ ] **Rotation**
  - Portrait mode works
  - Landscape mode works (if supported)
  - Orientation lock respected
  - No crashes on rotation

## 🎯 Native Features Tests

### Haptic Feedback

- [ ] **Button haptics work**
  - Buttons trigger haptic on press
  - Correct haptic type (light/medium/heavy)
  - Haptic feels responsive
  - Works with HapticButton component

- [ ] **Success/error haptics**
  - Success actions trigger success haptic
  - Errors trigger error/warning haptic
  - Intensity is appropriate

- [ ] **Haptic settings**
  - Can disable haptics in settings (if implemented)
  - Respects system haptic settings
  - No haptics on devices without support

### Share Functionality

- [ ] **Share sheet opens**
  - Share button triggers native share sheet
  - Share sheet shows app icons
  - Can cancel share

- [ ] **Share content**
  - Text shares correctly
  - URLs share correctly
  - Title and description included

- [ ] **Share targets**
  - Can share to messaging apps
  - Can share to social media
  - Can copy to clipboard

### Camera Access (if implemented)

- [ ] **Camera permission**
  - Permission prompt appears first time
  - Permission can be granted/denied
  - Handles denied permission gracefully

- [ ] **Camera opens**
  - Camera view opens correctly
  - Front/back camera switch works
  - Flash control works

- [ ] **Photo capture**
  - Photo captures successfully
  - Photo uploads to server
  - Photo displays in app

### Push Notifications (if implemented)

- [ ] **Notification permission**
  - Permission prompt appears
  - Permission can be granted/denied
  - Handles denied permission

- [ ] **Receive notifications**
  - Notifications appear in notification tray
  - Notification sound plays
  - Badge count updates

- [ ] **Tap notification**
  - Tapping opens app
  - Opens to correct page (deep link)
  - Clears notification after tap

- [ ] **Notification content**
  - Title displays correctly
  - Body text displays correctly
  - Icon shows correctly

### Biometric Authentication (if implemented)

- [ ] **Fingerprint works**
  - Fingerprint scanner triggered
  - Correct fingerprint authenticates
  - Wrong fingerprint rejected

- [ ] **Face unlock works**
  - Face scanner triggered
  - Correct face authenticates
  - Wrong face rejected

- [ ] **Fallback to PIN**
  - Falls back to PIN if biometric fails
  - Can skip biometric authentication
  - Remembers preference

## 🔍 Device Testing Matrix

Test on various devices and OS versions:

### Android Devices

- [ ] **Modern flagship** (Samsung S23, Pixel 7, etc.)
  - Android 13+
  - High-end specs
  - Large screen (6.5"+)

- [ ] **Mid-range device** (Samsung A series, etc.)
  - Android 11-12
  - Medium specs
  - Medium screen (6-6.5")

- [ ] **Budget device**
  - Android 10+
  - Low-end specs (2GB RAM)
  - Small screen (5-6")

- [ ] **Tablet**
  - Android 11+
  - Tablet UI layout
  - Landscape orientation

### Screen Sizes

- [ ] **Small (5-5.5")**
  - All content visible
  - No text cutoff
  - Buttons are tappable

- [ ] **Medium (5.5-6.5")**
  - Standard layout works
  - Comfortable reading
  - Optimal experience

- [ ] **Large (6.5"+)**
  - Takes advantage of space
  - No stretched elements
  - Comfortable layout

- [ ] **Tablet (7-10")**
  - Uses tablet layout (if different)
  - Two-column layout (if applicable)
  - No wasted space

### Android Versions

- [ ] **Android 13+** (Target SDK 33)
- [ ] **Android 11-12** (Most common)
- [ ] **Android 10** (Still popular)
- [ ] **Android 5.1-9** (Minimum SDK 22)

## 📊 Accessibility Tests

- [ ] **Text scaling**
  - App works with large text
  - No text cutoff
  - Layouts adapt correctly

- [ ] **Screen reader (TalkBack)**
  - Elements have labels
  - Navigation is logical
  - Buttons are announced

- [ ] **Color contrast**
  - Text is readable
  - Meets WCAG AA standards
  - Works in high contrast mode

- [ ] **Touch targets**
  - Buttons are at least 44x44 dp
  - Adequate spacing between targets
  - No accidental taps

## 🔒 Security Tests

- [ ] **Authentication tokens secure**
  - Tokens stored in secure storage
  - Not visible in logs
  - Cleared on logout

- [ ] **HTTPS connections**
  - All API calls use HTTPS
  - Certificate validation works
  - No mixed content warnings

- [ ] **Input validation**
  - SQL injection prevented
  - XSS attacks prevented
  - Malicious input sanitized

- [ ] **Sensitive data**
  - Passwords not stored in plain text
  - Credit cards not stored (if applicable)
  - Personal data encrypted

## 🚀 Pre-Release Final Checks

- [ ] **Version numbers updated**
  - `package.json` version updated
  - Android `versionCode` incremented
  - Android `versionName` updated

- [ ] **All console errors fixed**
  - No errors in Logcat
  - No warnings in console
  - All deprecation warnings addressed

- [ ] **Production API configured**
  - Environment variables set to production
  - Supabase production URL configured
  - API keys are production keys

- [ ] **Removed debug code**
  - No console.log statements
  - No debug menus
  - No test data

- [ ] **App icons updated**
  - Custom app icon (not placeholder)
  - All sizes generated
  - Icon looks good on home screen

- [ ] **Privacy policy linked**
  - Privacy policy URL in app
  - Terms of service linked
  - About page complete

- [ ] **Analytics setup**
  - Analytics tracking works
  - Events are logged correctly
  - User privacy respected

- [ ] **Crash reporting setup**
  - Crash reporter integrated (Sentry, etc.)
  - Test crash works
  - Crashes are reported

## 📝 Testing Notes

### How to Test

1. **Install the app** from Android Studio or APK
2. **Go through each checklist item** systematically
3. **Mark items as complete** only when verified
4. **Document any issues** found during testing
5. **Retest** after fixes are implemented

### When to Test

- **After major features** - Test related functionality
- **Before each release** - Complete full checklist
- **After bug fixes** - Regression test affected areas
- **On new devices** - Test device compatibility

### Testing Tools

- **Android Studio Logcat** - View console logs and errors
- **Android Profiler** - Monitor CPU, memory, network
- **Layout Inspector** - Debug UI layout issues
- **Chrome DevTools** - Debug WebView (chrome://inspect)
- **ADB** - Command line device control

### Common Issues to Watch For

- White screen on launch
- Slow page transitions
- Memory leaks causing crashes
- Network errors not handled
- Images not loading
- Buttons not responding
- Back button not working
- Keyboard covering inputs
- Status bar color wrong
- App crashing on old Android versions

---

**Testing is critical for quality!** Don't skip items. 🎯

**Found a bug?** Document it with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Device and Android version
- Screenshots/video if possible
