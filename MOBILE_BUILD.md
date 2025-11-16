# 🏗️ Campus5 Mobile Build Guide

Complete guide for building the Campus5 mobile app for Android and iOS platforms.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required for All Platforms

- **Node.js 18+** ([Download](https://nodejs.org/))
  ```bash
  node --version  # Should be 18.0.0 or higher
  npm --version   # Should be 9.0.0 or higher
  ```

- **Git** for version control
  ```bash
  git --version
  ```

### Required for Android Development

- **Java JDK 17** ([Download](https://adoptium.net/))
  ```bash
  java --version  # Should be version 17
  ```

  Set JAVA_HOME environment variable:
  ```bash
  # Linux/macOS
  export JAVA_HOME=/path/to/jdk17
  export PATH=$JAVA_HOME/bin:$PATH

  # Windows (PowerShell)
  $env:JAVA_HOME = "C:\Path\To\jdk17"
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  ```

- **Android Studio** ([Download](https://developer.android.com/studio))
  - Install with Android SDK
  - Install Android SDK Platform 33
  - Install Android SDK Build-Tools 33.0.0
  - Install Android Emulator (for testing)

  Set ANDROID_HOME environment variable:
  ```bash
  # Linux/macOS
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

  # Windows (PowerShell)
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
  ```

### Required for iOS Development (macOS only)

- **macOS** (iOS development only works on Mac)
- **Xcode 14+** ([Download from App Store](https://apps.apple.com/us/app/xcode/id497799835))
  ```bash
  xcode-select --install  # Install command line tools
  ```

- **CocoaPods**
  ```bash
  sudo gem install cocoapods
  pod --version
  ```

## 🚀 Installation

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/dev-singh-05/campus.git
cd campus

# Install dependencies
npm install
```

### 2. Install Capacitor Dependencies

Capacitor dependencies are already in `package.json`. If you need to add them manually:

```bash
# Core packages
npm install @capacitor/core @capacitor/cli

# Platform packages
npm install @capacitor/android @capacitor/ios

# Plugin packages (already included)
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/haptics @capacitor/share @capacitor/push-notifications @capacitor/safe-area
```

### 3. Initialize Capacitor (Already Done)

**Note:** Capacitor is already initialized in this project. You don't need to run this again.

If starting fresh, you would run:
```bash
npx cap init
```

Our configuration:
- **App name:** Campus5
- **App ID:** com.campus5.app
- **Web directory:** out

### 4. Add Platform(s)

**Note:** Platforms are already added. Skip this if `android/` or `ios/` folders exist.

```bash
# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios
```

## 🛠️ Development Build Workflow

Follow this workflow for daily development:

### Step 1: Build Next.js Static Export

Build the Next.js app into static HTML/CSS/JS files:

```bash
npm run build:export
```

This creates the `out/` directory with your static website.

**What happens:**
- Next.js builds your app with `output: 'export'`
- All pages are pre-rendered to HTML
- Images are left unoptimized (required for Capacitor)
- Output goes to `out/` directory

### Step 2: Sync to Native Platform

Copy the web assets to native projects:

```bash
npx cap sync android  # For Android
npx cap sync ios      # For iOS
```

**What happens:**
- Copies `out/` folder to `android/app/src/main/assets/public/` (Android)
- Copies `out/` folder to `ios/App/App/public/` (iOS)
- Updates native plugins
- Syncs configuration from `capacitor.config.ts`

**Shortcut:** Use the combined command:
```bash
npm run build:mobile  # Runs build:export + cap sync
```

### Step 3: Open in IDE

Open the native project in Android Studio or Xcode:

```bash
# Open Android Studio
npm run open:android
# or
npx cap open android

# Open Xcode (macOS only)
npm run open:ios
# or
npx cap open ios
```

### Step 4: Run on Device/Emulator

**In Android Studio:**
1. Wait for Gradle sync to complete
2. Select a device/emulator from the dropdown
3. Click the green "Run" button (▶️)

**In Xcode:**
1. Wait for project to load
2. Select a simulator or connected device
3. Click the "Run" button (▶️)

### Quick Development Commands

```bash
# Android: Build + Open in one command
npm run android:dev

# iOS: Build + Open in one command (macOS only)
npm run ios:dev

# Just build the web assets
npm run build:export

# Just sync to platforms (after editing capacitor.config.ts)
npx cap sync
```

## 📦 Production Build for Android

### Generating a Signed APK

#### Step 1: Create a Keystore

Create a keystore file to sign your app (only needed once):

```bash
# Navigate to Android app directory
cd android/app

# Generate keystore
keytool -genkey -v -keystore campus5-release.keystore -alias campus5 -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (remember this!)
# - Key password (remember this!)
# - Your name, organization, etc.
```

**Important:**
- Store `campus5-release.keystore` safely
- Never commit it to Git (add to `.gitignore`)
- Keep your passwords secure
- You CANNOT recover the keystore if lost!

#### Step 2: Configure Signing in Gradle

Create/edit `android/app/release-signing.properties`:

```properties
storeFile=campus5-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=campus5
keyPassword=YOUR_KEY_PASSWORD
```

Add to `android/app/.gitignore`:
```
release-signing.properties
*.keystore
```

Edit `android/app/build.gradle` to add signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            def propsFile = file('release-signing.properties')
            if (propsFile.exists()) {
                def props = new Properties()
                props.load(new FileInputStream(propsFile))

                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Step 3: Build Release APK

```bash
# Build the web assets first
npm run build:export

# Sync to Android
npx cap sync android

# Open Android Studio
npm run open:android
```

In Android Studio:
1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **Build → Generate Signed Bundle / APK**
4. Select **APK**
5. Choose your keystore file
6. Enter keystore password and key password
7. Select **release** build variant
8. Click **Finish**

APK location: `android/app/release/app-release.apk`

### Building an Android App Bundle (AAB)

For Google Play Store, use AAB instead of APK:

```bash
cd android
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### Release Build Configuration

Update version before each release in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1        // Increment for each release (1, 2, 3, ...)
        versionName "1.0.0"  // Semantic version (1.0.0, 1.0.1, 1.1.0, ...)
    }
}
```

Also update in `package.json`:
```json
{
  "version": "1.0.0"
}
```

## 🔧 Common Troubleshooting

### Build Errors

#### "out directory not found"
```bash
# Solution: Build Next.js first
npm run build:export
```

#### "Gradle sync failed"
```bash
# Solution 1: Clean and rebuild
cd android
./gradlew clean
./gradlew build

# Solution 2: Invalidate caches in Android Studio
# File → Invalidate Caches / Restart
```

#### "Could not resolve dependencies"
```bash
# Solution: Clear Gradle cache
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/build

# Then sync again
npx cap sync android
```

#### "Java version mismatch"
```bash
# Check Java version
java -version  # Should be 17

# Set JAVA_HOME to JDK 17
export JAVA_HOME=/path/to/jdk17
```

#### "Android SDK not found"
```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk

# Install required SDK packages in Android Studio:
# Tools → SDK Manager → SDK Platforms → Android 13 (API 33)
# Tools → SDK Manager → SDK Tools → Android SDK Build-Tools 33
```

### Emulator Issues

#### "Emulator won't start"
```bash
# Solution 1: Enable virtualization in BIOS
# For Intel: Enable VT-x
# For AMD: Enable AMD-V

# Solution 2: Check emulator acceleration
# Android Studio → Tools → AVD Manager → Edit Device → Show Advanced Settings
# Ensure "Hardware - GLES 2.0" is selected
```

#### "App installs but crashes immediately"
```bash
# Solution: Check Android logs
# View → Tool Windows → Logcat (in Android Studio)

# Common causes:
# 1. Missing internet permission in AndroidManifest.xml
# 2. Webview not loading (check capacitor.config.ts)
# 3. Wrong web directory (should be 'out')
```

#### "Emulator is very slow"
```bash
# Solution: Use x86_64 system image instead of ARM
# Create new AVD with x86_64 or x86 system image
# Enable hardware acceleration
```

### Capacitor Issues

#### "Native plugins not working"
```bash
# Solution: Rebuild and sync
npm run build:export
npx cap sync android
npx cap copy android  # Force copy assets

# Then rebuild in Android Studio
```

#### "Changes not showing in app"
```bash
# Solution: Clear app data
# Long press app icon → App Info → Storage → Clear Data

# Or uninstall and reinstall
adb uninstall com.campus5.app
# Then install again from Android Studio
```

#### "WebView blank/white screen"
```bash
# Check capacitor.config.ts has correct webDir:
# webDir: 'out'

# Verify out/ directory exists and has content
ls -la out/

# Check server configuration in capacitor.config.ts:
# server: { androidScheme: 'https' }
```

### Network/API Issues

#### "API calls failing in app but work in browser"
```bash
# Solution 1: Check AndroidManifest.xml has internet permission
<uses-permission android:name="android.permission.INTERNET" />

# Solution 2: Enable cleartext traffic (if using HTTP)
# In capacitor.config.ts:
server: {
  cleartext: true,  // Allow HTTP (dev only!)
}

# Solution 3: Check CORS headers on your API
```

## 🌍 Environment Variables Setup

### For Development

Create `.env.local` (not committed to Git):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### For Production Builds

Environment variables are baked into the build at build time:

```bash
# Build with production env vars
NEXT_PUBLIC_SUPABASE_URL=prod_url npm run build:export
```

Or use `.env.production`:
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

Then build normally:
```bash
npm run build:export  # Automatically uses .env.production
```

## 📱 Android-Specific Notes

### Minimum Requirements

- **Minimum SDK:** 22 (Android 5.1)
- **Target SDK:** 33 (Android 13)
- **Compile SDK:** 33

### Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Required -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Optional - Add as needed -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
</manifest>
```

### Gradle Configuration

Location: `android/app/build.gradle`

```gradle
android {
    namespace "com.campus5.app"
    compileSdkVersion 33

    defaultConfig {
        applicationId "com.campus5.app"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Testing on Physical Device

Enable Developer Options on Android device:
1. Settings → About Phone
2. Tap "Build Number" 7 times
3. Go back → Developer Options
4. Enable "USB Debugging"

Connect device:
```bash
# Check device is connected
adb devices

# Should show:
# List of devices attached
# ABC123456789    device
```

Run app from Android Studio with device selected.

### ProGuard Rules

For release builds, add to `android/app/proguard-rules.pro`:

```pro
# Keep Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.NativePlugin class * {
    @com.getcapacitor.annotation.CapacitorMethod public *;
}

# Keep WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

## 📚 Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Gradle Build Documentation](https://developer.android.com/studio/build)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## 🆘 Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Check Android Studio Logcat for errors
3. Search [Capacitor Forums](https://forum.ionicframework.com/c/capacitor/)
4. Check [GitHub Issues](https://github.com/dev-singh-05/campus/issues)
5. Review [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Ready to build?** Start with `npm run build:export` and follow the workflow! 🚀
