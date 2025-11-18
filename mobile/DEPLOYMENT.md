# 📦 UniRizz Mobile - Deployment Guide

## 🚀 **PRODUCTION BUILD COMMANDS**

### **1. Install EAS CLI (One-time)**

```bash
npm install -g eas-cli
```

### **2. Login to Expo Account**

```bash
eas login
```

If you don't have an account:
```bash
# Sign up at https://expo.dev
```

### **3. Build for Android (APK)**

```bash
# Navigate to mobile directory
cd mobile

# Build production APK
eas build --platform android --profile production

# This will:
# - Upload your code to Expo servers
# - Build APK on cloud
# - Give you download link when done (15-20 minutes)
```

### **4. Build for iOS (IPA)**

```bash
# Build production IPA (requires Apple Developer account)
eas build --platform ios --profile production

# This will:
# - Upload your code to Expo servers
# - Build IPA on cloud
# - Give you download link when done (20-30 minutes)
```

### **5. Build for Both Platforms**

```bash
# Build for both Android and iOS
eas build --platform all --profile production
```

---

## 📲 **TESTING BUILDS**

### **Preview Build (Faster)**

```bash
# Android APK for testing
eas build --platform android --profile preview

# iOS Simulator build (Mac only)
eas build --platform ios --profile preview
```

### **Development Build**

```bash
# For development with custom native code
eas build --platform android --profile development
```

---

## 🔄 **OTA UPDATES (Over-The-Air)**

Update your app instantly without app store review:

```bash
# Publish update to production
eas update --branch production --message "Bug fixes and improvements"

# Publish update to preview
eas update --branch preview --message "Testing new features"
```

Users will get the update next time they open the app!

---

## 📱 **PUBLISHING TO APP STORES**

### **Google Play Store (Android)**

1. **Build APK:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Download APK** from Expo build page

3. **Upload to Google Play Console:**
   - Go to https://play.google.com/console
   - Create new app
   - Upload APK
   - Fill in app details
   - Submit for review

### **Apple App Store (iOS)**

1. **Setup Apple Developer Account** ($99/year)

2. **Build IPA:**
   ```bash
   eas build --platform ios --profile production
   ```

3. **Upload to App Store Connect:**
   - Download IPA from Expo
   - Use Transporter app or Xcode
   - Upload to App Store Connect
   - Fill in app details
   - Submit for review

---

## 🔧 **BUILD CONFIGURATION**

### **eas.json** (Already Created)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "bundleIdentifier": "com.unirizz.app"
      }
    }
  }
}
```

---

## 🎯 **VERSIONING**

Update version before building:

**In `app.json`:**
```json
{
  "expo": {
    "version": "1.0.1",  // <- Update this
    "android": {
      "versionCode": 2   // <- Increment this
    },
    "ios": {
      "buildNumber": "1.0.1"  // <- Update this
    }
  }
}
```

---

## 🔐 **ENVIRONMENT VARIABLES**

For production, update `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ynlmidzewpqjfvippsdq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_key
EXPO_PUBLIC_ENABLE_DATING_TEST=false  # <- Set to false for production
```

---

## 📊 **MONITORING**

### **Expo Dashboard**

- View builds: https://expo.dev/accounts/your-account/projects/unirizz
- Monitor crashes
- Track updates
- See analytics

### **Supabase Dashboard**

- Monitor database usage
- Check real-time connections
- View logs

---

## 🐛 **TROUBLESHOOTING**

### **Build Fails**

```bash
# Clear cache and retry
eas build --platform android --profile production --clear-cache
```

### **Update Not Working**

```bash
# Check update status
eas update:list --branch production

# Republish
eas update --branch production --message "Republish"
```

### **Can't Login to EAS**

```bash
# Logout and login again
eas logout
eas login
```

---

## 📝 **CHECKLIST BEFORE PRODUCTION**

- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Update version numbers
- [ ] Set production environment variables
- [ ] Test all features
- [ ] Fix any bugs
- [ ] Prepare app store assets:
  - [ ] App icon (1024x1024)
  - [ ] Screenshots (various sizes)
  - [ ] App description
  - [ ] Privacy policy
  - [ ] Terms of service
- [ ] Build production APK/IPA
- [ ] Test production build
- [ ] Submit to app stores

---

## 🎉 **SUCCESS!**

Once builds complete:

1. **Download builds** from Expo dashboard
2. **Test thoroughly** on real devices
3. **Upload to app stores**
4. **Wait for approval** (1-7 days)
5. **Launch!** 🚀

---

## 📞 **SUPPORT**

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Update**: https://docs.expo.dev/eas-update/introduction/

---

**Ready to deploy! 🎊**
