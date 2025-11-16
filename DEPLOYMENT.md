# 🚀 Campus5 Deployment Guide

Complete guide for deploying Campus5 mobile app to Google Play Store.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Google Play Console Setup](#google-play-console-setup)
3. [App Signing](#app-signing)
4. [Generating Signed APK](#generating-signed-apk)
5. [Creating App Bundle (AAB)](#creating-app-bundle-aab)
6. [Google Play Store Requirements](#google-play-store-requirements)
7. [App Store Listing](#app-store-listing)
8. [Privacy Policy](#privacy-policy)
9. [Content Rating](#content-rating)
10. [Version Management](#version-management)
11. [Update Deployment](#update-deployment)
12. [Supabase Production Configuration](#supabase-production-configuration)

## ✅ Pre-Deployment Checklist

Before submitting to Google Play Store:

- [ ] All features tested and working (see TESTING_CHECKLIST.md)
- [ ] App tested on multiple devices and Android versions
- [ ] No console errors or warnings
- [ ] Privacy policy created and hosted
- [ ] Terms of service created
- [ ] App icons finalized (not placeholder)
- [ ] Splash screen finalized
- [ ] App name finalized
- [ ] Package name finalized (com.campus5.app)
- [ ] Version number set correctly
- [ ] Production Supabase configuration
- [ ] All debug code removed
- [ ] ProGuard rules configured
- [ ] App signing keystore created
- [ ] Screenshots taken (phone + tablet)
- [ ] Feature graphic created (1024x500)
- [ ] App description written
- [ ] Google Play Developer account created ($25 one-time fee)

## 🏪 Google Play Console Setup

### Step 1: Create Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with Google account
3. Pay $25 one-time registration fee
4. Complete account details
5. Accept Developer Distribution Agreement

### Step 2: Create New App

1. Click **"Create app"**
2. Fill in app details:
   - **App name:** Campus5
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free

3. Declare app content:
   - [ ] Privacy policy URL (required)
   - [ ] App access (full access or restricted)
   - [ ] Ads declaration (contains ads: Yes/No)
   - [ ] Content rating questionnaire
   - [ ] Target audience
   - [ ] News app declaration (No)

4. Select app category:
   - **Category:** Social
   - **Tags:** College, Students, Social Networking

## 🔐 App Signing

Google Play uses two signing keys:
- **Upload key:** You sign your app with this
- **App signing key:** Google uses this for distribution

### Create Upload Keystore

```bash
# Navigate to android/app
cd android/app

# Generate keystore
keytool -genkey -v -keystore campus5-upload.keystore -alias campus5-upload -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
```
Enter keystore password: [CREATE STRONG PASSWORD]
Re-enter new password: [CONFIRM PASSWORD]
What is your first and last name? [Your Name]
What is the name of your organizational unit? [Campus5 Team]
What is the name of your organization? [Campus5]
What is the name of your City or Locality? [City]
What is the name of your State or Province? [State]
What is the two-letter country code for this unit? [US]
```

**CRITICAL:**
- Save `campus5-upload.keystore` in a secure location
- Store passwords in a password manager
- Backup keystore to multiple secure locations
- NEVER commit keystore to Git
- If you lose this, you can't update your app!

### Configure Gradle for Signing

Create `android/app/release-signing.properties`:

```properties
storeFile=campus5-upload.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=campus5-upload
keyPassword=YOUR_KEY_PASSWORD
```

Add to `android/app/.gitignore`:
```
release-signing.properties
*.keystore
*.jks
```

Edit `android/app/build.gradle`:

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

### Enable Google Play App Signing

1. In Play Console → App → Setup → App signing
2. Choose **"Use Google-generated key"** (recommended)
3. Google will generate and manage the app signing key
4. You continue to upload APKs/AABs signed with your upload key
5. Google re-signs with app signing key before distribution

Benefits:
- Lost upload key can be reset by Google
- Optimized APKs for each device
- Better security

## 📦 Generating Signed APK

### Step-by-Step APK Build

1. **Update version numbers**

Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 1        // Increment for each release (1, 2, 3...)
    versionName "1.0.0"  // Semantic version
}
```

2. **Build production web assets**

```bash
# Set production environment
npm run build:export
```

3. **Sync to Android**

```bash
npx cap sync android
```

4. **Build signed APK**

```bash
cd android
./gradlew assembleRelease
```

Or use Android Studio:
1. Build → Clean Project
2. Build → Rebuild Project
3. Build → Generate Signed Bundle / APK
4. Select **APK**
5. Choose keystore file
6. Enter passwords
7. Select **release** variant
8. Click **Finish**

5. **Locate APK**

APK location: `android/app/build/outputs/apk/release/app-release.apk`

Size should be 15-30 MB for Campus5.

## 📱 Creating App Bundle (AAB)

**App Bundle is REQUIRED for Google Play Store** (APK no longer accepted for new apps).

### Why AAB?

- Smaller download size (30% smaller on average)
- Optimized for each device configuration
- Dynamic delivery support
- Required by Google Play

### Build App Bundle

```bash
cd android
./gradlew bundleRelease
```

Or in Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select **Android App Bundle**
3. Choose keystore
4. Enter passwords
5. Select **release** variant
6. Click **Finish**

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### Verify AAB

```bash
# Install bundletool
# Download from https://github.com/google/bundletool/releases

# Generate APKs from bundle
java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks --ks=campus5-upload.keystore --ks-key-alias=campus5-upload

# Install on connected device
java -jar bundletool.jar install-apks --apks=app.apks
```

## 🎨 Google Play Store Requirements

### App Icons (Required)

**App Icon (512x512 PNG)**
- High-res icon for store listing
- 32-bit PNG with alpha
- Upload in Play Console → Store listing → App icon

**Feature Graphic (1024x500 PNG)**
- Banner for store listing
- Required for featuring on Play Store
- Should showcase app visually

### Screenshots (Required)

**Phone Screenshots** (Minimum 2, maximum 8)
- JPEG or 24-bit PNG (no alpha)
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Recommended: 1080x1920 (portrait) or 1920x1080 (landscape)

Suggested screenshots:
1. Home/feed page
2. Clubs listing page
3. Dating feature page
4. Events page
5. Profile page
6. Chat/messaging (if applicable)

**Tablet Screenshots** (Optional but recommended)
- 7-inch tablet: 1200x1920
- 10-inch tablet: 1600x2560
- Shows tablet-optimized UI

### How to Take Screenshots

Method 1: Android Studio
1. Run app in emulator
2. Click camera icon in emulator controls
3. Screenshot saved to desktop

Method 2: Physical device
1. Open app to desired screen
2. Press Power + Volume Down
3. Transfer to computer via USB

Method 3: ADB
```bash
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```

### Video (Optional)

- YouTube video URL
- 30 seconds to 2 minutes
- Demonstrates app features
- Shows real device usage

## 📝 App Store Listing

### Short Description (80 characters max)

```
Connect with college students. Join clubs, meet people, discover events.
```

### Full Description (4000 characters max)

```
Campus5 - Your College Social Network

🎓 CONNECT WITH YOUR CAMPUS
Campus5 is the ultimate social platform for college students. Connect with classmates, join clubs, discover campus events, and make new friends.

✨ KEY FEATURES

📚 Clubs & Organizations
• Discover student clubs and organizations
• Join clubs that match your interests
• Stay updated with club activities and announcements
• Connect with members who share your passions

🎉 Campus Events
• Never miss important campus events
• Browse upcoming activities and gatherings
• RSVP to events you want to attend
• Get reminders for events you've joined

💬 Social Networking
• Create your profile and showcase your interests
• Connect with students from your college
• Share updates and engage with your community
• Build meaningful friendships

❤️ Campus Dating
• Meet other students looking to connect
• Discover people with shared interests
• Safe and college-focused environment
• Build connections beyond the classroom

🔔 Stay Updated
• Real-time notifications for messages and activity
• Get updates from your clubs and events
• Never miss important announcements

🔒 SAFE & SECURE
• College email verification
• Privacy-focused design
• Report and block features
• Your data is protected

🎯 PERFECT FOR
• Freshmen finding their community
• Transfer students making connections
• Students exploring clubs and organizations
• Anyone wanting to enhance their college experience

📱 SEAMLESS EXPERIENCE
• Clean, modern interface
• Fast and responsive
• Works offline
• Optimized for mobile

Download Campus5 today and make the most of your college experience! Connect, engage, and thrive in your campus community.

---

Questions or feedback? Contact us at support@campus5.app
Follow us on social media @campus5app
```

### App Category

- **Category:** Social
- **Tags:** college, students, university, social networking, clubs, events, campus

### Contact Details

- **Email:** support@campus5.app
- **Website:** https://campus5.app (optional)
- **Phone:** (optional)
- **Physical address:** (optional, but required for certain countries)

### Privacy Policy URL

Required before publishing. Must include:
- What data you collect
- How you use the data
- How you protect user data
- User rights and choices
- Contact information

Host on your website or use a free service:
- https://www.privacypolicies.com/
- https://www.freeprivacypolicy.com/
- https://app-privacy-policy-generator.nisrulz.com/

Example URL: `https://campus5.app/privacy-policy`

## 🔒 Privacy Policy

### Required Sections

1. **Information Collection**
   - Email address (for authentication)
   - Profile information (name, bio, interests)
   - Photos uploaded by users
   - Usage data and analytics

2. **How We Use Information**
   - Provide app functionality
   - Improve user experience
   - Send notifications
   - Prevent fraud and abuse

3. **Information Sharing**
   - With other users (profile info)
   - With service providers (Supabase)
   - Not sold to third parties

4. **Data Security**
   - Encrypted data transmission
   - Secure data storage
   - Limited access controls

5. **User Rights**
   - Access your data
   - Delete your account
   - Opt-out of communications

6. **Children's Privacy**
   - Age restriction (13+ or 18+)
   - COPPA compliance

7. **Contact**
   - Email for privacy questions

### Template

```markdown
# Privacy Policy for Campus5

Last updated: [Date]

Campus5 ("we", "our", or "us") operates the Campus5 mobile application.

## Information We Collect

We collect the following information:
- Email address for authentication
- Profile information (name, bio, interests, photos)
- Clubs and events you join
- Messages you send
- Usage data and analytics

## How We Use Your Information

- Provide app features and functionality
- Connect you with other students
- Send notifications about activity
- Improve app performance
- Prevent fraud and abuse

## Information Sharing

Your profile information is visible to other users. We do not sell your data.

## Data Security

We use industry-standard encryption and security measures.

## Your Rights

You can access, update, or delete your data at any time.

## Contact

Questions? Email us at privacy@campus5.app
```

## 🔞 Content Rating

Complete the Content Rating Questionnaire in Play Console.

### Campus5 Answers

1. **Violence:** No violent content
2. **Sexuality:** Dating features (select "Dating Simulation")
3. **Language:** User-generated content (may contain profanity)
4. **Controlled Substances:** No alcohol/drugs/tobacco
5. **Gambling:** No gambling/betting
6. **User Interaction:** Yes (chat, user-generated content, social features)
7. **User-Generated Content:** Yes
8. **Personal Information Sharing:** Yes (profiles visible to other users)
9. **Location Sharing:** No (unless you add this feature)

Expected Rating: **Teen (13+)** or **Mature 17+** (depending on dating features)

### Age Restrictions

- Set minimum age (13+ or 18+ for dating)
- Verify in sign-up flow
- Include in Terms of Service

## 📊 Version Management

### Semantic Versioning

Use format: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (1.0.0 → 2.0.0)
- **MINOR:** New features (1.0.0 → 1.1.0)
- **PATCH:** Bug fixes (1.0.0 → 1.0.1)

### Update Version Numbers

1. **package.json**
```json
{
  "version": "1.0.0"
}
```

2. **android/app/build.gradle**
```gradle
defaultConfig {
    versionCode 1        // Integer, increment by 1 each release
    versionName "1.0.0"  // String, semantic version
}
```

**Important:**
- `versionCode` must increase for each upload (1, 2, 3...)
- Google Play uses `versionCode` to determine newest version
- Users see `versionName` in app details

### Version History Example

| Version | versionCode | versionName | Release Date | Changes |
|---------|-------------|-------------|--------------|---------|
| Initial | 1 | 1.0.0 | 2025-01-15 | Initial release |
| Bug fix | 2 | 1.0.1 | 2025-01-20 | Fixed login bug |
| Feature | 3 | 1.1.0 | 2025-02-01 | Added messaging |
| Major | 4 | 2.0.0 | 2025-03-01 | New UI redesign |

## 🔄 Update Deployment Process

### For App Updates

1. **Make changes to code**
2. **Test thoroughly** (see TESTING_CHECKLIST.md)
3. **Update version numbers**
   ```gradle
   versionCode 2         // Increment by 1
   versionName "1.0.1"   // Update semantic version
   ```
4. **Build production assets**
   ```bash
   npm run build:export
   npx cap sync android
   ```
5. **Generate new signed AAB**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
6. **Upload to Play Console**
   - Go to Play Console → Release → Production
   - Create new release
   - Upload app-release.aab
   - Add release notes
   - Review and rollout

### Release Notes Template

```
Version 1.0.1 - Bug Fixes & Improvements

What's New:
• Fixed login issue affecting some users
• Improved app performance
• Updated club discovery algorithm
• Various bug fixes and improvements

Thank you for using Campus5! 🎓
```

### Staged Rollout

Start with small percentage to catch issues:
1. **5%** - Monitor for crashes/issues (1-2 days)
2. **10%** - If stable (1-2 days)
3. **25%** - If stable (1-2 days)
4. **50%** - If stable (1-2 days)
5. **100%** - Full rollout

### Rollback Plan

If critical bug found:
1. Halt rollout immediately
2. Fix bug in code
3. Increment version
4. Deploy new fixed version
5. Resume rollout

## ☁️ Supabase Production Configuration

### Production Environment Variables

Create `.env.production`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### Supabase Project Setup

1. **Create production Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Choose region closest to users
   - Set strong database password

2. **Configure Row Level Security (RLS)**
   - Enable RLS on all tables
   - Create policies for user access
   - Test policies thoroughly

3. **Set up authentication**
   - Configure email auth
   - Set up email templates
   - Configure redirect URLs
   - Add production domain to allowed origins

4. **Database migrations**
   - Export schema from development
   - Apply to production database
   - Verify all tables and functions

5. **Configure storage**
   - Set up storage buckets
   - Configure policies
   - Set file size limits

### Mobile-Specific Supabase Config

Update Supabase client for mobile:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile
  },
})
```

### Allowed Redirect URLs

Add Capacitor scheme to Supabase allowed URLs:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URLs:
   ```
   https://localhost
   capacitor://localhost
   com.campus5.app://
   ```

### Testing Production Config

Before deploying:
1. Build with production env vars
2. Test authentication flow
3. Test database operations
4. Test real-time subscriptions
5. Test file uploads
6. Monitor Supabase dashboard for errors

## 📤 Uploading to Play Store

### Initial Release

1. **Go to Play Console** → Your App → Production

2. **Create new release**
   - Click "Create new release"
   - Upload app-release.aab
   - Add release notes

3. **Release name:** 1.0.0

4. **Release notes:**
   ```
   Initial release of Campus5! 🎓

   Features:
   • Connect with college students
   • Join clubs and organizations
   • Discover campus events
   • Meet new people
   • Stay updated with real-time notifications

   Welcome to Campus5!
   ```

5. **Review release** - Check all info is correct

6. **Start rollout** - Choose percentage or 100%

### Review Process

- Google reviews app (usually 1-3 days)
- You'll receive email about review status
- May request changes or additional info
- Fix any issues and resubmit

### Common Rejection Reasons

1. **Misleading content** - Ensure description matches functionality
2. **Privacy policy missing** - Must have valid privacy policy URL
3. **Permissions not justified** - Explain why you need each permission
4. **Content rating incorrect** - Complete rating questionnaire accurately
5. **Broken functionality** - Ensure app works without crashes
6. **Inappropriate content** - Follow content policies

## 🎯 Post-Launch

### Monitor

- **Crashes:** Android Vitals in Play Console
- **ANRs:** Application Not Responding reports
- **Ratings:** User reviews and ratings
- **Installs:** Track install numbers and trends

### Respond to Reviews

- Respond to user feedback
- Fix reported bugs
- Thank users for positive reviews
- Address concerns professionally

### Regular Updates

- Release updates every 2-4 weeks
- Fix bugs quickly
- Add new features based on feedback
- Keep app fresh and engaging

---

**Ready to launch?** Follow this guide step by step! 🚀

**Questions?** Check [Google Play Console Help](https://support.google.com/googleplay/android-developer)
