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

Environment variables are **critical** for mobile deployment. They configure your app's connection to Supabase and other services. This section covers everything you need to know about environment configuration for Campus5.

### 📝 Quick Start

**Step 1:** Create your environment file from the example:

```bash
# For development
cp .env.production.example .env.local

# For production
cp .env.production.example .env.production
```

**Step 2:** Edit the file and replace all placeholder values:

```bash
# Open in your editor
nano .env.production  # or use VS Code, vim, etc.
```

**Step 3:** Get your Supabase credentials:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 🔑 Required Environment Variables

These variables are **required** for the app to work:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

❌ **The app will NOT work without these!**

### ⚙️ Optional Environment Variables

These variables are optional but recommended:

```bash
# App Configuration
NEXT_PUBLIC_APP_ENV=production              # development, staging, or production
NEXT_PUBLIC_APP_VERSION=1.0.0              # Should match package.json

# Feature Flags
NEXT_PUBLIC_ENABLE_DATING_TEST=false       # Enable testing mode (dev only!)

# Deep Linking
NEXT_PUBLIC_APP_SCHEME=com.campus5.app     # Should match capacitor.config.ts
```

See `.env.production.example` for the complete list of available variables.

### 🏗️ How Environment Variables Work in Capacitor

**Important Concepts:**

1. **Build-Time vs Runtime:**
   - Environment variables are **baked into the JavaScript bundle** at build time
   - They are NOT loaded dynamically at runtime
   - Changes require a full rebuild

2. **NEXT_PUBLIC_ Prefix:**
   - Only variables starting with `NEXT_PUBLIC_` are available in the browser
   - These are **NOT secret** - they will be visible in the compiled JavaScript
   - Never put sensitive keys (like service role keys) in `NEXT_PUBLIC_` variables

3. **Different Environments:**
   - `.env.local` - Local development (not committed to Git)
   - `.env.production` - Production builds (not committed to Git)
   - `.env.staging` - Staging builds (not committed to Git)
   - `.env.production.example` - Template file (committed to Git)

### 📱 Environment Setup for Mobile Builds

#### For Development Builds

1. **Create `.env.local`:**
   ```bash
   cp .env.production.example .env.local
   ```

2. **Edit `.env.local` with your development credentials:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
   NEXT_PUBLIC_APP_ENV=development
   NEXT_PUBLIC_ENABLE_DATING_TEST=true  # Optional: for testing
   ```

3. **Build and sync:**
   ```bash
   npm run build:export
   npx cap sync android
   ```

#### For Production Builds

1. **Create `.env.production`:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Edit `.env.production` with your production credentials:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
   NEXT_PUBLIC_APP_ENV=production
   NEXT_PUBLIC_ENABLE_DATING_TEST=false  # Disable testing in prod!
   ```

3. **Build and sync:**
   ```bash
   npm run build:export
   npx cap sync android
   ```

4. **Build signed APK/AAB in Android Studio** (see Production Build section)

### 🔄 Updating Environment Variables After Build

**IMPORTANT:** Environment variables are embedded in the JavaScript bundle. To update them:

1. **Edit your `.env.production` or `.env.local` file**

2. **Rebuild the Next.js app:**
   ```bash
   npm run build:export
   ```

3. **Sync to native platform:**
   ```bash
   npx cap sync android  # or ios
   ```

4. **Rebuild in Android Studio / Xcode:**
   - Clean project
   - Rebuild project
   - Reinstall on device/emulator

You **CANNOT** just change the `.env` file without rebuilding!

### 🔐 Using the Environment Helper (lib/env.ts)

The app includes a safe environment variable helper at `src/lib/env.ts`:

#### Basic Usage

```typescript
import { getEnv, getRequiredEnv, env } from '@/lib/env';

// Get optional variable with default
const apiUrl = getEnv('NEXT_PUBLIC_API_URL', 'https://default.com');

// Get required variable (throws error if missing)
const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');

// Use pre-configured helpers
const url = env.supabase.url();
const key = env.supabase.anonKey();
const isTestMode = env.features.datingTest();
```

