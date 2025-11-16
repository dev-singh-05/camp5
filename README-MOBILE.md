# 📱 Campus5 Mobile - Quick Reference

Quick start guide and command reference for Campus5 mobile development.

## 🚀 Quick Start

Get up and running in 3 steps:

```bash
# 1. Build the web assets
npm run build:export

# 2. Sync to Android
npx cap sync android

# 3. Open in Android Studio
npm run open:android
```

Then click the green "Run" button ▶️ in Android Studio.

## 📚 Documentation Index

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[MOBILE_SETUP.md](./MOBILE_SETUP.md)** | Initial setup and Capacitor configuration | First-time setup, understanding architecture |
| **[MOBILE_BUILD.md](./MOBILE_BUILD.md)** | Build instructions and troubleshooting | Daily development, fixing build issues |
| **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** | Comprehensive testing procedures | Before releases, bug testing |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Google Play Store deployment | Publishing app, creating releases |
| **README-MOBILE.md** (this file) | Quick reference | Daily development workflow |

## ⚡ Daily Development Workflow

### Option 1: Separate Steps (Recommended)

```bash
# Step 1: Build Next.js
npm run build:export

# Step 2: Sync to platform
npx cap sync android

# Step 3: Open IDE
npm run open:android
```

### Option 2: Combined Command

```bash
# Build + Sync + Open in one command
npm run android:dev
```

### When You Need to Sync

Run `npx cap sync android` after:
- Changing `capacitor.config.ts`
- Installing new Capacitor plugins
- Making web code changes (after `npm run build:export`)
- Adding new web assets

You DON'T need to sync after:
- Editing Android native code
- Changing gradle files
- Updating Android resources

## 🛠️ Common Commands

### Building

```bash
# Build web assets only
npm run build:export

# Build and sync to all platforms
npm run build:mobile

# Build for development (with hot reload)
npm run dev
```

### Platform Management

```bash
# Sync web assets to Android
npx cap sync android

# Just copy assets (no plugin updates)
npx cap copy android

# Update native plugins only
npx cap update android

# Open in Android Studio
npm run open:android
npx cap open android
```

### Running

```bash
# Build + open Android (one command)
npm run android:dev

# Build + open iOS (macOS only)
npm run ios:dev
```

### Capacitor CLI

```bash
# View Capacitor info
npx cap doctor

# List installed platforms
npx cap ls

# View Capacitor config
npx cap config
```

## 🐛 Common Issues & Quick Fixes

### "out directory not found"

**Problem:** Capacitor can't find web assets.

**Fix:**
```bash
npm run build:export
```

### "Gradle sync failed"

**Problem:** Android dependencies out of sync.

**Fix:**
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### "App shows white screen"

**Problem:** Web assets not loaded or wrong webDir.

**Fix:**
```bash
# Verify webDir in capacitor.config.ts is 'out'
# Then rebuild and sync
npm run build:export
npx cap sync android
# Clear app data on device and reinstall
```

### "Changes not showing in app"

**Problem:** Old build cached.

**Fix:**
```bash
# Rebuild web assets
npm run build:export
npx cap copy android

# In Android Studio: Build → Clean Project
# Then reinstall app on device
```

### "Native plugin not working"

**Problem:** Plugin not synced or initialized.

**Fix:**
```bash
npx cap sync android
# Then rebuild in Android Studio
```

### "Build fails with Java error"

**Problem:** Wrong Java version.

**Fix:**
```bash
# Check Java version (should be 17)
java -version

# Set JAVA_HOME to JDK 17
export JAVA_HOME=/path/to/jdk17
```

### "Android SDK not found"

**Problem:** ANDROID_HOME not set.

**Fix:**
```bash
# Linux/macOS
export ANDROID_HOME=$HOME/Android/Sdk

# Windows PowerShell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

## 📦 Project Structure

```
camp5/
├── src/                       # Next.js source code
├── public/                    # Static assets
├── out/                       # Built web assets (generated)
├── android/                   # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/ # Web assets copied here
│   │   │   ├── res/           # Android resources
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle       # App-level config
│   └── build.gradle           # Project-level config
├── capacitor.config.ts        # Capacitor configuration
├── next.config.ts             # Next.js configuration
└── package.json               # Dependencies and scripts
```

## 🔧 Configuration Files

### capacitor.config.ts

```typescript
{
  appId: 'com.campus5.app',      // Bundle identifier
  appName: 'Campus5',            // App display name
  webDir: 'out',                 // Where web assets are
  bundledWebRuntime: false,      // Use system webview
  server: {
    androidScheme: 'https',      // Use HTTPS scheme
    cleartext: true,             // Allow HTTP in dev
  }
}
```

### next.config.ts

```typescript
{
  output: 'export',              // Static export for mobile
  images: { unoptimized: true }, // Disable image optimization
  trailingSlash: true,           // Mobile compatibility
}
```

### android/app/build.gradle

```gradle
defaultConfig {
  applicationId "com.campus5.app"
  minSdkVersion 22               // Android 5.1+
  targetSdkVersion 33            // Android 13
  versionCode 1                  // Increment each release
  versionName "1.0.0"            // Semantic version
}
```

## 🎯 Development Tips

### Viewing Logs

**Android Studio Logcat:**
- View → Tool Windows → Logcat
- Filter by package: `com.campus5.app`
- Look for errors (red), warnings (orange)

**Console logs in WebView:**
```bash
# Enable Chrome DevTools for WebView
chrome://inspect
```

### Debugging

**Enable USB Debugging:**
1. Settings → About Phone → Tap "Build Number" 7 times
2. Settings → Developer Options → Enable USB Debugging
3. Connect device via USB

**View connected devices:**
```bash
adb devices
```

### Hot Reload (Web Only)

For faster development, use web version with hot reload:
```bash
npm run dev
# Open http://localhost:3000 in browser
```

Build mobile version only when testing native features.

### Testing Native Features

To test if code is running on native platform:
```typescript
import { isNative, isAndroid, isIOS } from '@/utils/capacitor';

