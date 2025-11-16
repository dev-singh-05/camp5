# 📱 Campus5 Mobile App Setup Guide

Complete guide for converting Campus5 Next.js web app into native iOS and Android apps using Capacitor.

## 📋 Prerequisites

- Node.js 16+ installed
- For Android: Android Studio installed
- For iOS: macOS with Xcode installed (iOS development only possible on macOS)

## 🚀 Quick Start

### 1. Install Capacitor Packages

```bash
# Core packages
npm install @capacitor/core @capacitor/cli

# Platform packages
npm install @capacitor/android @capacitor/ios

# Plugin packages
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/haptics @capacitor/share @capacitor/push-notifications @capacitor/safe-area
```

### 2. Initialize Capacitor

```bash
npx cap init
```

If prompted, use these values:
- **App name:** Campus5
- **App ID:** com.campus5.app
- **Web directory:** out

### 3. Add Platforms

```bash
# Add Android
npx cap add android

# Add iOS (macOS only)
npx cap add ios
```

### 4. Build and Sync

```bash
# Build Next.js and sync to Capacitor
npm run build:mobile

# Or do it step by step:
npm run build:export  # Build Next.js
npx cap sync          # Sync to platforms
```

### 5. Open in IDEs

```bash
# Open Android Studio
npm run open:android

# Open Xcode (macOS only)
npm run open:ios
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build:export` | Build Next.js static export |
| `npm run build:mobile` | Build and sync to Capacitor |
| `npm run open:android` | Open Android project in Android Studio |
| `npm run open:ios` | Open iOS project in Xcode |
| `npm run android:dev` | Build and open Android |
| `npm run ios:dev` | Build and open iOS |

## 🛠️ Configuration Files

### `capacitor.config.ts`
Main Capacitor configuration:
- App ID: `com.campus5.app`
- App Name: `Campus5`
- Web Directory: `out`
- Plugins: SplashScreen, StatusBar, Keyboard

### `next.config.ts`
Next.js configured for static export:
- `output: 'export'` - Static site generation
- `images: { unoptimized: true }` - No image optimization
- `trailingSlash: true` - Better mobile compatibility

### `public/manifest.json`
PWA manifest for web and mobile:
- Theme color: `#7c3aed` (purple)
- Background: `#0f172a` (dark)
- App icons: 192x192, 512x512

## 🧩 Native Features

### Platform Detection
```tsx
import { isNative, isIOS, isAndroid, isWeb } from '@/utils/capacitor';

if (isNative()) {
  // Native-only code
}
```

### Haptic Feedback
```tsx
import { useHaptics } from '@/hooks/useNativeFeatures';

const { triggerHaptic } = useHaptics();
await triggerHaptic('success'); // light, medium, heavy, success, warning, error
```

### Share Dialog
```tsx
import { useShare } from '@/hooks/useNativeFeatures';

const { shareContent } = useShare();
await shareContent({
  title: 'Check out Campus5!',
  text: 'Join our college social network',
  url: 'https://campus5.app'
});
```

### Push Notifications
```tsx
import { usePushNotifications } from '@/hooks/useNativeFeatures';

const { isRegistered, token, setupPushNotifications } = usePushNotifications();

// Setup notifications
await setupPushNotifications();
```

### Safe Area Wrapper
```tsx
import { SafeAreaWrapper } from '@/components/mobile/SafeArea';

<SafeAreaWrapper top bottom>
  <YourContent />
</SafeAreaWrapper>
```

### Haptic Button
```tsx
import HapticButton from '@/components/mobile/HapticButton';

<HapticButton hapticType="success" onClick={handleClick}>
  Click Me
</HapticButton>
```

## 🤖 Android Configuration

After running `npx cap add android`, configure:

### `android/app/src/main/AndroidManifest.xml`
Add permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### `android/app/build.gradle`
Set SDK versions:
```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 33
    }
}
```

## 🍎 iOS Configuration

After running `npx cap add ios`:

### Info.plist Permissions
Add camera, photo library, and notification permissions as needed.

### CocoaPods
```bash
cd ios/App
pod install
```

## 🏗️ Building for Production

### Android APK/AAB
1. Open Android Studio: `npm run open:android`
2. Build → Generate Signed Bundle/APK
3. Follow wizard to create keystore and sign

### iOS App Store
1. Open Xcode: `npm run open:ios`
2. Select "Any iOS Device" target
3. Product → Archive
4. Follow App Store Connect upload process

## 🔧 Troubleshooting

### Build fails with "out directory not found"
```bash
npm run build:export  # Build Next.js first
```

### Android Studio can't find project
```bash
npx cap sync android  # Sync Android platform
```

### iOS CocoaPods errors
```bash
cd ios/App
pod deintegrate
pod install
```

### Native plugins not working
Check if running on native platform:
```tsx
import { isNative } from '@/utils/capacitor';
if (!isNative()) {
  console.warn('This feature only works on native platforms');
}
```

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [Xcode Guide](https://developer.apple.com/xcode/)

## 🎨 App Icons

Current icons are placeholders with "unirizz" text. Replace with custom designs:
- `/public/icons/icon-192x192.png`
- `/public/icons/icon-512x512.png`

For platform-specific icons, use:
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- iOS: `ios/App/Assets.xcassets/AppIcon.appiconset/`

## 🚢 Deployment Checklist

- [ ] Replace placeholder icons with branded logos
- [ ] Test on physical Android device
- [ ] Test on physical iOS device (if applicable)
- [ ] Configure app signing (Android keystore, iOS certificates)
- [ ] Set up push notification backend (Firebase/APNs)
- [ ] Update app version in `package.json` and native configs
- [ ] Generate privacy policy and terms of service
- [ ] Create Play Store and App Store listings
- [ ] Submit for review

---

**Built with ❤️ using Next.js + Capacitor**