#### Validation

Add this to your app's entry point to validate env vars on startup:

```typescript
// In app/layout.tsx or pages/_app.tsx
import { validateEnv } from '@/lib/env';

// Validate on app startup (client-side only)
if (typeof window !== 'undefined') {
  validateEnv();
}
```

This will show helpful error messages if required variables are missing.

#### Error Messages

If a required variable is missing, you'll see a helpful error:

```
╔════════════════════════════════════════════════════════════════════╗
║                   MISSING ENVIRONMENT VARIABLE                      ║
╚════════════════════════════════════════════════════════════════════╝

Environment variable "NEXT_PUBLIC_SUPABASE_URL" is required but not set.

📱 Capacitor Native App Environment

To fix this:
1. Copy .env.production.example to .env.production
2. Edit .env.production and set the value
3. Rebuild the app: npm run build:export && npx cap sync android
```

### 🌐 Web vs Mobile Differences

| Aspect | Web (Next.js) | Mobile (Capacitor) |
|--------|---------------|-------------------|
| **Loading** | Runtime via process.env | Bundled at build time |
| **Updates** | Restart dev server | Full rebuild + sync |
| **Location** | `.env.local`, `.env.production` | Same files, but baked into bundle |
| **Access** | `process.env.NEXT_PUBLIC_*` | `process.env.NEXT_PUBLIC_*` |
| **Security** | Same - NEXT_PUBLIC_ is NOT secret | Same - NEXT_PUBLIC_ is NOT secret |

### ⚠️ Important Security Notes

1. **NEVER commit `.env.local` or `.env.production` to Git**
   - These files contain real credentials
   - They are in `.gitignore` by default

2. **NEVER put secret keys in NEXT_PUBLIC_ variables**
   - These are visible in the JavaScript bundle
   - Anyone can extract them from the compiled app
   - Only use for public/client-safe keys (like Supabase anon key)

3. **Use different credentials for dev/staging/prod**
   - Development: Use a separate Supabase project
   - Production: Use your production Supabase project
   - Never mix environments!

4. **Rotate keys if exposed**
   - If you accidentally commit credentials, rotate them immediately
   - Update all environment files
   - Rebuild and redeploy

### 🐛 Troubleshooting Environment Variables

#### "Environment variable not found"

```bash
# Solution: Check your .env file exists and has the variable
cat .env.production | grep NEXT_PUBLIC_SUPABASE_URL

# If missing, add it
echo "NEXT_PUBLIC_SUPABASE_URL=your-url" >> .env.production
```

#### "Environment variable has placeholder value"

```bash
# The helper detects placeholder values like "your_supabase_url_here"
# Replace with real values in .env.production
```

#### "Changes not reflected in app"

```bash
# Environment variables are baked in at build time
# You MUST rebuild after changes:
npm run build:export
npx cap sync android
# Then rebuild in Android Studio
```

#### "Different values in web vs mobile"

```bash
# Both use the same .env files
# But mobile uses build-time values
# If they differ, rebuild mobile:
npm run build:export
npx cap sync android
```

### 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Capacitor Environment Setup](https://capacitorjs.com/docs/guides/environment-specific-configurations)
- [Supabase Dashboard](https://supabase.com/dashboard)

### ✅ Environment Setup Checklist

Before building for production, verify:

- [ ] `.env.production.example` exists and is up to date
- [ ] `.env.production` created with real values (not committed to Git)
- [ ] All required variables are set (Supabase URL and anon key)
- [ ] Placeholder values replaced with real credentials
- [ ] Using production Supabase project (not development)
- [ ] Testing mode disabled (`NEXT_PUBLIC_ENABLE_DATING_TEST=false`)
- [ ] Environment validation passes (`validateEnv()` in code)
- [ ] App builds without environment errors
- [ ] App connects to Supabase successfully

✅ **Ready to build!**

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