if (isNative()) {
  // This code only runs on mobile
}

if (isAndroid()) {
  // Android-specific code
}
```

## 📱 Testing on Devices

### Android Emulator

**Create emulator:**
1. Android Studio → Tools → AVD Manager
2. Create Virtual Device
3. Choose Pixel 5 or similar
4. Select system image (API 33)
5. Finish

**Run app on emulator:**
- Select emulator from dropdown
- Click Run button ▶️

### Physical Device

**Connect device:**
1. Enable USB debugging on device
2. Connect via USB
3. Trust computer on device
4. Select device from dropdown in Android Studio
5. Click Run button ▶️

## 🚀 Building for Release

### Development Build (Debug)

```bash
npm run build:export
npx cap sync android
# Open Android Studio and click Run
```

### Production Build (Release)

```bash
# Build web assets with production env
npm run build:export

# Sync to Android
npx cap sync android

# Build signed AAB
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete release process.

## 📊 Version Management

Before each release:

1. **Update package.json:**
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Update android/app/build.gradle:**
   ```gradle
   defaultConfig {
     versionCode 1        // Increment by 1
     versionName "1.0.0"  // Match package.json
   }
   ```

3. **Commit version bump:**
   ```bash
   git add package.json android/app/build.gradle
   git commit -m "Bump version to 1.0.0"
   ```

## 🔍 Useful ADB Commands

```bash
# List connected devices
adb devices

# Install APK
adb install path/to/app.apk

# Uninstall app
adb uninstall com.campus5.app

# View app logs
adb logcat | grep Campus5

# Clear app data
adb shell pm clear com.campus5.app

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Screen recording
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

## 💡 Performance Optimization

### Build Size

```bash
# Check APK size
cd android/app/build/outputs/apk/release
ls -lh app-release.apk

# Check AAB size
cd android/app/build/outputs/bundle/release
ls -lh app-release.aab
```

**Target sizes:**
- APK: 15-30 MB
- AAB: 10-20 MB

### Build Time

**Speed up builds:**
- Use Gradle daemon (enabled by default)
- Increase Gradle memory: `org.gradle.jvmargs=-Xmx4g`
- Use parallel builds: `org.gradle.parallel=true`

Add to `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
org.gradle.parallel=true
org.gradle.caching=true
```

## 🆘 Getting Help

### Documentation

- **Setup:** See [MOBILE_SETUP.md](./MOBILE_SETUP.md)
- **Build Issues:** See [MOBILE_BUILD.md](./MOBILE_BUILD.md)
- **Testing:** See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- **Deployment:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### External Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android Developer Guides](https://developer.android.com/guide)
- [Capacitor Forums](https://forum.ionicframework.com/c/capacitor/)

### Troubleshooting Steps

1. **Check this README** for common issues
2. **Check MOBILE_BUILD.md** troubleshooting section
3. **View Logcat** for error messages
4. **Google the error** with "Capacitor" or "Android"
5. **Search Capacitor forums** for similar issues
6. **Check GitHub issues** in our repo

## 📝 Cheat Sheet

```bash
# Quick development cycle
npm run build:export && npx cap sync android && npm run open:android

# Clean everything and start fresh
rm -rf out android/app/build
npm run build:export
npx cap sync android

# Check if everything is set up correctly
npx cap doctor

# View all available npm scripts
npm run

# View Capacitor configuration
npx cap config

# Update Capacitor and plugins
npm update @capacitor/core @capacitor/cli @capacitor/android

# Force reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

## ✅ Pre-commit Checklist

Before committing mobile changes:

- [ ] Web build succeeds: `npm run build:export`
- [ ] Capacitor sync succeeds: `npx cap sync android`
- [ ] App runs without crashes
- [ ] No console errors
- [ ] Changes tested on device/emulator
- [ ] Version updated if needed

## 🎓 Learning Resources

**New to mobile development?**
- Start with [MOBILE_SETUP.md](./MOBILE_SETUP.md) for initial setup
- Follow [MOBILE_BUILD.md](./MOBILE_BUILD.md) for build workflow
- Use [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) before releases
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) when ready to publish

**Key Concepts:**
- **Static Export:** Next.js builds to HTML/CSS/JS files
- **WebView:** Android component that displays web content
- **Capacitor:** Bridge between web code and native features
- **Gradle:** Android build system
- **APK/AAB:** Android app packages

---

**Happy building!** 🚀 Questions? Check the detailed docs linked above.
